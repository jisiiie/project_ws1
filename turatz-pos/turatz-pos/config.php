<?php
// ---- Database (XAMPP defaults shown) ----
const DB_HOST = 'localhost';
const DB_NAME = 'turatz_pos';
const DB_USER = 'root';
const DB_PASS = '';

// ---- Registration access codes ----
// The code typed on the Register form decides the role. Change both and share them only with the right people.
const ADMIN_CODE = 'ADMIN2026';   // owner / manager  -> Admin
const CASHIER_CODE = 'TURATZ2026'; // cashier         -> Cashier

date_default_timezone_set('Asia/Manila');
session_set_cookie_params(['httponly' => true, 'samesite' => 'Lax']);
session_start();

function db(): PDO {
  static $pdo;
  if (!$pdo) {
    $pdo = new PDO('mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4', DB_USER, DB_PASS, [
      PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
      PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
      PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    $pdo->exec("SET time_zone = '+08:00'");
  }
  return $pdo;
}
function respond($data, int $code = 200): never {
  http_response_code($code);
  header('Content-Type: application/json');
  echo json_encode($data);
  exit;
}
function fail(string $msg, int $code = 400): never { respond(['error' => $msg], $code); }
function input(): array { return json_decode(file_get_contents('php://input'), true) ?? []; }
function user(): ?array { return $_SESSION['user'] ?? null; }
function require_login(): array { return user() ?? fail('Please log in.', 401); }
function require_admin(): array {
  $u = require_login();
  if ($u['role'] !== 'Admin') fail('Admin access only.', 403);
  return $u;
}
