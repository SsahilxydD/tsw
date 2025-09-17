import React, { useContext, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Title from "../components/Title";
import ProductItem from "../components/ProductItem";
import { ShopContext } from "../context/ShopContext";
import { isFootwearProduct, isJeansProduct, normalizeJeansSizes, uniqueUKLabels, toUKLabel } from "../utils/size";

export default function Product() {
  const { id: paramId } = useParams();
  const { products, addToCart, navigate, currency = "₹" } = useContext(ShopContext);

  const product = useMemo(() => {
    if (!Array.isArray(products)) return null;
    return (
      products.find((p) => String(p._id) === String(paramId)) ||
      products.find((p) => String(p.slug) === String(paramId)) ||
      null
    );
  }, [products, paramId]);

  const [added, setAdded] = useState(false);
  const canSubmit = !!product;
  const [selectedSize, setSelectedSize] = useState("");

  const handleAdd = () => {
    if (!product) return;
    const pid = String(product._id ?? product.slug);
    const sz = String(selectedSize || "").trim();
    if (!sz) return; // guard; button disabled otherwise
    addToCart(pid, sz);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  if (!product) {
    return (
      <div className="border-t pt-10 px-4 max-w-6xl mx-auto">
        <h1 className="text-xl font-semibold mb-4">Product</h1>
        <p className="text-sm text-gray-600">This product is unavailable.</p>
        <div className="mt-4">
          <Link className="underline" to="/collection">
            Back to collection
          </Link>
        </div>
      </div>
    );
  }

  const related = Array.isArray(products)
    ? products.filter((p) => String(p._id) !== String(product._id)).slice(0, 12)
    : [];

  const allImages = useMemo(() => {
    try {
      if (Array.isArray(product?.images)) return product.images.filter(Boolean);
      if (Array.isArray(product?.image)) return product.image.filter(Boolean);
      return product?.image ? [product.image] : [];
    } catch { return []; }
  }, [product]);

  // Derive and normalize sizes for the product page
  const sizeOptions = useMemo(() => {
    let arr = Array.isArray(product?.sizes) ? product.sizes : [];
    if (isFootwearProduct(product)) arr = uniqueUKLabels(arr);
    else if (isJeansProduct(product)) arr = normalizeJeansSizes(arr);
    else arr = arr.map((s) => String(s)).filter(Boolean);
    const bad = /^(one\s?size|onesize|os|std)$/i;
    const seen = new Set();
    const out = [];
    for (const s of arr) {
      const key = (String(s).toUpperCase());
      if (bad.test(key)) continue;
      if (!seen.has(key)) { seen.add(key); out.push(String(s)); }
    }
    if (out.length === 0) {
      // Fall back to a standard option; still require an explicit pick
      return ["STD"];
    }
    // For footwear ensure label normalization
    if (isFootwearProduct(product)) {
      return out.map((x) => toUKLabel(x) || String(x)).filter(Boolean);
    }
    return out;
  }, [product]);

  return (
    <div className="border-t pt-10 px-4 max-w-6xl mx-auto">
      <div className="mb-4">
        <Title text1={product.name || product.title || "PRODUCT"} text2={""} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="rounded-none border bg-white p-4 min-h-[300px]">
          {allImages.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth">
              {allImages.map((src, i) => (
                <img
                  key={`${i}-${String(src)}`}
                  src={src}
                  alt={(product.name || product.title || 'Product') + ` ${i+1}`}
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
          <h2 className="text-xl font-semibold">{product.name || product.title}</h2>
          <p className="mt-2 text-xl font-semibold">
            {currency} {Number(product.price).toLocaleString()}
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
                const pid = String(product._id ?? product.slug);
                const sz = String(selectedSize || "").trim();
                if (!sz) return;
                addToCart(pid, sz);
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
            {product.category && (
              <p>
                Category: {" "}
                <span className="capitalize">
                  {String(product.category).replaceAll("-", " ")}
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
            to={product.category ? `/category/${String(product.category).toLowerCase()}` : "/collection"}
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
