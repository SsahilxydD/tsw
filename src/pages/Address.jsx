import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import CartSteps from "../components/CartSteps";
import { ShopContext } from "../context/ShopContext";

const EMPTY = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  address1: "",
  address2: "",
  locality: "",
  district: "",
  state: "",
  zip: "",
  country: "India",
};

export default function Address() {
  const { address, setAddress, navigate, getCartCount, cartItems, products, currency } = useContext(ShopContext);
  const [form, setForm] = useState(address || EMPTY);
  const [errors, setErrors] = useState({});
  const refs = useRef({});
  const [zipLookupMsg, setZipLookupMsg] = useState("");
  const [zipLoading, setZipLoading] = useState(false);
  const zipAbortRef = useRef(null);
  const [zipValid, setZipValid] = useState(false);
  const zipDebounceRef = useRef(null);
  const [zipResolvedFor, setZipResolvedFor] = useState("");

  // Build cart list for display and message
  const cartList = useMemo(() => {
    const out = [];
    for (const id in cartItems) {
      for (const size in cartItems[id]) {
        const qty = cartItems[id][size];
        if (qty > 0) {
          const product = products.find(p => String(p._id) === String(id) || String(p.slug) === String(id));
          if (product) {
            out.push({
              _id: id,
              size,
              quantity: qty,
              name: product.name || product.title || 'Product',
              price: Number(product.price) || 0,
              image: Array.isArray(product.images) ? product.images[0] : product.image || ''
            });
          }
        }
      }
    }
    return out;
  }, [cartItems, products]);

  // Calculate total
  const total = useMemo(() => {
    return cartList.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, [cartList]);

  useEffect(() => {
    const incoming = address || {};
    const patched = {
      ...incoming,
      ...(incoming.landmark && !incoming.locality ? { locality: incoming.landmark } : {}),
    };
    setForm((prev) => ({ ...prev, ...patched }));
  }, [address]);

  // Guard: redirect if cart is empty
  useEffect(() => {
    if (getCartCount && getCartCount() === 0) navigate('/cart');
  }, [getCartCount, navigate]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (name === 'zip') {
      const digits = String(value || '').replace(/\D/g, '');
      if (digits !== zipResolvedFor) {
        setZipValid(false);
        setZipLookupMsg('');
        setForm((f) => ({ ...f, district: '', state: '', country: f.country || 'India' }));
      }
    }
  };

  // --- ZIP auto-fill helpers ---
  const countryToCode = (name) => {
    const n = String(name || '').trim().toLowerCase();
    const map = {
      india: 'IN', 'united states': 'US', usa: 'US', 'united kingdom': 'GB',
      uk: 'GB', canada: 'CA', australia: 'AU', germany: 'DE', france: 'FR',
    };
    return map[n] || (n ? n.slice(0, 2).toUpperCase() : 'IN');
  };

  const pickFirst = (arr) => (Array.isArray(arr) && arr.length ? arr[0] : null);

  const lookupZip = async (zip, countryName) => {
    const code = countryToCode(countryName);
    const out = { district: '', state: '', country: countryName };

    if (code === 'IN') {
      try {
        const res2 = await fetch(`https://api.postalpincode.in/pincode/${encodeURIComponent(zip)}`, { mode: 'cors' });
        if (res2.ok) {
          const arr = await res2.json();
          const first = pickFirst(arr);
          if (first && String(first.Status).toLowerCase() === 'success') {
            const po = pickFirst(first.PostOffice);
            if (po) {
              out.district = String(po.District || '').trim();
              out.state = String(po.State || '').trim();
              if (!out.country) out.country = String(first.Country || countryName || '').trim();
              if (out.district || out.state) return out;
            }
          }
        }
      } catch {}
    }

    try {
      const res = await fetch(`https://api.zippopotam.us/${code}/${encodeURIComponent(zip)}`, { mode: 'cors' });
      if (res.ok) {
        const data = await res.json();
        const place = pickFirst(data?.places);
        if (place) {
          out.district = out.district || String(place['place name'] || '').trim();
          out.state = out.state || String(place['state'] || '').trim();
          if (!out.country) out.country = String(data?.country || countryName || '').trim();
          if (out.district || out.state) return out;
        }
      }
    } catch {}

    return out;
  };

  const triggerZipLookup = async () => {
    const zip = String((form.zip || '')).trim();
    const country = form.country || 'India';
    if (!zip || zip.replace(/\D/g, '').length < 5) {
      setZipLookupMsg('Enter a valid postal code to auto-fill');
      setZipValid(false);
      return;
    }
    try {
      setZipLoading(true);
      setZipLookupMsg('Looking up location…');
      if (zipAbortRef.current) { try { zipAbortRef.current.abort(); } catch {} }
      const ac = new AbortController();
      zipAbortRef.current = ac;
      const result = await lookupZip(zip, country);
      if (ac.signal.aborted) return;
      if (result.district || result.state) {
        setForm((f) => ({ ...f, district: result.district || f.district, state: result.state || f.state, country: result.country || f.country }));
        setZipValid(true);
        setZipResolvedFor(String(zip).replace(/\D/g, ''));
        setZipLookupMsg(`Auto-filled ${[result.district, result.state].filter(Boolean).join(', ')}`);
      } else {
        setZipValid(false);
        setZipLookupMsg('Could not find location for this code');
      }
    } catch {
      setZipValid(false);
      setZipLookupMsg('Lookup failed');
    } finally {
      setZipLoading(false);
    }
  };

  useEffect(() => {
    try { if (zipDebounceRef.current) clearTimeout(zipDebounceRef.current); } catch {}
    const digits = String(form.zip || '').replace(/\D/g, '');
    const isIndia = /india/i.test(String(form.country || 'India'));
    const minLen = isIndia ? 6 : 5;
    if (!digits || digits.length < minLen) {
      setZipValid(false);
      if (!digits) setZipLookupMsg('');
      return;
    }
    zipDebounceRef.current = setTimeout(() => { triggerZipLookup(); }, 650);
    return () => { try { clearTimeout(zipDebounceRef.current); } catch {} };
  }, [form.zip, form.country]);

  const validate = (f) => {
    const out = {};
    const nonEmpty = (v) => String(v || "").trim().length > 0;
    
    if (!nonEmpty(f.firstName) && !nonEmpty(f.lastName)) out.firstName = "Please enter your name";
    if (!nonEmpty(f.phone)) out.phone = "Phone is required";
    if (!nonEmpty(f.address1)) out.address1 = "House/Flat is required";
    if (!nonEmpty(f.locality)) out.locality = "Locality is required";
    if (!nonEmpty(f.zip)) out.zip = "PIN/Zip is required";
    
    const digits = String(f.zip || '').replace(/\D/g, '');
    const isIndia = /india/i.test(String(f.country || 'India'));
    const requiredLen = isIndia ? 6 : 5;
    if (digits.length !== requiredLen) out.zip = isIndia ? 'Enter a 6-digit PIN code' : 'Enter a valid postal code';
    if (!zipValid || digits !== zipResolvedFor) out.zip = 'Enter a valid postal code';

    const phoneDigits = String(f.phone || "").replace(/\D/g, "");
    if (phoneDigits && phoneDigits.length < 10) out.phone = "Phone looks too short";
    if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) out.email = "Enter a valid email";
    
    return out;
  };

  // Compose the detailed WhatsApp message
  const composeMessage = () => {
    const lines = [];
    
    // Header
    lines.push("New order request");
    lines.push("");
    
    // Items with links
    lines.push("*Items:*");
    for (const item of cartList) {
      const url = `${window.location.origin}/product/${item._id}`;
      const sizeText = item.size && item.size !== 'std' ? ` (Size: ${String(item.size).replace(/^UK-/, '')})` : '';
      const qtyText = item.quantity > 1 ? ` x${item.quantity}` : '';
      lines.push(`- ${item.name}${sizeText}${qtyText}`);
      lines.push(`  ${url}`);
    }
    
    // Total
    lines.push("");
    lines.push(`*Total:* ${currency}${total.toLocaleString('en-IN')}`);
    
    // Shipping address header
    lines.push("");
    lines.push("*Shipping address:*");
    
    // Contact block
    const name = `${form.firstName || ''} ${form.lastName || ''}`.trim();
    lines.push("");
    lines.push("*Contact:*");
    if (name) lines.push(`Name: ${name}`);
    if (form.phone) lines.push(`Phone: ${form.phone}`);
    if (form.email) lines.push(`Email: ${form.email}`);
    
    // Address block
    lines.push("");
    lines.push("*Address:*");
    if (form.address1) lines.push(form.address1);
    if (form.address2) lines.push(form.address2);
    if (form.locality) lines.push(`Locality: ${form.locality}`);
    
    // Location block
    const locationParts = [form.district, form.state, form.zip].filter(Boolean);
    if (locationParts.length > 0 || form.country) {
      lines.push("");
      lines.push("*Location:*");
      if (locationParts.length > 0) lines.push(locationParts.join(", "));
      if (form.country) lines.push(form.country);
    }
    
    lines.push("");
    return lines.join("\n");
  };

  const onSubmit = (e) => {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length) {
      setErrors(errs);
      const firstKey = Object.keys(errs)[0];
      const node = refs.current[firstKey];
      node?.focus();
      return;
    }
    
    // Save address to context
    setAddress(form);
    
    // Compose and send WhatsApp message
    const msg = composeMessage();
    const href = `https://wa.me/919933778870?text=${encodeURIComponent(msg)}`;
    window.open(href, '_blank', 'noopener');
  };

  if (cartList.length === 0) {
    return (
      <div className="border-t pt-14 px-4 max-w-6xl mx-auto">
        <CartSteps active="address" />
        <p className="mt-6 text-gray-600">Your bag is empty.</p>
      </div>
    );
  }

  return (
    <div className="border-t pt-14">
      <div className="mb-5">
        <CartSteps active="address" />
      </div>

      <div className="max-w-6xl mx-auto px-4 pb-24">
        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Left: Address Form */}
          <form onSubmit={onSubmit} className="lg:col-span-2">
            <h2 className="text-xl font-semibold mb-4">Delivery Information</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input 
                ref={(n) => refs.current.firstName = n} 
                name="firstName" 
                value={form.firstName} 
                onChange={onChange} 
                className={`border rounded px-3 h-11 ${errors.firstName ? 'border-red-500' : ''}`} 
                placeholder="First name" 
                autoComplete="given-name" 
              />
              <input 
                ref={(n) => refs.current.lastName = n} 
                name="lastName" 
                value={form.lastName} 
                onChange={onChange} 
                className={`border rounded px-3 h-11 ${errors.lastName ? 'border-red-500' : ''}`} 
                placeholder="Last name" 
                autoComplete="family-name" 
              />
            </div>
            {(errors.firstName || errors.lastName) && (
              <p className="text-xs text-red-600 mt-1">{errors.firstName || errors.lastName}</p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <input 
                ref={(n) => refs.current.email = n} 
                type="email" 
                name="email" 
                value={form.email} 
                onChange={onChange} 
                className={`border rounded px-3 h-11 ${errors.email ? 'border-red-500' : ''}`} 
                placeholder="Email (optional)" 
                autoComplete="email" 
              />
              <input 
                ref={(n) => refs.current.phone = n} 
                name="phone" 
                value={form.phone} 
                onChange={onChange} 
                className={`border rounded px-3 h-11 ${errors.phone ? 'border-red-500' : ''}`} 
                placeholder="Phone *" 
                inputMode="tel" 
                autoComplete="tel" 
              />
            </div>
            {(errors.email || errors.phone) && (
              <p className="text-xs text-red-600 mt-1">{errors.email || errors.phone}</p>
            )}

            <input 
              ref={(n) => refs.current.address1 = n} 
              name="address1" 
              value={form.address1} 
              onChange={onChange} 
              className={`border rounded px-3 h-11 w-full mt-3 ${errors.address1 ? 'border-red-500' : ''}`} 
              placeholder="House / Flat / Floor / Block *" 
              autoComplete="address-line1" 
            />
            {errors.address1 && <p className="text-xs text-red-600 mt-1">{errors.address1}</p>}

            <input 
              name="address2" 
              value={form.address2} 
              onChange={onChange} 
              className="border rounded px-3 h-11 w-full mt-3" 
              placeholder="Street / Road / Building (optional)" 
              autoComplete="address-line2" 
            />

            <input 
              ref={(n) => refs.current.locality = n} 
              name="locality" 
              value={form.locality} 
              onChange={onChange} 
              className={`border rounded px-3 h-11 w-full mt-3 ${errors.locality ? 'border-red-500' : ''}`} 
              placeholder="Locality / Area / Landmark *" 
            />
            {errors.locality && <p className="text-xs text-red-600 mt-1">{errors.locality}</p>}

            <div className="mt-3">
              <input
                ref={(n) => refs.current.zip = n}
                name="zip"
                value={form.zip}
                onChange={onChange}
                className={`border rounded px-3 h-11 w-full ${errors.zip ? 'border-red-500' : ''}`}
                placeholder="PIN Code *"
                inputMode="numeric"
                autoComplete="postal-code"
              />
              {zipLookupMsg && <p className="text-xs text-gray-600 mt-1">{zipLookupMsg}</p>}
              {errors.zip && <p className="text-xs text-red-600 mt-1">{errors.zip}</p>}
            </div>

            {zipValid && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                <input disabled readOnly value={form.district} className="border rounded px-3 h-11 bg-gray-100 text-gray-600" placeholder="District" />
                <input disabled readOnly value={form.state} className="border rounded px-3 h-11 bg-gray-100 text-gray-600" placeholder="State" />
                <input disabled readOnly value={form.country} className="border rounded px-3 h-11 bg-gray-100 text-gray-600" placeholder="Country" />
              </div>
            )}

            {/* Mobile: Show order button here too */}
            <div className="mt-6 lg:hidden">
              <button 
                type="submit" 
                disabled={!zipValid || zipLoading} 
                className={`w-full py-4 rounded text-sm font-medium ${(!zipValid || zipLoading) ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-black text-white'}`}
              >
                PLACE ORDER ON WHATSAPP
              </button>
            </div>
          </form>

          {/* Right: Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-gray-50 rounded-lg p-5 sticky top-24">
              <h3 className="font-semibold mb-4">Order Summary</h3>
              
              {/* Items */}
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {cartList.map((item, idx) => (
                  <div key={idx} className="flex gap-3 items-center">
                    <img 
                      src={item.image} 
                      alt={item.name} 
                      className="w-14 h-14 object-cover rounded border"
                      onError={(e) => { e.target.src = '/assets/no-image.svg'; }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <p className="text-xs text-gray-500">
                        {item.size && item.size !== 'std' && `Size: ${String(item.size).replace(/^UK-/, '')}`}
                        {item.quantity > 1 && ` × ${item.quantity}`}
                      </p>
                      <p className="text-sm font-semibold">{currency}{item.price}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="border-t mt-4 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>{currency}{total.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Shipping</span>
                  <span className="text-green-600">FREE</span>
                </div>
                <div className="flex justify-between font-semibold text-lg border-t pt-2">
                  <span>Total</span>
                  <span>{currency}{total.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Desktop: Order button */}
              <button 
                type="button"
                onClick={onSubmit}
                disabled={!zipValid || zipLoading} 
                className={`hidden lg:block w-full mt-4 py-4 rounded text-sm font-medium ${(!zipValid || zipLoading) ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-black text-white hover:bg-gray-800'}`}
              >
                PLACE ORDER ON WHATSAPP
              </button>

              <p className="text-xs text-gray-500 mt-3 text-center">
                You'll be redirected to WhatsApp to confirm your order
              </p>
            </div>
          </div>
        </div>

        {/* Back button */}
        <div className="mt-6">
          <button 
            type="button" 
            onClick={() => navigate('/cart')} 
            className="text-sm text-gray-600 underline"
          >
            ← Back to cart
          </button>
        </div>
      </div>
    </div>
  );
}
