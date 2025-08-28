import React, { useContext, useRef } from "react";
import { Link } from "react-router-dom";
import { ShopContext } from "../context/ShopContext";
import SafeImg from "./SafeImg";

const ProductItem = ({ id, image, name, price }) => {
  const { currency } = useContext(ShopContext);
  const cover = Array.isArray(image) ? (image[0] || "") : (image || "");
  const preloadedRef = useRef(false);

  const preload = () => {
    if (preloadedRef.current || !cover) return;
    const img = new Image();
    img.src = cover;
    preloadedRef.current = true;
  };

  return (
    <Link
      to={`/product/${id}`}
      className="text-gray-700 group block"
      onMouseEnter={preload}
      onTouchStart={preload}
    >
      <div className="relative w-full overflow-hidden rounded-md bg-gray-100 h-48 sm:h-56 md:h-64">
        <SafeImg
          src={cover}
          alt={name}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>

      <p className="mt-3 text-sm leading-5 h-12 overflow-hidden normal-case tracking-normal">
        {name}
      </p>
      <p className="text-sm font-semibold">
        {currency}{price}
      </p>
    </Link>
  );
};

export default ProductItem;
