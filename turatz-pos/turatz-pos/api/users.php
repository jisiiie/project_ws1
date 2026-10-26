<?php
require __DIR__ . '/../config.php';
$me = require_admin();                                    // only Admin manages users
$pdo = db();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  $in = input(); $a = $in['action'] ?? ''; $id = (int)($in['id'] ?? 0);
  $admins = fn() => (int)$pdo->query("SELECT COUNT(*) FROM users WHERE role='Admin' AND active=1")->fetchColumn();

  if ($a === 'add') {
    $name = trim($in['username'] ?? ''); $email = strtolower(trim($in['email'] ?? '')); $pass = $in['password'] ?? ''; $role = $in['role'] ?? '';
    if (!in_array($role, ['Admin', 'Cashier'], true)) fail('Choose a role.');
    if (!preg_match('/^[A-Za-z0-9_]{3,40}$/', $name)) fail('Username must be 3–40 letters, numbers, or underscores.');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) fail('Enter a valid email address.');
    if (strlen($pass) < 6) fail('Password must be at least 6 characters.');
    $st = $pdo->prepare('SELECT 1 FROM users WHERE username = ? OR email = ?'); $st->execute([$name, $email]);
    if ($st->fetch()) fail('Username or email is already registered.', 409);
    $pdo->prepare('INSERT INTO users (username,email,password_hash,role) VALUES (?,?,?,?)')
        ->execute([$name, $email, password_hash($pass, PASSWORD_DEFAULT), $role]);
  } else {
    $st = $pdo->prepare('SELECT * FROM users WHERE id = ?'); $st->execute([$id]);
    $t = $st->fetch();
    if (!$t) fail('User not found.', 404);
    if ($a === 'role') {
      $role = $in['role'] ?? '';
      if (!in_array($role, ['Admin', 'Cashier'], true)) fail('Choose a role.');
      if ($id === $me['id']) fail('You cannot change your own role.');
      if ($t['role'] === 'Admin' && $role !== 'Admin' && $t['active'] && $admins() < 2) fail('There must be at least one active Admin.');
      $pdo->prepare('UPDATE users SET role = ? WHERE id = ?')->execute([$role, $id]);
    } elseif ($a === 'reset') {
      if (strlen($in['password'] ?? '') < 6) fail('Password must be at least 6 characters.');
      $pdo->prepare('UPDATE users SET password_hash = ? WHERE id = ?')->execute([password_hash($in['password'], PASSWORD_DEFAULT), $id]);
    } elseif ($a === 'active') {
      $on = empty($in['active']) ? 0 : 1;
      if (!$on) {
        if ($id === $me['id']) fail('You cannot deactivate your own account.');
        if ($t['role'] === 'Admin' && $admins() < 2) fail('There must be at least one active Admin.');
      }
      $pdo->prepare('UPDATE users SET active = ? WHERE id = ?')->execute([$on, $id]);
    } else fail('Unknown action.');
  }
}
respond($pdo->query('SELECT id,username,email,role,active+0 AS active,created_at FROM users ORDER BY role,username')->fetchAll());
