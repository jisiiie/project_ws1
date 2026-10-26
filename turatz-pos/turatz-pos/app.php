<?php require __DIR__ . '/config.php'; if (!user()) { header('Location: index.php'); exit; } ?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Turatz Cafe – Moriah | POS</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="css/style.css">
</head>
<body>
<div class="shell">
  <aside class="sidebar">
    <div class="brand">Turatz<b>Cafe</b><small>Moriah Branch</small></div>
    <nav id="nav"></nav>
    <button class="nav-btn" id="logout">Log out</button>
  </aside>
  <main class="main" id="main"></main>
  <aside class="cart" id="cart"></aside>
</div>
<button class="fab" id="fab"></button>
<div class="modal" id="modal" hidden><div class="modal-box" id="modalBox"></div></div>
<div class="toast" id="toast" role="status"></div>
<script>window.USER = <?= json_encode(user(), JSON_HEX_TAG) ?>;</script>
<script src="js/app.js"></script>
</body>
</html>
