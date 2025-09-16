import React from 'react';

function fmtRs(paise) { return `₹${(Math.max(0, Number(paise)||0)/100).toFixed(2)}`; }

export default function Admin() {
  const [orders, setOrders] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [serverNow, setServerNow] = React.useState(null);
  const [error, setError] = React.useState('');

  const fetchOrders = async () => {
    setError('');
    try {
      const r = await fetch('/orders?limit=300', { cache: 'no-store' });
      if (!r.ok) throw new Error(`Failed (${r.status})`);
      const j = await r.json();
      setOrders(Array.isArray(j.orders) ? j.orders : []);
      setServerNow(j.serverNow || null);
    } catch (e) { setError(e.message || 'Failed'); }
    setLoading(false);
  };

  React.useEffect(() => { fetchOrders(); }, []);
  React.useEffect(() => {
    const t = setInterval(fetchOrders, 15000);
    return () => clearInterval(t);
  }, []);

  const action = async (id, path) => {
    try {
      const r = await fetch(`/orders/${id}/${path}`, { method: 'POST' });
      if (!r.ok) throw new Error(`Failed (${r.status})`);
      await fetchOrders();
    } catch (e) { setError(e.message || 'Action failed'); }
  };

  const minutesLeft = (o) => {
    try {
      if (!o.expiresAt || !serverNow) return '-';
      const left = new Date(o.expiresAt).getTime() - new Date(serverNow).getTime();
      if (left <= 0) return '0:00';
      const m = Math.floor(left/60000);
      const s = Math.floor((left%60000)/1000);
      return `${String(m).padStart(1,'0')}:${String(s).padStart(2,'0')}`;
    } catch { return '-'; }
  };

  return (
    <div className="border-t pt-10 px-4 max-w-6xl mx-auto">
      <h1 className="text-xl font-semibold mb-4">Admin Dashboard</h1>
      <div className="mb-4 flex items-center gap-3">
        <button onClick={fetchOrders} className="px-3 py-2 border rounded text-sm">Refresh</button>
        {serverNow && <span className="text-xs text-gray-500">Server: {new Date(serverNow).toLocaleString()}</span>}
      </div>
      {error && <div className="mb-3 text-sm text-red-600">{error}</div>}
      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : (
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-3">Order</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Total</th>
                <th className="py-2 pr-3">Paid</th>
                <th className="py-2 pr-3">Remain</th>
                <th className="py-2 pr-3">Expires In</th>
                <th className="py-2 pr-3">Created</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id} className="border-b last:border-b-0">
                  <td className="py-2 pr-3 font-mono text-xs">{o.id}</td>
                  <td className="py-2 pr-3">{o.status}</td>
                  <td className="py-2 pr-3">{fmtRs(o.totalAmountPaise)}</td>
                  <td className="py-2 pr-3">{fmtRs(o.paidPaise)}</td>
                  <td className="py-2 pr-3">{fmtRs(o.remainingPaise)}</td>
                  <td className="py-2 pr-3 tabular-nums">{minutesLeft(o)}</td>
                  <td className="py-2 pr-3 whitespace-nowrap">{new Date(o.createdAt).toLocaleString()}</td>
                  <td className="py-2 flex flex-wrap gap-2">
                    <button className="px-2 py-1 border rounded text-xs" onClick={() => action(o.id, 'regenerate')}>Regenerate</button>
                    <button className="px-2 py-1 border rounded text-xs" onClick={() => action(o.id, 'expire')}>Expire</button>
                    <button className="px-2 py-1 border rounded text-xs" onClick={() => action(o.id, 'mark-paid')}>Mark Paid</button>
                    {o.currentQr && <a className="px-2 py-1 border rounded text-xs" href={o.currentQr} target="_blank" rel="noreferrer">QR</a>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

