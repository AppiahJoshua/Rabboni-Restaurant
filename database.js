/* ============================================================
   RABBONI RESTAURANT — Database Setup (SQLite via better-sqlite3)
   ============================================================ */

const Database = require('better-sqlite3');
const path     = require('path');
const bcrypt   = require('bcryptjs');

const DB_PATH = path.join(__dirname, '..', 'rabboni.db');

let db;

function getDB() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

function initDB() {
  const db = getDB();

  db.exec(`
    /* ── Admin Users ─────────────────────────────────────── */
    CREATE TABLE IF NOT EXISTS admin_users (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      username     TEXT    NOT NULL UNIQUE,
      password_hash TEXT   NOT NULL,
      email        TEXT    NOT NULL,
      created_at   TEXT    DEFAULT (datetime('now'))
    );

    /* ── Menu Items ──────────────────────────────────────── */
    CREATE TABLE IF NOT EXISTS menu_items (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL,
      category    TEXT    NOT NULL,
      price       REAL    NOT NULL,
      emoji       TEXT    DEFAULT '🍽️',
      description TEXT,
      popular     INTEGER DEFAULT 0,
      available   INTEGER DEFAULT 1,
      created_at  TEXT    DEFAULT (datetime('now')),
      updated_at  TEXT    DEFAULT (datetime('now'))
    );

    /* ── Orders ──────────────────────────────────────────── */
    CREATE TABLE IF NOT EXISTS orders (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number       TEXT    NOT NULL UNIQUE,
      customer_name      TEXT    NOT NULL,
      customer_phone     TEXT    NOT NULL,
      order_type         TEXT    NOT NULL DEFAULT 'delivery',
      delivery_address   TEXT,
      delivery_notes     TEXT,
      payment_method     TEXT    NOT NULL DEFAULT 'cash',
      payment_status     TEXT    NOT NULL DEFAULT 'pending',
      payment_reference  TEXT,
      order_status       TEXT    NOT NULL DEFAULT 'pending',
      subtotal           REAL    NOT NULL DEFAULT 0,
      delivery_fee       REAL    NOT NULL DEFAULT 0,
      total              REAL    NOT NULL DEFAULT 0,
      created_at         TEXT    DEFAULT (datetime('now')),
      updated_at         TEXT    DEFAULT (datetime('now'))
    );

    /* ── Order Items ─────────────────────────────────────── */
    CREATE TABLE IF NOT EXISTS order_items (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id     INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      menu_item_id INTEGER,
      item_name    TEXT    NOT NULL,
      item_price   REAL    NOT NULL,
      quantity     INTEGER NOT NULL DEFAULT 1,
      subtotal     REAL    NOT NULL
    );

    /* ── Reservations ────────────────────────────────────── */
    CREATE TABLE IF NOT EXISTS reservations (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      ref_number       TEXT    NOT NULL UNIQUE,
      customer_name    TEXT    NOT NULL,
      customer_phone   TEXT    NOT NULL,
      date             TEXT    NOT NULL,
      time             TEXT    NOT NULL,
      guests           INTEGER NOT NULL DEFAULT 2,
      occasion         TEXT    DEFAULT 'dinner',
      special_requests TEXT,
      status           TEXT    NOT NULL DEFAULT 'pending',
      created_at       TEXT    DEFAULT (datetime('now')),
      updated_at       TEXT    DEFAULT (datetime('now'))
    );

    /* ── Reviews ─────────────────────────────────────────── */
    CREATE TABLE IF NOT EXISTS reviews (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name  TEXT    NOT NULL,
      rating         INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
      review_text    TEXT    NOT NULL,
      favourite_dish TEXT,
      status         TEXT    NOT NULL DEFAULT 'pending',
      created_at     TEXT    DEFAULT (datetime('now'))
    );

    /* ── Contact Messages ────────────────────────────────── */
    CREATE TABLE IF NOT EXISTS contacts (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL,
      phone      TEXT    NOT NULL,
      subject    TEXT    NOT NULL DEFAULT 'General Enquiry',
      message    TEXT    NOT NULL,
      status     TEXT    NOT NULL DEFAULT 'unread',
      created_at TEXT    DEFAULT (datetime('now'))
    );

    /* ── Loyalty Members ─────────────────────────────────── */
    CREATE TABLE IF NOT EXISTS loyalty_members (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      member_number TEXT    NOT NULL UNIQUE,
      first_name    TEXT    NOT NULL,
      last_name     TEXT    NOT NULL,
      phone         TEXT    NOT NULL UNIQUE,
      birthday      TEXT,
      tier          TEXT    NOT NULL DEFAULT 'bronze',
      points        INTEGER NOT NULL DEFAULT 0,
      total_spend   REAL    NOT NULL DEFAULT 0,
      created_at    TEXT    DEFAULT (datetime('now')),
      updated_at    TEXT    DEFAULT (datetime('now'))
    );

    /* ── Loyalty Transactions ────────────────────────────── */
    CREATE TABLE IF NOT EXISTS loyalty_transactions (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id   INTEGER NOT NULL REFERENCES loyalty_members(id),
      type        TEXT    NOT NULL,
      points      INTEGER NOT NULL,
      description TEXT,
      order_id    INTEGER,
      created_at  TEXT    DEFAULT (datetime('now'))
    );
  `);

  /* Add image_url column if it doesn't exist (migration) */
  try {
    db.exec('ALTER TABLE menu_items ADD COLUMN image_url TEXT DEFAULT NULL');
    console.log('✅  Added image_url column to menu_items.');
  } catch(e) {
    // Column already exists — that's fine
  }

  /* Seed default admin if not exists */
  const adminUser = process.env.ADMIN_USERNAME || 'admin';
  const adminPass = process.env.ADMIN_PASSWORD || 'rabboni@admin2026';
  const adminEmail = process.env.ADMIN_EMAIL   || 'admin@rabbonirestaurant.com';

  const existing = db.prepare('SELECT id FROM admin_users WHERE username = ?').get(adminUser);
  if (!existing) {
    const hash = bcrypt.hashSync(adminPass, 10);
    db.prepare('INSERT INTO admin_users (username, password_hash, email) VALUES (?,?,?)')
      .run(adminUser, hash, adminEmail);
    console.log(`✅  Admin user "${adminUser}" created.`);
  }

  console.log('✅  Database initialised at', DB_PATH);
  return db;
}

module.exports = { getDB, initDB };
