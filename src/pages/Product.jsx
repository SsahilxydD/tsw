import React, { useContext, useEffect, useMemo, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { ShopContext } from "../context/ShopContext";
import ProductItem from "../components/ProductItem";
import { assets } from "../assets/assets";
import SafeImg from "../components/SafeImg";
import StickyATC from "../components/StickyATC";
import useDocumentTitle from "../hooks/useDocumentTitle";

const Product = () => {
  const { id } = useParams();
  const { products, addToCart, currency } = useContext(ShopContext);

  const product = useMemo(
    () => (Array.isArray(products) ? products.find((p) => p._id === id) : null),
    [products, id]
  );

  const images = useMemo(() => {
    if (!product) return [];
    if (Array.isArray(product.images) && product.images.length) return product.images;
    return product?.image ? [product.image] : [];
  }, [product]);

  const [activeIdx, setActiveIdx] = useState(0);
  const activeImage = images[activeIdx] || "";
  const [size, setSize] = useState("");
  const [zoomOpen, setZoomOpen] = useState(false);

  useEffect(() => { if (images.length > 0) setActiveIdx(0); }, [images]);
  useEffect(() => {
    if (!product) return;
    const first = (product.sizes && product.sizes.length) ? product.sizes[0] : "ONESIZE";
    setSize(first);
  }, [product]);

  // Nice title
  useDocumentTitle(product ? `${product.name} | Solo Wardrobe` : "Solo Wardrobe");

  // Keyboard
  const onKey = useCallback((e) => {
    if (!images.length) return;
    if (e.key === "ArrowRight") setActiveIdx((i) => (i + 1) % images.length);
    else if (e.key === "ArrowLeft") setActiveIdx((i) => (i - 1 + images.length) % images.length);
    else if (e.key === "Escape") setZoomOpen(false);
  }, [images.length]);
  useEffect(() => { window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); }, [onKey]);

  const fmt = (n) => `${currency}${Number(n || 0).toLocaleString("en-IN")}`;
  if (!product) return null;

  const related = useMemo(() => {
    if (!Array.isArray(products)) return [];
    return products.filter((p) => p._id !== product._id && p.category === product.category).slice(0, 8);
  }, [products, product]);

  const priceLabel = fmt(product.price);
  const hasSizes = Array.isArray(product.sizes) && product.sizes.length > 0;

  return (
    <div className="pt-10 border-t pb-20 sm:pb-0">{/* pb for sticky ATC space on mobile */}
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col lg:flex-row gap-10">
          {/* GALLERY */}
          <section className="flex-1" aria-label="Product images">
            {/* Mobile */}
            <div className="block sm:hidden">
              <figure className="relative w-full rounded-md overflow-hidden bg-gray-100 h-80">
                <SafeImg
                  src={activeImage}
                  alt={product.name}
                  loading="eager"
                  className="w-full h-full object-cover cursor-zoom-in"
                  onClick={() => setZoomOpen(true)}
                />
              </figure>
              <div className="mt-3 flex gap-3 overflow-x-auto snap-x">
                {images.map((src, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveIdx(i)}
                    className={`relative w-20 h-20 flex-shrink-0 rounded-md overflow-hidden border snap-start focus:outline-none focus:ring-2 focus:ring-black/40 ${activeIdx === i ? "border-black" : "border-gray-200"}`}
                    aria-label={`Thumbnail ${i + 1}`}
                    aria-current={activeIdx === i ? "true" : "false"}
                  >
                    <SafeImg src={src} alt={`${product.name} – image ${i + 1}`} className="absolute inset-0 w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            {/* Desktop */}
            <div className="hidden sm:flex gap-4">
              <div className="flex sm:flex-col gap-3 overflow-x-auto sm:overflow-y-auto sm:max-h-[520px] pr-1">
                {images.map((src, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveIdx(i)}
                    className={`relative w-20 h-20 flex-shrink-0 rounded-md overflow-hidden border focus:outline-none focus:ring-2 focus:ring-black/40 ${activeIdx === i ? "border-black" : "border-gray-200"}`}
                    aria-label={`Thumbnail ${i + 1}`}
                    aria-current={activeIdx === i ? "true" : "false"}
                  >
                    <SafeImg src={src} alt={`${product.name} – image ${i + 1}`} className="absolute inset-0 w-full h-full object-cover" />
                  </button>
                ))}
              </div>

              <figure className="relative flex-1 rounded-md overflow-hidden bg-gray-100 h-96 md:h-[520px]">
                <SafeImg
                  src={activeImage}
                  alt={product.name}
                  loading="eager"
                  className="absolute inset-0 w-full h-full object-cover cursor-zoom-in"
                  onClick={() => setZoomOpen(true)}
                />
              </figure>
            </div>
          </section>

          {/* DETAILS */}
          <aside className="flex-1 lg:sticky lg:top-24 self-start">
            <h1 className="text-2xl sm:text-3xl font-semibold leading-snug">{product.name}</h1>

            <div className="flex items-center gap-3 mt-3">
              <p className="text-2xl font-bold">{priceLabel}</p>
              {product.mrp > product.price && <p className="text-gray-500 line-through">{fmt(product.mrp)}</p>}
            </div>

            <div className="flex items-center gap-1 mt-3" aria-label="Rating 5 out of 5">
              <img src={assets.star_icon} alt="" className="w-4 h-4" />
              <img src={assets.star_icon} alt="" className="w-4 h-4" />
              <img src={assets.star_icon} alt="" className="w-4 h-4" />
              <img src={assets.star_icon} alt="" className="w-4 h-4" />
              <img src={assets.star_icon} alt="" className="w-4 h-4" />
              <span className="text-sm text-gray-600 ml-2">200</span>
            </div>

            <div className="mt-6">
              <p className="text-sm text-gray-700 mb-2">Select Size</p>
              <div className="flex flex-wrap gap-2">
                {(hasSizes ? product.sizes : ["ONESIZE"]).map((s) => {
                  const selected = size === s;
                  return (
                    <button
                      key={s}
                      onClick={() => setSize(s)}
                      className={`px-3 py-1 rounded border transition focus:outline-none focus:ring-2 ${
                        selected ? "border-black bg-black text-white focus:ring-black/40"
                                : "border-gray-300 bg-white hover:border-black focus:ring-black/20"
                      }`}
                      aria-pressed={selected}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={() => addToCart(product._id, size)}
              className="mt-6 w-full sm:w-auto px-6 py-3 bg-black text-white rounded hover:bg-black/90 focus:outline-none focus:ring-2 focus:ring-black/30"
            >
              ADD TO CART
            </button>

            {product.description ? (
              <div className="mt-6 text-sm text-gray-700 leading-7 whitespace-pre-wrap">
                {product.description}
              </div>
            ) : null}
          </aside>
        </div>

        {related.length > 0 && (
          <section className="mt-16" aria-label="Related products">
            <h2 className="text-xl font-semibold mb-5">Related Products</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
              {related.map((item) => (
                <ProductItem key={item._id} id={item._id} image={item.image} name={item.name} price={item.price} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Sticky ATC (mobile only; hidden on >=sm) */}
      <div className="sm:hidden">
        <StickyATC
          show={true}
          priceLabel={priceLabel}
          hasSizes={hasSizes}
          sizes={hasSizes ? product.sizes : []}
          size={size}
          onSize={setSize}
          onAdd={() => addToCart(product._id, size)}
        />
      </div>

      {/* Zoom modal (unchanged) */}
      {zoomOpen && activeImage && (
        <div
          className="fixed inset-0 z-40 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setZoomOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Zoomed product image"
        >
          <SafeImg
            src={activeImage}
            alt={product.name}
            loading="eager"
            className="max-h-[90vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default Product;
