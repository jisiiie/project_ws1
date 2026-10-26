<?php
require __DIR__ . '/../config.php';
$in = input();
$action = $_GET['action'] ?? '';

if ($action === 'me') respond(['user' => user()]);
if ($action === 'logout') { session_destroy(); respond(['ok' => true]); }

if ($action === 'login') {
  $id = trim($in['username'] ?? '');
  $st = db()->prepare('SELECT id,username,email,role,active,password_hash FROM users WHERE username = ? OR email = ?');
  $st->execute([$id, $id]);
  $u = $st->fetch();
  if (!$u || !password_verify($in['password'] ?? '', $u['password_hash'])) fail('Invalid username or password.', 401);
  if (!$u['active']) fail('This account is deactivated. Ask the Admin.', 403);
  session_regenerate_id(true);
  $_SESSION['user'] = ['id' => (int)$u['id'], 'name' => $u['username'], 'email' => $u['email'], 'role' => $u['role']];
  respond(['user' => $_SESSION['user']]);
}

if ($action === 'register') {
  $name = trim($in['username'] ?? ''); $email = strtolower(trim($in['email'] ?? '')); $pass = $in['password'] ?? '';
  $code = (string)($in['code'] ?? '');
  if (hash_equals(ADMIN_CODE, $code)) $role = 'Admin';
  elseif (hash_equals(CASHIER_CODE, $code)) $role = 'Cashier';
  else fail('Wrong access code.', 403);
  if (!preg_match('/^[A-Za-z0-9_]{3,40}$/', $name)) fail('Username must be 3–40 letters, numbers, or underscores.');
  if (!filter_var($email, FILTER_VALIDATE_EMAIL)) fail('Enter a valid email address.');
  if (strlen($pass) < 6) fail('Password must be at least 6 characters.');
  $st = db()->prepare('SELECT 1 FROM users WHERE username = ? OR email = ?');
  $st->execute([$name, $email]);
  if ($st->fetch()) fail('Username or email is already registered.', 409);
  db()->prepare('INSERT INTO users (username,email,password_hash,role) VALUES (?,?,?,?)')
      ->execute([$name, $email, password_hash($pass, PASSWORD_DEFAULT), $role]);
  respond(['ok' => true], 201);
}
fail('Unknown action.', 404);
