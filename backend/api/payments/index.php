<?php
require_once __DIR__ . '/../../middleware/core.php';

$action = $_GET['action'] ?? '';

match($action) {
    'initiate'          => initiatePayment(),
    'verify'            => verifyPayment(),
    'moncash-webhook'   => moncashWebhook(),
    'natcash-webhook'   => natcashWebhook(),
    'stripe-webhook'    => stripeWebhook(),
    default             => error('Route pa jwenn', 404)
};

// ── INITIATE PAYMENT ──
function initiatePayment(): void {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') error('Metòd pa pèmèt', 405);
    $auth = requireAuth();
    $data = getInput();

    $orderId = (int)($data['order_id'] ?? 0);
    if (!$orderId) error('Order ID obligatwa');

    $db   = getDB();
    $stmt = $db->prepare("SELECT * FROM orders WHERE id = ? AND user_id = ?");
    $stmt->execute([$orderId, $auth['user_id']]);
    $order = $stmt->fetch();
    if (!$order) error('Kòmand pa jwenn', 404);
    if ($order['payment_status'] === 'paid') error('Kòmand sa a deja peye');

    $result = match($order['payment_method']) {
        'moncash' => initiateMoncash($order),
        'natcash' => initiateNatcash($order),
        'card'    => initiateStripe($order, $data['payment_method_id'] ?? ''),
        default   => null
    };

    if (!$result) error('Erè lè ap inisye peman', 500);
    success('Peman inisye', $result);
}

// ── MONCASH ──
// Flow: OAuth token → CreatePayment → redirect the player to MonCash → MonCash sends the
// player back to the Return URL set in the MonCash Business portal
// (https://izitopups.com/checkout/return?transactionId=...) and calls our Alert URL
// (API_URL/payments/?action=moncash-webhook). Every confirmation is re-checked server-side
// against MonCash (RetrieveTransactionPayment / RetrieveOrderPayment) — never trusted from the browser.

function moncashUrls(): array {
    // MONCASH_MODE is 'live' (default, also used when the constant is missing) or 'sandbox'.
    $live = !defined('MONCASH_MODE') || MONCASH_MODE !== 'sandbox';
    $host = $live ? 'https://moncashbutton.digicelgroup.com' : 'https://sandbox.moncashbutton.digicelgroup.com';
    return ['api' => $host . '/Api', 'gateway' => $host . '/Moncash-middleware'];
}

/** Low-level cURL call to MonCash. Returns ['status' => int, 'body' => array]. */
function moncashHttp(string $url, array $curlOpts): array {
    $ch = curl_init($url);
    curl_setopt_array($ch, $curlOpts + [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_TIMEOUT        => 30,
    ]);
    $response = curl_exec($ch);
    $status   = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return ['status' => $status, 'body' => json_decode((string)$response, true) ?? []];
}

function moncashAccessToken(): ?string {
    if (MONCASH_CLIENT_ID === '' || MONCASH_SECRET === '') return null;
    $res = moncashHttp(moncashUrls()['api'] . '/oauth/token', [
        CURLOPT_USERPWD    => MONCASH_CLIENT_ID . ':' . MONCASH_SECRET,
        CURLOPT_POSTFIELDS => 'scope=read,write&grant_type=client_credentials',
        CURLOPT_HTTPHEADER => ['Accept: application/json', 'Content-Type: application/x-www-form-urlencoded'],
    ]);
    return $res['body']['access_token'] ?? null;
}

/** Authenticated JSON POST to a MonCash API path such as /v1/CreatePayment. */
function moncashCall(string $path, array $payload): ?array {
    $token = moncashAccessToken();
    if (!$token) {
        logAction(null, 'moncash_auth_failed', []);
        return null;
    }
    return moncashHttp(moncashUrls()['api'] . $path, [
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . $token,
            'Content-Type: application/json',
            'Accept: application/json',
        ],
        CURLOPT_POSTFIELDS => json_encode($payload),
    ]);
}

function initiateMoncash(array $order): array {
    // MonCash takes a whole-gourde amount, so round the order price up (never charge less than it).
    $res = moncashCall('/v1/CreatePayment', [
        'amount'  => (int)ceil((float)$order['price_htg']),
        'orderId' => $order['order_number'],
    ]);

    // MonCash answers 202 Accepted on success (200 in some environments).
    $token = $res['body']['payment_token']['token'] ?? null;
    if (!$res || !in_array($res['status'], [200, 201, 202], true) || !$token) {
        logAction(null, 'moncash_init_failed', ['order_id' => $order['id'], 'status' => $res['status'] ?? null, 'response' => $res['body'] ?? null]);
        error('MonCash pa disponib kounye a — eseye pita', 503);
    }

    $db = getDB();
    $db->prepare("UPDATE payments SET provider_ref = ?, raw_response = ? WHERE order_id = ?")
       ->execute([$token, json_encode($res['body']), $order['id']]);

    return [
        'provider'     => 'moncash',
        'redirect_url' => moncashUrls()['gateway'] . '/Payment/Redirect?token=' . urlencode($token),
        'token'        => $token,
    ];
}

/** Ask MonCash for a payment, by transactionId or by our order number. Returns the `payment` object or null. */
function moncashRetrievePayment(?string $transactionId, ?string $orderNumber): ?array {
    if ($transactionId) {
        $res = moncashCall('/v1/RetrieveTransactionPayment', ['transactionId' => $transactionId]);
    } elseif ($orderNumber) {
        $res = moncashCall('/v1/RetrieveOrderPayment', ['orderId' => $orderNumber]);
    } else {
        return null;
    }
    if (!$res || $res['status'] !== 200) return null;
    $payment = $res['body']['payment'] ?? null;
    return is_array($payment) ? $payment : null;
}

/**
 * Check a MonCash payment against our order and mark the order paid/failed.
 * Returns the order's payment_status afterwards ('paid' | 'failed' | 'pending').
 */
function settleMoncashPayment(array $order, ?array $payment): string {
    if (!$payment) return $order['payment_status'];

    // The payment must be for THIS order and cover its price.
    $sameOrder = hash_equals((string)$order['order_number'], (string)($payment['reference'] ?? ''));
    $enough    = (float)($payment['cost'] ?? 0) + 0.01 >= (float)$order['price_htg'];
    $message   = strtolower((string)($payment['message'] ?? ''));
    $txId      = (string)($payment['transaction_id'] ?? '');

    if (!$sameOrder) {
        logAction(null, 'moncash_reference_mismatch', ['order_id' => $order['id'], 'payment' => $payment]);
        return $order['payment_status'];
    }

    $db = getDB();
    if ($message === 'successful' && $txId !== '') {
        if (!$enough) {
            logAction(null, 'moncash_amount_mismatch', ['order_id' => $order['id'], 'payment' => $payment]);
            return $order['payment_status'];
        }
        confirmPayment((int)$order['id'], $txId, json_encode($payment));
        return 'paid';
    }

    if ($message === 'failed' && $order['payment_status'] === 'pending') {
        $db->prepare("UPDATE orders SET payment_status='failed' WHERE id=?")->execute([$order['id']]);
        $db->prepare("UPDATE payments SET status='failed' WHERE order_id=?")->execute([$order['id']]);
        return 'failed';
    }

    return $order['payment_status'];
}

// ── NATCASH ──
function initiateNatcash(array $order): array {
    // NatCash API — update endpoint when you receive real API docs
    $ch = curl_init(NATCASH_BASE_URL . '/payment/initiate');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_HTTPHEADER     => [
            'X-API-Key: ' . NATCASH_API_KEY,
            'Content-Type: application/json',
        ],
        CURLOPT_POSTFIELDS => json_encode([
            'merchant_id' => NATCASH_MERCHANT_ID,
            'amount'      => $order['price_htg'],
            'reference'   => $order['order_number'],
            'callback'    => API_URL . '/payments/?action=natcash-webhook',
        ]),
        CURLOPT_TIMEOUT => 30,
    ]);
    $response = curl_exec($ch);
    curl_close($ch);
    $result = json_decode($response, true);

    // Adjust based on real NatCash API response shape
    $db = getDB();
    $db->prepare("UPDATE payments SET provider_ref = ?, raw_response = ? WHERE order_id = ?")
       ->execute([$result['reference'] ?? null, json_encode($result), $order['id']]);

    return ['provider' => 'natcash', 'data' => $result];
}

// ── STRIPE ──
function initiateStripe(array $order, string $paymentMethodId): array {
    if (!$paymentMethodId) error('Payment method ID obligatwa pou kàt');

    // Using Stripe API directly (no SDK needed)
    $ch = curl_init('https://api.stripe.com/v1/payment_intents');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_USERPWD        => STRIPE_SECRET_KEY . ':',
        CURLOPT_POSTFIELDS     => http_build_query([
            'amount'               => (int)round($order['price_usd'] * 100), // cents
            'currency'             => 'usd',
            'payment_method'       => $paymentMethodId,
            'confirm'              => 'true',
            'return_url'           => APP_URL . '/checkout/return?orderId=' . $order['id'],
            'metadata[order_id]'   => $order['id'],
            'metadata[order_num]'  => $order['order_number'],
        ]),
        CURLOPT_TIMEOUT => 30,
    ]);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $result = json_decode($response, true);

    if ($httpCode !== 200) {
        logAction(null, 'stripe_init_failed', ['order_id' => $order['id'], 'error' => $result['error'] ?? null]);
        error($result['error']['message'] ?? 'Erè Stripe', 400);
    }

    $db = getDB();
    $db->prepare("UPDATE payments SET provider_ref = ?, raw_response = ? WHERE order_id = ?")
       ->execute([$result['id'], json_encode($result), $order['id']]);

    return [
        'provider'         => 'stripe',
        'client_secret'    => $result['client_secret'],
        'status'           => $result['status'],
        'payment_intent_id'=> $result['id'],
    ];
}

// ── VERIFY PAYMENT (called by the return page / order page) ──
// Accepts order_id, or transaction_id (MonCash appends ?transactionId= to the Return URL and
// does not echo our order id). For pending MonCash orders it re-checks with MonCash itself, so
// the order still completes if the Alert URL call never arrived.
function verifyPayment(): void {
    $auth          = requireAuth();
    $orderId       = (int)($_GET['order_id'] ?? 0);
    $transactionId = trim((string)($_GET['transaction_id'] ?? ''));
    if (!$orderId && $transactionId === '') error('Order ID obligatwa');

    $db = getDB();

    if (!$orderId) {
        $payment = moncashRetrievePayment($transactionId, null);
        $stmt = $db->prepare("SELECT id FROM orders WHERE order_number = ? AND user_id = ?");
        $stmt->execute([(string)($payment['reference'] ?? ''), $auth['user_id']]);
        $orderId = (int)$stmt->fetchColumn();
        if (!$orderId) error('Kòmand pa jwenn', 404);
    }

    $stmt = $db->prepare("SELECT o.*, p.provider_ref, p.status AS pay_status FROM orders o JOIN payments p ON p.order_id = o.id WHERE o.id = ? AND o.user_id = ?");
    $stmt->execute([$orderId, $auth['user_id']]);
    $order = $stmt->fetch();
    if (!$order) error('Kòmand pa jwenn', 404);

    if ($order['payment_method'] === 'moncash' && $order['payment_status'] === 'pending') {
        $payment = moncashRetrievePayment($transactionId ?: null, $order['order_number']);
        $order['payment_status'] = settleMoncashPayment($order, $payment);
        if ($order['payment_status'] === 'paid') {
            $stmt = $db->prepare("SELECT delivery_status FROM orders WHERE id = ?");
            $stmt->execute([$orderId]);
            $order['delivery_status'] = $stmt->fetchColumn();
        }
    }

    success('OK', [
        'order_id'        => $orderId,
        'payment_status'  => $order['payment_status'],
        'delivery_status' => $order['delivery_status'],
    ]);
}

// ── MONCASH WEBHOOK (Alert URL) ──
// The body is only a hint: the payment is re-fetched from MonCash and matched to an order by
// the reference MonCash returns, so a forged call can't mark anything paid.
// MonCash may call this URL two ways: server-to-server (POST) to notify us, and by sending the
// customer's browser here (GET ?transactionId=...). A browser must end up back on the site, so
// GET requests are settled and then redirected to the return page.
function moncashWebhook(): void {
    $data          = getInput();
    $transactionId = trim((string)($data['transactionId'] ?? $data['transaction_id'] ?? ($_GET['transactionId'] ?? '')));
    if ($transactionId === '') { http_response_code(400); exit; }

    $isBrowser = ($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET';

    $payment = moncashRetrievePayment($transactionId, null);
    $order   = null;
    if ($payment) {
        $db   = getDB();
        $stmt = $db->prepare("SELECT * FROM orders WHERE order_number = ?");
        $stmt->execute([(string)($payment['reference'] ?? '')]);
        $order = $stmt->fetch() ?: null;
        if ($order) settleMoncashPayment($order, $payment);
    }

    if ($isBrowser) {
        // The return page re-checks the payment itself, so this works even if settling above failed.
        header('Location: ' . APP_URL . '/checkout/return?transactionId=' . urlencode($transactionId), true, 302);
        exit;
    }

    if (!$payment) { http_response_code(202); echo json_encode(['received' => true]); exit; }
    if (!$order)   { http_response_code(404); exit; }

    http_response_code(200);
    echo json_encode(['received' => true]);
}

// ── NATCASH WEBHOOK ──
function natcashWebhook(): void {
    $data   = getInput();
    $ref    = $data['reference'] ?? '';
    $status = strtolower($data['status'] ?? '');

    $db   = getDB();
    $stmt = $db->prepare("SELECT * FROM orders WHERE order_number = ?");
    $stmt->execute([$ref]);
    $order = $stmt->fetch();
    if (!$order) { http_response_code(404); exit; }

    if ($status === 'success' || $status === 'completed') {
        confirmPayment($order['id'], $data['transaction_id'] ?? $ref, json_encode($data));
    }

    http_response_code(200);
    echo json_encode(['received' => true]);
}

// ── STRIPE WEBHOOK ──
function stripeWebhook(): void {
    $payload   = file_get_contents('php://input');
    $sigHeader = $_SERVER['HTTP_STRIPE_SIGNATURE'] ?? '';

    // Verify Stripe signature
    try {
        $parts = explode(',', $sigHeader);
        $ts = null; $sig = null;
        foreach ($parts as $part) {
            [$k, $v] = explode('=', $part, 2);
            if ($k === 't') $ts = $v;
            if ($k === 'v1') $sig = $v;
        }
        $expected = hash_hmac('sha256', $ts . '.' . $payload, STRIPE_WEBHOOK_SECRET);
        if (!hash_equals($expected, $sig)) { http_response_code(400); exit('Signature invalid'); }
    } catch (Exception $e) { http_response_code(400); exit; }

    $event = json_decode($payload, true);

    if ($event['type'] === 'payment_intent.succeeded') {
        $pi      = $event['data']['object'];
        $orderId = (int)($pi['metadata']['order_id'] ?? 0);
        if ($orderId) {
            $db   = getDB();
            $stmt = $db->prepare("SELECT * FROM orders WHERE id = ?");
            $stmt->execute([$orderId]);
            $order = $stmt->fetch();
            if ($order) confirmPayment($order['id'], $pi['id'], json_encode($pi));
        }
    }

    http_response_code(200);
    echo json_encode(['received' => true]);
}

// ── SHARED: CONFIRM PAYMENT & TRIGGER DELIVERY ──
function confirmPayment(int $orderId, string $providerRef, string $rawResponse): void {
    $db = getDB();

    // Idempotency check
    $stmt = $db->prepare("SELECT payment_status FROM orders WHERE id = ?");
    $stmt->execute([$orderId]);
    $order = $stmt->fetch();
    if ($order['payment_status'] === 'paid') return;

    $db->prepare("UPDATE orders SET payment_status='paid', updated_at=NOW() WHERE id=?")->execute([$orderId]);
    $db->prepare("UPDATE payments SET status='success', provider_ref=?, raw_response=?, updated_at=NOW() WHERE order_id=?")
       ->execute([$providerRef, $rawResponse, $orderId]);

    // Auto-deliver code
    autoDeliverCode($orderId);
}

function autoDeliverCode(int $orderId): void {
    $db = getDB();
    $stmt = $db->prepare("
        SELECT o.*, p.name AS product_name, pkg.label AS package_label, u.email, u.first_name
        FROM orders o
        JOIN packages pkg ON pkg.id = o.package_id
        JOIN products p ON p.id = pkg.product_id
        JOIN users u ON u.id = o.user_id
        WHERE o.id = ?
    ");
    $stmt->execute([$orderId]);
    $order = $stmt->fetch();
    if (!$order || $order['delivery_status'] === 'delivered') return;

    $db->beginTransaction();
    try {
        $codeStmt = $db->prepare("SELECT id, code FROM code_inventory WHERE package_id = ? AND status = 'available' LIMIT 1 FOR UPDATE");
        $codeStmt->execute([$order['package_id']]);
        $inv = $codeStmt->fetch();

        if (!$inv) {
            $db->rollBack();
            // Alert admin — out of stock
            logAction(null, 'delivery_failed_no_stock', ['order_id' => $orderId]);
            return;
        }

        $db->prepare("UPDATE code_inventory SET status='sold', order_id=?, sold_at=NOW() WHERE id=?")->execute([$orderId, $inv['id']]);
        $db->prepare("INSERT INTO order_codes (order_id, inventory_id, code) VALUES (?,?,?)")->execute([$orderId, $inv['id'], $inv['code']]);
        $db->prepare("UPDATE orders SET delivery_status='delivered' WHERE id=?")->execute([$orderId]);

        // Points
        if ($order['points_earned'] > 0) {
            $db->prepare("UPDATE users SET points = points + ? WHERE id=?")->execute([$order['points_earned'], $order['user_id']]);
            $db->prepare("INSERT INTO points_transactions (user_id, type, points, description, order_id) VALUES (?,?,?,?,?)")
               ->execute([$order['user_id'], 'earn', $order['points_earned'], "Pwen #{$order['order_number']}", $orderId]);
        }

        // Referral points
        $refStmt = $db->prepare("SELECT * FROM referrals WHERE referred_id = ? AND status = 'pending'");
        $refStmt->execute([$order['user_id']]);
        $referral = $refStmt->fetch();
        if ($referral) {
            $db->prepare("UPDATE users SET points = points + ? WHERE id=?")->execute([POINTS_PER_REFERRAL, $referral['referrer_id']]);
            $db->prepare("UPDATE referrals SET status='completed', order_id=?, points_awarded=? WHERE id=?")
               ->execute([$orderId, POINTS_PER_REFERRAL, $referral['id']]);
        }

        $db->commit();

        require_once __DIR__ . '/../../utils/email.php';
        emailCodeDelivery($order['email'], $order['first_name'], $order, $inv['code']);
        logAction($order['user_id'], 'code_auto_delivered', ['order_id' => $orderId]);

    } catch (Exception $e) {
        $db->rollBack();
        logAction(null, 'auto_delivery_error', ['order_id' => $orderId, 'error' => $e->getMessage()]);
    }
}
