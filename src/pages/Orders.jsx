import React from 'react'
import Title from '../components/Title';

function fmtRs(paise, currency = '₹') {
  const n = Math.max(0, Number(paise) || 0) / 100;
  return `${currency}${n.toFixed(2)}`;
}

export default function Orders() {
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const merge = (a, b) => {
      const map = new Map();
      for (const it of [...a, ...b]) {
        if (!it) continue;
        const key = it.token || it.url || it.id;
        if (!map.has(key)) map.set(key, it);
      }
      return Array.from(map.values());
    };
    const fromLocal = () => {
      try {
        const raw = localStorage.getItem('orders.v1');
        const arr = raw ? JSON.parse(raw) : [];
        return Array.isArray(arr) ? arr : [];
      } catch { return []; }
    };
    const init = async () => {
      setLoading(true);
      const localArr = fromLocal();
      try {
        const r = await fetch('/public/my-orders', { cache: 'no-store', credentials: 'include' });
        let serverArr = [];
        if (r.ok) {
          const j = await r.json();
          serverArr = Array.isArray(j.orders) ? j.orders.map(o => ({
            id: o.id,
            token: o.token,
            url: o.receiptUrl,
            amountPaise: o.totalAmountPaise,
            paidAt: o.paidAt,
            createdAt: o.createdAt,
          })) : [];
        }
        const combined = merge(serverArr, localArr)
          .sort((a, b) => String(b.paidAt || '').localeCompare(String(a.paidAt || '')));
        setItems(combined);
      } catch {
        const fallback = localArr.sort((a, b) => String(b.paidAt || '').localeCompare(String(a.paidAt || '')));
        setItems(fallback);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  return (
    <div className='border-t pt-16 px-4 max-w-5xl mx-auto'>
      <div className='text-2xl'>
        <Title text1={'MY'} text2={'ORDERS'} />
      </div>

      {loading && <p className='mt-6 text-gray-600'>Loading your orders…</p>}

      {!loading && items.length === 0 && (
        <p className='mt-6 text-gray-600'>No paid orders yet. Your receipts will appear here.</p>
      )}

      {!loading && items.length > 0 && (
        <div className='mt-4 divide-y'>
          {items.map((it, idx) => (
            <div key={idx} className='py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
              <div className='min-w-0'>
                <div className='text-sm text-gray-500'>Order ID</div>
                <div className='font-mono text-sm break-all'>{it.id}</div>
                <div className='mt-1 text-xs text-gray-500'>Paid: {it.paidAt ? new Date(it.paidAt).toLocaleString() : '—'}</div>
              </div>
              <div className='flex items-center gap-4'>
                <div className='text-sm font-semibold'>{fmtRs(it.amountPaise)}</div>
                {it.url && (
                  <a href={it.url} className='border px-4 py-2 text-sm rounded-sm hover:bg-gray-50' target='_blank' rel='noreferrer'>View receipt</a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
