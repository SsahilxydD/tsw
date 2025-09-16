const path = require('path');
const fs = require('fs');
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const QRCode = require('qrcode');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const { FSDB, ensureDir } = require('./utils/fsdb');
const { buildUpiLink } = require('./upi');
const { extractAmountPaise, extractNote, containsUpiId, extractUtr } = require('./parsers/sms');
const { sha256 } = require('./utils/hash');
const { getProduct } = require('./products');

const app = express();
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],
      "img-src": ["'self'", "data:"],
      "style-src": ["'self'", "'unsafe-inline'"], // inline styles on login page
      "script-src": ["'self'"]
    }
  }
}));
app.use(express.json({ limit: '256kb' }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

/* ======================= Admin Auth System ======================== */
const ADMIN_USER = process.env.ADMIN_USER || 'thesolowardrobe@gmail.com';
const ADMIN_PASS = process.env.ADMIN_PASS || 'Thesolowardrobe@14333';
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'change-me-super-secret-and-long';
const ADMIN_SESSION_TTL_HOURS = Number(process.env.ADMIN_SESSION_TTL_HOURS || 12);
const ENFORCE_HTTPS = String(process.env.ENFORCE_HTTPS || 'false').toLowerCase() === 'true';

if (ENFORCE_HTTPS) {
  app.set('trust proxy', true);
  app.use((req, res, next) => {
    const proto = req.headers['x-forwarded-proto'] || req.protocol;
    if (proto !== 'https') return res.status(403).send('HTTPS required');
    next();
  });
}

// In-memory brute-force guard (per IP + per user). Restart clears state.
const LOGIN_WINDOW_MS = 10 * 60 * 1000; // 10 min window
const MAX_ATTEMPTS = 5;                 // 5 attempts per window
const LOCK_MS = 30 * 60 * 1000;         // 30 min lockout
const attemptsByKey = new Map();        // key: ip|user -> {count, firstAt, lockUntil}

function key(ip, user) { return `${ip}|${(user || '').toLowerCase()}`; }
function now() { return Date.now(); }
function isLocked(ip, user) {
  const k = key(ip, user);
  const rec = attemptsByKey.get(k);
  return rec && rec.lockUntil && rec.lockUntil > now();
}
function incAttempt(ip, user) {
  const k = key(ip, user);
  const t = now();
  const rec = attemptsByKey.get(k) || { count: 0, firstAt: t, lockUntil: 0 };
  // reset window if expired
  if (t - rec.firstAt > LOGIN_WINDOW_MS) {
    rec.count = 0; rec.firstAt = t; rec.lockUntil = 0;
  }
  rec.count++;
  if (rec.count >= MAX_ATTEMPTS) {
    rec.lockUntil = t + LOCK_MS;
  }
  attemptsByKey.set(k, rec);
  return rec;
}
function clearAttempts(ip, user) {
  attemptsByKey.delete(key(ip, user));
}
function safeEqual(a, b) {
  try {
    const ab = Buffer.from(String(a));
    const bb = Buffer.from(String(b));
    if (ab.length !== bb.length) return false;
    return crypto.timingSafeEqual(ab, bb);
  } catch { return false; }
}

// CSRF (double-submit cookie): set cookie on GET /admin/login and expect same value in hidden field on POST
function newCsrf() { return crypto.randomBytes(32).toString('hex'); }

// Tight rate limit on login endpoint
const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false
});

// Build minimal but elegant login HTML (server-rendered so we can embed CSRF)
function renderLoginPage(csrfToken, message) {
  const msg = message ? `<div class="msg">${message}</div>` : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Solo Admin · Sign in</title>
<style>
  :root { --bg:#0b0d12; --card:#121520; --muted:#98a2b3; --text:#e5e7eb; --accent:#6ee7b7; --danger:#fda4af; }
  *{box-sizing:border-box} body{margin:0; font-family:Inter,system-ui,Segoe UI,Roboto,Arial,sans-serif; background:linear-gradient(180deg,#0b0d12,#0b0d12 40%,#10131b); color:var(--text);
    display:grid; place-items:center; min-height:100vh; }
  .card{width:100%; max-width:380px; background:var(--card); border:1px solid #1e2230; padding:26px; border-radius:16px; box-shadow:0 10px 30px rgba(0,0,0,.35)}
  h1{margin:0 0 8px; font-size:20px}
  p.sub{margin:0 0 18px; color:var(--muted); font-size:13px}
  label{display:block; font-size:13px; color:#cbd5e1; margin:12px 0 6px}
  input{width:100%; padding:12px 12px; border-radius:10px; border:1px solid #2a3042; background:#0f121a; color:var(--text); outline:none}
  input:focus{border-color:#334155; box-shadow:0 0 0 3px rgba(102,126,234,.18)}
  button{width:100%; margin-top:16px; padding:12px 14px; background:var(--accent); color:#0b0d12; border:none; border-radius:10px; font-weight:600; cursor:pointer}
  button:active{transform:translateY(1px)}
  .msg{margin:8px 0 0; color:var(--danger); font-size:12px}
  .foot{margin-top:16px; text-align:center; color:var(--muted); font-size:12px}
</style>
</head>
<body>
  <form class="card" method="POST" action="/admin/login" autocomplete="off">
    <h1>Sign in to Admin</h1>
    <p class="sub">Access is restricted. All attempts are logged.</p>
    <input type="hidden" name="csrf" value="${csrfToken}">
    <label>Email</label>
    <input name="username" type="email" required placeholder="you@example.com" autofocus>
    <label>Password</label>
    <input name="password" type="password" required placeholder="••••••••">
    <button type="submit">Sign in</button>
    ${msg}
    <div class="foot">Protected area · Solo Wardrobe</div>
  </form>
</body>
</html>`;
}

// Session helpers
function issueSession(res, username) {
  const expSec = Math.floor(Date.now() / 1000) + ADMIN_SESSION_TTL_HOURS * 3600;
  const token = jwt.sign({ sub: String(username), exp: expSec }, ADMIN_JWT_SECRET, { algorithm: 'HS256' });
  res.cookie('admin_session', token, {
    httpOnly: true,
    secure: ENFORCE_HTTPS, // set true when behind TLS proxy
    sameSite: 'strict',
    maxAge: ADMIN_SESSION_TTL_HOURS * 3600 * 1000,
    path: '/'
  });
}
function clearSession(res) {
  res.cookie('admin_session', '', { httpOnly: true, secure: ENFORCE_HTTPS, sameSite: 'strict', expires: new Date(0), path: '/' });
}
function verifySession(req) {
  const raw = req.cookies && req.cookies.admin_session;
  if (!raw) return null;
  try {
    const payload = jwt.verify(raw, ADMIN_JWT_SECRET, { algorithms: ['HS256'] });
    return payload && payload.sub ? String(payload.sub) : null;
  } catch { return null; }
}

// UI guard: any path segment 'admin' (except /admin/login, /admin/logout) requires a valid session
function containsAdminSegment(p) {
  const segs = String(p || '').split('/').filter(Boolean);
  return segs.includes('admin');
}
function isLoginPath(p) {
  return p === '/admin/login' || p === '/admin/logout';
}

app.get('/admin/login', (req, res) => {
  const csrf = newCsrf();
  res.cookie('admin_csrf', csrf, {
    httpOnly: true, // not readable by JS
    secure: ENFORCE_HTTPS,
    sameSite: 'strict',
    path: '/admin'
  });
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).send(renderLoginPage(csrf));
});

app.post('/admin/login', loginLimiter, (req, res) => {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'unknown';
  const username = String(req.body?.username || '');
  const password = String(req.body?.password || '');
  const csrfBody = String(req.body?.csrf || '');
  const csrfCookie = String(req.cookies?.admin_csrf || '');

  if (isLocked(ip, username)) {
    return res.status(429).send(renderLoginPage(newCsrf(), 'Too many attempts. Try again later.'));
  }

  // CSRF double-submit check (timing-safe)
  if (!csrfBody || !safeEqual(csrfBody, csrfCookie)) {
    incAttempt(ip, username);
    return res.status(400).send(renderLoginPage(newCsrf(), 'Invalid request. Please try again.'));
  }

  const userOk = safeEqual(username, ADMIN_USER);
  const passOk = safeEqual(password, ADMIN_PASS);

  if (userOk && passOk) {
    clearAttempts(ip, username);
    issueSession(res, username);
    res.setHeader('Cache-Control', 'no-store');
    return res.redirect('/admin');
  }

  const rec = incAttempt(ip, username);
  const left = Math.max(0, MAX_ATTEMPTS - rec.count);
  const msg = rec.lockUntil && rec.lockUntil > now()
    ? 'Account temporarily locked due to failed attempts.'
    : `Invalid credentials. ${left} attempt(s) remaining.`;
  return res.status(401).send(renderLoginPage(newCsrf(), msg));
});

app.get('/admin/logout', (req, res) => {
  clearSession(res);
  res.setHeader('Cache-Control', 'no-store');
  return res.redirect('/admin/login');
});

// Route-level guard registered BEFORE static/SPA
app.use((req, res, next) => {
  if (!containsAdminSegment(req.path) || isLoginPath(req.path)) return next();
  const sub = verifySession(req);
  if (sub) {
    res.setHeader('Cache-Control', 'no-store');
    req.adminUser = sub;
    return next();
  }
  return res.redirect('/admin/login');
});

// API guard for sensitive endpoints (/orders*)
function requireAdminAPI(req, res, next) {
  const sub = verifySession(req);
  if (!sub) return res.status(401).json({ error: 'Auth required' });
  req.adminUser = sub;
  res.setHeader('Cache-Control', 'no-store');
  next();
}
/* ===================== End Admin Auth System ===================== */

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
  const nowD = new Date();
  const exp = order.expiresAt ? new Date(order.expiresAt) : null;
  if (order.status !== 'PAID' && exp && nowD > exp && order.status !== 'EXPIRED') {
    order.status = 'EXPIRED';
    order.currentUpiLink = null;
    order.currentQr = null;
    order.updatedAt = nowIso();
    return true;
  }
  return false;
}

function loadOrders() { return db.read('orders', []); }
function saveOrders(orders) { db.write('orders', orders); }
function loadPayments() { return db.read('payments', []); }
function savePayments(payments) { db.write('payments', payments); }

function genOrderId() {
  const ts = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `ORD-${ts}-${rand}`;
}

async function makeQr(filePath, text) {
  await QRCode.toFile(filePath, text, { type: 'png', width: 512, margin: 1 });
}

// Static hosting for QR images and built SPA assets
app.use('/qrs', express.static(QRS_DIR, { fallthrough: false }));
app.use(express.static(DIST_DIR));

// Health
app.get('/health', (_req, res) => res.json({ ok: true }));

function assertPositiveInteger(name, v) {
  if (!Number.isFinite(v) || v <= 0) throw new Error(`${name} must be > 0`);
}

// ====== Protected Admin APIs ======
app.get('/orders', requireAdminAPI, (req, res) => {
  const orders = loadOrders();
  let changed = false;
  for (const o of orders) if (ensureFreshStatus(o)) changed = true;
  if (changed) saveOrders(orders);
  const limit = Math.max(1, Math.min(1000, Number(req.query.limit) || 200));
  const out = orders.slice().sort((a,b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, limit);
  res.json({ serverNow: nowIso(), orders: out });
});

app.get('/orders/:id', requireAdminAPI, async (req, res) => {
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
              const n = nowIso();
              order.qrHistory.push({ amountPaise: order.remainingPaise, upiLink: result.nextLink, qr: order.currentQr, createdAt: n });
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

app.post('/orders/:id/expire', requireAdminAPI, (req, res) => {
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

app.post('/orders/:id/mark-paid', requireAdminAPI, (req, res) => {
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

app.post('/orders/:id/regenerate', requireAdminAPI, async (req, res) => {
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
    const n = nowIso();
    order.expiresAt = addMinutes(n, ORDER_TTL_MIN);
    order.updatedAt = n;
    order.status = order.paidPaise > 0 ? 'PARTIAL' : 'PENDING';
    order.qrHistory.push({ amountPaise, upiLink: nextLink, qr: order.currentQr, createdAt: n });
    saveOrders(orders);
    res.json({ ok: true, order, serverNow: nowIso() });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to regenerate' });
  }
});
// ====== End Protected Admin APIs ======

app.post('/webhooks/sms', rateLimit({ windowMs: 60_000, max: 30, standardHeaders: true, legacyHeaders: false }), async (req, res) => {
  try {
    const secret = process.env.WEBHOOK_SECRET;
    if (secret) {
      const provided = req.headers['x-webhook-secret'] || req.query.secret || (req.body && req.body.secret);
      if (String(provided) !== String(secret)) return res.status(401).json({ error: 'Unauthorized' });
    }

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
    if (!matchedOrder && utr) {
      const norm = (s) => String(s || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      matchedOrder = orders.find((o) => Array.isArray(o.pendingVerifications) && o.pendingVerifications.some((pv) => norm(pv.utr) === norm(utr)));
    }

    const upiOk = containsUpiId(text, upiId);
    if (strictUpi && !upiOk) {
      payments.push(payment); savePayments(payments);
      return res.json({ ok: true, matched: false, reason: 'UPI_ID not found in SMS' });
    }

    if (!matchedOrder || amountPaise == null) {
      payments.push(payment); savePayments(payments);
      return res.json({ ok: true, matched: false });
    }

    if (duplicate) {
      if (matchedOrder) payment.orderId = matchedOrder.id;
      payments.push(payment); savePayments(payments);
      return res.json({ ok: true, matched: false, duplicate: true });
    }

    payment.orderId = matchedOrder.id;

    const remainingBefore = matchedOrder.remainingPaise ?? matchedOrder.totalAmountPaise - (matchedOrder.paidPaise || 0);
    if (amountPaise <= 0) {
      payments.push(payment); savePayments(payments);
      return res.json({ ok: true, matched: false, reason: 'Non-positive amount' });
    }

    const result = updateOrderForPartial(matchedOrder, amountPaise, upiId, upiName);
    payment.matched = true;

    if (matchedOrder.status !== 'PAID' && result) {
      await makeQr(result.qrFile, result.nextLink);
      matchedOrder.currentUpiLink = result.nextLink;
      matchedOrder.currentQr = `/qrs/${path.basename(result.qrFile)}`;
      const n = new Date().toISOString();
      matchedOrder.qrHistory.push({ amountPaise: matchedOrder.remainingPaise, upiLink: result.nextLink, qr: matchedOrder.currentQr, createdAt: n });
      matchedOrder.upiLink = matchedOrder.currentUpiLink;
      matchedOrder.qrPath = matchedOrder.currentQr;
    }

    const orders2 = loadOrders(); // ensure persistence consistency
    saveOrders(orders);
    payments.push(payment); savePayments(payments);

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

function updateOrderForPartial(order, paidAmountPaise, upiId, upiName) {
  const n = new Date().toISOString();
  order.paidPaise = (order.paidPaise || 0) + paidAmountPaise;
  if (order.paidPaise < 0) order.paidPaise = 0;
  order.remainingPaise = Math.max(0, order.totalAmountPaise - order.paidPaise);
  if (order.remainingPaise === 0) {
    order.status = 'PAID';
    order.paidAt = n;
    order.currentUpiLink = null;
    order.currentQr = null;
    return;
  }
  order.status = order.paidPaise > 0 ? 'PARTIAL' : 'PENDING';
  const nextLink = buildUpiLink({ pa: upiId, pn: upiName, amountPaise: order.remainingPaise, orderId: order.id });
  const qrFile = path.join(QRS_DIR, `${order.id}-${order.remainingPaise}.png`);
  return { nextLink, qrFile };
}

// Start server
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`UPI QR server listening on http://${HOST}:${PORT}`);
});

// SPA fallback to dist/index.html (after API routes)
// Keep it after app.listen definition so all APIs above remain matched first
app.get('*', (req, res, next) => {
  const skip = req.path.startsWith('/qrs')
    || req.path.startsWith('/orders')
    || req.path.startsWith('/webhooks')
    || req.path.startsWith('/products')
    || req.path.startsWith('/health')
    || req.path === '/admin/login'
    || req.path === '/admin/logout';
  if (skip) return next();
  const DIST_DIR = path.join(process.cwd(), 'dist');
  const indexFile = path.join(DIST_DIR, 'index.html');
  if (fs.existsSync(indexFile)) return res.sendFile(indexFile);
  return next();
});
