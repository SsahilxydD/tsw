// Size normalization utilities (footwear -> UK sizes)

// Map common EU sizes to UK (men's). Integer mapping for consistency.
const EU_TO_UK = new Map([
  [36, 3], [37, 4], [38, 5], [39, 6],
  [40, 6], [41, 7], [42, 8], [43, 9],
  [44, 10], [45, 11], [46, 12], [47, 13], [48, 14],
]);

export function isFootwearProduct(p) {
  const cat = String(p?.category || p?.categoryRaw || "").toLowerCase();
  const sizes = Array.isArray(p?.sizes) ? p.sizes : [];
  // Include flip-flops, slides, slippers, clogs, sandals alongside shoes
  const hasFootHint = /(shoe|sneaker|footwear|loafer|boot|flip\s?flop|slide|slipper|clog|sandal)/.test(cat);
  const hasNumeric = sizes.some((x) => /^(?:m[-\s]?)?\d{1,2}(?:\.5)?$/i.test(String(x).trim()));
  // Some scraped catalogs carry placeholder tokens like "EURO" / "UK" without numbers
  const hasUnitToken = sizes.some((x) => /^(EURO|EU|UK|US)$/i.test(String(x).trim()))
    || sizes.some((x) => /^(\d{1,2})-(UK|EU)$/i.test(String(x).trim()));
  return hasFootHint || hasNumeric || hasUnitToken;
}

// Detect jeans/bottomwear by category
export function isJeansProduct(p) {
  const cat = String(p?.category || p?.categoryRaw || "").toLowerCase();
  return /\bjeans?\b/.test(cat) || /\bbottom\s?wear\b/.test(cat);
}

// Normalize jeans sizes to numeric waist strings: "30", "32", ...
// Accept patterns like: 30, W30, 30W, 30x32, 30/32, 30-32, Waist 30
export function normalizeJeansSizes(input = []) {
  const out = [];
  const seen = new Set();
  for (const x of input) {
    const s = String(x ?? "").toUpperCase().trim();
    if (!s) continue;
    // Grab the first two-digit number (waist). Support separators for length
    const m = s.match(/\b(\d{2})\b(?:\s*[Xx*/-]\s*\d{2})?/);
    if (!m) continue;
    const n = parseInt(m[1], 10);
    // Clamp to reasonable jeans waist range
    if (!Number.isFinite(n) || n < 26 || n > 48) continue;
    const label = String(n);
    if (!seen.has(label)) { seen.add(label); out.push(label); }
  }
  // Sort numerically (ascending)
  out.sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
  return out;
}

export function toUKLabel(raw) {
  if (raw == null) return null;
  const s0 = String(raw).trim();
  if (!s0) return null;
  const s = s0.toUpperCase().replace(/_/g, " ").replace(/\s+/g, " ");

  // M-7 or M 7 -> UK-7
  let m = s.match(/^M[-\s]?(\d{1,2}(?:\.5)?)$/);
  if (m) return `UK-${m[1]}`;
  // UK 7
  m = s.match(/^UK[-\s]?(\d{1,2}(?:\.5)?)$/);
  if (m) return `UK-${m[1]}`;
  // US 8 -> UK 7 (approx men: UK = US - 1)
  m = s.match(/^US[-\s]?(\d{1,2}(?:\.5)?)$/);
  if (m) {
    const us = parseFloat(m[1]);
    const uk = isFinite(us) ? (us - 1) : NaN;
    return isFinite(uk) ? `UK-${(uk % 1 === 0 ? uk.toFixed(0) : uk.toFixed(1))}` : null;
  }
  // EU 41 -> UK via table
  m = s.match(/^EU[R]?[-\s]?(\d{2})$/);
  if (m) {
    const eu = parseInt(m[1], 10);
    const uk = EU_TO_UK.get(eu);
    return uk ? `UK-${uk}` : null;
  }
  // Mis-labeled tokens like "41-UK" or "42-EU" -> interpret sensibly
  m = s.match(/^(\d{1,2})-(UK|EU)$/);
  if (m) {
    const n = parseInt(m[1], 10);
    const sys = m[2];
    if (sys === 'UK') {
      // If within a plausible UK range treat as UK directly; otherwise consider it EU
      if (n >= 3 && n <= 12) return `UK-${n}`;
      const uk = EU_TO_UK.get(n);
      return uk ? `UK-${uk}` : null;
    }
    if (sys === 'EU') {
      const uk = EU_TO_UK.get(n);
      return uk ? `UK-${uk}` : null;
    }
  }
  // Bare number: if 36..48 treat as EU; if 3..12 treat as UK
  m = s.match(/^(\d{1,2})(?:\.5)?$/);
  if (m) {
    const n = parseInt(m[1], 10);
    if (n >= 36 && n <= 48) {
      const uk = EU_TO_UK.get(n);
      return uk ? `UK-${uk}` : null;
    }
    if (n >= 3 && n <= 12) return `UK-${n}`;
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
    // Clamp to valid store range (UK 5 .. 12)
    if (!Number.isFinite(n) || n < 5 || n > 12) continue;
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

export const UK_FOOT_RANGE = [5,6,7,8,9,10,11,12].map((n) => `UK-${n}`);
