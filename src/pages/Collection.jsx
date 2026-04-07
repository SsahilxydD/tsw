import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import Title from "../components/Title";
import ProductItem from "../components/ProductItem";
import SkeletonCard from "../components/SkeletonCard";
import MobileFilters from "../components/MobileFilters";
import SizeChips from "../components/SizeChips";
import Loading from "../components/Loading";
import { isFootwearProduct, isJeansProduct, normalizeJeansSizes, uniqueUKLabels } from "../utils/size";
import { ShopContext } from "../context/ShopContext";
import { assets } from "../assets/assets";
import useDebouncedValue from "../hooks/useDebouncedValue";
import { useLocation } from "react-router-dom";

// NEW: session-seeded scramble (adds only "Featured" ordering)
import { scrambleProducts } from "../utils/scramble";
import { getSessionSeed } from "../utils/rand";
import { sortProducts } from "../utils/sortProducts";

// Module-scope: no component-level dependencies
const normalizeSizesForProduct = (p) => {
  let arr = Array.isArray(p?.sizes) ? p.sizes : [];
  const catRaw = String(p?.categoryRaw || p?.category || '').toLowerCase();
  // Apply UK conversion for footwear only (womenshoes uses raw sizes)
  if (isFootwearProduct(p) && catRaw !== 'womenshoes') return uniqueUKLabels(arr);
  if (isJeansProduct(p)) return normalizeJeansSizes(arr);
  return arr.map((s) => String(s)).filter(Boolean);
};

const Collection = () => {
  const { products, loadingProducts } = useContext(ShopContext);
  const location = useLocation();

  // Local search state (collection-specific)
  const [localSearch, setLocalSearch] = useState("");
  const [showLocalSearch, setShowLocalSearch] = useState(false);
  const debouncedSearch = useDebouncedValue(localSearch, 250);
  const searchInputRef = React.useRef(null);

  // Auto-open search when navigated with ?search=1 (from bottom dock)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("search") === "1") {
      setShowLocalSearch(true);
    }
  }, [location.search]);

  const availableSizes = useMemo(() => {
    const set = new Set();
    if (Array.isArray(products)) {
      for (const p of products) {
        for (const s of normalizeSizesForProduct(p)) set.add(s);
      }
    }
    return Array.from(set);
  }, [products]);
  const hasSizes = availableSizes.length > 0;

  const [sizeFilters, setSizeFilters] = useState([]);
  const [list, setList] = useState(Array.isArray(products) ? products : []);
  const PAGE_SIZE = 12;
  // Restore visibleCount from sessionStorage on mount (for back navigation)
  // Limit to reasonable maximum to prevent performance issues
  const [visibleCount, setVisibleCount] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem(`scroll_${window.location.pathname}_visibleCount`);
      if (saved) {
        const count = parseInt(saved, 10);
        // Limit to max 48 products to prevent performance issues
        if (!isNaN(count) && count >= PAGE_SIZE && count <= 48) {
          return count;
        }
      }
    }
    return PAGE_SIZE;
  });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = React.useRef(null);

  // "" => Featured (scrambled), "price-high-low", "price-low-high"
  const [sortValue, setSortValue] = useState("");

  const toggleSize = (val) =>
    setSizeFilters((prev) => (prev.includes(val) ? prev.filter((s) => s !== val) : [...prev, val]));

  const isInitialMount = React.useRef(true);

  const applyFilterAndOrder = useCallback(() => {
    let copy = Array.isArray(products) ? products.slice() : [];
    // Globally hide jeans with no sizes in data
    copy = copy.filter((p) => !(isJeansProduct(p) && normalizeJeansSizes(p.sizes).length === 0));

    // Local collection search
    if (debouncedSearch) {
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

    // sorting using utility function
    const normalizedSortValue = sortValue === "" ? "featured" : sortValue;
    copy = sortProducts(copy, normalizedSortValue, {
      scrambleFn: scrambleProducts,
      seed: getSessionSeed(),
      blockSize: 1,
      salt: "collection",
    });

    setList(copy);
    // Preserve restored visibleCount on initial mount (back-navigation)
    if (isInitialMount.current) {
      isInitialMount.current = false;
    } else {
      setVisibleCount(PAGE_SIZE);
    }
    setLoadingMore(false);
  }, [products, debouncedSearch, hasSizes, sizeFilters, sortValue]);

  useEffect(() => {
    applyFilterAndOrder();
  }, [applyFilterAndOrder]);
  
  // Persist visibleCount to sessionStorage for back-navigation restore
  useEffect(() => {
    if (typeof window !== 'undefined' && visibleCount > PAGE_SIZE) {
      sessionStorage.setItem(`scroll_${window.location.pathname}_visibleCount`, String(visibleCount));
    }
  }, [visibleCount]);

  // Focus search input when opened
  React.useEffect(() => {
    if (showLocalSearch && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [showLocalSearch]);


  // Auto-load more when the sentinel becomes visible
  useEffect(() => {
    const target = sentinelRef.current;
    if (!target || typeof window === 'undefined' || !('IntersectionObserver' in window)) return;
    const obs = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        if (loadingMore) continue;
        if (visibleCount >= list.length) continue;
        setLoadingMore(true);
        const t = setTimeout(() => {
          setVisibleCount((c) => Math.min(c + PAGE_SIZE, list.length));
          setLoadingMore(false);
        }, 450);
        return () => clearTimeout(t);
      }
    }, { rootMargin: '200px 0px' });
    obs.observe(target);
    return () => { try { obs.disconnect(); } catch {} };
  }, [list.length, visibleCount, loadingMore]);

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
    <div className="pt-10 border-t pb-20 md:pb-0">
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
            {/* Search bar (expandable) */}
            {showLocalSearch ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={localSearch}
                    onChange={(e) => setLocalSearch(e.target.value)}
                    placeholder="Search all products..."
                    className="w-full h-9 pl-9 pr-3 border rounded-lg text-sm bg-gray-50 focus:bg-white focus:border-gray-400 outline-none transition-colors"
                  />
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <button
                  onClick={() => { setShowLocalSearch(false); setLocalSearch(""); }}
                  className="h-9 px-3 text-sm text-gray-500"
                >
                  Cancel
                </button>
              </div>
            ) : (
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
                    onClick={() => setShowLocalSearch(true)}
                    className="px-3 h-9 border rounded text-sm flex items-center justify-center"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </button>
                </div>

                <select
                  aria-label="Sort products"
                  value={sortValue === "" ? "featured" : sortValue}
                  onChange={(e) => setSortValue(e.target.value === "featured" ? "" : e.target.value)}
                  className="h-12 px-3 border-2 border-gray-300 rounded text-sm min-h-[44px] md:min-h-0
                             focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black
                             hover:border-gray-400 transition-colors"
                >
                  <option value="featured">Featured</option>
                  <option value="price-low-high">Price: Low to High</option>
                  <option value="price-high-low">Price: High to Low</option>
                  <option value="newest">Newest</option>
                  <option value="popularity">Popularity</option>
                  <option value="rating">Rating</option>
                </select>
              </div>
            )}
          </div>

          {/* Desktop header */}
          <div className="hidden sm:block mb-4">
            <div className="flex justify-between items-center text-base sm:text-2xl">
              <Title text1={"ALL"} text2={"PRODUCTS"} />
              <div className="flex items-center gap-3">
                {/* Desktop search */}
                <div className="relative">
                  <input
                    type="text"
                    value={localSearch}
                    onChange={(e) => setLocalSearch(e.target.value)}
                    placeholder="Search..."
                    className="w-48 h-9 pl-9 pr-3 border rounded-lg text-sm bg-gray-50 focus:bg-white focus:border-gray-400 focus:w-64 outline-none transition-all"
                  />
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  {localSearch && (
                    <button
                      onClick={() => setLocalSearch("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                <select
                  aria-label="Sort products"
                  value={sortValue === "" ? "featured" : sortValue}
                  onChange={(e) => setSortValue(e.target.value === "featured" ? "" : e.target.value)}
                  className="h-12 px-3 border-2 border-gray-300 rounded text-sm min-h-[44px] md:min-h-0
                             focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black
                             hover:border-gray-400 transition-colors"
                >
                  <option value="featured">Featured</option>
                  <option value="price-low-high">Price: Low to High</option>
                  <option value="price-high-low">Price: High to Low</option>
                  <option value="newest">Newest</option>
                  <option value="popularity">Popularity</option>
                  <option value="rating">Rating</option>
                </select>
              </div>
            </div>
            {/* Active search indicator */}
            {localSearch && (
              <p className="mt-2 text-sm text-gray-500">
                Showing results for "<span className="font-medium text-gray-700">{localSearch}</span>"
              </p>
            )}
          </div>

          {isEmpty && <p className="text-sm text-gray-500 mb-6">No products match your filters.</p>}

          <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4 lg:gap-6">
            {isLoading ? (
              <>
                <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
                <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
              </>
            ) : (
              list.slice(0, visibleCount).map((item, index) => (
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
          {!isLoading && (
            <div className="mt-8 flex justify-center">
              {visibleCount < list.length ? (
                <div ref={sentinelRef} className="h-10 w-full max-w-xs grid place-content-center">
                  {loadingMore && (
                    <Loading size="sm" />
                  )}
                </div>
              ) : (
                <div className="text-xs text-gray-400">End of results</div>
              )}
            </div>
          )}
        </section>

      </div>

      {/* Mobile drawer (always rendered, even if no sizes) */}
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
    </div>
  );
};

export default Collection;
