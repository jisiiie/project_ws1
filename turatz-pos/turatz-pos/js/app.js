const $ = id => document.getElementById(id);
const peso = n => '₱' + Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ORDER = ['Classic Brew', 'Signature Brew', 'Milk Series', 'Matcha Series', 'Refresher'];
const catRank = c => { const i = ORDER.indexOf(c); return i < 0 ? 99 : i; };

const isAdmin = USER.role === 'Admin';
const state = {range: 'daily', rep: null, uedit: false,  view: 'orders', products: [], cat: 'All', search: '', opts: {}, cart: [], type: 'Dine in', pay: 'Cash', paid: '', err: '', edit: null, psearch: '' };
const userChip = () => `<div class="userbox"><b>${esc(USER.name)}</b><small>${esc(USER.role)} • ${esc(USER.email)}</small></div>`;

async function api(url, body) {
  const res = await fetch(url, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) { location.href = 'index.php'; throw new Error('Please log in.'); }
  if (!res.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}
function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2400); }
const prod = id => state.products.find(p => p.id === id);
const stockLeft = id => prod(id).stock - state.cart.filter(c => c.id === id).reduce((a, c) => a + c.qty, 0);
const total = () => state.cart.reduce((a, c) => a + Number(prod(c.id).price) * c.qty, 0);
const keepFocus = id => { const n = $(id); n.focus(); n.setSelectionRange(n.value.length, n.value.length); };

/* ---------- Navigation ---------- */
const TABS = [['orders', 'Orders'], ...(isAdmin ? [['products', 'Products'], ['users', 'Users']] : []), ['records', 'Sales Records'], ...(isAdmin ? [['reports', 'Reports']] : [])];
function renderNav() {
  $('nav').innerHTML = TABS.map(([k, l]) => `<button class="nav-btn ${state.view === k ? 'active' : ''}" data-v="${k}">${l}</button>`).join('');
  $('nav').querySelectorAll('button').forEach(b => b.onclick = () => { state.view = b.dataset.v; show(); });
}
async function show() {
  if (!TABS.some(t => t[0] === state.view)) state.view = 'orders';
  renderNav();
  const o = state.view === 'orders';
  $('cart').hidden = !o; $('fab').hidden = !o;
  document.body.classList.remove('cart-open');
  document.querySelector('.shell').style.gridTemplateColumns = o ? '' : '200px 1fr';
  try {
    if (o) { await loadProducts(); renderOrders(); renderCart(); }
    if (state.view === 'products') await renderProducts();
    if (state.view === 'users') await renderUsers();
    if (state.view === 'records') await renderRecords();
    if (state.view === 'reports') await renderReports();
  } catch (e) { toast(e.message); }
}
async function loadProducts() {
  const list = await api('api/products.php');
  state.products = list.sort((a, b) => catRank(a.category) - catRank(b.category) || a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
  state.cart = state.cart.filter(c => prod(c.id));
}

/* ---------- Orders (menu + cart) ---------- */
function renderOrders() {
  const cats = ['All', ...new Set(state.products.map(p => p.category))];
  const q = state.search.toLowerCase();
  const list = state.products.filter(p => (state.cat === 'All' || p.category === state.cat) && (p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q)));
  $('main').innerHTML = `
    <div class="top"><h2>Menu</h2><input class="search" id="q" placeholder="Search name or ID" value="${esc(state.search)}"></div>
    <div class="pills">${cats.map(c => `<button class="pill ${c === state.cat ? 'active' : ''}" data-c="${esc(c)}">${esc(c)}</button>`).join('')}</div>
    <div class="grid">${list.map(p => {
      const left = stockLeft(p.id), os = p.options ? p.options.split(',') : [];
      return `<div class="card"><div><span class="code">${esc(p.id)}</span><h3>${esc(p.name)}</h3><span class="price">${peso(p.price)}</span>
        <div class="stock ${left <= 5 ? 'low' : ''}">${left > 0 ? left + ' in stock' : 'Out of stock'}</div></div>
        ${os.length ? `<select class="opt" data-o="${p.id}">${os.map(o => `<option ${(state.opts[p.id] || os[0]) === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>` : ''}
        <button class="add" data-add="${p.id}" ${left < 1 ? 'disabled' : ''}>Add to cart</button></div>`;
    }).join('') || '<p class="empty">No menu items match.</p>'}</div>`;
  $('q').oninput = e => { state.search = e.target.value; renderOrders(); keepFocus('q'); };
  document.querySelectorAll('.pill').forEach(b => b.onclick = () => { state.cat = b.dataset.c; renderOrders(); });
  document.querySelectorAll('[data-o]').forEach(s => s.onchange = () => state.opts[s.dataset.o] = s.value);
  document.querySelectorAll('[data-add]').forEach(b => b.onclick = () => {
    const id = b.dataset.add, p = prod(id), opt = p.options ? (state.opts[id] || p.options.split(',')[0]) : null;
    const ex = state.cart.find(c => c.id === id && c.opt === opt);
    ex ? ex.qty++ : state.cart.push({ id, opt, qty: 1 });
    renderOrders(); renderCart();
  });
}

function renderCart() {
  const t = total(), paid = parseFloat(state.paid) || 0, n = state.cart.reduce((a, c) => a + c.qty, 0);
  $('fab').textContent = `View cart (${n}) • ${peso(t)}`;
  $('cart').innerHTML = `
    <div class="cart-head">${userChip()}<button class="x" id="closeCart">Close</button></div>
    <h3>Order list <small>${n} items</small>${n ? '<button class="link" id="clear">Erase all</button>' : ''}</h3>
    <div class="seg">${['Dine in', 'To go'].map(x => `<button data-t="${x}" class="${state.type === x ? 'active' : ''}">${x}</button>`).join('')}</div>
    <div class="items">${state.cart.map((c, i) => { const p = prod(c.id); return `
      <div class="item"><div class="info">${esc(p.name)}<small>${esc(p.id)}${c.opt ? ' • ' + esc(c.opt) : ''} • ${peso(p.price)}</small><button class="rm" data-x="${i}">Erase</button></div>
      <div class="qty"><button data-m="${i}" aria-label="Decrease">−</button>${c.qty}<button data-p="${i}" aria-label="Increase">+</button></div></div>`; }).join('') || '<p class="empty">No items yet. Add items from the menu.</p>'}</div>
    <div class="sum"><div class="total"><span>Total</span><span>${peso(t)}</span></div>
    ${state.pay === 'Cash' ? `<div><span>Change</span><span id="chg">${paid >= t && t > 0 ? peso(paid - t) : peso(0)}</span></div>` : ''}</div>
    <div class="seg">${['Cash', 'E-Wallet'].map(x => `<button data-pay="${x}" class="${state.pay === x ? 'active' : ''}">${x}</button>`).join('')}</div>
    <input id="paid" type="number" min="0" step="0.01" placeholder="${state.pay === 'Cash' ? 'Cash received' : 'Exact amount'}" value="${esc(state.paid)}">
    <p class="err" role="alert">${esc(state.err)}</p>
    <button class="place" id="place">Place order</button>`;
  $('paid').oninput = e => { state.paid = e.target.value; const c = $('chg'); if (c) { const v = parseFloat(state.paid) || 0; c.textContent = peso(v >= total() && total() > 0 ? v - total() : 0); } };
  document.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { state.type = b.dataset.t; renderCart(); });
  document.querySelectorAll('[data-pay]').forEach(b => b.onclick = () => { state.pay = b.dataset.pay; state.paid = ''; renderCart(); });
  document.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { const c = state.cart[b.dataset.p]; if (stockLeft(c.id) > 0) c.qty++; renderOrders(); renderCart(); });
  document.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { const i = b.dataset.m; if (--state.cart[i].qty < 1) state.cart.splice(i, 1); renderOrders(); renderCart(); });
  document.querySelectorAll('[data-x]').forEach(b => b.onclick = () => { state.cart.splice(b.dataset.x, 1); renderOrders(); renderCart(); });
  if ($('clear')) $('clear').onclick = () => { state.cart = []; renderOrders(); renderCart(); };
  $('closeCart').onclick = () => document.body.classList.remove('cart-open');
  $('place').onclick = placeOrder;
}
$('fab').onclick = () => document.body.classList.add('cart-open');

async function placeOrder() {
  const t = total(), paid = parseFloat(state.paid) || 0;
  state.err = '';
  if (!state.cart.length) state.err = 'Add at least one item.';
  else if (state.pay === 'Cash' && paid < t) state.err = 'Cash received is less than the total.';
  else if (state.pay === 'E-Wallet' && Math.abs(paid - t) > 0.004) state.err = 'E-wallet payment must be the exact total.';
  if (state.err) return renderCart();
  try {
    const r = await api('api/orders.php', { items: state.cart, type: state.type, payment: state.pay, paid });
    state.cart = []; state.paid = '';
    document.body.classList.remove('cart-open');
    showReceipt(r);
    await loadProducts(); renderOrders(); renderCart();
  } catch (e) { state.err = e.message; renderCart(); }
}

function showReceipt(r) {
  $('modalBox').innerHTML = `<div class="receipt"><h3>Turatz Cafe – Moriah</h3><p class="c">Order #${r.order_no} • ${esc(r.type)}<br>${esc(r.date)} • Cashier: ${esc(r.cashier)}</p><hr>
    ${r.items.map(i => `<div class="l"><span>${i.qty} × ${esc(i.name)}${i.opt ? ' (' + esc(i.opt) + ')' : ''}</span><span>${peso(i.price * i.qty)}</span></div>`).join('')}<hr>
    <div class="l"><b>Total</b><b>${peso(r.total)}</b></div><div class="l"><span>${esc(r.payment)}</span><span>${peso(r.paid)}</span></div>
    ${r.payment === 'Cash' ? `<div class="l"><span>Change</span><span>${peso(r.change)}</span></div>` : ''}<hr><p class="c">Order done. Thank you!</p></div>
    <div class="seg" style="margin-top:14px"><button class="active" id="closeM">Done</button></div>`;
  $('modal').hidden = false; $('closeM').onclick = () => $('modal').hidden = true;
}

/* ---------- Product management ---------- */
async function renderProducts() { await loadProducts(); drawProducts(); }
function drawProducts() {
  const q = state.psearch.toLowerCase(), e = state.edit;
  const rows = state.products.filter(p => p.id.toLowerCase().includes(q) || p.name.toLowerCase().includes(q));
  const cats = [...new Set(state.products.map(p => p.category))];
  $('main').innerHTML = `<div class="top"><h2>Product Management</h2><input class="search" id="ps" placeholder="Search by ID or name" value="${esc(state.psearch)}"><button class="mini" id="addNew">Add product</button>${userChip()}</div>
    ${e ? `<div class="panel"><h3>${e.isNew ? 'Add product' : 'Edit product'}</h3><div class="fgrid">
      <label>ID<input id="f_id" value="${esc(e.id || '')}" ${e.isNew ? '' : 'disabled'} maxlength="10" placeholder="e.g. CS2A"></label>
      <label>Name<input id="f_name" value="${esc(e.name || '')}" maxlength="80"></label>
      <label>Category<input id="f_cat" list="cats" value="${esc(e.category || '')}" maxlength="30"></label>
      <label>Price (₱)<input id="f_price" type="number" min="0" step="0.01" value="${esc(e.price ?? '')}"></label>
      <label>Stock<input id="f_stock" type="number" min="0" step="1" value="${esc(e.stock ?? 0)}"></label>
      <label>Options (optional)<input id="f_opts" value="${esc(e.options || '')}" placeholder="Strawberry,Lychee,Lemon"></label></div>
      <datalist id="cats">${cats.map(c => `<option value="${esc(c)}">`).join('')}</datalist>
      <p class="err" id="pErr" role="alert"></p><div class="seg"><button class="active" id="save">Save</button><button id="cancel">Cancel</button></div></div>` : ''}
    <div class="panel"><table><tr><th>ID</th><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Options</th><th>Actions</th></tr>
    ${rows.map(p => `<tr><td>${esc(p.id)}</td><td>${esc(p.name)}</td><td>${esc(p.category)}</td><td>${peso(p.price)}</td>
      <td class="${p.stock <= 10 ? 'stock low' : ''}">${p.stock}${p.stock <= 10 ? ' (low)' : ''}</td><td>${esc(p.options || '—')}</td>
      <td><div class="acts"><button class="mini" data-e="${p.id}">Edit</button><button class="mini danger" data-d="${p.id}">Erase</button>
      <div class="form"><input type="number" min="1" placeholder="Qty" id="r_${p.id}"><button class="mini" data-r="${p.id}">Add stock</button></div></div></td></tr>`).join('') || '<tr><td colspan="7" class="empty">No products found.</td></tr>'}</table></div>`;
  $('ps').oninput = ev => { state.psearch = ev.target.value; drawProducts(); keepFocus('ps'); };
  $('addNew').onclick = () => { state.edit = { isNew: true }; drawProducts(); $('main').scrollTop = 0; };
  document.querySelectorAll('[data-e]').forEach(b => b.onclick = () => { state.edit = { ...prod(b.dataset.e), isNew: false }; drawProducts(); $('main').scrollTop = 0; });
  document.querySelectorAll('[data-d]').forEach(b => b.onclick = async () => {
    if (!confirm('Erase ' + prod(b.dataset.d).name + '? Past sales records are kept.')) return;
    try { await api('api/products.php', { action: 'delete', id: b.dataset.d }); toast('Product erased'); renderProducts(); } catch (err) { toast(err.message); }
  });
  document.querySelectorAll('[data-r]').forEach(b => b.onclick = async () => {
    try { await api('api/products.php', { action: 'restock', id: b.dataset.r, add: +$('r_' + b.dataset.r).value }); toast('Stock updated'); renderProducts(); } catch (err) { toast(err.message); }
  });
  if (e) { $('cancel').onclick = () => { state.edit = null; drawProducts(); }; $('save').onclick = saveProduct; }
}
async function saveProduct() {
  const body = { action: state.edit.isNew ? 'add' : 'update', id: $('f_id').value.trim().toUpperCase(), name: $('f_name').value.trim(), category: $('f_cat').value.trim(), price: $('f_price').value, stock: $('f_stock').value, options: $('f_opts').value.trim() };
  try { await api('api/products.php', body); state.edit = null; toast('Product saved'); await renderProducts(); }
  catch (err) { $('pErr').textContent = err.message; }
}

/* ---------- Sales records ---------- */
async function renderRecords(q = '') {
  const rows = await api('api/orders.php?q=' + encodeURIComponent(q));
  $('main').innerHTML = `<div class="top"><h2>Sales Records</h2><input class="search" id="rq" placeholder="Search order #, cashier, payment, date" value="${esc(q)}">${userChip()}</div>
    <div class="panel"><table><tr><th>Order</th><th>Date</th><th>Type</th><th>Payment</th><th>Cashier</th><th>Total</th></tr>
    ${rows.map(o => `<tr><td>#${o.order_no}</td><td>${esc(o.created_at)}</td><td>${esc(o.order_type)}</td><td>${esc(o.payment_method)}</td><td>${esc(o.cashier)}</td><td>${peso(o.total)}</td></tr>`).join('') || '<tr><td colspan="6" class="empty">No records found.</td></tr>'}</table></div>`;
  let t; $('rq').oninput = e => { clearTimeout(t); t = setTimeout(() => renderRecords(e.target.value).then(() => keepFocus('rq')), 300); };
}

/* ---------- Users (Admin) ---------- */
async function renderUsers() { state.users = await api('api/users.php'); drawUsers(); }
async function userAction(body, msg) {
  try { state.users = await api('api/users.php', body); toast(msg); state.uedit = false; drawUsers(); }
  catch (e) { toast(e.message); const p = $('uErr'); if (p) p.textContent = e.message; }
}
function drawUsers() {
  $('main').innerHTML = `<div class="top"><h2>Users</h2><button class="mini" id="addU">Add user</button>${userChip()}</div>
    ${state.uedit ? `<div class="panel"><h3>Add user</h3><div class="fgrid">
      <label>Username<input id="u_name" maxlength="40"></label><label>Email<input id="u_email" type="email"></label>
      <label>Password<input id="u_pass" type="password" placeholder="min. 6 characters"></label>
      <label>Role<select id="u_role" class="opt"><option>Cashier</option><option>Admin</option></select></label></div>
      <p class="err" id="uErr" role="alert"></p><div class="seg"><button class="active" id="uSave">Save</button><button id="uCancel">Cancel</button></div></div>` : ''}
    <div class="panel"><table><tr><th>Username</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr>
    ${state.users.map(u => `<tr><td>${esc(u.username)}${u.id === USER.id ? ' (you)' : ''}</td><td>${esc(u.email)}</td>
      <td><select class="opt" data-role="${u.id}" ${u.id === USER.id ? 'disabled' : ''}><option ${u.role === 'Admin' ? 'selected' : ''}>Admin</option><option ${u.role === 'Cashier' ? 'selected' : ''}>Cashier</option></select></td>
      <td class="${u.active ? '' : 'stock low'}">${u.active ? 'Active' : 'Deactivated'}</td>
      <td><div class="acts"><button class="mini" data-pw="${u.id}">Reset password</button>${u.id === USER.id ? '' : `<button class="mini ${u.active ? 'danger' : ''}" data-act="${u.id}" data-on="${u.active ? 0 : 1}">${u.active ? 'Deactivate' : 'Activate'}</button>`}</div></td></tr>`).join('')}</table></div>`;
  $('addU').onclick = () => { state.uedit = true; drawUsers(); };
  if (state.uedit) {
    $('uCancel').onclick = () => { state.uedit = false; drawUsers(); };
    $('uSave').onclick = () => userAction({ action: 'add', username: $('u_name').value.trim(), email: $('u_email').value.trim(), password: $('u_pass').value, role: $('u_role').value }, 'User added');
  }
  document.querySelectorAll('[data-role]').forEach(s => s.onchange = () => userAction({ action: 'role', id: +s.dataset.role, role: s.value }, 'Role updated').then(() => renderUsers()));
  document.querySelectorAll('[data-pw]').forEach(b => b.onclick = () => {
    const u = state.users.find(x => x.id == b.dataset.pw), pw = prompt('New password for ' + u.username + ' (min. 6 characters):');
    if (pw) userAction({ action: 'reset', id: u.id, password: pw }, 'Password changed');
  });
  document.querySelectorAll('[data-act]').forEach(b => b.onclick = () => userAction({ action: 'active', id: +b.dataset.act, active: +b.dataset.on }, 'User updated'));
}

/* ---------- Reports (Admin) ---------- */
async function renderReports() { state.rep = await api('api/reports.php'); drawReports(); }
function drawReports() {
  const r = state.rep;
  const bars = rows => { const max = Math.max(1, ...rows.map(x => x.value)); return rows.map(x => `<div class="bar"><div><span>${esc(x.label)}</span><b>${x.text}</b></div><i style="width:${x.value / max * 100}%"></i></div>`).join('') || '<p class="empty">No data yet.</p>'; };
  const stat = (t, a, b) => `<div class="stat"><small>${t}</small><b>${a}</b><small>${b}</small></div>`;
  const series = r[state.range];
  $('main').innerHTML = `<div class="top"><h2>Reports</h2>${userChip()}</div>
    <div class="stats">${stat('Total revenue', peso(r.total.revenue), 'all time')}${stat('Completed orders', r.total.orders, 'all time')}
      ${stat('Today', peso(r.today.sales), r.today.orders + ' orders')}${stat('This week', peso(r.week.sales), r.week.orders + ' orders')}${stat('This month', peso(r.month.sales), r.month.orders + ' orders')}</div>
    <div class="panel"><div class="top" style="margin-bottom:10px"><h3 style="margin:0;flex:1">${{ daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' }[state.range]} sales</h3>
      <div class="seg" style="min-width:240px">${['daily', 'weekly', 'monthly'].map(k => `<button data-rg="${k}" class="${state.range === k ? 'active' : ''}">${k[0].toUpperCase() + k.slice(1)}</button>`).join('')}</div></div>
      ${bars(series.map(x => ({ label: x.label, value: Number(x.sales), text: `${peso(x.sales)} • ${x.orders} orders` })))}</div>
    <div class="two"><div class="panel"><h3>Sales by payment method</h3>${bars(r.payment.map(x => ({ label: x.label, value: Number(x.sales), text: `${peso(x.sales)} • ${x.orders} orders` })))}</div>
    <div class="panel"><h3>Best-selling products</h3>${bars(r.best.map(x => ({ label: x.label, value: Number(x.qty), text: x.qty + ' sold' })))}</div>
    <div class="panel"><h3>Category revenue</h3>${bars(r.category.map(x => ({ label: x.label, value: Number(x.sales), text: peso(x.sales) })))}</div></div>
    <div class="panel"><h3>Transaction history</h3><table><tr><th>Order</th><th>Date</th><th>Type</th><th>Payment</th><th>Cashier</th><th>Items</th><th>Total</th></tr>
    ${r.history.map(o => `<tr><td>#${o.order_no}</td><td>${esc(o.created_at)}</td><td>${esc(o.order_type)}</td><td>${esc(o.payment_method)}</td><td>${esc(o.cashier)}</td><td style="white-space:normal;min-width:180px">${esc(o.items || '')}</td><td>${peso(o.total)}</td></tr>`).join('') || '<tr><td colspan="7" class="empty">No transactions yet.</td></tr>'}</table></div>`;
  document.querySelectorAll('[data-rg]').forEach(b => b.onclick = () => { state.range = b.dataset.rg; drawReports(); });
}

/* ---------- Init ---------- */
$('logout').onclick = async () => { await api('api/auth.php?action=logout', {}); location.href = 'index.php'; };
$('modal').onclick = e => { if (e.target.id === 'modal') $('modal').hidden = true; };
show();
