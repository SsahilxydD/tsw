import React from 'react'
import Title from '../components/Title';

function fmtRs(paise, currency = '₹') {
  const n = Math.max(0, Number(paise) || 0) / 100;
  return `${currency}${n.toFixed(2)}`;
}

export default function Orders() {
  const [items, setItems] = React.useState([]);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem('orders.v1');
      const arr = raw ? JSON.parse(raw) : [];
      if (Array.isArray(arr)) {
        const sorted = arr.slice().sort((a, b) => String(b.paidAt || '').localeCompare(String(a.paidAt || '')));
        setItems(sorted);
      }
    } catch {
      setItems([]);
    }
  }, []);

  return (
    <div className='border-t pt-16 px-4 max-w-5xl mx-auto'>
      <div className='text-2xl'>
        <Title text1={'MY'} text2={'ORDERS'} />
      </div>

      {items.length === 0 && (
        <p className='mt-6 text-gray-600'>No paid orders yet. Your receipts will appear here.</p>
      )}

      {items.length > 0 && (
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
