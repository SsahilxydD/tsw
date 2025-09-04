// src/components/MapPicker.jsx
import React from 'react';
import { ensureLeaflet } from '../utils/osm';

export default function MapPicker({
  value,
  onChange,
  className = 'w-full h-56 rounded border overflow-hidden',
  zoom = 16,
  disabled = false,
}) {
  const mapRef = React.useRef(null);
  const mapObjRef = React.useRef(null);
  const markerRef = React.useRef(null);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    ensureLeaflet()
      .then((L) => {
        if (!active || !mapRef.current) return;
        const center = value && value.lat && value.lng
          ? [Number(value.lat), Number(value.lng)]
          : [28.6139, 77.2090];
        const map = L.map(mapRef.current).setView(center, zoom);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(map);
        const marker = L.marker(center, { draggable: !disabled }).addTo(map);
        marker.on('dragend', () => {
          const p = marker.getLatLng();
          onChange && onChange({ lat: p.lat, lng: p.lng });
        });
        mapObjRef.current = map;
        markerRef.current = marker;
        setReady(true);
      })
      .catch(() => setReady(false));
    return () => { active = false; };
  }, []);

  // Update marker/center when value changes
  React.useEffect(() => {
    try {
      if (!ready || !value || !markerRef.current || !mapObjRef.current) return;
      const m = markerRef.current;
      const map = mapObjRef.current;
      const pos = [Number(value.lat), Number(value.lng)];
      m.setLatLng(pos);
      map.setView(pos, map.getZoom());
    } catch {}
  }, [ready, value]);

  return (
    <div className={className} aria-label="Adjust location on map">
      <div ref={mapRef} className="w-full h-full" />
      {!ready && (
        <div className="w-full h-full grid place-content-center text-sm text-gray-500 p-4 text-center">
          Map unavailable
        </div>
      )}
    </div>
  );
}
