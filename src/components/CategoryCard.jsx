import React from "react";
import { Link } from "react-router-dom";
import SafeImg from "./SafeImg";

const CategoryCard = ({ name, count, image, i }) => {
  const href = `/category/${encodeURIComponent(name)}`;
  const display = (name || "").replace(/[_-]+/g, " ").replace(/\b\w/g, m => m.toUpperCase());

  return (
    <Link
      to={href}
      aria-label={`${display} (${count} items)`}
      className={`group block cv-auto rounded-lg overflow-hidden border bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-black/30 hover:shadow-md transition-shadow hover-lift reveal-item ${i!=null ? 'in' : ''}`}
      style={{ transitionDelay: `${((i ?? 0) % 10) * 70}ms`, WebkitTapHighlightColor: "transparent" }}
    >
      {/* fixed aspect for zero CLS */}
      <div className="relative aspect-[4/5] bg-gray-100 overflow-hidden">
        <SafeImg
          src={image}
          alt={display}
          width={1200}
          height={1500}
          sizes="(min-width:1024px) 20vw, (min-width:768px) 25vw, 50vw"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 via-black/20 to-transparent p-3">
          <p className="text-white text-sm font-medium truncate">{display}</p>
          <p className="text-white/80 text-xs">{count} items</p>
        </div>
      </div>
    </Link>
  );
};

export default CategoryCard;

