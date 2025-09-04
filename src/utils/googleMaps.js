// src/utils/googleMaps.js
// Lightweight Google Maps JS API loader (Places only)
// Usage: await ensureGoogleMaps(); then access window.google

let loadPromise = null;

export function ensureGoogleMaps(options = {}) {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'));
  if (window.google && window.google.maps && window.google.maps.places) {
    return Promise.resolve(window.google);
  }
  if (loadPromise) return loadPromise;

  const key = options.apiKey || import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!key) return Promise.reject(new Error('Missing VITE_GOOGLE_MAPS_API_KEY'));

  loadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-google-maps-loader]');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.google));
      existing.addEventListener('error', reject);
      return;
    }
    const cbName = '__gmaps_init_' + Math.random().toString(36).slice(2);
    window[cbName] = () => {
      try { delete window[cbName]; } catch {}
      resolve(window.google);
    };
    const params = new URLSearchParams({
      key,
      libraries: 'places',
      callback: cbName,
    });
    const src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.defer = true;
    s.setAttribute('data-google-maps-loader', 'true');
    s.onerror = (e) => {
      try { delete window[cbName]; } catch {}
      reject(e);
    };
    document.head.appendChild(s);
  });

  return loadPromise;
}

export function parseAddressComponents(components = []) {
  const out = { city: '', state: '', zip: '', country: '' };
  for (const c of components) {
    const types = new Set(c.types || []);
    if (types.has('postal_code')) out.zip = c.long_name || c.short_name || '';
    if (types.has('locality')) out.city = c.long_name || c.short_name || '';
    // fallback city from district
    if (!out.city && types.has('administrative_area_level_2')) out.city = c.long_name || c.short_name || '';
    if (types.has('administrative_area_level_1')) out.state = c.long_name || c.short_name || '';
    if (types.has('country')) out.country = c.long_name || c.short_name || '';
  }
  return out;
}

function chooseAreaName(components = [], fallbackFormatted = '') {
  // Prefer sublocality or neighborhood; fallback to formatted/locality
  let area = '';
  const tryTypes = [
    'sublocality_level_2',
    'sublocality_level_1',
    'neighborhood',
    'premise',
    'route',
    'political',
  ];
  for (const c of components) {
    const types = new Set(c.types || []);
    for (const t of tryTypes) {
      if (types.has(t)) {
        area = c.long_name || c.short_name || '';
        if (area) return area;
      }
    }
  }
  if (!area) {
    // As a last resort, try locality
    for (const c of components) {
      const types = new Set(c.types || []);
      if (types.has('locality')) return c.long_name || c.short_name || '';
    }
  }
  return area || fallbackFormatted || '';
}

export async function reverseGeocode(lat, lng) {
  const google = await ensureGoogleMaps();
  const geocoder = new google.maps.Geocoder();
  try {
    const resp = await geocoder.geocode({ location: { lat, lng } });
    const results = resp && resp.results ? resp.results : [];
    const best = results[0] || null;
    const comps = parseAddressComponents(best?.address_components || []);
    const area = chooseAreaName(best?.address_components || [], best?.formatted_address || '');
    return {
      area,
      formatted: best?.formatted_address || '',
      ...comps,
      location: { lat, lng },
    };
  } catch (e) {
    throw e;
  }
}

// Fallback reverse geocoder using OpenStreetMap Nominatim (no key)
export async function reverseGeocodeFallback(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&addressdetails=1`;
  const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!res.ok) throw new Error('OSM reverse geocode failed');
  const data = await res.json();
  const addr = data.address || {};
  const city = addr.city || addr.town || addr.village || addr.hamlet || addr.county || '';
  const state = addr.state || '';
  const zip = addr.postcode || '';
  const country = addr.country || '';
  const area = addr.suburb || addr.neighbourhood || addr.quarter || addr.village || addr.locality || '';
  return {
    area,
    formatted: data.display_name || '',
    city, state, zip, country,
    location: { lat, lng },
  };
}
