/* ============================================================
   RABBONI RESTAURANT — Orders Routes
   POST /api/orders              (public – place order)
   GET  /api/orders              (admin – list all)
   GET  /api/orders/:id          (admin – single order)
   PUT  /api/orders/:id/status   (admin – update status)
   ============================================================ */

const express = require('express');
const { body, validationResult } = require('express-validator');
const { getDB } = require('../db/database');
const authMiddleware = require('../middleware/auth');
const { generateOrderNumber, sendSMS, SMS, paginate } = require('../utils/helpers');

const router = express.Router();

const DELIVERY_FEE = parseFloat(process.env.DELIVERY_FEE || 10);
const FREE_DELIVERY_MIN = parseFloat(process.env.FREE_DELIVERY_MINIMUM || 100);

/* POST /api/orders — place a new order */
router.post('/', [
  body('customerName').trim().notEmpty().withMessage('Name is required'),
  body('customerPhone').trim().notEmpty().withMessage('Phone number is required'),
  body('orderType').isIn(['delivery', 'pickup']).withMessage('Order type must be delivery or pickup'),
  body('paymentMethod').isIn(['momo', 'cash', 'card', 'transfer']).withMessage('Invalid payment method'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.menuItemId').notEmpty(),
  body('items.*.quantity').isInt({ min: 1 }),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const db = getDB();
  const {
    customerName, customerPhone, orderType,
    deliveryAddress, deliveryNotes, paymentMethod, items,
  } = req.body;

  if (orderType === 'delivery' && !deliveryAddress) {
    return res.status(400).json({ success: false, message: 'Delivery address is required for delivery orders.' });
  }

  // Validate items and calculate subtotal
  let subtotal = 0;
  const resolvedItems = [];

  for (const item of items) {
    const menuItem = db.prepare('SELECT * FROM menu_items WHERE id = ? AND available = 1').get(item.menuItemId);
    if (!menuItem) {
      return res.status(400).json({ success: false, message: `Menu item "${item.menuItemId}" is unavailable.` });
    }
    const itemSubtotal = menuItem.price * item.quantity;
    subtotal += itemSubtotal;
    resolvedItems.push({ ...item, menuItem, itemSubtotal });
  }

  const deliveryFee = orderType === 'delivery'
    ? (subtotal >= FREE_DELIVERY_MIN ? 0 : DELIVERY_FEE)
    : 0;
  const total = subtotal + deliveryFee;
  const orderNumber = generateOrderNumber();

  // Insert order (payment_status = 'pending' until paid)
  const paymentStatus = paymentMethod === 'cash' ? 'pending_cash' : 'pending';

  const orderResult = db.prepare(`
    INSERT INTO orders
      (order_number, customer_name, customer_phone, order_type,
       delivery_address, delivery_notes, payment_method,
       payment_status, order_status, subtotal, delivery_fee, total)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    orderNumber, customerName, customerPhone, orderType,
    deliveryAddress || null, deliveryNotes || null, paymentMethod,
    paymentStatus, 'pending', subtotal, deliveryFee, total
  );

  const orderId = orderResult.lastInsertRowid;

  // Insert order items
  const insertItem = db.prepare(`
    INSERT INTO order_items (order_id, menu_item_id, item_name, item_price, quantity, subtotal)
    VALUES (?,?,?,?,?,?)
  `);
  for (const ri of resolvedItems) {
    insertItem.run(orderId, ri.menuItemId, ri.menuItem.name, ri.menuItem.price, ri.quantity, ri.itemSubtotal);
  }

  // Send SMS confirmation
  sendSMS(customerPhone, SMS.orderConfirmed(customerName, orderNumber, total.toFixed(2)));

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  res.status(201).json({
    success: true,
    message: 'Order placed successfully.',
    data: { order, orderId, orderNumber, total, deliveryFee },
  });
});

/* GET /api/orders — admin: list all orders */
router.get('/', authMiddleware, (req, res) => {
  const db = getDB();
  const { page, limit, offset } = paginate(req);
  const { status, date } = req.query;

  let query = 'SELECT * FROM orders';
  const params = [];
  const conditions = [];

  if (status) { conditions.push('order_status = ?'); params.push(status); }
  if (date)   { conditions.push('DATE(created_at) = ?'); params.push(date); }

  if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const orders = db.prepare(query).all(...params);
  const total  = db.prepare('SELECT COUNT(*) as c FROM orders').get().c;

  // Attach items to each order
  const withItems = orders.map(o => ({
    ...o,
    items: db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(o.id),
  }));

  res.json({ success: true, total, page, limit, data: withItems });
});

/* GET /api/orders/stats — admin: today's stats */
router.get('/stats', authMiddleware, (req, res) => {
  const db = getDB();
  const today = new Date().toISOString().split('T')[0];

  const stats = {
    todayOrders:  db.prepare("SELECT COUNT(*) as c FROM orders WHERE DATE(created_at) = ?").get(today).c,
    todayRevenue: db.prepare("SELECT COALESCE(SUM(total),0) as s FROM orders WHERE DATE(created_at) = ? AND payment_status != 'pending'").get(today).s,
    pending:      db.prepare("SELECT COUNT(*) as c FROM orders WHERE order_status = 'pending'").get().c,
    preparing:    db.prepare("SELECT COUNT(*) as c FROM orders WHERE order_status = 'preparing'").get().c,
    onWay:        db.prepare("SELECT COUNT(*) as c FROM orders WHERE order_status = 'on_the_way'").get().c,
    delivered:    db.prepare("SELECT COUNT(*) as c FROM orders WHERE order_status = 'delivered'").get().c,
    monthRevenue: db.prepare("SELECT COALESCE(SUM(total),0) as s FROM orders WHERE strftime('%Y-%m',created_at) = strftime('%Y-%m','now') AND payment_status != 'pending'").get().s,
    monthOrders:  db.prepare("SELECT COUNT(*) as c FROM orders WHERE strftime('%Y-%m',created_at) = strftime('%Y-%m','now')").get().c,
  };

  res.json({ success: true, data: stats });
});

/* GET /api/orders/:id — admin */
router.get('/:id', authMiddleware, (req, res) => {
  const db = getDB();
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  res.json({ success: true, data: { ...order, items } });
});

/* PUT /api/orders/:id/status — admin */
router.put('/:id/status', authMiddleware, [
  body('status').isIn(['pending','preparing','on_the_way','delivered','cancelled']).withMessage('Invalid status'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const db = getDB();
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

  db.prepare("UPDATE orders SET order_status = ?, updated_at = datetime('now') WHERE id = ?")
    .run(req.body.status, order.id);

  // Notify customer when dispatched
  if (req.body.status === 'on_the_way') {
    sendSMS(order.customer_phone, SMS.orderReady(order.customer_name, order.order_number));
  }

  res.json({ success: true, message: `Order status updated to "${req.body.status}".` });
});

module.exports = router;
