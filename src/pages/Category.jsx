import React, { useContext, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import Title from "../components/Title";
import ProductItem from "../components/ProductItem";
import SkeletonCard from "../components/SkeletonCard";
import MobileFilters from "../components/MobileFilters";
import SizeChips from "../components/SizeChips";
import { isFootwearProduct, uniqueUKLabels } from "../utils/size";
import { ShopContext } from "../context/ShopContext";
import { assets } from "../assets/assets";
import useDebouncedValue from "../hooks/useDebouncedValue";

// NEW: session-seeded scramble (adds only “Featured” ordering)
import { scrambleProducts } from "../utils/scramble";
import { getSessionSeed } from "../utils/rand";

const toDisplay = (s) =>
  (s ?? "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());

const Category = () => {
  const { cat } = useParams();
  const catKey = decodeURIComponent(cat || "");
  const catKeyLower = catKey.toLowerCase();

  const { products, search, showSearch, setShowSearch, loadingProducts } = useContext(ShopContext);
  const debouncedSearch = useDebouncedValue(search, 250);

  // base list for this category (unchanged logic)
  const baseProducts = useMemo(() => {
    if (!Array.isArray(products)) return [];
    return products.filter(
      (p) =>
        (p.categoryRaw && String(p.categoryRaw).toLowerCase() === catKeyLower) ||
        (!p.categoryRaw && String(p.category).toLowerCase() === catKeyLower)
    );
  }, [products, catKeyLower]);

  // sizes present in this category
  const normalizeSizesForProduct = (p) => {
    let arr = Array.isArray(p?.sizes) ? p.sizes : [];
    if (isFootwearProduct(p)) return uniqueUKLabels(arr);
    return arr.map((s) => String(s)).filter(Boolean);
  };

  const availableSizes = useMemo(() => {
    const set = new Set();
    for (const p of baseProducts) {
      for (const s of normalizeSizesForProduct(p)) set.add(s);
    }
    return Array.from(set);
  }, [baseProducts]);
  const hasSizes = availableSizes.length > 0;

  const [sizeFilters, setSizeFilters] = useState([]);
  const [list, setList] = useState(baseProducts);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // "" => Featured (scrambled), "price-high-low", "price-low-high"
  const [sortValue, setSortValue] = useState("");

  const toggleSize = (val) =>
    setSizeFilters((prev) => (prev.includes(val) ? prev.filter((s) => s !== val) : [...prev, val]));

  const applyFilterAndOrder = () => {
    let copy = baseProducts.slice();

    // search (only when global search UI is visible)
    if (showSearch && debouncedSearch) {
      const q = debouncedSearch.trim().toLowerCase();
      copy = copy.filter((p) => (p.name || "").toLowerCase().includes(q));
    }

    // size filter
    if (hasSizes && sizeFilters.length > 0) {
      copy = copy.filter((item) => {
        const normSet = new Set(normalizeSizesForProduct(item).map(String));
        return sizeFilters.every((s) => normSet.has(String(s)));
      });
    }

    // sorting / featured (scramble by session, salted per category page)
    if (sortValue === "price-high-low") {
      copy.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
    } else if (sortValue === "price-low-high") {
      copy.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
    } else {
      const seed = getSessionSeed();
      copy = scrambleProducts(copy, {
        seed,
        blockSize: 1,
        salt: `category:${catKeyLower}`,
      });
    }

    setList(copy);
  };

  useEffect(() => {
    applyFilterAndOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseProducts, hasSizes, sizeFilters, showSearch, debouncedSearch, sortValue, catKeyLower]);

  const isLoading = Boolean(loadingProducts);
  const isEmpty = !isLoading && list.length === 0;
  const selectedCount = sizeFilters.length;

  // compute sticky offset equal to header height (prevents overlap on top)
  const [stickyTop, setStickyTop] = useState(64);
  useEffect(() => {
    const update = () => {
      try {
        const header = document.querySelector('header');
        const h = header ? header.offsetHeight : 64;
        setStickyTop(h);
      } catch {}
    };
    update();
    window.addEventListener('resize', update);
    const header = document.querySelector('header');
    let obs;
    if (header && 'MutationObserver' in window) {
      obs = new MutationObserver(update);
      obs.observe(header, { childList: true, subtree: true, attributes: true });
    }
    return () => { window.removeEventListener('resize', update); try { obs && obs.disconnect(); } catch {} };
  }, []);

  return (
    <div className="pt-10 border-t">
      <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row gap-6">
        {/* LEFT: Desktop filters */}
        {hasSizes && (
          <aside className="min-w-60 hidden sm:block">
            <p className="my-2 text-xl">FILTERS</p>
            <div className="border border-gray-300 p-4 mt-4">
              <p className="mb-3 text-sm font-medium">SIZE</p>
              <SizeChips sizes={availableSizes} selected={sizeFilters} onToggle={toggleSize} columns={3} />
              {selectedCount > 0 && (
                <button className="mt-4 px-3 py-1.5 border rounded text-sm" onClick={() => setSizeFilters([])}>
                  Clear ({selectedCount})
                </button>
              )}
            </div>
          </aside>
        )}

        {/* RIGHT */}
        <section className="flex-1">
          {/* Mobile toolbar */}
          <div className="sm:hidden sticky z-10 bg-white/95 backdrop-blur border-b -mx-4 px-4 py-2 mb-4" style={{ top: stickyTop }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {hasSizes && (
                  <button onClick={() => setFiltersOpen(true)} className="px-3 h-9 border rounded text-sm">
                    Filters{selectedCount ? ` (${selectedCount})` : ""}
                  </button>
                )}
                <button
                  type="button"
                  aria-label="Search products"
                  onClick={() => setShowSearch((v) => !v)}
                  className="px-3 h-9 border rounded text-sm flex items-center justify-center"
                >
                  {assets.search_icon ? (
                    <img src={assets.search_icon} alt="" className="w-4 h-4" />
                  ) : (
                    <span>Search</span>
                  )}
                </button>
              </div>
              <select
                aria-label="Sort products"
                value={sortValue}
                onChange={(e) => setSortValue(e.target.value)}
                className="h-9 px-3 border-2 border-gray-300 rounded text-sm"
              >
                <option value="">Featured</option>
                <option value="price-high-low">Price: High → Low</option>
                <option value="price-low-high">Price: Low → High</option>
              </select>
            </div>
          </div>

          {/* Desktop header */}
          <div className="hidden sm:flex justify-between items-center text-base sm:text-2xl mb-4">
            <Title text1={"CATEGORY"} text2={toDisplay(catKey)} />
            <select
              aria-label="Sort products"
              value={sortValue}
              onChange={(e) => setSortValue(e.target.value)}
              className="h-9 px-3 border-2 border-gray-300 rounded text-sm"
            >
              <option value="">Featured</option>
              <option value="price-high-low">Price: High → Low</option>
              <option value="price-low-high">Price: Low → High</option>
            </select>
          </div>

          {isEmpty && <p className="text-sm text-gray-500 mb-6">No products match your filters.</p>}

          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {isLoading ? (
              <>
                <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
                <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
              </>
            ) : (
              list.map((item, index) => (
                <ProductItem
                  key={item._id || item.id || item.slug || index}
                  id={item._id ?? item.id ?? item.slug}
                  image={item.image}
                  name={item.name}
                  price={item.price}
                  i={index}
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
            applyFilterAndOrder();
            setFiltersOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default Category;
