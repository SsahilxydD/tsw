import { createContext, useEffect, useRef, useState, useCallback } from "react";
import { isJeansProduct, isFootwearProduct, normalizeJeansSizes, uniqueUKLabels, toUKLabel } from "../utils/size";
import { useNavigate } from "react-router-dom";
import { safeFetch, safeLocalStorage, handleError } from "../utils/errorHandler";
import { loadCart, saveCart, setupCartSync, clearCart } from "../utils/cartPersistence";
import { loadWishlist, saveWishlist, setupWishlistSync, clearWishlist } from "../utils/wishlistPersistence";
import { loadRecentlyViewed, saveRecentlyViewed, setupRecentlyViewedSync, addToRecentlyViewed, getRecentlyViewedProductIds } from "../utils/recentlyViewedPersistence";
import { validateCoupon, calculateDiscount } from "../utils/coupons";
import { loadReviews, addReview, getProductReviews, getProductRating, markReviewHelpful, generateReviewId } from "../utils/reviewPersistence";

export const ShopContext = createContext();

// CDN Configuration for R2
// Set this to your R2 custom domain once configured (e.g., 'https://cdn.thesolowardrobe.com')
// Leave empty to use local/origin images
const CDN_BASE = import.meta.env.VITE_CDN_URL || '';

const ShopContextProvider = (props) => {
  const currency = '₹';
  const delivery_fee = 10;
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  // Cart persisted locally so refresh doesn't clear it
  const [cartItems, setCartItems] = useState(() => {
    try {
      return loadCart();
    } catch (error) {
      handleError(error, { operation: 'cart initialization' });
      return {};
    }
  });
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  // Minimal in-app notice (replaces toastify)
  const [notice, setNotice] = useState(null);
  const noticeTimerRef = useRef(null);

  const notify = (msg) => {
    try { if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current); } catch { }
    setNotice({ id: Date.now(), msg: String(msg || '') });
    noticeTimerRef.current = setTimeout(() => setNotice(null), 2000);
  };

  // Wishlist persisted locally
  const [wishlist, setWishlist] = useState(() => {
    try {
      return loadWishlist();
    } catch (error) {
      handleError(error, { operation: 'wishlist initialization' });
      return [];
    }
  });

  // Coupon state
  const [appliedCoupon, setAppliedCoupon] = useState(null);

  // Reviews state
  const [reviews, setReviews] = useState(() => {
    try {
      return loadReviews();
    } catch (error) {
      handleError(error, { operation: 'reviews initialization' });
      return [];
    }
  });

  // Recently viewed state
  const [recentlyViewed, setRecentlyViewed] = useState(() => {
    try {
      return loadRecentlyViewed();
    } catch (error) {
      handleError(error, { operation: 'recently viewed initialization' });
      return [];
    }
  });

  // Address persisted locally
  const [address, setAddress] = useState(() => {
    try {
      const raw = safeLocalStorage.getItem('addr.v1');
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      handleError(error, { operation: 'address initialization' });
      return null;
    }
  });
  useEffect(() => {
    if (address) {
      const saved = safeLocalStorage.setItem('addr.v1', JSON.stringify(address));
      if (!saved) {
        notify('Unable to save address. Please check browser settings.');
      }
    }
  }, [address]);

  useEffect(() => {
    const clean = (s) => (s ?? "").replace(/_/g, " ").replace(/\s+/g, " ").trim();

    const formatName = (raw) => {
      const t = clean(raw);
      if (!t) return "";
      const hasLower = /[a-z]/.test(t);
      if (hasLower) return t;
      const title = t.toLowerCase().replace(/\b([a-z])([a-z'0-9]*)/g, (_, a, b) => a.toUpperCase() + b);
      return title
        .replace(/\b(EDP|EDT|OG|ML)\b/gi, (m) => m.toUpperCase())
        .replace(/\b(Eau|De|Parfum|Pour|Homme|Femme)\b/gi, (m) => m[0].toUpperCase() + m.slice(1).toLowerCase());
    };

    const loadProducts = async () => {
      try {
        setLoadingProducts(true);
        // Try multiple sources to support both root and /data locations
        const sources = [
          { url: "/data/products.json", basePrefix: "/data" },
        ];
        let raw = null;
        let basePrefix = "";
        let lastErr = null;
        for (const src of sources) {
          try {
            // Use safeFetch with retry mechanism
            const r = await safeFetch(src.url, { timeout: 15000 }, 2);
            
            // Check if response is JSON
            const contentType = r.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
              lastErr = new Error(`Invalid content type for ${src.url}: ${contentType}`);
              continue;
            }

            raw = await r.json();
            basePrefix = src.basePrefix;
            break;
          } catch (e) {
            lastErr = e;
            const errorInfo = handleError(e, { url: src.url, operation: 'loadProducts' });
            console.warn(`Failed to load ${src.url}:`, errorInfo.message);
          }
        }
        if (!raw) {
          const errorInfo = handleError(lastErr || new Error('No products source available'), { operation: 'loadProducts' });
          console.warn("No products source available, using empty array");
          notify(errorInfo.message);
          setProducts([]);
          return;
        }

        // Fast-path mappings: products.json already has normalized categories (e.g. "belts", "shoes").
        // Avoid expensive keyword inference on every item (this was a major Lighthouse main-thread cost).
        const normalizeKey = (s) => String(s || "")
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "");

        const CATEGORY_ALIASES = {
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

        const PRICE_ADJ = {
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

        const mapped = Array.isArray(raw) ? raw.map((item) => {
          const images = Array.isArray(item.images)
            ? item.images.map((src) => {
              if (!src) return "";
              // Already absolute URL - use as-is
              if (/^https?:\/\//i.test(src)) return src;
              
              // Use CDN if configured
              if (CDN_BASE) {
                // Strip leading slash and any /data prefix for CDN
                const cleanPath = src.replace(/^\/?(data\/)?/, '');
                return `${CDN_BASE}/${cleanPath}`;
              }
              
              // Fallback to origin (existing logic)
              if (basePrefix) {
                if (src.startsWith(basePrefix + "/")) return src;
                if (src.startsWith("/")) return `${basePrefix}${src}`;
                return `${basePrefix}/${src}`;
              }
              if (src.startsWith("/")) return src;
              return `/${src}`;
            })
            : [];

          // --- FAST PATH ---
          // Trust products.json "category" and apply a small normalization map.
          const originalCategory = String(item.category ?? "");
          const key = normalizeKey(originalCategory);
          const finalCategoryRaw = CATEGORY_ALIASES[key] || originalCategory;

          let category = originalCategory;
          const lc = String(category).toLowerCase();
          if (lc.includes("men")) category = "Men";
          else if (lc.includes("women") || lc.includes("lady")) category = "Women";
          else if (lc.includes("kid")) category = "Kids";

          const basePrice = Number(item.price ?? 0) || 0;
          const isDiscounted = String(finalCategoryRaw).toLowerCase() === "discounted";

          // Discounted subCategory (simple + fast)
          let derivedSub = item.subCategory ?? "";
          if (isDiscounted) {
            const looksFootwear = isFootwearProduct({
              category: originalCategory,
              categoryRaw: originalCategory,
              sizes: item?.sizes,
            });
            derivedSub = looksFootwear ? "Footwear" : "Topwear";
          }

          let price = Math.max(0, basePrice + (isDiscounted ? 0 : (PRICE_ADJ[String(finalCategoryRaw)] || 0)));

          // Flat pricing for Discounted products (apply to all footwear-like products, not just those with detected sizes)
          if (isDiscounted) {
            const titleForCheck = String(item?.title ?? item?.slug_name ?? "").toLowerCase();
            // Keywords for ₹1399 pricing (slides, clogs, sandals)
            const keywords1399 = [
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
            const hasKeyword1399 = keywords1399.some((k) => titleForCheck.includes(k));
            
            // If base price is 0 or derivedSub is footwear, apply flat pricing
            // This catches products with missing price data
            if (basePrice === 0 || String(derivedSub || "").toLowerCase() === "footwear") {
              price = hasKeyword1399 ? 1399 : 1999;
            }
          }

          const mappedItem = {
            _id: (item._id ?? item.slug ?? item.slug_name ?? item.title)?.toString(),
            name: formatName(item.title ?? item.slug_name ?? ""),
            price,
            mrp: Number(item.mrp ?? 0),
            image: images[0] ?? "",
            images,
            category,
            categoryRaw: finalCategoryRaw,
            subCategory: derivedSub,
            sizes: Array.isArray(item.sizes) ? item.sizes : [],
            bestseller: Boolean(item.bestseller ?? false),
            slug: item.slug ?? "",
            detail_url_src: item.detail_url_src ?? ""
          };

          // Drop jeans products with no explicit sizes in data
          if (isJeansProduct(mappedItem) && normalizeJeansSizes(mappedItem.sizes).length === 0) {
            return null;
          }

          // Drop products with no size options for categories that require sizes
          const categoriesRequiringSizes = [
            'flipflops',
            'hoodies',
            'jackets',
            'jeans',
            'shirts',
            'shoes',
            't-shirts',
            'trackpants',
            'tracksuits',
            'womenshoes'
          ];

          if (categoriesRequiringSizes.includes(String(finalCategoryRaw))) {
            if (!Array.isArray(mappedItem.sizes) || mappedItem.sizes.length === 0) {
              return null;
            }

            // For shoes only: filter to UK sizes 5-12 (minimum size requirement)
            // womenshoes uses raw sizes from products.json
            if (String(finalCategoryRaw) === 'shoes') {
              const ukSizes = uniqueUKLabels(mappedItem.sizes);
              if (ukSizes.length === 0) {
                return null;
              }
              // Update sizes to only include valid UK sizes 5-12
              mappedItem.sizes = ukSizes;
            }
          }

          return mappedItem;

          if (false) {
          // Combined hint for keyword detection (raw category + sub + title)
          // Normalize to improve matching across variants (diacritics, underscores, dashes, extra spaces)
          const normalize = (s) => String(s || "")
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // strip diacritics
            .replace(/[_]/g, ' ')
            .replace(/[–—]/g, '-')
            .replace(/\s+/g, ' ')
            .trim();
          const hint = normalize(`${originalCategory} ${item?.subCategory ?? ''} ${title}`);

          // Quick keyword flags with robust, non-overlapping detection
          // Helper to match any of a list of regexes
          const any = (regexes) => regexes.some((r) => r.test(hint));

          // Helper to check original category name for exact matches
          const categoryMatches = (patterns) => {
            const catLower = String(originalCategory || '').toLowerCase();
            return patterns.some(p => p.test(catLower));
          };

          // More specific checks - prevent overlap by checking context and category first
          // Check original category name first (most reliable)
          const catKey = String(originalCategory || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '');

          // Category-specific checks with exclusion patterns to prevent false matches
          const isCap = categoryMatches([/^caps?$/, /^hats?$/, /^beanies?$/]) ||
            (any([/\bcaps?\b/i, /\bhats?\b/i, /\bbeanies?\b/i]) &&
              !any([/\bhandbag/i, /\bbelt/i, /\bwallet/i, /\bcap\s*holder/i, /\bcap\s*p/i]));

          const isBelt = categoryMatches([/^belts?$/, /^waistbelt$/]) ||
            (any([/\bbelts?\b/i, /waist\s*belt/i]) &&
              !any([/\bhandbag/i, /\bwallet/i, /\bcap/i, /\bshoe/i, /\bbelt\s*(loop|buckle|holder)/i]));

          const isFlipFlop = categoryMatches([/^flipflops?$/]) ||
            (any([/(^|\s|^)(flip\s*-?\s*flops?)(\s|$|s$)/i]) &&
              !any([/\bshoe/i, /\bsandal/i]));

          const isSlide = any([/\bslides?\b/i]) && !any([/\bsunglass/i]);
          const isSlipper = any([/\bslippers?\b/i]);
          const isClog = any([/\bclogs?\b/i]);
          const isSandal = any([/\bsandals?\b/i]) && !any([/\bsunglass/i]);

          const isHoodie = categoryMatches([/^hoodies?$/]) ||
            (any([/\bhoodies?\b/i, /hooded\s+sweatshirt/i, /zip\s*hoodie/i]) &&
              !any([/\bsweatshirt\b/i, /\bjacket/i]));

          const isHandbag = categoryMatches([/^handbags?$/, /^hand\s*bags?$/]) ||
            (any([/(^|\s)(hand\s*bags?|handbag|tote|sling\s*bag|shoulder\s*bag)(\s|$|s$)/i]) &&
              !any([/\bbelt/i, /\bwallet/i, /\bcap/i, /\bwatch/i]));

          const isJacket = categoryMatches([/^jackets?$/, /^windcheaters?$/, /^blazers?$/]) ||
            (any([/\bjackets?\b/i, /\bwindcheaters?\b/i, /\bblazers?\b/i]) &&
              !any([/\bhoodie/i, /\bsweatshirt/i]));

          const isShirt = categoryMatches([/^shirts?$/, /^formal\s*shirts?$/, /^casual\s*shirts?$/]) ||
            (any([/\bshirts?\b/i, /formal\s+shirt/i, /casual\s+shirt/i, /linen\s+shirt/i]) &&
              !any([/\bt\s*-?\s*shirt/i, /\btees?/i, /\bsweatshirt/i]));

          const isSunglasses = categoryMatches([/^sunglasses?$/, /^shades?$/]) ||
            (any([/(^|\s)(sunglass(?:es)?|shades?|goggles?|spectacles?|specs?|aviators?)(\s|$|s$)/i]) &&
              !any([/\bsandal/i, /\bslide/i]));

          const isSweatshirt = categoryMatches([/^sweatshirts?$/, /^sweat\s*shirts?$/]) ||
            (any([/\bsweat\s*-?\s*shirts?\b/i, /\bsweatshirt\b/i]) &&
              !any([/\bhoodie/i, /\bjacket/i]));

          const isTShirt = categoryMatches([/^t\s*-?\s*shirts?$/, /^tshirts?$/, /^tees?$/]) ||
            (any([/(^|\s)(t\s*-?\s*shirts?|t-?shirts?|tshirt|t\s*shirt|tees?|crew\s*neck|round\s*neck)(\s|$|s$)/i]) &&
              !any([/\bshirt\b/i, /\bsweatshirt/i]));

          const isTrackPant = categoryMatches([/^trackpants?$/, /^track\s*pants?$/, /^joggers?$/]) ||
            (any([/(track\s*-?\s*pants?|trackpants?|joggers?)(\s|$|s$)/i]) &&
              !any([/\btracksuit/i, /\btrousers?/i]));

          const isTrouser = any([/\btrousers?\b/i]);
          const isPant = any([/\bpants?\b/i]) && !any([/\btrackpants?/i, /\bjeans?/i]);
          const isChino = any([/\bchinos?\b/i]);

          const isTracksuit = categoryMatches([/^tracksuits?$/, /^track\s*suits?$/]) ||
            (any([/(track\s*-?\s*suits?|tracksuits?)(\s|$|s$)/i]) &&
              !any([/\btrackpants?/i]));

          const isWallet = categoryMatches([/^wallets?$/, /^card\s*holders?$/]) ||
            (any([/\bwallets?\b/i, /card\s*holder/i]) &&
              !any([/\bhandbag/i, /\bbelt/i, /\bcap/i]));

          const isWomensWatch = categoryMatches([/^ladies?\s*watches?$/, /^women\s*['']s?\s*watches?$/, /^womens?\s*watches?$/]) ||
            (any([/(women['']s?\s+watch|lad(?:y|ies)\s+watch)/i]) &&
              !any([/\bmen\s*watch/i]));

          const isMensWatch = categoryMatches([/^watches?$/, /^mens?\s*watches?$/, /^men\s*['']s?\s*watches?$/]) ||
            (/\bwatch\b/i.test(hint) && !isWomensWatch &&
              !any([/\bhandbag/i, /\bbelt/i, /\bwallet/i]));

          const isWomensPerfume = categoryMatches([/^womens?\s*perfumes?$/, /^women\s*['']s?\s*perfumes?$/, /^ladies?\s*perfumes?$/, /^perfume\s*for\s*women$/]) ||
            (any([
              /(women['']s?\s+perfume|pour\s+femme|women\s+perfume|womens\s+perfume|womens?perfume|perfume\s+for\s+women)/i
            ]) && !any([/\bmen\s*perfume/i]));

          const isMensPerfume = categoryMatches([/^mens?\s*perfumes?$/, /^men\s*['']s?\s*perfumes?$/, /^menperfume$/]) ||
            ((any([
              /(men['']s?\s+perfume|pour\s+homme|men\s+perfume|mens\s+perfume|menperfume)/i
            ]) || (/\b(edp|edt|eau\s+de\s+parfum|eau\s+de\s+toilette)\b/i.test(hint) && !isWomensPerfume)) &&
              !any([/\bwomen\s*perfume/i]));
          // Detect women's shoes - robust detection with exclusion checks
          const isWomensShoe = categoryMatches([/^womenshoes?$/, /^women\s*['']s?\s*shoes?$/, /^ladies?\s*shoes?$/, /^women\s*footwear$/, /^ladies?\s*footwear$/]) ||
            (isFootwearProduct({ category: originalCategory, categoryRaw: originalCategory, sizes: item?.sizes }) &&
              (any([/(women['']s?\s+shoe|ladies?\s+shoe|women\s+footwear|ladies?\s+footwear|women\s+sneaker|ladies?\s+sneaker)/i]) ||
                categoryMatches([/^women/i, /^ladies?/i])) &&
              !any([/\bmen\s*shoe/i, /\bmen\s*footwear/i]) &&
              !isFlipFlop && !isSandal && !isSlide && !isSlipper && !isClog);

          // Treat both "discounted" and "sale" as discounted bucket
          const isDiscounted = /\b(discounted|sale)\b/i.test(lcRaw);
          const isShoe = isFootwearProduct({ category: originalCategory, categoryRaw: originalCategory, sizes: item?.sizes }) && !isWomensShoe;

          let priceAdj = 0;
          if (isDiscounted) {
            priceAdj = 0; // Discounted overrides
          } else if (isBelt) {
            priceAdj = 200;
          } else if (isCap) {
            priceAdj = 200;
          } else if (isFlipFlop) {
            priceAdj = 150;
          } else if (isHoodie) {
            priceAdj = 150;
          } else if (isHandbag) {
            priceAdj = 100;
          } else if (isJacket) {
            priceAdj = 150;
          } else if (isJeansProduct({ category: originalCategory, categoryRaw: originalCategory })) {
            priceAdj = 100;
          } else if (isWomensWatch) {
            priceAdj = 150;
          } else if (isMensPerfume) {
            priceAdj = 150;
          } else if (isShirt) {
            priceAdj = 200;
          } else if (isSunglasses) {
            priceAdj = 250;
          } else if (isSweatshirt) {
            priceAdj = 200;
          } else if (isTShirt) {
            priceAdj = 150;
          } else if (isTrackPant) {
            priceAdj = 200;
          } else if (isTracksuit) {
            priceAdj = 150;
          } else if (isWallet) {
            priceAdj = 150;
          } else if (isMensWatch) {
            priceAdj = 150;
          } else if (isWomensPerfume) {
            priceAdj = 150;
          } else if (isWomensShoe) {
            priceAdj = 550;
          } else if (isShoe) {
            priceAdj = 550;
          } else {
            priceAdj = 0; // default: no change
          }

          let price = Math.max(0, basePrice + priceAdj);

          // Derive Discounted subCategory using hardened Topwear link checks
          // If in Discounted, override subCategory based on source URL and heuristics
          let derivedSub = item.subCategory ?? "";
          if (isDiscounted) {
            const srcUrl = String(
              item.detail_url_src || item.detail_url || item.source_url || item.source || ""
            ).toLowerCase();

            // Strong Topwear URL patterns, allow minor hyphen/typo variations
            const topwearPatterns = [
              /thesolowardrobes\.cartpe\.in\/t-?shirts?-cloths?-top-?wear-?men\.html/,
              /t-?shirts?-cloths?-top-?wear/,
              /\btop-?wear\b/,
            ];
            const looksTopwearByUrl = topwearPatterns.some((re) => re.test(srcUrl));

            // Footwear detection via size/category hints
            const looksFootwear = isFootwearProduct({
              category: originalCategory,
              categoryRaw: originalCategory,
              sizes: item?.sizes,
            });

            // Apparel hints (shirts, tees, hoodies, jackets, etc.)
            const looksApparel = /(t\s?-?shirts?|tees?\b|shirt\b|hoodies?|sweat\s?-?shirts?|jacket\b)/i.test(hint)
              || (Array.isArray(item.sizes) && item.sizes.some((s) => /^(?:XS|S|M|L|XL|XXL)$/i.test(String(s))))
              || /\btop\s?wear\b/i.test(hint);

            if (looksTopwearByUrl || (!looksFootwear && looksApparel)) {
              derivedSub = "Topwear";
            } else if (looksFootwear) {
              derivedSub = "Footwear";
            } else {
              // Fallback per spec: everything else under Discounted → Footwear
              derivedSub = "Footwear";
            }
          }

          // Flat pricing for Discounted Footwear page
          if (isDiscounted) {
            const subLower = String(derivedSub || '').toLowerCase();
            if (subLower === 'footwear' || (!subLower && isShoe)) {
              // Check for specific keywords that should be priced at 1399
              const titleForCheck = hint.toLowerCase();
              const keywords1399 = [
                'brikenstock',
                'birkenstock',
                'croccs',
                'crocs',
                /\bslide\b/i,
                'nike offcourt adjust slide',
                'nikee air uptempo slider'
              ];

              const hasKeyword = keywords1399.some(keyword => {
                if (keyword instanceof RegExp) {
                  return keyword.test(titleForCheck);
                }
                return titleForCheck.includes(keyword.toLowerCase());
              });

              price = hasKeyword ? 1399 : 1999;
            }
          }

          // Map to exact category names - only use these specific categories
          // Prioritize original category name (most reliable), then use detection flags
          const finalCategoryRaw = (() => {
            // First: Check original category name directly (highest priority)
            const src = String(originalCategory || '').toLowerCase().trim();
            const key = src
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/[^a-z0-9]+/g, '');

            // Exact category name matches (most reliable)
            if (/^(discounted|sale)$/.test(key)) return 'Discounted';
            if (/^(ladieswatch|ladieswatches|womenswatch|womenswatches)$/.test(key)) return 'ladieswatches';
            if (/^(womensperfume|womenperfume|women['']s?perfume|perfumeforwomen)$/.test(key)) return 'womensperfume';
            if (/^(mensperfume|menperfume|men['']s?perfume)$/.test(key)) return 'menperfume';
            if (/^(tshirt|tshirts|tee|tees|tshirt|tshirt)$/.test(key)) return 't-shirts';
            if (/^(shirt|shirts|formalshirt|casualshirt)$/.test(key)) return 'shirts';
            if (/^(sunglass|sunglasses|shades|goggles)$/.test(key)) return 'sunglasses';
            if (/^(watch|watches|menswatch|menswatches|menwatch)$/.test(key) && !/^(ladies|women)/i.test(src)) return 'watches';
            if (/^(flipflop|flipflops|flipflop)$/.test(key)) return 'flipflops';
            if (/^(handbag|handbags|handbag)$/.test(key)) return 'handbags';
            if (/^(cap|caps|hat|hats|beanie)$/.test(key)) return 'caps';
            if (/^(belt|belts|waistbelt)$/.test(key)) return 'belts';
            if (/^(wallet|wallets|cardholder)$/.test(key)) return 'wallets';
            if (/^(jeans?|denim)$/.test(key)) return 'jeans';
            if (/^(jacket|jackets|windcheater|blazer)$/.test(key)) return 'jackets';
            if (/^(sweatshirt|sweatshirts|sweatshirt)$/.test(key)) return 'sweatshirts';
            if (/^(tracksuit|tracksuits|tracksuit)$/.test(key)) return 'tracksuits';
            if (/^(hoodie|hoodies)$/.test(key)) return 'hoodies';
            if (/^(trackpant|trackpants|trackpant|jogger)$/.test(key)) return 'trackpants';
            if (/^(womenshoes?|women\s*['']s?\s*shoes?|ladies?\s*shoes?)$/.test(key)) return 'womenshoes';
            if (/^(shoes?|sneaker|sneakers|loafer|loafers|boot|boots|footwear)$/.test(key) && !/^(flipflop|sandal|slide|women|ladies)/i.test(src)) return 'shoes';

            // Second: Check if product is in Discounted category
            if (isDiscounted) return 'Discounted';

            // Third: Use detection flags (as fallback, but only if they match strongly)
            // Order matters - more specific first, and require confirmation from original category or title
            if (isWomensWatch && (categoryMatches([/ladies?|women/i]) || /\b(ladies?|women)\s*watch/i.test(hint))) return 'ladieswatches';
            if (isMensWatch && !isWomensWatch && (categoryMatches([/watch/i]) || /\bmen\s*watch/i.test(hint))) return 'watches';
            if (isWomensPerfume && (categoryMatches([/women|ladies/i]) || /\b(women|ladies)\s*perfume/i.test(hint))) return 'womensperfume';
            if (isMensPerfume && !isWomensPerfume && (categoryMatches([/men/i]) || /\bmen\s*perfume/i.test(hint))) return 'menperfume';
            if (isTShirt && !isShirt && !isSweatshirt) return 't-shirts';
            if (isShirt && !isTShirt && !isSweatshirt) return 'shirts';
            if (isSunglasses) return 'sunglasses';
            if (isSweatshirt && !isHoodie && !isJacket) return 'sweatshirts';
            if (isTracksuit && !isTrackPant) return 'tracksuits';
            if (isHoodie && !isSweatshirt && !isJacket) return 'hoodies';
            if (isTrackPant && !isTracksuit) return 'trackpants';
            if (isJeansProduct({ category: originalCategory, categoryRaw: originalCategory })) return 'jeans';
            if (isJacket && !isHoodie && !isSweatshirt) return 'jackets';
            if (isBelt && !isHandbag && !isWallet) return 'belts';
            if (isCap && !isHandbag && !isWallet && !isBelt) return 'caps';
            if (isHandbag && !isBelt && !isWallet && !isCap) return 'handbags';
            if (isWallet && !isHandbag && !isBelt && !isCap) return 'wallets';
            if (isFlipFlop && !isShoe && !isWomensShoe) return 'flipflops';
            if (isWomensShoe && !isFlipFlop && !isSandal && !isSlide && !isSlipper && !isClog) return 'womenshoes';
            if (isShoe || (isFootwearProduct({ category: originalCategory, categoryRaw: originalCategory, sizes: item?.sizes }) && !isWomensShoe)) {
              // Only return shoes if it's clearly not a flipflop or women's shoes
              if (!isFlipFlop && !isWomensShoe) return 'shoes';
            }

            // If no match, return empty string (will be filtered out or handled elsewhere)
            return '';
          })();

          const mappedItem = {
            _id: (item.slug ?? item.slug_name ?? item.title)?.toString(),
            name: formatName(item.title ?? item.slug_name ?? ""),
            price,
            mrp: Number(item.mrp ?? 0),
            image: images[0] ?? "",
            images,
            category,
            categoryRaw: finalCategoryRaw,
            subCategory: derivedSub,
            sizes: Array.isArray(item.sizes) ? item.sizes : [],
            bestseller: Boolean(item.bestseller ?? false),
            slug: item.slug ?? "",
            detail_url_src: item.detail_url_src ?? ""
          };

          // Drop jeans products with no explicit sizes in data
          if (isJeansProduct(mappedItem) && normalizeJeansSizes(mappedItem.sizes).length === 0) {
            return null;
          }

          // Drop products with no size options for categories that require sizes
          const categoriesRequiringSizes = [
            'flipflops',
            'hoodies',
            'jackets',
            'jeans',
            'shirts',
            'shoes',
            't-shirts',
            'trackpants',
            'tracksuits',
            'womenshoes'
          ];

          if (categoriesRequiringSizes.includes(finalCategoryRaw)) {
            if (!Array.isArray(mappedItem.sizes) || mappedItem.sizes.length === 0) {
              return null;
            }

            // For shoes only: filter to UK sizes 5-12 (minimum size requirement)
            // womenshoes uses raw sizes from products.json
            if (finalCategoryRaw === 'shoes') {
              const ukSizes = uniqueUKLabels(mappedItem.sizes);
              if (ukSizes.length === 0) {
                return null;
              }
              // Update sizes to only include valid UK sizes 5-12
              mappedItem.sizes = ukSizes;
            }
          }

          return mappedItem;
          }
        }) : [];

        setProducts(mapped.filter(Boolean));
      } catch (err) {
        const errorInfo = handleError(err, { operation: 'processProducts' });
        console.error('Error processing products:', err);
        notify(errorInfo.message);
        setProducts([]);
      } finally {
        setLoadingProducts(false);
      }
    };

    loadProducts();
  }, []);

  // Persist cart whenever it changes
  useEffect(() => {
    const saved = saveCart(cartItems);
    if (!saved && Object.keys(cartItems).length > 0) {
      console.warn('Unable to save cart to localStorage');
      notify('Unable to save cart. Please check browser settings.');
    }
  }, [cartItems]);

  // Persist wishlist whenever it changes
  useEffect(() => {
    const saved = saveWishlist(wishlist);
    if (!saved && wishlist.length > 0) {
      console.warn('Unable to save wishlist to localStorage');
      notify('Unable to save wishlist. Please check browser settings.');
    }
  }, [wishlist]);

  // Setup cross-tab cart synchronization
  useEffect(() => {
    const cleanup = setupCartSync((newCartData) => {
      // Only update if cart data actually changed (avoid infinite loops)
      // Use a ref to track the last synced cart to prevent loops
      setCartItems((prevCartItems) => {
        const prevStr = JSON.stringify(prevCartItems);
        const newStr = JSON.stringify(newCartData);
        if (prevStr !== newStr) {
          return newCartData;
        }
        return prevCartItems;
      });
    });

    return cleanup;
  }, []); // Empty deps - only setup once

  // Setup cross-tab wishlist synchronization
  useEffect(() => {
    const cleanup = setupWishlistSync((newWishlistData) => {
      setWishlist((prevWishlist) => {
        const prevStr = JSON.stringify(prevWishlist);
        const newStr = JSON.stringify(newWishlistData);
        if (prevStr !== newStr) {
          return newWishlistData;
        }
        return prevWishlist;
      });
    });

    return cleanup;
  }, []); // Empty deps - only setup once

  // Persist recently viewed whenever it changes
  useEffect(() => {
    const saved = saveRecentlyViewed(recentlyViewed);
    if (!saved && recentlyViewed.length > 0) {
      console.warn('Unable to save recently viewed to localStorage');
    }
  }, [recentlyViewed]);

  // Setup cross-tab recently viewed synchronization
  useEffect(() => {
    const cleanup = setupRecentlyViewedSync((newRecentlyViewedData) => {
      setRecentlyViewed((prevRecentlyViewed) => {
        const prevStr = JSON.stringify(prevRecentlyViewed);
        const newStr = JSON.stringify(newRecentlyViewedData);
        if (prevStr !== newStr) {
          return newRecentlyViewedData;
        }
        return prevRecentlyViewed;
      });
    });

    return cleanup;
  }, []); // Empty deps - only setup once

  const addToCart = async (itemId, size) => {
    if (!size) { notify('Select product size'); return; }
    let cartData = structuredClone(cartItems);
    if (cartData[itemId]) {
      if (cartData[itemId][size]) cartData[itemId][size] += 1;
      else cartData[itemId][size] = 1;
    } else {
      cartData[itemId] = { [size]: 1 };
    }
    setCartItems(cartData);
    setIsCartOpen(true);
    notify('Added to bag');
  }

  const updateQuantity = async (itemId, size, quantity) => {
    let cartData = structuredClone(cartItems);
    if (!cartData[itemId]) cartData[itemId] = {};
    if (quantity <= 0) {
      delete cartData[itemId][size];
      // clean empty product entry
      if (Object.keys(cartData[itemId]).length === 0) delete cartData[itemId];
    } else {
      cartData[itemId][size] = quantity;
    }
    setCartItems(cartData);
    if (quantity === 0) notify('Removed from bag');
  }

  // Clear cart function (for logout, order completion, etc.)
  const clearCartItems = () => {
    clearCart();
    setCartItems({});
    notify('Cart cleared');
  }

  // Wishlist functions
  const addToWishlist = (productId) => {
    const pid = String(productId);
    if (!wishlist.includes(pid)) {
      const newWishlist = [...wishlist, pid];
      setWishlist(newWishlist);
      notify('Added to wishlist');
    } else {
      notify('Already in wishlist');
    }
  }

  const removeFromWishlist = (productId) => {
    const pid = String(productId);
    const newWishlist = wishlist.filter(id => id !== pid);
    setWishlist(newWishlist);
    notify('Removed from wishlist');
  }

  const toggleWishlist = (productId) => {
    const pid = String(productId);
    if (wishlist.includes(pid)) {
      removeFromWishlist(pid);
    } else {
      addToWishlist(pid);
    }
  }

  const isInWishlist = (productId) => {
    return wishlist.includes(String(productId));
  }

  const getWishlistCount = () => {
    return wishlist.length;
  }

  const moveToCart = (productId, size = 'std') => {
    removeFromWishlist(productId);
    addToCart(productId, size);
    notify('Moved to cart');
  }

  const clearWishlistItems = () => {
    clearWishlist();
    setWishlist([]);
    notify('Wishlist cleared');
  }

  const getCartCount = () => {
    let totalCount = 0;
    for (const items in cartItems) {
      for (const item in cartItems[items]) {
        try {
          if (cartItems[items][item] > 0) totalCount += cartItems[items][item];
        } catch { }
      }
    }
    return totalCount;
  }

  const getCartAmount = () => {
    let totalAmount = 0;
    for (const items in cartItems) {
      const itemInfo = products.find((product) => product._id === items || product.slug === items);
      for (const item in cartItems[items]) {
        try {
          if (cartItems[items][item] > 0 && itemInfo) {
            totalAmount += (Number(itemInfo.price) || 0) * cartItems[items][item];
          }
        } catch { }
      }
    }
    return totalAmount;
  }

  const getCartSubtotal = () => {
    return getCartAmount();
  }

  const getDiscountAmount = () => {
    if (!appliedCoupon) return 0;
    const subtotal = getCartSubtotal();
    return calculateDiscount(appliedCoupon, subtotal);
  }

  const getCartTotal = () => {
    const subtotal = getCartSubtotal();
    const discount = getDiscountAmount();
    return Math.max(0, subtotal - discount);
  }

  const applyCoupon = (code) => {
    const subtotal = getCartSubtotal();
    // Build cart items array for category checking
    const cartItemsArray = [];
    for (const items in cartItems) {
      const itemInfo = products.find((product) => product._id === items || product.slug === items);
      if (itemInfo) {
        for (const item in cartItems[items]) {
          if (cartItems[items][item] > 0) {
            cartItemsArray.push({
              _id: items,
              size: item,
              quantity: cartItems[items][item],
              category: itemInfo.category,
              categoryRaw: itemInfo.categoryRaw
            });
          }
        }
      }
    }

    const validation = validateCoupon(code, subtotal, cartItemsArray);
    if (validation.valid && validation.coupon) {
      setAppliedCoupon(validation.coupon);
      notify(`Coupon "${validation.coupon.code}" applied successfully!`);
      return { success: true, coupon: validation.coupon };
    } else {
      notify(validation.error || 'Invalid coupon code');
      return { success: false, error: validation.error };
    }
  }

  const removeCoupon = () => {
    if (appliedCoupon) {
      setAppliedCoupon(null);
      notify('Coupon removed');
    }
  }

  // Review functions
  const submitReview = (reviewData) => {
    const review = {
      id: generateReviewId(),
      productId: String(reviewData.productId),
      rating: reviewData.rating,
      title: reviewData.title,
      comment: reviewData.comment,
      authorName: reviewData.authorName,
      authorEmail: reviewData.authorEmail,
      date: new Date().toISOString(),
      helpfulCount: 0,
      verified: false, // Could be set to true if user has purchased the product
      status: 'approved'
    };

    const result = addReview(review);
    if (result.success) {
      const updatedReviews = loadReviews();
      setReviews(updatedReviews);
      notify('Review submitted successfully!');
      return { success: true, review: result.review };
    } else {
      notify(result.error || 'Failed to submit review');
      return { success: false, error: result.error };
    }
  }

  const getReviewsForProduct = (productId) => {
    return getProductReviews(String(productId));
  }

  const getRatingForProduct = (productId) => {
    return getProductRating(String(productId));
  }

  const markHelpful = (reviewId) => {
    const result = markReviewHelpful(reviewId);
    if (result.success) {
      const updatedReviews = loadReviews();
      setReviews(updatedReviews);
      return { success: true };
    }
    return { success: false, error: result.error };
  }

  // Recently viewed functions
  const trackProductView = useCallback((productId) => {
    if (!productId) return;
    const pid = String(productId);
    const success = addToRecentlyViewed(pid);
    if (success) {
      // Reload recently viewed to get updated list
      const updated = loadRecentlyViewed();
      setRecentlyViewed(updated);
    }
  }, []);

  const getRecentlyViewedProducts = useCallback(() => {
    // Use recentlyViewed state instead of reading from localStorage directly
    const productIds = recentlyViewed.map(item => item.productId);
    if (!Array.isArray(products) || productIds.length === 0) return [];
    
    // Get products in order of most recently viewed
    const viewedProducts = productIds
      .map(id => products.find(p => String(p._id) === id || String(p.slug) === id))
      .filter(Boolean); // Remove undefined products
    
    return viewedProducts;
  }, [products, recentlyViewed]);

  const value = {
    currency, delivery_fee,
    products, loadingProducts,
    navigate,
    notice, notify,
    address, setAddress,
    search, setSearch,
    showSearch, setShowSearch,
    addToCart, updateQuantity, clearCartItems,
    cartItems,
    getCartCount, getCartAmount, getCartSubtotal, getCartTotal,
    getDiscountAmount, applyCoupon, removeCoupon, appliedCoupon,
    isCartOpen, setIsCartOpen,
    wishlist,
    addToWishlist, removeFromWishlist, toggleWishlist,
    isInWishlist, getWishlistCount, moveToCart, clearWishlistItems,
    reviews,
    submitReview, getReviewsForProduct, getRatingForProduct, markHelpful,
    recentlyViewed,
    trackProductView, getRecentlyViewedProducts
  }

  return (
    <ShopContext.Provider value={value}>
      {props.children}
    </ShopContext.Provider>
  )
}

export default ShopContextProvider;
