import { createContext, useEffect, useRef, useState } from "react";
import { isJeansProduct, isFootwearProduct, normalizeJeansSizes, uniqueUKLabels, toUKLabel } from "../utils/size";
import { useNavigate } from "react-router-dom";

export const ShopContext = createContext();

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
      const raw = localStorage.getItem('cart.v1');
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
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

  // Address persisted locally
  const [address, setAddress] = useState(() => {
    try { return JSON.parse(localStorage.getItem('addr.v1') || 'null'); }
    catch { return null; }
  });
  useEffect(() => {
    try {
      if (address) localStorage.setItem('addr.v1', JSON.stringify(address));
    } catch { }
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
            const r = await fetch(src.url, { cache: "no-store" });
            if (!r.ok) {
              lastErr = new Error(`Failed to load ${src.url}: ${r.status} ${r.statusText}`);
              continue;
            }

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
            console.warn(`Failed to load ${src.url}:`, e.message);
          }
        }
        if (!raw) {
          console.warn("No products source available, using empty array");
          setProducts([]);
          return;
        }

        const mapped = Array.isArray(raw) ? raw.map((item) => {
          const images = Array.isArray(item.images)
            ? item.images.map((src) => {
              if (!src) return "";
              if (/^https?:\/\//i.test(src)) return src;
              // If the source file was under /data, prefix /data for relative-rooted paths
              if (basePrefix) {
                if (src.startsWith(basePrefix + "/")) return src;
                if (src.startsWith("/")) return `${basePrefix}${src}`;
                return `${basePrefix}/${src}`;
              }
              // root-based dataset: keep leading-slash paths as-is
              if (src.startsWith("/")) return src;
              return `/${src}`;
            })
            : [];

          const originalCategory = item.category ?? "";
          let category = originalCategory;
          const lc = String(category).toLowerCase();
          if (lc.includes("men")) category = "Men";
          else if (lc.includes("women") || lc.includes("lady")) category = "Women";
          else if (lc.includes("kid")) category = "Kids";

          // Price adjustments per category/type
          const basePrice = Number(item.price ?? 0) || 0;
          // Use the original category strings for robust detection
          const lcRaw = String(originalCategory ?? "").toLowerCase();
          const lcSub = String(item?.subCategory ?? "").toLowerCase();
          const title = String(item?.title ?? item?.slug_name ?? "");
          const lcTitle = title.toLowerCase();

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
        }) : [];

        setProducts(mapped.filter(Boolean));
      } catch (err) {
        console.error(err);
        setProducts([]);
      } finally {
        setLoadingProducts(false);
      }
    };

    loadProducts();
  }, []);

  // persist cart whenever it changes
  useEffect(() => {
    try { localStorage.setItem('cart.v1', JSON.stringify(cartItems)); } catch { }
  }, [cartItems]);

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

  const value = {
    currency, delivery_fee,
    products, loadingProducts,
    navigate,
    notice, notify,
    address, setAddress,
    search, setSearch,
    showSearch, setShowSearch,
    addToCart, updateQuantity,
    cartItems,
    getCartCount, getCartAmount,
    isCartOpen, setIsCartOpen
  }

  return (
    <ShopContext.Provider value={value}>
      {props.children}
    </ShopContext.Provider>
  )
}

export default ShopContextProvider;
