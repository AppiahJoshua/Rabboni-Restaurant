/* ============================================================
   RABBONI RESTAURANT — Reservations Routes
   ============================================================ */

const express = require('express');
const { body, validationResult } = require('express-validator');
const { getDB } = require('../db/database');
const authMiddleware = require('../middleware/auth');
const { generateResRef, sendSMS, SMS, paginate } = require('../utils/helpers');

const resRouter = express.Router();

resRouter.post('/', [
  body('customerName').trim().notEmpty().withMessage('Name is required'),
  body('customerPhone').trim().notEmpty().withMessage('Phone is required'),
  body('date').notEmpty().withMessage('Date is required'),
  body('time').notEmpty().withMessage('Time is required'),
  body('guests').isInt({ min: 1, max: 50 }).withMessage('Guests must be between 1 and 50'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const db = getDB();
  const { customerName, customerPhone, date, time, guests, occasion, specialRequests } = req.body;
  const ref = generateResRef();

  const result = db.prepare(`
    INSERT INTO reservations (ref_number, customer_name, customer_phone, date, time, guests, occasion, special_requests, status)
    VALUES (?,?,?,?,?,?,?,?,'pending')
  `).run(ref, customerName, customerPhone, date, time, guests, occasion || 'dinner', specialRequests || null);

  sendSMS(customerPhone, SMS.reservationConfirmed(customerName, ref, date, time, guests));

  const reservation = db.prepare('SELECT * FROM reservations WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ success: true, message: 'Reservation submitted.', data: reservation });
});

resRouter.get('/', authMiddleware, (req, res) => {
  const db = getDB();
  const { page, limit, offset } = paginate(req);
  const { status, date } = req.query;
  const params = [];
  const conds = [];
  if (status) { conds.push('status = ?'); params.push(status); }
  if (date)   { conds.push('date = ?'); params.push(date); }
  const where = conds.length ? ' WHERE ' + conds.join(' AND ') : '';
  const rows  = db.prepare(`SELECT * FROM reservations${where} ORDER BY date, time LIMIT ? OFFSET ?`).all(...params, limit, offset);
  const total = db.prepare(`SELECT COUNT(*) as c FROM reservations${where}`).get(...params).c;
  res.json({ success: true, total, page, limit, data: rows });
});

resRouter.put('/:id/status', authMiddleware, [
  body('status').isIn(['pending','confirmed','cancelled']).withMessage('Invalid status'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  const db = getDB();
  const r = db.prepare('SELECT * FROM reservations WHERE id = ?').get(req.params.id);
  if (!r) return res.status(404).json({ success: false, message: 'Reservation not found.' });
  db.prepare("UPDATE reservations SET status = ?, updated_at = datetime('now') WHERE id = ?").run(req.body.status, r.id);
  res.json({ success: true, message: `Reservation ${req.body.status}.` });
});

/* ============================================================
   Reviews Routes
   ============================================================ */
const revRouter = express.Router();

revRouter.post('/', [
  body('customerName').trim().notEmpty().withMessage('Name is required'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be 1-5'),
  body('reviewText').trim().isLength({ min: 10 }).withMessage('Review must be at least 10 characters'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  const db = getDB();
  const { customerName, rating, reviewText, favouriteDish } = req.body;
  const result = db.prepare(`
    INSERT INTO reviews (customer_name, rating, review_text, favourite_dish, status)
    VALUES (?,?,?,?,'pending')
  `).run(customerName, rating, reviewText, favouriteDish || null);
  const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ success: true, message: 'Review submitted. It will appear after approval.', data: review });
});

revRouter.get('/', (req, res) => {
  const db = getDB();
  const onlyApproved = req.query.all !== 'true';
  const where = onlyApproved ? "WHERE status = 'approved'" : '';
  const rows = db.prepare(`SELECT * FROM reviews ${where} ORDER BY created_at DESC`).all();
  res.json({ success: true, count: rows.length, data: rows });
});

revRouter.put('/:id/approve', authMiddleware, (req, res) => {
  const db = getDB();
  db.prepare("UPDATE reviews SET status = 'approved' WHERE id = ?").run(req.params.id);
  res.json({ success: true, message: 'Review approved.' });
});

revRouter.delete('/:id', authMiddleware, (req, res) => {
  const db = getDB();
  db.prepare('DELETE FROM reviews WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: 'Review deleted.' });
});

/* ============================================================
   Contact Routes
   ============================================================ */
const contactRouter = express.Router();

contactRouter.post('/', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('phone').trim().notEmpty().withMessage('Phone is required'),
  body('message').trim().isLength({ min: 5 }).withMessage('Message is required'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  const db = getDB();
  const { name, phone, subject, message } = req.body;
  db.prepare('INSERT INTO contacts (name, phone, subject, message) VALUES (?,?,?,?)').run(name, phone, subject || 'General Enquiry', message);
  res.status(201).json({ success: true, message: "Message received. We'll get back to you shortly!" });
});

contactRouter.get('/', authMiddleware, (req, res) => {
  const db = getDB();
  const rows = db.prepare('SELECT * FROM contacts ORDER BY created_at DESC').all();
  res.json({ success: true, data: rows });
});

contactRouter.put('/:id/read', authMiddleware, (req, res) => {
  const db = getDB();
  db.prepare("UPDATE contacts SET status = 'read' WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

/* ============================================================
   Loyalty Routes
   ============================================================ */
const loyaltyRouter = express.Router();
const { generateMemberNumber, calculateTier, pointsMultiplier } = require('../utils/helpers');

loyaltyRouter.post('/register', [
  body('firstName').trim().notEmpty(),
  body('lastName').trim().notEmpty(),
  body('phone').trim().notEmpty(),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  const db = getDB();
  const { firstName, lastName, phone, birthday } = req.body;
  const existing = db.prepare('SELECT id FROM loyalty_members WHERE phone = ?').get(phone);
  if (existing) return res.status(409).json({ success: false, message: 'A member with this phone number already exists.' });
  const memberNumber = generateMemberNumber();
  const result = db.prepare(`
    INSERT INTO loyalty_members (member_number, first_name, last_name, phone, birthday)
    VALUES (?,?,?,?,?)
  `).run(memberNumber, firstName, lastName, phone, birthday || null);
  const member = db.prepare('SELECT * FROM loyalty_members WHERE id = ?').get(result.lastInsertRowid);
  sendSMS(phone, SMS.loyaltyWelcome(`${firstName} ${lastName}`, memberNumber));
  res.status(201).json({ success: true, message: 'Welcome to Rabboni Loyalty!', data: member });
});

loyaltyRouter.get('/member/:phone', (req, res) => {
  const db = getDB();
  const member = db.prepare('SELECT * FROM loyalty_members WHERE phone = ?').get(req.params.phone);
  if (!member) return res.status(404).json({ success: false, message: 'Member not found.' });
  const transactions = db.prepare('SELECT * FROM loyalty_transactions WHERE member_id = ? ORDER BY created_at DESC LIMIT 20').all(member.id);
  res.json({ success: true, data: { ...member, transactions } });
});

loyaltyRouter.post('/earn', authMiddleware, [
  body('phone').notEmpty(),
  body('orderId').notEmpty(),
  body('orderTotal').isFloat({ min: 0 }),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  const db = getDB();
  const { phone, orderId, orderTotal } = req.body;
  const member = db.prepare('SELECT * FROM loyalty_members WHERE phone = ?').get(phone);
  if (!member) return res.status(404).json({ success: false, message: 'Member not found.' });
  const multiplier = pointsMultiplier(member.tier);
  const earned = Math.floor(orderTotal * multiplier);
  const newPoints = member.points + earned;
  const newSpend  = member.total_spend + orderTotal;
  const newTier   = calculateTier(newSpend);
  db.prepare("UPDATE loyalty_members SET points = ?, total_spend = ?, tier = ?, updated_at = datetime('now') WHERE id = ?")
    .run(newPoints, newSpend, newTier, member.id);
  db.prepare('INSERT INTO loyalty_transactions (member_id, type, points, description, order_id) VALUES (?,?,?,?,?)')
    .run(member.id, 'earn', earned, `Earned for order #${orderId}`, orderId);
  res.json({ success: true, message: `${earned} points earned.`, data: { pointsEarned: earned, totalPoints: newPoints, tier: newTier } });
});

loyaltyRouter.post('/redeem', [
  body('phone').notEmpty(),
  body('points').isInt({ min: 100 }),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  const db = getDB();
  const { phone, points } = req.body;
  const member = db.prepare('SELECT * FROM loyalty_members WHERE phone = ?').get(phone);
  if (!member) return res.status(404).json({ success: false, message: 'Member not found.' });
  if (member.points < points) return res.status(400).json({ success: false, message: `Insufficient points. You have ${member.points} pts.` });
  const discount = points; // 1 point = GHS 1 discount
  db.prepare("UPDATE loyalty_members SET points = ?, updated_at = datetime('now') WHERE id = ?").run(member.points - points, member.id);
  db.prepare('INSERT INTO loyalty_transactions (member_id, type, points, description) VALUES (?,?,?,?)').run(member.id, 'redeem', -points, `Redeemed ${points} pts for GHS ${discount} discount`);
  res.json({ success: true, message: `${points} points redeemed for GHS ${discount} discount.`, discount, remainingPoints: member.points - points });
});

/* ============================================================
   Payments Routes (Paystack)
   ============================================================ */
const paymentsRouter = express.Router();
const axios = require('axios');

paymentsRouter.post('/initialize', [
  body('orderId').notEmpty(),
  body('email').isEmail().withMessage('Valid email required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const db = getDB();
  const { orderId, email } = req.body;

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

  try {
    const response = await axios.post('https://api.paystack.co/transaction/initialize', {
      email,
      amount: Math.round(order.total * 100), // Paystack uses pesewas
      currency: 'GHS',
      reference: `${order.order_number}-${Date.now()}`,
      callback_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/order.html?payment=success`,
      metadata: {
        order_id:      order.id,
        order_number:  order.order_number,
        customer_name: order.customer_name,
        custom_fields: [
          { display_name: 'Order Number', variable_name: 'order_number', value: order.order_number },
          { display_name: 'Customer', variable_name: 'customer_name', value: order.customer_name },
        ],
      },
      channels: ['mobile_money', 'card', 'bank'],
    }, {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const { authorization_url, access_code, reference } = response.data.data;

    // Save reference to order
    db.prepare("UPDATE orders SET payment_reference = ? WHERE id = ?").run(reference, order.id);

    res.json({
      success: true,
      data: { authorizationUrl: authorization_url, accessCode: access_code, reference },
    });
  } catch (err) {
    console.error('[Paystack init error]', err.response?.data || err.message);
    res.status(500).json({ success: false, message: 'Payment initialization failed. Please try again.' });
  }
});

paymentsRouter.get('/verify/:reference', async (req, res) => {
  const { reference } = req.params;
  try {
    const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
    });

    const txn = response.data.data;
    if (txn.status === 'success') {
      const db = getDB();
      const order = db.prepare('SELECT * FROM orders WHERE payment_reference = ?').get(reference);
      if (order) {
        db.prepare("UPDATE orders SET payment_status = 'paid', order_status = 'confirmed', updated_at = datetime('now') WHERE id = ?").run(order.id);
        sendSMS(order.customer_phone, SMS.orderConfirmed(order.customer_name, order.order_number, order.total.toFixed(2)));
      }
      res.json({ success: true, message: 'Payment verified.', data: { reference, amount: txn.amount / 100, status: 'success' } });
    } else {
      res.status(400).json({ success: false, message: 'Payment not completed.' });
    }
  } catch (err) {
    console.error('[Paystack verify error]', err.message);
    res.status(500).json({ success: false, message: 'Payment verification failed.' });
  }
});

paymentsRouter.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const crypto = require('crypto');
  const hash = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
    .update(req.body).digest('hex');

  if (hash !== req.headers['x-paystack-signature']) {
    return res.status(400).send('Invalid signature');
  }

  const event = JSON.parse(req.body);
  if (event.event === 'charge.success') {
    const db = getDB();
    const ref = event.data.reference;
    const order = db.prepare('SELECT * FROM orders WHERE payment_reference = ?').get(ref);
    if (order && order.payment_status !== 'paid') {
      db.prepare("UPDATE orders SET payment_status = 'paid', order_status = 'confirmed', updated_at = datetime('now') WHERE id = ?").run(order.id);
      console.log(`[Webhook] Payment confirmed for order ${order.order_number}`);
    }
  }
  res.sendStatus(200);
});

module.exports = { resRouter, revRouter, contactRouter, loyaltyRouter, paymentsRouter };
