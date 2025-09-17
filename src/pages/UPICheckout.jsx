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
    const r = await fetch(`/orders/${id}?t=${Date.now()}`, { cache: 'no-store' });
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
        // Clear purchased items from local cart exactly once per order
        try {
          const clearedKey = 'cart.cleared.orderId';
          const already = localStorage.getItem(clearedKey);
          if (already !== o.id) {
            clearPurchasedFromCart(o);
            localStorage.setItem(clearedKey, o.id);
            try { window.dispatchEvent(new CustomEvent('cart:updated')); } catch {}
          }
        } catch {}
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

  function clearPurchasedFromCart(o) {
    try {
      const raw = localStorage.getItem('cart.v1');
      const data = raw ? JSON.parse(raw) : {};
      if (!data || typeof data !== 'object') return;
      let mutated = false;
      // Prefer items[] array if provided
      const items = Array.isArray(o?.items) ? o.items : (Array.isArray(o?.meta?.items) ? o.meta.items : null);
      if (Array.isArray(items) && items.length) {
        for (const it of items) {
          const pid = String(it?.id || it?.productId || '').trim();
          if (!pid) continue;
          if (data[pid]) { delete data[pid]; mutated = true; }
        }
      } else {
        const productId = String(o?.product?.id || o?.product?.productId || '').trim();
        if (productId && data[productId]) { delete data[productId]; mutated = true; }
      }
      if (mutated) {
        localStorage.setItem('cart.v1', JSON.stringify(data));
      }
    } catch {}
  }

  // Safety: when success modal opens with PAID, ensure cart is cleared once
  useEffect(() => {
    if (!showSuccess || !isPaidStatus(order?.status) || !order?.id) return;
    try {
      const clearedKey = 'cart.cleared.orderId';
      const already = localStorage.getItem(clearedKey);
      if (already !== order.id) {
        clearPurchasedFromCart(order);
        localStorage.setItem(clearedKey, order.id);
        try { window.dispatchEvent(new CustomEvent('cart:updated')); } catch {}
      }
    } catch {}
  }, [showSuccess, order?.status, order?.id]);

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

  const seenPaidRef = useRef(false);
  const visRef = useRef(document.visibilityState !== 'hidden');
  useEffect(() => {
    if (!order?.id) return;
    if (isTerminalStatus(order?.status) && seenPaidRef.current) return; // stop after confirming PAID once
    const tick = async () => {
      const o = await refresh();
      const nowTerminal = isTerminalStatus(o?.status || order?.status);
      if (isPaidStatus(o?.status || order?.status)) seenPaidRef.current = true;
      if (nowTerminal && seenPaidRef.current) {
        if (timerRef.current) clearInterval(timerRef.current);
      }
    };
    const start = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      const delay = visRef.current ? 2000 : 8000;
      timerRef.current = setInterval(tick, delay);
    };
    tick();
    start();
    const onVis = () => { visRef.current = document.visibilityState !== 'hidden'; start(); };
    window.addEventListener('visibilitychange', onVis);
    return () => { if (timerRef.current) clearInterval(timerRef.current); window.removeEventListener('visibilitychange', onVis); };
  }, [order?.id, order?.status]);

  useEffect(() => {
    try { const saved = localStorage.getItem('user_upi_id'); if (saved) setUpiId(saved); } catch {}
  }, []);

  // Fetch UPI ID from backend for copy convenience
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/public/upi-id', { cache: 'no-store' });
        if (!r.ok) return;
        const j = await r.json();
        if (!cancelled && j && j.upiId) setUpiId(String(j.upiId));
      } catch {}
    })();
    return () => { cancelled = true; };
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
  const receiptPdfUrl = useMemo(
    () => (order?.publicViewToken ? `/order/${order.publicViewToken}/receipt.pdf` : null),
    [order?.publicViewToken]
  );

  const notify = (msg) => {
    // minimal UX feedback using existing error banner
    try { setError(String(msg || '')); } catch { alert(String(msg || '')); }
    setTimeout(() => setError(''), 1800);
  };

  const viewPdf = () => {
    if (!order?.publicViewToken || !isPaidStatus(order?.status)) {
      notify('PDF available after payment confirmation');
      return;
    }
    window.open(`/order/${encodeURIComponent(order.publicViewToken)}/receipt.pdf`, '_blank', 'noopener');
  };

  // removed print-based legacy receipt generator

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

  // Accessible, scrollable success modal sheet
  const modalRef = useRef(null);
  const lastFocusRef = useRef(null);
  const closeSuccess = () => {
    setShowSuccess(false);
    try { document.body.style.overflow = ''; } catch {}
    try { lastFocusRef.current && lastFocusRef.current.focus && lastFocusRef.current.focus(); } catch {}
  };
  useEffect(() => {
    if (!showSuccess) return;
    try { lastFocusRef.current = document.activeElement; } catch {}
    try { document.body.style.overflow = 'hidden'; } catch {}
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); closeSuccess(); }
      else if (e.key === 'Tab') {
        try {
          const root = modalRef.current;
          if (!root) return;
          const focusables = Array.from(root.querySelectorAll('a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])'));
          if (!focusables.length) return;
          const first = focusables[0];
          const last = focusables[focusables.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        } catch {}
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showSuccess]);

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
      {!!order && !expired && !isTerminalStatus(order?.status) && (
        <div className="text-xs text-gray-600 mb-2">Confirming payment…</div>
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
            <img src="/qr.jpeg" alt="UPI QR" className="w-56 h-56 sm:w-64 sm:h-64 object-contain" />
          </div>

          <div className="rounded-none border bg-white p-4 sm:col-span-2 shadow-sm">
            <div>
              <p className="font-semibold mb-2">Pay via UPI</p>
              <p className="text-xs text-gray-600 mb-3">Scan the QR above with any UPI app and complete the payment. Your order will be confirmed automatically after payment is received. For any queries, contact us on WhatsApp.</p>
              <div className="mt-2 flex items-center gap-2">
                <code className="px-2 py-1 rounded bg-slate-100 border text-sm select-all">{upiId || 'upi-id'}</code>
                <button type="button" onClick={async()=>{ try{ await navigator.clipboard.writeText(upiId);}catch{} }} className="px-3 py-1.5 rounded border text-sm">Copy</button>
                <a href={whatsappLink} target="_blank" rel="noreferrer" className="ml-auto px-3 py-1.5 rounded border text-sm">Contact us on WhatsApp</a>
              </div>
            </div>
          </div>          <div className="rounded-none border bg-white p-4 space-y-2">
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
                <a
                  role="button"
                  onClick={(e) => { e.preventDefault(); viewPdf(); }}
                  href={receiptPdfUrl || '#'}
                  target="_blank"
                  rel="noopener"
                  aria-label="View PDF receipt"
                  className={`px-3 py-2 border text-sm rounded-none inline-flex items-center justify-center ${order?.publicViewToken && isPaidStatus(order?.status) ? 'border-black text-black hover:bg-gray-50' : 'border-gray-300 text-gray-400 cursor-not-allowed'}`}
                  title={order?.publicViewToken && isPaidStatus(order?.status) ? 'Opens in a new tab' : 'PDF available after payment confirmation'}
                >
                  View PDF
                </a>
            </div>
          </div>
        </div>
      )}

      {showSuccess && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby="successTitle">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={closeSuccess} />
          <div className="relative h-[100svh] w-full p-3 sm:p-4 flex items-start justify-center" ref={modalRef}>
            <div className="pointer-events-none absolute inset-0 -z-10">
              {Array.from({ length: 20 }).map((_, i) => (
                <span key={i} className="confetti" style={{ '--i': i, '--c': i % 3 === 0 ? '#22c55e' : i % 3 === 1 ? '#06b6d4' : '#f59e0b' }} />
              ))}
            </div>
            <div className="animate-swipe-in-up rounded-none border border-gray-200 bg-white text-black shadow-2xl max-h-[92svh] flex flex-col overflow-hidden">
              <button aria-label="Close" onClick={closeSuccess} className="absolute top-2 right-2 px-2 py-1 text-sm border rounded-none bg-white/90">✕</button>
              <div className="flex-1 overflow-y-auto px-6 py-8 sm:px-10">
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
                <a className="px-5 py-2.5 rounded-none border border-black text-sm font-semibold text-black hover:-translate-y-0.5 transition" href={whatsappLink} target="_blank" rel="noreferrer">WhatsApp support</a>
              </div>

              <p className="mt-4 text-xs text-gray-600">Need help? Message us on WhatsApp at <strong className="text-gray-700">{SUPPORT_WHATSAPP}</strong> or reply to your confirmation email.</p>
              </div>

              <div className="shrink-0 sticky bottom-0 border-t bg-white/95 backdrop-blur px-4 py-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <a
                    role="button"
                    onClick={(e) => { e.preventDefault(); viewPdf(); }}
                    href={receiptPdfUrl || '#'}
                    target="_blank"
                    rel="noopener"
                    aria-label="View PDF receipt"
                    className={`px-4 py-3 rounded-none border text-sm font-semibold inline-flex items-center justify-center ${order?.publicViewToken && isPaidStatus(order?.status) ? 'border-black text-black hover:bg-gray-50' : 'border-gray-300 text-gray-400 cursor-not-allowed'}`}
                    title={order?.publicViewToken && isPaidStatus(order?.status) ? 'Opens in a new tab' : 'PDF available after payment confirmation'}
                  >
                    View PDF
                  </a>
                  <button onClick={onContinue} className="px-4 py-3 rounded-none bg-black text-white text-sm font-semibold inline-flex items-center justify-center">Continue</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
