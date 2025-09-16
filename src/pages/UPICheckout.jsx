import React, { useEffect, useMemo, useRef, useState } from 'react';
import Title from '../components/Title';

const fmt = (p) => (Math.max(0, Number(p) || 0) / 100).toFixed(2);

export default function UPICheckout() {
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const timerRef = useRef(null);

  const qs = useMemo(() => new URLSearchParams(window.location.search), []);
  const isIOS = useMemo(() => /iPad|iPhone|iPod/i.test(navigator.userAgent), []);
  const [showApps, setShowApps] = useState(false);
  const [storeSuggest, setStoreSuggest] = useState(null); // { storeUrl, label }
  const amountParam = qs.get('amount');
  const productId = qs.get('productId');
  const metaRef = qs.get('ref') || qs.get('note') || null;
  const redirect = qs.get('redirect');
  const pollMs = Math.max(1500, Math.min(5000, Number(qs.get('pollMs')) || 2000));

  const createOrder = async () => {
    setLoading(true);
    setError('');
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
      setOrder({
        id: data.orderId,
        status: data.status,
        // Parenthesize to avoid mixing ?? with || per esbuild rule
        total: data.product?.amountPaise ?? ((Number(amountParam) * 100) || 0),
        paid: 0,
        remaining: data.remainingPaise ?? 0,
        currentQr: data.qr || null,
        currentUpiLink: data.upiLink || null,
      });
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

      {loading && (
        <p className="text-gray-500">Preparing your order…</p>
      )}

      {!!order && (
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="rounded-md border bg-white/5 p-4 flex items-center justify-center min-h-[300px]">
            {order.currentQr ? (
              <img src={order.currentQr} alt="UPI QR" className="w-56 h-56 sm:w-64 sm:h-64 object-contain" />
            ) : (
              <p className="text-gray-500">No QR available</p>
            )}
          </div>
          {/* Separate UPI app box placed below QR on larger screens */}
          <div className="rounded-md border bg-white p-4 sm:col-span-2">
            <p className="font-medium mb-2">Pay via UPI app</p>
            {order.currentUpiLink ? (
              <button onClick={onOpenUpi} className="inline-block px-4 py-2 rounded-md bg-black text-white text-sm">Open UPI App</button>
            ) : (
              <p className="text-sm text-gray-600">UPI link unavailable</p>
            )}
            {isIOS && showApps && (
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
                    If the app didn't open, tap here to open {storeSuggest.label} in the App Store.
                    <a className="ml-2 underline" href={storeSuggest.storeUrl} target="_blank" rel="noopener">Open App Store</a>
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-2">If nothing happens, open your UPI app and scan the QR above.</p>
              </div>
            )}
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
