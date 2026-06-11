/* ============================================================
   RABBONI RESTAURANT — Auth Routes
   POST /api/auth/login
   GET  /api/auth/verify
   ============================================================ */

const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { getDB } = require('../db/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

/* POST /api/auth/login */
router.post('/login', [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { username, password } = req.body;
  const db = getDB();

  const user = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(username);
  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid username or password.' });
  }

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ success: false, message: 'Invalid username or password.' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '12h' }
  );

  res.json({
    success: true,
    token,
    admin: { id: user.id, username: user.username, email: user.email },
  });
});

/* GET /api/auth/verify */
router.get('/verify', authMiddleware, (req, res) => {
  res.json({ success: true, admin: req.admin });
});

/* POST /api/auth/change-password */
router.post('/change-password', authMiddleware, [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const db = getDB();
  const user = db.prepare('SELECT * FROM admin_users WHERE id = ?').get(req.admin.id);

  if (!bcrypt.compareSync(req.body.currentPassword, user.password_hash)) {
    return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
  }

  const newHash = bcrypt.hashSync(req.body.newPassword, 10);
  db.prepare('UPDATE admin_users SET password_hash = ? WHERE id = ?').run(newHash, req.admin.id);

  res.json({ success: true, message: 'Password updated successfully.' });
});

module.exports = router;
