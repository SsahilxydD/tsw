// src/pages/Product.jsx
import React from "react";
import { useParams, Link } from "react-router-dom";
import Title from "../components/Title";
import ProductItem from "../components/ProductItem";
import { ShopContext } from "../context/ShopContext";

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

// --- NEW: size helpers ---
const FOOT_SIZES = [
  "36","37","38","39","40","41","42","43","44","45","46",
  "M-6","M-7","M-8","M-9","M-10","M-11"
];
const APPAREL_SIZES = ["S","M","L","XL"];
const ONE_SIZE = ["ONESIZE"];

const norm = (s) => String(s || "").toUpperCase();

function inferMasterSizes(p) {
  const cat = String(p?.category || p?.categoryRaw || "").toLowerCase();
  const ps = (Array.isArray(p?.sizes) ? p.sizes : []).map(norm);

  const isFoot =
    ps.some((x) => /^\d+$/.test(x) || x.startsWith("M-")) ||
    /(shoe|sneaker|footwear)/.test(cat);

  if (isFoot) return FOOT_SIZES;

  const isApp =
    ps.some((x) => ["XS","S","M","L","XL","XXL"].includes(x)) ||
    /(topwear|shirt|tshirt|hoodie|jacket|sweat|tee|trouser|pant|jean)/.test(cat);

  if (isApp) return APPAREL_SIZES;

  const isOne =
    ps.includes("ONESIZE") ||
    /(sunglass|watch|perfume|fragrance|belt|wallet|bag|cap|accessor)/.test(cat);

  if (isOne) return ONE_SIZE;

  // Fallback: if product declares sizes, show them; otherwise onesize.
  return ps.length ? [...new Set(ps)] : ONE_SIZE;
}

export default function Product() {
  const { id } = useParams();
  const { products, currency, addToCart } = React.useContext(ShopContext);

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

  const hasSizes =
    product && Array.isArray(product.sizes) && product.sizes.length > 0;

  // NEW: build master list + set of available sizes for this product
  const masterSizes = React.useMemo(() => inferMasterSizes(product), [product]);
  const availableSet = React.useMemo(
    () => new Set((product?.sizes || []).map(norm)),
    [product]
  );

  // gating CTAs until size is selected (when sizes exist)
  const requiresSize = hasSizes && masterSizes.length > 0;
  const canSubmit = !requiresSize || Boolean(selectedSize);

  const handleAdd = () => {
    if (!canSubmit) return;
    const sizeToSend = hasSizes ? selectedSize : "std";
    addToCart(String(product._id ?? product.slug), sizeToSend);
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
      {/* NOTE: Breadcrumbs removed as requested */}

      {/* Product section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Gallery */}
        <div>
          {/* Main image */}
          <div className="aspect-square w-full overflow-hidden rounded border">
            {gallery[activeIdx] ? (
              <img
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

          {/* Sizes (now always show full list; strike-out unavailable) */}
          {masterSizes.length > 0 && (
            <div className="mt-5">
              <p className="text-sm font-medium mb-2">Select Size</p>
              <div className="flex flex-wrap gap-2">
                {masterSizes.map((sz) => {
                  const SZ = norm(sz);
                  const available = availableSet.size === 0 ? true : availableSet.has(SZ);
                  const active = selectedSize === SZ;
                  return (
                    <button
                      key={SZ}
                      type="button"
                      onClick={() => available && setSelectedSize(SZ)}
                      disabled={!available}
                      className={`px-3 py-2 text-sm border rounded
                        ${active ? "bg-black text-white border-black" : "hover:bg-gray-50"}
                        ${!available ? "line-through opacity-40 cursor-not-allowed bg-gray-100 hover:bg-gray-100" : ""}`}
                    >
                      {SZ}
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

          {/* CTA (disabled until size selected when required) */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={handleAdd}
              disabled={!canSubmit}
              className={`px-5 py-3 bg-black text-white text-sm rounded hover:opacity-90
                ${!canSubmit ? "opacity-50 cursor-not-allowed hover:opacity-50" : ""}`}
            >
              Add to cart
            </button>

            <button
  type="button"
  disabled={!canSubmit}
  onClick={() => {
    if (!canSubmit) return;
    const sizePart = selectedSize ? ` (Size: ${selectedSize})` : "";
    const wa = `https://wa.me/919933778870?text=${encodeURIComponent(
      `Hi, I'm interested in this product: ${window.location.href}${sizePart}`
    )}`;
    window.open(wa, "_blank", "noopener");
  }}
  className={`px-4 py-3 border rounded text-sm
    ${!canSubmit ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50"}`}
>
  Order on WhatsApp
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
          {related.map((item) => (
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
            />
          ))}
        </div>
      </div>
    </div>
  );
}
