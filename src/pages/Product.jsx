import React, { useContext, useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Title from "../components/Title";
import ProductItem from "../components/ProductItem";
import { ShopContext } from "../context/ShopContext";
import { isFootwearProduct, isJeansProduct, normalizeJeansSizes, uniqueUKLabels, toUKLabel } from "../utils/size";

export default function Product() {
  const { id: paramId } = useParams();

  // Context is optional; fall back to pure-frontend behavior if absent
  const ctx = useContext(ShopContext) || {};
  const {
    products,
    addToCart,
    navigate: ctxNavigate,
    currency = "₹",
  } = ctx;

  // Router navigate as fallback if context.navigate isn't provided
  const routerNavigate = useNavigate();
  const navigate = typeof ctxNavigate === "function" ? ctxNavigate : routerNavigate;

  const [fallback, setFallback] = useState({ loading: false, product: null, error: "" });

  const product = useMemo(() => {
    if (!Array.isArray(products)) return null;
    return (
      products.find((p) => String(p._id) === String(paramId)) ||
      products.find((p) => String(p.slug) === String(paramId)) ||
      null
    );
  }, [products, paramId]);

  // Direct-link fallback loader from static products.json (frontend-only)
  useEffect(() => {
    let cancelled = false;
    if (product) return;
    const id = String(paramId || "");
    if (!id) return;
    const load = async () => {
      try {
        setFallback((s) => ({ ...s, loading: true, error: "" }));
        const endpoints = ["/products.json", "/data/products.json"];
        let list = [];
        let basePrefix = "";
        for (const url of endpoints) {
          try {
            const r = await fetch(url, { cache: "no-store" });
            if (!r.ok) continue;
            const j = await r.json();
            list = Array.isArray(j) ? j : (Array.isArray(j?.products) ? j.products : []);
            basePrefix = url.startsWith("/data/") ? "/data" : "";
            if (list && list.length) break;
          } catch {}
        }
        if (!Array.isArray(list) || list.length === 0) throw new Error("Catalog unavailable");

        const normInputSizes = (val) => {
          try {
            if (Array.isArray(val)) return val.map((x) => String(x)).filter(Boolean);
            if (typeof val === 'string') return val.split(/[,|\/]+|\s+/).map((x) => x.trim()).filter(Boolean);
            if (typeof val === 'number') return [String(val)];
            if (val && typeof val === 'object') return Object.values(val).map(String).filter(Boolean);
          } catch {}
          return [];
        };

        const mapItem = (item) => {
          const images = Array.isArray(item.images)
            ? item.images.map((src) => {
                if (!src) return "";
                if (/^https?:\/\//i.test(src)) return src;
                if (basePrefix) {
                  if (src.startsWith(basePrefix + "/")) return src;
                  if (src.startsWith("/")) return `${basePrefix}${src}`;
                  return `${basePrefix}/${src}`;
                }
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

          const basePrice = Number(item.price ?? 0) || 0;
          const lcRaw = String(originalCategory ?? "").toLowerCase();
          const title = String(item?.title ?? item?.slug_name ?? "");
          const lcTitle = title.toLowerCase();
          const isDiscounted = /\bdiscounted\b/i.test(lcRaw);
          const looksShoe = isFootwearProduct({ category: originalCategory, categoryRaw: originalCategory, sizes: item?.sizes, name: title });
          let price = Math.max(0, basePrice + (isDiscounted ? 0 : 450));
          if (isDiscounted && looksShoe) {
            const special900 = [
              /\buptempo\b.*\bslide(r)?\b/i,
              /\boffcourt\b.*\badjust\b.*\bslide\b/i,
              /\bbirkenstock\b/i,
              /\bbrikenstock\b/i,
              /\bcrocs?\b/i,
              /\bcroccs\b/i,
              /\badidas\b.*\bslides?\b|\bslides?\b.*\badidas\b/i,
            ].some((re) => re.test(lcTitle));
            price = special900 ? 900 : 2800;
          }

          return {
            _id: (item.slug ?? item.slug_name ?? item.title)?.toString(),
            name: title,
            price,
            mrp: Number(item.mrp ?? 0),
            image: images[0] ?? "",
            images,
            category,
            categoryRaw: originalCategory,
            subCategory: item.subCategory ?? "",
            sizes: normInputSizes(item.sizes),
            bestseller: Boolean(item.bestseller ?? false),
            slug: item.slug ?? "",
            detail_url_src: item.detail_url_src ?? "",
          };
        };

        const byId = new Map();
        for (const it of list) {
          // FIX: add parentheses so ?? and || aren't mixed
          const key = String((it?.slug ?? it?.id ?? it?.slug_name ?? it?.title) || "");
          if (key) byId.set(key, it);
        }
        let raw = byId.get(id) || list.find((it) => String(it.slug) === id || String(it.id) === id);
        if (!raw) throw new Error("Product not found");
        const mapped = mapItem(raw);
        if (!cancelled) setFallback({ loading: false, product: mapped, error: "" });
      } catch (e) {
        if (!cancelled) setFallback({ loading: false, product: null, error: String(e?.message || 'Failed to load') });
      }
    };
    load();
    return () => { cancelled = true; };
  }, [product, paramId]);

  const effective = product || fallback.product;

  const [added, setAdded] = useState(false);
  const [selectedSize, setSelectedSize] = useState("");
  const canSubmit = !!effective;

  // Pure-frontend cart fallback if context.addToCart is absent
  const addToCartSafe = (pid, sz) => {
    if (typeof addToCart === "function") return addToCart(pid, sz);
    try {
      const key = `${pid}|${sz}`;
      const raw = localStorage.getItem("cart") || "{}";
      const cart = JSON.parse(raw);
      cart[key] = (cart[key] || 0) + 1;
      localStorage.setItem("cart", JSON.stringify(cart));
    } catch {}
  };

  const handleAdd = () => {
    if (!effective) return;
    const pid = String(effective._id ?? effective.slug);
    const sz = String(selectedSize || "").trim();
    if (!sz) return;
    addToCartSafe(pid, sz);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  if (!effective) {
    const isLoading = (!Array.isArray(products) || products.length === 0) || fallback.loading;
    if (isLoading) {
      return (
        <div className="border-t pt-10 px-4 max-w-6xl mx-auto">
          <h1 className="text-xl font-semibold mb-4">Product</h1>
          <p className="text-sm text-gray-600">Loading product...</p>
        </div>
      );
    }
    return (
      <div className="border-t pt-10 px-4 max-w-6xl mx-auto">
        <h1 className="text-xl font-semibold mb-4">Product</h1>
        <p className="text-sm text-gray-600">This product is unavailable.</p>
        <div className="mt-4">
          <Link className="underline" to="/collection">Back to collection</Link>
        </div>
      </div>
    );
  }

  const related = Array.isArray(products)
    ? products.filter((p) => String(p._id) !== String(effective._id)).slice(0, 12)
    : [];

  const allImages = useMemo(() => {
    try {
      if (Array.isArray(effective?.images)) return effective.images.filter(Boolean);
      if (Array.isArray(effective?.image)) return effective.image.filter(Boolean);
      return effective?.image ? [effective.image] : [];
    } catch { return []; }
  }, [effective]);

  // Derive and normalize sizes for the product page
  const sizeOptions = useMemo(() => {
    let arr = Array.isArray(effective?.sizes) ? effective.sizes : [];
    if (isFootwearProduct(effective)) arr = uniqueUKLabels(arr);
    else if (isJeansProduct(effective)) arr = normalizeJeansSizes(arr);
    else arr = arr.map((s) => String(s)).filter(Boolean);
    const bad = /^(one\s?size|onesize|os|std)$/i;
    const seen = new Set();
    const out = [];
    for (const s of arr) {
      const key = (String(s).toUpperCase());
      if (bad.test(key)) continue;
      if (!seen.has(key)) { seen.add(key); out.push(String(s)); }
    }
    if (out.length === 0) return ["STD"];
    if (isFootwearProduct(effective)) {
      return out.map((x) => toUKLabel(x) || String(x)).filter(Boolean);
    }
    return out;
  }, [effective]);

  return (
    <div className="border-t pt-10 px-4 max-w-6xl mx-auto">
      <div className="mb-4">
        <Title text1={effective.name || effective.title || "PRODUCT"} text2={""} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="rounded-none border bg-white p-4 min-h-[300px]">
          {allImages.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth">
              {allImages.map((src, i) => (
                <img
                  key={`${i}-${String(src)}`}
                  src={src}
                  alt={(effective.name || effective.title || 'Product') + ` ${i+1}`}
                  className="flex-none w-full max-h-[420px] object-contain rounded-none border snap-center"
                  loading={i === 0 ? 'eager' : 'lazy'}
                />
              ))}
            </div>
          ) : (
            <div className="h-full w-full grid place-content-center text-gray-500">No image</div>
          )}
        </div>

        <div className="rounded-none border bg-white p-4">
          <h2 className="text-xl font-semibold">{effective.name || effective.title}</h2>
          <p className="mt-2 text-xl font-semibold">
            {currency} {Number(effective.price).toLocaleString()}
          </p>

          <div className="mt-6 space-y-3">
            <button
              onClick={handleAdd}
              disabled={!canSubmit || !selectedSize}
              className={`w-full h-14 px-5 rounded-none border border-black bg-white text-black font-semibold pressable flex items-center justify-center text-[15px] sm:text-base tracking-wide ${(!canSubmit || !selectedSize) ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {added ? "Added to cart" : "Add to cart"}
            </button>

            <button
              type="button"
              disabled={!canSubmit || !selectedSize}
              onClick={() => {
                if (!canSubmit) return;
                const pid = String(effective._id ?? effective.slug);
                const sz = String(selectedSize || "").trim();
                if (!sz) return;
                addToCartSafe(pid, sz);
                navigate("/address");
              }}
              className={`w-full h-14 px-5 rounded-none text-white bg-black flex items-center justify-center pressable active:scale-[0.99] ${(!canSubmit || !selectedSize) ? "opacity-50 cursor-not-allowed" : "hover:opacity-95"}`}
            >
              <span className="text-[15px] sm:text-base font-semibold tracking-wide">Buy Now</span>
            </button>
          </div>

          <div className="mt-6 space-y-1 text-sm text-gray-600">
            <div className="mb-3">
              <p className="text-sm font-medium mb-1">Select size</p>
              <div className="flex flex-wrap gap-2">
                {sizeOptions.map((sz) => (
                  <button
                    key={String(sz)}
                    type="button"
                    onClick={() => setSelectedSize(String(sz).toUpperCase())}
                    className={`px-3 py-1.5 border rounded-md text-sm tracking-wide ${String(selectedSize).toUpperCase() === String(sz).toUpperCase() ? 'bg-black text-white border-black' : 'bg-white text-black hover:bg-gray-50'}`}
                    aria-pressed={String(selectedSize).toUpperCase() === String(sz).toUpperCase()}
                  >
                    {String(sz).replace(/^UK-/, '')}
                  </button>
                ))}
              </div>
              {!selectedSize && (
                <p className="mt-2 text-xs text-red-600">Please select a size to continue.</p>
              )}
            </div>
            {effective.category && (
              <p>
                Category:{" "}
                <span className="capitalize">
                  {String(effective.category).replaceAll("-", " ")}
                </span>
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-12">
        <div className="flex items-end justify-between mb-4">
          <Title text1="RELATED" text2="PRODUCTS" />
          <Link
            to={effective.category ? `/category/${String(effective.category).toLowerCase()}` : "/collection"}
            className="text-xs sm:text-sm text-gray-500 hover:text-gray-700"
          >
            View all
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 gap-y-6">
          {related.map((item, idx) => (
            <ProductItem
              key={String(item._id ?? item.slug)}
              id={String(item._id ?? item.slug)}
              image={Array.isArray(item.images) ? item.images[0] : (Array.isArray(item.image) ? item.image[0] : item.image)}
              name={item.name || item.title}
              price={item.price}
              i={idx}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
