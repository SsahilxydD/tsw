(() => {
  const $ = (id) => document.getElementById(id);
  const qs = new URLSearchParams(location.search);

  const productId = qs.get('productId');
  const amount = qs.get('amount');
  const rupees = amount ? parseFloat(amount) : null;
  const metaRef = qs.get('ref') || qs.get('note') || null;
  const pollMs = Math.max(1500, Math.min(5000, Number(qs.get('pollMs')) || 2000));

  const fmt = (p) => (p / 100).toFixed(2);

  const state = {
    orderId: null,
    status: 'PENDING',
    currentQr: null,
    currentUpiLink: null,
    total: 0,
    paid: 0,
    remaining: 0,
  };

  function setError(msg) {
    const el = $('error');
    el.textContent = msg;
    el.classList.remove('hidden');
  }
  function hideError() { $('error').classList.add('hidden'); }

  function render() {
    if (!state.orderId) return;
    $('order').classList.remove('hidden');
    $('orderId').textContent = state.orderId;
    $('status').textContent = state.status;
    $('total').textContent = fmt(state.total);
    $('paid').textContent = fmt(state.paid);
    $('remaining').textContent = fmt(state.remaining);
    $('upiLink').href = state.currentUpiLink || '#';
    if (state.currentQr) {
      $('qr').src = state.currentQr;
      $('qrWrap').classList.remove('hidden');
      $('upiLink').classList.remove('hidden');
    } else {
      $('qrWrap').classList.add('hidden');
      $('upiLink').classList.add('hidden');
    }
    const hint = $('hint');
    if (state.status === 'PARTIAL') hint.textContent = 'Partial payment received. Please scan the new QR to pay the remaining amount.';
    else if (state.status === 'PENDING') hint.textContent = 'Use your UPI app to scan and pay.';
    else hint.textContent = '';
  }

  async function createOrder() {
    const payload = { meta: {} };
    if (productId) payload.productId = productId;
    else if (Number.isFinite(rupees)) payload.amount = rupees;
    if (metaRef) payload.meta.ref = metaRef;
    const resp = await fetch('/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!resp.ok) throw new Error('Failed to create order');
    const data = await resp.json();
    state.orderId = data.orderId;
    state.status = data.status;
    state.currentQr = data.qr;
    state.currentUpiLink = data.upiLink;
    state.total = data.product ? data.product.amountPaise : (Number.isFinite(rupees) ? Math.round(rupees * 100) : 0);
    state.paid = 0;
    state.remaining = data.remainingPaise || state.total;
    render();
  }

  async function refreshOrder() {
    if (!state.orderId) return;
    const resp = await fetch(`/orders/${state.orderId}`);
    if (!resp.ok) return;
    const o = await resp.json();
    state.status = o.status;
    state.currentQr = o.currentQr;
    state.currentUpiLink = o.currentUpiLink;
    state.total = o.totalAmountPaise;
    state.paid = o.paidPaise;
    state.remaining = o.remainingPaise;
    render();
    if (o.status === 'PAID') {
      $('done').classList.remove('hidden');
      $('order').classList.add('hidden');
      const redirect = qs.get('redirect');
      if (redirect) setTimeout(() => location.href = redirect, 1200);
    }
  }

  async function start() {
    try {
      hideError();
      // If productId present, show product info (optional)
      if (productId) {
        try {
          const r = await fetch(`/products/${encodeURIComponent(productId)}`);
          if (r.ok) {
            const p = await r.json();
            const el = $('product');
            el.innerHTML = `<b>${p.name}</b><div>Price: ₹${fmt(p.amountPaise)}</div>`;
            el.classList.remove('hidden');
          }
        } catch {}
      }
      await createOrder();
      render();
      setInterval(refreshOrder, pollMs);
    } catch (e) {
      console.error(e);
      setError(e.message || 'Checkout error');
    }
  }

  document.addEventListener('DOMContentLoaded', start);
})();

