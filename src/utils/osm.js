// src/utils/osm.js
// Minimal loader for Leaflet (OpenStreetMap) from CDN for fallback when
// Google Maps isn't available. Provides ensureLeaflet() that resolves to L.

let leafletPromise = null;

export function ensureLeaflet() {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'));
  if (window.L && typeof window.L.map === 'function') return Promise.resolve(window.L);
  if (leafletPromise) return leafletPromise;

  leafletPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-leaflet]');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.L));
      existing.addEventListener('error', reject);
      return;
    }
    // CSS
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    css.setAttribute('data-leaflet', 'true');
    document.head.appendChild(css);
    // JS
    const s = document.createElement('script');
    s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    s.defer = true;
    s.async = true;
    s.setAttribute('data-leaflet', 'true');
    s.onload = () => resolve(window.L);
    s.onerror = reject;
    document.head.appendChild(s);
  });

  return leafletPromise;
}

