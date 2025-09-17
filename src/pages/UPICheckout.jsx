import React, { useEffect, useMemo, useRef, useState } from 'react';
import Title from '../components/Title';

const fmt = (p) => (Math.max(0, Number(p) || 0) / 100).toFixed(2);

const RECEIPT_POLICIES = [
  { title: 'Easy Exchange Policy', subtitle: 'We offer hassle free exchange policy' },
  { title: '7 Days Return Policy', subtitle: 'We provide 7 days free return policy' },
  { title: 'Best customer support', subtitle: 'We provide 24/7 customer support' },
  { title: 'Same Day Dispatch', subtitle: 'Order by 2 pm, ships today' },
];

const SUPPORT_WHATSAPP = '+919933778870';

// Robust MM:SS formatter that never yields NaN
function mmss(ms) {
  const safe = Math.max(0, Number.isFinite(ms) ? ms : 0);
  const m = Math.floor(safe / 60000);
  const s = Math.floor((safe % 60000) / 1000);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// Convert server expiry + serverNow to a local absolute deadline (ms since epoch)
// Strictly server-driven: if inputs are missing/invalid, return null (no client fallback)
function computeDeadlineTs(expiresAt, serverNow) {
  try {
    const exp = new Date(expiresAt).getTime();
    const srv = new Date(String(serverNow)).getTime();
    if (Number.isFinite(exp) && Number.isFinite(srv)) {
      const delta = Math.max(0, exp - srv);
      return Date.now() + delta;
    }
  } catch {}
  return null;
}

// Prefer server-provided remaining milliseconds when available
function computeDeadlineFromServer(expiresInMs, expiresAt, serverNow) {
  const eim = Number(expiresInMs);
  if (Number.isFinite(eim)) {
    const left = Math.max(0, eim);
    return { deadline: Date.now() + left, left };
  }
  const dl = computeDeadlineTs(expiresAt, serverNow);
  if (dl != null) return { deadline: dl, left: Math.max(0, dl - Date.now()) };
  return { deadline: null, left: 0 };
}

export default function UPICheckout() {
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);

  const [deadlineTs, setDeadlineTs] = useState(null); // absolute timestamp when this session expires (ms)
  const [timeLeft, setTimeLeft] = useState(0);
  const [expired, setExpired] = useState(false);

  const timerRef = useRef(null);      // poller
  const pollAttemptsRef = useRef(0);  // cap token/status poll attempts
  const countdownRef = useRef(null);  // 1s countdown

  const qs = useMemo(() => new URLSearchParams(window.location.search), []);
  const isIOS = useMemo(() => /iPad|iPhone|iPod/i.test(navigator.userAgent), []);
  const [showApps, setShowApps] = useState(false);
  const [storeSuggest, setStoreSuggest] = useState(null); // { storeUrl, label }
  const [upiId, setUpiId] = useState('');
  const [upiStatus, setUpiStatus] = useState('idle'); // idle | ok | error
  const [copiedOrderId, setCopiedOrderId] = useState(false);

  const amountParam = qs.get('amount');
  const productId = qs.get('productId');
  const metaRef = qs.get('ref') || qs.get('note') || null;
  const redirect = qs.get('redirect');
  const pollMs = Math.max(1500, Math.min(5000, Number(qs.get('pollMs')) || 2000));

  // --- status helpers ---
  const isPaidStatus = (s) => ['PAID', 'SUCCESS', 'CONFIRMED'].includes(String(s || '').toUpperCase());
  const isReceiptableStatus = (s) => isPaidStatus(s) || ['PENDING','PROCESSING','PARTIAL'].includes(String(s || '').toUpperCase());
  const isTerminalStatus = (s) => isPaidStatus(s) || ['EXPIRED','CANCELLED'].includes(String(s || '').toUpperCase());

  // Persist order id per checkout context (prevents new order on refresh)
  const orderKey = useMemo(() => {
    const keyParts = [
      productId ? `product:${productId}` : `amount:${amountParam || ''}`,
      metaRef ? `ref:${metaRef}` : '',
      redirect ? `redir:${redirect}` : '',
    ].filter(Boolean).join('|');
    return `upi_checkout_order/${keyParts}`;
  }, [productId, amountParam, metaRef, redirect]);

  // Storage helpers to persist order id across tabs
  const readOrderId = (key) => {
    try {
      return sessionStorage.getItem(key) || localStorage.getItem(key) || null;
    } catch { return null; }
  };
  const writeOrderId = (key, id) => {
    try { sessionStorage.setItem(key, id); } catch {}
    try { localStorage.setItem(key, id); } catch {}
  };
  const removeOrderId = (key) => {
    try { sessionStorage.removeItem(key); } catch {}
    try { localStorage.removeItem(key); } catch {}
  };

  // URL helpers to persist/reuse order id via `?oid=`
  const getOidFromUrl = () => {
    try { const u = new URL(window.location.href); return u.searchParams.get('oid'); } catch { return null; }
  };
  const setOidInUrl = (id) => {
    try {
      const u = new URL(window.location.href);
      if (id) u.searchParams.set('oid', id); else u.searchParams.delete('oid');
      window.history.replaceState(null, '', u.toString());
    } catch {}
  };

  // ---- API helpers ----
  async function createOrder() {
    setLoading(true);
    setError('');
    setExpired(false);
    try {
      const payload = { meta: {} };
      if (productId) payload.productId = productId;
      else if (amountParam) payload.amount = Number(amountParam);
      if (metaRef) payload.meta.ref = metaRef;
      // Attach shipping/contact address from local storage if present
      try {
        const addrRaw = localStorage.getItem('addr.v1');
        if (addrRaw) {
          const addr = JSON.parse(addrRaw);
          if (addr && typeof addr === 'object') payload.meta.address = addr;
        }
      } catch {}

      const r = await fetch('/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        let msg = `Failed (${r.status})`;
        try { const j = await r.json(); if (j?.error) msg = j.error; } catch {}
        throw new Error(msg);
      }
      const data = await r.json();
      const newId = data.orderId;
      // Load authoritative state from the server using the id we just created
      const full = await fetchOrder(newId);
      setOrder({
        id: full.id,
        status: full.status,
        total: full.totalAmountPaise,
        paid: full.paidPaise,
        remaining: full.remainingPaise,
        currentQr: full.currentQr,
        currentUpiLink: full.currentUpiLink,
        publicViewToken: full.publicViewToken || data.publicViewToken || null,
        dispatchBy: full.dispatchBy || null,
        product: full.product || null,
        customer: full.customer || null,
        address: full.address || null,
        createdAt: full.createdAt || null,
        paidAt: full.paidAt || null,
      });
      writeOrderId(orderKey, newId);
      setOidInUrl(newId);

      // Use authoritative timing from the GET response
      const { deadline, left } = computeDeadlineFromServer(full.expiresInMs, full.expiresAt, full.serverNow);
      if (deadline != null) { setDeadlineTs(deadline); setTimeLeft(left); }
    } catch (e) {
      setError(e.message || 'Failed to create order');
    } finally {
      setLoading(false);
    }
  }

  async function fetchOrder(id) {
    const r = await fetch(`/orders/${id}`, { cache: 'no-store' });
    if (!r.ok) throw new Error('Order not found');
    return r.json(); // authoritative server fields
  }

  async function refresh() {
    if (!order?.id) return;
    try {
      const o = await fetchOrder(order.id);
      if (String(o.status).toUpperCase() === 'EXPIRED') {
        onExpire();
        return o;
      }
      setOrder(prev => ({
        ...(prev || {}),
        id: o.id,
        status: o.status,
        total: o.totalAmountPaise,
        paid: o.paidPaise,
        remaining: o.remainingPaise,
        currentQr: o.currentQr,
        currentUpiLink: o.currentUpiLink,
        publicViewToken: o.publicViewToken || prev?.publicViewToken || null,
        dispatchBy: o.dispatchBy || prev?.dispatchBy || null,
        product: o.product || prev?.product || null,
        customer: o.customer || prev?.customer || null,
        address: o.address || prev?.address || null,
        createdAt: o.createdAt || prev?.createdAt || null,
        paidAt: o.paidAt || prev?.paidAt || null,
      }));
      // Re-sync deadline on every poll (handles server-side regen/extension)
      if ((o.expiresAt && o.serverNow) || Number.isFinite(o.expiresInMs)) {
        const { deadline, left } = computeDeadlineFromServer(o.expiresInMs, o.expiresAt, o.serverNow);
        if (deadline != null) {
          setDeadlineTs(deadline);
          setTimeLeft(left);
        }
      }
      if (isPaidStatus(o.status)) {
        setShowSuccess(true);
        // Persist paid order receipt link for /orders page
        const summary = {
          id: o.id,
          total: o.totalAmountPaise,
          paidAt: o.paidAt,
          createdAt: o.createdAt,
          publicViewToken: o.publicViewToken,
        };
        persistPaidOrder(summary);
        linkOrderToDevice(o.publicViewToken);
      }
      return o;
    } catch {
      // ignore transient errors
    }
  }

  async function initOrder() {
    setLoading(true);
    setError('');
    setExpired(false);
    try {
      // Prefer explicit URL `oid`, fall back to stored id
      let existingId = getOidFromUrl() || readOrderId(orderKey);
      if (existingId) {
        try {
          const o = await fetchOrder(existingId);
          if (o && (o.status === 'PENDING' || o.status === 'PARTIAL')) {
            setOrder({
              id: o.id,
              status: o.status,
              total: o.totalAmountPaise,
              paid: o.paidPaise,
              remaining: o.remainingPaise,
              currentQr: o.currentQr,
              currentUpiLink: o.currentUpiLink,
              publicViewToken: o.publicViewToken || null,
              dispatchBy: o.dispatchBy || null,
              product: o.product || null,
              customer: o.customer || null,
              address: o.address || null,
              createdAt: o.createdAt || null,
              paidAt: o.paidAt || null,
            });
            // Ensure persistence across tabs + URL for this context
            writeOrderId(orderKey, o.id);
            setOidInUrl(o.id);
            const { deadline, left } = computeDeadlineFromServer(o.expiresInMs, o.expiresAt, o.serverNow);
            if (deadline != null) {
              setDeadlineTs(deadline);
              setTimeLeft(left);
            }
            setLoading(false);
            return;
          } else if (o && isPaidStatus(o.status)) {
            setOrder({
              id: o.id,
              status: o.status,
              total: o.totalAmountPaise,
              paid: o.paidPaise,
              remaining: o.remainingPaise,
              currentQr: o.currentQr,
              currentUpiLink: o.currentUpiLink,
              publicViewToken: o.publicViewToken || null,
              dispatchBy: o.dispatchBy || null,
              product: o.product || null,
              customer: o.customer || null,
              address: o.address || null,
              createdAt: o.createdAt || null,
              paidAt: o.paidAt || null,
            });
            writeOrderId(orderKey, o.id);
            setOidInUrl(o.id);
            setShowSuccess(true);
            // Persist immediately if we landed on a PAID order
            const summary = {
              id: o.id,
              total: o.totalAmountPaise,
              paidAt: o.paidAt,
              createdAt: o.createdAt,
              publicViewToken: o.publicViewToken,
            };
            persistPaidOrder(summary);
            linkOrderToDevice(o.publicViewToken);
            setLoading(false);
            return;
          }
        } catch {
          // fall through to create new
        }
        // If we got here, the referenced order isn't usable; mark expired and do NOT auto-create.
        removeOrderId(orderKey);
        setExpired(true);
        setLoading(false);
        return;
      }
      // No existing id present -> first-time visit for this context, create now
      await createOrder();
    } catch (e) {
      setError(e?.message || 'Failed to initialize order');
      setLoading(false);
    }
  }

  // ---- effects ----
  useEffect(() => {
    initOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!order?.id) return;
    // Stop if we already have a token or terminal status
    if (order?.publicViewToken || isTerminalStatus(order?.status)) return;
    pollAttemptsRef.current = 0;
    const tick = async () => {
      pollAttemptsRef.current += 1;
      const o = await refresh();
      const tok = o?.publicViewToken || order?.publicViewToken;
      const terminal = isTerminalStatus(o?.status || order?.status);
      if (tok || terminal || pollAttemptsRef.current >= 30) {
        try { if (timerRef.current) clearInterval(timerRef.current); } catch {}
      }
    };
    tick();
    timerRef.current = setInterval(tick, 2000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.id, order?.publicViewToken, order?.status]);

  useEffect(() => {
    try { const saved = localStorage.getItem('user_upi_id'); if (saved) setUpiId(saved); } catch {}
  }, []);

  // Cross-tab hardening: if another tab clears this order id, mark expired here too
  useEffect(() => {
    const onStorage = (e) => {
      try {
        if (!e) return;
        if (e.key !== orderKey) return;
        if (showSuccess || isTerminalStatus(order?.status)) return; // do not clear during/after success
        if (!e.newValue) setExpired(true);
      } catch {}
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [orderKey, showSuccess, order?.status]);

  // One-second countdown that always renders a value
  useEffect(() => {
    if (!deadlineTs) return;
    if (countdownRef.current) clearInterval(countdownRef.current);
    const tick = () => {
      const left = Math.max(0, deadlineTs - Date.now());
      setTimeLeft(left);
      if (left <= 0) {
        clearInterval(countdownRef.current);
        onExpire();
      }
    };
    tick();
    countdownRef.current = setInterval(tick, 1000);
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [deadlineTs]);

  useEffect(() => {
    if (order?.status === 'PAID' && countdownRef.current) {
      clearInterval(countdownRef.current);
      removeOrderId(orderKey);
    }
  }, [order?.status, orderKey]);

  const onExpire = () => {
    try { if (timerRef.current) clearInterval(timerRef.current); } catch {}
    setExpired(true);
    setDeadlineTs(null);
    setTimeLeft(0);
    setShowApps(false);
    setStoreSuggest(null);
    setOrder(null);
    removeOrderId(orderKey);
    // Keep `oid` in URL so refresh honors the expired state. It will be replaced on next create.
  };

  // Persist a minimal record of a PAID order in localStorage so the user can revisit it from /orders
  const persistPaidOrder = (summary) => {
    try {
      if (!summary) return;
      const token = summary.publicViewToken || null;
      if (!token) return; // only persist if a public receipt exists
      const key = 'orders.v1';
      const url = `/order/${token}`;
      const entry = {
        id: summary.id,
        token,
        url,
        amountPaise: summary.total,
        paidAt: summary.paidAt || new Date().toISOString(),
        createdAt: summary.createdAt || null,
      };
      let arr = [];
      try { const raw = localStorage.getItem(key); if (raw) arr = JSON.parse(raw); } catch {}
      if (!Array.isArray(arr)) arr = [];
      if (!arr.some((e) => e && e.token === token)) {
        arr.unshift(entry);
        if (arr.length > 50) arr = arr.slice(0, 50);
        try { localStorage.setItem(key, JSON.stringify(arr)); } catch {}
      }
    } catch {}
  };

  const linkOrderToDevice = async (token) => {
    try {
      if (!token) return;
      await fetch('/api/link-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token }),
      }).catch(() => {});
    } catch {}
  };

  const onContinue = () => {
    if (redirect) window.location.href = redirect;
    else window.location.href = '/';
  };

  // ---- UPI helpers (unchanged visuals/behavior) ----
  function parseUpiParams(link) {
    try {
      const u = new URL(link);
      const p = new URLSearchParams(u.search);
      return {
        pa: p.get('pa') || '',
        pn: p.get('pn') || '',
        am: p.get('am') || '',
        cu: p.get('cu') || 'INR',
        tn: p.get('tn') || '',
      };
    } catch (_) { return null; }
  }

  const appDeepLinks = useMemo(() => {
    if (!order?.currentUpiLink) return [];
    const q = parseUpiParams(order.currentUpiLink);
    if (!q) return [];
    const qs = (o) => Object.entries(o).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v || '')}`).join('&');
    return [
      { key: 'gpay',    label: 'Google Pay', scheme: `tez://upi/pay?${qs(q)}`,     storeUrl: 'https://apps.apple.com/in/app/google-pay-upi-money-transfers/id1193357041' },
      { key: 'phonepe', label: 'PhonePe',    scheme: `phonepe://upi/pay?${qs(q)}`, storeUrl: 'https://apps.apple.com/in/app/phonepe-secure-payments-app/id1170055821' },
      { key: 'paytm',   label: 'Paytm',      scheme: `paytmmp://pay?${qs(q)}`,     storeUrl: 'https://apps.apple.com/in/app/paytm-secure-upi-payments/id473941634' },
      { key: 'bhim',    label: 'BHIM',       scheme: `bhim://upi/pay?${qs(q)}`,    storeUrl: 'https://apps.apple.com/in/app/bhim-making-india-cashless/id1172681203' },
    ];
  }, [order?.currentUpiLink]);

  const appIcons = useMemo(() => ({
    gpay: '/gpay.png',
    phonepe: '/phonepe.png',
    paytm: '/paytm.png',
  }), []);

  const receiptAddressLines = useMemo(() => {
    const lines = [];
    if (!order?.address) return lines;
    const { line1, line2, locality, district, state, zip, country } = order.address;
    if (line1) lines.push(line1);
    if (line2) lines.push(line2);
    const localityParts = [locality, district, state].filter(Boolean).join(', ');
    if (localityParts) lines.push(localityParts);
    const tail = [zip, country].filter(Boolean).join(', ');
    if (tail) lines.push(tail);
    return lines;
  }, [order?.address]);

  const receiptContactLines = useMemo(() => {
    const lines = [];
    const name = order?.customer?.name || order?.address?.name;
    if (name) lines.push(name);
    const phone = order?.customer?.phone || order?.address?.phone;
    if (phone) lines.push(`Phone: ${phone}`);
    const email = order?.customer?.email;
    if (email) lines.push(`Email: ${email}`);
    return lines;
  }, [order?.customer, order?.address]);

  const whatsappLink = useMemo(() => {
    const digits = SUPPORT_WHATSAPP.replace(/[^0-9]/g, '') || '919933778870';
    const message = encodeURIComponent(`Hello Solo Wardrobe Team, I have a question about order ${order?.id || ''}`.trim());
    return `https://wa.me/${digits}?text=${message}`;
  }, [order?.id]);

  const openWithScheme = (scheme, storeUrl, label) => {
    try {
      setStoreSuggest(null);
      let wentBackground = false;
      const clear = () => { try { clearTimeout(timer); } catch {} };
      const onVis = () => { if (document.hidden) { wentBackground = true; clear(); } };
      window.addEventListener('visibilitychange', onVis, { once: true });
      window.addEventListener('pagehide', clear, { once: true });
      window.addEventListener('blur', clear, { once: true });
      const timer = setTimeout(() => { if (!wentBackground) setStoreSuggest({ storeUrl, label }); }, 2200);
      window.location.href = scheme;
    } catch {
      setStoreSuggest({ storeUrl, label });
    }
  };

  // --- Receipt helpers ---
  const [downloading, setDownloading] = useState(false);
  const receiptUrl = useMemo(() => (order?.publicViewToken ? `/order/${order.publicViewToken}` : null), [order?.publicViewToken]);

  const notify = (msg) => {
    // minimal UX feedback using existing error banner
    try { setError(String(msg || '')); } catch { alert(String(msg || '')); }
    setTimeout(() => setError(''), 1800);
  };

  const viewReceipt = () => {
    if (!order?.publicViewToken) {
      if (!isReceiptableStatus(order?.status)) notify('Receipt not available for this order status.');
      else notify('Receipt becomes available after payment confirmation.');
      return;
    }
    window.location.href = `/order/${order.publicViewToken}`;
  };

  const downloadReceipt = async () => {
    if (!order?.id || !order?.publicViewToken) {
      notify('Receipt becomes available after payment confirmation.');
      return;
    }
    try {
      setDownloading(true);
      // 1) Try a direct PDF endpoint if available
      const pdfCandidates = [];
      if (order?.receiptPdfUrl) pdfCandidates.push(order.receiptPdfUrl);
      pdfCandidates.push(`/api/orders/${encodeURIComponent(order.id)}/receipt.pdf?token=${encodeURIComponent(order.publicViewToken)}`);
      let gotPdf = null;
      for (const url of pdfCandidates) {
        try {
          const r = await fetch(url, { credentials: 'include' });
          const ct = r.headers.get('content-type') || '';
          if (r.ok && /pdf/i.test(ct)) { gotPdf = await r.blob(); break; }
        } catch {}
      }
      if (gotPdf) {
        const a = document.createElement('a');
        const url = URL.createObjectURL(gotPdf);
        a.href = url;
        a.download = `Order-${order.id}.pdf`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { try { URL.revokeObjectURL(url); document.body.removeChild(a); } catch {} }, 500);
        return;
      }
      // 2) Fallback: build a print-friendly HTML and navigate same-tab
      const fmtRs = (p) => `₹${(Math.max(0, Number(p) || 0) / 100).toFixed(2)}`;
      const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString() : '—');
      const addrLines = [];
      if (order?.address?.line1) addrLines.push(order.address.line1);
      if (order?.address?.line2) addrLines.push(order.address.line2);
      const loc = [order?.address?.locality, order?.address?.district, order?.address?.state].filter(Boolean).join(', ');
      if (loc) addrLines.push(loc);
      const tail = [order?.address?.zip, order?.address?.country].filter(Boolean).join(', ');
      if (tail) addrLines.push(tail);
      const contact = [];
      if (order?.customer?.name || order?.address?.name) contact.push(order?.customer?.name || order?.address?.name);
      if (order?.customer?.phone || order?.address?.phone) contact.push(`Phone: ${order?.customer?.phone || order?.address?.phone}`);
      if (order?.customer?.email) contact.push(`Email: ${order.customer.email}`);
      const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">`
        + `<title>Order ${order.id} receipt</title>`
        + `<style>
            :root{color-scheme:light}
            html,body{background:#fff;color:#000}
            body{margin:0;font-family:Inter,Segoe UI,Roboto,Arial,sans-serif}
            .wrap{max-width:780px;margin:24px auto;padding:16px}
            .card{background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:24px}
            .hero{display:flex;align-items:center;gap:12px;margin-bottom:20px}
            .check{width:40px;height:40px;background:#10b981;color:#fff;display:grid;place-content:center;border-radius:50%}
            h1{margin:0;font-size:22px;font-weight:600}
            .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;margin:20px 0}
            .chip{padding:10px 14px;border-radius:6px;background:#fff;border:1px solid #e5e7eb;font-size:13px;color:#111}
            .section{margin-top:20px;border-top:1px solid #e5e7eb;padding-top:16px}
            .section h3{margin:0 0 8px;font-size:15px;font-weight:600}
            .muted{color:#6b7280;font-size:14px}
            .text-sm{font-size:14px}
            .note{margin-top:18px;font-size:12px;color:#6b7280}
            @media print{.no-print{display:none}}
          </style></head><body>`
        + `<div class="wrap"><div class="card">`
        + `<div class="hero">`
        + `<div class="check"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg></div>`
        + `<div><h1>Payment received — thank you!</h1><div class="muted text-sm">Order ${order.id} is confirmed.</div></div>`
        + `</div>`
        + `<div class="grid">`
        + `<div class="chip">Status<br><strong>${order.status}</strong></div>`
        + `<div class="chip">Total<br><strong>${fmtRs(order.total)}</strong></div>`
        + `<div class="chip">Paid<br><strong>${fmtRs(order.paid)}</strong></div>`
        + `<div class="chip">Placed<br><strong>${fmtDate(order.createdAt)}</strong></div>`
        + (order.paidAt ? `<div class="chip">Paid At<br><strong>${fmtDate(order.paidAt)}</strong></div>` : '')
        + (order.dispatchBy ? `<div class="chip">Dispatch ETA<br><strong>${fmtDate(order.dispatchBy)}</strong></div>` : '')
        + (order.product?.name ? `<div class="chip">Product<br><strong>${order.product.name}</strong></div>` : '')
        + `</div>`
        + (contact.length ? `<div class="section"><h3>Contact</h3>${contact.map((l)=>`<div class='text-sm'>${l}</div>`).join('')}</div>` : '')
        + (addrLines.length ? `<div class="section"><h3>Shipping Address</h3>${addrLines.map((l)=>`<div class='text-sm'>${l}</div>`).join('')}</div>` : '')
        + `<div class="note">Need help? WhatsApp us at ${SUPPORT_WHATSAPP}.</div>`
        + `</div>`
        + `<div class="wrap no-print"><p class="text-sm">If printing didn't start automatically, press Ctrl/Cmd + P.</p></div>`
        + `<script>try{window.print()}catch(e){}</script>`
        + `</body></html>`;
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.location.assign(url);
    } catch (e) {
      notify(e?.message || 'Failed to download receipt');
    } finally {
      setDownloading(false);
    }
  };

  const downloadReceipt = () => {
    try {
      if (!order || order.status !== 'PAID') return;
      const fmtRs = (p) => `₹${(Math.max(0, Number(p) || 0) / 100).toFixed(2)}`;
      const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString() : '—');
      const addrLines = [];
      if (order?.address?.line1) addrLines.push(order.address.line1);
      if (order?.address?.line2) addrLines.push(order.address.line2);
      const loc = [order?.address?.locality, order?.address?.district, order?.address?.state].filter(Boolean).join(', ');
      if (loc) addrLines.push(loc);
      const tail = [order?.address?.zip, order?.address?.country].filter(Boolean).join(', ');
      if (tail) addrLines.push(tail);
      const contact = [];
      if (order?.customer?.name || order?.address?.name) contact.push(order?.customer?.name || order?.address?.name);
      if (order?.customer?.phone || order?.address?.phone) contact.push(`Phone: ${order?.customer?.phone || order?.address?.phone}`);
      if (order?.customer?.email) contact.push(`Email: ${order.customer.email}`);
      const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">`
        + `<title>Order ${order.id} receipt</title>`
        + `<style>
            :root{color-scheme:light}
            html,body{background:#fff;color:#000}
            body{margin:0;font-family:Inter,Segoe UI,Roboto,Arial,sans-serif}
            .wrap{max-width:780px;margin:24px auto;padding:16px}
            .card{background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:24px}
            .hero{display:flex;align-items:center;gap:12px;margin-bottom:20px}
            .check{width:40px;height:40px;background:#10b981;color:#fff;display:grid;place-content:center;border-radius:50%}
            h1{margin:0;font-size:22px;font-weight:600}
            .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;margin:20px 0}
            .chip{padding:10px 14px;border-radius:6px;background:#fff;border:1px solid #e5e7eb;font-size:13px;color:#111}
            .section{margin-top:20px;border-top:1px solid #e5e7eb;padding-top:16px}
            .section h3{margin:0 0 8px;font-size:15px;font-weight:600}
            .muted{color:#6b7280;font-size:14px}
            .text-sm{font-size:14px}
            .note{margin-top:18px;font-size:12px;color:#6b7280}
            @media print{.no-print{display:none}}
          </style></head><body>`
        + `<div class="wrap"><div class="card">`
        + `<div class="hero">`
        + `<div class="check"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg></div>`
        + `<div><h1>Payment received — thank you!</h1><div class="muted text-sm">Order ${order.id} is confirmed.</div></div>`
        + `</div>`
        + `<div class="grid">`
        + `<div class="chip">Status<br><strong>${order.status}</strong></div>`
        + `<div class="chip">Total<br><strong>${fmtRs(order.total)}</strong></div>`
        + `<div class="chip">Paid<br><strong>${fmtRs(order.paid)}</strong></div>`
        + `<div class="chip">Placed<br><strong>${fmtDate(order.createdAt)}</strong></div>`
        + (order.paidAt ? `<div class="chip">Paid At<br><strong>${fmtDate(order.paidAt)}</strong></div>` : '')
        + (order.dispatchBy ? `<div class="chip">Dispatch ETA<br><strong>${fmtDate(order.dispatchBy)}</strong></div>` : '')
        + (order.product?.name ? `<div class="chip">Product<br><strong>${order.product.name}</strong></div>` : '')
        + `</div>`
        + (contact.length ? `<div class="section"><h3>Contact</h3>${contact.map((l)=>`<div class='text-sm'>${l}</div>`).join('')}</div>` : '')
        + (addrLines.length ? `<div class="section"><h3>Shipping Address</h3>${addrLines.map((l)=>`<div class='text-sm'>${l}</div>`).join('')}</div>` : '')
        + `<div class="note">Need help? WhatsApp us at ${SUPPORT_WHATSAPP}.</div>`
        + `</div>`
        + `<div class="wrap no-print"><button onclick="window.print()" style="margin-top:12px;padding:10px 14px;border:1px solid #111;background:#111;color:#fff;border-radius:6px;">Download PDF</button></div>`
        + `</div></body></html>`;
      const w = window.open('', '_blank', 'noopener');
      if (!w) return;
      w.document.write(html);
      w.document.close();
      setTimeout(() => { try { w.focus(); w.print(); } catch {} }, 250);
    } catch {}
  };

  const launchPayment = async () => {
    if (!order?.currentUpiLink) return;
    try {
      if (order?.id && navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(order.id);
        setCopiedOrderId(true);
        setTimeout(() => setCopiedOrderId(false), 2500);
      }
    } catch {}
    if (isIOS) {
      const prefs = ['gpay', 'phonepe', 'paytm'];
      const first = appDeepLinks.find(a => prefs.includes(a.key)) || appDeepLinks[0];
      if (first) openWithScheme(first.scheme, first.storeUrl, first.label);
    } else {
      window.location.href = order.currentUpiLink;
    }
  };

  const verifyUpiId = () => {
    const v = String(upiId || '').trim();
    const ok = /^[A-Za-z0-9._-]{2,}@[A-Za-z][A-Za-z0-9._-]{2,}$/.test(v);
    setUpiStatus(ok ? 'ok' : 'error');
    try { if (ok) localStorage.setItem('user_upi_id', v); } catch {}
    if (ok) launchPayment();
  };

  const onCopy = async (text) => {
    try { await navigator.clipboard.writeText(text); setError(''); } catch { /* ignore */ }
  };

  // ---- UI ----
  return (
    <div className="border-t pt-8 px-4 max-w-4xl mx-auto">
      <div className="mb-4">
        <Title text1={'UPI'} text2={'CHECKOUT'} />
      </div>

      {error && (
        <div className="rounded-none border border-white text-white bg-black/60 p-3 mb-4">
          {String(error)}
        </div>
      )}

      {!!order && !expired && (
        <div className="mb-4 rounded-none border bg-black text-white px-3 py-2 text-sm flex items-center justify-between">
          <span>Complete payment within 5 minutes</span>
          <span className="font-semibold tabular-nums">
            {deadlineTs ? mmss(timeLeft) : '—:—'}
          </span>
        </div>
      )}

      {expired && (
        <div className="rounded-none border bg-black text-white p-3 mb-4">
          This payment session expired. Please return to your cart to place a new order.
          <div className="mt-2">
            <a href="/cart" className="px-4 py-2 inline-block rounded-none bg-black text-white text-sm">Go to Cart</a>
          </div>
        </div>
      )}

      {loading && <p className="text-gray-500">Preparing your order…</p>}

      {!!order && !expired && (
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="rounded-none border bg-white/5 p-4 flex items-center justify-center min-h-[300px]">
            {order.currentQr ? (
              <img key={order.currentQr} src={order.currentQr} alt="UPI QR" className="w-56 h-56 sm:w-64 sm:h-64 object-contain" />
            ) : (
              <p className="text-gray-500">No QR available</p>
            )}
          </div>

          <div className="rounded-none border bg-white p-4 sm:col-span-2 shadow-sm">
            <div>
              <p className="font-semibold mb-2">Pay via</p>
              <div className="mb-3 text-xs p-2 rounded-none border bg-black text-white">
                Tip: We copied your Order ID to the clipboard. In your UPI app, paste it into the “Add note/message” field before paying so we can auto-verify instantly.
                {copiedOrderId && <span className="ml-2 text-[11px] text-white">Order ID copied</span>}
              </div>
              <div className="w-full flex items-center justify-between border rounded-none px-3 py-3 bg-white shadow-sm">
                <span className="flex items-center gap-2">
                  <span className="inline-grid h-5 w-5 place-content-center rounded-none border text-gray-500">₹</span>
                  <span className="font-medium">UPI payment</span>
                </span>
                <span className="ml-auto mr-2 text-sm font-semibold">₹{fmt(order.total)}</span>
                <span aria-hidden className="text-gray-500 transition rotate-180">▾</span>
              </div>

              <div className="mt-3">
                <div className="grid grid-cols-4 gap-3">
                  {appDeepLinks.filter(a => ['gpay','phonepe','paytm'].includes(a.key)).map(a => (
                    <button key={a.key} onClick={() => openWithScheme(a.scheme, a.storeUrl, a.label)} className="flex flex-col items-center gap-2">
                      <span className="h-14 w-16 grid place-content-center rounded-none border shadow-sm bg-white hover:shadow-md active:scale-[0.98] transition">
                        <img src={{ gpay:'/gpay.png', phonepe:'/phonepe.png', paytm:'/paytm.png' }[a.key]} alt={a.label} className="h-8 object-contain" />
                      </span>
                      <span className="text-[11px] text-gray-600">{a.label}</span>
                    </button>
                  ))}
                  {!isIOS && order?.currentUpiLink && (
                    <button key="others" onClick={() => { try { window.location.href = order.currentUpiLink; } catch {} }} className="flex flex-col items-center gap-2">
                      <span className="h-14 w-16 grid place-content-center rounded-none border shadow-sm bg-white hover:shadow-md active:scale-[0.98] transition">
                        <span className="text-lg">⋯</span>
                      </span>
                      <span className="text-[11px] text-gray-600">Others</span>
                    </button>
                  )}
                </div>

                <div className="mt-4 text-center text-xs text-gray-500">Add UPI ID</div>
                <div className="mt-2 grid sm:grid-cols-[1fr_auto] gap-2">
                  <input
                    type="text"
                    inputMode="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    placeholder="yourname@bank"
                    value={upiId}
                    onChange={(e) => { setUpiId(e.target.value); setUpiStatus('idle'); }}
                    className="h-10 px-3 rounded-none border focus-ring"
                  />
                  <button type="button" onClick={verifyUpiId} className="h-10 px-4 rounded-none bg-black text-white text-sm pressable">
                    Verify UPI ID
                  </button>
                </div>
                {upiStatus === 'ok' && <p className="mt-1 text-xs text-white">UPI ID looks good. Opening your UPI app…</p>}
                {upiStatus === 'error' && <p className="mt-1 text-xs text-red-600">Enter a valid UPI ID like name@bank.</p>}
                {isIOS && storeSuggest && (
                  <div className="mt-3 p-2 border rounded-none bg-black text-white text-xs">
                    If the app didn't open, tap here to open {storeSuggest.label} in the App Store.
                    <a className="ml-2 underline" href={storeSuggest.storeUrl} target="_blank" rel="noopener">Open App Store</a>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-none border bg-white p-4 space-y-2">
            <p>
              <b>Order:</b> {order.id}
              <button type="button" onClick={() => onCopy(order.id)} className="ml-2 px-2 py-0.5 text-xs border rounded-none">Copy</button>
            </p>
            <p><b>Status:</b> {order.status}</p>
            <p><b>Total:</b> ₹{fmt(order.total)}</p>
            <p><b>Paid:</b> ₹{fmt(order.paid)}</p>
            <p><b>Remaining:</b> ₹{fmt(order.remaining)}</p>
            {String(order.status).toUpperCase() === 'PARTIAL' && (
              <p className="text-xs text-gray-500 mt-2">Partial payment received. New QR generated for the remainder.</p>
            )}
            {isPaidStatus(order.status) && (
              <p className="text-green-700 font-medium mt-2">Payment confirmed. Thank you!</p>
            )}
            <div className="pt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={viewReceipt}
                disabled={!order?.publicViewToken}
                className={`px-3 py-2 border text-sm rounded-none ${order?.publicViewToken ? 'border-black text-black hover:bg-gray-50' : 'border-gray-300 text-gray-400 cursor-not-allowed'}`}
                title={order?.publicViewToken ? 'Open receipt' : 'Receipt becomes available after payment confirmation.'}
              >
                View receipt
              </button>
              <button
                type="button"
                onClick={downloadReceipt}
                disabled={!order?.publicViewToken || downloading}
                className={`px-3 py-2 border text-sm rounded-none ${order?.publicViewToken && !downloading ? 'border-black text-black hover:bg-gray-50' : 'border-gray-300 text-gray-400 cursor-not-allowed'}`}
                title={order?.publicViewToken ? 'Download PDF' : 'Receipt becomes available after payment confirmation.'}
              >
                {downloading ? 'Preparing…' : 'Download PDF'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSuccess && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="relative w-full max-w-3xl">
            <div className="pointer-events-none absolute inset-0 -z-10">
              {Array.from({ length: 20 }).map((_, i) => (
                <span key={i} className="confetti" style={{ '--i': i, '--c': i % 3 === 0 ? '#22c55e' : i % 3 === 1 ? '#06b6d4' : '#f59e0b' }} />
              ))}
            </div>
            <div className="animate-swipe-in-up rounded-none border border-gray-200 bg-white text-black shadow-2xl backdrop-blur px-6 py-8 sm:px-10">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-none bg-white text-black grid place-content-center shadow-lg animate-pop">
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                </div>
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight">Payment received — thank you!</h2>
                  <p className="text-sm text-gray-600">Order {order?.id} is confirmed. We’ll keep you posted until it ships.</p>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3 text-sm">
                <div className="rounded-none border border-gray-200 bg-white p-4">
                  <div className="text-xs uppercase tracking-wide text-gray-500">Order ID</div>
                  <div className="mt-1 font-mono text-xs break-all text-black">{order?.id}</div>
                  <button type="button" onClick={() => order?.id && onCopy(order.id)} className="mt-2 text-xs underline text-gray-600">Copy</button>
                </div>
                <div className="rounded-none border border-gray-200 bg-white p-4">
                  <div className="text-xs uppercase tracking-wide text-gray-500">Total</div>
                  <div className="mt-1 text-base font-semibold">₹{fmt(order?.total)}</div>
                  <p className="text-xs text-gray-600">Paid: ₹{fmt(order?.paid)}</p>
                </div>
                <div className="rounded-none border border-gray-200 bg-white p-4">
                  <div className="text-xs uppercase tracking-wide text-gray-500">Status</div>
                  <div className="mt-1 text-base font-semibold">{order?.status}</div>
                  {order?.dispatchBy && <p className="text-xs text-gray-500">Dispatch ETA: {new Date(order.dispatchBy).toLocaleString()}</p>}
                </div>
                {order?.createdAt && (
                  <div className="rounded-none border border-gray-200 bg-white p-4">
                    <div className="text-xs uppercase tracking-wide text-gray-500">Placed</div>
                    <div className="mt-1 text-sm text-black">{new Date(order.createdAt).toLocaleString()}</div>
                  </div>
                )}
                {order?.paidAt && (
                  <div className="rounded-none border border-gray-200 bg-white p-4">
                    <div className="text-xs uppercase tracking-wide text-gray-500">Paid At</div>
                    <div className="mt-1 text-sm text-black">{new Date(order.paidAt).toLocaleString()}</div>
                  </div>
                )}
                {order?.remaining > 0 && (
                  <div className="rounded-none border border-gray-200 bg-white p-4">
                    <div className="text-xs uppercase tracking-wide text-gray-600">Amount Due</div>
                    <div className="mt-1 text-sm text-gray-700">₹{fmt(order.remaining)}</div>
                    <p className="text-xs text-gray-600">Complete the remaining amount to finish your purchase.</p>
                  </div>
                )}
                {order?.product?.name && (
                  <div className="rounded-none border border-gray-200 bg-white p-4 sm:col-span-3">
                    <div className="text-xs uppercase tracking-wide text-gray-500">Product</div>
                    <div className="mt-1 font-medium">{order.product.name}</div>
                  </div>
                )}
              </div>

              {(receiptContactLines.length > 0 || receiptAddressLines.length > 0) && (
                <div className="mt-6 grid gap-4 sm:grid-cols-2 text-sm">
                  {receiptContactLines.length > 0 && (
                    <div className="rounded-none border border-gray-200 bg-white p-4">
                      <h3 className="text-sm font-semibold text-black mb-2">Contact</h3>
                      <ul className="space-y-1 text-gray-700">
                        {receiptContactLines.map((line, idx) => (
                          <li key={idx}>{line}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {receiptAddressLines.length > 0 && (
                    <div className="rounded-none border border-gray-200 bg-white p-4">
                      <h3 className="text-sm font-semibold text-black mb-2">Shipping Address</h3>
                      <ul className="space-y-1 text-gray-700">
                        {receiptAddressLines.map((line, idx) => (
                          <li key={idx}>{line}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-8">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Our policies</h3>
                <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                  {RECEIPT_POLICIES.map((p) => (
                    <li key={p.title} className="rounded-none border border-gray-200 bg-white p-4">
                      <div className="font-medium text-black">{p.title}</div>
                      <div className="text-xs text-gray-600 mt-1">{p.subtitle}</div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <button onClick={onContinue} className="px-5 py-2.5 rounded-none bg-black text-white text-sm font-semibold shadow-sm hover:-translate-y-0.5 transition">Continue</button>
                {order?.publicViewToken ? (
                  <>
                    <button
                      onClick={viewReceipt}
                      className="px-5 py-2.5 rounded-none border border-black text-sm font-semibold text-black hover:-translate-y-0.5 transition"
                    >
                      View receipt
                    </button>
                    <button
                      onClick={downloadReceipt}
                      disabled={downloading}
                      className="px-5 py-2.5 rounded-none border border-black text-sm font-semibold text-black hover:-translate-y-0.5 transition"
                    >
                      {downloading ? 'Preparing…' : 'Download PDF'}
                    </button>
                  </>
                ) : (
                  <button
                    disabled
                    title="Receipt becomes available after payment confirmation."
                    className="px-5 py-2.5 rounded-none border border-gray-300 text-sm font-semibold text-gray-400"
                  >
                    View receipt
                  </button>
                )}
                <a className="px-5 py-2.5 rounded-none border border-black text-sm font-semibold text-black hover:-translate-y-0.5 transition" href={whatsappLink} target="_blank" rel="noreferrer">WhatsApp support</a>
              </div>

              <p className="mt-4 text-xs text-gray-600">Need help? Message us on WhatsApp at <strong className="text-gray-700">{SUPPORT_WHATSAPP}</strong> or reply to your confirmation email.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
