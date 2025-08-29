import React, { useContext, useEffect, useMemo, useState } from "react";
import Title from "../components/Title";
import ProductItem from "../components/ProductItem";
import SkeletonCard from "../components/SkeletonCard";
import MobileFilters from "../components/MobileFilters";
import SizeChips from "../components/SizeChips";
import SortSelect from "../components/SortSelect";
import { ShopContext } from "../context/ShopContext";
import useDebouncedValue from "../hooks/useDebouncedValue";

const Collection = () => {
  const { products, search, showSearch, loadingProducts } = useContext(ShopContext);
  const debouncedSearch = useDebouncedValue(search, 250);

  const availableSizes = useMemo(() => {
    const set = new Set();
    if (Array.isArray(products)) {
      for (const p of products) {
        Array.isArray(p.sizes) && p.sizes.forEach((s) => s && set.add(s));
      }
    }
    return Array.from(set);
  }, [products]);

  const hasSizes = availableSizes.length > 0;

  const [sortType, setSortType] = useState("alpha-az");
  const [sizeFilters, setSizeFilters] = useState([]);
  const [list, setList] = useState(Array.isArray(products) ? products : []);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const toggleSize = (value) => {
    setSizeFilters((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value]
    );
  };

  const applyFilter = () => {
    let copy = Array.isArray(products) ? products.slice() : [];

    if (showSearch && debouncedSearch) {
      const q = debouncedSearch.trim().toLowerCase();
      copy = copy.filter((p) => (p.name || "").toLowerCase().includes(q));
    }

    if (hasSizes && sizeFilters.length > 0) {
      copy = copy.filter(
        (item) => Array.isArray(item.sizes) && item.sizes.some((s) => sizeFilters.includes(s))
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
        fpCopy.sort((a, b) => (a.name || "").localeCompare(b.name || "")).reverse();
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
  }, [products, showSearch, debouncedSearch, hasSizes, sizeFilters]);

  useEffect(() => {
    sortList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortType, list.length]);

  const isLoading = Boolean(loadingProducts);
  const isEmpty = !isLoading && list.length === 0;
  const selectedCount = sizeFilters.length;

  return (
    <div className="pt-10 border-t">
      <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row gap-6">
        {/* LEFT: Desktop-only sidebar */}
        {hasSizes && (
          <aside className="min-w-60 hidden sm:block">
            <p className="my-2 text-xl">FILTERS</p>
            <div className="border border-gray-300 p-4 mt-4">
              <p className="mb-3 text-sm font-medium">SIZE</p>
              <SizeChips sizes={availableSizes} selected={sizeFilters} onToggle={toggleSize} columns={3} />
              {selectedCount > 0 && (
                <button
                  className="mt-4 px-3 py-1.5 border rounded text-sm"
                  onClick={() => setSizeFilters([])}
                >
                  Clear ({selectedCount})
                </button>
              )}
            </div>
          </aside>
        )}

        {/* RIGHT */}
        <section className="flex-1">
          {/* Mobile sticky toolbar */}
          <div className="sm:hidden sticky top-16 z-10 bg-white/95 backdrop-blur border-b -mx-4 px-4 py-2 mb-4">
            <div className="flex items-center justify-between">
              {hasSizes ? (
                <button
                  onClick={() => setFiltersOpen(true)}
                  className="px-3 h-9 border rounded text-sm"
                >
                  Filters{selectedCount ? ` (${selectedCount})` : ""}
                </button>
              ) : (
                <div />
              )}
              <SortSelect value={sortType} onChange={setSortType} className="w-40" />
            </div>
          </div>

          {/* Desktop header */}
          <div className="hidden sm:flex justify-between items-center text-base sm:text-2xl mb-4">
            <Title text1={"ALL"} text2={"PRODUCTS"} />
            <SortSelect value={sortType} onChange={setSortType} className="w-48" />
          </div>

          {isEmpty && <p className="text-sm text-gray-500 mb-6">No products match your filters.</p>}

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {isLoading ? (
              <>
                <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
                <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
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
        </section>
      </div>

      {/* Mobile drawer */}
      {hasSizes && (
        <MobileFilters
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          sizes={availableSizes}
          selected={sizeFilters}
          onToggle={toggleSize}
          onClear={() => setSizeFilters([])}
          onApply={() => {
            applyFilter();
            setFiltersOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default Collection;
