import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { ShopContext } from "../context/ShopContext";
import SafeImg from "../components/SafeImg";

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

  // Build cart list
  const cartList = useMemo(() => {
    const out = [];
    for (const id in cartItems) {
      for (const size in cartItems[id]) {
        const qty = cartItems[id][size];
        if (qty > 0) {
          const product = products.find(p => String(p._id) === String(id) || String(p.slug) === String(id));
          if (product) {
            const cover = Array.isArray(product.images) ? product.images[0] : (Array.isArray(product.image) ? product.image[0] : product.image) || '';
            out.push({
              _id: id,
              size,
              quantity: qty,
              name: product.name || product.title || 'Product',
              price: Number(product.price) || 0,
              image: cover
            });
          }
        }
      }
    }
    return out;
  }, [cartItems, products]);

  const total = useMemo(() => cartList.reduce((sum, item) => sum + (item.price * item.quantity), 0), [cartList]);

  useEffect(() => {
    if (address) setForm(prev => ({ ...prev, ...address }));
  }, [address]);

  useEffect(() => {
    if (getCartCount && getCartCount() === 0) navigate('/cart');
  }, [getCartCount, navigate]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    setErrors(e => ({ ...e, [name]: undefined }));
    
    if (name === 'zip') {
      const digits = String(value || '').replace(/\D/g, '');
      if (digits !== zipResolvedFor) {
        setZipValid(false);
        setZipLookupMsg('');
        setForm(f => ({ ...f, district: '', state: '' }));
      }
    }
  };

  // ZIP lookup
  const lookupZip = async (zip, countryName) => {
    const code = /india/i.test(countryName) ? 'IN' : 'US';
    const out = { district: '', state: '', country: countryName };

    if (code === 'IN') {
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${zip}`);
        if (res.ok) {
          const arr = await res.json();
          if (arr[0]?.Status === 'Success' && arr[0]?.PostOffice?.[0]) {
            const po = arr[0].PostOffice[0];
            out.district = po.District || '';
            out.state = po.State || '';
            return out;
          }
        }
      } catch {}
    }

    try {
      const res = await fetch(`https://api.zippopotam.us/${code}/${zip}`);
      if (res.ok) {
        const data = await res.json();
        if (data.places?.[0]) {
          out.district = data.places[0]['place name'] || '';
          out.state = data.places[0].state || '';
          return out;
        }
      }
    } catch {}

    return out;
  };

  useEffect(() => {
    if (zipDebounceRef.current) clearTimeout(zipDebounceRef.current);
    
    const digits = String(form.zip || '').replace(/\D/g, '');
    const minLen = /india/i.test(form.country || 'India') ? 6 : 5;
    
    if (digits.length < minLen) {
      setZipValid(false);
      return;
    }

    zipDebounceRef.current = setTimeout(async () => {
      setZipLoading(true);
      setZipLookupMsg('Looking up...');
      
      const result = await lookupZip(digits, form.country || 'India');
      
      if (result.district || result.state) {
        setForm(f => ({ ...f, district: result.district, state: result.state }));
        setZipValid(true);
        setZipResolvedFor(digits);
        setZipLookupMsg(`${result.district}, ${result.state}`);
      } else {
        setZipValid(false);
        setZipLookupMsg('Could not verify PIN code');
      }
      setZipLoading(false);
    }, 600);

    return () => clearTimeout(zipDebounceRef.current);
  }, [form.zip, form.country]);

  const validate = () => {
    const errs = {};
    if (!form.firstName?.trim() && !form.lastName?.trim()) errs.firstName = "Name is required";
    if (!form.phone?.trim() || form.phone.replace(/\D/g, '').length < 10) errs.phone = "Valid phone is required";
    if (!form.address1?.trim()) errs.address1 = "Address is required";
    if (!form.locality?.trim()) errs.locality = "Locality is required";
    if (!form.zip?.trim()) errs.zip = "PIN code is required";
    if (!zipValid) errs.zip = "Enter valid PIN code";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Invalid email";
    return errs;
  };

  const composeMessage = () => {
    const lines = ["New order request", "", "*Items:*"];
    
    for (const item of cartList) {
      const url = `${window.location.origin}/product/${item._id}`;
      const size = item.size !== 'std' ? ` (Size: ${String(item.size).replace(/^UK-/, '')})` : '';
      const qty = item.quantity > 1 ? ` x${item.quantity}` : '';
      lines.push(`- ${item.name}${size}${qty}`, `  ${url}`);
    }
    
    lines.push("", `*Total:* ${currency}${total.toLocaleString('en-IN')}`, "", "*Shipping address:*", "", "*Contact:*");
    
    const name = `${form.firstName || ''} ${form.lastName || ''}`.trim();
    if (name) lines.push(`Name: ${name}`);
    if (form.phone) lines.push(`Phone: ${form.phone}`);
    if (form.email) lines.push(`Email: ${form.email}`);
    
    lines.push("", "*Address:*");
    if (form.address1) lines.push(form.address1);
    if (form.address2) lines.push(form.address2);
    if (form.locality) lines.push(`Locality: ${form.locality}`);
    
    lines.push("", "*Location:*");
    lines.push([form.district, form.state, form.zip].filter(Boolean).join(", "));
    if (form.country) lines.push(form.country);
    
    return lines.join("\n");
  };

  const onSubmit = (e) => {
    e?.preventDefault();
    const errs = validate();
    
    if (Object.keys(errs).length) {
      setErrors(errs);
      const firstKey = Object.keys(errs)[0];
      refs.current[firstKey]?.focus();
      refs.current[firstKey]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    
    setAddress(form);
    const msg = composeMessage();
    window.open(`https://wa.me/919933778870?text=${encodeURIComponent(msg)}`, '_blank');
  };

  if (cartList.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
        <p className="text-gray-500 mb-4">Your cart is empty</p>
        <button onClick={() => navigate('/collection')} className="px-6 py-3 bg-black text-white text-sm">
          Continue Shopping
        </button>
      </div>
    );
  }

  const inputClass = (field) => `w-full h-12 px-4 border rounded-lg text-sm outline-none transition-colors focus:border-black ${errors[field] ? 'border-red-400 bg-red-50' : 'border-gray-200'}`;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button onClick={() => navigate('/cart')} className="flex items-center gap-2 text-sm text-gray-600 hover:text-black">
              <span>←</span> Back
            </button>
            <h1 className="text-lg font-semibold">Checkout</h1>
            <div className="w-16"></div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Left Column - Form */}
          <div className="flex-1 order-2 lg:order-1">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-6">Delivery Details</h2>
              
              <form onSubmit={onSubmit} className="space-y-4">
                {/* Name */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input
                      ref={el => refs.current.firstName = el}
                      name="firstName"
                      value={form.firstName}
                      onChange={onChange}
                      placeholder="First name *"
                      className={inputClass('firstName')}
                    />
                  </div>
                  <div>
                    <input
                      name="lastName"
                      value={form.lastName}
                      onChange={onChange}
                      placeholder="Last name"
                      className={inputClass('lastName')}
                    />
                  </div>
                </div>
                {errors.firstName && <p className="text-xs text-red-500 -mt-2">{errors.firstName}</p>}

                {/* Contact */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <input
                      ref={el => refs.current.phone = el}
                      name="phone"
                      value={form.phone}
                      onChange={onChange}
                      placeholder="Phone number *"
                      inputMode="tel"
                      className={inputClass('phone')}
                    />
                    {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
                  </div>
                  <div>
                    <input
                      ref={el => refs.current.email = el}
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={onChange}
                      placeholder="Email (optional)"
                      className={inputClass('email')}
                    />
                    {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
                  </div>
                </div>

                {/* Address */}
                <div>
                  <input
                    ref={el => refs.current.address1 = el}
                    name="address1"
                    value={form.address1}
                    onChange={onChange}
                    placeholder="House / Flat / Building *"
                    className={inputClass('address1')}
                  />
                  {errors.address1 && <p className="text-xs text-red-500 mt-1">{errors.address1}</p>}
                </div>

                <input
                  name="address2"
                  value={form.address2}
                  onChange={onChange}
                  placeholder="Street / Road (optional)"
                  className={inputClass('address2')}
                />

                <div>
                  <input
                    ref={el => refs.current.locality = el}
                    name="locality"
                    value={form.locality}
                    onChange={onChange}
                    placeholder="Locality / Area / Landmark *"
                    className={inputClass('locality')}
                  />
                  {errors.locality && <p className="text-xs text-red-500 mt-1">{errors.locality}</p>}
                </div>

                {/* PIN & Location */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <input
                      ref={el => refs.current.zip = el}
                      name="zip"
                      value={form.zip}
                      onChange={onChange}
                      placeholder="PIN Code *"
                      inputMode="numeric"
                      maxLength={6}
                      className={inputClass('zip')}
                    />
                    {zipLookupMsg && !errors.zip && (
                      <p className={`text-xs mt-1 ${zipValid ? 'text-green-600' : 'text-gray-500'}`}>
                        {zipLoading ? '⏳ ' : zipValid ? '✓ ' : ''}{zipLookupMsg}
                      </p>
                    )}
                    {errors.zip && <p className="text-xs text-red-500 mt-1">{errors.zip}</p>}
                  </div>
                  <div>
                    <input
                      name="country"
                      value={form.country}
                      onChange={onChange}
                      placeholder="Country"
                      className={inputClass('country')}
                    />
                  </div>
                </div>

                {/* Auto-filled location */}
                {zipValid && (form.district || form.state) && (
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      value={form.district}
                      readOnly
                      placeholder="District"
                      className="w-full h-12 px-4 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-600"
                    />
                    <input
                      value={form.state}
                      readOnly
                      placeholder="State"
                      className="w-full h-12 px-4 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-600"
                    />
                  </div>
                )}

                {/* Submit - Desktop */}
                <button
                  type="submit"
                  disabled={zipLoading}
                  className="hidden lg:block w-full h-14 bg-black text-white font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed mt-6"
                >
                  Place Order on WhatsApp
                </button>
              </form>
            </div>
          </div>

          {/* Right Column - Order Summary */}
          <div className="lg:w-[380px] order-1 lg:order-2">
            <div className="bg-white rounded-xl p-6 shadow-sm lg:sticky lg:top-24">
              <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
              
              {/* Items */}
              <div className="space-y-4 max-h-[300px] overflow-y-auto">
                {cartList.map((item, idx) => (
                  <div key={idx} className="flex gap-3">
                    <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                      <SafeImg
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        width={64}
                        height={64}
                        quality={85}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-2">{item.name}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                        {item.size !== 'std' && <span>Size: {String(item.size).replace(/^UK-/, '')}</span>}
                        {item.quantity > 1 && <span>Qty: {item.quantity}</span>}
                      </div>
                      <p className="text-sm font-semibold mt-1">{currency}{item.price.toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="border-t mt-4 pt-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span>{currency}{total.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Shipping</span>
                  <span className="text-green-600 font-medium">FREE</span>
                </div>
                <div className="flex justify-between text-lg font-semibold pt-2 border-t">
                  <span>Total</span>
                  <span>{currency}{total.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <p className="text-xs text-gray-500 text-center mt-4">
                Secure checkout via WhatsApp
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Fixed Bottom Button */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t p-4" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}>
        <button
          onClick={onSubmit}
          disabled={zipLoading}
          className="w-full h-14 bg-black text-white font-medium rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <span>Place Order</span>
          <span className="text-gray-300">•</span>
          <span>{currency}{total.toLocaleString('en-IN')}</span>
        </button>
      </div>

      {/* Bottom padding for mobile fixed button */}
      <div className="lg:hidden h-24"></div>
    </div>
  );
}
