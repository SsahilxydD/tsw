import React, { useContext, useMemo } from "react";
import CartSteps from "../components/CartSteps";
import { ShopContext } from "../context/ShopContext";
import CartTotal from "../components/CartTotal";
import CartStickyBar from "../components/CartStickyBar";

export default function Payment() {
  const { products, currency, cartItems, address, navigate } = useContext(ShopContext);

  const cartList = useMemo(() => {
    const out = [];
    for (const id in cartItems) {
      for (const size in cartItems[id]) {
        const qty = cartItems[id][size];
        if (qty > 0) out.push({ _id: id, size, quantity: qty });
      }
    }
    return out;
  }, [cartItems]);

  const composeMessage = () => {
    const lines = [];
    lines.push("New order request");
    lines.push("");
    lines.push("Items:");
    for (const it of cartList) {
      const p = products.find((pr) => String(pr._id) === String(it._id) || String(pr.slug) === String(it._id));
      if (!p) continue;
      const pid = String(p._id ?? p.slug ?? it._id);
      const url = `${window.location.origin}/product/${pid}`;
      const sizeText = it.size && it.size !== 'std' ? ` (Size: ${it.size})` : '';
      const qtyText = it.quantity > 1 ? ` x${it.quantity}` : '';
      lines.push(`• ${p.name || p.title}${sizeText}${qtyText}`);
      lines.push(`  ${url}`);
    }
    const total = cartList.reduce((sum, it) => {
      const p = products.find((pr) => String(pr._id) === String(it._id) || String(pr.slug) === String(it._id));
      return sum + (p ? (Number(p.price) || 0) * (Number(it.quantity) || 0) : 0);
    }, 0);
    lines.push("");
    lines.push(`Total: ${currency}${total.toLocaleString()}`);
    lines.push("");
    lines.push("Shipping address:");
    if (address) {
      const name = `${address.firstName || ''} ${address.lastName || ''}`.trim();
      lines.push(name);
      lines.push(address.phone ? `Phone: ${address.phone}` : "");
      lines.push(address.email ? `Email: ${address.email}` : "");
      if (address.address1) lines.push(address.address1);
      if (address.address2) lines.push(address.address2);
      if (address.landmark) lines.push(`Landmark: ${address.landmark}`);
      const addrParts = [address.city, address.state, address.zip, address.country].filter(Boolean);
      if (addrParts.length) lines.push(addrParts.join(", "));
    }
    lines.push("");
    lines.push("Please confirm availability and payment options. Thanks!");
    return lines.filter(Boolean).join("\n");
  };

  const onWhatsApp = () => {
    const msg = composeMessage();
    const href = `https://wa.me/919933778870?text=${encodeURIComponent(msg)}`;
    window.open(href, '_blank', 'noopener');
  };

  if (cartList.length === 0) {
    return (
      <div className="border-t pt-14 px-4 max-w-6xl mx-auto">
        <CartSteps active="payment" />
        <p className="mt-6 text-gray-600">Your bag is empty.</p>
      </div>
    );
  }

  return (
    <div className="border-t pt-14">
      <div className="mb-5">
        <CartSteps active="payment" />
      </div>
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-xl font-semibold mb-4">Order Summary</h2>

        <div className="grid sm:grid-cols-3 gap-6">
          <div className="sm:col-span-2 space-y-3">
            {cartList.map((it, idx) => {
              const p = products.find((pr) => String(pr._id) === String(it._id) || String(pr.slug) === String(it._id));
              const cover = Array.isArray(p?.image)
                ? (p.image[0] || '')
                : (Array.isArray(p?.images) ? (p.images[0] || '') : (p?.image || ''));
              return (
                <div key={idx} className="rounded-md border bg-white p-4 flex items-center gap-4">
                  <img className="w-16 h-16 rounded-md object-cover border" src={cover} alt="" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p?.name}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {currency}{p?.price} {it.size && <span className="ml-2">Size: {it.size}</span>} {it.quantity > 1 && <span className="ml-2">Qty: {it.quantity}</span>}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="sm:col-span-1">
            <div className="rounded-md border bg-white p-4 mb-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Shipping Address</h3>
                <button className="text-xs underline" onClick={() => navigate('/address')}>Edit</button>
              </div>
              <div className="mt-2 text-sm text-gray-700 space-y-1">
                {address && (
                  <>
                    <p className="font-medium">{`${address.firstName || ''} ${address.lastName || ''}`.trim()}</p>
                    {address.phone && <p>Phone: {address.phone}</p>}
                    {address.email && <p>Email: {address.email}</p>}
                    <p>{[address.street, address.city, address.state, address.zip, address.country].filter(Boolean).join(', ')}</p>
                  </>
                )}
              </div>
            </div>

            <CartTotal />
          </div>
        </div>
      </div>

      <CartStickyBar
        totalText={`Total: ${currency}${cartList.reduce((s,it)=>{const p=products.find(pr=>String(pr._id)===String(it._id)||String(pr.slug)===String(it._id));return s+(p? (Number(p.price)||0)*(Number(it.quantity)||0):0)},0).toLocaleString()}`}
        buttonText="PLACE ORDER ON WHATSAPP"
        onClick={onWhatsApp}
      />
    </div>
  );
}
