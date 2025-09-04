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
  locality: "",
  district: "",
  state: "",
  zip: "",
  country: "India",
};

export default function Address() {
  const { address, setAddress, navigate, getCartCount } = useContext(ShopContext);
  const [form, setForm] = useState(address || EMPTY);
  const [errors, setErrors] = useState({});
  const refs = useRef({});
  const [zipLookupMsg, setZipLookupMsg] = useState("");
  const [zipLoading, setZipLoading] = useState(false);
  const zipAbortRef = useRef(null);
  const [zipValid, setZipValid] = useState(false);
  const zipDebounceRef = useRef(null);
  const [zipResolvedFor, setZipResolvedFor] = useState("");
  // Map and geocoding features removed; keep only postal code auto-fill

  // Removed geocoding helpers; postal code auto-fill below remains

  useEffect(() => {
    const incoming = address || {};
    const patched = {
      ...incoming,
      ...(incoming.landmark && !incoming.locality ? { locality: incoming.landmark } : {}),
    };
    setForm((prev) => ({ ...prev, ...patched }));
  }, [address]);

  // Guard: cannot access address step with empty bag
  useEffect(() => {
    if (getCartCount && getCartCount() === 0) navigate('/cart');
  }, [getCartCount, navigate]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (name === 'zip') {
      // As soon as zip changes away from a resolved one, hide derived fields
      const digits = String(value || '').replace(/\D/g, '');
      if (digits !== zipResolvedFor) {
        setZipValid(false);
        setZipLookupMsg('');
        setForm((f) => ({ ...f, district: '', state: '', country: f.country || 'India' }));
      }
    }
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

  // --- ZIP auto-fill helpers ---
  const countryToCode = (name) => {
    const n = String(name || '').trim().toLowerCase();
    const map = {
      india: 'IN',
      'united states': 'US',
      usa: 'US',
      'united kingdom': 'GB',
      uk: 'GB',
      canada: 'CA',
      australia: 'AU',
      germany: 'DE',
      france: 'FR',
    };
    return map[n] || (n ? n.slice(0, 2).toUpperCase() : 'IN');
  };

  const pickFirst = (arr) => (Array.isArray(arr) && arr.length ? arr[0] : null);

  const lookupZip = async (zip, countryName) => {
    const code = countryToCode(countryName);
    const out = { district: '', state: '', country: countryName };

    // Prefer authoritative India Postal data for IN first
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

    // Fallback (or non-IN): Zippopotam
    try {
      const res = await fetch(`https://api.zippopotam.us/${code}/${encodeURIComponent(zip)}`, { mode: 'cors' });
      if (res.ok) {
        const data = await res.json();
        const place = pickFirst(data?.places);
        if (place) {
          // Use place name as best-effort district/locality when district unknown
          out.district = out.district || String(place['place name'] || '').trim();
          out.state = out.state || String(place['state'] || '').trim();
          if (!out.country) out.country = String(data?.country || countryName || '').trim();
          if (out.district || out.state) return out;
        }
      }
    } catch {}

    return out; // may be empty; caller handles
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
        setZipLookupMsg(`Auto-filled ${[result.district || result.city, result.state].filter(Boolean).join(', ')}`);
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

  // Debounced, continuous validation on PIN/ZIP input
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

  // Debounced geocoding of free-text area query to update map & address (maps.co)
  // Removed area query debounced geocoding

  const validate = (f) => {
    const out = {};
    const nonEmpty = (v) => String(v || "").trim().length > 0;
    // Soften requirements: accept either first or last name
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

        {/* Map, places search, and geolocation removed */}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <input ref={(n)=>refs.current.email=n} type="email" name="email" value={form.email} onChange={onChange} className={`border rounded px-3 h-11 ${errors.email?'border-red-500':''}`} placeholder="Email (optional)" autoComplete="email" />
          <input ref={(n)=>refs.current.phone=n} name="phone" value={form.phone} onChange={onChange} className={`border rounded px-3 h-11 ${errors.phone?'border-red-500':''}`} placeholder="Phone" inputMode="tel" autoComplete="tel" />
        </div>
        {(errors.email || errors.phone) && (
          <p className="text-xs text-red-600 mt-1">{errors.email || errors.phone}</p>
        )}

        <input ref={(n)=>refs.current.address1=n} name="address1" value={form.address1} onChange={onChange} className={`border rounded px-3 h-11 w-full mt-3 ${errors.address1?'border-red-500':''}`} placeholder="House / Flat / Floor / Block" autoComplete="address-line1" />
        <input name="address2" value={form.address2} onChange={onChange} className="border rounded px-3 h-11 w-full mt-3" placeholder="Address 2 (optional)" autoComplete="address-line2" />
        <input ref={(n)=>refs.current.locality=n} name="locality" value={form.locality} onChange={onChange} className={`border rounded px-3 h-11 w-full mt-3 ${errors.locality?'border-red-500':''}`} placeholder="Locality / Area" />
        {errors.address1 && (<p className="text-xs text-red-600 mt-1">{errors.address1}</p>)}
        {errors.locality && (<p className="text-xs text-red-600 mt-1">{errors.locality}</p>)}

        <div className="grid grid-cols-1 gap-3 mt-3">
          <div>
            <input
              ref={(n)=>refs.current.zip=n}
              name="zip"
              value={form.zip}
              onChange={onChange}
              className={`border rounded px-3 h-11 w-full ${errors.zip?'border-red-500':''}`}
              placeholder="PIN/Zip"
              inputMode="numeric"
              autoComplete="postal-code"
            />
            {zipLookupMsg && <p className="text-xs text-gray-600 mt-1">{zipLookupMsg}</p>}
          </div>
        </div>

        {errors.zip && (
          <p className="text-xs text-red-600 mt-1">{errors.zip}</p>
        )}

        {zipValid && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
            <input disabled readOnly name="district" value={form.district} className="border rounded px-3 h-11 bg-gray-100 text-gray-600 cursor-not-allowed" placeholder="District" />
            <input disabled readOnly name="state" value={form.state} className="border rounded px-3 h-11 bg-gray-100 text-gray-600 cursor-not-allowed" placeholder="State" />
            <input disabled readOnly name="country" value={form.country} className="border rounded px-3 h-11 bg-gray-100 text-gray-600 cursor-not-allowed" placeholder="Country" />
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button type="button" onClick={() => navigate('/cart')} className="px-5 py-3 border rounded text-sm">Back to bag</button>
          <button type="submit" disabled={!zipValid || zipLoading} className={`px-6 py-3 rounded text-sm ${(!zipValid || zipLoading) ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-black text-white'}`}>CONTINUE</button>
        </div>
      </form>
    </div>
  );
}



