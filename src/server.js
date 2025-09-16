const path = require('path');
const fs = require('fs');
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const QRCode = require('qrcode');

const { FSDB, ensureDir } = require('./utils/fsdb');
const { buildUpiLink } = require('./upi');
const { extractAmountPaise, extractNote, containsUpiId, extractUtr } = require('./parsers/sms');
const { sha256 } = require('./utils/hash');
const { getProduct } = require('./products');

const app = express();
const crypto = require('crypto');

const ADMIN_USER = 'thesolowardrobe@gmail.com';
const ADMIN_PASS = 'Thesolowardrobe@14333';

// constant-time compare to avoid timing attacks
function safeEq(a, b) {
  try {
    const A = Buffer.from(String(a) ?? '');
    const B = Buffer.from(String(b) ?? '');
    if (A.length !== B.length) return false;
    return crypto.timingSafeEqual(A, B);
  } catch {
    return false;
  }
}

// identify any URL that has an "admin" path segment
function isAdminPath(p) {
  return String(p || '').split('/').filter(Boolean).includes('admin');
}

function challenge(res) {
  res.setHeader('WWW-Authenticate', 'Basic realm="SoloAdmin", charset="UTF-8"');
  // prevent caching of protected responses
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  return res.status(401).send('Auth required');
}

function adminBasicAuth(req, res, next) {
  if (!isAdminPath(req.path)) return next();

  const hdr = req.headers && req.headers.authorization;
  if (!hdr || !hdr.startsWith('Basic ')) return challenge(res);

  let user = '', pass = '';
  try {
    const decoded = Buffer.from(hdr.slice(6), 'base64').toString('utf8');
    const idx = decoded.indexOf(':');
    if (idx >= 0) {
      user = decoded.slice(0, idx);
      pass = decoded.slice(idx + 1);
    }
  } catch {
    return challenge(res);
  }

  if (safeEq(user, ADMIN_USER) && safeEq(pass, ADMIN_PASS)) {
    // don't cache admin pages
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return next();
  }
  return challenge(res);
}

// register BEFORE any static middleware or SPA fallbacks
app.use(adminBasicAuth);
// --- END: Minimal Basic Auth for /admin ---
app.use(helmet());
app.use(express.json({ limit: '256kb' }));

const DATA_DIR = path.join(process.cwd(), 'data');
const PUBLIC_DIR = path.join(process.cwd(), 'public');
const DIST_DIR = path.join(process.cwd(), 'dist');
const QRS_DIR = path.join(PUBLIC_DIR, 'qrs');
ensureDir(DATA_DIR);
ensureDir(QRS_DIR);

const db = new FSDB(DATA_DIR);

const ORDER_TTL_MIN = Number(process.env.ORDER_TTL_MIN || 5);

function nowIso() { return new Date().toISOString(); }

function addMinutes(iso, minutes) {
  const d = iso ? new Date(iso) : new Date();
  return new Date(d.getTime() + minutes * 60 * 1000).toISOString();
}

function ensureFreshStatus(order) {
  if (!order) return false;
  const now = new Date();
  const exp = order.expiresAt ? new Date(order.expiresAt) : null;
  if (order.status !== 'PAID' && exp && now > exp && order.status !== 'EXPIRED') {
    order.status = 'EXPIRED';
    order.currentUpiLink = null;
    order.currentQr = null;
    order.updatedAt = nowIso();
    return true;
  }
  return false;
}

function loadOrders() {
  return db.read('orders', []);
}
function saveOrders(orders) {
  db.write('orders', orders);
}
function loadPayments() {
  return db.read('payments', []);
}
function savePayments(payments) {
  db.write('payments', payments);
}

function genOrderId() {
  const ts = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `ORD-${ts}-${rand}`;
}

async function makeQr(filePath, text) {
  await QRCode.toFile(filePath, text, { type: 'png', width: 512, margin: 1 });
}

// --- PUBLIC ORDER VIEW (safe) + ADMIN API GUARD HELPERS ---
function genViewToken() {
  return crypto.randomBytes(18).toString('base64url');
}
function sanitizeOrder(o) {
  if (!o) return null;
  const dispatchBase = o.paidAt || o.createdAt;
  const dispatchBy = dispatchBase ? new Date(new Date(dispatchBase).getTime() + 2*24*60*60*1000).toISOString() : null;
  return {
    id: o.id,
    status: o.status,
    currency: o.currency,
    totalAmountPaise: o.totalAmountPaise,
    paidPaise: o.paidPaise,
    remainingPaise: o.remainingPaise,
    product: o.product ? { id: o.product.id, name: o.product.name, amountPaise: o.product.amountPaise } : null,
    createdAt: o.createdAt,
    paidAt: o.paidAt || null,
    dispatchBy
  };
}
function parseBasicAuth(req) {
  const hdr = req.headers && req.headers.authorization;
  if (!hdr || !hdr.startsWith('Basic ')) return null;
  try {
    const decoded = Buffer.from(hdr.slice(6), 'base64').toString('utf8');
    const idx = decoded.indexOf(':');
    if (idx < 0) return null;
    return { user: decoded.slice(0, idx), pass: decoded.slice(idx + 1) };
  } catch { return null; }
}
function requireAdminApi(req, res, next) {
  const creds = parseBasicAuth(req);
  if (creds && safeEq(creds.user, ADMIN_USER) && safeEq(creds.pass, ADMIN_PASS)) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return next();
  }
  res.setHeader('WWW-Authenticate', 'Basic realm="SoloAdmin-API", charset="UTF-8"');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(401).send('Auth required');
}
// --- END HELPERS ---

// Static hosting for QR images and built SPA assets
app.use('/qrs', express.static(QRS_DIR, { fallthrough: false }));
app.use(express.static(DIST_DIR));

// Health
app.get('/health', (_req, res) => res.json({ ok: true }));

function assertPositiveInteger(name, v) {
  if (!Number.isFinite(v) || v <= 0) throw new Error(`${name} must be > 0`);
}

// Create order and generate QR
app.post('/orders', async (req, res) => {
  try {
    const { amount, amountPaise: amountPaiseIn, currency = 'INR', meta = {}, productId } = req.body || {};
    const upiId = process.env.UPI_ID;
    const upiName = process.env.UPI_NAME || 'Merchant';
    if (!upiId) return res.status(400).json({ error: 'Missing env UPI_ID' });

    let amountPaise;
    let product = null;
    if (productId) {
      product = getProduct(productId);
      if (!product) return res.status(400).json({ error: 'Invalid productId' });
      amountPaise = Math.round((product.amountPaise != null ? product.amountPaise : product.amount * 100));
    } else {
      const allowRaw = String(process.env.ALLOW_RAW_AMOUNT || 'true').toLowerCase() === 'true';
      if (!allowRaw) return res.status(400).json({ error: 'Raw amount orders disabled. Use productId.' });
      if (typeof amountPaiseIn === 'number') amountPaise = Math.round(amountPaiseIn);
      else if (typeof amount === 'number') amountPaise = Math.round(amount * 100);
      else return res.status(400).json({ error: 'Provide amount (rupees) or amountPaise (integer) or productId' });
    }

    if (currency !== 'INR') return res.status(400).json({ error: 'Only INR supported' });
    try { assertPositiveInteger('amountPaise', amountPaise); } catch (e) { return res.status(400).json({ error: e.message }); }

    const orderId = genOrderId();
    const upiLink = buildUpiLink({ pa: upiId, pn: upiName, amountPaise, orderId });
    const qrFile = path.join(QRS_DIR, `${orderId}-${amountPaise}.png`);
    await makeQr(qrFile, upiLink);

    const orders = loadOrders();
    const now = nowIso();
    const expiresAt = addMinutes(now, ORDER_TTL_MIN);
    const order = {
      id: orderId,
      totalAmountPaise: amountPaise,
      paidPaise: 0,
      remainingPaise: amountPaise,
      currency,
      upiLink, // legacy
      qrPath: `/qrs/${orderId}-${amountPaise}.png`, // legacy
      currentUpiLink: upiLink,
      currentQr: `/qrs/${orderId}-${amountPaise}.png`,
      qrHistory: [
        { amountPaise, upiLink, qr: `/qrs/${orderId}-${amountPaise}.png`, createdAt: now }
      ],
      status: 'PENDING',
      createdAt: now,
      updatedAt: now,
      expiresAt,
      paidAt: null,
      meta: { ...meta, productId: product ? product.id : meta.productId },
      product: product ? { id: product.id, name: product.name, amountPaise: amountPaise } : null,
      publicViewToken: genViewToken(), // <-- add public view token
    };
    orders.push(order);
    saveOrders(orders);

    const expiresInMs = Math.max(0, new Date(expiresAt).getTime() - new Date(now).getTime());
    const confirmationUrl = `/order/${order.publicViewToken}`; // <-- safe confirmation URL for customers
    res.json({
      orderId,
      upiLink: order.currentUpiLink,
      qr: order.currentQr,
      status: order.status,
      remainingPaise: order.remainingPaise,
      product: order.product,
      expiresAt: order.expiresAt,
      serverNow: nowIso(),
      expiresInMs,
      confirmationUrl,                // <-- added
      publicViewToken: order.publicViewToken // <-- added
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// List orders (admin only)
app.get('/orders', requireAdminApi, (req, res) => {
  const orders = loadOrders();
  let changed = false;
  for (const o of orders) {
    if (ensureFreshStatus(o)) changed = true;
  }
  if (changed) saveOrders(orders);
  const limit = Math.max(1, Math.min(1000, Number(req.query.limit) || 200));
  const out = orders
    .slice()
    .sort((a,b) => String(b.createdAt).toLocaleString().localeCompare(String(a.createdAt)))
    .slice(0, limit);
  res.json({ serverNow: nowIso(), orders: out });
});

// Get single order (admin only)
app.get('/orders/:id', requireAdminApi, async (req, res) => {
  const orders = loadOrders();
  const order = orders.find((o) => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Not found' });
  if (ensureFreshStatus(order)) saveOrders(orders);
  try {
    if (order.status !== 'PAID' && Array.isArray(order.pendingVerifications) && order.pendingVerifications.length) {
      const payments = loadPayments();
      const norm = (s) => String(s || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      const findPaymentFor = (utr) => payments.find((p) => p.utr && norm(p.utr) === norm(utr) && !p.matched);
      const idx = order.pendingVerifications.findIndex((pv) => !!findPaymentFor(pv.utr));
      if (idx >= 0) {
        const pv = order.pendingVerifications[idx];
        const pay = findPaymentFor(pv.utr);
        if (pay) {
          const upiId = process.env.UPI_ID;
          const upiName = process.env.UPI_NAME || 'Merchant';
          const amountPaise = pay.amountPaise || pv.amountPaise || 0;
          if (amountPaise > 0) {
            const result = updateOrderForPartial(order, amountPaise, upiId, upiName);
            pay.matched = true;
            pay.orderId = order.id;
            savePayments(payments);
            if (order.status !== 'PAID' && result) {
              await makeQr(result.qrFile, result.nextLink);
              order.currentUpiLink = result.nextLink;
              order.currentQr = `/qrs/${path.basename(result.qrFile)}`;
              const now = nowIso();
              order.qrHistory.push({ amountPaise: order.remainingPaise, upiLink: result.nextLink, qr: order.currentQr, createdAt: now });
              order.upiLink = order.currentUpiLink;
              order.qrPath = order.currentQr;
            }
            order.updatedAt = nowIso();
            order.pendingVerifications.splice(idx, 1);
            saveOrders(orders);
          }
        }
      }
    }
  } catch {}
  const serverNowVal = nowIso();
  let expiresInMs = 0;
  try {
    if (order.expiresAt) {
      const exp = new Date(order.expiresAt).getTime();
      const srv = new Date(serverNowVal).getTime();
      if (Number.isFinite(exp) && Number.isFinite(srv)) expiresInMs = Math.max(0, exp - srv);
    }
  } catch {}
  res.json({ ...order, serverNow: serverNowVal, expiresInMs });
});

// Products API (read-only)
app.get('/products/:id', (req, res) => {
  const product = getProduct(req.params.id);
  if (!product) return res.status(404).json({ error: 'Not found' });
  const amountPaise = Math.round((product.amountPaise != null ? product.amountPaise : product.amount * 100));
  res.json({ id: product.id, name: product.name, amountPaise });
});

// Rate-limit and protect SMS webhook
const smsLimiter = rateLimit({ windowMs: 60_000, max: 30, standardHeaders: true, legacyHeaders: false });

function requireWebhookSecret(req) {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) return true; // not set -> allow
  const provided = req.headers['x-webhook-secret'] || req.query.secret || (req.body && req.body.secret);
  return String(provided) === String(secret);
}

function updateOrderForPartial(order, paidAmountPaise, upiId, upiName) {
  const now = new Date().toISOString();
  order.paidPaise += paidAmountPaise;
  if (order.paidPaise < 0) order.paidPaise = 0;
  order.remainingPaise = Math.max(0, order.totalAmountPaise - order.paidPaise);
  if (order.remainingPaise === 0) {
    order.status = 'PAID';
    order.paidAt = now;
    order.currentUpiLink = null;
    order.currentQr = null;
    return;
  }
  order.status = order.paidPaise > 0 ? 'PARTIAL' : 'PENDING';
  // Generate a new QR for the remaining amount
  const nextLink = buildUpiLink({ pa: upiId, pn: upiName, amountPaise: order.remainingPaise, orderId: order.id });
  const qrFile = path.join(QRS_DIR, `${order.id}-${order.remainingPaise}.png`);
  // Synchronous write from caller to ensure await
  // Return info for caller to await generation
  return { nextLink, qrFile };
}

// Admin-lite actions (now admin-only)
app.post('/orders/:id/expire', requireAdminApi, (req, res) => {
  const orders = loadOrders();
  const order = orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Not found' });
  if (order.status !== 'PAID') {
    order.status = 'EXPIRED';
    order.currentQr = null;
    order.currentUpiLink = null;
    order.updatedAt = nowIso();
  }
  saveOrders(orders);
  res.json({ ok: true, order });
});

app.post('/orders/:id/mark-paid', requireAdminApi, (req, res) => {
  const orders = loadOrders();
  const order = orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Not found' });
  order.status = 'PAID';
  order.paidPaise = order.totalAmountPaise;
  order.remainingPaise = 0;
  order.currentQr = null;
  order.currentUpiLink = null;
  order.paidAt = nowIso();
  order.updatedAt = order.paidAt;
  saveOrders(orders);
  res.json({ ok: true, order });
});

app.post('/orders/:id/regenerate', requireAdminApi, async (req, res) => {
  try {
    const orders = loadOrders();
    const order = orders.find(o => o.id === req.params.id);
    if (!order) return res.status(404).json({ error: 'Not found' });
    if (order.status === 'PAID') return res.status(400).json({ error: 'Already paid' });
    const upiId = process.env.UPI_ID;
    const upiName = process.env.UPI_NAME || 'Merchant';
    const amountPaise = order.remainingPaise || order.totalAmountPaise;
    const nextLink = buildUpiLink({ pa: upiId, pn: upiName, amountPaise, orderId: order.id });
    const qrFile = path.join(QRS_DIR, `${order.id}-${amountPaise}.png`);
    await makeQr(qrFile, nextLink);
    order.currentUpiLink = nextLink;
    order.currentQr = `/qrs/${path.basename(qrFile)}`;
    const now = nowIso();
    order.expiresAt = addMinutes(now, ORDER_TTL_MIN);
    order.updatedAt = now;
    order.status = order.paidPaise > 0 ? 'PARTIAL' : 'PENDING';
    order.qrHistory.push({ amountPaise, upiLink: nextLink, qr: order.currentQr, createdAt: now });
    saveOrders(orders);
    res.json({ ok: true, order, serverNow: nowIso() });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to regenerate' });
  }
});

app.post('/webhooks/sms', smsLimiter, async (req, res) => {
  try {
    if (!requireWebhookSecret(req)) return res.status(401).json({ error: 'Unauthorized' });
    const { text, from } = req.body || {};
    if (!text || typeof text !== 'string') return res.status(400).json({ error: 'Missing text' });

    const upiId = process.env.UPI_ID;
    const upiName = process.env.UPI_NAME || 'Merchant';
    const strictUpi = String(process.env.STRICT_UPI_ID_MATCH || '').toLowerCase() === 'true';

    const orders = loadOrders();
    const candidates = orders.filter((o) => o.status !== 'PAID').map((o) => o.id);

    const amountPaise = extractAmountPaise(text);
    const note = extractNote(text, candidates);
    const utr = extractUtr(text);

    const payments = loadPayments();
    const checksum = sha256(`${from || ''}::${text}`);
    const duplicate = payments.some((p) => p.checksum === checksum);

    const payment = {
      id: payments.length + 1,
      orderId: null,
      amountPaise: amountPaise ?? null,
      note: note ?? null,
      utr: utr || null,
      source: 'SMS',
      raw: text,
      from: from || null,
      createdAt: new Date().toISOString(),
      matched: false,
      duplicate,
      checksum,
    };

    let matchedOrder = null;
    if (note) {
      matchedOrder = orders.find((o) => note.toUpperCase().includes(o.id.toUpperCase()));
      if (!matchedOrder) matchedOrder = orders.find((o) => o.id.toUpperCase() === note.toUpperCase());
    }
    // If no note-based match, try orders that have pending UTR matching this SMS
    if (!matchedOrder && utr) {
      const norm = (s) => String(s || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      matchedOrder = orders.find((o) => Array.isArray(o.pendingVerifications) && o.pendingVerifications.some((pv) => norm(pv.utr) === norm(utr)));
    }

    const upiOk = containsUpiId(text, upiId);
    if (strictUpi && !upiOk) {
      payments.push(payment);
      savePayments(payments);
      return res.json({ ok: true, matched: false, reason: 'UPI_ID not found in SMS' });
    }

    if (!matchedOrder || amountPaise == null) {
      payments.push(payment);
      savePayments(payments);
      return res.json({ ok: true, matched: false });
    }

    if (duplicate) {
      // Duplicate SMS text; still store for audit, but don't re-apply
      if (matchedOrder) payment.orderId = matchedOrder.id;
      payments.push(payment);
      savePayments(payments);
      return res.json({ ok: true, matched: false, duplicate: true });
    }

    payment.orderId = matchedOrder.id;

    const remainingBefore = matchedOrder.remainingPaise ?? matchedOrder.totalAmountPaise - (matchedOrder.paidPaise || 0);
    if (amountPaise <= 0) {
      payments.push(payment);
      savePayments(payments);
      return res.json({ ok: true, matched: false, reason: 'Non-positive amount' });
    }

    // Apply payment
    const result = updateOrderForPartial(matchedOrder, amountPaise, upiId, upiName);
    payment.matched = true;

    // If a new QR is needed, create it now and update order fields
    if (matchedOrder.status !== 'PAID' && result) {
      await makeQr(result.qrFile, result.nextLink);
      matchedOrder.currentUpiLink = result.nextLink;
      matchedOrder.currentQr = `/qrs/${path.basename(result.qrFile)}`;
      const now = new Date().toISOString();
      matchedOrder.qrHistory.push({ amountPaise: matchedOrder.remainingPaise, upiLink: result.nextLink, qr: matchedOrder.currentQr, createdAt: now });
      matchedOrder.upiLink = matchedOrder.currentUpiLink; // legacy sync
      matchedOrder.qrPath = matchedOrder.currentQr; // legacy sync
    }

    saveOrders(orders);
    payments.push(payment);
    savePayments(payments);

    const response = {
      ok: true,
      matched: true,
      orderId: matchedOrder.id,
      status: matchedOrder.status,
      paidPaise: matchedOrder.paidPaise,
      remainingPaise: matchedOrder.remainingPaise,
      currentQr: matchedOrder.currentQr,
      currentUpiLink: matchedOrder.currentUpiLink,
      wasPartial: remainingBefore > 0 && amountPaise < remainingBefore,
    };
    return res.json(response);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Webhook error' });
  }
});

// --- Customer-safe endpoints ---
app.get('/api/order/:token', (req, res) => {
  const token = String(req.params.token || '');
  const orders = loadOrders();
  const order = orders.find(o => o.publicViewToken === token);
  if (!order) return res.status(404).json({ error: 'Not found' });
  res.setHeader('Cache-Control', 'no-store');
  return res.json({ order: sanitizeOrder(order) });
});

app.get('/order/:token', (req, res) => {
  const token = String(req.params.token || '');
  const orders = loadOrders();
  const order = orders.find(o => o.publicViewToken === token);
  if (!order) return res.status(404).send('<h1>Not found</h1>');
  const s = sanitizeOrder(order);
  const fmtRs = n => `₹${(Number(n||0)/100).toFixed(2)}`;
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).send(`<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Order Confirmation · Solo Wardrobe</title>
<style>
  body{margin:0;font-family:system-ui,Segoe UI,Roboto,Inter,Arial,sans-serif;background:#0b0d12;color:#e5e7eb}
  .wrap{max-width:720px;margin:40px auto;padding:20px}
  .card{background:#121520;border:1px solid #1e2230;border-radius:14px;padding:20px}
  .muted{color:#94a3b8}
  h1{font-size:20px;margin:0 0 8px}
  .row{display:flex;flex-wrap:wrap;gap:14px}
  .pill{background:#0f121a;border:1px solid #1f273a;padding:8px 10px;border-radius:999px;font-size:12px}
  .kv{display:grid;grid-template-columns:140px 1fr;gap:8px;font-size:14px;margin:10px 0}
  a.btn{display:inline-block;margin-top:16px;padding:10px 14px;background:#6ee7b7;color:#0b0d12;border-radius:10px;text-decoration:none;font-weight:600}
</style>
</head>
<body><div class="wrap">
  <div class="card">
    <h1>Thank you! Your order is confirmed.</h1>
    <div class="muted">We’ll dispatch your product within <strong>2 days</strong>.</div>
    <div class="row" style="margin:14px 0 6px;">
      <span class="pill">Order ID: ${s.id}</span>
      <span class="pill">Status: ${s.status}</span>
      ${s.product ? `<span class="pill">${s.product.name}</span>` : ``}
    </div>
    <div class="kv"><div>Total</div><div>${fmtRs(s.totalAmountPaise)}</div></div>
    <div class="kv"><div>Paid</div><div>${fmtRs(s.paidPaise)}</div></div>
    <div class="kv"><div>Remaining</div><div>${fmtRs(s.remainingPaise)}</div></div>
    <div class="kv"><div>Created</div><div>${new Date(s.createdAt).toLocaleString()}</div></div>
    ${s.paidAt ? `<div class="kv"><div>Paid At</div><div>${new Date(s.paidAt).toLocaleString()}</div></div>` : ``}
    ${s.dispatchBy ? `<div class="kv"><div>Dispatch By</div><div>${new Date(s.dispatchBy).toLocaleString()}</div></div>` : ``}
    <a class="btn" href="/">Back to store</a>
  </div>
</div></body></html>`);
});
// --- End customer-safe endpoints ---

// Start server
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`UPI QR server listening on http://${HOST}:${PORT}`);
});

// SPA fallback to dist/index.html (after API routes)
// Keep it after app.listen definition so all APIs above remain matched first
app.get('*', (req, res, next) => {
  // Do not interfere with API/static paths
  const skip = req.path.startsWith('/qrs') || req.path.startsWith('/orders') || req.path.startsWith('/webhooks') || req.path.startsWith('/products') || req.path.startsWith('/health') || req.path.startsWith('/api/order') || req.path.startsWith('/order/');
  if (skip) return next();
  const indexFile = path.join(DIST_DIR, 'index.html');
  if (fs.existsSync(indexFile)) return res.sendFile(indexFile);
  return next();
});
