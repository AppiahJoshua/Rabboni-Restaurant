/* ============================================================
   RABBONI RESTAURANT — Utility Functions
   ============================================================ */

const axios = require('axios');

/* ── Generate unique IDs ──────────────────────────────────── */
function generateOrderNumber() {
  return '#RBN-' + Math.floor(1000 + Math.random() * 9000);
}
function generateResRef() {
  return '#RES-' + Math.floor(1000 + Math.random() * 9000);
}
function generateMemberNumber() {
  return 'RBN-MBR-' + Date.now().toString(36).toUpperCase();
}

/* ── Loyalty Tier Logic ───────────────────────────────────── */
function calculateTier(totalSpend) {
  if (totalSpend >= 2000) return 'gold';
  if (totalSpend >= 500)  return 'silver';
  return 'bronze';
}
function pointsMultiplier(tier) {
  if (tier === 'gold')   return 2;
  if (tier === 'silver') return 1.5;
  return 1;
}

/* ── Hubtel SMS ───────────────────────────────────────────── */
async function sendSMS(to, message) {
  if (process.env.HUBTEL_ENABLED !== 'true') {
    console.log(`[SMS – disabled] To: ${to} | Msg: ${message}`);
    return { success: true, simulated: true };
  }
  try {
    const clientId     = process.env.HUBTEL_CLIENT_ID;
    const clientSecret = process.env.HUBTEL_CLIENT_SECRET;
    const senderId     = process.env.HUBTEL_SENDER_ID || 'Rabboni';

    // Normalise Ghanaian number to international format
    const normalised = to.replace(/^0/, '233').replace(/\D/g, '');

    const response = await axios.get('https://smsc.hubtel.com/v1/messages/send', {
      params: {
        clientsecret: clientSecret,
        clientid:     clientId,
        from:         senderId,
        to:           normalised,
        content:      message,
      },
    });
    console.log(`[SMS sent] To: ${to}`);
    return { success: true, data: response.data };
  } catch (err) {
    console.error('[SMS error]', err.message);
    return { success: false, error: err.message };
  }
}

/* ── SMS Templates ────────────────────────────────────────── */
const SMS = {
  orderConfirmed: (name, orderNumber, total, eta = '30–45 mins') =>
    `Hi ${name}! ✅ Your Rabboni order ${orderNumber} (GHS ${total}) has been confirmed. Estimated delivery: ${eta}. Call 059 144 7201 for help.`,

  orderReady: (name, orderNumber) =>
    `Hi ${name}! 🔥 Your order ${orderNumber} is ready and on its way. Thank you for choosing Rabboni Restaurant!`,

  reservationConfirmed: (name, ref, date, time, guests) =>
    `Hi ${name}! 📅 Your Rabboni table reservation (${ref}) for ${guests} guest(s) on ${date} at ${time} is confirmed. See you soon! 059 144 7201`,

  reservationReminder: (name, date, time) =>
    `Hi ${name}! ⏰ Reminder: Your Rabboni table reservation is today at ${time}. We look forward to serving you! 📍 Opp. Community Centre, Techiman.`,

  loyaltyWelcome: (name, memberNumber) =>
    `Welcome to Rabboni Loyalty, ${name}! 🎉 Your member number is ${memberNumber}. Earn points on every purchase & redeem for rewards. 059 144 7201`,
};

/* ── Format GHS currency ──────────────────────────────────── */
function formatGHS(amount) {
  return `GHS ${parseFloat(amount).toFixed(2)}`;
}

/* ── Paginate query results ───────────────────────────────── */
function paginate(req) {
  const page  = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

module.exports = {
  generateOrderNumber,
  generateResRef,
  generateMemberNumber,
  calculateTier,
  pointsMultiplier,
  sendSMS,
  SMS,
  formatGHS,
  paginate,
};
