// Size normalization utilities (footwear → UK sizes)

// Map common EU sizes to UK (men's). Integer mapping for consistency.
const EU_TO_UK = new Map([
  [36, 3], [37, 4], [38, 5], [39, 6],
  [40, 6], [41, 7], [42, 8], [43, 9],
  [44, 10], [45, 11], [46, 12], [47, 13], [48, 14],
]);

export function isFootwearProduct(p) {
  const cat = String(p?.category || p?.categoryRaw || "").toLowerCase();
  const sizes = Array.isArray(p?.sizes) ? p.sizes : [];
  const hasFootHint = /(shoe|sneaker|footwear|loafer|boot)/.test(cat);
  const hasNumeric = sizes.some((x) => /^(?:m[-\s]?)?\d{1,2}(?:\.5)?$/i.test(String(x).trim()));
  return hasFootHint || hasNumeric;
}

export function toUKLabel(raw) {
  if (raw == null) return null;
  const s0 = String(raw).trim();
  if (!s0) return null;
  const s = s0.toUpperCase().replace(/_/g, " ").replace(/\s+/g, " ");

  // M-7 or M 7 → UK-7
  let m = s.match(/^M[-\s]?(\d{1,2}(?:\.5)?)$/);
  if (m) return `UK-${m[1]}`;
  // UK 7
  m = s.match(/^UK[-\s]?(\d{1,2}(?:\.5)?)$/);
  if (m) return `UK-${m[1]}`;
  // US 8 → UK 7 (approx men: UK = US - 1)
  m = s.match(/^US[-\s]?(\d{1,2}(?:\.5)?)$/);
  if (m) {
    const us = parseFloat(m[1]);
    const uk = isFinite(us) ? (us - 1) : NaN;
    return isFinite(uk) ? `UK-${(uk % 1 === 0 ? uk.toFixed(0) : uk.toFixed(1))}` : null;
  }
  // EU 41 → UK via table
  m = s.match(/^EU[R]?[-\s]?(\d{2})$/);
  if (m) {
    const eu = parseInt(m[1], 10);
    const uk = EU_TO_UK.get(eu);
    return uk ? `UK-${uk}` : null;
  }
  // Bare number: if 36..48 treat as EU; if 3..13 treat as UK
  m = s.match(/^(\d{1,2})(?:\.5)?$/);
  if (m) {
    const n = parseInt(m[1], 10);
    if (n >= 36 && n <= 48) {
      const uk = EU_TO_UK.get(n);
      return uk ? `UK-${uk}` : null;
    }
    if (n >= 3 && n <= 14) return `UK-${n}`;
  }
  return null;
}

export function uniqueUKLabels(sizes = []) {
  const out = [];
  const seen = new Set();
  for (const raw of sizes) {
    const label = toUKLabel(raw);
    if (!label) continue;
    const n = parseFloat(String(label).replace(/[^0-9.]/g, ""));
    // Clamp to valid store range (UK 5 .. 13)
    if (!Number.isFinite(n) || n < 5 || n > 13) continue;
    if (!seen.has(label)) { seen.add(label); out.push(label); }
  }
  // Sort by numeric UK
  out.sort((a, b) => {
    const na = parseFloat(a.replace(/[^0-9.]/g, ""));
    const nb = parseFloat(b.replace(/[^0-9.]/g, ""));
    return na - nb;
  });
  return out;
}

export const UK_FOOT_RANGE = [5,6,7,8,9,10,11,12,13].map((n) => `UK-${n}`);
