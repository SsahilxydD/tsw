import { createContext, useEffect, useRef, useState, useCallback, useMemo } from "react";
import { isJeansProduct, normalizeJeansSizes, uniqueUKLabels } from "../utils/size";
import { computeProductPricing } from "../utils/pricing";
import { useNavigate } from "react-router-dom";
import { safeFetch, safeLocalStorage, handleError } from "../utils/errorHandler";
import { loadCart, saveCart, setupCartSync, clearCart } from "../utils/cartPersistence";
import { loadWishlist, saveWishlist, setupWishlistSync, clearWishlist } from "../utils/wishlistPersistence";
import { loadRecentlyViewed, saveRecentlyViewed, setupRecentlyViewedSync, addToRecentlyViewed } from "../utils/recentlyViewedPersistence";
import { validateCoupon, calculateDiscount } from "../utils/coupons";
import { loadReviews, addReview, markReviewHelpful, generateReviewId } from "../utils/reviewPersistence";

export const ShopContext = createContext();

// CDN Configuration for R2
// Set this to your R2 custom domain once configured (e.g., 'https://cdn.thesolowardrobe.com')
// Leave empty to use local/origin images
const CDN_BASE = import.meta.env.VITE_CDN_URL || '';

// Max units of a single item (per size) allowed in the cart
export const MAX_ITEM_QTY = 10;

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
  // Snapshot of each item's unit price, captured at add-to-cart time and refreshed
  // when products load. Keeps the subtotal correct even before products finish
  // loading or if a SKU is later removed from the catalog (otherwise it'd be ₹0).
  const [cartPrices, setCartPrices] = useState(() => {
    try {
      const raw = safeLocalStorage.getItem('cart.prices.v1');
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  });
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  // Minimal in-app notice (replaces toastify)
  const [notice, setNotice] = useState(null);
  const noticeTimerRef = useRef(null);

  const notify = useCallback((msg) => {
    try { if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current); } catch { }
    setNotice({ id: Date.now(), msg: String(msg || '') });
    noticeTimerRef.current = setTimeout(() => setNotice(null), 2000);
  }, []);

  // Cleanup notice timer on unmount to prevent memory leak
  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) {
        clearTimeout(noticeTimerRef.current);
      }
    };
  }, []);

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
    } else {
      // Clearing the address should also clear the persisted copy, otherwise it
      // silently returns on the next refresh.
      safeLocalStorage.removeItem('addr.v1');
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
            handleError(e, { url: src.url, operation: 'loadProducts' });
          }
        }
        if (!raw) {
          const errorInfo = handleError(lastErr || new Error('No products source available'), { operation: 'loadProducts' });
          notify(errorInfo.message);
          setProducts([]);
          return;
        }

        // Category normalization + per-category markup live in utils/pricing.js
        // (single source of truth shared with cloudflare-worker.js). See computeProductPricing.

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
          // Category normalization + markup + Discounted flat-pricing all live in
          // utils/pricing.js so the storefront and the OG worker price identically.
          const originalCategory = String(item.category ?? "");
          const { finalCategoryRaw, derivedSub, price } = computeProductPricing(item);

          let category = originalCategory;
          const lc = String(category).toLowerCase();
          if (lc.includes("men")) category = "Men";
          else if (lc.includes("women") || lc.includes("lady")) category = "Women";
          else if (lc.includes("kid")) category = "Kids";

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
        }) : [];

        // Deduplicate products by _id
        const seenIds = new Set();
        const deduped = mapped.filter((item) => {
          if (!item || !item._id) return false;
          if (seenIds.has(item._id)) return false;
          seenIds.add(item._id);
          return true;
        });

        setProducts(deduped);
      } catch (err) {
        const errorInfo = handleError(err, { operation: 'processProducts' });
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
      notify('Unable to save cart. Please check browser settings.');
    }
  }, [cartItems]);

  // Persist the price snapshots alongside the cart
  useEffect(() => {
    safeLocalStorage.setItem('cart.prices.v1', JSON.stringify(cartPrices));
  }, [cartPrices]);

  // Persist wishlist whenever it changes
  useEffect(() => {
    const saved = saveWishlist(wishlist);
    if (!saved && wishlist.length > 0) {
      notify('Unable to save wishlist. Please check browser settings.');
    }
  }, [wishlist]);

  // Setup cross-tab cart synchronization
  useEffect(() => {
    const cleanup = setupCartSync((newCartData) => {
      // Validate incoming data before applying
      if (!newCartData || typeof newCartData !== 'object' || Array.isArray(newCartData)) return;
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
      // Validate incoming data before applying
      if (!Array.isArray(newWishlistData)) return;
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
    saveRecentlyViewed(recentlyViewed);
  }, [recentlyViewed]);

  // Setup cross-tab recently viewed synchronization
  useEffect(() => {
    const cleanup = setupRecentlyViewedSync((newRecentlyViewedData) => {
      // Validate incoming data before applying
      if (!Array.isArray(newRecentlyViewedData)) return;
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

  const productLookup = useMemo(() => {
    const map = new Map();
    for (const p of products) {
      if (p._id) map.set(p._id, p);
      if (p.slug) map.set(p.slug, p);
    }
    return map;
  }, [products]);

  // Once products are available, refresh price snapshots for items in the cart so
  // the subtotal always reflects the current catalog price.
  useEffect(() => {
    if (productLookup.size === 0) return;
    setCartPrices(prev => {
      let changed = false;
      const next = { ...prev };
      for (const itemId of Object.keys(cartItems)) {
        const info = productLookup.get(itemId);
        const price = info ? Number(info.price) : NaN;
        if (Number.isFinite(price) && price > 0 && next[itemId] !== price) {
          next[itemId] = price;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [productLookup, cartItems]);

  const addToCart = useCallback((itemId, size, silent = false) => {
    if (!size) { notify('Select product size'); return; }
    let cartData = structuredClone(cartItems);
    if (cartData[itemId]) {
      const current = cartData[itemId][size] || 0;
      if (current >= MAX_ITEM_QTY) { notify(`Maximum ${MAX_ITEM_QTY} per item`); return; }
      cartData[itemId][size] = current + 1;
    } else {
      cartData[itemId] = { [size]: 1 };
    }
    setCartItems(cartData);
    // Snapshot the unit price so the subtotal stays correct even before products
    // (re)load or if this SKU is later removed from the catalog.
    const info = productLookup.get(itemId);
    const price = info ? Number(info.price) : NaN;
    if (Number.isFinite(price) && price > 0) {
      setCartPrices(prev => (prev[itemId] === price ? prev : { ...prev, [itemId]: price }));
    }
    if (!silent) {
      setIsCartOpen(true);
      notify('Added to bag');
    }
  }, [cartItems, notify, productLookup]);

  const updateQuantity = useCallback((itemId, size, quantity) => {
    let cartData = structuredClone(cartItems);
    if (!cartData[itemId]) cartData[itemId] = {};
    if (quantity <= 0) {
      delete cartData[itemId][size];
      if (Object.keys(cartData[itemId]).length === 0) delete cartData[itemId];
    } else {
      cartData[itemId][size] = Math.min(quantity, MAX_ITEM_QTY);
    }
    setCartItems(cartData);
    if (quantity === 0) notify('Removed from bag');
  }, [cartItems, notify]);

  // Clear cart function (for logout, order completion, etc.)
  const clearCartItems = useCallback(() => {
    clearCart();
    setCartItems({});
    setCartPrices({});
    notify('Cart cleared');
  }, [notify]);

  // Wishlist functions
  const addToWishlist = useCallback((productId) => {
    const pid = String(productId);
    if (!wishlist.includes(pid)) {
      const newWishlist = [...wishlist, pid];
      setWishlist(newWishlist);
      notify('Added to wishlist');
    } else {
      notify('Already in wishlist');
    }
  }, [wishlist, notify]);

  const removeFromWishlist = useCallback((productId, silent = false) => {
    const pid = String(productId);
    const newWishlist = wishlist.filter(id => id !== pid);
    setWishlist(newWishlist);
    if (!silent) notify('Removed from wishlist');
  }, [wishlist, notify]);

  const toggleWishlist = useCallback((productId) => {
    const pid = String(productId);
    if (wishlist.includes(pid)) {
      removeFromWishlist(pid);
    } else {
      addToWishlist(pid);
    }
  }, [wishlist, addToWishlist, removeFromWishlist]);

  const isInWishlist = useCallback((productId) => wishlist.includes(String(productId)), [wishlist]);

  const getWishlistCount = useCallback(() => wishlist.length, [wishlist]);

  const moveToCart = useCallback((productId, size = 'std') => {
    removeFromWishlist(productId, true);
    addToCart(productId, size, true);
    notify('Moved to cart');
  }, [removeFromWishlist, addToCart, notify]);

  const clearWishlistItems = useCallback(() => {
    clearWishlist();
    setWishlist([]);
    notify('Wishlist cleared');
  }, [notify]);

  const cartCount = useMemo(() => {
    let total = 0;
    Object.values(cartItems).forEach(sizes => {
      Object.values(sizes).forEach(qty => { if (qty > 0) total += qty; });
    });
    return total;
  }, [cartItems]);

  const cartAmount = useMemo(() => {
    let total = 0;
    Object.entries(cartItems).forEach(([itemId, sizes]) => {
      const itemInfo = productLookup.get(itemId);
      // Prefer the live catalog price; fall back to the snapshot taken when the
      // item was added so an unresolved/removed SKU isn't silently priced at ₹0.
      const unitPrice = itemInfo ? (Number(itemInfo.price) || 0) : (Number(cartPrices[itemId]) || 0);
      Object.entries(sizes).forEach(([, qty]) => {
        if (qty > 0) {
          total += unitPrice * qty;
        }
      });
    });
    return total;
  }, [cartItems, productLookup, cartPrices]);

  const getCartCount = useCallback(() => cartCount, [cartCount]);
  const getCartAmount = useCallback(() => cartAmount, [cartAmount]);
  const getCartSubtotal = useCallback(() => cartAmount, [cartAmount]);

  const discountAmount = useMemo(() => {
    if (!appliedCoupon) return 0;
    // Re-check the minimum-order requirement on every change. The coupon is only
    // validated once at apply time, so without this a user could apply it at a
    // qualifying total and then remove items to keep an invalid discount.
    if (appliedCoupon.minOrder && cartAmount < appliedCoupon.minOrder) return 0;
    return calculateDiscount(appliedCoupon, cartAmount);
  }, [appliedCoupon, cartAmount]);

  const cartTotal = useMemo(() => Math.max(0, cartAmount - discountAmount), [cartAmount, discountAmount]);

  // If the cart drops below the applied coupon's minimum, drop the coupon entirely
  // so the invalid discount can't be carried into the WhatsApp order. Gated on
  // loadingProducts so the transient ₹0 subtotal during load doesn't trigger it.
  useEffect(() => {
    if (loadingProducts) return;
    if (appliedCoupon && appliedCoupon.minOrder && cartAmount > 0 && cartAmount < appliedCoupon.minOrder) {
      setAppliedCoupon(null);
      notify(`Coupon "${appliedCoupon.code}" removed — minimum order ${currency}${appliedCoupon.minOrder} not met`);
    }
  }, [appliedCoupon, cartAmount, loadingProducts, notify, currency]);

  const getDiscountAmount = useCallback(() => discountAmount, [discountAmount]);
  const getCartTotal = useCallback(() => cartTotal, [cartTotal]);

  const applyCoupon = useCallback((code) => {
    const subtotal = getCartSubtotal();
    // Build cart items array for category checking
    const cartItemsArray = [];
    for (const items in cartItems) {
      const itemInfo = productLookup.get(items);
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
  }, [getCartSubtotal, cartItems, productLookup, notify]);

  const removeCoupon = useCallback(() => {
    if (appliedCoupon) {
      setAppliedCoupon(null);
      notify('Coupon removed');
    }
  }, [appliedCoupon, notify]);

  // Review functions
  const submitReview = useCallback((reviewData) => {
    // Coerce and validate the rating up front rather than letting the persistence
    // layer silently clamp a bad value (which would corrupt the average).
    const ratingNum = Math.round(Number(reviewData.rating));
    if (!Number.isFinite(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      notify('Please select a rating between 1 and 5 stars');
      return { success: false, error: 'Please select a rating between 1 and 5 stars' };
    }
    const review = {
      id: generateReviewId(),
      productId: String(reviewData.productId),
      rating: ratingNum,
      title: reviewData.title,
      comment: reviewData.comment,
      authorName: reviewData.authorName,
      authorEmail: reviewData.authorEmail,
      date: new Date().toISOString(),
      helpfulCount: 0,
      verified: false,
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
  }, [notify]);

  const getReviewsForProduct = useCallback((productId) => {
    const pid = String(productId);
    return reviews.filter(r => r.productId === pid && r.status === 'approved');
  }, [reviews]);

  const getRatingForProduct = useCallback((productId) => {
    const pid = String(productId);
    const productReviews = reviews.filter(r => r.productId === pid && r.status === 'approved');
    if (productReviews.length === 0) return { average: 0, count: 0 };
    const sum = productReviews.reduce((acc, r) => acc + r.rating, 0);
    return {
      average: Math.round((sum / productReviews.length) * 10) / 10,
      count: productReviews.length
    };
  }, [reviews]);

  const markHelpful = useCallback((reviewId) => {
    const result = markReviewHelpful(reviewId);
    if (result.success) {
      const updatedReviews = loadReviews();
      setReviews(updatedReviews);
      return { success: true };
    }
    return { success: false, error: result.error };
  }, []);

  // Recently viewed functions
  const trackProductView = useCallback((productId) => {
    if (!productId) return;
    // Normalize to the canonical _id so viewing the same product by slug vs _id
    // doesn't create duplicate "recently viewed" entries.
    const pid = String(productLookup.get(String(productId))?._id || productId);
    const success = addToRecentlyViewed(pid);
    if (success) {
      // Reload recently viewed to get updated list
      const updated = loadRecentlyViewed();
      setRecentlyViewed(updated);
    }
  }, [productLookup]);

  const getRecentlyViewedProducts = useCallback(() => {
    const productIds = recentlyViewed.map(item => item.productId);
    if (productLookup.size === 0 || productIds.length === 0) return [];

    // Use productLookup Map for O(1) lookups instead of find() per item
    return productIds
      .map(id => productLookup.get(id))
      .filter(Boolean);
  }, [productLookup, recentlyViewed]);

  const value = useMemo(() => ({
    currency, delivery_fee,
    products, productLookup, loadingProducts,
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
  }), [
    currency, delivery_fee, products, productLookup, loadingProducts,
    navigate, notice, notify, address, search, showSearch,
    addToCart, updateQuantity, clearCartItems, cartItems,
    getCartCount, getCartAmount, getCartSubtotal, getCartTotal,
    getDiscountAmount, applyCoupon, removeCoupon, appliedCoupon,
    isCartOpen, wishlist, addToWishlist, removeFromWishlist, toggleWishlist,
    isInWishlist, getWishlistCount, moveToCart, clearWishlistItems,
    reviews, submitReview, getReviewsForProduct, getRatingForProduct, markHelpful,
    recentlyViewed, trackProductView, getRecentlyViewedProducts
  ]);

  return (
    <ShopContext.Provider value={value}>
      {props.children}
    </ShopContext.Provider>
  )
}

export default ShopContextProvider;
