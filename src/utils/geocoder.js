// src/utils/geocoder.js
// Provider-agnostic geocoding with forward + reverse lookup.
// Reads VITE_GEOCODER_KEY and optional VITE_GEOCODER_PROVIDER (mapsco | opencage | locationiq | positionstack).

const KEY = import.meta.env.VITE_GEOCODER_KEY || '';
const PROVIDER = (import.meta.env.VITE_GEOCODER_PROVIDER || '').toLowerCase();

const tryOrder = PROVIDER
  ? [PROVIDER]
  : ['mapsco', 'opencage', 'locationiq', 'positionstack'];

function pickArea(parts = {}) {
  const prefs = [
    'suburb', 'neighbourhood', 'neighborhood', 'sublocality', 'sublocality_level_1', 'sublocality_level_2',
    'residential', 'quarter', 'hamlet', 'village', 'locality', 'town', 'city', 'district'
  ];
  for (const k of prefs) if (parts[k]) return String(parts[k]);
  return '';
}

function normalize(out) {
  const area = out.area || pickArea(out.parts || {});
  return {
    area: area || '',
    city: out.city || out.town || out.locality || out.village || '',
    state: out.state || out.region || '',
    zip: out.zip || out.postcode || out.postal_code || '',
    country: out.country || '',
    formatted: out.formatted || out.label || '',
    location: out.location && typeof out.location.lat === 'number' && typeof out.location.lng === 'number'
      ? out.location
      : null,
  };
}

async function ocForward(q, countryCode) {
  const base = 'https://api.opencagedata.com/geocode/v1/json';
  const params = new URLSearchParams({ q, key: KEY, limit: '1', language: 'en', no_annotations: '1' });
  if (countryCode) params.set('countrycode', String(countryCode).toLowerCase());
  const res = await fetch(`${base}?${params}`);
  if (!res.ok) throw new Error('opencage forward');
  const data = await res.json();
  const r = (data.results || [])[0];
  if (!r) return null;
  const c = r.components || {};
  return normalize({
    parts: c,
    area: pickArea(c),
    city: c.city || c.town || c.village,
    state: c.state,
    zip: c.postcode,
    country: c.country,
    formatted: r.formatted,
    location: r.geometry ? { lat: Number(r.geometry.lat), lng: Number(r.geometry.lng) } : null,
  });
}

async function ocReverse(lat, lng) {
  const base = 'https://api.opencagedata.com/geocode/v1/json';
  const params = new URLSearchParams({ q: `${lat}+${lng}`, key: KEY, limit: '1', language: 'en', no_annotations: '1' });
  const res = await fetch(`${base}?${params}`);
  if (!res.ok) throw new Error('opencage reverse');
  const data = await res.json();
  const r = (data.results || [])[0];
  if (!r) return null;
  const c = r.components || {};
  return normalize({
    parts: c,
    area: pickArea(c),
    city: c.city || c.town || c.village,
    state: c.state,
    zip: c.postcode,
    country: c.country,
    formatted: r.formatted,
    location: { lat: Number(r.geometry.lat), lng: Number(r.geometry.lng) },
  });
}

async function liqForward(q, countryCode) {
  const base = 'https://us1.locationiq.com/v1/search';
  const params = new URLSearchParams({ key: KEY, q, format: 'json', addressdetails: '1', limit: '1' });
  if (countryCode) params.set('countrycodes', String(countryCode).toLowerCase());
  const res = await fetch(`${base}?${params}`);
  if (!res.ok) throw new Error('locationiq forward');
  const arr = await res.json();
  const r = Array.isArray(arr) ? arr[0] : null;
  if (!r) return null;
  const a = r.address || {};
  return normalize({
    parts: a,
    area: pickArea(a),
    city: a.city || a.town || a.village,
    state: a.state,
    zip: a.postcode,
    country: a.country,
    formatted: r.display_name,
    location: { lat: Number(r.lat), lng: Number(r.lon) },
  });
}

async function liqReverse(lat, lng) {
  const base = 'https://us1.locationiq.com/v1/reverse';
  const params = new URLSearchParams({ key: KEY, lat: String(lat), lon: String(lng), format: 'json', addressdetails: '1' });
  const res = await fetch(`${base}?${params}`);
  if (!res.ok) throw new Error('locationiq reverse');
  const r = await res.json();
  const a = r.address || {};
  return normalize({
    parts: a,
    area: pickArea(a),
    city: a.city || a.town || a.village,
    state: a.state,
    zip: a.postcode,
    country: a.country,
    formatted: r.display_name,
    location: { lat, lng },
  });
}

async function psForward(q, countryCode) {
  const base = 'https://api.positionstack.com/v1/forward';
  const params = new URLSearchParams({ access_key: KEY, query: q, limit: '1' });
  if (countryCode) params.set('country', String(countryCode).toLowerCase());
  const res = await fetch(`${base}?${params}`);
  if (!res.ok) throw new Error('positionstack forward');
  const data = await res.json();
  const r = (data.data || [])[0];
  if (!r) return null;
  const parts = { suburb: r.neighbourhood || r.county, locality: r.locality };
  return normalize({
    parts,
    area: r.name || r.neighbourhood || r.locality,
    city: r.locality || r.county || r.region,
    state: r.region,
    zip: r.postal_code,
    country: r.country,
    formatted: r.label,
    location: { lat: Number(r.latitude), lng: Number(r.longitude) },
  });
}

async function psReverse(lat, lng) {
  const base = 'https://api.positionstack.com/v1/reverse';
  const params = new URLSearchParams({ access_key: KEY, query: `${lat},${lng}`, limit: '1' });
  const res = await fetch(`${base}?${params}`);
  if (!res.ok) throw new Error('positionstack reverse');
  const data = await res.json();
  const r = (data.data || [])[0];
  if (!r) return null;
  const parts = { suburb: r.neighbourhood || r.county, locality: r.locality };
  return normalize({
    parts,
    area: r.name || r.neighbourhood || r.locality,
    city: r.locality || r.county || r.region,
    state: r.region,
    zip: r.postal_code,
    country: r.country,
    formatted: r.label,
    location: { lat: Number(r.latitude), lng: Number(r.longitude) },
  });
}

export async function forwardGeocode(query, countryCode) {
  if (!KEY) throw new Error('Missing VITE_GEOCODER_KEY');
  for (const p of tryOrder) {
    try {
      if (p === 'mapsco') {
        const r = await mapscoForward(query, countryCode); if (r) return r;
      }
      if (p === 'opencage') { const r = await ocForward(query, countryCode); if (r) return r; }
      if (p === 'locationiq') { const r = await liqForward(query, countryCode); if (r) return r; }
      if (p === 'positionstack') { const r = await psForward(query, countryCode); if (r) return r; }
    } catch {}
  }
  return null;
}

export async function reverseGeocode(lat, lng) {
  if (!KEY) throw new Error('Missing VITE_GEOCODER_KEY');
  for (const p of tryOrder) {
    try {
      if (p === 'mapsco') {
        const r = await mapscoReverse(lat, lng); if (r) return r;
      }
      if (p === 'opencage') { const r = await ocReverse(lat, lng); if (r) return r; }
      if (p === 'locationiq') { const r = await liqReverse(lat, lng); if (r) return r; }
      if (p === 'positionstack') { const r = await psReverse(lat, lng); if (r) return r; }
    } catch {}
  }
  return null;
}

// --- geocode.maps.co (Nominatim proxy) ---
async function mapscoForward(q, countryCode) {
  const base = 'https://geocode.maps.co/search';
  const params = new URLSearchParams({ q, api_key: KEY, limit: '1', addressdetails: '1' });
  if (countryCode) params.set('countrycodes', String(countryCode).toLowerCase());
  const res = await fetch(`${base}?${params}`);
  if (!res.ok) throw new Error('mapsco forward');
  const arr = await res.json();
  const r = Array.isArray(arr) ? arr[0] : null;
  if (!r) return null;
  const a = r.address || {};
  return normalize({
    parts: a,
    area: pickArea(a),
    city: a.city || a.town || a.village,
    state: a.state,
    zip: a.postcode,
    country: a.country,
    formatted: r.display_name,
    location: { lat: Number(r.lat), lng: Number(r.lon) },
  });
}

async function mapscoReverse(lat, lng) {
  const base = 'https://geocode.maps.co/reverse';
  const params = new URLSearchParams({ lat: String(lat), lon: String(lng), api_key: KEY, addressdetails: '1' });
  const res = await fetch(`${base}?${params}`);
  if (!res.ok) throw new Error('mapsco reverse');
  const r = await res.json();
  const a = r.address || {};
  return normalize({
    parts: a,
    area: pickArea(a),
    city: a.city || a.town || a.village,
    state: a.state,
    zip: a.postcode,
    country: a.country,
    formatted: r.display_name || '',
    location: { lat, lng },
  });
}
