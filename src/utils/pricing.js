// Single source of truth for product display pricing.
//
// The scraped catalog (products.json) stores PRE-markup `price`/`mrp`. The
// storefront adds a per-category markup at load time. This logic was previously
// duplicated in src/context/ShopContext.jsx and cloudflare-worker.js (with a
// divergent regex re-implementation), which let social-preview prices drift from
// the prices shown on the site. Both now import from here so they cannot diverge.
//
// Pure module (no React/DOM) so it can be bundled into the Cloudflare Worker too.

import { isFootwearProduct } from "./size.js";

// Collapse a raw category string to a comparison key: lowercase, strip accents
// and every non-alphanumeric character.
export const normalizeCategoryKey = (s) => String(s || "")
  .toLowerCase()
  .normalize("NFD")
  .replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9]+/g, "");

// Map of normalized category keys -> canonical categoryRaw used across the app.
export const CATEGORY_ALIASES = {
  discounted: "Discounted",
  sale: "Discounted",
  ladieswatch: "ladieswatches",
  ladieswatches: "ladieswatches",
  womenswatch: "ladieswatches",
  womenswatches: "ladieswatches",
  womensperfume: "womensperfume",
  womenperfume: "womensperfume",
  perfumeforwomen: "womensperfume",
  menperfume: "menperfume",
  mensperfume: "menperfume",
  tshirt: "t-shirts",
  tshirts: "t-shirts",
  tshirtsclothstopwear: "t-shirts",
  tshirtsclothstopwearmen: "t-shirts",
  shirts: "shirts",
  shirt: "shirts",
  sunglasses: "sunglasses",
  shades: "sunglasses",
  watches: "watches",
  watch: "watches",
  flipflop: "flipflops",
  flipflops: "flipflops",
  handbags: "handbags",
  handbag: "handbags",
  caps: "caps",
  cap: "caps",
  hats: "caps",
  hat: "caps",
  belts: "belts",
  belt: "belts",
  wallets: "wallets",
  wallet: "wallets",
  cardholder: "wallets",
  cardholders: "wallets",
  jeans: "jeans",
  jean: "jeans",
  denim: "jeans",
  jackets: "jackets",
  jacket: "jackets",
  windcheaters: "jackets",
  blazers: "jackets",
  sweatshirt: "sweatshirts",
  sweatshirts: "sweatshirts",
  tracksuit: "tracksuits",
  tracksuits: "tracksuits",
  hoodie: "hoodies",
  hoodies: "hoodies",
  trackpant: "trackpants",
  trackpants: "trackpants",
  jogger: "trackpants",
  joggers: "trackpants",
  womenshoes: "womenshoes",
  womenshoe: "womenshoes",
  ladieshoes: "womenshoes",
  shoes: "shoes",
  shoe: "shoes",
  sneaker: "shoes",
  sneakers: "shoes",
  footwear: "shoes",
};

// Per-category markup (₹) added to the scraped base price.
export const PRICE_ADJ = {
  belts: 200,
  caps: 200,
  flipflops: 150,
  hoodies: 150,
  handbags: 100,
  jackets: 150,
  jeans: 100,
  ladieswatches: 150,
  menperfume: 150,
  shirts: 200,
  sunglasses: 250,
  sweatshirts: 200,
  "t-shirts": 150,
  trackpants: 200,
  tracksuits: 150,
  wallets: 150,
  watches: 150,
  womensperfume: 150,
  womenshoes: 550,
  shoes: 550,
};

// Flat-price keyword set for Discounted footwear (slides/clogs/sandals -> ₹1399).
const DISCOUNTED_1399_KEYWORDS = [
  "brikenstock",
  "birkenstock",
  "croccs",
  "crocs",
  "slide",
  "slider",
  "clog",
  "slipper",
  "sandal",
  "nike offcourt adjust slide",
  "nikee air uptempo slider",
];

// Resolve a raw category to its canonical categoryRaw (e.g. "footwear" -> "shoes").
export function resolveCategoryRaw(category) {
  const original = String(category ?? "");
  return CATEGORY_ALIASES[normalizeCategoryKey(original)] || original;
}

// Compute the full pricing/category derivation for a scraped product, mirroring
// exactly what the storefront shows. Returns the fields ShopContext needs.
export function computeProductPricing(item) {
  const originalCategory = String(item?.category ?? "");
  const finalCategoryRaw = CATEGORY_ALIASES[normalizeCategoryKey(originalCategory)] || originalCategory;

  const basePrice = Number(item?.price ?? 0) || 0;
  const isDiscounted = String(finalCategoryRaw).toLowerCase() === "discounted";

  let derivedSub = item?.subCategory ?? "";
  if (isDiscounted) {
    const looksFootwear = isFootwearProduct({
      category: originalCategory,
      categoryRaw: originalCategory,
      sizes: item?.sizes,
    });
    derivedSub = looksFootwear ? "Footwear" : "Topwear";
  }

  let price = Math.max(0, basePrice + (isDiscounted ? 0 : (PRICE_ADJ[String(finalCategoryRaw)] || 0)));

  // Discounted products use flat pricing for footwear / missing-price items.
  if (isDiscounted) {
    const titleForCheck = String(item?.title ?? item?.slug_name ?? "").toLowerCase();
    const hasKeyword1399 = DISCOUNTED_1399_KEYWORDS.some((k) => titleForCheck.includes(k));
    if (basePrice === 0 || String(derivedSub || "").toLowerCase() === "footwear") {
      price = hasKeyword1399 ? 1399 : 1999;
    }
  }

  return { basePrice, finalCategoryRaw, isDiscounted, derivedSub, price };
}

// Convenience: just the final display price (used by the OG worker).
export function computeDisplayPrice(item) {
  return computeProductPricing(item).price;
}
