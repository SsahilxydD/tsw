import React from "react";
import { Link } from "react-router-dom";
import SafeImg from "./SafeImg";

// Prettify raw category names like "womensperfume" -> "Womens Perfume"
function formatCategory(raw = "") {
  let s = String(raw)
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  // Common merges -> spaced words
  s = s.replace(/flip\s?flops?/g, "flip flops");
  s = s.replace(/(formal|casual|sports|ethnic)(\s?)(footwear)/g, "$1 footwear");
  s = s.replace(/\btopwear\b/g, "top wear");
  s = s.replace(/\bbottomwear\b/g, "bottom wear");
  s = s.replace(/\bformalfootwear\b/g, "formal footwear");
  s = s.replace(/\bcasualfootwear\b/g, "casual footwear");
  // Ladies watches normalization
  s = s.replace(/\bladieswatch(?:es)?\b/g, "ladies watches");
  s = s.replace(/\bladies\s+watch\b/g, "ladies watches");
  // Also promote plural when singular watch appears after gendered term
  s = s.replace(/\b(women['']s|mens|men's|ladies)\s+watch\b/g, "$1 watches");

  // Women's shoes - specific handling (before possessive form replacement)
  s = s.replace(/womenshoes?/g, "women's shoes");

  // Split concatenations like womensperfume -> womens perfume
  s = s.replace(/womens?perfume/g, "womens perfume");
  s = s.replace(/mens?perfume/g, "mens perfume");

  // T-Shirt variants
  s = s.replace(/\bt\s?-?\s?shirts?\b/g, "t shirts");
  s = s.replace(/\bt\s?-?\s?shirt\b/g, "t shirt");

  // Prefer possessive forms (after specific replacements)
  s = s.replace(/\bwomens\b/g, "women's");
  s = s.replace(/\bmens\b/g, "men's");

  // Title-case words but keep possessive 's lowercase (women's -> Women's)
  return s.replace(/\b([a-z])(\w*)/g, (full, a, b, idx, str) => {
    const prev = idx > 0 ? str[idx - 1] : '';
    if (prev === "'") return a + b; // don't capitalize standalone s in 's
    return a.toUpperCase() + b;
  });
}

const CategoryCard = ({ name, count, image, i }) => {
  const href = `/category/${encodeURIComponent(name)}`;

  // SALE!!! handling for discounted category
  const isDiscounted = String(name).toLowerCase() === "discounted";
  const display = isDiscounted ? "SALE!!!" : formatCategory(name);

  const hasImage = Boolean(image);

  // Two-line clamp with safe word wrapping
  const titleClampStyle = {
    lineHeight: 1.3,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    wordBreak: 'keep-all',
    overflowWrap: 'normal',
  };

  return (
    <Link
      to={href}
      aria-label={`${display} (${count} items)`}
      className="group block cv-auto overflow-hidden border bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-black/30 hover:shadow-md transition-shadow"
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-neutral-100">
        {hasImage ? (
          <>
            {/* Product image background with hover scale */}
            <SafeImg
              src={image}
              alt={display}
              width={400}
              height={320}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            />

            {/* Gradient overlay -- dark at bottom for text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

            {/* Text overlay pinned to bottom */}
            <div className="absolute inset-x-0 bottom-0 px-3 pb-3 pt-6 text-center">
              <h3
                className={`prata-regular text-sm sm:text-base drop-shadow-sm ${isDiscounted ? 'text-red-300' : 'text-white'}`}
                style={titleClampStyle}
              >
                {display}
              </h3>
              <div className="mt-1.5 h-px w-8 bg-white/50 mx-auto" />
              <p className="mt-1.5 text-[10px] sm:text-xs text-white/80">{count} items</p>
            </div>
          </>
        ) : (
          /* Fallback: text-only card when no image is available */
          <div className="absolute inset-0 grid place-content-center text-center px-2 bg-white">
            <h3
              className={`prata-regular text-sm sm:text-base px-1 ${isDiscounted ? 'text-red-600' : 'text-gray-800'}`}
              style={titleClampStyle}
            >
              {display}
            </h3>
            <div className="mt-2 h-px w-8 bg-gray-300 mx-auto" />
            <p className="mt-2 text-[10px] sm:text-xs text-gray-500">{count} items</p>
          </div>
        )}
      </div>
    </Link>
  );
};

export default CategoryCard;
