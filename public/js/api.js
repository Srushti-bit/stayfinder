const AMENITIES = ['WiFi', 'Meals', 'AC', 'Laundry', 'Power backup', 'Geyser', 'Parking', 'Housekeeping', 'CCTV', 'Attached bathroom'];

const Auth = {
  token: () => localStorage.getItem('sf_token'),
  user() { try { return JSON.parse(localStorage.getItem('sf_user')); } catch { return null; } },
  save(token, user) { localStorage.setItem('sf_token', token); localStorage.setItem('sf_user', JSON.stringify(user)); },
  clear() { localStorage.removeItem('sf_token'); localStorage.removeItem('sf_user'); },
  logout() { Auth.clear(); location.href = '/'; }
};

async function api(path, opts = {}) {
  const headers = {};
  const t = Auth.token();
  if (t) headers.Authorization = 'Bearer ' + t;
  let body;
  if (opts.form) body = opts.form;
  else if (opts.body) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(opts.body); }
  const res = await fetch('/api' + path, { method: opts.method || 'GET', headers, body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && t) Auth.clear();
    throw new Error(data.message || 'Request failed');
  }
  return data;
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
const PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="260"><rect width="400" height="260" fill="#dfe8e7"/><path d="M150 150l50-40 50 40v40h-32v-26h-36v26h-32z" fill="#9db7b5"/></svg>');
const cover = (pg) => (pg.images && pg.images[0]) || PLACEHOLDER;
const stars = (r) => '★'.repeat(Math.round(r)) + '☆'.repeat(5 - Math.round(r));

function toast(msg, isErr) {
  let el = document.getElementById('toast');
  if (!el) { el = document.createElement('div'); el.id = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
  el.textContent = msg; el.className = isErr ? 'err' : ''; el.style.display = 'block';
  clearTimeout(toast.t); toast.t = setTimeout(() => (el.style.display = 'none'), 3500);
}

function renderNav() {
  const u = Auth.user();
  document.getElementById('nav').innerHTML = `
    <div class="wrap">
      <a class="logo" href="/">Stay<span>Finder</span></a>
      <nav>
        <a href="/">Browse PGs</a>
        ${u ? `<a href="/dashboard.html">${u.role === 'admin' ? 'Manage all PGs' : u.role === 'owner' ? 'My listings' : 'My requests'}</a>
               <button id="logout">Log out (${esc(u.name.split(' ')[0])})</button>`
            : `<a href="/login.html">Log in</a><a class="cta" href="/login.html?tab=register">Sign up</a>`}
      </nav>
    </div>`;
  const lo = document.getElementById('logout');
  if (lo) lo.onclick = Auth.logout;
}

function pgCard(pg) {
  const beds = pg.availableBeds;
  const bedTag = beds === 0 ? '<span class="tag full">Full</span>' : beds <= 2 ? `<span class="tag low">${beds} bed${beds > 1 ? 's' : ''} left</span>` : `<span class="tag">${beds} beds free</span>`;
  return `<a class="card" href="/pg.html?id=${pg._id}">
    <img src="${esc(cover(pg))}" alt="" loading="lazy">
    <div class="body">
      <h3>${esc(pg.name)}</h3>
      <div class="muted">${esc(pg.area)}, ${esc(pg.city)}</div>
      <div class="tags"><span class="tag">${esc(pg.gender)}</span><span class="tag">${pg.sharing}-sharing</span>${bedTag}</div>
      <div style="margin-top:auto;display:flex;justify-content:space-between;align-items:baseline">
        <span class="price">${money(pg.rent)}<small> /month</small></span>
        <span class="rating">${pg.reviewCount ? '★ ' + pg.avgRating + ' <span class="muted">(' + pg.reviewCount + ')</span>' : '<span class="muted">No reviews yet</span>'}</span>
      </div>
    </div></a>`;
}

document.addEventListener('DOMContentLoaded', renderNav);
