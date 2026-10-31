<?php
/**
 * Wahika CMS API (optional "server mode").
 * Needs PHP 7.4+ on the web host. Actions: ping, login, logout, save, upload, password.
 */
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

$root        = dirname(__DIR__);
$authFile    = __DIR__ . '/auth.php';
$dataDir     = $root . '/data';
$contentFile = $dataDir . '/content.json';
$uploadDir   = $root . '/images/uploads';

$secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
session_name('wahika_admin');
session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'secure' => $secure, 'httponly' => true, 'samesite' => 'Lax']);
session_start();

function out($data, int $code = 200): void {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
function authed(): bool { return !empty($_SESSION['ok']); }
function require_post(): void {
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') out(['error' => 'POST required'], 405);
}
function require_auth(): void {
    require_post();
    if (!authed()) out(['error' => 'Not signed in'], 401);
    $sent = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if (empty($_SESSION['csrf']) || !hash_equals((string)$_SESSION['csrf'], (string)$sent)) out(['error' => 'Bad token'], 403);
}
function load_auth(string $file): array {
    $a = is_file($file) ? include $file : [];
    return is_array($a) ? $a : [];
}
function verify(array $auth, string $pass): bool {
    if (empty($auth['salt']) || empty($auth['hash'])) return false;
    $calc = hash_pbkdf2('sha256', $pass, (string)$auth['salt'], 100000, 64, false);
    return hash_equals((string)$auth['hash'], $calc);
}
function json_body(int $max): array {
    $raw = file_get_contents('php://input', false, null, 0, $max + 1);
    if ($raw === false || strlen($raw) > $max) out(['error' => 'Request too large'], 413);
    $d = json_decode($raw, true);
    if (!is_array($d)) out(['error' => 'Invalid JSON'], 400);
    return $d;
}
function attempts_file(): string {
    return sys_get_temp_dir() . '/wahika_login_' . md5($_SERVER['REMOTE_ADDR'] ?? 'x');
}

$action = $_GET['action'] ?? '';

if ($action === 'ping') {
    out(['ok' => true, 'server' => true, 'authed' => authed(), 'csrf' => authed() ? ($_SESSION['csrf'] ?? '') : '']);
}

if ($action === 'login') {
    require_post();
    $f = attempts_file();
    $rec = is_file($f) ? json_decode((string)file_get_contents($f), true) : [];
    $count = (int)($rec['count'] ?? 0);
    $time  = (int)($rec['time'] ?? 0);
    if (time() - $time > 900) { $count = 0; }
    if ($count >= 8) out(['error' => 'Too many attempts. Try again in 15 minutes.'], 429);

    $b = json_body(4096);
    $auth = load_auth($authFile);
    $ok = isset($auth['user']) && hash_equals((string)$auth['user'], (string)($b['user'] ?? ''))
          && verify($auth, (string)($b['pass'] ?? ''));
    if (!$ok) {
        file_put_contents($f, json_encode(['count' => $count + 1, 'time' => time()]), LOCK_EX);
        sleep(1);
        out(['error' => 'Incorrect username or password'], 401);
    }
    @unlink($f);
    session_regenerate_id(true);
    $_SESSION['ok'] = true;
    $_SESSION['csrf'] = bin2hex(random_bytes(16));
    out(['ok' => true, 'csrf' => $_SESSION['csrf']]);
}

if ($action === 'logout') {
    $_SESSION = [];
    session_destroy();
    out(['ok' => true]);
}

if ($action === 'save') {
    require_auth();
    $d = json_body(6 * 1024 * 1024);
    $allowed = ['business' => 'a', 'media' => 'a', 'text' => 'a', 'hidden' => 'a', 'today' => 'a',
                'categories' => 'l', 'items' => 'l', 'gallery' => 'l', 'events' => 'l'];
    $clean = [];
    foreach ($allowed as $k => $type) {
        if (!array_key_exists($k, $d) || !is_array($d[$k])) continue;
        $clean[$k] = $d[$k];
    }
    if (!is_dir($dataDir) && !mkdir($dataDir, 0755, true)) out(['error' => 'Cannot create data folder'], 500);
    $json = json_encode($clean, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    if ($json === false) out(['error' => 'Could not encode content'], 400);

    // Keep a rolling backup of the previous version (last 20)
    if (is_file($contentFile) && filesize($contentFile) > 2) {
        $bk = $dataDir . '/backups';
        if (!is_dir($bk)) @mkdir($bk, 0755, true);
        @copy($contentFile, $bk . '/content-' . date('Ymd-His') . '.json');
        $files = glob($bk . '/content-*.json') ?: [];
        sort($files);
        while (count($files) > 20) { @unlink(array_shift($files)); }
    }
    $tmp = $contentFile . '.tmp';
    if (file_put_contents($tmp, $json, LOCK_EX) === false || !rename($tmp, $contentFile)) out(['error' => 'Could not write content.json (check folder permissions)'], 500);
    out(['ok' => true, 'saved' => date('c')]);
}

if ($action === 'upload') {
    require_auth();
    if (empty($_FILES['file']) || !is_uploaded_file($_FILES['file']['tmp_name'])) out(['error' => 'No file received'], 400);
    $f = $_FILES['file'];
    if ($f['error'] !== UPLOAD_ERR_OK) out(['error' => 'Upload failed (code ' . $f['error'] . ')'], 400);
    if ($f['size'] > 8 * 1024 * 1024) out(['error' => 'Image is larger than 8 MB'], 413);
    $info = @getimagesize($f['tmp_name']);
    $exts = [IMAGETYPE_JPEG => 'jpg', IMAGETYPE_PNG => 'png', IMAGETYPE_GIF => 'gif'];
    if (defined('IMAGETYPE_WEBP')) $exts[IMAGETYPE_WEBP] = 'webp';
    if (!$info || !isset($exts[$info[2]])) out(['error' => 'Only JPG, PNG, WebP or GIF images are allowed'], 415);
    if (!is_dir($uploadDir) && !mkdir($uploadDir, 0755, true)) out(['error' => 'Cannot create uploads folder'], 500);
    $ht = $uploadDir . '/.htaccess';
    if (!is_file($ht)) file_put_contents($ht, "<FilesMatch \"\\.(php|phtml|phar|pl|py|cgi)$\">\n  Require all denied\n</FilesMatch>\n");
    $name = date('Ymd-His') . '-' . bin2hex(random_bytes(4)) . '.' . $exts[$info[2]];
    if (!move_uploaded_file($f['tmp_name'], $uploadDir . '/' . $name)) out(['error' => 'Could not store the image (check folder permissions)'], 500);
    @chmod($uploadDir . '/' . $name, 0644);
    out(['ok' => true, 'path' => 'images/uploads/' . $name]);
}

if ($action === 'password') {
    require_auth();
    $b = json_body(4096);
    $auth = load_auth($authFile);
    if (!verify($auth, (string)($b['current'] ?? ''))) out(['error' => 'Current password is incorrect'], 403);
    $new = (string)($b['new'] ?? '');
    if (strlen($new) < 8) out(['error' => 'Use at least 8 characters'], 400);
    $salt = bin2hex(random_bytes(16));
    $new_auth = ['user' => $auth['user'] ?? 'Wahika', 'salt' => $salt, 'hash' => hash_pbkdf2('sha256', $new, $salt, 100000, 64, false)];
    $php = "<?php\nreturn " . var_export($new_auth, true) . ";\n";
    if (file_put_contents($authFile, $php, LOCK_EX) === false) out(['error' => 'Could not write auth file (check permissions)'], 500);
    if (function_exists('opcache_invalidate')) @opcache_invalidate($authFile, true);
    out(['ok' => true]);
}

out(['error' => 'Unknown action'], 404);
