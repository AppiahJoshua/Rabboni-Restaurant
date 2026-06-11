/* ============================================================
   RABBONI RESTAURANT — API Client Helper
   All frontend pages import this via <script src="js/api.js">
   ============================================================ */

const API = (() => {
  const BASE = window.location.origin + '/api';

  function getToken() { return localStorage.getItem('rabboni_admin_token'); }
  function setToken(t) { localStorage.setItem('rabboni_admin_token', t); }
  function clearToken() { localStorage.removeItem('rabboni_admin_token'); }

  function headers(isAdmin = false) {
    const h = { 'Content-Type': 'application/json' };
    if (isAdmin) {
      const t = getToken();
      if (t) h['Authorization'] = 'Bearer ' + t;
    }
    return h;
  }

  async function request(method, path, body = null, isAdmin = false) {
    const opts = { method, headers: headers(isAdmin) };
    if (body) opts.body = JSON.stringify(body);
    try {
      const res  = await fetch(BASE + path, opts);
      const data = await res.json();
      if (!res.ok) throw { status: res.status, message: data.message || 'Request failed', data };
      return data;
    } catch (err) {
      if (err.status) throw err; // re-throw API errors
      throw { status: 0, message: 'Network error. Check your connection.' };
    }
  }

  return {
    /* Auth */
    login:        (u, p) => request('POST', '/auth/login', { username: u, password: p }),
    verifyToken:  ()     => request('GET',  '/auth/verify', null, true),
    logout:       ()     => { clearToken(); window.location.href = '/admin.html'; },
    getToken, setToken, clearToken,

    /* Menu */
    getMenu:      (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return request('GET', '/menu' + (q ? '?' + q : ''));
    },
    addMenuItem:    (data) => request('POST',   '/menu',          data, true),
    updateMenuItem: (id, d) => request('PUT',   '/menu/' + id,    d,    true),
    toggleMenuItem: (id)   => request('PATCH',  '/menu/' + id + '/toggle', null, true),
    deleteMenuItem: (id)   => request('DELETE', '/menu/' + id,    null, true),

    /* Menu Image Upload — uses FormData, not JSON */
    uploadMenuImage: async (id, file) => {
      const formData = new FormData();
      formData.append('image', file);
      const token = getToken();
      const res = await fetch(BASE + '/menu/' + id + '/image', {
        method: 'POST',
        headers: token ? { 'Authorization': 'Bearer ' + token } : {},
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw { status: res.status, message: data.message || 'Upload failed' };
      return data;
    },
    removeMenuImage: (id) => request('DELETE', '/menu/' + id + '/image', null, true),

    /* Orders */
    placeOrder:     (data) => request('POST', '/orders',               data),
    getOrders:      (p={}) => request('GET',  '/orders?' + new URLSearchParams(p), null, true),
    getOrderStats:  ()     => request('GET',  '/orders/stats',         null, true),
    updateOrderStatus: (id, s) => request('PUT', '/orders/' + id + '/status', { status: s }, true),

    /* Reservations */
    makeReservation:    (data) => request('POST', '/reservations',            data),
    getReservations:    (p={}) => request('GET',  '/reservations?' + new URLSearchParams(p), null, true),
    updateReservation:  (id, s) => request('PUT', '/reservations/' + id + '/status', { status: s }, true),

    /* Reviews */
    submitReview:   (data) => request('POST',   '/reviews',          data),
    getReviews:     (all)  => request('GET',    '/reviews' + (all ? '?all=true' : ''), null, all),
    approveReview:  (id)   => request('PUT',    '/reviews/' + id + '/approve', null, true),
    deleteReview:   (id)   => request('DELETE', '/reviews/' + id,    null, true),

    /* Contact */
    sendMessage:    (data) => request('POST', '/contact',             data),
    getMessages:    ()     => request('GET',  '/contact',             null, true),

    /* Loyalty */
    registerLoyalty:(data) => request('POST', '/loyalty/register',    data),
    getMember:      (ph)   => request('GET',  '/loyalty/member/' + ph),
    redeemPoints:   (data) => request('POST', '/loyalty/redeem',      data),

    /* Payments */
    initPayment:    (data) => request('POST', '/payments/initialize',  data),
    verifyPayment:  (ref)  => request('GET',  '/payments/verify/' + ref),

    /* Dashboard */
    getDashboardStats: () => request('GET', '/dashboard/stats', null, true),
  };
})();

/* Expose globally */
window.API = API;
