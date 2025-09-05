import React from "react";
import { Link } from "react-router-dom";
// Image-free, elegant category tiles matching site aesthetics

const CategoryCard = ({ name, count, image, i }) => {
  const href = `/category/${encodeURIComponent(name)}`;
  // Prettify raw category names like "womensperfume" -> "Womens Perfume"
  const formatCategory = (raw = "") => {
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
    s = s.replace(/\b(women['’]s|mens|men's|ladies)\s+watch\b/g, "$1 watches");

    // Split concatenations like womensperfume -> womens perfume
    s = s.replace(/womens?perfume/g, "womens perfume");
    s = s.replace(/mens?perfume/g, "mens perfume");

    // T-Shirt variants
    s = s.replace(/\bt\s?-?\s?shirts?\b/g, "t shirts");
    s = s.replace(/\bt\s?-?\s?shirt\b/g, "t shirt");

    // Prefer possessive forms
    s = s.replace(/\bwomens\b/g, "women's");
    s = s.replace(/\bmens\b/g, "men's");

    // Title-case words but keep possessive 's lowercase (women's -> Women's)
    return s.replace(/\b([a-z])(\w*)/g, (full, a, b, idx, str) => {
      const prev = idx > 0 ? str[idx - 1] : '';
      if (prev === "'") return a + b; // don't capitalize standalone s in 's
      return a.toUpperCase() + b;
    });
  };
  const display = formatCategory(name);

  // Force two-line layout: first word on line 1, remainder on line 2.
  const words = display.split(/\s+/).filter(Boolean);
  const firstWord = words[0] || display;
  const restWords = words.slice(1).join(" ");
  const titleBoxStyle = { lineHeight: 1.2, height: '2.6em', overflow: 'hidden' }; // fixed height keeps divider/count aligned

  return (
    <Link
      to={href}
      aria-label={`${display} (${count} items)`}
      className={`group block cv-auto overflow-hidden border bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-black/30 hover:shadow-md transition-shadow hover-lift reveal-item ${i!=null ? 'in' : ''}`}
      style={{ transitionDelay: `${((i ?? 0) % 10) * 70}ms`, WebkitTapHighlightColor: "transparent" }}
    >
      {/* fixed aspect for zero CLS; smaller height and no backdrop */}
      <div className="relative aspect-[5/4] overflow-hidden bg-white">
        {/* centered label only */}
        <div className="absolute inset-0 grid place-content-center text-center px-4">
          <h3 className="prata-regular text-base sm:text-lg text-gray-800" style={titleBoxStyle}>
            <span className="block">{firstWord}</span>
            {restWords && <span className="block">{restWords}</span>}
          </h3>
          <div className="mt-2 h-px w-8 bg-gray-300 mx-auto" />
          <p className="mt-2 text-xs text-gray-500">{count} items</p>
        </div>
      </div>
    </Link>
  );
};

export default CategoryCard;

