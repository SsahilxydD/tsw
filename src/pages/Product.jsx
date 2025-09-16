// src/pages/Product.jsx
import React from "react";
import { useParams, Link } from "react-router-dom";
import Title from "../components/Title";
import ProductItem from "../components/ProductItem";
import { ShopContext } from "../context/ShopContext";
import { isFootwearProduct, isJeansProduct, normalizeJeansSizes, toUKLabel, uniqueUKLabels, UK_FOOT_RANGE } from "../utils/size";

// --- small helpers (no external deps) ---
const STOPWORDS = new Set([
  "the","a","an","and","or","for","of","to","with","by","in","on","at","edp","edt","ml",
  "men","mens","women","womens","unisex","perfume","watch","watches","shirt","tshirt",
  "t-shirt","tee","size","sizes","new","premium","royal","essence","eau","de","la","le",
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

/** score candidate by shared keywords; extra weight if same category */
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
    score += 2; // category boost
  }
  return score;
}

/** Fisher–Yates (pure) */
function shuffle(arr, rng = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// --- size helpers ---
const APPAREL_SIZES = ["S","M","L","XL","XXL"];
const ONE_SIZE = ["ONESIZE"];

const norm = (s) => String(s || "").toUpperCase();

function inferMasterSizes(p) {
  const cat = String(p?.category || p?.categoryRaw || "").toLowerCase();
  const ps = Array.isArray(p?.sizes) ? p.sizes : [];

  // If no sizes are provided, do not render a size selector at all.
  if (ps.length === 0) return [];

  if (isFootwearProduct(p)) {
    // For footwear, show a consistent UK range and strike-out unavailable.
    return UK_FOOT_RANGE;
  }

  const up = ps.map(norm).filter(Boolean);

  // Treat classic topwear only (not jeans/trousers) as S..XXL grid
  const isTopwear = /(topwear|shirt|t\s?-?shirt|tshirt|hoodie|jacket|sweat|sweatshirt|tee)\b/.test(cat)
    || up.some((x) => ["XS","S","M","L","XL","XXL"].includes(x));
  const isBottomwear = /(jeans|trouser|pant|bottomwear|bottom\s?wear)\b/.test(cat);

  if (isTopwear && !isBottomwear && up.length > 0) return APPAREL_SIZES;

  // Only show explicit one-size if declared in data.
  if (up.includes("ONESIZE")) return ONE_SIZE;

  // For jeans/bottomwear: normalize to numeric waist labels and sort
  if (isBottomwear) {
    return normalizeJeansSizes(ps);
  }

  // Otherwise, show the unique provided sizes (case-insensitive)
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
  const { products, currency, addToCart, navigate } = React.useContext(ShopContext);
  const [added, setAdded] = React.useState(false);

  // scroll to top on product change (prevents jumping)
  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [id]);

  const product = React.useMemo(() => {
    if (!Array.isArray(products)) return null;
    // Try both _id and slug (supports scraped catalog)
    return (
      products.find((p) => String(p._id) === String(id)) ||
      products.find((p) => String(p.slug) === String(id)) ||
      null
    );
  }, [products, id]);

  // normalize gallery (supports `image` or `images`)
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
  React.useEffect(() => setActiveIdx(0), [id]);

  const [selectedSize, setSelectedSize] = React.useState("");
  React.useEffect(() => setSelectedSize(""), [id]);

  // Parse footwear sizes (UK labels) when present; otherwise empty
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

  // build master list + set of available sizes for this product
  const masterSizes = React.useMemo(() => {
    if (isFootwearProduct(product)) {
      // Only render footwear size grid when explicit sizes exist; otherwise hide sizes
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

  // gate CTAs until size is selected (when sizes exist)
  const requiresSize = hasSizes && masterSizes.length > 0;
  const canSubmit = !requiresSize || Boolean(selectedSize);

  const handleAdd = () => {
    if (!canSubmit) return;
    const sizeToSend = hasSizes ? selectedSize : "std";
    addToCart(String(product._id ?? product.slug), sizeToSend);
    setAdded(true);
    try {
      // Fly-to-cart micro animation
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
        setTimeout(() => { try { document.body.removeChild(clone); } catch {} }, 650);
      }
    } catch {}
    setTimeout(() => setAdded(false), 700);
  };

  // ----- Related products -----
  // Top 4 by relevance; last 2 = random FROM SAME CATEGORY
  const related = React.useMemo(() => {
    if (!product || !Array.isArray(products)) return [];

    const meId = String(product._id ?? product.slug);
    const meCat = String(product.category ?? product.categoryRaw ?? "").toLowerCase();

    const candidates = products.filter(
      (p) => String(p._id ?? p.slug) !== meId
    );

    // Relevance for first 4
    const scored = candidates
      .map((p) => ({ p, s: relevanceScore(product, p) }))
      .sort((a, b) => b.s - a.s);
    const topFour = scored.slice(0, 4).map((x) => x.p);

    // Same-category random for last 2
    const picked = new Set(topFour.map((x) => String(x._id ?? x.slug)));
    const sameCatPool = candidates.filter((p) => {
      const pid = String(p._id ?? p.slug);
      const cat = String(p.category ?? p.categoryRaw ?? "").toLowerCase();
      return !picked.has(pid) && cat && cat === meCat;
    });
    const randomTwo = shuffle(sameCatPool).slice(0, 2);

    return [...topFour, ...randomTwo].slice(0, 6);
  }, [product, products]);

  if (!product) {
    return (
      <div className="px-4 py-12">
        <Title text1="PRODUCT" text2="NOT FOUND" />
        <p className="text-gray-500 mt-2">
          The item you’re looking for doesn’t exist or was removed.
        </p>
        <Link
          to="/"
          className="inline-block mt-6 px-5 py-3 border rounded hover:bg-gray-50"
        >
          Go Home
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6">
      {/* Product section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Gallery */}
        <div>
          {/* Main image */}
          <div className="aspect-square w-full overflow-hidden rounded border">
            {gallery[activeIdx] ? (
              <img
                id="product-main-image"
                src={gallery[activeIdx]}
                alt={product.name || product.title}
                className="h-full w-full object-contain"
                loading="eager"
              />
            ) : (
              <div className="h-full w-full grid place-content-center text-sm text-gray-400">
                No Image
              </div>
            )}
          </div>

          {/* Thumbnails */}
          {gallery.length > 1 && (
            <div className="mt-3 grid grid-cols-5 sm:grid-cols-6 gap-2">
              {gallery.map((src, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveIdx(i)}
                  className={`aspect-square rounded border overflow-hidden ${
                    i === activeIdx ? "ring-2 ring-black" : ""
                  }`}
                >
                  <img
                    src={src}
                    alt={`thumb ${i + 1}`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          {/* (No Title component here to avoid the decorative line) */}
          {product.brand ? (
            <p className="text-xs uppercase tracking-wide text-gray-500">
              {product.brand}
            </p>
          ) : null}
          <h1 className="mt-1 text-xl sm:text-2xl font-semibold leading-snug">
            {product.name || product.title || ""}
          </h1>

          {product.mrp && product.price && product.mrp > product.price ? (
            <p className="mt-2">
              <span className="text-xl font-semibold">
                {currency}
                {Number(product.price).toLocaleString()}
              </span>{" "}
              <span className="text-gray-400 line-through ml-2">
                {currency}
                {Number(product.mrp).toLocaleString()}
              </span>{" "}
              <span className="ml-2 text-green-600 text-sm">
                Save {Math.round(((product.mrp - product.price) / product.mrp) * 100)}%
              </span>
            </p>
          ) : (
            <p className="mt-2 text-xl font-semibold">
              {currency}
              {Number(product.price).toLocaleString()}
            </p>
          )}

          {/* Sizes (always show full list; strike-out unavailable) */}
          {masterSizes.length > 0 && (
            <div className="mt-5">
              <p className="text-sm font-medium mb-2">Select Size</p>
              {/* Single-line, horizontally scrollable size boxes (adjoined) */}
              <div className="flex overflow-x-auto whitespace-nowrap">
                {masterSizes.map((sz, i) => {
                  const SZ = norm(sz);
                  const available = availableSet.size === 0 ? true : availableSet.has(SZ);
                  const active = selectedSize === SZ;
                  const label = SZ.replace(/^UK-/, "");
                  const lastIdx = masterSizes.length - 1;
                  const roundClass = i === 0
                    ? "rounded-l-sm"
                    : (i === lastIdx ? "rounded-r-sm" : "rounded-none");
                  return (
                    <button
                      key={SZ}
                      type="button"
                      onClick={() => available && setSelectedSize(SZ)}
                      disabled={!available}
                      className={`h-9 w-9 text-xs border grid place-content-center shrink-0 ${roundClass} ${i>0? 'ml-[-1px]': ''}
                        ${active ? "bg-black text-white border-black" : "bg-white hover:bg-gray-50"}
                        ${!available ? "line-through opacity-40 cursor-not-allowed bg-gray-100 hover:bg-gray-100" : ""}`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              {requiresSize && !selectedSize && (
                <p className="text-xs text-amber-600 mt-2">
                  Please select a size before ordering.
                </p>
              )}
            </div>
          )}

          

          {/* CTA (replica style) */}
          <div className="mt-6 space-y-3">
            {/* Add to cart as minimal text button centered */}
            <div className="text-center">
              <button
                onClick={handleAdd}
                disabled={!canSubmit}
                className={`text-[15px] font-semibold underline-offset-2 ${!canSubmit ? 'opacity-40 cursor-not-allowed' : 'hover:underline'}`}
              >
                {added ? 'Added to cart' : 'Add to cart'}
              </button>
            </div>

            {/* Big rounded BUY NOW bar with UPI logos and chevron */}
            <button
              type="button"
              disabled={!canSubmit}
              onClick={() => {
                if (!canSubmit) return;
                const sizeToSend = hasSizes ? selectedSize : 'std';
                const pid = String(product._id ?? product.slug);
                addToCart(pid, sizeToSend);
                navigate('/address');
              }}
              className={`w-full px-5 py-4 rounded-2xl text-white bg-black flex items-center justify-between pressable active:scale-[0.99]
                ${!canSubmit ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-95'}`}
            >
              <span className="text-[15px] sm:text-base font-semibold tracking-wide">BUY NOW</span>
              <span className="flex items-center gap-2">
                {/* Local public icons: place files in /public */}
                <img src="/gpay.png" alt="GPay" className="h-5 w-5 rounded-full bg-white p-0.5 object-contain" loading="lazy" />
                <img src="/phonepe.png" alt="PhonePe" className="h-5 w-5 rounded-full bg-white p-0.5 object-contain" loading="lazy" />
                <img src="/paytm.png" alt="Paytm" className="h-5 w-5 rounded-full bg-white p-0.5 object-contain" loading="lazy" />
                <span aria-hidden className="ml-1 text-xl leading-none">›</span>
              </span>
            </button>
          </div>

          {/* Meta */}
          <div className="mt-6 space-y-1 text-sm text-gray-600">
            {product.category && (
              <p>
                Category:{" "}
                <span className="capitalize">
                  {String(product.category).replaceAll("-", " ")}
                </span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Related products */}
      <div className="mt-12">
        <div className="flex items-end justify-between mb-4">
          <Title text1="RELATED" text2="PRODUCTS" />
          <Link
            to={product.category ? `/category/${String(product.category).toLowerCase()}` : "/collection"}
            className="text-xs sm:text-sm text-gray-500 hover:text-gray-700"
          >
            View all
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 gap-y-6">
          {related.map((item, index) => (
            <ProductItem
              key={String(item._id ?? item.slug)}
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
          ))}
        </div>
      </div>
    </div>
  );
}

