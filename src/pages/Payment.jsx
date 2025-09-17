import React, { useContext, useEffect, useMemo } from "react";
import CartSteps from "../components/CartSteps";
import { ShopContext } from "../context/ShopContext";
import CartTotal from "../components/CartTotal";

export default function Payment() {
  const { products, currency, cartItems, address, navigate, getCartCount } = useContext(ShopContext);

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

  // Guard: redirect if no items
  useEffect(() => {
    if (getCartCount && getCartCount() === 0) navigate('/cart');
  }, [getCartCount, navigate]);

  const composeMessage = () => {
    const lines = [];
    lines.push("New order request");
    lines.push("");
    lines.push("*Items:*");
    for (const it of cartList) {
      const p = products.find((pr) => String(pr._id) === String(it._id) || String(pr.slug) === String(it._id));
      if (!p) continue;
      const pid = String(p._id ?? p.slug ?? it._id);
      const url = `${window.location.origin}/product/${pid}`;
      const sizeText = it.size && it.size !== 'std' ? ` (Size: ${String(it.size).replace(/^UK-/, '')})` : '';
      const qtyText = it.quantity > 1 ? ` x${it.quantity}` : '';
      lines.push( `- ${p.name || p.title}${sizeText}${qtyText}`); 
      lines.push(`  ${url}`);
    }
    const total = cartList.reduce((sum, it) => {
      const p = products.find((pr) => String(pr._id) === String(it._id) || String(pr.slug) === String(it._id));
      return sum + (p ? (Number(p.price) || 0) * (Number(it.quantity) || 0) : 0);
    }, 0);
    lines.push("");
    lines.push(`*Total:* ${currency}${total.toLocaleString()}`);
    lines.push("");
    lines.push("*Shipping address:*");
    if (address) {
      // Contact block
      const contact = [];
      const name = `${address.firstName || ''} ${address.lastName || ''}`.trim();
      if (name) contact.push(`Name: ${name}`);
      if (address.phone) contact.push(`Phone: ${address.phone}`);
      if (address.email) contact.push(`Email: ${address.email}`);
      if (contact.length) {
        lines.push("");
        lines.push("*Contact:*");
        lines.push(...contact);
      }

      // Street block
      const street = [];
      if (address.address1) street.push(address.address1);
      if (address.address2) street.push(address.address2);
      if (address.locality || address.landmark) street.push(`Locality: ${address.locality || address.landmark}`);
      if (street.length) {
        lines.push("");
        lines.push("*Address:*");
        lines.push(...street);
      }

      // Locality + country
      const locality = [address.district || address.city, address.state, address.zip].filter(Boolean).join(", ");
      const country = address.country;
      if (locality || country) {
        lines.push("");
        lines.push("*Location:*");
        if (locality) lines.push(locality);
        if (country) lines.push(country);
      }
      // Map link removed; only postal address retained
    }
    lines.push("");
    return lines.join("\n");
  };

  const totalAmount = useMemo(() => {
    return cartList.reduce((sum, it) => {
      const p = products.find((pr) => String(pr._id) === String(it._id) || String(pr.slug) === String(it._id));
      return sum + (p ? (Number(p.price) || 0) * (Number(it.quantity) || 0) : 0);
    }, 0);
  }, [cartList, products]);

  const onPay = () => {
    const redirect = encodeURIComponent('/orders');
    const url = `/upi-checkout?amount=${encodeURIComponent(totalAmount)}&redirect=${redirect}`;
    navigate(url);
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
      <div className="max-w-6xl mx-auto px-4 overflow-x-hidden">
        <h2 className="text-xl font-semibold mb-4">Order Summary</h2>

        <div className="grid sm:grid-cols-3 gap-6">
          <div className="sm:col-span-2 space-y-3">
            {cartList.map((it, idx) => {
              const p = products.find((pr) => String(pr._id) === String(it._id) || String(pr.slug) === String(it._id));
              const cover = Array.isArray(p?.image)
                ? (p.image[0] || '')
                : (Array.isArray(p?.images) ? (p.images[0] || '') : (p?.image || ''));
              return (
                <div key={idx} className="rounded-md border bg-white p-4 sm:p-5 flex items-center gap-4 sm:gap-6 hover:shadow-md transition-all duration-200">
                  <img className="w-20 h-20 rounded-md object-cover border" src={cover} alt="" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm sm:text-base font-medium leading-snug break-words">{p?.name}</p>
                    <div className="mt-2 flex items-center gap-2 flex-wrap text-xs text-gray-600">
                      <span className="px-2 py-1 text-sm font-semibold border rounded-md bg-white">
                        {currency}{p?.price}
                      </span>
                      {it.size && (
                        <span className="px-2 py-1 text-xs border rounded-md bg-slate-50">
                          Size: {String(it.size).replace(/^UK-/, '')}
                        </span>
                      )}
                      {it.quantity > 1 && (
                        <span className="px-2 py-1 text-xs border rounded-md bg-slate-50">Qty: {it.quantity}</span>
                      )}
                    </div>
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
              <div className="mt-2 text-sm text-gray-700 space-y-1 break-words">
                {address && (
                  <>
                    <p className="font-medium">{`${address.firstName || ''} ${address.lastName || ''}`.trim()}</p>
                    {address.phone && <p>Phone: {address.phone}</p>}
                    {address.email && <p>Email: {address.email}</p>}
                    {address.address1 && <p>{address.address1}</p>}
                    {address.address2 && <p>{address.address2}</p>}
                    {address.landmark && <p>Landmark: {address.landmark}</p>}
                    <p>{[address.district || address.city, address.state, address.zip, address.country].filter(Boolean).join(', ')}</p>
                  </>
                )}
              </div>
            </div>
            <div className="rounded-md border bg-white p-4">
              <CartTotal />
            </div>

            {/* UPI payment removed on this page */}
          </div>
        </div>
      </div>
      {/* Keep original gateway CTA to create order and proceed */
      <div className="max-w-6xl mx-auto px-4 mt-8 mb-10">
        <div className="border-t pt-6">
          <button
            type="button"
            onClick={onPay}
            className="w-full sm:w-auto px-6 py-3 rounded-md bg-black text-white text-sm tracking-wide pressable"
          >
            PAY SECURELY
          </button>
        </div>
      </div>
    </div>
  );
}
