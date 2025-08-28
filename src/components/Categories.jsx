import React, { useContext, useMemo } from "react";
import { Link } from "react-router-dom";
import Title from "./Title";
import { ShopContext } from "../context/ShopContext";
import SafeImg from "./SafeImg";

const toDisplay = (s) =>
  (s ?? "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());

const Categories = () => {
  const { products } = useContext(ShopContext);

  const categories = useMemo(() => {
    const map = new Map();
    if (Array.isArray(products)) {
      for (const p of products) {
        const key = (p.categoryRaw || p.category || "uncategorized").toString().trim();
        if (!key) continue;
        const cover =
          (Array.isArray(p.image) ? p.image[0] : p.image) ||
          (Array.isArray(p.images) ? p.images[0] : "") ||
          "";
        if (!map.has(key)) {
          map.set(key, { key, display: toDisplay(key), cover, count: 1 });
        } else {
          map.get(key).count += 1;
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => a.display.localeCompare(b.display));
  }, [products]);

  return (
    <div className="my-10">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center py-8 text-3xl">
          <Title text1={"SHOP BY"} text2={"CATEGORY"} />
          <p className="w-3/4 m-auto text-xs sm:text-sm md:text-base text-gray-600"></p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {categories.map((cat) => (
            <Link key={cat.key} to={`/category/${encodeURIComponent(cat.key)}`} className="text-gray-700 group block">
              <div className="relative w-full overflow-hidden rounded-md bg-gray-100 h-40 sm:h-44 md:h-48">
                <SafeImg
                  src={cat.cover}
                  alt={cat.display}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <p className="mt-3 text-sm leading-5">{cat.display}</p>
              <p className="text-sm font-medium">{cat.count} items</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Categories;
