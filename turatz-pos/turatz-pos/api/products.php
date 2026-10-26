<?php
require __DIR__ . '/../config.php';
require_login();
$pdo = db();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  require_admin();                                         // only Admin manages products
  $in = input(); $a = $in['action'] ?? ''; $id = strtoupper(trim($in['id'] ?? ''));

  if ($a === 'delete') {                                   // erase
    $pdo->prepare('DELETE FROM products WHERE id = ?')->execute([$id]);
  } elseif ($a === 'restock') {
    $add = (int)($in['add'] ?? 0);
    if ($add < 1) fail('Enter a quantity of 1 or more.');
    $pdo->prepare('UPDATE products SET stock = stock + ? WHERE id = ?')->execute([$add, $id]);
  } elseif ($a === 'add' || $a === 'update') {
    $name = trim($in['name'] ?? ''); $cat = trim($in['category'] ?? '');
    $price = $in['price'] ?? ''; $stock = (string)($in['stock'] ?? '');
    $opts = implode(',', array_filter(array_map('trim', explode(',', $in['options'] ?? ''))));
    if ($a === 'add' && !preg_match('/^[A-Z0-9]{2,10}$/', $id)) fail('ID must be 2–10 letters or numbers.');
    if ($name === '' || strlen($name) > 80) fail('Enter a product name (max 80 characters).');
    if ($cat === '' || strlen($cat) > 30) fail('Enter a category (max 30 characters).');
    if (!is_numeric($price) || $price < 0) fail('Enter a valid price.');
    if (!ctype_digit($stock)) fail('Stock must be a whole number.');
    $opts = $opts === '' ? null : $opts;
    if ($a === 'add') {
      $st = $pdo->prepare('SELECT 1 FROM products WHERE id = ?'); $st->execute([$id]);
      if ($st->fetch()) fail('That ID is already used.', 409);
      $pdo->prepare('INSERT INTO products (id,name,category,price,stock,options) VALUES (?,?,?,?,?,?)')
          ->execute([$id, $name, $cat, $price, (int)$stock, $opts]);
    } else {
      $pdo->prepare('UPDATE products SET name=?,category=?,price=?,stock=?,options=? WHERE id=?')
          ->execute([$name, $cat, $price, (int)$stock, $opts, $id]);
    }
  } else fail('Unknown action.');
}
respond($pdo->query('SELECT id,name,category,price+0 AS price,stock,options FROM products ORDER BY category,name')->fetchAll());
