// src/pages/Category.jsx
import React, { useContext, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import Title from "../components/Title";
import ProductItem from "../components/ProductItem";
import SkeletonCard from "../components/SkeletonCard"; // <-- addon
import { ShopContext } from "../context/ShopContext";

const toDisplay = (s) =>
  (s ?? "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());

const Category = () => {
  const { cat } = useParams();
  const catKey = decodeURIComponent(cat || "");
  const { products } = useContext(ShopContext);

  // products for this category (raw scraped key preferred)
  const baseProducts = useMemo(() => {
    if (!Array.isArray(products)) return [];
    return products.filter(
      (p) =>
        (p.categoryRaw && p.categoryRaw === catKey) ||
        (!p.categoryRaw && p.category === catKey)
    );
  }, [products, catKey]);

  // sizes available in this category
  const availableSizes = useMemo(() => {
    const set = new Set();
    for (const p of baseProducts)
      Array.isArray(p.sizes) && p.sizes.forEach((s) => s && set.add(s));
    return Array.from(set);
  }, [baseProducts]);

  const hasSizes = availableSizes.length > 0;

  const [sizeFilters, setSizeFilters] = useState([]);
  const [list, setList] = useState(baseProducts);
  const [sortType, setSortType] = useState("alpha-az");

  const toggleSize = (e) => {
    const v = e.target.value;
    setSizeFilters((prev) =>
      prev.includes(v) ? prev.filter((s) => s !== v) : [...prev, v]
    );
  };

  const applyFilter = () => {
    let copy = baseProducts.slice();
    if (hasSizes && sizeFilters.length > 0) {
      copy = copy.filter(
        (item) =>
          Array.isArray(item.sizes) &&
          item.sizes.some((s) => sizeFilters.includes(s))
      );
    }
    setList(copy);
  };

  const sortList = () => {
    let fpCopy = list.slice();
    switch (sortType) {
      case "price-low-high":
        fpCopy.sort((a, b) => a.price - b.price);
        break;
      case "price-high-low":
        fpCopy.sort((a, b) => b.price - a.price);
        break;
      case "alpha-za":
        fpCopy
          .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
          .reverse();
        break;
      case "alpha-az":
      default:
        fpCopy.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        break;
    }
    setList(fpCopy);
  };

  useEffect(() => {
    applyFilter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseProducts, hasSizes, sizeFilters]);

  useEffect(() => {
    sortList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortType, list.length]);

  return (
    <div className="pt-10 border-t">
      <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row gap-6">
        {/* LEFT: Filter column (sizes only) */}
        {hasSizes && (
          <div className="min-w-60">
            <p className="my-2 text-xl">FILTERS</p>
            <div className="border border-gray-300 pl-5 py-3 mt-4">
              <p className="mb-3 text-sm font-medium">SIZE</p>
              <div className="flex flex-col gap-2 text-sm font-light text-gray-700">
                {availableSizes.map((s) => (
                  <label key={s} className="flex items-center gap-2">
                    <input
                      className="w-3"
                      value={s}
                      onChange={toggleSize}
                      type="checkbox"
                    />
                    {s}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* RIGHT: Header row and grid */}
        <div className="flex-1">
          <div className="flex justify-between items-center text-base sm:text-2xl mb-4">
            <Title text1={"CATEGORY"} text2={toDisplay(catKey)} />
            <select
              onChange={(e) => setSortType(e.target.value)}
              className="border-2 border-gray-300 text-sm px-2 h-9"
              defaultValue="alpha-az"
            >
              <option value="alpha-az">Alphabetical: A → Z</option>
              <option value="alpha-za">Alphabetical: Z → A</option>
              <option value="price-high-low">Price: High → Low</option>
              <option value="price-low-high">Price: Low → High</option>
            </select>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {/* addon: skeletons when list empty */}
            {list.length === 0 ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : (
              list.map((item, index) => (
                <ProductItem
                  key={item._id || index}
                  id={item._id}
                  image={item.image}
                  name={item.name}
                  price={item.price}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Category;
