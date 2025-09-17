import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

function fmtRs(paise) {
  return `\u20B9${(Math.max(0, Number(paise) || 0) / 100).toFixed(2)}`;
}

export default function Admin() {
  const [orders, setOrders] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [serverNow, setServerNow] = React.useState(null);
  const [error, setError] = React.useState('');
  const [openId, setOpenId] = React.useState(null);
  const [openOrder, setOpenOrder] = React.useState(null);
  const [loadingDetail, setLoadingDetail] = React.useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const redirectToLogin = React.useCallback(() => {
    const next = `${location.pathname}${location.search}`;
    const nextParam = next && next !== '/' ? `?next=${encodeURIComponent(next)}` : '';
    navigate(`/login${nextParam}`, { replace: true });
  }, [navigate, location.pathname, location.search]);

  const fetchOrders = React.useCallback(async () => {
    setError('');
    try {
      const r = await fetch('/admin/api/orders?limit=300', {
        cache: 'no-store',
        credentials: 'include',
      });
      if (r.status === 401) {
        redirectToLogin();
        return;
      }
      if (!r.ok) throw new Error(`Failed (${r.status})`);
      const j = await r.json();
      setOrders(Array.isArray(j.orders) ? j.orders : []);
      setServerNow(j.serverNow || null);
    } catch (e) {
      setError(e.message || 'Failed');
    } finally {
      setLoading(false);
    }
  }, [redirectToLogin]);

  React.useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  React.useEffect(() => {
    const t = setInterval(fetchOrders, 15000);
    return () => clearInterval(t);
  }, [fetchOrders]);

  const action = React.useCallback(async (id, path) => {
    try {
      const r = await fetch(`/admin/api/orders/${id}/${path}`, {
        method: 'POST',
        credentials: 'include',
      });
      if (r.status === 401) {
        redirectToLogin();
        return;
      }
      if (!r.ok) throw new Error(`Failed (${r.status})`);
      await fetchOrders();
      // keep details view fresh if it's the same order
      if (openId === id) {
        try {
          const r2 = await fetch(`/admin/api/orders/${id}`, { credentials: 'include' });
          if (r2.ok) setOpenOrder(await r2.json());
        } catch {}
      }
    } catch (e) {
      setError(e.message || 'Action failed');
    }
  }, [fetchOrders, redirectToLogin, openId]);

  const handleLogout = React.useCallback(async () => {
    try {
      await fetch('/admin/api/logout', { method: 'POST', credentials: 'include' });
    } catch {}
    redirectToLogin();
  }, [redirectToLogin]);

  const minutesLeft = React.useCallback((o) => {
    try {
      if (!o.expiresAt || !serverNow) return '-';
      const left = new Date(o.expiresAt).getTime() - new Date(serverNow).getTime();
      if (left <= 0) return '0:00';
      const m = Math.floor(left / 60000);
      const s = Math.floor((left % 60000) / 1000);
      return `${String(m).padStart(1, '0')}:${String(s).padStart(2, '0')}`;
    } catch {
      return '-';
    }
  }, [serverNow]);

  const displayName = (o) => {
    const name = o?.customer?.name 
      || `${o?.meta?.address?.firstName || ''} ${o?.meta?.address?.lastName || ''}`.trim();
    return name || '(no name)';
  };

  const openDetails = async (o) => {
    setError('');
    if (openId === o.id) {
      setOpenId(null);
      setOpenOrder(null);
      return;
    }
    setOpenId(o.id);
    setLoadingDetail(true);
    try {
      const r = await fetch(`/admin/api/orders/${o.id}`, { credentials: 'include', cache: 'no-store' });
      if (r.status === 401) { redirectToLogin(); return; }
      if (!r.ok) throw new Error(`Failed (${r.status})`);
      const j = await r.json();
      setOpenOrder(j);
    } catch (e) {
      setError(e.message || 'Failed to load details');
      setOpenOrder(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <div className="border-t pt-10 px-4 max-w-6xl mx-auto">
      <h1 className="text-xl font-semibold mb-4">Admin Dashboard</h1>
      <div className="mb-4 flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-3">
          <button onClick={fetchOrders} className="px-3 py-2 border rounded text-sm">Refresh</button>
          {serverNow && (
            <span className="text-xs text-gray-500">Server: {new Date(serverNow).toLocaleString()}</span>
          )}
        </div>
        <button onClick={handleLogout} className="px-3 py-2 border rounded text-sm">Log out</button>
      </div>
      {error && <div className="mb-3 text-sm text-red-600">{error}</div>}
      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-3">Customer</th>
                <th className="py-2 pr-3">Order ID</th>
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
              {orders.map((o) => (
                <React.Fragment key={o.id}>
                  <tr className="border-b last:border-b-0 hover:bg-slate-50 cursor-pointer" onClick={() => openDetails(o)}>
                    <td className="py-2 pr-3">{displayName(o)}</td>
                    <td className="py-2 pr-3 font-mono text-xs">{o.id}</td>
                    <td className="py-2 pr-3">{o.status}</td>
                    <td className="py-2 pr-3">{fmtRs(o.totalAmountPaise)}</td>
                    <td className="py-2 pr-3">{fmtRs(o.paidPaise)}</td>
                    <td className="py-2 pr-3">{fmtRs(o.remainingPaise)}</td>
                    <td className="py-2 pr-3 tabular-nums">{minutesLeft(o)}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">{new Date(o.createdAt).toLocaleString()}</td>
                    <td className="py-2 flex flex-wrap gap-2">
                      <button
                        className="px-2 py-1 border rounded text-xs"
                        onClick={(e) => { e.stopPropagation(); action(o.id, 'regenerate'); }}
                      >
                        Regenerate
                      </button>
                      <button
                        className="px-2 py-1 border rounded text-xs"
                        onClick={(e) => { e.stopPropagation(); action(o.id, 'expire'); }}
                      >
                        Expire
                      </button>
                      <button
                        className="px-2 py-1 border rounded text-xs"
                        onClick={(e) => { e.stopPropagation(); action(o.id, 'mark-paid'); }}
                      >
                        Mark Paid
                      </button>
                      {o.currentQr && (
                        <a className="px-2 py-1 border rounded text-xs" href={o.currentQr} target="_blank" rel="noreferrer" onClick={(e)=>e.stopPropagation()}>
                          QR
                        </a>
                      )}
                      {(
                        <button
                          className="px-2 py-1 border rounded text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            const download = async () => {
                              try {
                                const r = await fetch(`/admin/${encodeURIComponent(o.id)}/receipt.pdf`, { credentials: 'include' });
                                if (!r.ok) {
                                  if (r.status === 404 || r.status === 409) setError('Receipt available after payment.');
                                  else setError('Failed to download receipt');
                                  return;
                                }
                                const blob = await r.blob();
                                const ct = r.headers.get('content-type') || '';
                                if (!/pdf/i.test(ct)) { setError('Failed to download receipt'); return; }
                                const a = document.createElement('a');
                                const url = URL.createObjectURL(blob);
                                a.href = url;
                                a.download = `Order-${o.id}.pdf`;
                                document.body.appendChild(a);
                                a.click();
                                setTimeout(() => { try { URL.revokeObjectURL(url); document.body.removeChild(a); } catch {} }, 500);
                              } catch {
                                setError('Failed to download receipt');
                              }
                            };
                            download();
                          }}
                        >
                          Download PDF
                        </button>
                      )}
                    </td>
                  </tr>
                  {openId === o.id && (
                    <tr className="bg-slate-50 border-b last:border-b-0">
                      <td colSpan={9} className="p-4">
                        {loadingDetail && <div className="text-sm text-gray-600">Loading details...</div>}
                        {!loadingDetail && openOrder && (
                          <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <h3 className="font-semibold text-sm">Order Details</h3>
                              <div className="text-sm text-gray-700 space-y-1">
                                <div><span className="text-gray-500">Order ID:</span> <span className="font-mono text-xs">{openOrder.id}</span></div>
                                <div><span className="text-gray-500">Status:</span> {openOrder.status}</div>
                                <div><span className="text-gray-500">Total:</span> {fmtRs(openOrder.totalAmountPaise)}</div>
                                <div><span className="text-gray-500">Paid:</span> {fmtRs(openOrder.paidPaise)}</div>
                                <div><span className="text-gray-500">Remaining:</span> {fmtRs(openOrder.remainingPaise)}</div>
                                {openOrder.product && (
                                  <div><span className="text-gray-500">Product:</span> {openOrder.product.name}</div>
                                )}
                                {openOrder.currentQr && (
                                  <div><a className="underline" href={openOrder.currentQr} target="_blank" rel="noreferrer">Open QR</a></div>
                                )}
                              </div>
                              <div className="flex gap-2 mt-2">
                                <button className="px-2 py-1 border rounded text-xs" onClick={() => action(openOrder.id, 'regenerate')}>Regenerate</button>
                                <button className="px-2 py-1 border rounded text-xs" onClick={() => action(openOrder.id, 'expire')}>Expire</button>
                                <button className="px-2 py-1 border rounded text-xs" onClick={() => action(openOrder.id, 'mark-paid')}>Mark Paid</button>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <h3 className="font-semibold text-sm">Customer</h3>
                              <div className="text-sm text-gray-700 space-y-1">
                                <div><span className="text-gray-500">Name:</span> {displayName(openOrder)}</div>
                                {openOrder?.customer?.phone || openOrder?.meta?.address?.phone ? (
                                  <div><span className="text-gray-500">Phone:</span> {openOrder.customer?.phone || openOrder.meta.address.phone}</div>
                                ) : null}
                                {openOrder?.customer?.email || openOrder?.meta?.address?.email ? (
                                  <div><span className="text-gray-500">Email:</span> {openOrder.customer?.email || openOrder.meta.address.email}</div>
                                ) : null}
                                {openOrder?.meta?.address && (
                                  <>
                                    {openOrder.meta.address.address1 && <div>{openOrder.meta.address.address1}</div>}
                                    {openOrder.meta.address.address2 && <div>{openOrder.meta.address.address2}</div>}
                                    {openOrder.meta.address.landmark && <div>Landmark: {openOrder.meta.address.landmark}</div>}
                                    <div>{[openOrder.meta.address.locality || openOrder.meta.address.district, openOrder.meta.address.state, openOrder.meta.address.zip, openOrder.meta.address.country].filter(Boolean).join(', ')}</div>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
