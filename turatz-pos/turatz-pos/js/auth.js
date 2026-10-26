const $ = id => document.getElementById(id);
const card = $('card');

async function post(url, body) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}

function setMode(reg) {
  card.classList.toggle('reg', reg);
  $('loginForm').hidden = reg; $('regForm').hidden = !reg;
  $('panelTitle').textContent = reg ? 'Welcome Back!' : 'Hello, Welcome!';
  $('panelText').textContent = reg ? 'Already have an account?' : "Don't have an account?";
  $('switchBtn').textContent = reg ? 'Login' : 'Register';
  $('lErr').textContent = $('rErr').textContent = '';
}
$('switchBtn').onclick = () => setMode(!card.classList.contains('reg'));

$('loginForm').onsubmit = async e => {
  e.preventDefault();
  const username = $('lUser').value.trim(), password = $('lPass').value;
  $('lErr').style.color = '';
  if (!username || !password) return $('lErr').textContent = 'Enter your username and password.';
  try { await post('api/auth.php?action=login', { username, password }); location.href = 'app.php'; }
  catch (err) { $('lErr').textContent = err.message; }
};

$('regForm').onsubmit = async e => {
  e.preventDefault();
  try {
    await post('api/auth.php?action=register', { username: $('rUser').value, email: $('rEmail').value, password: $('rPass').value, code: $('rCode').value });
    setMode(false);
    $('lErr').style.color = '#2a7de1';
    $('lErr').textContent = 'Account created. You can log in now.';
  } catch (err) { $('rErr').textContent = err.message; }
};

