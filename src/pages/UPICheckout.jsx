import React, { useEffect, useMemo, useState } from 'react';
import Title from '../components/Title';
import { slugify, slugCategory } from '../utils/slug';

export default function UPICheckout() {
  const qs = useMemo(() => new URLSearchParams(window.location.search), []);
  const amountParam = qs.get('amount');
  const metaRef = qs.get('ref') || qs.get('note') || null;
  const [waHref, setWaHref] = useState('');
  const [err, setErr] = useState('');

  async function buildClientItemsFromLocal() {
    try {
      const raw = localStorage.getItem('cart.v1');
      const cart = raw ? JSON.parse(raw) : null;
      if (!cart || typeof cart !== 'object') return [];
      const endpoints = ['/products.json', '/data/products.json'];
      let list = [];
      for (const url of endpoints) {
        try {
          const r = await fetch(url, { cache: 'no-store' });
          if (!r.ok) continue;
          const j = await r.json();
          list = Array.isArray(j) ? j : (Array.isArray(j?.products) ? j.products : []);
          if (list) break;
        } catch {}
      }
      const byId = new Map();
      for (const p of Array.isArray(list) ? list : []) {
        const pid = String(p._id ?? p.slug ?? p.id ?? '');
        if (pid) byId.set(pid, p);
      }
      const items = [];
      const rupeesToPaise = (n) => Math.round(Math.max(0, Number(n) || 0) * 100);
      for (const pid of Object.keys(cart)) {
        const sizes = cart[pid] || {};
        const p = byId.get(String(pid));
        const title = String(p?.name || p?.title || pid);
        const unitPaise = (p && (p.price != null)) ? rupeesToPaise(p.price) : 0;
        for (const size of Object.keys(sizes)) {
          const qty = Math.max(1, parseInt(sizes[size] || 1, 10));
          items.push({ productId: pid, title, size, qty, unitAmountPaise: unitPaise, category: p?.category });
        }
      }
      return items;
    } catch { return []; }
  }

  const buildWaMessage = async () => {
    try {
      const items = await buildClientItemsFromLocal();
      const lines = [];
      lines.push('New order request');
      lines.push('');
      if (Array.isArray(items) && items.length > 0) {
        lines.push('*Items:*');
        for (const it of items) {
          const url = it?.productId ? `${window.location.origin}/category/${slugCategory(it.category||"")}/${slugify(it.title||"")}` : '';
          const sizeText = it?.size ? ` (Size: ${String(it.size).replace(/^UK-/, '')})` : '';
          const qtyText = it?.qty > 1 ? ` x${it.qty}` : '';
          lines.push(`- ${it?.title || 'Item'}${sizeText}${qtyText}`);
          if (url) lines.push(`  ${url}`);
        }
      }
      const totalPaise = items.reduce((s, it) => s + Math.max(0, Number(it?.unitAmountPaise) || 0) * Math.max(1, Number(it?.qty) || 1), 0);
      const total = (totalPaise / 100).toFixed(2);
      lines.push('');
      lines.push(`*Total:* ₹ ${Number(total).toLocaleString()}`);
      if (amountParam && !items.length) lines.push('(Custom amount)');
      try {
        const addrRaw = localStorage.getItem('addr.v1');
        const addr = addrRaw ? JSON.parse(addrRaw) : null;
        if (addr) {
          lines.push('');
          lines.push('*Shipping address:*');
          const contact = [];
          const name = `${addr.firstName || ''} ${addr.lastName || ''}`.trim();
          if (name) contact.push(`Name: ${name}`);
          if (addr.phone) contact.push(`Phone: ${addr.phone}`);
          if (addr.email) contact.push(`Email: ${addr.email}`);
          if (contact.length) { lines.push(''); lines.push('*Contact:*'); lines.push(...contact); }
          const street = [];
          if (addr.address1) street.push(addr.address1);
          if (addr.address2) street.push(addr.address2);
          if (addr.locality || addr.landmark) street.push(`Locality: ${addr.locality || addr.landmark}`);
          if (street.length) { lines.push(''); lines.push('*Address:*'); lines.push(...street); }
          const locality = [addr.district || addr.city, addr.state, addr.zip].filter(Boolean).join(', ');
          const country = addr.country;
          if (locality || country) { lines.push(''); lines.push('*Location:*'); if (locality) lines.push(locality); if (country) lines.push(country); }
        }
      } catch {}
      if (metaRef) { lines.push(''); lines.push(`Ref: ${metaRef}`); }
      lines.push('');
      return lines.join('\n');
    } catch { return 'New order request'; }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const message = await buildWaMessage();
        const digits = '919933778870';
        const href = `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
        const fb = `https://api.whatsapp.com/send?phone=${digits}&text=${encodeURIComponent(message)}`;
        if (!cancelled) setWaHref(href);
        try {
          const win = window.open(href, '_blank', 'noopener,noreferrer');
          setTimeout(() => {
            try { if (!win || win.closed) window.location.href = fb; } catch { window.location.href = fb; }
          }, 350);
        } catch {
          window.location.href = href;
        }
      } catch (e) {
        setErr(String(e?.message || ''));
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="border-t pt-10 px-4 max-w-3xl mx-auto">
      <div className="mb-4">
        <Title text1="OPENING" text2="WHATSAPP" />
      </div>
      <p className="text-gray-700 text-sm">We are redirecting you to WhatsApp with your order summary.</p>
      {err && <p className="text-red-600 text-sm mt-2">{err}</p>}
      <div className="mt-4 flex gap-3">
        {waHref && (
          <a className="px-4 py-2 rounded bg-black text-white text-sm" href={waHref} target="_blank" rel="noreferrer">Continue on WhatsApp</a>
        )}
        <a className="px-4 py-2 rounded border text-sm" href="/cart">Back to Cart</a>
      </div>
    </div>
  );
}
