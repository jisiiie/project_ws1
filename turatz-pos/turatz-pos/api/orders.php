<?php
require __DIR__ . '/../config.php';
$u = require_login();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {                // search sales records
  $q = '%' . trim($_GET['q'] ?? '') . '%';
  $st = db()->prepare('SELECT o.id,o.order_no,o.order_type,o.payment_method,o.total+0 AS total,o.created_at,u.username AS cashier
    FROM orders o JOIN users u ON u.id=o.user_id
    WHERE CAST(o.order_no AS CHAR) LIKE ? OR u.username LIKE ? OR o.payment_method LIKE ? OR o.order_type LIKE ? OR o.created_at LIKE ?
    ORDER BY o.id DESC LIMIT 200');
  $st->execute([$q, $q, $q, $q, $q]);
  respond($st->fetchAll());
}

// ---- Place order ----
$in = input();
$type = $in['type'] ?? ''; $pay = $in['payment'] ?? ''; $paid = (float)($in['paid'] ?? 0);
if (!in_array($type, ['Dine in', 'To go'], true)) fail('Choose Dine in or To go.');
if (!in_array($pay, ['Cash', 'E-Wallet'], true)) fail('Choose Cash or E-Wallet.');
if (empty($in['items']) || !is_array($in['items'])) fail('Add at least one item.');

$pdo = db();
try {
  $pdo->beginTransaction();
  $total = 0; $lines = [];
  foreach ($in['items'] as $it) {
    $qty = (int)($it['qty'] ?? 0);
    if ($qty < 1) throw new RuntimeException('Invalid quantity.');
    $st = $pdo->prepare('SELECT * FROM products WHERE id = ? FOR UPDATE');
    $st->execute([(string)($it['id'] ?? '')]);
    $p = $st->fetch();
    if (!$p) throw new RuntimeException('A product in the cart no longer exists.');
    if ($p['stock'] < $qty) throw new RuntimeException("Not enough stock for {$p['name']} (left: {$p['stock']}).");
    $opts = $p['options'] ? array_map('trim', explode(',', $p['options'])) : [];
    $opt = $opts ? ($it['opt'] ?? '') : null;
    if ($opts && !in_array($opt, $opts, true)) throw new RuntimeException("Choose an option for {$p['name']}.");
    $price = (float)$p['price'];                      // price always comes from the database
    $total += $price * $qty;
    $lines[] = [$p, $opt, $qty, $price];
  }
  if ($pay === 'Cash' && $paid < $total) throw new RuntimeException('Cash received is less than the total.');
  if ($pay === 'E-Wallet' && abs($paid - $total) > 0.004) throw new RuntimeException('E-wallet payment must be the exact total.');
  $no = (int)$pdo->query('SELECT COALESCE(MAX(order_no),1000)+1 FROM orders')->fetchColumn();
  $pdo->prepare('INSERT INTO orders (order_no,user_id,order_type,payment_method,total,amount_paid,change_due) VALUES (?,?,?,?,?,?,?)')
      ->execute([$no, $u['id'], $type, $pay, $total, $paid, $paid - $total]);
  $oid = $pdo->lastInsertId();
  foreach ($lines as [$p, $opt, $qty, $price]) {
    $pdo->prepare('INSERT INTO order_items (order_id,product_id,name,category,opt,qty,unit_price) VALUES (?,?,?,?,?,?,?)')
        ->execute([$oid, $p['id'], $p['name'], $p['category'], $opt, $qty, $price]);
    $pdo->prepare('UPDATE products SET stock = stock - ? WHERE id = ?')->execute([$qty, $p['id']]);
  }
  $pdo->commit();
} catch (RuntimeException $e) { $pdo->rollBack(); fail($e->getMessage()); }
  catch (Throwable $e) { if ($pdo->inTransaction()) $pdo->rollBack(); fail('Could not save the order.', 500); }

respond(['order_no' => $no, 'total' => $total, 'paid' => $paid, 'change' => $paid - $total, 'type' => $type,
         'payment' => $pay, 'cashier' => $u['name'], 'date' => date('Y-m-d H:i'),
         'items' => array_map(fn($l) => ['name' => $l[0]['name'], 'opt' => $l[1], 'qty' => $l[2], 'price' => $l[3]], $lines)], 201);
