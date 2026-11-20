<?php
// Copy this file to config.php on the server and fill in the real values.
// config.php is gitignored — never commit real secrets.

define('DB_HOST',    'localhost');
define('DB_NAME',    '');
define('DB_USER',    '');
define('DB_PASS',    '');
define('DB_CHARSET', 'utf8mb4');

define('TOKEN_SECRET', '');             // generate with: openssl rand -hex 32
define('TOKEN_EXPIRE', 60 * 60 * 24 * 7); // 7 days, in seconds

define('APP_URL',  'https://izitopups.com');      // frontend origin (CORS + links in emails)
define('SITE_URL', 'https://izitopups.com');
define('API_URL',  'https://api.izitopups.com/api'); // used for payment callbacks

// Email (Brevo). Preferred: BREVO_API_KEY (Brevo → SMTP & API → API Keys, starts with
// "xkeysib-"), sent over HTTPS. If it is empty, SMTP_USER / SMTP_PASS are used instead.
define('BREVO_API_KEY', '');
define('MAIL_FROM',      'hello@izitopups.com');  // must be a verified sender/domain in Brevo
define('MAIL_FROM_NAME', 'IziTopUp');
define('SMTP_HOST', 'smtp-relay.brevo.com');
define('SMTP_PORT', 587);
define('SMTP_USER', '');                          // the "Login" shown in Brevo
define('SMTP_PASS', '');                          // an SMTP key generated in Brevo

define('POINTS_PER_DOLLAR',   10);
define('POINTS_PER_REFERRAL', 50);
define('POINTS_TO_HTG_RATE',  1);

define('MONCASH_CLIENT_ID', '');
define('MONCASH_SECRET',    '');
define('MONCASH_BASE_URL',  'https://moncashbutton.digicelgroup.com/Moncash-business');

define('NATCASH_MERCHANT_ID', '');
define('NATCASH_API_KEY',     '');
define('NATCASH_BASE_URL',    'https://api.natcash.com');

define('STRIPE_SECRET_KEY',     '');
define('STRIPE_WEBHOOK_SECRET', '');

function getDB(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        try {
            $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
            $pdo = new PDO($dsn, DB_USER, DB_PASS, [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]);
        } catch (PDOException $e) {
            error_log('[db] connection failed: ' . $e->getMessage());
            http_response_code(500);
            die(json_encode(['success' => false, 'message' => 'Database connection failed']));
        }
    }
    return $pdo;
}
