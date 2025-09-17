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
            token: o.publicViewToken || o.token,
            downloadUrl: (o.publicViewToken || o.token) ? `/order/${o.publicViewToken || o.token}/receipt.pdf` : null,
            amountPaise: o.totalAmountPaise,
            paidAt: o.paidAt,
            createdAt: o.createdAt,
            status: o.status,
            lineItems: Array.isArray(o.lineItems) ? o.lineItems : [],
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
                  {it.token && (
                    <>
                      <a href={`/order/${it.token}`} className='border px-3 py-1.5 text-sm rounded-sm hover:bg-gray-50'>View details</a>
                      <a href={`/order/${it.token}/receipt.pdf`} target='_blank' rel='noopener' className='border px-3 py-1.5 text-sm rounded-sm hover:bg-gray-50'>View PDF</a>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
