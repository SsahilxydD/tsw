// src/pages/Product.jsx
import React from "react";
import { useParams, Link } from "react-router-dom";
import { isRestoring } from "../utils/scrollRestoration";
import Title from "../components/Title";
import ProductItem from "../components/ProductItem";
import { ShopContext } from "../context/ShopContext";
import { isFootwearProduct, isJeansProduct, normalizeJeansSizes, toUKLabel, uniqueUKLabels, UK_FOOT_RANGE } from "../utils/size";
import SEO from "../components/SEO";
import CircularText from "../components/CircularText";
import { motion, AnimatePresence } from "framer-motion";
import SafeImg from "../components/SafeImg";
import ProductDetailSkeleton from "../components/ProductDetailSkeleton";
import ReviewList from "../components/ReviewList";
import ReviewForm from "../components/ReviewForm";
import Accordion from "../components/Accordion";
import RecentlyViewed from "../components/RecentlyViewed";
import SizeGuide from "../components/SizeGuide";
import { selectRelatedProducts } from "../utils/related";
import StickyATC from '../components/StickyATC';
import PriceDisplay from '../components/PriceDisplay';
import UrgencyBadge from '../components/UrgencyBadge';
import ShareButton from '../components/ShareButton';

// --- Animation Variants ---
const pageVariants = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1,
    transition: { duration: 0.4, staggerChildren: 0.1 }
  }
};

const imageVariants = {
  enter: { opacity: 0, scale: 1.02 },
  center: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }
  },
  exit: { 
    opacity: 0, 
    scale: 0.98,
    transition: { duration: 0.3 }
  }
};

const slideUp = {
  initial: { opacity: 0, y: 30 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }
  }
};

const staggerContainer = {
  animate: {
    transition: { staggerChildren: 0.08, delayChildren: 0.1 }
  }
};

const fadeInUp = {
  initial: { opacity: 0, y: 15 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" }
  }
};

const scaleIn = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { 
    opacity: 1, 
    scale: 1,
    transition: { type: "spring", stiffness: 400, damping: 25 }
  }
};

// --- description generator (module-scope, no component dependencies) ---
const generateDescription = (product, currency) => {
  const name = product.name || product.title || "";
  const brand = product.brand ? ` by ${product.brand}` : "";
  const category = product.category ? ` in ${product.category}` : "";
  const priceText = product.price != null ? ` for ${currency}${Number(product.price).toLocaleString()}` : "";
  let desc = `Shop ${name}${brand}${category}${priceText} at Solo Wardrobe.`;
  if (product.mrp && product.price && product.mrp > product.price) {
    const discount = Math.round(((product.mrp - product.price) / product.mrp) * 100);
    desc += ` Save ${discount}%!`;
  }
  if (desc.length > 160) {
    desc = desc.substring(0, 157) + "...";
  }
  return desc;
};

// --- size helpers ---
const APPAREL_SIZES = ["S", "M", "L", "XL", "XXL"]; // default ladder always shown for topwear
const APPAREL_ORDER = ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "3XL", "4XL", "5XL"];
const ONE_SIZE = ["ONESIZE"];
const norm = (s) => String(s || "").toUpperCase();

function inferMasterSizes(p) {
  const cat = String(p?.category || p?.categoryRaw || "").toLowerCase();
  const ps = Array.isArray(p?.sizes) ? p.sizes : [];
  if (ps.length === 0) return [];
  if (isFootwearProduct(p) && cat !== 'womenshoes') {
    return UK_FOOT_RANGE;
  }
  const up = ps.map(norm).filter(Boolean);
  const isTopwear = /(topwear|shirt|t\s?-?shirt|tshirt|hoodie|jacket|sweat|sweatshirt|tee)\b/.test(cat)
    || up.some((x) => ["XS", "S", "M", "L", "XL", "XXL"].includes(x));
  const isBottomwear = /(jeans|trouser|pant|bottomwear|bottom\s?wear)\b/.test(cat);
  if (isTopwear && !isBottomwear && up.length > 0) {
    // Always show the default S–XXL ladder, but include any non-standard sizes the
    // product actually carries (e.g. XS, 3XL) so they aren't silently dropped.
    const show = new Set(APPAREL_SIZES);
    for (const u of up) if (APPAREL_ORDER.includes(u)) show.add(u);
    return APPAREL_ORDER.filter((s) => show.has(s));
  }
  if (up.includes("ONESIZE")) return ONE_SIZE;
  if (isBottomwear) {
    return normalizeJeansSizes(ps);
  }
  const seen = new Set();
  const out = [];
  for (const s of ps) {
    const U = norm(s);
    if (!U) continue;
    if (!seen.has(U)) { seen.add(U); out.push(String(s)); }
  }
  return out;
}

export default function Product() {
  const { id } = useParams();
  const { products, productLookup, currency, addToCart, navigate, loadingProducts, toggleWishlist, isInWishlist, submitReview, getReviewsForProduct, getRatingForProduct, markHelpful, trackProductView } = React.useContext(ShopContext);
  const [added, setAdded] = React.useState(false);
  const [showReviewForm, setShowReviewForm] = React.useState(false);
  const [isSizeGuideOpen, setIsSizeGuideOpen] = React.useState(false);
  const flyTimerRef = React.useRef(null);
  const addedTimerRef = React.useRef(null);

  React.useEffect(() => {
    return () => {
      if (flyTimerRef.current) clearTimeout(flyTimerRef.current);
      if (addedTimerRef.current) clearTimeout(addedTimerRef.current);
    };
  }, []);

  React.useEffect(() => {
    if (isRestoring()) return;
    const scrollToTop = () => {
      if (!isRestoring()) {
        if (document.documentElement.scrollTop !== undefined) {
          document.documentElement.scrollTop = 0;
        }
        if (document.body.scrollTop !== undefined) {
          document.body.scrollTop = 0;
        }
        window.scrollTo(0, 0);
      }
    };
    scrollToTop();
  }, [id]);

  const product = React.useMemo(() => {
    if (productLookup.size === 0) return null;
    return productLookup.get(String(id)) || null;
  }, [productLookup, id]);

  // Track product view when product is loaded
  React.useEffect(() => {
    if (product && trackProductView) {
      const productId = product._id || product.slug || id;
      if (productId) {
        trackProductView(productId);
      }
    }
  }, [product, id, trackProductView]);

  // Get reviews and rating for this product
  const productId = React.useMemo(() => {
    if (!product) return String(id);
    return String(product._id ?? product.slug ?? id);
  }, [product, id]);
  
  const reviews = React.useMemo(() => {
    if (!productId) return [];
    return getReviewsForProduct(productId);
  }, [productId, getReviewsForProduct]);
  
  const rating = React.useMemo(() => {
    if (!productId) return { average: 0, count: 0 };
    return getRatingForProduct(productId);
  }, [productId, getRatingForProduct]);

  const gallery = React.useMemo(() => {
    if (!product) return [];
    if (Array.isArray(product.images) && product.images.length > 0) {
      return product.images;
    }
    if (Array.isArray(product.image)) return product.image;
    if (product.image) return [product.image];
    return [];
  }, [product]);

  const [activeIdx, setActiveIdx] = React.useState(0);
  React.useEffect(() => { setActiveIdx(0); }, [id]);

  const [selectedSize, setSelectedSize] = React.useState("");
  React.useEffect(() => setSelectedSize(""), [id]);

  const footParsed = React.useMemo(() => {
    if (!product) return [];
    if (!isFootwearProduct(product)) return [];
    return uniqueUKLabels(product.sizes);
  }, [product]);

  const hasSizes = React.useMemo(() => {
    if (!product) return false;
    if (isFootwearProduct(product)) return footParsed.length > 0;
    return Array.isArray(product.sizes) && product.sizes.length > 0;
  }, [product, footParsed]);

  const masterSizes = React.useMemo(() => {
    if (isFootwearProduct(product)) {
      return footParsed.length > 0 ? UK_FOOT_RANGE : [];
    }
    return inferMasterSizes(product);
  }, [product, footParsed]);

  const availableSet = React.useMemo(() => {
    if (!product) return new Set();
    if (isFootwearProduct(product)) {
      return new Set(uniqueUKLabels(product.sizes));
    }
    if (isJeansProduct(product)) {
      return new Set(normalizeJeansSizes(product.sizes));
    }
    return new Set((product?.sizes || []).map(norm));
  }, [product, footParsed]);

  const requiresSize = hasSizes && masterSizes.length > 0;
  const canSubmit = !requiresSize || Boolean(selectedSize);

  const handleAdd = () => {
    if (!canSubmit) return;
    const sizeToSend = hasSizes ? selectedSize : "std";
    addToCart(String(product._id ?? product.slug), sizeToSend);
    setAdded(true);
    try {
      const imgEl = document.getElementById("product-main-image");
      const cartEl = document.getElementById("cart-anchor");
      if (imgEl && cartEl) {
        const imgRect = imgEl.getBoundingClientRect();
        const cartRect = cartEl.getBoundingClientRect();
        const clone = imgEl.cloneNode(true);
        clone.style.position = 'fixed';
        clone.style.left = imgRect.left + 'px';
        clone.style.top = imgRect.top + 'px';
        clone.style.width = imgRect.width + 'px';
        clone.style.height = imgRect.height + 'px';
        clone.style.opacity = '0.9';
        clone.style.zIndex = '9999';
        clone.style.borderRadius = '8px';
        clone.style.transition = 'transform 600ms cubic-bezier(.22,.8,.24,1), opacity 600ms ease';
        document.body.appendChild(clone);
        const dx = cartRect.left + cartRect.width / 2 - (imgRect.left + imgRect.width / 2);
        const dy = cartRect.top + cartRect.height / 2 - (imgRect.top + imgRect.height / 2);
        requestAnimationFrame(() => {
          clone.style.transform = `translate(${dx}px, ${dy}px) scale(.08)`;
          clone.style.opacity = '0.1';
        });
        flyTimerRef.current = setTimeout(() => { try { document.body.removeChild(clone); } catch { } }, 650);
      }
    } catch { }
    addedTimerRef.current = setTimeout(() => setAdded(false), 700);
  };

  const related = React.useMemo(() => {
    if (!product || !Array.isArray(products)) return [];
    // Use shared related algorithm: prefers categoryRaw/subCategory match + keyword overlap.
    return selectRelatedProducts(product, products).slice(0, 6);
  }, [product, products]);

  if (loadingProducts || !Array.isArray(products)) {
    return <ProductDetailSkeleton />;
  }

  if (!product) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4 py-12"
      >
        <Title text1="PRODUCT" text2="NOT FOUND" />
        <p className="text-gray-500 mt-2">
          The item you're looking for doesn't exist or was removed.
        </p>
        <Link
          to="/"
          className="inline-block mt-6 px-5 py-3 border border-black hover:bg-black hover:text-white transition-colors"
        >
          Go Home
        </Link>
      </motion.div>
    );
  }


  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      className="px-4 sm:px-6 lg:px-8 pt-8 sm:pt-10 pb-32 md:pb-10 max-w-7xl mx-auto"
    >
      <SEO
        title={`${product.name || product.title} – Solo Wardrobe`}
        description={generateDescription(product, currency)}
        url={typeof window !== 'undefined' ? window.location.href : ''}
        canonical={typeof window !== 'undefined' ? window.location.href : ''}
        type="product"
        image={Array.isArray(product.images) ? product.images[0] : (Array.isArray(product.image) ? product.image[0] : product.image)}
        price={product.price}
        currency="INR"
        imageWidth={1200}
        imageHeight={1200}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Product",
          "name": product.name || product.title,
          "image": Array.isArray(product.images) ? product.images : (Array.isArray(product.image) ? product.image : [product.image]).filter(Boolean),
          "brand": product.brand ? { "@type": "Brand", "name": product.brand } : undefined,
          "offers": {
            "@type": "Offer",
            "priceCurrency": "INR",
            "price": String(product.price || 0),
            "availability": "https://schema.org/InStock",
            "url": typeof window !== 'undefined' ? window.location.href : ''
          }
        }}
      />

      {/* Product Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-12">
        
        {/* Gallery */}
        <motion.div variants={slideUp} className="space-y-4">
          {/* Main Image with AnimatePresence */}
          <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-gray-50">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeIdx}
                variants={imageVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="absolute inset-0"
              >
                {gallery[activeIdx] ? (
                  <SafeImg
                    id="product-main-image"
                    src={gallery[activeIdx]}
                    alt={product.name || product.title}
                    className="h-full w-full object-contain"
                    width={800}
                    height={800}
                    loading="eager"
                    quality={90}
                  />
                ) : (
                  <div className="h-full w-full grid place-content-center text-sm text-gray-400">
                    No Image
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Thumbnails - Improved Grid */}
          {gallery.length > 1 && (
            <motion.div 
              variants={staggerContainer}
              initial="initial"
              animate="animate"
              className="grid grid-cols-4 sm:grid-cols-5 gap-3"
            >
              {gallery.slice(0, 8).map((src, i) => (
                <motion.button
                  key={i}
                  variants={scaleIn}
                  custom={i}
                  type="button"
                  onClick={() => setActiveIdx(i)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`aspect-square rounded-md overflow-hidden bg-gray-50 transition-all duration-200 min-h-[44px] sm:min-h-0
                    ${i === activeIdx 
                      ? "ring-2 ring-black ring-offset-2" 
                      : "ring-1 ring-gray-200 hover:ring-gray-400"
                    }`}
                  aria-label={`View product image ${i + 1} of ${gallery.length}`}
                  aria-pressed={i === activeIdx}
                >
                  <SafeImg
                    src={src}
                    alt={`View ${i + 1}`}
                    className="h-full w-full object-cover"
                    width={150}
                    height={150}
                    loading="lazy"
                    quality={85}
                  />
                </motion.button>
              ))}
            </motion.div>
          )}
        </motion.div>

        {/* Details */}
        <motion.div 
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="flex flex-col"
        >
          {/* Brand */}
          {product.brand && (
            <motion.p 
              variants={fadeInUp}
              className="text-xs uppercase tracking-widest text-gray-400 font-medium"
            >
              {product.brand}
            </motion.p>
          )}

          {/* Product Name */}
          <motion.h1
            variants={fadeInUp}
            className="mt-2 text-lg sm:text-xl font-medium text-gray-900 leading-relaxed"
          >
            {product.name || product.title || ""}
          </motion.h1>
          <UrgencyBadge
            productId={product._id || product.slug}
            bestseller={product.bestseller}
            discounted={product.categoryRaw === 'Discounted'}
          />

          {/* Price Block */}
          <motion.div variants={fadeInUp} className="mt-4">
            <PriceDisplay price={product.price} mrp={product.mrp} currency={currency} />
          </motion.div>

          {/* Rating Display */}
          {rating.count > 0 && (
            <motion.div variants={fadeInUp} className="mt-4 flex items-center gap-3">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg
                    key={star}
                    className="w-5 h-5 text-yellow-400"
                    fill={star <= Math.round(rating.average) ? 'currentColor' : 'none'}
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                    />
                  </svg>
                ))}
              </div>
              <span className="text-sm font-medium text-gray-700">
                {rating.average.toFixed(1)}
              </span>
              <span className="text-sm text-gray-500">
                ({rating.count} {rating.count === 1 ? 'review' : 'reviews'})
              </span>
            </motion.div>
          )}

          {/* Sizes */}
          {masterSizes.length > 0 && (
            <motion.div variants={fadeInUp} className="mt-6">
              <p className="text-sm font-medium text-gray-900 mb-3">Select Size</p>
              <motion.div 
                variants={staggerContainer}
                className="flex flex-wrap gap-2"
              >
                {masterSizes.map((sz, i) => {
                  const SZ = norm(sz);
                  const available = availableSet.size === 0 ? true : availableSet.has(SZ);
                  const active = selectedSize === SZ;
                  const label = SZ.replace(/^UK-/, "");

                  return (
                    <motion.button
                      key={SZ}
                      variants={scaleIn}
                      custom={i}
                      type="button"
                      onClick={() => {
                        if (!available) return;
                        // Toggle: if already selected, unselect; otherwise select
                        setSelectedSize(active ? "" : SZ);
                      }}
                      disabled={!available}
                      whileHover={available ? { scale: 1.05 } : {}}
                      whileTap={available ? { scale: 0.95 } : {}}
                      className={`min-w-[2.75rem] h-10 px-3 text-sm font-medium transition-all duration-200 rounded-md min-h-[44px] sm:min-h-0
                        ${active
                          ? "bg-black text-white shadow-lg"
                          : available 
                            ? "bg-white text-gray-700 border border-gray-200 hover:border-black cursor-pointer"
                            : "bg-gray-100 text-gray-300 border border-gray-100 cursor-not-allowed"}`}
                      aria-pressed={active}
                      aria-label={`Size ${label}${active ? ', selected' : ''}${!available ? ', out of stock' : ''}`}
                    >
                      {label}
                    </motion.button>
                  );
                })}
              </motion.div>
              
              {/* Size Guide Link */}
              <div className="mt-3">
                <button
                  onClick={() => setIsSizeGuideOpen(true)}
                  className="text-sm text-gray-600 hover:text-black underline transition-colors flex items-center gap-1"
                  aria-label="Open size guide"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Size Guide
                </button>
              </div>

              <AnimatePresence>
                {requiresSize && !selectedSize && (
                  <motion.p 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-xs text-amber-600 mt-3 font-medium"
                    role="alert"
                    aria-live="polite"
                  >
                    ↑ Please select a size
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* CTA Buttons */}
          <motion.div variants={fadeInUp} className="mt-8 flex flex-col sm:flex-row gap-3">
            <motion.button
              whileHover={{ scale: 1.02, boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}
              whileTap={{ scale: 0.98 }}
              onClick={handleAdd}
              disabled={!canSubmit}
              className={`flex-1 sm:flex-none px-8 py-3.5 bg-black text-white text-sm font-medium tracking-wide transition-all min-h-[44px] sm:min-h-0
                ${!canSubmit ? "opacity-40 cursor-not-allowed" : ""}
                ${added ? "bg-green-600" : ""}`}
              aria-label={added ? "Product added to cart" : `Add ${product.name || product.title}${hasSizes && selectedSize ? `, size ${selectedSize}` : ''} to cart`}
            >
              {added ? "✓ Added" : "Add to Cart"}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              disabled={!canSubmit}
              onClick={() => {
                if (!canSubmit) return;
                const sizeToSend = hasSizes ? selectedSize : 'std';
                const pid = String(product._id ?? product.slug);
                addToCart(pid, sizeToSend);
                navigate('/address');
              }}
              className={`px-6 py-3.5 border border-black text-sm font-medium tracking-wide transition-all hover:bg-black hover:text-white min-h-[44px] sm:min-h-0
                ${!canSubmit ? "opacity-40 cursor-not-allowed" : ""}`}
              aria-label={`Buy ${product.name || product.title}${hasSizes && selectedSize ? `, size ${selectedSize}` : ''} now`}
            >
              Buy Now
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => toggleWishlist(product._id ?? product.slug)}
              className={`px-4 py-3.5 border border-gray-300 text-sm font-medium tracking-wide transition-all hover:border-red-500 hover:text-red-500 min-h-[44px] sm:min-h-0 flex items-center justify-center ${
                isInWishlist(product._id ?? product.slug) ? 'border-red-500 text-red-500' : ''
              }`}
              aria-label={isInWishlist(product._id ?? product.slug) ? `Remove ${product.name || product.title} from wishlist` : `Add ${product.name || product.title} to wishlist`}
            >
              <svg className="w-5 h-5" fill={isInWishlist(product._id ?? product.slug) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </motion.button>
          </motion.div>

          <ShareButton product={product} currency={currency} />

          {/* Trust Badges */}
          <motion.div 
            variants={fadeInUp} 
            className="mt-6 border border-gray-200 rounded-lg p-4 bg-gray-50/50"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2.5">
                <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="text-sm font-semibold text-gray-800">3 Days Return & Exchange</span>
              </div>
              <div className="flex items-center gap-2.5">
                <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                <span className="text-sm font-semibold text-gray-800">Free Shipping</span>
              </div>
              <div className="flex items-center gap-2.5">
                <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span className="text-sm font-semibold text-gray-800">Secured Payment</span>
              </div>
              <div className="flex items-center gap-2.5">
                <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="text-sm font-semibold text-gray-800">Same Day Dispatch</span>
              </div>
            </div>
          </motion.div>

          {/* Category Tag */}
          {product.category && (
            <motion.div variants={fadeInUp} className="mt-8 pt-6 border-t border-gray-100">
              <Link 
                to={`/category/${String(product.category).toLowerCase()}`}
                className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-black transition-colors"
              >
                <span className="w-1 h-1 bg-gray-400 rounded-full" />
                <span className="capitalize">{String(product.category).replaceAll("-", " ")}</span>
              </Link>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Reviews Section */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6 }}
        className="mt-16 sm:mt-20 max-w-6xl mx-auto px-4"
      >
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <Title text1="CUSTOMER" text2="REVIEWS" />
            {rating.count > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                      key={star}
                      className="w-5 h-5 text-yellow-400"
                      fill={star <= Math.round(rating.average) ? 'currentColor' : 'none'}
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                      />
                    </svg>
                  ))}
                </div>
                <span className="text-lg font-semibold text-gray-900">
                  {rating.average.toFixed(1)}
                </span>
                <span className="text-sm text-gray-500">
                  ({rating.count} {rating.count === 1 ? 'review' : 'reviews'})
                </span>
              </div>
            )}
          </div>

          {/* Review Form Accordion */}
          <div className="mb-8">
            <Accordion 
              title="Write a Review"
              defaultOpen={showReviewForm}
              onToggle={setShowReviewForm}
            >
              <ReviewForm
                productId={productId}
                onSubmit={async (reviewData) => {
                  const result = submitReview(reviewData);
                  if (result.success) {
                    setShowReviewForm(false);
                  }
                  return result;
                }}
                onCancel={() => setShowReviewForm(false)}
              />
            </Accordion>
          </div>

          {/* Reviews List */}
          <ReviewList
            reviews={reviews}
            onHelpful={(reviewId) => {
              markHelpful(reviewId);
            }}
          />
        </div>
      </motion.div>

      {/* Related Products */}
      {related.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="mt-16 sm:mt-20"
        >
          <div className="flex items-center justify-between mb-6">
            <Title text1="YOU MAY" text2="Also Like" />
            <Link
              to={product.category ? `/category/${String(product.category).toLowerCase()}` : "/collection"}
              className="text-xs font-medium text-gray-500 hover:text-black transition-colors"
            >
              View all →
            </Link>
          </div>

          <motion.div 
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-4 lg:gap-6"
          >
            {related.map((item, index) => (
              <motion.div
                key={String(item._id ?? item.slug)}
                variants={fadeInUp}
                custom={index}
              >
                <ProductItem
                  id={String(item._id ?? item.slug)}
                  image={
                    Array.isArray(item.image)
                      ? item.image[0]
                      : (Array.isArray(item.images) ? item.images[0] : item.image)
                  }
                  name={item.name || item.title}
                  price={item.price}
                  i={index}
                />
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      )}

      {/* Recently Viewed Products */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="mt-16 sm:mt-20"
      >
        <RecentlyViewed excludeProductId={productId} maxItems={10} />
      </motion.div>

      {/* Size Guide Modal */}
      <SizeGuide
        isOpen={isSizeGuideOpen}
        onClose={() => setIsSizeGuideOpen(false)}
        product={product}
      />

      <StickyATC
        priceText={`${currency}${product.price?.toLocaleString('en-IN') || 0}`}
        disabled={hasSizes && !selectedSize}
        onClick={handleAdd}
      />
    </motion.div>
  );
}
