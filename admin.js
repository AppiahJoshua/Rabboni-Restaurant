/* ============================================================
   RABBONI RESTAURANT — Admin Dashboard (Real API + Login)
   ============================================================ */

/* ── Authentication Gate ─────────────────────────────────── */
async function checkAuth() {
  const token = API.getToken();
  if (!token) { showLoginModal(); return false; }
  try { await API.verifyToken(); return true; }
  catch { API.clearToken(); showLoginModal(); return false; }
}

function showLoginModal() {
  let overlay = document.getElementById('loginOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'loginOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.92);backdrop-filter:blur(8px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';
    overlay.innerHTML = `
      <div style="background:var(--surface);border:1px solid var(--border-strong);border-radius:var(--radius-xl);padding:48px 40px;max-width:420px;width:100%;text-align:center">
        <div style="font-size:3rem;margin-bottom:16px">🔐</div>
        <h2 style="font-family:'Playfair Display',serif;font-size:1.6rem;margin-bottom:6px">Admin Login</h2>
        <p style="color:var(--text-muted);font-size:.88rem;margin-bottom:32px">Rabboni Restaurant Dashboard</p>
        <div id="loginError" style="display:none;background:rgba(155,35,53,.15);border:1px solid rgba(155,35,53,.3);border-radius:var(--radius);padding:10px 14px;font-size:.85rem;color:#F87878;margin-bottom:16px"></div>
        <div class="form-group" style="text-align:left"><label class="form-label">Username</label><input class="form-control" id="loginUsername" type="text" placeholder="admin" autocomplete="username"></div>
        <div class="form-group" style="text-align:left"><label class="form-label">Password</label><input class="form-control" id="loginPassword" type="password" placeholder="Your password" autocomplete="current-password"></div>
        <button id="loginBtn" class="btn btn-primary" style="width:100%;justify-content:center;margin-top:8px" onclick="doLogin()">Login to Dashboard</button>
        <p style="margin-top:20px;font-size:.82rem"><a href="index.html" style="color:var(--text-muted)">← Back to Website</a></p>
      </div>`;
    document.body.appendChild(overlay);
    document.getElementById('loginPassword')?.addEventListener('keydown', e => { if (e.key==='Enter') doLogin(); });
  }
  overlay.style.display = 'flex';
}

async function doLogin() {
  const username = document.getElementById('loginUsername')?.value?.trim();
  const password = document.getElementById('loginPassword')?.value;
  const btn = document.getElementById('loginBtn');
  const errEl = document.getElementById('loginError');
  if (!username || !password) { if(errEl){errEl.textContent='Please enter username and password.';errEl.style.display='';} return; }
  if (btn) { btn.disabled=true; btn.textContent='Logging in…'; }
  try {
    const res = await API.login(username, password);
    API.setToken(res.token);
    document.getElementById('loginOverlay').style.display = 'none';
    initDashboard();
  } catch(err) {
    if(errEl){errEl.textContent=err.message||'Invalid credentials.';errEl.style.display='';}
    if(btn){btn.disabled=false;btn.textContent='Login to Dashboard';}
  }
}

/* ── Panel Switching ─────────────────────────────────────── */
function switchPanel(el) {
  document.querySelectorAll('.sidebar-link').forEach(l=>l.classList.remove('active'));
  el.classList.add('active');
  const pid = el.dataset.panel;
  document.querySelectorAll('.admin-panel').forEach(p=>p.classList.remove('active'));
  document.getElementById('panel-'+pid)?.classList.add('active');
  loadPanelData(pid);
}
function switchPanelById(id) {
  const link = document.querySelector('.sidebar-link[data-panel="'+id+'"]');
  if (link) switchPanel(link);
}
async function loadPanelData(panel) {
  switch(panel) {
    case 'dashboard':    loadDashboard(); break;
    case 'orders':       loadOrders(); break;
    case 'reservations': loadReservations(); break;
    case 'menu':         loadMenuAdmin(); break;
    case 'reviews':      loadReviews(); break;
    case 'messages':     loadMessages(); break;
    case 'analytics':    loadAnalytics(); break;
  }
}

/* ── Dashboard ───────────────────────────────────────────── */
async function loadDashboard() {
  try {
    const {data:s} = await API.getDashboardStats();
    setEl('stat-orders-today',       s.today.orders);
    setEl('stat-revenue-today',      'GHS '+parseFloat(s.today.revenue).toFixed(2));
    setEl('stat-reservations-today', s.today.reservations);
    setEl('stat-avg-rating',         s.reviews.avgRating+' ★');
    setEl('stat-pending',   s.orders.pending);
    setEl('stat-preparing', s.orders.preparing);
    setEl('stat-onway',     s.orders.on_the_way);
    const oD=document.getElementById('orderNotifDot');
    const rD=document.getElementById('resNotifDot');
    if(oD) oD.style.display=s.orders.pending>0?'':'none';
    if(rD) rD.style.display=s.reservations.pending>0?'':'none';
    renderTopDishes(s.topDishes||[]);
    renderWeeklyChart(s.weeklyRevenue||[]);
    loadRecentOrders();
  } catch(err) { console.error('Dashboard error',err); }
}

function setEl(id,val) { const e=document.getElementById(id); if(e) e.textContent=val; }

function renderTopDishes(dishes) {
  const el=document.getElementById('topDishesBody'); if(!el) return;
  if(!dishes.length){el.innerHTML='<p style="color:var(--text-muted);font-size:.85rem">No data yet.</p>';return;}
  const max=dishes[0]?.total_sold||1;
  el.innerHTML=dishes.map(d=>`
    <div><div style="display:flex;justify-content:space-between;font-size:.82rem;margin-bottom:4px">
      <span>${d.item_name}</span><span style="color:var(--gold)">${d.total_sold} sold</span></div>
      <div style="height:6px;background:var(--surface-2);border-radius:3px">
        <div style="width:${Math.round((d.total_sold/max)*100)}%;height:100%;background:var(--primary);border-radius:3px"></div>
      </div></div>`).join('');
}

function renderWeeklyChart(data) {
  const el=document.getElementById('weeklyChartBody'); if(!el||!data.length) return;
  const max=Math.max(...data.map(d=>d.revenue),1);
  const days=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  el.innerHTML=data.map(d=>{
    const day=days[new Date(d.day+'T12:00:00').getDay()];
    const pct=Math.round((d.revenue/max)*100);
    const rev=parseFloat(d.revenue);
    const disp=rev>=1000?(rev/1000).toFixed(1)+'k':rev.toFixed(0);
    return `<div class="chart-bar-wrap"><div class="chart-val">${disp}</div><div class="chart-bar" style="height:${Math.max(pct,4)}%"></div><div class="chart-label">${day}</div></div>`;
  }).join('');
}

async function loadRecentOrders() {
  const el=document.getElementById('recentOrdersBody'); if(!el) return;
  try {
    const {data} = await API.getOrders({limit:5});
    if(!data.length){el.innerHTML='<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:24px">No orders yet.</td></tr>';return;}
    el.innerHTML=data.map(o=>`
      <tr><td><span style="color:var(--gold);font-weight:600">${o.order_number}</span></td>
      <td>${o.customer_name}</td>
      <td>${(o.items||[]).map(i=>i.item_name).join(', ')||'—'}</td>
      <td>GHS ${parseFloat(o.total).toFixed(2)}</td>
      <td>${statusBadge(o.order_status)}</td>
      <td style="color:var(--text-muted);font-size:.8rem">${timeAgo(o.created_at)}</td></tr>`).join('');
  } catch {}
}

/* ── Orders ──────────────────────────────────────────────── */
async function loadOrders() {
  const el=document.getElementById('ordersTableBody'); if(!el) return;
  el.innerHTML='<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--text-muted)">Loading orders…</td></tr>';
  try {
    const {data} = await API.getOrders({limit:50});
    if(!data.length){el.innerHTML='<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--text-muted)">No orders yet.</td></tr>';return;}
    el.innerHTML=data.map(o=>`
      <tr id="order-row-${o.id}">
        <td><span style="color:var(--gold);font-weight:600">${o.order_number}</span></td>
        <td>${o.customer_name}</td>
        <td style="color:var(--text-muted)">${o.customer_phone}</td>
        <td>${(o.items||[]).map(i=>`${i.item_name} x${i.quantity}`).join(', ')}</td>
        <td>GHS ${parseFloat(o.total).toFixed(2)}</td>
        <td><span class="badge badge-gold">${o.order_type}</span></td>
        <td id="order-status-${o.id}">${statusBadge(o.order_status)}</td>
        <td>${o.order_status!=='delivered'&&o.order_status!=='cancelled'
          ?`<button class="edit-btn" onclick="advanceOrder(${o.id},'${o.order_status}')">${nextActionLabel(o.order_status)}</button>`
          :'<span style="color:var(--text-dim);font-size:.8rem">Done</span>'}</td>
      </tr>`).join('');
  } catch(err) {el.innerHTML=`<tr><td colspan="8" style="color:#F87878;text-align:center;padding:24px">${err.message}</td></tr>`;}
}

const STATUS_NEXT={pending:'preparing',preparing:'on_the_way',on_the_way:'delivered'};
const STATUS_LABEL={pending:'Start Preparing',preparing:'Mark Dispatched',on_the_way:'Mark Delivered'};
function nextActionLabel(s){return STATUS_LABEL[s]||'→';}

async function advanceOrder(id,currentStatus) {
  const next=STATUS_NEXT[currentStatus]; if(!next) return;
  try {
    await API.updateOrderStatus(id,next);
    document.getElementById('order-status-'+id).innerHTML=statusBadge(next);
    const btn=document.querySelector('#order-row-'+id+' .edit-btn');
    if(btn){
      if(next==='delivered') btn.outerHTML='<span style="color:var(--text-dim);font-size:.8rem">Done</span>';
      else { btn.setAttribute('onclick',`advanceOrder(${id},'${next}')`); btn.textContent=nextActionLabel(next); }
    }
    showToast('Order status updated ✓','success');
  } catch(err){showToast(err.message,'error');}
}

/* ── Reservations ────────────────────────────────────────── */
async function loadReservations() {
  const el=document.getElementById('resTableBody'); if(!el) return;
  el.innerHTML='<tr><td colspan="9" style="text-align:center;padding:32px;color:var(--text-muted)">Loading…</td></tr>';
  try {
    const {data}=await API.getReservations({limit:50});
    if(!data.length){el.innerHTML='<tr><td colspan="9" style="text-align:center;padding:32px;color:var(--text-muted)">No reservations yet.</td></tr>';return;}
    el.innerHTML=data.map(r=>`
      <tr id="res-row-${r.id}">
        <td><span style="color:var(--gold);font-weight:600">${r.ref_number}</span></td>
        <td>${r.customer_name}</td><td style="color:var(--text-muted)">${r.customer_phone}</td>
        <td>${r.date}</td><td>${r.time}</td><td>${r.guests}</td>
        <td><span class="badge badge-gold">${r.occasion}</span></td>
        <td id="res-status-${r.id}">${r.status==='confirmed'?'<span class="badge badge-green">✓ Confirmed</span>':r.status==='cancelled'?'<span class="badge badge-red">✕ Cancelled</span>':'<span class="badge badge-red">⏳ Pending</span>'}</td>
        <td style="display:flex;gap:6px">
          ${r.status==='pending'?`<button class="edit-btn" onclick="updateRes(${r.id},'confirmed')">Confirm</button>`:''}
          ${r.status!=='cancelled'?`<button class="del-btn" onclick="updateRes(${r.id},'cancelled')">Cancel</button>`:''}
        </td>
      </tr>`).join('');
  } catch(err){el.innerHTML=`<tr><td colspan="9" style="color:#F87878;text-align:center;padding:24px">${err.message}</td></tr>`;}
}

async function updateRes(id,status) {
  try {
    await API.updateReservation(id,status);
    document.getElementById('res-status-'+id).innerHTML=status==='confirmed'?'<span class="badge badge-green">✓ Confirmed</span>':'<span class="badge badge-red">✕ Cancelled</span>';
    if(status==='confirmed') document.querySelector('#res-row-'+id+' .edit-btn')?.remove();
    showToast('Reservation '+status+' ✓','success');
  } catch(err){showToast(err.message,'error');}
}

/* ── Menu Admin ──────────────────────────────────────────── */
async function loadMenuAdmin() {
  const el=document.getElementById('menuAdminBody'); if(!el) return;
  el.innerHTML='<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--text-muted)">Loading menu…</td></tr>';
  try {
    const {data}=await API.getMenu({all:'true'});
    if(!data.length){el.innerHTML='<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text-muted)">No menu items yet.</td></tr>';return;}
    el.innerHTML=data.map(item=>`
      <tr id="menu-row-${item.id}">
        <td>
          <div style="display:flex;align-items:center;gap:10px">
            <div id="thumb-${item.id}" style="width:44px;height:44px;border-radius:8px;overflow:hidden;background:var(--surface-2);border:1px solid var(--border);flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:1.6rem;cursor:pointer" onclick="document.getElementById('img-input-${item.id}').click()" title="Click to upload image">
              ${item.image_url
                ? `<img src="${item.image_url}" style="width:100%;height:100%;object-fit:cover" onerror="this.parentElement.textContent='${item.emoji||'🍽️'}'">` 
                : (item.emoji||'🍽️')}
            </div>
            <div>
              <strong>${item.name}</strong>
              <div style="font-size:.72rem;color:var(--gold);margin-top:2px;cursor:pointer" onclick="document.getElementById('img-input-${item.id}').click()">
                ${item.image_url ? '🔄 Change photo' : '📷 Add photo'}
              </div>
            </div>
            <input type="file" id="img-input-${item.id}" accept="image/*" style="display:none" onchange="uploadMenuImage(${item.id},this)">
          </div>
        </td>
        <td style="color:var(--text-muted);text-transform:capitalize">${item.category}</td>
        <td><input value="${item.price}" type="number" min="0" step="0.5" style="width:80px;padding:6px 8px;background:var(--surface-2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:.85rem;outline:none" onchange="updateMenuPrice(${item.id},this.value)"></td>
        <td><label class="toggle"><input type="checkbox" ${item.popular?'checked':''} onchange="updateMenuItem(${item.id},{popular:this.checked})"><div class="toggle-slider"></div></label></td>
        <td><label class="toggle"><input type="checkbox" ${item.available?'checked':''} onchange="toggleMenuItem(${item.id},this)"><div class="toggle-slider"></div></label></td>
        <td style="display:flex;gap:6px">
          ${item.image_url?`<button class="edit-btn" onclick="removeMenuImage(${item.id},'${item.emoji||'🍽️'}')">✕ Photo</button>`:''}
          <button class="del-btn" onclick="deleteMenuItem(${item.id},'${item.name.replace(/'/g,'')}')">Delete</button>
        </td>
      </tr>`).join('');
  } catch(err){el.innerHTML=`<tr><td colspan="6" style="color:#F87878;text-align:center;padding:24px">${err.message}</td></tr>`;}
}

async function uploadMenuImage(id, input) {
  const file = input.files[0];
  if (!file) return;
  // Validate size client-side
  if (file.size > 5 * 1024 * 1024) { showToast('Image must be under 5MB.','error'); input.value=''; return; }
  const thumb = document.getElementById('thumb-'+id);
  if (thumb) thumb.innerHTML = '<div style="animation:spin 1s linear infinite;font-size:1.2rem">⏳</div>';
  try {
    const res = await API.uploadMenuImage(id, file);
    showToast('Photo uploaded! ✓','success');
    // Update thumbnail immediately
    if (thumb) thumb.innerHTML = '<img src="'+res.imageUrl+'?t='+Date.now()+'" style="width:100%;height:100%;object-fit:cover">';
    // Update the change/add label
    const label = thumb?.nextElementSibling?.querySelector('div:last-child');
    if (label) label.textContent = '🔄 Change photo';
    input.value = '';
  } catch(err) {
    showToast(err.message||'Upload failed. Try again.','error');
    if (thumb) thumb.innerHTML = '🍽️';
    input.value = '';
  }
}

async function removeMenuImage(id, emoji) {
  if (!confirm('Remove the photo for this item?')) return;
  try {
    await API.removeMenuImage(id);
    const thumb = document.getElementById('thumb-'+id);
    if (thumb) thumb.innerHTML = emoji;
    showToast('Photo removed.','success');
    loadMenuAdmin();
  } catch(err) { showToast(err.message,'error'); }
}

async function updateMenuPrice(id,price) { try{await API.updateMenuItem(id,{price:parseFloat(price)});showToast('Price updated ✓','success');}catch(err){showToast(err.message,'error');} }
async function updateMenuItem(id,data) { try{await API.updateMenuItem(id,data);showToast('Updated ✓','success');}catch(err){showToast(err.message,'error');} }
async function toggleMenuItem(id,cb) {
  try { const r=await API.toggleMenuItem(id); showToast(r.available?'Item enabled ✓':'Item disabled',r.available?'success':'error'); }
  catch(err) { showToast(err.message,'error'); cb.checked=!cb.checked; }
}
async function deleteMenuItem(id,name) {
  if(!confirm('Delete "'+name+'" from the menu?')) return;
  try { await API.deleteMenuItem(id); document.getElementById('menu-row-'+id)?.remove(); showToast('"'+name+'" removed ✓','success'); }
  catch(err){showToast(err.message,'error');}
}
async function addMenuItem() {
  const name=document.getElementById('new-name')?.value?.trim();
  const cat=document.getElementById('new-cat')?.value;
  const price=parseFloat(document.getElementById('new-price')?.value);
  const emoji=document.getElementById('new-emoji')?.value||'🍽️';
  const desc=document.getElementById('new-desc')?.value?.trim();
  if(!name||!price){showToast('Please fill in name and price.','error');return;}
  try {
    await API.addMenuItem({name,category:cat,price,emoji,description:desc});
    closeModal('addItemModal'); loadMenuAdmin(); showToast('"'+name+'" added ✓','success');
    ['new-name','new-price','new-emoji','new-desc'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
  } catch(err){showToast(err.message,'error');}
}

/* ── Reviews ─────────────────────────────────────────────── */
async function loadReviews() {
  const el=document.getElementById('reviewsAdminBody'); if(!el) return;
  try {
    const {data}=await API.getReviews(true);
    if(!data.length){el.innerHTML='<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--text-muted)">No reviews yet.</td></tr>';return;}
    el.innerHTML=data.map(r=>`
      <tr id="rev-row-${r.id}">
        <td>${r.customer_name}</td>
        <td>${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</td>
        <td style="color:var(--text-muted);font-size:.85rem">${r.review_text.slice(0,80)}…</td>
        <td>${r.status==='approved'?'<span class="badge badge-green">Approved</span>':'<span class="badge badge-red">Pending</span>'}</td>
        <td style="display:flex;gap:6px">
          ${r.status!=='approved'?`<button class="edit-btn" onclick="approveReview(${r.id})">Approve</button>`:''}
          <button class="del-btn" onclick="deleteReview(${r.id})">Delete</button>
        </td>
      </tr>`).join('');
  } catch {}
}
async function approveReview(id) {
  try { await API.approveReview(id); document.querySelector('#rev-row-'+id+' .edit-btn')?.remove(); document.querySelector('#rev-row-'+id+' td:nth-child(4)').innerHTML='<span class="badge badge-green">Approved</span>'; showToast('Review approved ✓','success'); }
  catch(err){showToast(err.message,'error');}
}
async function deleteReview(id) {
  if(!confirm('Delete this review?')) return;
  try { await API.deleteReview(id); document.getElementById('rev-row-'+id)?.remove(); showToast('Review deleted.','success'); }
  catch(err){showToast(err.message,'error');}
}

/* ── Messages ─────────────────────────────────────────────── */
async function loadMessages() {
  const el=document.getElementById('messagesBody'); if(!el) return;
  try {
    const {data}=await API.getMessages();
    if(!data.length){el.innerHTML='<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--text-muted)">No messages yet.</td></tr>';return;}
    el.innerHTML=data.map(m=>`<tr><td><strong>${m.name}</strong></td><td style="color:var(--text-muted)">${m.phone}</td><td><span class="badge badge-gold">${m.subject}</span></td><td style="color:var(--text-muted);font-size:.85rem">${m.message.slice(0,80)}…</td><td>${m.status==='unread'?'<span class="badge badge-red">Unread</span>':'<span class="badge badge-green">Read</span>'}</td></tr>`).join('');
  } catch {}
}

/* ── Analytics ─────────────────────────────────────────────── */
async function loadAnalytics() {
  try {
    const {data:s}=await API.getDashboardStats();
    setEl('ana-month-revenue','GHS '+parseFloat(s.month.revenue).toFixed(2));
    setEl('ana-month-orders',s.month.orders);
    setEl('ana-customers',s.month.customers);
    setEl('ana-avg-rating',s.reviews.avgRating+' / 5');
    renderWeeklyChart(s.weeklyRevenue||[]);
    renderTopDishes(s.topDishes||[]);
  } catch {}
}

/* ── Utilities ─────────────────────────────────────────────── */
function statusBadge(s) {
  const m={pending:'<span class="badge badge-red">⏳ Pending</span>',preparing:'<span class="badge badge-gold">🔥 Preparing</span>',on_the_way:'<span class="badge" style="background:rgba(72,166,95,.15);color:#72C48F;border:1px solid rgba(72,166,95,.3)">🚚 On the Way</span>',delivered:'<span class="badge badge-green">✓ Delivered</span>',cancelled:'<span class="badge badge-red">✕ Cancelled</span>'};
  return m[s]||'<span class="badge">'+s+'</span>';
}
function timeAgo(d) {
  const mins=Math.floor((Date.now()-new Date(d).getTime())/60000);
  if(mins<1) return 'just now'; if(mins<60) return mins+'m ago';
  const hrs=Math.floor(mins/60); if(hrs<24) return hrs+'h ago';
  return Math.floor(hrs/24)+'d ago';
}

setInterval(()=>{const a=document.querySelector('.sidebar-link.active');if(a)loadPanelData(a.dataset.panel);},30000);

async function initDashboard() {
  const ok=await checkAuth(); if(!ok) return;
  loadDashboard();
}
initDashboard();
