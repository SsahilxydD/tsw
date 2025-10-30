import { createContext, useEffect, useRef, useState } from "react";
import { isJeansProduct, isFootwearProduct, normalizeJeansSizes } from "../utils/size";
import { useNavigate } from "react-router-dom";

export const ShopContext = createContext();

const ShopContextProvider = (props) => {
  const currency = '₹';
  const delivery_fee = 10;
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
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
    try { if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current); } catch {}
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
    } catch {}
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

          // Quick keyword flags
          // Helper to match any of a list of regexes
          const any = (regexes) => regexes.some((r) => r.test(hint));

          const isCap = any([/\bcaps?\b/i, /\bhat(s)?\b/i, /\bbeanie\b/i]);
          const isBelt = any([/\bbelts?\b/i, /waist\s*belt/i]);
          const isFlipFlop = any([/(flip\s*-?\s*flops?)/i]);
          const isSlide = any([/\bslides?\b/i]);
          const isSlipper = any([/\bslippers?\b/i]);
          const isClog = any([/\bclogs?\b/i]);
          const isSandal = any([/\bsandals?\b/i]);
          const isHoodie = any([/\bhoodies?\b/i, /hooded\s+sweatshirt/i, /zip\s*hoodie/i]);
          const isHandbag = any([/(hand\s*bags?)/i, /\bhandbag\b/i, /\btote\b/i]);
          const isJacket = any([/\bjackets?\b/i, /\bwindcheaters?\b/i, /\bblazers?\b/i]);
          const isShirt = any([/\bshirts?\b/i, /formal\s+shirt/i, /casual\s+shirt/i, /linen\s+shirt/i]);
          const isSunglasses = any([/(sunglass|sunglasses|shades)\b/i, /\bgoggles\b/i, /\bspectacles\b/i, /\bspecs\b/i, /\baviators?\b/i]);
          const isSweatshirt = any([/\bsweat\s*-?\s*shirts?\b/i, /\bsweatshirt\b/i]);
          const isTShirt = any([/(t\s*-?\s*shirts?|t-?shirts?|tshirt|t\s*shirt)\b/i, /\btees?\b/i, /crew\s*neck/i, /round\s*neck/i]);
          const isTrackPant = any([/(track\s*-?\s*pants?|trackpants?)\b/i, /\bjoggers?\b/i, /\btracks?\b/i]);
          const isTrouser = any([/\btrousers?\b/i]);
          const isPant = any([/\bpants?\b/i]);
          const isChino = any([/\bchinos?\b/i]);
          const isTracksuit = any([/\btrack\s*-?\s*suits?\b/i, /\btracksuits?\b/i]);
          const isWallet = any([/\bwallets?\b/i, /card\s*holder/i]);
          const isWomensWatch = any([/(women['’]s?\s+watch|lad(?:y|ies)\s+watch)/i]);
          const isMensWatch = /\bwatch\b/i.test(hint) && !isWomensWatch;
          const isWomensPerfume = any([
            /(women['’]s?\s+perfume|pour\s+femme)/i,
            /\bfragrance\b/i,
            /\bwomen\s*perfume\b/i,
            /\bwomens\s*perfume\b/i,
            /\bwomens?perfume\b/i
          ]);
          const isMensPerfume = any([
            /(men['’]s?\s+perfume|pour\s+homme)/i,
            /\bmen\s*perfume\b/i,
            /\bmens\s*perfume\b/i,
            /\bmenperfume\b/i
          ]) || (/\b(edp|edt|eau\s+de\s+parfum|eau\s+de\s+toilette)\b/i.test(hint) && !isWomensPerfume);
          // Treat both "discounted" and "sale" as discounted bucket
          const isDiscounted = /\b(discounted|sale)\b/i.test(lcRaw);
          const isShoe = isFootwearProduct({ category: originalCategory, categoryRaw: originalCategory, sizes: item?.sizes });

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
              price = 2800;
            }
          }

          // Canonicalize categoryRaw for UI routing/grouping (case-proof, handles concatenations)
          const canonicalCategory = (() => {
            const src = String(originalCategory || '');
            const key = src
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/[^a-z0-9]+/g, '');

            // Global buckets
            if (/(^|\b)(discounted|sale)(\b|$)/i.test(src)) return 'Discounted';
            if (/^men$/.test(key)) return 'Men';
            if (/^(women|lady|ladies|womens)$/.test(key)) return 'Women';
            if (/^kid|kids$/.test(key)) return 'Kids';

            // Specific product-type categories (many concatenated and spaced variants)
            if (/^(belt|belts|waistbelt|waistbelts)$/.test(key)) return 'Belts';
            if (/^(cap|caps|hat|hats|beanie|beanies)$/.test(key)) return 'Caps';
            if (/^(handbag|handbags|purse|purses|tote|totes|slingbag|slingbags|shoulderbag|shoulderbags)$/.test(key)) return 'Handbags';
            if (/^(jacket|jackets|windcheater|windcheaters|blazer|blazers|coat|coats)$/.test(key)) return 'Jackets';
            if (/^(shirt|shirts|formalshirt|casualshirt|linenshirt|overshirt|overshirts)$/.test(key)) return 'Shirts';
            if (/^(sunglass|sunglasses|shades|goggles|spectacles|specs|aviator|aviators)$/.test(key)) return 'Sunglasses';
            if (/^(sweatshirt|sweatshirts)$/.test(key)) return 'Sweatshirts';
            if (/^(tshirt|tshirts|tshirtmen|tshirtwomen|tshirtkids|tshirtboy|tshirtgirl|tshirtunisex|tshirttee|tee|tees)$/.test(key)) return 'TShirts';
            if (/^(trackpant|trackpants|jogger|joggers|tracks)$/.test(key)) return 'TrackPants';
            if (/^(tracksuit|tracksuits)$/.test(key)) return 'Tracksuits';
            if (/^(wallet|wallets|cardholder|cardholders)$/.test(key)) return 'Wallets';
            if (/^(watch|watches|menswatch|menswatches|menwatch)$/.test(key)) return 'MensWatches';
            if (/^(womenwatch|womenswatch|ladieswatch|womenswatches|womenwatches)$/.test(key)) return 'WomensWatches';
            if (/^(menperfume|mensperfume|menfragrance|mensfragrance)$/.test(key)) return 'MensPerfume';
            if (/^(womenperfume|womensperfume|ladiesperfume|womenfragrance|womensfragrance)$/.test(key)) return 'WomensPerfume';
            // Bottomwear subtypes first
            if (/^(jeans|denim|denims)$/.test(key)) return 'Jeans';
            if (/^(trouser|trousers)$/.test(key)) return 'Trousers';
            if (/^(pant|pants)$/.test(key)) return 'Pants';
            if (/^(chino|chinos)$/.test(key)) return 'Chinos';
            if (/^(bottomwear|bottoms)$/.test(key)) return 'Bottomwear';
            // Footwear subtypes first
            if (/^(flipflop|flipflops)$/.test(key)) return 'FlipFlops';
            if (/^slides?$/.test(key)) return 'Slides';
            if (/^slippers?$/.test(key)) return 'Slippers';
            if (/^(clog|clogs)$/.test(key)) return 'Clogs';
            if (/^sandals?$/.test(key)) return 'Sandals';
            if (/^(shoe|shoes|sneaker|sneakers|loafer|loafers|boot|boots|footwear)$/.test(key)) return 'Shoes';
            if (/^(topwear|tops)$/.test(key)) return 'Topwear';
            if (/^(accessory|accessories)$/.test(key)) return 'Accessories';

            // Default: title-case with separators normalized for readability
            const pretty = src
              .replace(/[_-]+/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()
              .toLowerCase()
              .replace(/\b([a-z])/g, (m, a) => a.toUpperCase());
            return pretty || originalCategory || '';
          })();

          // If the canonical category is still generic, use detected flags to specialize
          const specializeIfGeneric = (current) => {
            const genericSet = new Set(['Men','Women','Kids','Topwear','Bottomwear','Footwear','Accessories','Discounted','']);
            if (!genericSet.has(current)) return current;
            if (isBelt) return 'Belts';
            if (isCap) return 'Caps';
            if (isHandbag) return 'Handbags';
            if (isJacket) return 'Jackets';
            if (isShirt) return 'Shirts';
            if (isSunglasses) return 'Sunglasses';
            if (isSweatshirt) return 'Sweatshirts';
            if (isTShirt) return 'TShirts';
            if (isTrackPant) return 'TrackPants';
            if (isTrouser) return 'Trousers';
            if (isPant) return 'Pants';
            if (isChino) return 'Chinos';
            if (isTracksuit) return 'Tracksuits';
            if (isWallet) return 'Wallets';
            if (isMensWatch) return 'MensWatches';
            if (isWomensWatch) return 'WomensWatches';
            if (isMensPerfume) return 'MensPerfume';
            if (isWomensPerfume) return 'WomensPerfume';
            if (isJeansProduct({ category: originalCategory, categoryRaw: originalCategory })) return 'Jeans';
            if (isFlipFlop) return 'FlipFlops';
            if (isSlide) return 'Slides';
            if (isSlipper) return 'Slippers';
            if (isClog) return 'Clogs';
            if (isSandal) return 'Sandals';
            if (isShoe || isFootwearProduct({ category: originalCategory, categoryRaw: originalCategory, sizes: item?.sizes })) return 'Shoes';
            return current;
          };
          const finalCategoryRaw = specializeIfGeneric(canonicalCategory);

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
    try { localStorage.setItem('cart.v1', JSON.stringify(cartItems)); } catch {}
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
        } catch {}
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
        } catch {}
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
    getCartCount, getCartAmount
  }

  return (
    <ShopContext.Provider value={value}>
      {props.children}
    </ShopContext.Provider>
  )
}

export default ShopContextProvider;
