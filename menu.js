/* ============================================================
   RABBONI RESTAURANT — Menu Routes
   GET    /api/menu           (public)
   POST   /api/menu           (admin)
   PUT    /api/menu/:id       (admin)
   PATCH  /api/menu/:id/toggle (admin - toggle availability)
   DELETE /api/menu/:id       (admin)
   ============================================================ */

const express = require('express');
const { body, validationResult } = require('express-validator');
const { getDB } = require('../db/database');
const authMiddleware = require('../middleware/auth');

const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

const router = express.Router();

/* ── Multer config for food image uploads ── */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads', 'menu');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    const name = 'menu-' + req.params.id + '-' + Date.now() + ext;
    cb(null, name);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg','.jpeg','.png','.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only JPG, PNG and WebP images are allowed.'));
  },
});

/* GET /api/menu — public, returns all available items grouped */
router.get('/', (req, res) => {
  const db = getDB();
  const { category, search, all } = req.query;

  let query = 'SELECT * FROM menu_items';
  const params = [];
  const conditions = [];

  // Admins can request all items including unavailable
  if (!all) conditions.push('available = 1');

  if (category && category !== 'all') {
    conditions.push('category = ?');
    params.push(category);
  }
  if (search) {
    conditions.push('(LOWER(name) LIKE ? OR LOWER(description) LIKE ?)');
    params.push(`%${search.toLowerCase()}%`, `%${search.toLowerCase()}%`);
  }

  if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
  query += ' ORDER BY category, id';

  const items = db.prepare(query).all(...params);
  res.json({ success: true, count: items.length, data: items });
});

/* GET /api/menu/:id */
router.get('/:id', (req, res) => {
  const db = getDB();
  const item = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ success: false, message: 'Menu item not found.' });
  res.json({ success: true, data: item });
});

/* POST /api/menu — admin only */
router.post('/', authMiddleware, [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('category').notEmpty().withMessage('Category is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const db = getDB();
  const { name, category, price, emoji, description, popular } = req.body;

  const result = db.prepare(`
    INSERT INTO menu_items (name, category, price, emoji, description, popular, available)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `).run(name, category, price, emoji || '🍽️', description || '', popular ? 1 : 0);

  const item = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ success: true, message: 'Menu item added.', data: item });
});

/* PUT /api/menu/:id — admin only */
router.put('/:id', authMiddleware, [
  body('name').optional().trim().notEmpty(),
  body('price').optional().isFloat({ min: 0 }),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const db = getDB();
  const item = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ success: false, message: 'Menu item not found.' });

  const { name, category, price, emoji, description, popular, available } = req.body;

  db.prepare(`
    UPDATE menu_items SET
      name        = COALESCE(?, name),
      category    = COALESCE(?, category),
      price       = COALESCE(?, price),
      emoji       = COALESCE(?, emoji),
      description = COALESCE(?, description),
      popular     = COALESCE(?, popular),
      available   = COALESCE(?, available),
      updated_at  = datetime('now')
    WHERE id = ?
  `).run(
    name ?? null, category ?? null, price ?? null,
    emoji ?? null, description ?? null,
    popular !== undefined ? (popular ? 1 : 0) : null,
    available !== undefined ? (available ? 1 : 0) : null,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(req.params.id);
  res.json({ success: true, message: 'Menu item updated.', data: updated });
});

/* PATCH /api/menu/:id/toggle — toggle availability */
router.patch('/:id/toggle', authMiddleware, (req, res) => {
  const db = getDB();
  const item = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ success: false, message: 'Menu item not found.' });

  const newAvail = item.available ? 0 : 1;
  db.prepare('UPDATE menu_items SET available = ?, updated_at = datetime(\'now\') WHERE id = ?')
    .run(newAvail, item.id);

  res.json({ success: true, message: `Item ${newAvail ? 'enabled' : 'disabled'}.`, available: newAvail });
});

/* DELETE /api/menu/:id — admin only */
router.delete('/:id', authMiddleware, (req, res) => {
  const db = getDB();
  const item = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ success: false, message: 'Menu item not found.' });

  db.prepare('DELETE FROM menu_items WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: `"${item.name}" deleted from menu.` });
});

/* POST /api/menu/:id/image — upload food photo (admin) */
router.post('/:id/image', authMiddleware, (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message });
    next();
  });
}, (req, res) => {
  const db   = getDB();
  const item = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ success: false, message: 'Menu item not found.' });
  if (!req.file) return res.status(400).json({ success: false, message: 'No image file provided.' });

  // Delete old image if it exists
  if (item.image_url) {
    const oldPath = path.join(__dirname, '..', item.image_url.replace('/uploads', 'uploads'));
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }

  const imageUrl = '/uploads/menu/' + req.file.filename;
  db.prepare("UPDATE menu_items SET image_url = ?, updated_at = datetime('now') WHERE id = ?")
    .run(imageUrl, item.id);

  res.json({ success: true, message: 'Image uploaded successfully.', imageUrl });
});

/* DELETE /api/menu/:id/image — remove food photo (admin) */
router.delete('/:id/image', authMiddleware, (req, res) => {
  const db   = getDB();
  const item = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ success: false, message: 'Menu item not found.' });

  if (item.image_url) {
    const imgPath = path.join(__dirname, '..', item.image_url.replace(/^\//,''));
    if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    db.prepare("UPDATE menu_items SET image_url = NULL, updated_at = datetime('now') WHERE id = ?").run(item.id);
  }
  res.json({ success: true, message: 'Image removed.' });
});

module.exports = router;
