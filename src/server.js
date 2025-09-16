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
// Behind Nginx: trust the proxy so req.ip is the real client and
// express-rate-limit doesn't complain when X-Forwarded-* is present.
// Using `true` trusts all hops which is safe for a single Nginx in front.
app.set('trust proxy', true);
try {
  const tp = app.get('trust proxy');
  console.log('[server] trust proxy enabled:', tp !== false);
} catch {}
const crypto = require('crypto');

const ADMIN_USER = process.env.ADMIN_USER || 'thesolowardrobe@gmail.com';
const ADMIN_PASS = process.env.ADMIN_PASS || 'Thesolowardrobe@14333';
const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || process.env.SESSION_SECRET || 'solo-wardrobe-dev-secret';
const ADMIN_SESSION_COOKIE = 'solo_admin_session';
const ADMIN_SESSION_TTL_MS = Math.max(5 * 60 * 1000, Number(process.env.ADMIN_SESSION_TTL_MS || 12 * 60 * 60 * 1000));
const isProduction = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
const SUPPORT_WHATSAPP = process.env.SUPPORT_WHATSAPP || '+919933778870';
if (!process.env.ADMIN_SESSION_SECRET && !process.env.SESSION_SECRET) {
  console.warn('[admin] Using fallback admin session secret. Set ADMIN_SESSION_SECRET for production.');
}

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

function toBase64Url(value) {
  const buf = Buffer.isBuffer(value) ? value : Buffer.from(String(value));
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(str) {
  const normalized = String(str || '').replace(/-/g, '+').replace(/_/g, '/');
  const pad = normalized.length % 4;
  const padded = normalized + (pad ? '='.repeat(4 - pad) : '');
  return Buffer.from(padded, 'base64');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function parseCookies(req) {
  const header = req.headers && req.headers.cookie;
  if (!header) return {};
  const cookies = {};
  for (const part of header.split(';')) {
    if (!part) continue;
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    if (!key) continue;
    const val = part.slice(idx + 1).trim();
    try {
      cookies[key] = decodeURIComponent(val);
    } catch {
      cookies[key] = val;
    }
  }
  return cookies;
}

function appendCookie(res, name, value, options = {}) {
  const segments = [`${name}=${encodeURIComponent(value)}`];
  const path = options.path || '/';
  if (path) segments.push(`Path=${path}`);
  if (options.maxAgeMs != null) {
    const maxAgeSec = Math.max(0, Math.floor(options.maxAgeMs / 1000));
    segments.push(`Max-Age=${maxAgeSec}`);
    const expires = options.expires instanceof Date ? options.expires : new Date(Date.now() + options.maxAgeMs);
    segments.push(`Expires=${expires.toUTCString()}`);
  } else if (options.expires instanceof Date) {
    segments.push(`Expires=${options.expires.toUTCString()}`);
  }
  if (options.httpOnly) segments.push('HttpOnly');
  if (options.sameSite) segments.push(`SameSite=${options.sameSite}`);
  if (options.secure) segments.push('Secure');
  res.append('Set-Cookie', segments.join('; '));
}

function createSessionToken(payload) {
  const data = toBase64Url(JSON.stringify(payload));
  const sig = toBase64Url(crypto.createHmac('sha256', ADMIN_SESSION_SECRET).update(data).digest());
  return `${data}.${sig}`;
}

function verifySessionToken(token) {
  if (!token || typeof token !== 'string') return null;
  const [data, sig] = token.split('.');
  if (!data || !sig) return null;
  const expectedSig = toBase64Url(crypto.createHmac('sha256', ADMIN_SESSION_SECRET).update(data).digest());
  if (!safeEq(sig, expectedSig)) return null;
  try {
    const payload = JSON.parse(fromBase64Url(data).toString('utf8'));
    if (!payload || typeof payload !== 'object') return null;
    if (!payload.exp || Date.now() > Number(payload.exp)) return null;
    if (!safeEq(String(payload.sub || ''), ADMIN_USER)) return null;
    return payload;
  } catch {
    return null;
  }
}

function issueAdminSession(res) {
  const now = Date.now();
  const payload = {
    sub: ADMIN_USER,
    iat: now,
    exp: now + ADMIN_SESSION_TTL_MS,
    jti: crypto.randomBytes(10).toString('hex'),
  };
  const token = createSessionToken(payload);
  appendCookie(res, ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'Strict',
    secure: isProduction,
    maxAgeMs: ADMIN_SESSION_TTL_MS,
  });
  return payload;
}

function clearAdminSession(res) {
  appendCookie(res, ADMIN_SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'Strict',
    secure: isProduction,
    maxAgeMs: 0,
    expires: new Date(0),
  });
}

function setAdminNoCache(res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
}

function getAdminSession(req) {
  const cookies = parseCookies(req);
  const token = cookies[ADMIN_SESSION_COOKIE];
  return { session: verifySessionToken(token), token };
}

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
// Grace window for pruning unpaid/abandoned orders (in minutes)
const PRUNE_GRACE_MIN = Math.max(10, Number(process.env.PRUNE_GRACE_MIN || 15));

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

// Delete long-stale unpaid orders and their QR images.
function pruneOldUnpaidOrders(orders) {
  try {
    const nowMs = Date.now();
    const cutoffMs = (ORDER_TTL_MIN + PRUNE_GRACE_MIN) * 60 * 1000;
    const keep = [];
    for (const o of orders) {
      let createdMs = 0;
      try { createdMs = new Date(o.createdAt).getTime(); } catch {}
      const isStale = o && o.status !== 'PAID' && Number.isFinite(createdMs) && (nowMs - createdMs) > cutoffMs;
      if (isStale) {
        try {
          const maybeDelete = (rel) => {
            try {
              const p = String(rel || '').startsWith('/qrs/') ? path.join(QRS_DIR, path.basename(rel)) : null;
              if (p && fs.existsSync(p)) fs.unlinkSync(p);
            } catch {}
          };
          maybeDelete(o?.currentQr);
          if (Array.isArray(o?.qrHistory)) {
            for (const h of o.qrHistory) maybeDelete(h?.qr);
          }
        } catch {}
        // drop from result -> effectively delete
      } else {
        keep.push(o);
      }
    }
    return keep;
  } catch {
    return orders;
  }
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
  const safe = (v) => {
    const out = v == null ? '' : String(v).trim();
    return out.length ? out : null;
  };
  const addr = o?.meta && typeof o.meta === 'object' ? o.meta.address : null;
  const address = addr && typeof addr === 'object'
    ? {
        name: safe(`${addr.firstName || ''} ${addr.lastName || ''}`),
        line1: safe(addr.address1),
        line2: safe(addr.address2),
        locality: safe(addr.locality || addr.landmark),
        district: safe(addr.district || addr.city),
        state: safe(addr.state),
        zip: safe(addr.zip),
        country: safe(addr.country),
        phone: safe(addr.phone),
      }
    : null;
  const customerName = safe(o?.customer?.name) || address?.name;
  const customerPhone = safe(o?.customer?.phone) || address?.phone;
  const customerEmail = safe(o?.customer?.email) || safe(addr?.email);
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
    dispatchBy,
    currentQr: o.currentQr || null,
    currentUpiLink: o.currentUpiLink || null,
    publicViewToken: o.publicViewToken || null,
    customer: {
      name: customerName,
      phone: customerPhone,
      email: customerEmail,
    },
    address,
  };
}
function requireAdminApi(req, res, next) {
  const { session, token } = getAdminSession(req);
  if (session) {
    res.locals.adminSession = session;
    setAdminNoCache(res);
    return next();
  }
  if (token) clearAdminSession(res);
  setAdminNoCache(res);
  return res.status(401).json({ error: 'Auth required' });
}
// --- END HELPERS ---

const loginLimiter = rateLimit({ windowMs: 60_000, max: 10, standardHeaders: true, legacyHeaders: false });

app.get('/admin/api/session', (req, res) => {
  const { session, token } = getAdminSession(req);
  if (!session) {
    if (token) clearAdminSession(res);
    setAdminNoCache(res);
    return res.status(401).json({ authenticated: false });
  }
  setAdminNoCache(res);
  let expiresAt = null;
  try {
    if (session.exp) expiresAt = new Date(Number(session.exp)).toISOString();
  } catch {
    expiresAt = null;
  }
  return res.json({ authenticated: true, user: { email: ADMIN_USER }, expiresAt });
});

app.post('/admin/api/login', loginLimiter, (req, res) => {
  const { email, password } = req.body || {};
  if (!safeEq(email, ADMIN_USER) || !safeEq(password, ADMIN_PASS)) {
    clearAdminSession(res);
    setAdminNoCache(res);
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  issueAdminSession(res);
  setAdminNoCache(res);
  return res.json({ ok: true });
});

app.post('/admin/api/logout', (req, res) => {
  clearAdminSession(res);
  setAdminNoCache(res);
  return res.json({ ok: true });
});

// Static hosting for QR images and built SPA assets
// Ensure QR images are never cached so regenerated codes show immediately
app.use('/qrs', express.static(QRS_DIR, {
  fallthrough: false,
  setHeaders(res) {
    res.setHeader('Cache-Control', 'no-store');
  }
}));
app.use(express.static(DIST_DIR));

// Health
app.get('/health', (_req, res) => res.json({ ok: true }));

// Disable public receipt endpoints entirely
app.use('/api/order', (req, res) => res.status(404).json({ error: 'Not found' }));
app.use('/order', (req, res) => res.status(404).send('<h1>Not found</h1>'));

function assertPositiveInteger(name, v) {
  if (!Number.isFinite(v) || v <= 0) throw new Error(`${name} must be > 0`);
}

// Create order and generate QR (PUBLIC)
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

    const sanitizeAddress = (addr) => {
      if (!addr || typeof addr !== 'object') return null;
      const pick = (k) => (addr[k] != null ? String(addr[k]).trim() : '');
      const a = {
        firstName: pick('firstName'),
        lastName: pick('lastName'),
        phone: pick('phone'),
        email: pick('email'),
        address1: pick('address1'),
        address2: pick('address2'),
        locality: pick('locality') || pick('landmark'),
        district: pick('district') || pick('city'),
        state: pick('state'),
        zip: pick('zip'),
        country: pick('country') || 'India',
        landmark: pick('landmark')
      };
      // ensure at least something meaningful
      const nonEmpty = Object.values(a).some(v => String(v).trim());
      return nonEmpty ? a : null;
    };

    const addressIn = sanitizeAddress(meta.address || req.body.address);

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
      meta: { ...meta, productId: product ? product.id : meta.productId, ...(addressIn ? { address: addressIn } : {}) },
      customer: addressIn ? {
        name: `${addressIn.firstName || ''} ${addressIn.lastName || ''}`.trim() || null,
        phone: addressIn.phone || null,
        email: addressIn.email || null,
      } : null,
      product: product ? { id: product.id, name: product.name, amountPaise: amountPaise } : null,
      publicViewToken: genViewToken(), // customer-safe token
    };
    orders.push(order);
    saveOrders(orders);
    // Opportunistic cleanup of long-stale unpaid orders
    try { saveOrders(pruneOldUnpaidOrders(loadOrders())); } catch {}

    // Optional: cookie helps redirect old flows, harmless to keep
    res.cookie?.('last_order_token', order.publicViewToken, {
      httpOnly: true,
      sameSite: 'Lax',
      secure: true,
      path: '/',
      maxAge: 7 * 24 * 3600 * 1000
    });

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
        publicViewToken: order.publicViewToken
      });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// SPA `/orders` route (customer order history placeholder)
app.get('/orders', (req, res) => {
  const indexFile = path.join(DIST_DIR, 'index.html');
  if (fs.existsSync(indexFile)) return res.sendFile(indexFile);
  return res.status(200).send('Orders page');
});

// ===== Admin API moved under /admin/api/* so /orders is gone =====

// List orders (ADMIN ONLY)
app.get('/admin/api/orders', requireAdminApi, (req, res) => {
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

// Get single order (ADMIN ONLY)
app.get('/admin/api/orders/:id', requireAdminApi, async (req, res) => {
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

// Admin actions (ADMIN ONLY)
app.post('/admin/api/orders/:id/expire', requireAdminApi, (req, res) => {
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

app.post('/admin/api/orders/:id/mark-paid', requireAdminApi, (req, res) => {
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
  // also return a friendly confirmation URL for convenience
  const confirmationUrl = order.publicViewToken ? `/order/${order.publicViewToken}` : null;
  res.json({ ok: true, order, confirmationUrl });
});

app.post('/admin/api/orders/:id/regenerate', requireAdminApi, async (req, res) => {
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

// Webhook (rate-limited)
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
  const nextLink = buildUpiLink({ pa: upiId, pn: upiName, amountPaise: order.remainingPaise, orderId: order.id });
  const qrFile = path.join(QRS_DIR, `${order.id}-${order.remainingPaise}.png`);
  return { nextLink, qrFile };
}

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
    if (!matchedOrder && utr) {
      // If no note-based match, try orders that have pending UTR matching this SMS
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
// Public: get minimal order details by numeric order id
app.get('/orders/:id', (req, res) => {
  const id = String(req.params.id || '');
  const orders = loadOrders();
  const order = orders.find(o => String(o.id) === id);
  if (!order) return res.status(404).json({ error: 'Not found' });
  if (ensureFreshStatus(order)) saveOrders(orders);
  const serverNowVal = nowIso();
  const safeOrder = sanitizeOrder(order);
  let expiresInMs = 0;
  try {
    if (order.expiresAt) {
      const exp = new Date(order.expiresAt).getTime();
      const srv = new Date(serverNowVal).getTime();
      if (Number.isFinite(exp) && Number.isFinite(srv)) expiresInMs = Math.max(0, exp - srv);
    }
  } catch {}
  return res.json({
    ...safeOrder,
    expiresAt: order.expiresAt || null,
    serverNow: serverNowVal,
    expiresInMs,
  });
});
// Public read of an order by receipt token — only for PAID orders
app.get('/api/order/:token', (req, res) => {
  const token = String(req.params.token || '');
  const orders = loadOrders();
  const order = orders.find(o => o.publicViewToken === token);
  if (!order || order.status !== 'PAID') {
    // Do not leak unpaid/cancelled order metadata via public token
    return res.status(404).json({ error: 'Not found' });
  }
  res.setHeader('Cache-Control', 'no-store');
  return res.json({ order: sanitizeOrder(order) });
});

app.get('/order/:token', (req, res) => {
  const token = String(req.params.token || '');
  const orders = loadOrders();
  const order = orders.find(o => o.publicViewToken === token);
  // Only show receipt for fully paid orders. Everything else is not found.
  if (!order || order.status !== 'PAID') return res.status(404).send('<h1>Not found</h1>');
  const s = sanitizeOrder(order);
  const fmtRs = n => `₹${(Number(n||0)/100).toFixed(2)}`;
  const fmtDate = (iso) => iso ? new Date(iso).toLocaleString() : '—';
  const addressLines = [];
  if (s.address?.line1) addressLines.push(escapeHtml(s.address.line1));
  if (s.address?.line2) addressLines.push(escapeHtml(s.address.line2));
  const localityParts = [s.address?.locality, s.address?.district, s.address?.state].filter(Boolean).map(escapeHtml);
  if (localityParts.length) addressLines.push(localityParts.join(', '));
  if (s.address?.zip || s.address?.country) {
    const tail = [s.address?.zip, s.address?.country].filter(Boolean).map(escapeHtml).join(', ');
    if (tail) addressLines.push(tail);
  }
  const contactLines = [];
  if (s.customer?.phone) contactLines.push(`Phone: ${escapeHtml(s.customer.phone)}`);
  if (s.customer?.email) contactLines.push(`Email: ${escapeHtml(s.customer.email)}`);
  const whatsappDigits = SUPPORT_WHATSAPP.replace(/[^0-9]/g, '') || '919933778870';
  const whatsappUrl = `https://wa.me/${whatsappDigits}?text=${encodeURIComponent(`Hello Solo Wardrobe Team, I have a question about order ${s.id}`)}`;
  const policies = [
    { title: 'Easy Exchange Policy', subtitle: 'We offer hassle free exchange policy' },
    { title: '7 Days Return Policy', subtitle: 'We provide 7 days free return policy' },
    { title: 'Best customer support', subtitle: 'We provide 24/7 customer support' },
    { title: 'Same Day Dispatch', subtitle: 'Order by 2 pm, ships today' },
  ];
  const policyMarkup = policies.map(p => `<li><strong>${escapeHtml(p.title)}</strong><span>${escapeHtml(p.subtitle)}</span></li>`).join('');
  const addressBlock = addressLines.length ? `<div class="section"><h3>Shipping Address</h3><div class="text-block">${addressLines.map(l => `<p>${l}</p>`).join('')}</div></div>` : '';
  const contactBlock = contactLines.length ? `<div class="section"><h3>Contact</h3><div class="text-block">${contactLines.map(l => `<p>${l}</p>`).join('')}</div></div>` : '';
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).send(`<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Order Confirmation · Solo Wardrobe</title>
<style>
  :root{color-scheme:dark light}
  body{margin:0;font-family:Inter,Segoe UI,Roboto,Arial,sans-serif;background:radial-gradient(circle at top,#0e1220,#05060c);color:#e5e7eb;}
  .wrap{max-width:780px;margin:40px auto;padding:24px;}
  .card{background:rgba(15,18,30,0.9);border:1px solid rgba(255,255,255,0.06);border-radius:22px;padding:32px;box-shadow:0 30px 80px rgba(0,0,0,0.45);backdrop-filter:blur(12px);}
  .hero{display:flex;align-items:center;gap:16px;margin-bottom:24px;}
  .check{width:54px;height:54px;border-radius:50%;background:#22c55e;display:grid;place-content-center;color:#04130a;box-shadow:0 12px 30px rgba(34,197,94,0.35);}
  h1{margin:0;font-size:24px;font-weight:600;letter-spacing:-0.01em;}
  .muted{color:#a1accb;font-size:14px;}
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:18px;margin:26px 0;}
  .chip{padding:10px 14px;border-radius:12px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);font-size:13px;color:#cbd5f5;}
  .section{margin-top:28px;border-top:1px solid rgba(255,255,255,0.05);padding-top:22px;}
  .section h3{margin:0 0 12px;font-size:16px;font-weight:600;color:#f8fafc;}
  .text-block p{margin:4px 0;font-size:14px;color:#cbd5f5;}
  .policy-list{list-style:none;padding:0;margin:12px 0 0;display:grid;gap:12px;}
  .policy-list li{padding:14px 16px;border-radius:12px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.05);}
  .policy-list strong{display:block;font-weight:600;color:#f8fafc;margin-bottom:4px;font-size:14px;}
  .policy-list span{color:#a1accb;font-size:13px;}
  .actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:32px;}
  .btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:12px 18px;border-radius:999px;font-weight:600;font-size:14px;text-decoration:none;transition:transform .18s ease,opacity .18s ease;}
  .btn-primary{background:#f8fafc;color:#05060c;}
  .btn-outline{background:transparent;color:#f8fafc;border:1px solid rgba(255,255,255,0.35);}
  .btn:hover{transform:translateY(-1px);}
  .note{margin-top:24px;font-size:12px;color:#7c8aab;line-height:1.5;}
  @media(max-width:640px){.card{padding:24px;border-radius:18px;}.hero{flex-direction:column;align-items:flex-start;}.actions{flex-direction:column;align-items:stretch;}}
</style>
</head>
<body><div class="wrap"><div class="card">
  <div class="hero">
    <div class="check">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
    </div>
    <div>
      <h1>Payment received — thank you!</h1>
      <div class="muted">Order ${escapeHtml(s.id)} is confirmed. We’ll keep you posted as it moves.</div>
    </div>
  </div>
  <div class="grid">
    <div class="chip">Status<br><strong>${escapeHtml(s.status || '')}</strong></div>
    <div class="chip">Total<br><strong>${fmtRs(s.totalAmountPaise)}</strong></div>
    <div class="chip">Paid<br><strong>${fmtRs(s.paidPaise)}</strong></div>
    <div class="chip">Placed<br><strong>${fmtDate(s.createdAt)}</strong></div>
    ${s.paidAt ? `<div class="chip">Paid At<br><strong>${fmtDate(s.paidAt)}</strong></div>` : ''}
    ${s.dispatchBy ? `<div class="chip">Dispatch ETA<br><strong>${fmtDate(s.dispatchBy)}</strong></div>` : ''}
    ${s.product ? `<div class="chip">Product<br><strong>${escapeHtml(s.product.name)}</strong></div>` : ''}
  </div>
  ${addressBlock}
  ${contactBlock}
  <div class="section">
    <h3>Our promises to you</h3>
    <ul class="policy-list">${policyMarkup}</ul>
  </div>
  <div class="actions">
    <a class="btn btn-primary" href="${escapeHtml(whatsappUrl)}" target="_blank" rel="noreferrer">Chat on WhatsApp</a>
    <a class="btn btn-outline" href="/">Back to store</a>
  </div>
  <div class="note">Need help? WhatsApp us at <strong>${escapeHtml(SUPPORT_WHATSAPP)}</strong> or reply to your order confirmation email. Policies above mirror what you saw on our home page.</div>
</div></div></body></html>`);
});

// Start server
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`UPI QR server listening on http://${HOST}:${PORT}`);
});
// Background prune as a safety net
setInterval(() => {
  try { saveOrders(pruneOldUnpaidOrders(loadOrders())); } catch {}
}, Math.max(5 * 60 * 1000, (ORDER_TTL_MIN + PRUNE_GRACE_MIN) * 60 * 1000));

// SPA fallback to dist/index.html (after API routes)
app.get('*', (req, res, next) => {
  // Do not interfere with API/static paths
  const skip =
    req.path.startsWith('/qrs') ||
    req.path.startsWith('/webhooks') ||
    req.path.startsWith('/products') ||
    req.path.startsWith('/health') ||
    req.path.startsWith('/admin/api/');
  if (skip) return next();
  const indexFile = path.join(DIST_DIR, 'index.html');
  if (fs.existsSync(indexFile)) return res.sendFile(indexFile);
  return next();
});
