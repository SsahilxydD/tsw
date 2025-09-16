import React, { useEffect, useMemo, useRef, useState } from 'react';
import Title from '../components/Title';

const fmt = (p) => (Math.max(0, Number(p) || 0) / 100).toFixed(2);

export default function UPICheckout() {
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const timerRef = useRef(null);
  const countdownRef = useRef(null);
  const [expiresAt, setExpiresAt] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [expired, setExpired] = useState(false);

  const qs = useMemo(() => new URLSearchParams(window.location.search), []);
  const isIOS = useMemo(() => /iPad|iPhone|iPod/i.test(navigator.userAgent), []);
  const [showApps, setShowApps] = useState(false);
  const [storeSuggest, setStoreSuggest] = useState(null); // { storeUrl, label }
  const [upiId, setUpiId] = useState('');
  const [upiStatus, setUpiStatus] = useState('idle'); // idle | ok | error
  const amountParam = qs.get('amount');
  const productId = qs.get('productId');
  const metaRef = qs.get('ref') || qs.get('note') || null;
  const redirect = qs.get('redirect');
  const pollMs = Math.max(1500, Math.min(5000, Number(qs.get('pollMs')) || 2000));

  const createOrder = async () => {
    setLoading(true);
    setError('');
    setExpired(false);
    try {
      const payload = { meta: {} };
      if (productId) payload.productId = productId;
      else if (amountParam) payload.amount = Number(amountParam);
      if (metaRef) payload.meta.ref = metaRef;

      const r = await fetch('/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!r.ok) {
        let msg = `Failed (${r.status})`;
        try { const j = await r.json(); if (j && j.error) msg = j.error; } catch {}
        throw new Error(msg);
      }
      const data = await r.json();
      const created = {
        id: data.orderId,
        status: data.status,
        // Parenthesize to avoid mixing ?? with || per esbuild rule
        total: data.product?.amountPaise ?? ((Number(amountParam) * 100) || 0),
        paid: 0,
        remaining: data.remainingPaise ?? 0,
        currentQr: data.qr || null,
        currentUpiLink: data.upiLink || null,
      };
      setOrder(created);
      const now = Date.now();
      const exp = now + 5 * 60 * 1000; // 5 minutes
      setExpiresAt(exp);
      setTimeLeft(exp - now);
    } catch (e) {
      setError(e.message || 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    if (!order?.id) return;
    try {
      const r = await fetch(`/orders/${order.id}`, { cache: 'no-store' });
      if (!r.ok) return;
      const o = await r.json();
      setOrder((prev) => ({
        ...(prev || {}),
        id: o.id,
        status: o.status,
        total: o.totalAmountPaise,
        paid: o.paidPaise,
        remaining: o.remainingPaise,
        currentQr: o.currentQr,
        currentUpiLink: o.currentUpiLink,
      }));
      if (o.status === 'PAID' && redirect) {
        setTimeout(() => { window.location.href = redirect; }, 1000);
      }
    } catch {}
  };

  useEffect(() => {
    createOrder();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!order?.id) return;
    timerRef.current = setInterval(refresh, pollMs);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.id, pollMs]);

  // Prefill saved UPI ID once
  useEffect(() => {
    try { const saved = localStorage.getItem('user_upi_id'); if (saved) setUpiId(saved); } catch {}
  }, []);

  // Countdown towards expiry
  useEffect(() => {
    if (!order?.id || !expiresAt) return;
    if (countdownRef.current) clearInterval(countdownRef.current);
    const update = () => {
      const now = Date.now();
      const left = Math.max(0, (expiresAt - now));
      setTimeLeft(left);
      if (left <= 0) {
        clearInterval(countdownRef.current);
        onExpire();
      }
    };
    update();
    countdownRef.current = setInterval(update, 1000);
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [order?.id, expiresAt]);

  useEffect(() => {
    if (order?.status === 'PAID' && countdownRef.current) {
      clearInterval(countdownRef.current);
    }
  }, [order?.status]);

  const onExpire = () => {
    try { if (timerRef.current) clearInterval(timerRef.current); } catch {}
    setExpired(true);
    setShowApps(false);
    setStoreSuggest(null);
    setOrder(null);
  };

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
    const qs = (o) => Object.entries(o).map(([k,v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v||'')}`).join('&');
    return [
      {
        key: 'gpay', label: 'Google Pay',
        scheme: `tez://upi/pay?${qs(q)}`,
        storeUrl: 'https://apps.apple.com/in/app/google-pay-upi-money-transfers/id1193357041'
      },
      {
        key: 'phonepe', label: 'PhonePe',
        scheme: `phonepe://upi/pay?${qs(q)}`,
        storeUrl: 'https://apps.apple.com/in/app/phonepe-secure-payments-app/id1170055821'
      },
      {
        key: 'paytm', label: 'Paytm',
        scheme: `paytmmp://pay?${qs(q)}`,
        storeUrl: 'https://apps.apple.com/in/app/paytm-secure-upi-payments/id473941634'
      },
      {
        key: 'bhim', label: 'BHIM',
        scheme: `bhim://upi/pay?${qs(q)}`,
        storeUrl: 'https://apps.apple.com/in/app/bhim-making-india-cashless/id1172681203'
      },
    ];
  }, [order?.currentUpiLink]);

  const appIcons = useMemo(() => ({
    gpay: '/gpay.png',
    phonepe: '/phonepe.png',
    paytm: '/paytm.png',
  }), []);

  const launchPayment = () => {
    if (!order?.currentUpiLink) return;
    if (isIOS) {
      const prefs = ['gpay','phonepe','paytm'];
      const first = appDeepLinks.find(a => prefs.includes(a.key)) || appDeepLinks[0];
      if (first) openWithScheme(first.scheme, first.storeUrl, first.label);
    } else {
      // Android and desktop: generic UPI intent triggers system app picker
      window.location.href = order.currentUpiLink;
    }
  };

  const verifyUpiId = () => {
    const v = String(upiId || '').trim();
    // Very permissive VPA format validation: local-part@handle
    const ok = /^[A-Za-z0-9._-]{2,}@[A-Za-z][A-Za-z0-9._-]{2,}$/.test(v);
    setUpiStatus(ok ? 'ok' : 'error');
    try { if (ok) localStorage.setItem('user_upi_id', v); } catch {}
    if (ok) {
      // Immediately launch into payment flow with preferred path
      launchPayment();
    }
  };

  const openWithScheme = (scheme, storeUrl, label) => {
    try {
      setStoreSuggest(null);
      let wentBackground = false;
      const clear = () => { try { clearTimeout(timer); } catch {} };
      const onVis = () => { if (document.hidden) { wentBackground = true; clear(); } };
      window.addEventListener('visibilitychange', onVis, { once: true });
      window.addEventListener('pagehide', clear, { once: true });
      window.addEventListener('blur', clear, { once: true });
      const timer = setTimeout(() => {
        if (!wentBackground) setStoreSuggest({ storeUrl, label });
      }, 2200);
      window.location.href = scheme;
    } catch {
      setStoreSuggest({ storeUrl, label });
    }
  };

  const onOpenUpi = (e) => {
    e.preventDefault();
    if (!order?.currentUpiLink) return;
    if (isIOS) {
      setShowApps(true);
    } else {
      // Android and desktop: use generic UPI link; Android shows app picker
      window.location.href = order.currentUpiLink;
    }
  };

  const onCopy = async (text) => {
    try { await navigator.clipboard.writeText(text); setError(''); } catch { /* ignore */ }
  };

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

      {!!order && expiresAt && !expired && (
        <div className="mb-4 rounded-md border bg-yellow-50 text-yellow-800 px-3 py-2 text-sm flex items-center justify-between">
          <span>Complete payment within 5 minutes</span>
          <span className="font-semibold tabular-nums">
            {String(Math.floor(timeLeft/60000)).padStart(2,'0')}:{String(Math.floor((timeLeft%60000)/1000)).padStart(2,'0')}
          </span>
        </div>
      )}

      {expired && (
        <div className="rounded-md border bg-red-50 text-red-800 p-3 mb-4">
          This payment session expired. Generate a fresh QR to continue.
          <div className="mt-2">
            <button onClick={createOrder} className="px-4 py-2 rounded-md bg-black text-white text-sm">Create New QR</button>
          </div>
        </div>
      )}

      {loading && (
        <p className="text-gray-500">Preparing your order…</p>
      )}

      {!!order && !expired && (
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="rounded-md border bg-white/5 p-4 flex items-center justify-center min-h-[300px]">
            {order.currentQr ? (
              <img src={order.currentQr} alt="UPI QR" className="w-56 h-56 sm:w-64 sm:h-64 object-contain" />
            ) : (
              <p className="text-gray-500">No QR available</p>
            )}
          </div>
          {/* Unified UPI app box for both iOS and Android */}
          <div className="rounded-xl border bg-white p-4 sm:col-span-2 shadow-sm">
            <div>
              <p className="font-semibold mb-2">Pay via</p>
              {/* Header row styled like a dropdown but always expanded */}
              <div className="w-full flex items-center justify-between border rounded-lg px-3 py-3 bg-white shadow-sm">
                <span className="flex items-center gap-2">
                  <span className="inline-grid h-5 w-5 place-content-center rounded border text-gray-500">₹</span>
                  <span className="font-medium">UPI payment</span>
                </span>
                <span className="ml-auto mr-2 text-sm font-semibold">₹{fmt(order.total)}</span>
                <span aria-hidden className="text-gray-500 transition rotate-180">▾</span>
              </div>
              {/* Always visible options */}
              <div className="mt-3">
                <div className="grid grid-cols-4 gap-3">
                  {appDeepLinks.filter(a=>['gpay','phonepe','paytm'].includes(a.key)).map((a) => (
                    <button
                      key={a.key}
                      onClick={() => openWithScheme(a.scheme, a.storeUrl, a.label)}
                      className="flex flex-col items-center gap-2"
                    >
                      <span className="h-14 w-16 grid place-content-center rounded-xl border shadow-sm bg-white hover:shadow-md active:scale-[0.98] transition">
                        <img src={appIcons[a.key]} alt={a.label} className="h-8 object-contain"/>
                      </span>
                      <span className="text-[11px] text-gray-600">{a.label}</span>
                    </button>
                  ))}
                  {!isIOS && order?.currentUpiLink && (
                    <button
                      key="others"
                      onClick={() => { try { window.location.href = order.currentUpiLink; } catch {} }}
                      className="flex flex-col items-center gap-2"
                    >
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
                  <button
                    type="button"
                    onClick={verifyUpiId}
                    className="h-10 px-4 rounded-md bg-black text-white text-sm pressable"
                  >
                    Verify UPI ID
                  </button>
                </div>
                {upiStatus === 'ok' && (
                  <p className="mt-1 text-xs text-green-600">UPI ID looks good. Opening your UPI app…</p>
                )}
                {upiStatus === 'error' && (
                  <p className="mt-1 text-xs text-red-600">Enter a valid UPI ID like name@bank.</p>
                )}
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
            <p><b>Order:</b> {order.id}</p>
            <p><b>Status:</b> {order.status}</p>
            <p><b>Total:</b> ₹{fmt(order.total)}</p>
            <p><b>Paid:</b> ₹{fmt(order.paid)}</p>
            <p><b>Remaining:</b> ₹{fmt(order.remaining)}</p>
            {false && (
              <button onClick={onOpenUpi} className="inline-block mt-2 px-4 py-2 rounded-md bg-black text-white text-sm">Open UPI App</button>
            )}
            {order.status === 'PARTIAL' && (
              <p className="text-xs text-gray-500 mt-2">Partial payment received. New QR generated for the remainder.</p>
            )}
            {order.status === 'PAID' && (
              <p className="text-green-600 font-medium mt-2">Payment confirmed. Thank you!</p>
            )}
            {/* iOS app chooser */}
            {false && (
              <div className="mt-3 border-t pt-3">
                <p className="text-sm text-gray-700 mb-2">Open with:</p>
                <div className="flex flex-wrap gap-2">
                  {appDeepLinks.map((a) => (
                    <button key={a.key} onClick={() => openWithScheme(a.scheme, a.storeUrl, a.label)} className="px-3 py-2 text-sm border rounded hover:bg-gray-50">
                      {a.label}
                    </button>
                  ))}
                  <button onClick={() => onCopy(order.currentUpiLink)} className="px-3 py-2 text-sm border rounded">Copy UPI link</button>
                </div>
                {storeSuggest && (
                  <div className="mt-2 p-2 border rounded bg-yellow-50 text-yellow-800 text-xs">
                    If the app didn’t open, tap here to open {storeSuggest.label} in the App Store.
                    <a className="ml-2 underline" href={storeSuggest.storeUrl} target="_blank" rel="noopener">Open App Store</a>
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-2">If nothing happens, open your UPI app and scan the QR above.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
