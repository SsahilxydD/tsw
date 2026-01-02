// src/utils/related.js
import { cyrb128, sfc32, getSessionSeed } from "./rand";
import { seededShuffle } from "./scramble";

/** Normalize text -> tokens (no numbers, 3+ letters, no stopwords) */
function tokens(str) {
  if (!str) return [];
  const STOP = new Set([
    "the","and","for","with","from","mens","men","womens","women","unisex","new",
    "edition","original","premium","classic","black","white","green","blue","red",
    "size","ml","edp","edt","eau","de","parfum","perfume","shirt","tshirt","t","tee",
    "polo","topwear","footwear","shoes","sneaker","watch","watches","brand"
  ]);
  return String(str)
    .toLowerCase()
    .replace(/[@™©®]/g, " ")
    .split(/[^a-z]+/g)
    .filter(w => w.length >= 3 && !STOP.has(w));
}

function brandOf(p) {
  return (
    p?.brand ||
    p?.vendor ||
    p?.maker ||
    p?._raw?.brand ||
    p?._raw?.vendor ||
    null
  );
}

function idOf(p) {
  return String(p?._id ?? p?.id ?? p?.slug ?? "");
}

/**
 * Build 6 related products:
 *  - Top 4 = best matches (category + brand + keyword overlap)
 *  - Bottom 2 = random from the remainder
 * Deterministic per session (so no jank while the user browses).
 */
export function selectRelatedProducts(current, allProducts, opts = {}) {
  const seed = opts.seed ?? getSessionSeed();
  const salt = `related:${idOf(current)}`;
  const [a, b, c, d] = cyrb128(String(seed) + "::" + salt);
  const rng = sfc32(a, b, c, d);

  const meId = idOf(current);
  const meCat = (current?.categoryRaw ?? current?.category ?? "").toLowerCase();
  const meSub = (current?.subCategory ?? "").toLowerCase();
  const meBrand = (brandOf(current) || "").toLowerCase();
  const meTokens = new Set([
    ...tokens(current?.name),
    ...tokens(current?._raw?.title || current?._raw?.slug_name)
  ]);

  // Build candidate list (exclude current)
  const candidates = (Array.isArray(allProducts) ? allProducts : []).filter(
    (p) => idOf(p) && idOf(p) !== meId
  );

  // Prefer same taxonomy category (categoryRaw) whenever possible.
  // If there aren't enough items in the same category, fall back to all candidates.
  const sameCat = candidates.filter((p) => (p?.categoryRaw ?? p?.category ?? "").toLowerCase() === meCat);
  const pool = sameCat.length >= 6 ? sameCat : candidates;

  // Score candidates
  const scored = pool.map((p) => {
    let score = 0;
    const pCat = (p?.categoryRaw ?? p?.category ?? "").toLowerCase();
    const pSub = (p?.subCategory ?? "").toLowerCase();
    const pBrand = (brandOf(p) || "").toLowerCase();
    if (meCat && pCat && meCat === pCat) score += 3;
    if (meSub && pSub && meSub === pSub) score += 1.25;
    if (meBrand && pBrand && meBrand === pBrand) score += 2;

    // keyword overlap
    const ptoks = tokens(p?.name).concat(tokens(p?._raw?.title || p?._raw?.slug_name));
    let overlap = 0;
    for (const t of ptoks) if (meTokens.has(t)) overlap++;
    // cap to avoid domination by long titles
    score += Math.min(overlap, 4) * 0.75;

    // gentle price closeness bonus (optional but helpful)
    if (Number.isFinite(current?.price) && Number.isFinite(p?.price)) {
      const diff = Math.abs(current.price - p.price);
      const rel = diff / Math.max(1, current.price);
      if (rel < 0.15) score += 0.5;       // within 15%
      else if (rel < 0.30) score += 0.25; // within 30%
    }

    return { p, score };
  });

  // Random tie-breaker but deterministic in-session
  const tie = () => rng();

  // Strong first: score descending, tie by random
  scored.sort((A, B) => {
    if (B.score !== A.score) return B.score - A.score;
    return tie() - tie();
  });

  // Take top 4 (allow weaker matches if not enough)
  const first4 = scored.slice(0, 4).map((s) => s.p);

  // Build pool for the last 2 (exclude what we already picked)
  const pickedIds = new Set(first4.map(idOf));
  const remainder = pool.filter((p) => !pickedIds.has(idOf(p)));

  // Shuffle remainder and take 2
  const shuffled = seededShuffle(remainder, rng);
  const last2 = shuffled.slice(0, 2);

  // Final list (dedup just in case)
  const out = [...first4, ...last2];
  const seen = new Set();
  return out.filter((p) => {
    const k = idOf(p);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  }).slice(0, 6);
}
