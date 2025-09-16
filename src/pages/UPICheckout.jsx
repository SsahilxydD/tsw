import React, { useEffect, useMemo, useRef, useState } from 'react';
import Title from '../components/Title';

const fmt = (p) => (Math.max(0, Number(p) || 0) / 100).toFixed(2);

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
      // server returns these top-level fields for POST /orders
      // { orderId, upiLink, qr, status, remainingPaise, product, expiresAt, serverNow }
      const created = {
        id: data.orderId,
        status: data.status,
        total: data.product?.amountPaise ?? ((Number(amountParam) * 100) || 0),
        paid: 0,
        remaining: data.remainingPaise ?? 0,
        currentQr: data.qr || null,
        currentUpiLink: data.upiLink || null,
        publicViewToken: data.publicViewToken || null,
      };
      setOrder(created);
      writeOrderId(orderKey, created.id);
      setOidInUrl(created.id);

      // compute and store absolute deadline; start showing time immediately
      const { deadline, left } = computeDeadlineFromServer(data.expiresInMs, data.expiresAt, data.serverNow);
      if (deadline != null) {
        setDeadlineTs(deadline);
        setTimeLeft(left);
      }
    } catch (e) {
      setError(e.message || 'Failed to create order');
    } finally {
      setLoading(false);
    }
  }

  async function fetchOrder(id) {
    const r = await fetch(`/orders/${id}`, { cache: 'no-store' });
    if (!r.ok) throw new Error('Order not found');
    return r.json(); // { ...order, serverNow }
  }

  async function refresh() {
    if (!order?.id) return;
    try {
      const o = await fetchOrder(order.id);
      if (o.status === 'EXPIRED') {
        onExpire();
        return;
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
      }));
      // Re-sync deadline on every poll (handles server-side regen/extension)
      if ((o.expiresAt && o.serverNow) || Number.isFinite(o.expiresInMs)) {
        const { deadline, left } = computeDeadlineFromServer(o.expiresInMs, o.expiresAt, o.serverNow);
        if (deadline != null) {
          setDeadlineTs(deadline);
          setTimeLeft(left);
        }
      }
      if (o.status === 'PAID') {
        setShowSuccess(true);
      }
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
    timerRef.current = setInterval(refresh, pollMs);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.id, pollMs]);

  useEffect(() => {
    try { const saved = localStorage.getItem('user_upi_id'); if (saved) setUpiId(saved); } catch {}
  }, []);

  // Cross-tab hardening: if another tab clears this order id, mark expired here too
  useEffect(() => {
    const onStorage = (e) => {
      try {
        if (!e) return;
        if (e.key !== orderKey) return;
        if (!e.newValue) setExpired(true);
      } catch {}
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [orderKey]);

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

  const onContinue = () => {
    if (redirect) window.location.href = redirect;
    else window.location.href = '/orders';
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
        <div className="rounded-md border border-red-300 text-red-200 bg-red-950/40 p-3 mb-4">
          {String(error)}
        </div>
      )}

      {!!order && !expired && (
        <div className="mb-4 rounded-md border bg-yellow-50 text-yellow-800 px-3 py-2 text-sm flex items-center justify-between">
          <span>Complete payment within 5 minutes</span>
          <span className="font-semibold tabular-nums">
            {deadlineTs ? mmss(timeLeft) : '—:—'}
          </span>
        </div>
      )}

      {expired && (
        <div className="rounded-md border bg-red-50 text-red-800 p-3 mb-4">
          This payment session expired. Please return to your cart to place a new order.
          <div className="mt-2">
            <a href="/cart" className="px-4 py-2 inline-block rounded-md bg-black text-white text-sm">Go to Cart</a>
          </div>
        </div>
      )}

      {loading && <p className="text-gray-500">Preparing your order…</p>}

      {!!order && !expired && (
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="rounded-md border bg-white/5 p-4 flex items-center justify-center min-h-[300px]">
            {order.currentQr ? (
              <img src={order.currentQr} alt="UPI QR" className="w-56 h-56 sm:w-64 sm:h-64 object-contain" />
            ) : (
              <p className="text-gray-500">No QR available</p>
            )}
          </div>

          <div className="rounded-xl border bg-white p-4 sm:col-span-2 shadow-sm">
            <div>
              <p className="font-semibold mb-2">Pay via</p>
              <div className="mb-3 text-xs p-2 rounded border bg-blue-50 text-blue-800">
                Tip: We copied your Order ID to the clipboard. In your UPI app, paste it into the “Add note/message” field before paying so we can auto-verify instantly.
                {copiedOrderId && <span className="ml-2 text-[11px] text-green-600">Order ID copied</span>}
              </div>
              <div className="w-full flex items-center justify-between border rounded-lg px-3 py-3 bg-white shadow-sm">
                <span className="flex items-center gap-2">
                  <span className="inline-grid h-5 w-5 place-content-center rounded border text-gray-500">₹</span>
                  <span className="font-medium">UPI payment</span>
                </span>
                <span className="ml-auto mr-2 text-sm font-semibold">₹{fmt(order.total)}</span>
                <span aria-hidden className="text-gray-500 transition rotate-180">▾</span>
              </div>

              <div className="mt-3">
                <div className="grid grid-cols-4 gap-3">
                  {appDeepLinks.filter(a => ['gpay','phonepe','paytm'].includes(a.key)).map(a => (
                    <button key={a.key} onClick={() => openWithScheme(a.scheme, a.storeUrl, a.label)} className="flex flex-col items-center gap-2">
                      <span className="h-14 w-16 grid place-content-center rounded-xl border shadow-sm bg-white hover:shadow-md active:scale-[0.98] transition">
                        <img src={{ gpay:'/gpay.png', phonepe:'/phonepe.png', paytm:'/paytm.png' }[a.key]} alt={a.label} className="h-8 object-contain" />
                      </span>
                      <span className="text-[11px] text-gray-600">{a.label}</span>
                    </button>
                  ))}
                  {!isIOS && order?.currentUpiLink && (
                    <button key="others" onClick={() => { try { window.location.href = order.currentUpiLink; } catch {} }} className="flex flex-col items-center gap-2">
                      <span className="h-14 w-16 grid place-content-center rounded-xl border shadow-sm bg-white hover:shadow-md active:scale-[0.98] transition">
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
                    className="h-10 px-3 rounded-md border focus-ring"
                  />
                  <button type="button" onClick={verifyUpiId} className="h-10 px-4 rounded-md bg-black text-white text-sm pressable">
                    Verify UPI ID
                  </button>
                </div>
                {upiStatus === 'ok' && <p className="mt-1 text-xs text-green-600">UPI ID looks good. Opening your UPI app…</p>}
                {upiStatus === 'error' && <p className="mt-1 text-xs text-red-600">Enter a valid UPI ID like name@bank.</p>}
                {isIOS && storeSuggest && (
                  <div className="mt-3 p-2 border rounded bg-yellow-50 text-yellow-800 text-xs">
                    If the app didn't open, tap here to open {storeSuggest.label} in the App Store.
                    <a className="ml-2 underline" href={storeSuggest.storeUrl} target="_blank" rel="noopener">Open App Store</a>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-md border bg-white p-4 space-y-2">
            <p>
              <b>Order:</b> {order.id}
              <button type="button" onClick={() => onCopy(order.id)} className="ml-2 px-2 py-0.5 text-xs border rounded">Copy</button>
            </p>
            <p><b>Status:</b> {order.status}</p>
            <p><b>Total:</b> ₹{fmt(order.total)}</p>
            <p><b>Paid:</b> ₹{fmt(order.paid)}</p>
            <p><b>Remaining:</b> ₹{fmt(order.remaining)}</p>
            {order.status === 'PARTIAL' && (
              <p className="text-xs text-gray-500 mt-2">Partial payment received. New QR generated for the remainder.</p>
            )}
            {order.status === 'PAID' && (
              <p className="text-green-600 font-medium mt-2">Payment confirmed. Thank you!</p>
            )}
          </div>
        </div>
      )}

      {showSuccess && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/30 backdrop-blur-[1px] animate-fade-in">
          <div className="relative">
            <div className="pointer-events-none absolute inset-0 -z-10">
              {Array.from({ length: 14 }).map((_, i) => (
                <span key={i} className="confetti" style={{ '--i': i, '--c': i % 3 === 0 ? '#22c55e' : i % 3 === 1 ? '#06b6d4' : '#f59e0b' }} />
              ))}
            </div>
            <div className="max-w-md w-[92vw] sm:w-[520px] rounded-2xl border bg-white shadow-2xl animate-swipe-in-up">
              <div className="p-6 sm:p-8 text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500 text-white grid place-content-center shadow-lg animate-pop">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                </div>
                <h2 className="mt-4 text-xl font-semibold">Payment Received</h2>
                <p className="mt-1 text-gray-600">Thank you! Your order is confirmed.</p>
                <div className="mt-5 grid grid-cols-2 gap-3 text-sm text-left">
                  <div className="rounded-lg border bg-slate-50 p-3">
                    <div className="text-xs text-gray-500">Order ID</div>
                    <div className="font-mono text-xs break-all">{order?.id}</div>
                  </div>
                  <div className="rounded-lg border bg-slate-50 p-3">
                    <div className="text-xs text-gray-500">Amount</div>
                    <div className="font-semibold">₹{fmt(order?.total)}</div>
                  </div>
                  {order?.publicViewToken && (
                    <div className="col-span-2 rounded-lg border bg-slate-50 p-3">
                      <div className="text-xs text-gray-500">Receipt</div>
                      <a className="underline" href={`/order/${order.publicViewToken}`} target="_blank" rel="noreferrer">Open confirmation page</a>
                    </div>
                  )}
                </div>
                <div className="mt-6 flex items-center justify-center gap-3">
                  <button onClick={onContinue} className="px-5 py-2.5 rounded-lg bg-black text-white text-sm pressable">Continue</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
