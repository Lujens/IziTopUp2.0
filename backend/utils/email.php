<?php
require_once __DIR__ . '/../config/config.php';

/**
 * Write one line to logs/email.log (blocked from the web by .htaccess) and the PHP error log.
 * The recipient is masked so the log does not hold full addresses.
 */
function emailLog(string $message): void {
    $dir = __DIR__ . '/../logs';
    if (!is_dir($dir)) @mkdir($dir, 0750, true);
    @file_put_contents($dir . '/email.log', '[' . date('Y-m-d H:i:s') . '] ' . $message . "\n", FILE_APPEND | LOCK_EX);
    error_log('[email] ' . $message);
}

function maskEmail(string $email): string {
    [$local, $domain] = array_pad(explode('@', $email, 2), 2, '');
    return substr($local, 0, 2) . '***@' . $domain;
}

/**
 * Send an HTML email. Uses Brevo's HTTPS API when BREVO_API_KEY is set in config.php
 * (port 443, never blocked by the host); otherwise falls back to Brevo SMTP on port 587.
 */
function sendEmail(string $toEmail, string $toName, string $subject, string $htmlBody): bool {
    $ok = (defined('BREVO_API_KEY') && BREVO_API_KEY !== '')
        ? sendEmailViaApi($toEmail, $toName, $subject, $htmlBody)
        : sendEmailViaSmtp($toEmail, $toName, $subject, $htmlBody);
    if ($ok) emailLog('sent "' . $subject . '" to ' . maskEmail($toEmail));
    return $ok;
}

function sendEmailViaApi(string $toEmail, string $toName, string $subject, string $htmlBody): bool {
    $ch = curl_init('https://api.brevo.com/v3/smtp/email');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_TIMEOUT        => 20,
        CURLOPT_HTTPHEADER     => [
            'api-key: ' . BREVO_API_KEY,
            'Content-Type: application/json',
            'Accept: application/json',
        ],
        CURLOPT_POSTFIELDS     => json_encode([
            'sender'      => ['name' => MAIL_FROM_NAME, 'email' => MAIL_FROM],
            'to'          => [['email' => $toEmail, 'name' => $toName ?: $toEmail]],
            'subject'     => $subject,
            'htmlContent' => $htmlBody,
        ]),
    ]);
    $response = curl_exec($ch);
    $code     = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr  = curl_error($ch);
    curl_close($ch);

    if ($response === false) {
        emailLog('Brevo API request failed: ' . $curlErr);
        return false;
    }
    if ($code < 200 || $code >= 300) {
        emailLog("Brevo API rejected email to " . maskEmail($toEmail) . " (HTTP {$code}): " . substr((string)$response, 0, 300));
        return false;
    }
    return true;
}

function sendEmailViaSmtp(string $toEmail, string $toName, string $subject, string $htmlBody): bool {
    $host     = defined('SMTP_HOST') ? SMTP_HOST : 'smtp-relay.brevo.com';
    $port     = defined('SMTP_PORT') ? SMTP_PORT : 587;
    $user     = defined('SMTP_USER') ? SMTP_USER : '';
    $pass     = defined('SMTP_PASS') ? SMTP_PASS : '';
    $from     = MAIL_FROM;
    $fromName = MAIL_FROM_NAME;

    if ($user === '' || $pass === '') {
        emailLog("SMTP: SMTP_USER / SMTP_PASS missing in config.php — email to " . maskEmail($toEmail) . " not sent");
        return false;
    }

    $socket = @fsockopen($host, $port, $errno, $errstr, 15);
    if (!$socket) {
        emailLog("SMTP: cannot connect to {$host}:{$port} — {$errno} {$errstr}");
        return false;
    }
    stream_set_timeout($socket, 15);

    // Read a full (possibly multi-line) SMTP reply and return it.
    $read = function () use ($socket): string {
        $reply = '';
        while (($line = fgets($socket, 515)) !== false) {
            $reply .= $line;
            if (strlen($line) < 4 || $line[3] === ' ') break;
        }
        return $reply;
    };
    // Send a command and require the reply to start with $expect.
    $cmd = function (string $command, string $expect, string $step) use ($socket, $read): bool {
        if ($command !== '') fwrite($socket, $command . "\r\n");
        $reply = $read();
        if (strpos($reply, $expect) !== 0) {
            emailLog("SMTP: failed at {$step}: " . trim($reply));
            return false;
        }
        return true;
    };

    $ok = $cmd('', '220', 'greeting')
        && $cmd('EHLO izitopups.com', '250', 'EHLO')
        && $cmd('STARTTLS', '220', 'STARTTLS');

    if ($ok && !stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
        emailLog('SMTP: TLS negotiation failed');
        $ok = false;
    }

    $ok = $ok
        && $cmd('EHLO izitopups.com', '250', 'EHLO after TLS')
        && $cmd('AUTH LOGIN', '334', 'AUTH LOGIN')
        && $cmd(base64_encode($user), '334', 'AUTH username')
        && $cmd(base64_encode($pass), '235', 'AUTH password')
        && $cmd("MAIL FROM:<{$from}>", '250', 'MAIL FROM')
        && $cmd("RCPT TO:<{$toEmail}>", '250', 'RCPT TO')
        && $cmd('DATA', '354', 'DATA');

    if ($ok) {
        $msg  = "From: =?UTF-8?B?" . base64_encode($fromName) . "?= <{$from}>\r\n";
        $msg .= "To: =?UTF-8?B?" . base64_encode($toName) . "?= <{$toEmail}>\r\n";
        $msg .= "Subject: =?UTF-8?B?" . base64_encode($subject) . "?=\r\n";
        $msg .= "Date: " . date('r') . "\r\n";
        $msg .= "MIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\n";
        $msg .= "Content-Transfer-Encoding: base64\r\n\r\n";
        $msg .= chunk_split(base64_encode($htmlBody));
        $ok = $cmd($msg . "\r\n.", '250', 'message body');
    }

    fwrite($socket, "QUIT\r\n");
    fclose($socket);
    return $ok;
}

function emailTemplate(string $body): string {
    return "<!DOCTYPE html><html><head><meta charset='UTF-8'></head><body style='margin:0;padding:0;background:#F8F9FC;font-family:sans-serif'>
    <div style='max-width:560px;margin:0 auto;padding:2rem 1rem'>
      <div style='background:#6C63FF;border-radius:16px 16px 0 0;padding:1.5rem 2rem;text-align:center'>
        <h1 style='color:#fff;margin:0;font-size:1.4rem;font-weight:800'>⚡ IziTopUp</h1>
        <p style='color:rgba(255,255,255,0.8);margin:0.25rem 0 0;font-size:0.8rem'>Top-up jwèt ou an 60 segonn</p>
      </div>
      <div style='background:#fff;border-radius:0 0 16px 16px;padding:2rem;border:1px solid #E8EAF0;border-top:none'>
        {$body}
        <hr style='border:none;border-top:1px solid #E8EAF0;margin:1.5rem 0'>
        <p style='color:#9CA3AF;font-size:0.72rem;text-align:center;margin:0'>© " . date('Y') . " IziTopUp · izitopups.com</p>
      </div>
    </div></body></html>";
}

function emailWelcome(string $email, string $name): void {
    $body = "<h2 style='color:#0F172A;margin:0 0 0.5rem'>Byenvini, {$name}! 👋</h2>
      <p style='color:#6B7280;line-height:1.75;margin:0 0 1.5rem'>Achte diamonds Free Fire, UC PUBG, V-Bucks Fortnite — peye ak MonCash oswa NatCash epi resevwa kòd ou an mwens ke 60 segonn.</p>
      <div style='text-align:center'><a href='" . APP_URL . "' style='background:#6C63FF;color:#fff;padding:0.875rem 2rem;border-radius:10px;text-decoration:none;font-weight:700;display:inline-block'>🎮 Kòmanse achte →</a></div>";
    sendEmail($email, $name, "Byenvini sou IziTopUp! 🎮", emailTemplate($body));
}

function emailOrderConfirm(string $email, string $name, array $order): void {
    $body = "<h2 style='color:#0F172A;margin:0 0 0.5rem'>Kòmand ou konfime ✅</h2>
      <div style='background:#F8F9FC;border-radius:12px;padding:1.25rem;margin:0 0 1rem'>
        <p style='margin:0.3rem 0;font-size:0.85rem;color:#374151'><strong>Nimewo:</strong> {$order['order_number']}</p>
        <p style='margin:0.3rem 0;font-size:0.85rem;color:#374151'><strong>Pwodwi:</strong> {$order['product_name']} · {$order['package_label']}</p>
        <p style='margin:0.3rem 0;font-size:0.85rem;color:#374151'><strong>Total:</strong> \${$order['price_usd']} ({$order['price_htg']} HTG)</p>
      </div>";
    sendEmail($email, $name, "Kòmand #{$order['order_number']} konfime — IziTopUp", emailTemplate($body));
}

function emailCodeDelivery(string $email, string $name, array $order, string $code): void {
    $body = "<h2 style='color:#0F172A;margin:0 0 0.5rem'>Kòd ou a prè! ⚡</h2>
      <div style='background:#F5F4FF;border:2px solid #6C63FF;border-radius:12px;padding:1.5rem;text-align:center;margin:0 0 1rem'>
        <p style='font-size:0.72rem;color:#6B7280;text-transform:uppercase;letter-spacing:1px;margin:0 0 0.5rem'>Kòd ou an</p>
        <p style='font-family:monospace;font-size:1.6rem;font-weight:700;color:#6C63FF;letter-spacing:3px;margin:0 0 0.75rem'>{$code}</p>
      </div>
      <div style='background:#F8F9FC;border-radius:10px;padding:1rem;margin:0 0 1rem'>
        <p style='margin:0.25rem 0;font-size:0.82rem;color:#374151'><strong>Kòmand:</strong> {$order['order_number']}</p>
        <p style='margin:0.25rem 0;font-size:0.82rem;color:#374151'><strong>Pwodwi:</strong> {$order['product_name']} · {$order['package_label']}</p>
      </div>";
    sendEmail($email, $name, "⚡ Kòd {$order['product_name']} ou a — IziTopUp", emailTemplate($body));
}

function emailPasswordReset(string $email, string $name, string $resetLink): void {
    $body = "<h2 style='color:#0F172A;margin:0 0 0.5rem'>Reset modpas ou 🔒</h2>
      <p style='color:#6B7280;margin:0 0 1.5rem'>Bonjou {$name}, klike bouton an pou kreye yon nouvo modpas.</p>
      <div style='text-align:center;margin:0 0 1.5rem'>
        <a href='{$resetLink}' style='background:#6C63FF;color:#fff;padding:0.875rem 2rem;border-radius:10px;text-decoration:none;font-weight:700;display:inline-block'>Reset Modpas Mwen →</a>
      </div>
      <p style='color:#9CA3AF;font-size:0.8rem;margin:0'>Lyen sa a ekspire nan 30 minit.</p>";
    sendEmail($email, $name, "Reset modpas ou — IziTopUp", emailTemplate($body));
}
