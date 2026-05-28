import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { ShopContext } from "../context/ShopContext";
import SafeImg from "../components/SafeImg";
import Button from "../components/Button";
import Input from "../components/Input";
import Loading from "../components/Loading";
import { safeFetchRaw, handleError } from "../utils/errorHandler";
import ErrorMessage from "../components/ErrorMessage";
import { validateName, validateNameRequired, validatePhone, validateEmail, validateAddress, validateCity, validateState, validateZip } from "../utils/validation";
import { recordCouponUsage } from "../utils/coupons";

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
  const { address, setAddress, navigate, getCartCount, cartItems, products, productLookup, currency, getCartTotal, getCartSubtotal, getDiscountAmount, appliedCoupon } = useContext(ShopContext);
  const [form, setForm] = useState(address || EMPTY);
  const [errors, setErrors] = useState({});
  const refs = useRef({});
  const [zipLookupMsg, setZipLookupMsg] = useState("");
  const [zipLoading, setZipLoading] = useState(false);
  const [zipValid, setZipValid] = useState(false);
  const zipDebounceRef = useRef(null);
  const [zipResolvedFor, setZipResolvedFor] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Build cart list
  const cartList = useMemo(() => {
    const out = [];
    for (const id in cartItems) {
      for (const size in cartItems[id]) {
        const qty = cartItems[id][size];
        if (qty > 0) {
          const product = productLookup.get(String(id));
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
  }, [cartItems, productLookup]);

  const subtotal = getCartSubtotal();
  const discountAmt = getDiscountAmount();
  const total = getCartTotal();

  useEffect(() => {
    if (address) setForm(prev => ({ ...prev, ...address }));
  }, [address]);

  useEffect(() => {
    if (getCartCount && getCartCount() === 0) navigate('/cart');
  }, [getCartCount, navigate]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: undefined }));
    
    if (name === 'zip') {
      const digits = String(value || '').replace(/\D/g, '');
      if (digits !== zipResolvedFor) {
        setZipValid(false);
        setZipLookupMsg('');
        setForm(f => ({ ...f, district: '', state: '' }));
      }
    }
  };

  const [zipError, setZipError] = useState(null);

  // ZIP lookup with error handling
  const lookupZip = async (zip, countryName) => {
    const code = /india/i.test(countryName) ? 'IN' : 'US';
    const out = { district: '', state: '', country: countryName };
    setZipError(null);

    if (code === 'IN') {
      try {
        const res = await safeFetchRaw(`https://api.postalpincode.in/pincode/${zip}`, { timeout: 5000 }, 1);
        if (res.ok) {
          const arr = await res.json();
          if (arr[0]?.Status === 'Success' && arr[0]?.PostOffice?.[0]) {
            const po = arr[0].PostOffice[0];
            out.district = po.District || '';
            out.state = po.State || '';
            return out;
          }
        }
      } catch (error) {
        const errorInfo = handleError(error, { operation: 'ZIP lookup (India)', zip });
        setZipError(errorInfo);
      }
    }

    try {
      const res = await safeFetchRaw(`https://api.zippopotam.us/${code}/${zip}`, { timeout: 5000 }, 1);
      if (res.ok) {
        const data = await res.json();
        if (data.places?.[0]) {
          out.district = data.places[0]['place name'] || '';
          out.state = data.places[0].state || '';
          return out;
        }
      }
    } catch (error) {
      const errorInfo = handleError(error, { operation: 'ZIP lookup (International)', zip });
      setZipError(errorInfo);
    }

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
    
    // Name validation - at least one name required
    const nameError = validateNameRequired(form.firstName, form.lastName);
    if (nameError) {
      errs.firstName = nameError;
    } else {
      // Validate individual names if provided
      if (form.firstName?.trim()) {
        const firstNameError = validateName(form.firstName, 'First name');
        if (firstNameError) errs.firstName = firstNameError;
      }
      if (form.lastName?.trim()) {
        const lastNameError = validateName(form.lastName, 'Last name');
        if (lastNameError) errs.lastName = lastNameError;
      }
    }
    
    // Phone validation
    const phoneError = validatePhone(form.phone);
    if (phoneError) errs.phone = phoneError;
    
    // Email validation (optional)
    if (form.email?.trim()) {
      const emailError = validateEmail(form.email);
      if (emailError) errs.email = emailError;
    }
    
    // Address validation
    const addressError = validateAddress(form.address1, 'Address');
    if (addressError) errs.address1 = addressError;
    
    // Locality validation
    const localityError = validateCity(form.locality, 'Locality');
    if (localityError) errs.locality = localityError;
    
    // State validation
    const stateError = validateState(form.state);
    if (stateError) errs.state = stateError;
    
    // ZIP validation
    const zipError = validateZip(form.zip, form.country);
    if (zipError) {
      errs.zip = zipError;
    } else if (zipLoading) {
      // Only block while a lookup is actually in flight. If the lookup already
      // finished — whether it matched or the API failed/timed out — trust the
      // manually-entered PIN so an API outage can't permanently block checkout.
      errs.zip = "Please wait for PIN code validation";
    }
    
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
    
    lines.push("");
    lines.push(`*Subtotal:* ${currency}${subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    if (appliedCoupon && discountAmt > 0) {
      lines.push(`*Discount (${appliedCoupon.code}):* -${currency}${discountAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    }
    lines.push(`*Total:* ${currency}${total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    lines.push("", "*Shipping address:*", "", "*Contact:*");
    
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
    if (isSubmitting) return; // guard against double-tap opening WhatsApp twice
    const errs = validate();

    if (Object.keys(errs).length) {
      setErrors(errs);
      const firstKey = Object.keys(errs)[0];
      refs.current[firstKey]?.focus();
      refs.current[firstKey]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    // Never fire an order with nothing in it (e.g. cart emptied in another tab).
    if (cartList.length === 0) {
      navigate('/cart');
      return;
    }

    setIsSubmitting(true);
    setAddress(form);
    const msg = composeMessage();
    const phoneNumber = import.meta.env.VITE_WHATSAPP_PHONE?.replace(/\D/g, '') || "919933778870";
    window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(msg)}`, '_blank');
    // Record coupon usage now that the order has actually been placed.
    if (appliedCoupon?.code) recordCouponUsage(appliedCoupon.code);
    // Re-enable shortly so the user can retry if WhatsApp didn't open.
    setTimeout(() => setIsSubmitting(false), 3000);
  };

  if (cartList.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
        <p className="text-gray-500 mb-4">Your cart is empty</p>
        <Button onClick={() => navigate('/collection')}>
          Continue Shopping
        </Button>
      </div>
    );
  }

  // Input class helper is no longer needed - using Input component

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Input
                      ref={el => refs.current.firstName = el}
                      name="firstName"
                      value={form.firstName}
                      onChange={onChange}
                      placeholder="First name *"
                      error={!!errors.firstName}
                      errorMessage={errors.firstName}
                      required
                    />
                  </div>
                  <div>
                    <Input
                      name="lastName"
                      value={form.lastName}
                      onChange={onChange}
                      placeholder="Last name"
                      error={!!errors.lastName}
                      errorMessage={errors.lastName}
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <Input
                    ref={el => refs.current.phone = el}
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    value={form.phone}
                    onChange={onChange}
                    placeholder="Phone number *"
                    error={!!errors.phone}
                    errorMessage={errors.phone}
                    required
                  />
                </div>

                {/* Email */}
                <div>
                  <Input
                    name="email"
                    type="email"
                    inputMode="email"
                    value={form.email}
                    onChange={onChange}
                    placeholder="Email (optional)"
                    error={!!errors.email}
                    errorMessage={errors.email}
                  />
                </div>

                {/* Address Line 1 */}
                <div>
                  <Input
                    ref={el => refs.current.address1 = el}
                    name="address1"
                    value={form.address1}
                    onChange={onChange}
                    placeholder="Address line 1 *"
                    error={!!errors.address1}
                    errorMessage={errors.address1}
                    required
                  />
                </div>

                {/* Address Line 2 */}
                <div>
                  <Input
                    name="address2"
                    value={form.address2}
                    onChange={onChange}
                    placeholder="Address line 2 (optional)"
                  />
                </div>

                {/* Locality and ZIP */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Input
                      ref={el => refs.current.locality = el}
                      name="locality"
                      value={form.locality}
                      onChange={onChange}
                      placeholder="Locality/City *"
                      error={!!errors.locality}
                      errorMessage={errors.locality}
                      required
                    />
                  </div>
                  <div>
                    <Input
                      ref={el => refs.current.zip = el}
                      name="zip"
                      type="text"
                      inputMode="numeric"
                      value={form.zip}
                      onChange={onChange}
                      placeholder="PIN code *"
                      error={!!errors.zip}
                      errorMessage={errors.zip}
                      required
                      maxLength={6}
                    />
                    {zipLookupMsg && !errors.zip && (
                      <p className={`text-xs mt-1 ${zipValid ? 'text-green-600' : 'text-gray-500'}`}>{zipLookupMsg}</p>
                    )}
                    {zipError && <p className="text-red-500 text-sm mt-1">{zipError.message || String(zipError)}</p>}
                  </div>
                </div>

                {/* District and State */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    ref={el => refs.current.district = el}
                    name="district"
                    value={form.district}
                    onChange={onChange}
                    placeholder="District"
                  />
                  <Input
                    ref={el => refs.current.state = el}
                    name="state"
                    value={form.state}
                    onChange={onChange}
                    placeholder="State *"
                    error={!!errors.state}
                    errorMessage={errors.state}
                  />
                </div>

                {/* Country */}
                <div>
                  <Input
                    name="country"
                    value={form.country}
                    onChange={onChange}
                    placeholder="Country"
                  />
                </div>

                {/* Submit - Desktop */}
                <Button
                  type="submit"
                  disabled={zipLoading || isSubmitting}
                  size="lg"
                  className="hidden lg:flex w-full h-14 mt-6"
                >
                  {zipLoading ? (
                    <span className="flex items-center gap-2">
                      <Loading size="sm" variant="white" />
                      Verifying...
                    </span>
                  ) : isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <Loading size="sm" variant="white" />
                      Opening WhatsApp...
                    </span>
                  ) : (
                    'Place Order on WhatsApp'
                  )}
                </Button>
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
                      <p className="text-sm font-semibold mt-1">{currency}{item.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="border-t mt-4 pt-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span>{currency}{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                {appliedCoupon && discountAmt > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount ({appliedCoupon.code})</span>
                    <span>-{currency}{discountAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Shipping</span>
                  <span className="text-green-600 font-medium">FREE</span>
                </div>
                <div className="flex justify-between text-lg font-semibold pt-2 border-t">
                  <span>Total</span>
                  <span>{currency}{total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>

              <p className="text-xs text-gray-500 text-center mt-4">
                Secure checkout via WhatsApp
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Fixed Bottom Button — BottomDock is hidden on /address (see App.jsx), so this sits flush at the viewport bottom */}
      <div
        className="lg:hidden fixed bottom-0 left-0 right-0 z-[60] bg-white border-t p-4"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}
      >
        <Button
          onClick={onSubmit}
          disabled={zipLoading || isSubmitting}
          size="lg"
          className="w-full h-14 flex items-center justify-center gap-2"
        >
          {zipLoading ? (
            <>
              <Loading size="sm" variant="white" />
              <span>Verifying...</span>
            </>
          ) : isSubmitting ? (
            <>
              <Loading size="sm" variant="white" />
              <span>Opening WhatsApp...</span>
            </>
          ) : (
            <>
              <span>Place Order</span>
              <span className="text-gray-300">•</span>
              <span>{currency}{total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </>
          )}
        </Button>
      </div>

      {/* Spacer so the last form field isn't hidden behind the sticky CTA (wrapper ~89px + safe-area) */}
      <div
        className="lg:hidden"
        style={{ height: 'calc(89px + max(env(safe-area-inset-bottom), 16px))' }}
      ></div>
    </div>
  );
}
