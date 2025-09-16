import React, { useMemo } from "react";
import { RECEIPT_POLICIES, SUPPORT_WHATSAPP } from "../constants/store";

const fmt = (p) => (Math.max(0, Number(p) || 0) / 100).toFixed(2);

export default function ReceiptCard({
  order,
  onContinue,
  onCopyOrderId,
  showContinue = true,
  showViewLink = true,
  supportNumber = SUPPORT_WHATSAPP,
  className = "",
}) {
  const addressLines = useMemo(() => {
    if (!order?.address) return [];
    const out = [];
    const { line1, line2, locality, district, state, zip, country } = order.address;
    if (line1) out.push(line1);
    if (line2) out.push(line2);
    const mid = [locality, district, state].filter(Boolean).join(", ");
    if (mid) out.push(mid);
    const tail = [zip, country].filter(Boolean).join(", ");
    if (tail) out.push(tail);
    return out;
  }, [order?.address]);

  const contactLines = useMemo(() => {
    const out = [];
    const name = order?.customer?.name || order?.address?.name;
    if (name) out.push(name);
    const phone = order?.customer?.phone || order?.address?.phone;
    if (phone) out.push(`Phone: ${phone}`);
    const email = order?.customer?.email;
    if (email) out.push(`Email: ${email}`);
    return out;
  }, [order?.customer, order?.address]);

  const whatsappHref = useMemo(() => {
    const digits = String(supportNumber || "").replace(/[^0-9]/g, '') || '919933778870';
    const message = encodeURIComponent(`Hello Solo Wardrobe Team, I have a question about order ${order?.id || ''}`.trim());
    return `https://wa.me/${digits}?text=${message}`;
  }, [supportNumber, order?.id]);

  if (!order) return null;

  const handleCopy = () => {
    if (order?.id && onCopyOrderId) onCopyOrderId(order.id);
  };

  return (
    <div className={`rounded-3xl border border-white/10 bg-slate-900/95 text-slate-100 shadow-2xl backdrop-blur px-6 py-8 sm:px-10 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-emerald-500 text-emerald-950 grid place-content-center shadow-lg">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
        </div>
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Payment received — thank you!</h2>
          <p className="text-sm text-slate-300">Order {order?.id} is confirmed. We’ll keep you posted until it ships.</p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3 text-sm">
        <div className="rounded-xl border border-white/10 bg-slate-800/60 p-4">
          <div className="text-xs uppercase tracking-wide text-slate-400">Order ID</div>
          <div className="mt-1 font-mono text-xs break-all text-slate-100">{order?.id}</div>
          {onCopyOrderId && (
            <button type="button" onClick={handleCopy} className="mt-2 text-xs underline text-slate-300">Copy</button>
          )}
        </div>
        <div className="rounded-xl border border-white/10 bg-slate-800/60 p-4">
          <div className="text-xs uppercase tracking-wide text-slate-400">Total</div>
          <div className="mt-1 text-base font-semibold">₹{fmt(order?.total)}</div>
          <p className="text-xs text-slate-400">Paid: ₹{fmt(order?.paid)}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-slate-800/60 p-4">
          <div className="text-xs uppercase tracking-wide text-slate-400">Status</div>
          <div className="mt-1 text-base font-semibold">{order?.status}</div>
          {order?.dispatchBy && <p className="text-xs text-slate-400">Dispatch ETA: {new Date(order.dispatchBy).toLocaleString()}</p>}
        </div>
        {order?.createdAt && (
          <div className="rounded-xl border border-white/10 bg-slate-800/60 p-4">
            <div className="text-xs uppercase tracking-wide text-slate-400">Placed</div>
            <div className="mt-1 text-sm text-slate-100">{new Date(order.createdAt).toLocaleString()}</div>
          </div>
        )}
        {order?.paidAt && (
          <div className="rounded-xl border border-white/10 bg-slate-800/60 p-4">
            <div className="text-xs uppercase tracking-wide text-slate-400">Paid At</div>
            <div className="mt-1 text-sm text-slate-100">{new Date(order.paidAt).toLocaleString()}</div>
          </div>
        )}
        {order?.remaining > 0 && (
          <div className="rounded-xl border border-amber-400/50 bg-amber-500/10 p-4">
            <div className="text-xs uppercase tracking-wide text-amber-200">Amount Due</div>
            <div className="mt-1 text-sm text-amber-100">₹{fmt(order.remaining)}</div>
            <p className="text-xs text-amber-200/80">Complete the remaining amount to finish your purchase.</p>
          </div>
        )}
        {order?.product?.name && (
          <div className="rounded-xl border border-white/10 bg-slate-800/60 p-4 sm:col-span-3">
            <div className="text-xs uppercase tracking-wide text-slate-400">Product</div>
            <div className="mt-1 font-medium">{order.product.name}</div>
          </div>
        )}
      </div>

      {(contactLines.length > 0 || addressLines.length > 0) && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 text-sm">
          {contactLines.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-slate-800/60 p-4">
              <h3 className="text-sm font-semibold text-slate-100 mb-2">Contact</h3>
              <ul className="space-y-1 text-slate-300">
                {contactLines.map((line, idx) => (
                  <li key={idx}>{line}</li>
                ))}
              </ul>
            </div>
          )}
          {addressLines.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-slate-800/60 p-4">
              <h3 className="text-sm font-semibold text-slate-100 mb-2">Shipping Address</h3>
              <ul className="space-y-1 text-slate-300">
                {addressLines.map((line, idx) => (
                  <li key={idx}>{line}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="mt-8">
        <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wide">Our policies</h3>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {RECEIPT_POLICIES.map((p) => (
            <li key={p.title} className="rounded-2xl border border-white/10 bg-slate-800/60 p-4">
              <div className="font-medium text-slate-100">{p.title}</div>
              <div className="text-xs text-slate-400 mt-1">{p.subtitle}</div>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        {showContinue && onContinue && (
          <button onClick={onContinue} className="px-5 py-2.5 rounded-full bg-white text-slate-900 text-sm font-semibold shadow-sm hover:-translate-y-0.5 transition">Continue</button>
        )}
        {showViewLink && order?.publicViewToken && (
          <a className="px-5 py-2.5 rounded-full border border-white/30 text-sm font-semibold text-slate-100 hover:-translate-y-0.5 transition" href={`/order/${order.publicViewToken}`} target="_blank" rel="noreferrer">View receipt</a>
        )}
        <a className="px-5 py-2.5 rounded-full border border-emerald-400/60 text-sm font-semibold text-emerald-300 hover:-translate-y-0.5 transition" href={whatsappHref} target="_blank" rel="noreferrer">WhatsApp support</a>
      </div>

      <p className="mt-4 text-xs text-slate-400">Need help? Message us on WhatsApp at <strong className="text-slate-200">{supportNumber}</strong> or reply to your confirmation email.</p>
    </div>
  );
}
