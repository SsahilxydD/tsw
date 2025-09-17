// src/utils/url.js
// Helpers for normalizing external URLs (product source links)

/**
 * Normalize a raw URL string so that it can be safely opened in a new tab.
 * - Keeps only http(s) schemes.
 * - Automatically prefixes protocol for protocol-relative and www. URLs.
 * - Returns an empty string when input is unusable.
 */
export function normalizeExternalUrl(input) {
  if (!input) return "";
  let raw = String(input).trim();
  if (!raw) return "";

  // Reject obvious javascript: or data: payloads
  if (/^(javascript|data):/i.test(raw)) return "";

  if (raw.startsWith("//")) {
    return `https:${raw}`;
  }

  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }

  if (/^www\./i.test(raw)) {
    return `https://${raw}`;
  }

  return "";
}