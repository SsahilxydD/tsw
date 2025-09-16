/* server.js – user auth (signup/signin), admin seeding, sessions; minimally invasive */
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
const bcrypt = require('bcryptjs');

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
      "style-src": ["'self'", "'unsafe-inline'"], // login page uses small inline CSS
      "script-src": ["'self'"]
    }
  }
}));
app.use(express.json({ limit: '256kb' }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

/* ======================= Admin Session (existing) ======================= */
const ADMIN_USER = process.env.ADMIN_USER || 'thesolowardrobe@gmail.com';
const ADMIN_PASS = process.env.ADMIN_PASS || 'Thesolowardrobe@14333';
const ENFORCE_HTTPS = String(process.env.ENFORCE_HTTPS || 'false').toLowerCase() === 'true';
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'change-me-super-secret-and-long';
const ADMIN_SESSION_TTL_HOURS = Number(process.env.ADMIN_SESSION_TTL_HOURS || 12);

if (ENFORCE_HTTPS) {
  app.set('trust proxy', true);
  app.use((req, res, next) => {
    const proto = req.headers['x-forwarded-proto'] || req.protocol;
    if (proto !== 'https') return res.status(403).send('HTTPS required');
    next();
  });
}
const safeEqual = (a, b) => {
  try {
    const ab = Buffer.from(String(a));
    const bb = Buffer.from(String(b));
    if (ab.length !== bb.length) return false;
    return crypto.timingSafeEqual(ab, bb);
  } catch { return false; }
};
function issueAdminSession(res, username) {
  const expSec = Math.floor(Date.now() / 1000) + ADMIN_SESSION_TTL_HOURS * 3600;
  const token = jwt.sign({ sub: String(username), exp: expSec }, ADMIN_JWT_SECRET, { algorithm: 'HS256' });
  res.cookie('admin_session', token, {
    httpOnly: true,
    secure: ENFORCE_HTTPS,
    sameSite: 'strict',
    maxAge: ADMIN_SESSION_TTL_HOURS * 3600 * 1000,
    path: '/'
  });
}
function clearAdminSession(res) {
  res.cookie('admin_session', '', { httpOnly: true, secure: ENFORCE_HTTPS, sameSite: 'strict', expires: new Date(0), path: '/' });
}
function verifyAdminSession(req) {
  const raw = req.cookies && req.cookies.admin_session;
  if (!raw) return null;
  try { const p = jwt.verify(raw, ADMIN_JWT_SECRET, { algorithms: ['HS256'] }); return p && p.sub ? String(p.sub) : null; }
  catch { return null; }
}

/* ======================= User Auth (new) ======================= */
const USER_JWT_SECRET = process.env.USER_JWT_SECRET || 'replace-this-with-very-long-random';
const USER_SESSION_TTL_HOURS = Number(process.env.USER_SESSION_TTL_HOURS || 72);

const LOGIN_WINDOW_MS = 10 * 60 * 1000; // 10 min window
const MAX_ATTEMPTS = 6;
const LOCK_MS = 30 * 60 * 1000; // 30 min
const attemptsByKey = new Map();
const now = () => Date.now();
const k = (ip, email) => `${ip}|${(email || '').toLowerCase()}`;
const isLocked = (ip, email) => {
  const rec = attemptsByKey.get(k(ip, email));
  return rec && rec.lockUntil && rec.lockUntil > now();
};
const incAttempt = (ip, email) => {
  const key = k(ip, email);
  const t = now();
  const rec = attemptsByKey.get(key) || { count: 0, firstAt: t, lockUntil: 0 };
  if (t - rec.firstAt > LOGIN_WINDOW_MS) { rec.count = 0; rec.firstAt = t; rec.lockUntil = 0; }
  rec.count++;
  if (rec.count >= MAX_ATTEMPTS) rec.lockUntil = t + LOCK_MS;
  attemptsByKey.set(key, rec);
  return rec;
};
const clearAttempts = (ip, email) => attemptsByKey.delete(k(ip, email));
const newCsrf = () => crypto.randomBytes(32).toString('hex');

const DATA_DIR = path.join(process.cwd(), 'data');
const PUBLIC_DIR = path.join(process.cwd(), 'public');
const DIST_DIR = path.join(process.cwd(), 'dist');
const QRS_DIR = path.join(PUBLIC_DIR, 'qrs');
ensureDir(DATA_DIR); ensureDir(QRS_DIR);

const db = new FSDB(DATA_DIR);
function loadUsers() { return db.read('users', []); }
function saveUsers(users) { db.write('users', users); }
function normEmail(e) { return String(e || '').trim().toLowerCase(); }
function findUserByEmail(email) {
  const users = loadUsers();
  const ne = normEmail(email);
  return users.find(u => normEmail(u.email) === ne) || null;
}
function issueUserSession(res, user) {
  const expSec = Math.floor(Date.now() / 1000) + USER_SESSION_TTL_HOURS * 3600;
  const token = jwt.sign({ sub: String(user.id), email: normEmail(user.email), admin: !!user.isAdmin, exp: expSec }, USER_JWT_SECRET, { algorithm: 'HS256' });
  res.cookie('user_session', token, {
    httpOnly: true,
    secure: ENFORCE_HTTPS,
    sameSite: 'strict',
    maxAge: USER_SESSION_TTL_HOURS * 3600 * 1000,
    path: '/'
  });
  // If admin, also grant admin session for /admin
  if (user.isAdmin) issueAdminSession(res, user.email);
}
function clearUserSession(res) {
  res.cookie('user_session', '', { httpOnly: true, secure: ENFORCE_HTTPS, sameSite: 'strict', expires: new Date(0), path: '/' });
}
function verifyUserSession(req) {
  const raw = req.cookies && req.cookies.user_session;
  if (!raw) return null;
  try { const p = jwt.verify(raw, USER_JWT_SECRET, { algorithms: ['HS256'] }); return p || null; }
  catch { return null; }
}

/* ---- Seed admin user on boot (idempotent) ---- */
(function ensureAdminUser() {
  const email = normEmail(process.env.ADMIN_DEFAULT_EMAIL || ADMIN_USER);
  const pass = String(process.env.ADMIN_DEFAULT_PASSWORD || ADMIN_PASS);
  let users = loadUsers();
  const existing = users.find(u => normEmail(u.email) === email);
  if (existing) return; // don't overwrite
  const salt = bcrypt.genSaltSync(12);
  const hash = bcrypt.hashSync(pass, salt);
  const user = {
    id: 'USR-' + crypto.randomUUID(),
    email,
    name: 'Admin',
    isAdmin: true,
    passwordHash: hash,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastLoginAt: null
  };
  users.push(user);
  saveUsers(users);
  console.log(`✅ Seeded admin user: ${email}`);
})();

/* ---- SPA-friendly auth endpoints ---- */
app.get('/api/auth/csrf', (req, res) => {
  const csrf = newCsrf();
  res.cookie('csrf_token', csrf, { httpOnly: true, secure: ENFORCE_HTTPS, sameSite: 'strict', path: '/' });
  res.setHeader('Cache-Control', 'no-store');
  res.json({ csrf });
});

const signupLimiter = rateLimit({ windowMs: 30 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });
const loginLimiter  = rateLimit({ windowMs: 10 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });

app.post(['/api/auth/signup','/signup'], signupLimiter, async (req, res) => {
  try {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'unknown';
    const { email, password, name, csrf } = req.body || {};
    const csrfCookie = String(req.cookies?.csrf_token || '');
    if (!csrf || !safeEqual(csrf, csrfCookie)) return res.status(400).json({ ok:false, error:'csrf' });

    const em = normEmail(email);
    if (!em || !/.+@.+\..+/.test(em)) return res.status(400).json({ ok:false, error:'email' });
    if (String(password || '').length < 8) return res.status(400).json({ ok:false, error:'password' });

    if (findUserByEmail(em)) return res.status(409).json({ ok:false, error:'exists' });

    const salt = bcrypt.genSaltSync(12);
    const hash = bcrypt.hashSync(String(password), salt);
    const users = loadUsers();
    const user = {
      id: 'USR-' + crypto.randomUUID(),
      email: em,
      name: String(name || '').trim() || em.split('@')[0],
      isAdmin: false,
      passwordHash: hash,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastLoginAt: null
    };
    users.push(user);
    saveUsers(users);
    issueUserSession(res, user);
    res.json({ ok:true, user:{ id:user.id, email:user.email, name:user.name, isAdmin:user.isAdmin } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, error:'server' });
  }
});

app.post(['/api/auth/login','/login'], loginLimiter, async (req, res) => {
  try {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'unknown';
    const { email, password, csrf } = req.body || {};
    if (isLocked(ip, email)) return res.status(429).json({ ok:false, error:'locked' });

    const csrfCookie = String(req.cookies?.csrf_token || '');
    if (!csrf || !safeEqual(csrf, csrfCookie)) { incAttempt(ip, email); return res.status(400).json({ ok:false, error:'csrf' }); }

    const user = findUserByEmail(email);
    if (!user) { const rec = incAttempt(ip, email); return res.status(401).json({ ok:false, error:'invalid' }); }

    const ok = await bcrypt.compare(String(password || ''), user.passwordHash);
    if (!ok) {
      const rec = incAttempt(ip, email);
      if (rec.lockUntil && rec.lockUntil > now()) return res.status(429).json({ ok:false, error:'locked' });
      return res.status(401).json({ ok:false, error:'invalid' });
    }

    clearAttempts(ip, email);
    user.lastLoginAt = new Date().toISOString();
    const users = loadUsers();
    const idx = users.findIndex(u => u.id === user.id);
    if (idx >= 0) { users[idx] = user; saveUsers(users); }

    issueUserSession(res, user);
    res.json({ ok:true, user:{ id:user.id, email:user.email, name:user.name, isAdmin:user.isAdmin } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, error:'server' });
  }
});

app.post(['/api/auth/logout','/logout'], (req, res) => {
  clearUserSession(res);
  clearAdminSession(res); // also clear admin if present
  res.json({ ok:true });
});

app.get('/api/auth/me', (req, res) => {
  const sess = verifyUserSession(req);
  if (!sess) return res.status(401).json({ ok:false });
  res.json({ ok:true, user: { email: sess.email, isAdmin: !!sess.admin } });
});

/* ======================= EXISTING APP LOGIC (unchanged) ======================= */
const ORDER_TTL_MIN = Number(process.env.ORDER_TTL_MIN || 5);
function nowIso() { return new Date().toISOString(); }
function addMinutes(iso, minutes) { const d = iso ? new Date(iso) : new Date(); return new Date(d.getTime() + minutes*60*1000).toISOString(); }
function loadOrders() { return db.read('orders', []); }
function saveOrders(orders) { db.write('orders', orders); }
function loadPayments() { return db.read('payments', []); }
function savePayments(payments) { db.write('payments', payments); }
function ensureFreshStatus(order) {
  if (!order) return false;
  const now = new Date(); const exp = order.expiresAt ? new Date(order.expiresAt) : null;
  if (order.status !== 'PAID' && exp && now > exp && order.status !== 'EXPIRED') {
    order.status = 'EXPIRED'; order.currentUpiLink = null; order.currentQr = null; order.updatedAt = nowIso(); return true;
  }
  return false;
}
function genOrderId() { const ts = new Date().toISOString().replace(/[-:.TZ]/g,'').slice(0,14); const rand = Math.random().toString(36).slice(2,7).toUpperCase(); return `ORD-${ts}-${rand}`; }
async function makeQr(filePath, text) { await QRCode.toFile(filePath, text, { type:'png', width:512, margin:1 }); }

/* ---- Static ---- */
app.use('/qrs', express.static(QRS_DIR, { fallthrough:false }));
app.use(express.static(DIST_DIR));

/* ---- Health ---- */
app.get('/health', (_req, res) => res.json({ ok:true }));

/* ---- Orders (keep your existing logic; admin-only guarded via admin session) ---- */
function requireAdminAPI(req, res, next) {
  // allow if either admin_session is valid or user_session is admin
  const a = verifyAdminSession(req);
  if (a) { res.setHeader('Cache-Control','no-store'); return next(); }
  const u = verifyUserSession(req);
  if (u && u.admin) { res.setHeader('Cache-Control','no-store'); return next(); }
  return res.status(401).json({ error:'Auth required' });
}

app.post('/orders', async (req, res) => {
  try {
    const { amount, amountPaise: amountPaiseIn, currency='INR', meta={}, productId } = req.body || {};
    const upiId = process.env.UPI_ID;
    const upiName = process.env.UPI_NAME || 'Merchant';
    if (!upiId) return res.status(400).json({ error:'Missing env UPI_ID' });

    let amountPaise, product=null;
    if (productId) {
      product = getProduct(productId);
      if (!product) return res.status(400).json({ error:'Invalid productId' });
      amountPaise = Math.round((product.amountPaise != null ? product.amountPaise : product.amount*100));
    } else {
      const allowRaw = String(process.env.ALLOW_RAW_AMOUNT || 'true').toLowerCase() === 'true';
      if (!allowRaw) return res.status(400).json({ error:'Raw amount orders disabled. Use productId.' });
      if (typeof amountPaiseIn === 'number') amountPaise = Math.round(amountPaiseIn);
      else if (typeof amount === 'number') amountPaise = Math.round(amount*100);
      else return res.status(400).json({ error:'Provide amount (rupees) or amountPaise or productId' });
    }

    if (currency !== 'INR') return res.status(400).json({ error:'Only INR supported' });

    const orderId = genOrderId();
    const upiLink = buildUpiLink({ pa: upiId, pn: upiName, amountPaise, orderId });
    const qrFile = path.join(QRS_DIR, `${orderId}-${amountPaise}.png`);
    await makeQr(qrFile, upiLink);

    const orders = loadOrders();
    const now = nowIso();
    const expiresAt = addMinutes(now, ORDER_TTL_MIN);
    const order = {
      id: orderId, totalAmountPaise: amountPaise, paidPaise: 0, remainingPaise: amountPaise, currency,
      upiLink, qrPath: `/qrs/${orderId}-${amountPaise}.png`,
      currentUpiLink: upiLink, currentQr: `/qrs/${orderId}-${amountPaise}.png`,
      qrHistory: [{ amountPaise, upiLink, qr:`/qrs/${orderId}-${amountPaise}.png`, createdAt: now }],
      status:'PENDING', createdAt:now, updatedAt:now, expiresAt, paidAt:null,
      meta: { ...meta, productId: product ? product.id : meta.productId },
      product: product ? { id:product.id, name:product.name, amountPaise } : null,
    };
    orders.push(order); saveOrders(orders);
    const expiresInMs = Math.max(0, new Date(expiresAt).getTime() - new Date(now).getTime());
    res.json({ orderId, upiLink: order.currentUpiLink, qr: order.currentQr, status: order.status, remainingPaise: order.remainingPaise, product: order.product, expiresAt: order.expiresAt, serverNow: nowIso(), expiresInMs });
  } catch (e) { console.error(e); res.status(500).json({ error:'Failed to create order' }); }
});

app.get('/orders', requireAdminAPI, (req, res) => {
  const orders = loadOrders();
  let changed = false; for (const o of orders) if (ensureFreshStatus(o)) changed = true; if (changed) saveOrders(orders);
  const limit = Math.max(1, Math.min(1000, Number(req.query.limit) || 200));
  const out = orders.slice().sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, limit);
  res.json({ serverNow: nowIso(), orders: out });
});

app.get('/orders/:id', requireAdminAPI, (req, res) => {
  const orders = loadOrders();
  const order = orders.find((o)=>o.id===req.params.id);
  if (!order) return res.status(404).json({ error:'Not found' });
  if (ensureFreshStatus(order)) saveOrders(orders);
  res.json({ ...order, serverNow: nowIso() });
});

app.post('/orders/:id/expire', requireAdminAPI, (req, res) => {
  const orders = loadOrders(); const order = orders.find(o=>o.id===req.params.id);
  if (!order) return res.status(404).json({ error:'Not found' });
  if (order.status!=='PAID'){ order.status='EXPIRED'; order.currentQr=null; order.currentUpiLink=null; order.updatedAt=nowIso(); }
  saveOrders(orders); res.json({ ok:true, order });
});

app.post('/orders/:id/mark-paid', requireAdminAPI, (req, res) => {
  const orders = loadOrders(); const order = orders.find(o=>o.id===req.params.id);
  if (!order) return res.status(404).json({ error:'Not found' });
  order.status='PAID'; order.paidPaise=order.totalAmountPaise; order.remainingPaise=0;
  order.currentQr=null; order.currentUpiLink=null; order.paidAt=nowIso(); order.updatedAt=order.paidAt;
  saveOrders(orders); res.json({ ok:true, order });
});

/* ---- Your webhook & utility endpoints (unchanged – keep your existing implementation) ---- */
app.post('/webhooks/sms', rateLimit({ windowMs: 60_000, max: 30, standardHeaders: true, legacyHeaders: false }), async (req, res) => {
  // keep your actual implementation here
  res.json({ ok:true });
});

/* ---- SPA fallback (unchanged) ---- */
app.get('*', (req, res, next) => {
  const skip = req.path.startsWith('/qrs')
    || req.path.startsWith('/orders')
    || req.path.startsWith('/webhooks')
    || req.path.startsWith('/products')
    || req.path.startsWith('/health')
    || req.path.startsWith('/api/auth');
  if (skip) return next();
  const indexFile = path.join(DIST_DIR, 'index.html');
  if (fs.existsSync(indexFile)) return res.sendFile(indexFile);
  return next();
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => console.log(`Server listening on http://${HOST}:${PORT}`));
