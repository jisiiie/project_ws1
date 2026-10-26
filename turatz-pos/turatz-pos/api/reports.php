<?php
require __DIR__ . '/../config.php';
require_admin();
$pdo = db();
$period = fn(string $where) => $pdo->query("SELECT COALESCE(SUM(total),0)+0 AS sales, COUNT(*) AS orders FROM orders WHERE $where")->fetch();
$series = function (string $sql, array $keys, callable $label) use ($pdo) {   // fills in periods that had no sales
  $map = [];
  foreach ($pdo->query($sql) as $r) $map[$r['k']] = $r;
  return array_map(fn($k) => ['label' => $label($k), 'sales' => $map[$k]['sales'] ?? 0, 'orders' => $map[$k]['orders'] ?? 0], $keys);
};

$days = []; for ($i = 6; $i >= 0; $i--) $days[] = date('Y-m-d', strtotime("-$i day"));
$mon = strtotime('monday this week');
$weeks = []; for ($i = 7; $i >= 0; $i--) $weeks[] = date('Y-m-d', strtotime("-$i week", $mon));
$months = []; for ($i = 5; $i >= 0; $i--) $months[] = date('Y-m', strtotime(date('Y-m-01') . " -$i month"));

respond([
  'total'   => $pdo->query('SELECT COALESCE(SUM(total),0)+0 AS revenue, COUNT(*) AS orders FROM orders')->fetch(),
  'today'   => $period('DATE(created_at) = CURDATE()'),
  'week'    => $period('YEARWEEK(created_at,1) = YEARWEEK(CURDATE(),1)'),
  'month'   => $period('YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = MONTH(CURDATE())'),
  'daily'   => $series('SELECT DATE(created_at) AS k, SUM(total)+0 AS sales, COUNT(*) AS orders FROM orders WHERE created_at >= CURDATE() - INTERVAL 6 DAY GROUP BY k', $days, fn($k) => date('D, M j', strtotime($k))),
  'weekly'  => $series('SELECT DATE_SUB(DATE(created_at), INTERVAL WEEKDAY(created_at) DAY) AS k, SUM(total)+0 AS sales, COUNT(*) AS orders FROM orders WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY) - INTERVAL 7 WEEK GROUP BY k', $weeks, fn($k) => 'Week of ' . date('M j', strtotime($k))),
  'monthly' => $series("SELECT DATE_FORMAT(created_at,'%Y-%m') AS k, SUM(total)+0 AS sales, COUNT(*) AS orders FROM orders WHERE created_at >= DATE_FORMAT(CURDATE() - INTERVAL 5 MONTH,'%Y-%m-01') GROUP BY k", $months, fn($k) => date('F Y', strtotime($k . '-01'))),
  'payment' => $pdo->query('SELECT payment_method AS label, SUM(total)+0 AS sales, COUNT(*) AS orders FROM orders GROUP BY payment_method ORDER BY sales DESC')->fetchAll(),
  'best'    => $pdo->query('SELECT name AS label, SUM(qty)+0 AS qty FROM order_items GROUP BY name ORDER BY qty DESC LIMIT 5')->fetchAll(),
  'category'=> $pdo->query('SELECT category AS label, SUM(qty*unit_price)+0 AS sales FROM order_items GROUP BY category ORDER BY sales DESC')->fetchAll(),
  'history' => $pdo->query("SELECT o.order_no,o.created_at,o.order_type,o.payment_method,o.total+0 AS total,u.username AS cashier,
                              GROUP_CONCAT(CONCAT(i.qty,' x ',i.name) SEPARATOR ', ') AS items
                            FROM orders o JOIN users u ON u.id=o.user_id LEFT JOIN order_items i ON i.order_id=o.id
                            GROUP BY o.id, u.username ORDER BY o.id DESC LIMIT 100")->fetchAll(),
]);
