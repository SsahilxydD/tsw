// src/components/ProductItem.jsx
import React, { useContext, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ShopContext } from "../context/ShopContext";
import SafeImg from "./SafeImg";
import UrgencyBadge from './UrgencyBadge';
import PriceDisplay from './PriceDisplay';
import { getSelectableSizes } from "../utils/size";

const ProductItem = ({ id, image, name, price, i = 0, showAdd = false }) => {
  const { currency, addToCart, products, toggleWishlist, isInWishlist, navigate } = useContext(ShopContext);
  const cover = Array.isArray(image) ? (image[0] || "") : (image || "");
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Memoize the onLoad handler to prevent re-renders
  const handleImageLoad = React.useCallback(() => {
    setImageLoaded(true);
  }, []);

  const productObj = useMemo(() => {
    const pid = String(id);
    return (products || []).find(pr => String(pr._id ?? pr.slug ?? pr.id) === pid);
  }, [products, id]);

  const hasSale = productObj && Number(productObj.mrp) > 0 && Number(productObj.mrp) > Number(productObj.price);
  const discountPct = hasSale ? Math.round((1 - Number(productObj.price) / Number(productObj.mrp)) * 100) : 0;
  const isBestseller = productObj?.bestseller === true;

  const tileSizes = useMemo(() => getSelectableSizes(productObj), [productObj]);

  // Show fewer sizes on mobile (2), more on desktop (3)
  const displaySizes = tileSizes.slice(0, 3);
  const hasMoreSizes = tileSizes.length > 3;

  const handleQuickAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Only add directly when there's exactly one size to choose. With multiple
    // sizes, don't silently pick the first — send the user to choose on the PDP.
    if (tileSizes.length === 1) {
      addToCart(String(id), tileSizes[0]);
    } else {
      navigate(`/product/${id}`);
    }
  };

  return (
    <div className="group">
      <Link 
        to={`/product/${id}`} 
        className="block"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Image Container */}
        <div className="relative aspect-[3/4] overflow-hidden rounded-lg sm:rounded-xl bg-gray-100">
          {/* Skeleton loader */}
          {!imageLoaded && (
            <div className="absolute inset-0 bg-gray-200 animate-pulse" />
          )}

          {/* Product Badges */}
          {(hasSale || isBestseller) && (
            <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
              {hasSale && (
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-rose-600 text-white">
                  SALE -{discountPct}%
                </span>
              )}
              {isBestseller && (
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-400 text-amber-900">
                  Bestseller
                </span>
              )}
            </div>
          )}

          <SafeImg
            src={cover}
            alt={name}
            width={400}
            height={533}
            className={`w-full h-full object-cover transition-transform duration-500 ease-out ${
              isHovered ? 'scale-105' : 'scale-100'
            } ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={handleImageLoad}
          />

          {/* Wishlist Button */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleWishlist(id);
            }}
            className={`absolute top-2 right-2 p-2 rounded-full bg-white/90 backdrop-blur-sm shadow-md hover:bg-white transition-all min-w-[44px] min-h-[44px] flex items-center justify-center ${
              isInWishlist(id) ? 'text-red-500' : 'text-gray-600'
            }`}
            aria-label={isInWishlist(id) ? `Remove ${name} from wishlist` : `Add ${name} to wishlist`}
          >
            <svg className="w-5 h-5" fill={isInWishlist(id) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>

          {/* Urgency Badge */}
          <div className="absolute bottom-2 left-2 z-10">
            <UrgencyBadge productId={id} bestseller={productObj?.bestseller} discounted={productObj?.categoryRaw === 'Discounted' || productObj?.subCategory === 'Discounted'} />
          </div>

          {/* Quick Add Button - only on desktop */}
          {showAdd && tileSizes.length > 0 && (
            <div className={`hidden sm:block absolute bottom-0 left-0 right-0 p-3 transition-all duration-300 ${
              isHovered ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
            }`}>
              <button
                onClick={handleQuickAdd}
                className="w-full py-2 bg-white text-primary text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-primary hover:text-white transition-colors shadow-lg min-h-[44px]"
                aria-label={tileSizes.length === 1 ? `Quick add ${name} to cart` : `Choose size for ${name}`}
              >
                {tileSizes.length === 1 ? 'Quick Add' : 'Select Size'}
              </button>
            </div>
          )}
        </div>

        {/* Product Info - Compact on mobile */}
        <div className="pt-2 sm:pt-3">
          {/* Product Name */}
          <h3 className="text-[11px] sm:text-sm font-medium text-gray-900 leading-tight sm:leading-relaxed line-clamp-2 mb-1 sm:mb-2">
            {name}
          </h3>

          {/* Price */}
          <div className="text-xs sm:text-sm mb-1.5 sm:mb-2">
            <PriceDisplay price={price} mrp={productObj?.mrp} currency={currency} compact />
          </div>
          
          {/* Size Pills - Compact on mobile */}
          {displaySizes.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              {displaySizes.map(sz => (
                <span 
                  key={sz} 
                  className="text-[9px] sm:text-[11px] px-1 sm:px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded font-medium"
                >
                  {String(sz).replace(/^UK-/, '')}
                </span>
              ))}
              {hasMoreSizes && (
                <span className="text-[9px] sm:text-[11px] text-gray-400 font-medium">
                  +{tileSizes.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </Link>
    </div>
  );
};

export default ProductItem;
