# 🍽️ Rabboni Restaurant — Full Stack Website

**Location:** Opposite Techiman Community Centre, Bono East Region, Ghana  
**Stack:** Node.js · Express · SQLite · Paystack (Mobile Money) · Hubtel SMS · JWT Auth

---

## 📁 Project Structure

```
rabboni/
├── index.html              ← Homepage
├── about.html              ← About Us
├── menu.html               ← Menu (search + filter + cart)
├── order.html              ← Online Ordering (Paystack checkout)
├── reservations.html       ← Table Reservations
├── gallery.html            ← Photo Gallery
├── promotions.html         ← Packages & Events
├── reviews.html            ← Customer Reviews
├── contact.html            ← Contact & Map
├── loyalty.html            ← Loyalty Program
├── admin.html              ← Admin Dashboard (login required)
├── css/
│   └── styles.css          ← Design system (Warm African Luxury)
├── js/
│   ├── api.js              ← API client helper
│   ├── main.js             ← Shared nav, toasts, animations
│   ├── menu.js             ← Menu page logic
│   ├── order.js            ← Order page + Paystack
│   ├── gallery.js          ← Gallery + lightbox
│   └── admin.js            ← Admin dashboard
└── backend/
    ├── server.js           ← Express server (serves frontend + API)
    ├── package.json
    ├── .env                ← Your environment variables
    ├── rabboni.db          ← SQLite database (auto-created)
    ├── db/
    │   ├── database.js     ← DB init & schema
    │   └── seed.js         ← Seed 48 menu items + sample reviews
    ├── routes/
    │   ├── auth.js         ← Login / JWT
    │   ├── menu.js         ← Menu CRUD
    │   ├── orders.js       ← Orders management
    │   └── other.js        ← Reservations, Reviews, Contact, Loyalty, Payments
    ├── middleware/
    │   └── auth.js         ← JWT middleware
    └── utils/
        └── helpers.js      ← SMS, ID generators, tier logic
```

---

## 🚀 Quick Start (5 Minutes)

### 1. Install Node.js
Download from [nodejs.org](https://nodejs.org) — version 18 or higher.

### 2. Install dependencies
```bash
cd rabboni/backend
npm install
```

### 3. Configure environment
Edit `backend/.env` — the defaults will work for local testing:
```
PORT=3000
JWT_SECRET=change_this_to_a_long_random_string
ADMIN_USERNAME=admin
ADMIN_PASSWORD=rabboni@admin2026
```

### 4. Seed the database
```bash
npm run seed
```
This creates `rabboni.db` and loads all 48 menu items + sample reviews.

### 5. Start the server
```bash
npm start
```

Open **http://localhost:3000** — the full website is live!  
Admin dashboard: **http://localhost:3000/admin.html**

---

## 🔑 Admin Login

| Field    | Value              |
|----------|--------------------|
| Username | `admin`            |
| Password | `rabboni@admin2026`|

**Change these before going live** in your `.env` file.

---

## 💳 Paystack Setup (Mobile Money Payments)

1. Register at [dashboard.paystack.com](https://dashboard.paystack.com)
2. Go to **Settings → API Keys**
3. Copy your **Secret Key** and **Public Key**
4. Add to your `.env`:
   ```
   PAYSTACK_SECRET_KEY=sk_live_xxxxxxxxxxxx
   PAYSTACK_PUBLIC_KEY=pk_live_xxxxxxxxxxxx
   ```
5. Add the public key to `order.html`:
   ```html
   <meta name="paystack-key" content="pk_live_xxxxxxxxxxxx">
   ```

Paystack supports **MTN Mobile Money**, **Vodafone Cash**, and **AirtelTigo Money** in Ghana.

---

## 📱 Hubtel SMS Setup

1. Register at [developers.hubtel.com](https://developers.hubtel.com)
2. Get your **Client ID** and **Client Secret**
3. Add to `.env`:
   ```
   HUBTEL_CLIENT_ID=xxxxxxxx
   HUBTEL_CLIENT_SECRET=xxxxxxxxxxxxxxxx
   HUBTEL_SENDER_ID=Rabboni
   HUBTEL_ENABLED=true
   ```

When disabled (`HUBTEL_ENABLED=false`), all SMS are logged to the console instead.

---

## 🌐 API Reference

All endpoints are under `/api/`. Protected routes require `Authorization: Bearer <token>`.

| Method | Endpoint                        | Auth  | Description               |
|--------|---------------------------------|-------|---------------------------|
| POST   | /api/auth/login                 | —     | Admin login               |
| GET    | /api/menu                       | —     | Get all menu items        |
| POST   | /api/menu                       | Admin | Add menu item             |
| PUT    | /api/menu/:id                   | Admin | Update menu item          |
| DELETE | /api/menu/:id                   | Admin | Delete menu item          |
| POST   | /api/orders                     | —     | Place an order            |
| GET    | /api/orders                     | Admin | List all orders           |
| PUT    | /api/orders/:id/status          | Admin | Update order status       |
| POST   | /api/reservations               | —     | Make a reservation        |
| GET    | /api/reservations               | Admin | List all reservations     |
| PUT    | /api/reservations/:id/status    | Admin | Confirm / cancel          |
| POST   | /api/reviews                    | —     | Submit a review           |
| GET    | /api/reviews                    | —     | Get approved reviews      |
| PUT    | /api/reviews/:id/approve        | Admin | Approve a review          |
| POST   | /api/contact                    | —     | Send a contact message    |
| POST   | /api/loyalty/register           | —     | Join loyalty program      |
| GET    | /api/loyalty/member/:phone      | —     | Get member info           |
| POST   | /api/payments/initialize        | —     | Initialize Paystack       |
| GET    | /api/payments/verify/:ref       | —     | Verify payment            |
| POST   | /api/payments/webhook           | —     | Paystack webhook          |
| GET    | /api/dashboard/stats            | Admin | Dashboard statistics      |

---

## ☁️ Deploying to Production

### Option A — Render.com (Free tier, recommended)
1. Push code to GitHub
2. Create a new **Web Service** on [render.com](https://render.com)
3. Set **Root Directory** to `backend`
4. Set **Build Command**: `npm install && node db/seed.js`
5. Set **Start Command**: `npm start`
6. Add all `.env` variables in Render's Environment tab
7. Set `NODE_ENV=production` and `FRONTEND_URL=https://your-app.onrender.com`

### Option B — VPS (DigitalOcean / Hetzner)
```bash
# On your server
git clone your-repo
cd rabboni/backend
npm install
node db/seed.js
npm install -g pm2
pm2 start server.js --name rabboni
pm2 save && pm2 startup
```
Use Nginx as a reverse proxy pointing port 80 → 3000.

---

## 📞 Restaurant Details

| Info        | Details                                               |
|-------------|-------------------------------------------------------|
| Phone       | 059 144 7201 · 024 288 0601 · 020 648 4613           |
| Address     | Opp. Techiman Community Centre, First Floor, OIB Bldg |
| Hours       | Monday – Sunday, 6:00 AM – 9:00 PM                   |
| Location    | Techiman, Bono East Region, Ghana                     |

---

*Built with ❤️ for Rabboni Restaurant, Techiman, Ghana 🇬🇭*
