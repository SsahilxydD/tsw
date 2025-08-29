import React, { useContext, useEffect, useMemo, useState } from "react";
import Title from "../components/Title";
import ProductItem from "../components/ProductItem";
import SkeletonCard from "../components/SkeletonCard";
import MobileFilters from "../components/MobileFilters";
import SizeChips from "../components/SizeChips";
import { ShopContext } from "../context/ShopContext";
import useDebouncedValue from "../hooks/useDebouncedValue";

/* ---------- robust source grouping & interleave ---------- */
const extractDomain = (v) => {
  if (!v || typeof v !== "string") return null;
  try {
    const u = new URL(v);
    return (u.hostname || "").replace(/^www\./, "");
  } catch {
    const m = v.match(/^(?:https?:\/\/)?([^/]+)/i);
    return m ? m[1].replace(/^www\./, "") : null;
  }
};

const getSourceKey = (p) => {
  // Common fields
  const keys = ["source", "origin", "vendor", "site", "shop", "domain", "host", "store"];
  for (const k of keys) {
    if (p && p[k]) return String(p[k]);
  }
  // Try URL-ish fields
  const urlKeys = ["url", "productUrl", "productURL", "link", "href", "sourceUrl", "sourceURL"];
  for (const k of urlKeys) {
    const host = extractDomain(p?.[k]);
    if (host) return host;
  }
  return null;
};

/** Interleave by detected source in 111,222,333 blocks.
 *  If we can't detect sources (single group), fall back to synthetic chunk interleave.
 */
const interleaveBySource = (items, blockSize = 3) => {
  if (!Array.isArray(items) || items.length === 0) return [];

  // Group by detected key (in first-appearance order)
  const unknown = Symbol("unknown");
  const byKey = new Map();
  items.forEach((it) => {
    const key = getSourceKey(it) ?? unknown;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(it);
  });

  // If only one group (all unknown / same), synthesize ~5 groups and interleave
  if (byKey.size === 1) {
    const total = items.length;
    const groupCount = Math.max(2, Math.min(5, Math.ceil(total / 25) || 2));
    const groups = Array.from({ length: groupCount }, () => []);
    let gi = 0;
    for (let i = 0; i < total; i += blockSize) {
      const chunk = items.slice(i, i + blockSize); // preserve local order
      groups[gi % groupCount].push(...chunk);
      gi++;
    }
    const out = [];
    let remaining = total;
    while (remaining > 0) {
      for (const g of groups) {
        if (!g.length) continue;
        const take = g.splice(0, blockSize);
        out.push(...take);
        remaining -= take.length;
      }
    }
    return out;
  }

  // Normal: multiple real sources
  const groups = Array.from(byKey.values());
  const out = [];
  let remaining = items.length;
  while (remaining > 0) {
    for (const g of groups) {
      if (!g.length) continue;
      const take = g.splice(0, blockSize);
      out.push(...take);
      remaining -= take.length;
    }
  }
  return out;
};
/* -------------------------------------------------------- */

const Collection = () => {
  const { products, search, showSearch, loadingProducts } = useContext(ShopContext);
  const debouncedSearch = useDebouncedValue(search, 250);

  // Sizes available across all products
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

  const [sizeFilters, setSizeFilters] = useState([]);
  const [list, setList] = useState(Array.isArray(products) ? products : []);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Dropdown: "", "price-high-low", "price-low-high"
  const [sortValue, setSortValue] = useState("");

  const toggleSize = (v) => {
    setSizeFilters((prev) => (prev.includes(v) ? prev.filter((s) => s !== v) : [...prev, v]));
  };

  const applyFilterAndOrder = () => {
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

    // Default order: interleaved 111,222,333 preserving within-source order
    copy = interleaveBySource(copy, 3);

    // Optional price sort via dropdown
    if (sortValue === "price-high-low") {
      copy.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
    } else if (sortValue === "price-low-high") {
      copy.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
    }

    setList(copy);
  };

  useEffect(() => {
    applyFilterAndOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, showSearch, debouncedSearch, hasSizes, sizeFilters, sortValue]);

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
                <button className="mt-4 px-3 py-1.5 border rounded text-sm" onClick={() => setSizeFilters([])}>
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
                <button onClick={() => setFiltersOpen(true)} className="px-3 h-9 border rounded text-sm">
                  Filters{selectedCount ? ` (${selectedCount})` : ""}
                </button>
              ) : (
                <div />
              )}

              {/* Price dropdown only */}
              <select
                aria-label="Sort products by price"
                value={sortValue}
                onChange={(e) => setSortValue(e.target.value)}
                className="h-9 px-3 border-2 border-gray-300 rounded text-sm"
              >
                <option value="" disabled>Sort</option>
                <option value="price-high-low">Price: High → Low</option>
                <option value="price-low-high">Price: Low → High</option>
              </select>
            </div>
          </div>

          {/* Desktop header */}
          <div className="hidden sm:flex justify-between items-center text-base sm:text-2xl mb-4">
            <Title text1={"ALL"} text2={"PRODUCTS"} />
            <select
              aria-label="Sort products by price"
              value={sortValue}
              onChange={(e) => setSortValue(e.target.value)}
              className="h-9 px-3 border-2 border-gray-300 rounded text-sm"
            >
              <option value="" disabled>Sort</option>
              <option value="price-high-low">Price: High → Low</option>
              <option value="price-low-high">Price: Low → High</option>
            </select>
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
            applyFilterAndOrder();
            setFiltersOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default Collection;
