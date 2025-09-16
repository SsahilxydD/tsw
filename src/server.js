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

/* ---------- ADDED: Basic Auth for /admin (minimal & isolated) ---------- */
const ADMIN_USER = process.env.ADMIN_USER || 'thesolowardrobe@gmail.com';
const ADMIN_PASS = process.env.ADMIN_PASS || 'Thesolowardrobe@14333';

function adminUnauthorized(res) {
  res.set('WWW-Authenticate', 'Basic realm="Solo Admin"');
  return res.status(401).send('Auth required');
}

function adminBasicAuth(req, res, next) {
  const hdr = req.headers['authorization'];
  if (!hdr || !hdr.startsWith('Basic ')) return adminUnauthorized(res);
  try {
    const decoded = Buffer.from(hdr.split(' ')[1], 'base64').toString('utf8');
    const idx = decoded.indexOf(':');
    const user = idx >= 0 ? decoded.slice(0, idx) : '';
    const pass = idx >= 0 ? decoded.slice(idx + 1) : '';
    if (user === ADMIN_USER && pass === ADMIN_PASS) return next();
  } catch (_) { /* ignore */ }
  return adminUnauthorized(res);
}

// Protect /admin and /admin/* BEFORE static middleware to ensure gating
app.get(['/admin', '/admin/*'], adminBasicAuth, (req, res) => {
  const indexFile = path.join(DIST_DIR, 'index.html');
  if (fs.existsSync(indexFile)) return res.sendFile(indexFile);
  // If you ship a physical /dist/admin/index.html later, this will still serve SPA index
  return res.status(404).send('Admin not found');
});
/* ---------------------------------------------------------------------- */

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
    };
    orders.push(order);
    saveOrders(orders);

    const expiresInMs = Math.max(0, new Date(expiresAt).getTime() - new Date(now).getTime());
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
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// List orders (basic admin)
app.get('/orders', (req, res) => {
  const orders = loadOrders();
  let changed = false;
  for (const o of orders) {
    if (ensureFreshStatus(o)) changed = true;
  }
  if (changed) saveOrders(orders);
  const limit = Math.max(1, Math.min(1000, Number(req.query.limit) || 200));
  const out = orders
    .slice()
    .sort((a,b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .slice(0, limit);
  res.json({ serverNow: nowIso(), orders: out });
});

// Get single order
app.get('/orders/:id', async (req, res) => {
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

// Admin-lite actions (no auth yet)
app.post('/orders/:id/expire', (req, res) => {
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

app.post('/orders/:id/mark-paid', (req, res) => {
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

app.post('/orders/:id/regenerate', async (req, res) => {
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
  const skip = req.path.startsWith('/qrs') || req.path.startsWith('/orders') || req.path.startsWith('/webhooks') || req.path.startsWith('/products') || req.path.startsWith('/health');
  if (skip) return next();
  const indexFile = path.join(DIST_DIR, 'index.html');
  if (fs.existsSync(indexFile)) return res.sendFile(indexFile);
  return next();
});
