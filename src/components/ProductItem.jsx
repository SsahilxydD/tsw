// src/components/ProductItem.jsx
import React, { useContext, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ShopContext } from "../context/ShopContext";
import SafeImg from "./SafeImg";
import { isFootwearProduct, isJeansProduct, normalizeJeansSizes, uniqueUKLabels } from "../utils/size";

const ProductItem = ({ id, image, name, price, i = 0, showAdd = false }) => {
  const { currency, addToCart, products } = useContext(ShopContext);
  const cover = Array.isArray(image) ? (image[0] || "") : (image || "");
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const productObj = useMemo(() => {
    const pid = String(id);
    return (products || []).find(pr => String(pr._id ?? pr.slug ?? pr.id) === pid);
  }, [products, id]);

  const tileSizes = useMemo(() => {
    let arr = Array.isArray(productObj?.sizes) ? productObj.sizes : [];
    const catRaw = String(productObj?.categoryRaw || productObj?.category || '').toLowerCase();
    if (isFootwearProduct(productObj) && catRaw !== 'womenshoes') arr = uniqueUKLabels(arr);
    else if (isJeansProduct(productObj)) arr = normalizeJeansSizes(arr);
    else arr = arr.map((s) => String(s)).filter(Boolean);
    const bad = /^(one\s?size|onesize|os|std)$/i;
    const seen = new Set();
    const out = [];
    for (const s of arr) {
      if (bad.test(s)) continue;
      const key = s.toUpperCase();
      if (!seen.has(key)) { seen.add(key); out.push(s); }
    }
    return out;
  }, [productObj]);

  const displaySizes = tileSizes.slice(0, 4);
  const hasMoreSizes = tileSizes.length > 4;

  const handleQuickAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(String(id), tileSizes[0] || 'std');
  };

  return (
    <Link 
      to={`/product/${id}`} 
      className="group block"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image Container */}
      <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-gray-100 mb-3">
        {/* Skeleton loader */}
        {!imageLoaded && (
          <div className="absolute inset-0 bg-gray-200 animate-pulse" />
        )}
        
        <SafeImg
          src={cover}
          alt={name}
          width={400}
          height={533}
          className={`w-full h-full object-cover transition-all duration-500 ${
            isHovered ? 'scale-105' : 'scale-100'
          } ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setImageLoaded(true)}
        />

        {/* Hover overlay */}
        <div className={`absolute inset-0 bg-black/10 transition-opacity duration-300 ${
          isHovered ? 'opacity-100' : 'opacity-0'
        }`} />

        {/* Quick Add Button */}
        {showAdd && tileSizes.length > 0 && (
          <div className={`absolute bottom-0 left-0 right-0 p-3 transition-all duration-300 ${
            isHovered ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
          }`}>
            <button
              onClick={handleQuickAdd}
              className="w-full py-2.5 bg-white/95 backdrop-blur-sm text-black text-xs font-semibold uppercase tracking-wider rounded-md hover:bg-black hover:text-white transition-colors shadow-lg"
            >
              Quick Add
            </button>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="space-y-2">
        {/* Product Name */}
        <h3 className="text-sm font-medium text-gray-900 leading-snug line-clamp-2 group-hover:text-gray-600 transition-colors min-h-[2.5rem]">
          {name}
        </h3>

        {/* Price & Sizes Row */}
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-bold text-gray-900">
            {currency}{Number(price).toLocaleString('en-IN')}
          </p>
          
          {/* Size Pills */}
          {displaySizes.length > 0 && (
            <div className="flex items-center gap-1 overflow-hidden">
              {displaySizes.map(sz => (
                <span 
                  key={sz} 
                  className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded font-medium whitespace-nowrap"
                >
                  {String(sz).replace(/^UK-/, '')}
                </span>
              ))}
              {hasMoreSizes && (
                <span className="text-[10px] text-gray-400 font-medium">
                  +{tileSizes.length - 4}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};

export default ProductItem;
