// src/utils/scramble.js
import { cyrb128, sfc32, getSessionSeed } from "./rand";

// Fisher–Yates shuffle (seeded)
export function seededShuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Interleave groups round-robin, blockSize items at a time from each group
function interleave(groups, blockSize = 1) {
  const idx = groups.map(() => 0);
  const total = groups.reduce((s, g) => s + g.length, 0);
  const out = [];
  let left = total;

  while (left > 0) {
    for (let g = 0; g < groups.length; g++) {
      let take = 0;
      while (take < blockSize && idx[g] < groups[g].length) {
        out.push(groups[g][idx[g]++]);
        take++;
        left--;
      }
    }
  }
  return out;
}

/**
 * Smart scramble:
 *  - build groups by a key (brand/vendor/host/category/slug prefix fallback)
 *  - shuffle groups + shuffle inside group (seeded)
 *  - round-robin interleave to avoid clumps
 */
export function scrambleProducts(items, opts = {}) {
  const {
    seed = getSessionSeed(),
    groupBy = (p) =>
      p.brand || p.vendor || p.source || p.shop || p.domain ||
      extractHost(p.url || p.productUrl || p.link || p.href) ||
      p.category || String(p.slug || p._id || p.id || "").slice(0, 3) || "misc",
    blockSize = 1, // use 1 for best mixing; try 2 if you want denser clusters
    salt = ""      // you can pass route/category as salt to vary per page
  } = opts;

  // create rng from seed + salt
  const h = cyrb128(String(seed) + "::" + salt);
  const rng = sfc32(h[0], h[1], h[2], h[3]);

  // group
  const map = new Map();
  for (const it of items) {
    const k = safeKey(groupBy(it));
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(it);
  }

  // shuffle groups order, and items inside each group
  const groups = Array.from(map.values()).map((g) => seededShuffle(g, rng));
  const order = seededShuffle(groups, rng);

  // interleave groups to avoid clumps
  return interleave(order, blockSize);
}

// helpers
function extractHost(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); }
  catch { return null; }
}
function safeKey(v) {
  if (v == null) return "misc";
  return String(v).toLowerCase();
}
