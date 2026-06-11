/* ============================================================
   RABBONI RESTAURANT — Express Server
   ============================================================ */

require('dotenv').config();
const express     = require('express');
const cors        = require('cors');
const morgan      = require('morgan');
const path        = require('path');
const rateLimit   = require('express-rate-limit');

const { initDB } = require('./db/database');

// Routes
const authRoutes    = require('./routes/auth');
const menuRoutes    = require('./routes/menu');
const orderRoutes   = require('./routes/orders');
const {
  resRouter, revRouter, contactRouter, loyaltyRouter, paymentsRouter
} = require('./routes/other');

const app  = express();
const PORT = process.env.PORT || 3000;

/* ── Middleware ─────────────────────────────────────────────── */
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_URL
    : '*',
  credentials: true,
}));

// Paystack webhook needs raw body — must come before express.json()
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('[:date[clf]] :method :url :status :response-time ms'));
}

/* ── Rate Limiting ──────────────────────────────────────────── */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' },
});
app.use('/api/', apiLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many login attempts. Please try again in 15 minutes.' },
});
app.use('/api/auth/login', authLimiter);

/* ── API Routes ─────────────────────────────────────────────── */
app.use('/api/auth',         authRoutes);
app.use('/api/menu',         menuRoutes);
app.use('/api/orders',       orderRoutes);
app.use('/api/reservations', resRouter);
app.use('/api/reviews',      revRouter);
app.use('/api/contact',      contactRouter);
app.use('/api/loyalty',      loyaltyRouter);
app.use('/api/payments',     paymentsRouter);

/* ── Admin Stats Endpoint ───────────────────────────────────── */
const authMiddleware = require('./middleware/auth');
const { getDB } = require('./db/database');

app.get('/api/dashboard/stats', authMiddleware, (req, res) => {
  const db = getDB();
  const today = new Date().toISOString().split('T')[0];

  const stats = {
    today: {
      orders:    db.prepare("SELECT COUNT(*) as c FROM orders WHERE DATE(created_at) = ?").get(today).c,
      revenue:   db.prepare("SELECT COALESCE(SUM(total),0) as s FROM orders WHERE DATE(created_at) = ? AND payment_status IN ('paid','pending_cash')").get(today).s,
      reservations: db.prepare("SELECT COUNT(*) as c FROM reservations WHERE date = ?").get(today).c,
    },
    month: {
      revenue:   db.prepare("SELECT COALESCE(SUM(total),0) as s FROM orders WHERE strftime('%Y-%m',created_at)=strftime('%Y-%m','now') AND payment_status IN ('paid','pending_cash')").get().s,
      orders:    db.prepare("SELECT COUNT(*) as c FROM orders WHERE strftime('%Y-%m',created_at)=strftime('%Y-%m','now')").get().c,
      customers: db.prepare("SELECT COUNT(DISTINCT customer_phone) as c FROM orders WHERE strftime('%Y-%m',created_at)=strftime('%Y-%m','now')").get().c,
    },
    orders: {
      pending:   db.prepare("SELECT COUNT(*) as c FROM orders WHERE order_status = 'pending'").get().c,
      preparing: db.prepare("SELECT COUNT(*) as c FROM orders WHERE order_status = 'preparing'").get().c,
      on_the_way:db.prepare("SELECT COUNT(*) as c FROM orders WHERE order_status = 'on_the_way'").get().c,
    },
    reservations: {
      pending:   db.prepare("SELECT COUNT(*) as c FROM reservations WHERE status = 'pending'").get().c,
      upcoming:  db.prepare("SELECT COUNT(*) as c FROM reservations WHERE status = 'confirmed' AND date >= ?").get(today).c,
    },
    reviews: {
      pending:   db.prepare("SELECT COUNT(*) as c FROM reviews WHERE status = 'pending'").get().c,
      avgRating: db.prepare("SELECT ROUND(AVG(rating),1) as r FROM reviews WHERE status = 'approved'").get().r || 0,
    },
    messages: {
      unread:    db.prepare("SELECT COUNT(*) as c FROM contacts WHERE status = 'unread'").get().c,
    },
    topDishes: db.prepare(`
      SELECT item_name, SUM(quantity) as total_sold
      FROM order_items GROUP BY item_name ORDER BY total_sold DESC LIMIT 5
    `).all(),
    weeklyRevenue: db.prepare(`
      SELECT DATE(created_at) as day, COALESCE(SUM(total),0) as revenue
      FROM orders WHERE DATE(created_at) >= DATE('now','-6 days')
      AND payment_status IN ('paid','pending_cash')
      GROUP BY day ORDER BY day
    `).all(),
  };

  res.json({ success: true, data: stats });
});

/* ── Serve Uploaded Food Images ─────────────────────────────── */
const uploadPath = path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadPath));

/* ── Serve Frontend Static Files ────────────────────────────── */
// Serve all HTML/CSS/JS from the parent folder (rabboni/)
const FRONTEND_DIR = path.join(__dirname, '..');
app.use(express.static(FRONTEND_DIR));

// Catch-all: serve index.html for any unmatched route
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
  }
});

/* ── Global Error Handler ───────────────────────────────────── */
app.use((err, req, res, next) => {
  console.error('[Error]', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error.' : err.message,
  });
});

/* ── Start Server ───────────────────────────────────────────── */
initDB();

app.listen(PORT, () => {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║   🍽️   RABBONI RESTAURANT SERVER              ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log(`\n  🟢  Server running at http://localhost:${PORT}`);
  console.log(`  📂  Serving frontend from: ${FRONTEND_DIR}`);
  console.log(`  🗄️   Database: rabboni.db`);
  console.log(`  🌍  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('\n  API Endpoints:');
  console.log('  ├── POST /api/auth/login');
  console.log('  ├── GET  /api/menu');
  console.log('  ├── POST /api/orders');
  console.log('  ├── POST /api/reservations');
  console.log('  ├── POST /api/reviews');
  console.log('  ├── POST /api/contact');
  console.log('  ├── POST /api/loyalty/register');
  console.log('  └── POST /api/payments/initialize');
  console.log('\n  Admin: http://localhost:' + PORT + '/admin.html');
  console.log('  Login: admin / ' + (process.env.ADMIN_PASSWORD || 'rabboni@admin2026'));
  console.log('\n');
});

module.exports = app;
