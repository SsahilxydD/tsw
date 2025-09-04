import React, { useContext, useEffect, useRef, useState } from "react";
import CartSteps from "../components/CartSteps";
import { ShopContext } from "../context/ShopContext";
import PlacesAutocomplete from "../components/PlacesAutocomplete";
import MapPicker from "../components/MapPicker";
import { forwardGeocode, reverseGeocode } from "../utils/geocoder";

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
  const [zipLookupMsg, setZipLookupMsg] = useState("");
  const [zipLoading, setZipLoading] = useState(false);
  const zipAbortRef = useRef(null);
  const [zipValid, setZipValid] = useState(false);
  const zipDebounceRef = useRef(null);
  const [zipResolvedFor, setZipResolvedFor] = useState("");
  const [areaQuery, setAreaQuery] = useState("");
  const [placesReady, setPlacesReady] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoMsg, setGeoMsg] = useState("");
  const [loc, setLoc] = useState(() => {
    const a = address || {};
    if (a && a.location && typeof a.location.lat === 'number' && typeof a.location.lng === 'number') {
      return { lat: a.location.lat, lng: a.location.lng };
    }
    return null;
  });
  const [showMap, setShowMap] = useState(false);

  // Utility: choose a human-friendly area label from address components
  const chooseAreaName = (components = []) => {
    const pref = [
      'sublocality_level_2','sublocality_level_1','neighborhood','premise','route','political'
    ];
    for (const c of components) {
      const types = new Set(c.types || []);
      for (const t of pref) if (types.has(t)) return c.long_name || c.short_name || '';
    }
    for (const c of components) { const types = new Set(c.types || []); if (types.has('locality')) return c.long_name || c.short_name || ''; }
    return '';
  };

  // Single entrypoint to apply a resolved candidate to state
  const applyCandidate = (info, source = 'unknown') => {
    if (!info) return;
    const digits = String(info.zip || '').replace(/\D/g, '');
    const areaText = info.area || info.formatted || '';
    if (areaText) setAreaQuery(areaText);
    if (info.location && typeof info.location.lat === 'number' && typeof info.location.lng === 'number') {
      setLoc({ lat: info.location.lat, lng: info.location.lng });
      setShowMap(true);
    }
    setForm((f) => ({
      ...f,
      address2: info.area || f.address2,
      city: info.city || f.city,
      state: info.state || f.state,
      zip: info.zip || f.zip,
      country: info.country || f.country,
      location: info.location ? { lat: info.location.lat, lng: info.location.lng } : f.location,
    }));
    if (digits) {
      setZipResolvedFor(digits);
      setZipValid(true);
      setZipLookupMsg(`Auto-filled ${[info.city, info.state].filter(Boolean).join(', ')}`);
    } else {
      setZipValid(false);
      setZipLookupMsg('Please enter PIN to verify');
    }
  };

  // Geocode free text area query (custom provider)
  const geocodeAreaText = async (q) => {
    const countryCode = (form.country || 'India').toUpperCase();
    return await forwardGeocode(q, countryCode);
  };

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
    if (name === 'zip') {
      // As soon as zip changes away from a resolved one, hide derived fields
      const digits = String(value || '').replace(/\D/g, '');
      if (digits !== zipResolvedFor) {
        setZipValid(false);
        setZipLookupMsg('');
        setForm((f) => ({ ...f, city: '', state: '', country: f.country || 'India' }));
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
    const out = { city: '', state: '', country: countryName };
    // Try Zippopotam
    try {
      const res = await fetch(`https://api.zippopotam.us/${code}/${encodeURIComponent(zip)}`, { mode: 'cors' });
      if (res.ok) {
        const data = await res.json();
        const place = pickFirst(data?.places);
        if (place) {
          out.city = String(place['place name'] || '').trim();
          out.state = String(place['state'] || '').trim();
          if (!out.country) out.country = String(data?.country || countryName || '').trim();
          if (out.city || out.state) return out;
        }
      }
    } catch {}

    // Fallback for India: Postal Pincode API
    if (code === 'IN') {
      try {
        const res2 = await fetch(`https://api.postalpincode.in/pincode/${encodeURIComponent(zip)}`, { mode: 'cors' });
        if (res2.ok) {
          const arr = await res2.json();
          const first = pickFirst(arr);
          if (first && String(first.Status).toLowerCase() === 'success') {
            const po = pickFirst(first.PostOffice);
            if (po) {
              out.city = String(po.District || po.Name || '').trim();
              out.state = String(po.State || '').trim();
              if (out.city || out.state) return out;
            }
          }
        }
      } catch {}
    }
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
      if (result.city || result.state) {
        setForm((f) => ({ ...f, city: result.city || f.city, state: result.state || f.state, country: result.country || f.country }));
        setZipValid(true);
        setZipResolvedFor(String(zip).replace(/\D/g, ''));
        setZipLookupMsg(`Auto-filled ${[result.city, result.state].filter(Boolean).join(', ')}`);
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
  const areaDebounceRef = useRef(null);
  useEffect(() => {
    const q = String(areaQuery || '').trim();
    if (!q || q.length < 3) return;
    try { if (areaDebounceRef.current) clearTimeout(areaDebounceRef.current); } catch {}
    areaDebounceRef.current = setTimeout(async () => {
      try {
        const info = await geocodeAreaText(q);
        if (info) applyCandidate(info, 'type');
      } catch {}
    }, 300);
    return () => { try { clearTimeout(areaDebounceRef.current); } catch {} };
  }, [areaQuery]);

  const validate = (f) => {
    const out = {};
    const nonEmpty = (v) => String(v || "").trim().length > 0;
    // Soften requirements: accept either first or last name
    if (!nonEmpty(f.firstName) && !nonEmpty(f.lastName)) out.firstName = "Please enter your name";
    if (!nonEmpty(f.phone)) out.phone = "Phone is required";
    if (!nonEmpty(f.address1)) out.address1 = "House/Flat is required";
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

        {/* Smart location search (Google Places) */}
        <div className="mt-3">
          <PlacesAutocomplete
            value={areaQuery}
            onChange={setAreaQuery}
            onSelect={(sel) => {
              // Apply directly if we already have components
              if (sel) applyCandidate(sel, 'places');
              // If PIN missing but we have lat/lng, reverse geocode to enrich
              if ((!sel.zip || !String(sel.zip).trim()) && sel.location) {
                reverseGeocode(sel.location.lat, sel.location.lng)
                  .then((info) => applyCandidate(info, 'reverse-sel'))
                  .catch(()=>{});
              }
            }}
            onInputBlur={async () => {
              // Geocode free text when user leaves the field
              const q = String(areaQuery || '').trim();
              if (q.length < 3) return;
              const info = await geocodeAreaText(q);
              if (info) applyCandidate(info, 'text');
            }}
            placeholder="Search area or society (recommended)"
            country={(form.country || 'India').toUpperCase()}
          />
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={async () => {
                setGeoMsg("");
                if (!('geolocation' in navigator)) {
                  setGeoMsg('Geolocation not supported on this device');
                  return;
                }
                setGeoLoading(true);
                setGeoMsg('Detecting your location...');
                try {
                  const pos = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
                  });
                  const { latitude, longitude } = pos.coords;
                  try {
                    const info = await reverseGeocode(latitude, longitude);
                    if (info) {
                      const digits = String(info.zip || '').replace(/\D/g, '');
                      setAreaQuery(info.area || info.formatted || areaQuery);
                      setLoc({ lat: latitude, lng: longitude });
                      setForm((f) => ({
                        ...f,
                        address2: info.area || f.address2,
                        city: info.city || f.city,
                        state: info.state || f.state,
                        zip: info.zip || f.zip,
                        country: info.country || f.country,
                      }));
                      if (digits) {
                        setZipResolvedFor(digits);
                        setZipValid(true);
                        setZipLookupMsg(`Detected ${[info.city, info.state].filter(Boolean).join(', ')}`);
                        setGeoMsg('Location detected');
                      } else {
                        setZipValid(false);
                        setGeoMsg('Location found, please enter PIN to verify');
                      }
                    } else {
                      setGeoMsg('Could not resolve your address');
                    }
                  } catch {
                    setGeoMsg('Reverse geocoding failed');
                  }
                } catch (err) {
                  if (err && err.code === 1) setGeoMsg('Permission denied. Please allow location access.');
                  else if (err && err.code === 3) setGeoMsg('Timed out. Please try again.');
                  else setGeoMsg('Unable to get your location');
                } finally {
                  setGeoLoading(false);
                }
              }}
              className={`px-3 py-2 border rounded text-sm ${geoLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
              disabled={geoLoading}
            >
              {geoLoading ? 'Locating...' : 'Use current location'}
            </button>
            {geoMsg && <p className="text-xs text-gray-600 mt-1">{geoMsg}</p>}
            <button type="button" className="px-3 py-2 border rounded text-sm" onClick={() => setShowMap(s => !s)}>
              {showMap ? 'Hide map' : 'Adjust on map'}
            </button>
          </div>
          {showMap && (
            <div className="mt-3">
              <MapPicker
                value={loc}
                onChange={async (pos) => {
                  setLoc(pos);
                  try {
                    const info = await reverseGeocode(pos.lat, pos.lng);
                    if (info) {
                      const digits = String(info.zip || '').replace(/\D/g, '');
                      setAreaQuery(info.area || info.formatted || areaQuery);
                      // loc already updated from marker drag
                      setForm((f) => ({
                        ...f,
                        address2: info.area || f.address2,
                        city: info.city || f.city,
                        state: info.state || f.state,
                        zip: info.zip || f.zip,
                        country: info.country || f.country,
                        location: { lat: pos.lat, lng: pos.lng },
                      }));
                      if (digits) {
                        setZipResolvedFor(digits);
                        setZipValid(true);
                        setZipLookupMsg(`Adjusted to ${[info.city, info.state].filter(Boolean).join(', ')}`);
                      } else {
                        setZipValid(false);
                      }
                    }
                  } catch {}
                }}
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <input ref={(n)=>refs.current.email=n} type="email" name="email" value={form.email} onChange={onChange} className={`border rounded px-3 h-11 ${errors.email?'border-red-500':''}`} placeholder="Email (optional)" autoComplete="email" />
          <input ref={(n)=>refs.current.phone=n} name="phone" value={form.phone} onChange={onChange} className={`border rounded px-3 h-11 ${errors.phone?'border-red-500':''}`} placeholder="Phone" inputMode="tel" autoComplete="tel" />
        </div>
        {(errors.email || errors.phone) && (
          <p className="text-xs text-red-600 mt-1">{errors.email || errors.phone}</p>
        )}

        <input ref={(n)=>refs.current.address1=n} name="address1" value={form.address1} onChange={onChange} className={`border rounded px-3 h-11 w-full mt-3 ${errors.address1?'border-red-500':''}`} placeholder="House / Flat / Floor / Block" autoComplete="address-line1" />
        <input name="landmark" value={form.landmark} onChange={onChange} className="border rounded px-3 h-11 w-full mt-3" placeholder="Nearby landmark (optional)" />
        {errors.address1 && (<p className="text-xs text-red-600 mt-1">{errors.address1}</p>)}

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
            <input disabled readOnly name="city" value={form.city} className="border rounded px-3 h-11 bg-gray-100 text-gray-600 cursor-not-allowed" placeholder="City" />
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



