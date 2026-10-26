<?php require __DIR__ . '/config.php'; if (user()) { header('Location: app.php'); exit; } ?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Turatz Cafe – Moriah | Sign in</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="css/style.css">
</head>
<body class="auth-body">
<main class="auth-card" id="card">
  <section class="auth-panel">
    <h2 id="panelTitle">Hello, Welcome!</h2>
    <p id="panelText">Don't have an account?</p>
    <button class="btn-outline" id="switchBtn" type="button">Register</button>
  </section>
  <section class="auth-forms"><div class="col">
    <form id="loginForm" novalidate>
      <h1>Login</h1>
      <label class="field"><input id="lUser" placeholder="Username or email" autocomplete="username"></label>
      <label class="field"><input id="lPass" type="password" placeholder="Password" autocomplete="current-password"></label>
      <p class="error" id="lErr" role="alert"></p>
      <button class="btn" type="submit">Login</button>
    </form>
    <form id="regForm" novalidate hidden>
      <h1>Registration</h1>
      <label class="field"><input id="rUser" placeholder="Username" autocomplete="username"></label>
      <label class="field"><input id="rEmail" type="email" placeholder="Email" autocomplete="email"></label>
      <label class="field"><input id="rPass" type="password" placeholder="Password (min. 6 characters)" autocomplete="new-password"></label>
      <label class="field"><input id="rCode" type="password" placeholder="Access code (Admin or Cashier)" autocomplete="off"></label>
      <p class="error" id="rErr" role="alert"></p>
      <button class="btn" type="submit">Register</button>
    </form>
  </div></section>
</main>
<script src="js/auth.js"></script>
</body>
</html>
