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
  // Never classify bottomwear as footwear
  if (/(jeans|trouser|pant|chino|bottom\s?wear|shorts?)\b/.test(cat)) return false;

  // If any size token can be parsed into a UK shoe label, treat as footwear.
  try {
    for (const x of sizes) {
      if (toUKLabel(x)) return true;
    }
  } catch { /* size parsing failed - not footwear */ }

  // Include flip-flops, slides, slippers, clogs, sandals alongside shoes
  const hasFootHint = /(shoe|sneaker|footwear|loafer|boot|flip\s?flop|slide|slipper|clog|sandal)/.test(cat);

  // Numeric shoe sizes typically fall into these ranges
  const looksLikeFootNumber = (n) => (n >= 3 && n <= 12) || (n >= 36 && n <= 48);
  const hasFootNumeric = sizes.some((x) => {
    const s = String(x).trim().toUpperCase();
    // Accept tokens like M-7, 7, 7.5, 41, etc., but avoid waist-like patterns (30x32)
    if (/\b\d{2}\s*[Xx*/-]\s*\d{2}\b/.test(s)) return false;
    const m = s.match(/^(?:M[-\s]?)?(\d{1,2})(?:\.5)?$/);
    if (!m) return false;
    const n = parseInt(m[1], 10);
    return looksLikeFootNumber(n);
  });

  // Some scraped catalogs carry placeholder tokens like "EURO" / "UK" without numbers
  const hasUnitToken = sizes.some((x) => /^(EURO|EU|UK|US)$/i.test(String(x).trim()))
    || sizes.some((x) => /^(\d{1,2})-(UK|EU)$/i.test(String(x).trim()));

  return hasFootHint || hasFootNumeric || hasUnitToken;
}

// Detect jeans/bottomwear by category
export function isJeansProduct(p) {
  const cat = String(p?.category || p?.categoryRaw || "").toLowerCase();
  return /(jeans|trouser|pant|chino|denim|bottom\s?wear)\b/.test(cat);
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
  const s = s0
    .toUpperCase()
    .replace(/_/g, " ")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();

  // Helper: EU -> UK using table; accept decimals by nearest mapping
  const euToUk = (euRaw) => {
    if (euRaw == null || euRaw === "") return null;
    const euNum = parseFloat(euRaw);
    if (!Number.isFinite(euNum)) return null;
    // Prefer exact integer mapping. If decimal, round to nearest mapped EU size
    const exact = EU_TO_UK.get(Math.round(euNum));
    return exact ? `UK-${exact}` : null;
  };

  // 1) If we can find an explicit UK value anywhere in the string, prefer it.
  //    This covers patterns like "UK 7", "UK-7.5", "EURO 41 - UK 7" and "UK 10 / EURO 44"
  let m = s.match(/\bUK\s*[-:]?\s*(\d{1,2}(?:\.5)?)\b/);
  if (m) return `UK-${m[1]}`;

  // 2) Common brand format: M-7 or M 7
  m = s.match(/^M[-\s]?(\d{1,2}(?:\.5)?)$/);
  if (m) return `UK-${m[1]}`;

  // 3) US sizes: US 8 -> UK 7 (approx men: UK = US - 1)
  m = s.match(/\bUS\s*[-:]?\s*(\d{1,2}(?:\.5)?)\b/);
  if (m) {
    const us = parseFloat(m[1]);
    const uk = isFinite(us) ? (us - 1) : NaN;
    return isFinite(uk) ? `UK-${(uk % 1 === 0 ? uk.toFixed(0) : uk.toFixed(1))}` : null;
  }

  // 4) EU sizes anywhere: "EU 41", "EUR-42.5", "EURO 44"
  m = s.match(/\bEU[RO]?\b\s*[-:]?\s*(\d{2}(?:\.5)?)\b/);
  if (m) {
    const out = euToUk(m[1]);
    if (out) return out;
  }

  // 5) Mis-labeled tokens like "41-UK" or "42-EU"
  m = s.match(/^(\d{1,2})\s*-\s*(UK|EU)$/);
  if (m) {
    const n = parseFloat(m[1]);
    const sys = m[2];
    if (sys === 'UK') {
      if (n >= 3 && n <= 12) return `UK-${n % 1 === 0 ? n.toFixed(0) : n.toFixed(1)}`;
      const out = euToUk(n);
      if (out) return out;
    }
    if (sys === 'EU') {
      const out = euToUk(n);
      if (out) return out;
    }
  }

  // 6) Bare number: if 36..48 -> EU; if 3..12 -> UK
  m = s.match(/^(\d{1,2})(?:\.5)?$/);
  if (m) {
    const n = parseFloat(m[1]);
    if (n >= 36 && n <= 48) {
      const out = euToUk(n);
      if (out) return out;
    }
    if (n >= 3 && n <= 12) return `UK-${n % 1 === 0 ? n.toFixed(0) : n.toFixed(1)}`;
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
