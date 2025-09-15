// Very simple SMS parser for bank credit messages.
// Adjust patterns for your bank's SMS format.

function extractAmountPaise(text) {
  // Try patterns like: "INR 799.00" or "Rs 799" or "₹799.00"
  const patterns = [
    /(?:INR|Rs\.?|₹)\s*([0-9]+(?:\.[0-9]{1,2})?)/i,
    /credited\s+(?:with\s+)?([0-9]+(?:\.[0-9]{1,2})?)/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m && m[1]) {
      return Math.round(parseFloat(m[1]) * 100);
    }
  }
  return null;
}

function extractNote(text, candidates) {
  const upper = text.toUpperCase();
  // Prefer exact candidate order IDs present in text
  if (Array.isArray(candidates)) {
    for (const c of candidates) {
      if (upper.includes(String(c).toUpperCase())) return c;
    }
  }

  // Fallback via common tokens: Ref/Reference/Note/UPI Ref
  const re = /(UPI\s*(?:REF(?:ERENCE)?|NOTE)?|REF(?:ERENCE)?|NOTE|REMARKS)[^A-Z0-9]*([A-Z0-9\-_.]{4,})/i;
  const m = text.match(re);
  if (m && m[2]) return m[2];

  // As a last resort, try ORDER/ORD patterns
  const m2 = text.match(/\b(ORDER[0-9A-Z\-]+|ORD-[0-9A-Z\-]+)\b/i);
  if (m2 && m2[1]) return m2[1];
  return null;
}

function containsUpiId(text, upiId) {
  if (!upiId) return true;
  try {
    const t = String(text).toLowerCase();
    const id = String(upiId).toLowerCase();
    return t.includes(id);
  } catch (_) {
    return false;
  }
}

module.exports = { extractAmountPaise, extractNote, containsUpiId };
