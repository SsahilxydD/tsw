import React, { useEffect, useMemo, useRef, useState } from 'react';
import Title from '../components/Title';

const fmt = (p) => (Math.max(0, Number(p) || 0) / 100).toFixed(2);

export default function UPICheckout() {
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const timerRef = useRef(null);

  const qs = useMemo(() => new URLSearchParams(window.location.search), []);
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
        total: data.product?.amountPaise ?? (Number(amountParam) * 100) || 0,
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
          <div className="rounded-md border bg-white/5 p-4 flex items-center justify-center min-h-[320px]">
            {order.currentQr ? (
              <img src={order.currentQr} alt="UPI QR" className="max-w-full" />
            ) : (
              <p className="text-gray-500">No QR available</p>
            )}
          </div>
          <div className="rounded-md border bg-white p-4 space-y-2">
            <p><b>Order:</b> {order.id}</p>
            <p><b>Status:</b> {order.status}</p>
            <p><b>Total:</b> ₹{fmt(order.total)}</p>
            <p><b>Paid:</b> ₹{fmt(order.paid)}</p>
            <p><b>Remaining:</b> ₹{fmt(order.remaining)}</p>
            {order.currentUpiLink && (
              <a href={order.currentUpiLink} target="_blank" rel="noopener" className="inline-block mt-2 px-4 py-2 rounded-md bg-black text-white text-sm">Open UPI App</a>
            )}
            {order.status === 'PARTIAL' && (
              <p className="text-xs text-gray-500 mt-2">Partial payment received. New QR generated for the remainder.</p>
            )}
            {order.status === 'PAID' && (
              <p className="text-green-600 font-medium mt-2">Payment confirmed. Thank you!</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

