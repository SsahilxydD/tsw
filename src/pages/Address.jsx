import React, { useContext, useEffect, useRef, useState } from "react";
import CartSteps from "../components/CartSteps";
import { ShopContext } from "../context/ShopContext";

const EMPTY = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  address1: "",
  address2: "",
  landmark: "",
  city: "",
  state: "",
  zip: "",
  country: "India",
};

export default function Address() {
  const { address, setAddress, navigate, getCartCount } = useContext(ShopContext);
  const [form, setForm] = useState(address || EMPTY);
  const [errors, setErrors] = useState({});
  const refs = useRef({});

  useEffect(() => {
    setForm((prev) => ({ ...prev, ...(address || {}) }));
  }, [address]);

  // Guard: cannot access address step with empty bag
  useEffect(() => {
    if (getCartCount && getCartCount() === 0) navigate('/cart');
  }, [getCartCount, navigate]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
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
    setAddress(form);
    navigate("/payment");
  };

  const validate = (f) => {
    const out = {};
    const nonEmpty = (v) => String(v || "").trim().length > 0;
    // Soften requirements: accept either first or last name
    if (!nonEmpty(f.firstName) && !nonEmpty(f.lastName)) out.firstName = "Please enter your name";
    if (!nonEmpty(f.phone)) out.phone = "Phone is required";
    if (!nonEmpty(f.address1)) out.address1 = "Address line 1 is required";
    if (!nonEmpty(f.city)) out.city = "City is required";
    if (!nonEmpty(f.zip)) out.zip = "PIN/Zip is required";

    // Very gentle sanity checks
    const phoneDigits = String(f.phone || "").replace(/\D/g, "");
    if (phoneDigits && phoneDigits.length < 5) out.phone = "Phone looks too short";

    const zip = String(f.zip || "").trim();
    if (zip && !/^\d{3,10}$/.test(zip)) out.zip = "Enter a valid postal code";

    if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) out.email = "Enter a valid email";
    return out;
  };

  return (
    <div className="border-t pt-14">
      <div className="mb-5">
        <CartSteps active="address" />
      </div>

      <form onSubmit={onSubmit} className="max-w-3xl mx-auto px-4 pb-24">
        <h2 className="text-xl font-semibold mb-4">Delivery Information</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input ref={(n)=>refs.current.firstName=n} name="firstName" value={form.firstName} onChange={onChange} className={`border rounded px-3 h-11 ${errors.firstName?'border-red-500':''}`} placeholder="First name" autoComplete="given-name" />
          <input ref={(n)=>refs.current.lastName=n} name="lastName" value={form.lastName} onChange={onChange} className={`border rounded px-3 h-11 ${errors.lastName?'border-red-500':''}`} placeholder="Last name" autoComplete="family-name" />
        </div>
        {(errors.firstName || errors.lastName) && (
          <p className="text-xs text-red-600 mt-1">{errors.firstName || errors.lastName}</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <input ref={(n)=>refs.current.email=n} type="email" name="email" value={form.email} onChange={onChange} className={`border rounded px-3 h-11 ${errors.email?'border-red-500':''}`} placeholder="Email (optional)" autoComplete="email" />
          <input ref={(n)=>refs.current.phone=n} name="phone" value={form.phone} onChange={onChange} className={`border rounded px-3 h-11 ${errors.phone?'border-red-500':''}`} placeholder="Phone" inputMode="tel" autoComplete="tel" />
        </div>
        {(errors.email || errors.phone) && (
          <p className="text-xs text-red-600 mt-1">{errors.email || errors.phone}</p>
        )}

        <input ref={(n)=>refs.current.address1=n} name="address1" value={form.address1} onChange={onChange} className={`border rounded px-3 h-11 w-full mt-3 ${errors.address1?'border-red-500':''}`} placeholder="Address line 1" autoComplete="address-line1" />
        <input name="address2" value={form.address2} onChange={onChange} className="border rounded px-3 h-11 w-full mt-3" placeholder="Address line 2 (optional)" autoComplete="address-line2" />
        <input name="landmark" value={form.landmark} onChange={onChange} className="border rounded px-3 h-11 w-full mt-3" placeholder="Landmark (optional)" />
        {errors.address1 && (<p className="text-xs text-red-600 mt-1">{errors.address1}</p>)}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
          <input ref={(n)=>refs.current.city=n} name="city" value={form.city} onChange={onChange} className={`border rounded px-3 h-11 ${errors.city?'border-red-500':''}`} placeholder="City" autoComplete="address-level2" />
          <input ref={(n)=>refs.current.state=n} name="state" value={form.state} onChange={onChange} className={`border rounded px-3 h-11 ${errors.state?'border-red-500':''}`} placeholder="State" autoComplete="address-level1" />
          <input ref={(n)=>refs.current.zip=n} name="zip" value={form.zip} onChange={onChange} className={`border rounded px-3 h-11 ${errors.zip?'border-red-500':''}`} placeholder="PIN/Zip" inputMode="numeric" autoComplete="postal-code" />
        </div>
        {(errors.city || errors.state || errors.zip) && (
          <p className="text-xs text-red-600 mt-1">{errors.city || errors.state || errors.zip}</p>
        )}

        <input ref={(n)=>refs.current.country=n} name="country" value={form.country} onChange={onChange} className="border rounded px-3 h-11 w-full mt-3" placeholder="Country" autoComplete="country-name" />

        <div className="mt-6 flex items-center justify-end gap-3">
          <button type="button" onClick={() => navigate('/cart')} className="px-5 py-3 border rounded text-sm">Back to bag</button>
          <button type="submit" className="px-6 py-3 rounded bg-black text-white text-sm">CONTINUE</button>
        </div>
      </form>
    </div>
  );
}
