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
    const fromLocal = () => {
      try {
        const raw = localStorage.getItem('orders.v1');
        const arr = raw ? JSON.parse(raw) : [];
        return Array.isArray(arr) ? arr : [];
      } catch { return []; }
    };
    setLoading(true);
    const localArr = fromLocal().sort((a, b) => String(b.paidAt || '').localeCompare(String(a.paidAt || '')));
    setItems(localArr);
    setLoading(false);
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
          {items.map((it, idx) => {
            const first = (it.lineItems && it.lineItems[0]) || null;
            const more = Math.max(0, (it.lineItems?.length || 0) - 1);
            const thumb = first?.imageUrl || '/favicon.png';
            return (
              <div key={idx} className='py-4 flex items-center gap-3 sm:gap-4'>
                <div className='flex items-center gap-2'>
                  <img src={thumb} alt={first?.title || 'Product'} className='w-16 h-16 object-cover border rounded-sm' loading='lazy' />
                  {more > 0 && (
                    <div className='w-16 h-16 grid place-content-center border rounded-sm text-xs text-gray-600 bg-white'>+{more}</div>
                  )}
                </div>
                <div className='flex-1 min-w-0'>
                  <div className='font-medium text-sm truncate'>{first?.title || 'Custom payment'}{more > 0 ? ` and ${more} more` : ''}</div>
                  <div className='text-xs text-gray-500 mt-0.5'>Placed: {it.createdAt ? new Date(it.createdAt).toLocaleString() : '—'} • Status: {it.status || '—'}</div>
                </div>
                <div className='flex items-center gap-2 sm:gap-3'>
                  <div className='text-sm font-semibold'>{fmtRs(it.amountPaise)}</div>
                  {/* Server-based receipt links removed in frontend-only mode */}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
