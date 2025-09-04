// src/components/PlacesAutocomplete.jsx
import React from 'react';

export default function PlacesAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = 'Search area or society',
  country = 'IN',
  className = 'border rounded px-3 h-11 w-full',
  disabled = false,
  onInputBlur,
}) {
  const inputRef = React.useRef(null);
  const [ready] = React.useState(true);
  const [items, setItems] = React.useState([]);
  const [open, setOpen] = React.useState(false);

  // Debounced maps.co search
  const debRef = React.useRef(null);
  const search = (q) => {
    try { if (debRef.current) clearTimeout(debRef.current); } catch {}
    if (!q || q.trim().length < 3) { setItems([]); setOpen(false); return; }
    debRef.current = setTimeout(async () => {
      try {
        const cc = String(country || 'IN').toLowerCase();
        const key = import.meta.env.VITE_GEOCODER_KEY || '';
        const url = `https://geocode.maps.co/search?format=json&addressdetails=1&limit=5&countrycodes=${encodeURIComponent(cc)}&q=${encodeURIComponent(q)}${key?`&api_key=${encodeURIComponent(key)}`:''}`;
        const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
        if (!res.ok) throw new Error('mapsco');
        const data = await res.json();
        const arr = Array.isArray(data) ? data : [];
        const mapped = arr.map((it) => {
          const a = it.address || {};
          const area = a.suburb || a.neighbourhood || a.quarter || a.village || a.town || a.city || '';
          const city = a.city || a.town || a.village || '';
          const state = a.state || '';
          const zip = a.postcode || '';
          const countryName = a.country || '';
          return {
            key: `${it.osm_type}:${it.osm_id}`,
            label: it.display_name,
            area,
            city,
            state,
            zip,
            country: countryName,
            location: { lat: Number(it.lat), lng: Number(it.lon) },
          };
        });
        setItems(mapped);
        setOpen(true);
      } catch {
        setItems([]);
        setOpen(false);
      }
    }, 250);
  };

  const onInput = (e) => {
    const v = e.target.value;
    onChange && onChange(v);
    search(v);
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={onInput}
        placeholder={placeholder}
        className={className}
        disabled={disabled}
        aria-label="Search area or society"
        onBlur={(e) => { onInputBlur && onInputBlur(e); }}
      />
      {open && items.length > 0 && (
        <div className="absolute z-20 left-0 right-0 mt-1 bg-white border rounded shadow max-h-60 overflow-auto">
          {items.map((it) => (
            <button
              key={it.key}
              type="button"
              className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onSelect && onSelect(it); setOpen(false); }}
            >
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
