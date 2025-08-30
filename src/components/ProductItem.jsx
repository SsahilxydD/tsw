// src/components/ProductItem.jsx
import React, { useContext, useRef } from "react";
import { Link } from "react-router-dom";
import { ShopContext } from "../context/ShopContext";
import SafeImg from "./SafeImg";

// variant: "default" | "recommendation"
const ProductItem = ({ id, image, name, price, variant = "default" }) => {
  const { currency } = useContext(ShopContext);
  const cover = Array.isArray(image) ? (image[0] || "") : (image || "");
  const preloadedRef = useRef(false);

  const preload = () => {
    if (preloadedRef.current || !cover) return;
    const img = new Image();
    img.src = cover;
    preloadedRef.current = true;
  };

  const imgHeights = variant === "recommendation"
    ? "h-40 sm:h-44 md:h-52"
    : "h-48 sm:h-56 md:h-64";

  const nameStyle = variant === "recommendation"
    ? {
        display: "-webkit-box",
        WebkitLineClamp: 1,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
        lineHeight: "1.25rem",
        height: "1.25rem",
      }
    : {
        display: "-webkit-box",
        WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
        lineHeight: "1.25rem",
        height: "calc(2 * 1.25rem + 4px)",
        paddingBottom: "2px",
      };

  return (
    <Link
      to={`/product/${id}`}
      title={name}
      aria-label={name}
      onMouseEnter={preload}
      onTouchStart={preload}
      style={{ WebkitTapHighlightColor: "transparent" }}
      className="text-gray-700 group block rounded-md focus:outline-none focus-visible:ring-2
                 focus-visible:ring-black/30 transition-transform active:scale-[0.98]"
    >
      <div className={`relative w-full overflow-hidden rounded-md bg-gray-100 ${imgHeights} select-none`}>
        <SafeImg
          src={cover}
          alt={name}
          sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
          width={1200}
          height={1200}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-300
                     group-hover:scale-105 motion-reduce:transform-none"
        />
      </div>

      {/* Name clamp */}
      <p className="mt-3 text-sm leading-5 overflow-hidden normal-case tracking-normal" style={nameStyle}>
        {name}
      </p>

      <p className="text-sm font-semibold">
        {currency}{price}
      </p>
    </Link>
  );
};

export default ProductItem;
