import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReceiptCard from '../components/ReceiptCard';

export default function OrderReceipt() {
  const { token } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const r = await fetch(`/api/order/${encodeURIComponent(token)}`, { cache: 'no-store' });
        if (!r.ok) {
          const msg = r.status === 404 ? 'Receipt not available for this order.' : `Failed (${r.status})`;
          throw new Error(msg);
        }
        const data = await r.json();
        if (!data?.order) throw new Error('Invalid receipt payload');
        if (data.order.status !== 'PAID') {
          throw new Error('Receipt not available for this order.');
        }
        setOrder({
          id: data.order.id,
          status: data.order.status,
          total: data.order.totalAmountPaise,
          paid: data.order.paidPaise,
          remaining: data.order.remainingPaise,
          product: data.order.product,
          customer: data.order.customer,
          address: data.order.address,
          publicViewToken: data.order.publicViewToken,
          dispatchBy: data.order.dispatchBy,
          createdAt: data.order.createdAt,
          paidAt: data.order.paidAt,
        });
      } catch (err) {
        setError(err.message || 'Failed to load receipt');
      } finally {
        setLoading(false);
      }
    }
    if (token) load();
  }, [token]);

  return (
    <div className="border-t pt-12 pb-16 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Order receipt</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Keep this for your records. We’ve also emailed it to you.</p>
        </div>

        {loading && <p className="text-sm text-slate-500">Loading receipt...</p>}
        {error && !loading && (
          <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
            {error}
            <div className="mt-2"><Link className="underline" to="/">Return to home</Link></div>
          </div>
        )}
        {!loading && !error && order && (
          <ReceiptCard
            order={order}
            showContinue={false}
            showViewLink={false}
            className="bg-slate-900 text-slate-100"
          />
        )}
      </div>
    </div>
  );
}
