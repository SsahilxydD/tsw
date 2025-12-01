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

// --- small helpers (no external deps) ---
const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "for", "of", "to", "with", "by", "in", "on", "at", "edp", "edt", "ml",
  "men", "mens", "women", "womens", "unisex", "perfume", "watch", "watches", "shirt", "tshirt",
  "t-shirt", "tee", "size", "sizes", "new", "premium", "royal", "essence", "eau", "de", "la", "le",
]);

function tokenize(str = "") {
  return String(str)
    .toLowerCase()
    .replace(/[_\-./]+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .split(/\s+/)
    .filter(Boolean)
    .filter((w) => !STOPWORDS.has(w));
}

function relevanceScore(base, candidate) {
  const baseWords = new Set([
    ...tokenize(base.name || base.title),
    ...tokenize(base.brand),
  ]);
  let score = 0;
  for (const w of tokenize(candidate.name || candidate.title)) {
    if (baseWords.has(w)) score += 1;
  }
  if (candidate.brand) {
    for (const w of tokenize(candidate.brand)) {
      if (baseWords.has(w)) score += 0.5;
    }
  }
  if (
    base.category &&
    candidate.category &&
    String(base.category).toLowerCase() ===
    String(candidate.category).toLowerCase()
  ) {
    score += 2;
  }
  return score;
}

function shuffle(arr, rng = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// --- size helpers ---
const APPAREL_SIZES = ["S", "M", "L", "XL", "XXL"];
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
  if (isTopwear && !isBottomwear && up.length > 0) return APPAREL_SIZES;
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
  const { products, currency, addToCart, navigate, loadingProducts } = React.useContext(ShopContext);
  const [added, setAdded] = React.useState(false);

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
    if (!Array.isArray(products)) return null;
    return (
      products.find((p) => String(p._id) === String(id)) ||
      products.find((p) => String(p.slug) === String(id)) ||
      null
    );
  }, [products, id]);

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
        setTimeout(() => { try { document.body.removeChild(clone); } catch { } }, 650);
      }
    } catch { }
    setTimeout(() => setAdded(false), 700);
  };

  const related = React.useMemo(() => {
    if (!product || !Array.isArray(products)) return [];
    const meId = String(product._id ?? product.slug);
    const meCat = String(product.category ?? product.categoryRaw ?? "").toLowerCase();
    const candidates = products.filter((p) => String(p._id ?? p.slug) !== meId);
    const scored = candidates
      .map((p) => ({ p, s: relevanceScore(product, p) }))
      .sort((a, b) => b.s - a.s);
    const topFour = scored.slice(0, 4).map((x) => x.p);
    const picked = new Set(topFour.map((x) => String(x._id ?? x.slug)));
    const sameCatPool = candidates.filter((p) => {
      const pid = String(p._id ?? p.slug);
      const cat = String(p.category ?? p.categoryRaw ?? "").toLowerCase();
      return !picked.has(pid) && cat && cat === meCat;
    });
    const randomTwo = shuffle(sameCatPool).slice(0, 2);
    return [...topFour, ...randomTwo].slice(0, 6);
  }, [product, products]);

  if (loadingProducts || !Array.isArray(products)) {
    return (
      <div className="px-4 py-24 flex justify-center items-center min-h-[60vh]">
        <CircularText
          text="LOADING*"
          onHover="speedUp"
          spinDuration={18}
          className="text-gray-800"
        />
      </div>
    );
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

  const generateDescription = () => {
    const name = product.name || product.title || "";
    const brand = product.brand ? ` by ${product.brand}` : "";
    const category = product.category ? ` in ${product.category}` : "";
    const priceText = product.price ? ` for ${currency}${Number(product.price).toLocaleString()}` : "";
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

  const discountPercent = product.mrp && product.price && product.mrp > product.price 
    ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
    : 0;

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      className="px-4 sm:px-6 lg:px-8 py-8 sm:py-10 max-w-7xl mx-auto"
    >
      <SEO
        title={`${product.name || product.title} – Solo Wardrobe`}
        description={generateDescription()}
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12">
        
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
                  <img
                    id="product-main-image"
                    src={gallery[activeIdx]}
                    alt={product.name || product.title}
                    className="h-full w-full object-contain"
                    loading="eager"
                    decoding="sync"
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
                  className={`aspect-square rounded-md overflow-hidden bg-gray-50 transition-all duration-200
                    ${i === activeIdx 
                      ? "ring-2 ring-black ring-offset-2" 
                      : "ring-1 ring-gray-200 hover:ring-gray-400"
                    }`}
                >
                  <img
                    src={src}
                    alt={`View ${i + 1}`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    decoding="async"
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

          {/* Price Block */}
          <motion.div variants={fadeInUp} className="mt-4 flex items-baseline gap-3 flex-wrap">
            <span className="text-xl sm:text-2xl font-bold text-gray-900">
              {currency}{Number(product.price).toLocaleString()}
            </span>
            {discountPercent > 0 && (
              <>
                <span className="text-sm text-gray-400 line-through">
                  {currency}{Number(product.mrp).toLocaleString()}
                </span>
                <motion.span 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, delay: 0.3 }}
                  className="px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-700 rounded"
                >
                  {discountPercent}% OFF
                </motion.span>
              </>
            )}
          </motion.div>

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
                      className={`min-w-[2.75rem] h-10 px-3 text-sm font-medium transition-all duration-200 rounded-md
                        ${active
                          ? "bg-black text-white shadow-lg"
                          : available 
                            ? "bg-white text-gray-700 border border-gray-200 hover:border-black cursor-pointer"
                            : "bg-gray-100 text-gray-300 border border-gray-100 cursor-not-allowed"}`}
                    >
                      {label}
                    </motion.button>
                  );
                })}
              </motion.div>
              <AnimatePresence>
                {requiresSize && !selectedSize && (
                  <motion.p 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-xs text-amber-600 mt-3 font-medium"
                  >
                    ↑ Please select a size
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* CTA Buttons */}
          <motion.div variants={fadeInUp} className="mt-8 flex gap-3">
            <motion.button
              whileHover={{ scale: 1.02, boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}
              whileTap={{ scale: 0.98 }}
              onClick={handleAdd}
              disabled={!canSubmit}
              className={`flex-1 sm:flex-none px-8 py-3.5 bg-black text-white text-sm font-medium tracking-wide transition-all
                ${!canSubmit ? "opacity-40 cursor-not-allowed" : ""}
                ${added ? "bg-green-600" : ""}`}
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
              className={`px-6 py-3.5 border border-black text-sm font-medium tracking-wide transition-all hover:bg-black hover:text-white
                ${!canSubmit ? "opacity-40 cursor-not-allowed" : ""}`}
            >
              Buy Now
            </motion.button>
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
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-8 sm:gap-x-6 sm:gap-y-10"
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
    </motion.div>
  );
}
