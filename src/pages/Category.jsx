import React, { useContext, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import Title from "../components/Title";
import ProductItem from "../components/ProductItem";
import MobileFilters from "../components/MobileFilters";
import SizeChips from "../components/SizeChips";
import { isFootwearProduct, isJeansProduct, normalizeJeansSizes, uniqueUKLabels, toUKLabel } from "../utils/size";
import { ShopContext } from "../context/ShopContext";
import { assets } from "../assets/assets";
import useDebouncedValue from "../hooks/useDebouncedValue";
import SEO from "../components/SEO";

// NEW: session-seeded scramble (adds only â€œFeaturedâ€ ordering)
import { scrambleProducts } from "../utils/scramble";
import { getSessionSeed } from "../utils/rand";

const toDisplay = (s) => {
  let t = String(s ?? "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  // Normalize common merged category names
  t = t.replace(/flip\s?flops?/g, "flip flops");
  t = t.replace(/(formal|casual|sports|ethnic)(\s?)(footwear)/g, "$1 footwear");
  t = t.replace(/\btopwear\b/g, "top wear");
  t = t.replace(/\bbottomwear\b/g, "bottom wear");
  t = t.replace(/\bformalfootwear\b/g, "formal footwear");
  t = t.replace(/\bcasualfootwear\b/g, "casual footwear");
  // Ladies watches normalization
  t = t.replace(/\bladieswatch(?:es)?\b/g, "ladies watches");
  t = t.replace(/\bladies\s+watch\b/g, "ladies watches");
  t = t.replace(/\b(women['â€™]s|mens|men's|ladies)\s+watch\b/g, "$1 watches");
  t = t.replace(/\bwomens?perfume\b/g, "women's perfume");
  t = t.replace(/\bmens?perfume\b/g, "men's perfume");
  t = t.replace(/\bt\s?-?\s?shirts?\b/g, "t shirts");
  t = t.replace(/\bt\s?-?\s?shirt\b/g, "t shirt");

  return t.replace(/\b([a-z])(\w*)/g, (full, a, b, idx, str) => {
    const prev = idx > 0 ? str[idx - 1] : '';
    if (prev === "'") return a + b; // keep the s in 's lowercase
    return a.toUpperCase() + b;
  });
};

const Category = () => {
  const { cat } = useParams();
  const catKey = decodeURIComponent(cat || "");
  const catKeyLower = catKey.toLowerCase();

  const { products, search, showSearch, setShowSearch, loadingProducts } = useContext(ShopContext);
  const debouncedSearch = useDebouncedValue(search, 250);

  // base list for this category (enforce sizes for jeans & discounted)
  const baseProducts = useMemo(() => {
    if (!Array.isArray(products)) return [];
    const discounted = catKeyLower === 'discounted' || catKeyLower === 'sale';

    let list = products.filter(
      (p) =>
        (p.categoryRaw && String(p.categoryRaw).toLowerCase() === catKeyLower) ||
        (!p.categoryRaw && String(p.category).toLowerCase() === catKeyLower)
    );

    // Jeans category: require normalized jeans sizes
    if (/\bjeans\b/.test(catKeyLower)) {
      list = list.filter((p) => normalizeJeansSizes(p.sizes).length > 0);
    }

    // Discounted category: only show items that actually have valid sizes
    if (discounted) {
      // Discounted rules:
      // - Keep Topwear items that have valid apparel sizes (XS..XXL)
      // - Keep Footwear items ONLY if sourced from thesolowardrobes.cartpe.in and with valid UK sizes
      list = list.filter((p) => {
        const sub = String(p?.subCategory || '').toLowerCase();
        const sizes = Array.isArray(p?.sizes) ? p.sizes : [];
        if (sub === 'topwear') {
          const allowed = new Set(['XS','S','M','L','XL','XXL']);
          return sizes.some((s) => allowed.has(String(s).toUpperCase().trim()));
        }
        if (sub === 'footwear') {
          const src = String(p?.detail_url_src || '').toLowerCase();
          const fromSoloWardrobes = /\bthesolowardrobes\.cartpe\.in\b/.test(src);
          return fromSoloWardrobes && uniqueUKLabels(sizes).length > 0;
        }
        // Drop non-Topwear/Footwear from Discounted
        return false;
      });
    }

    return list;
  }, [products, catKeyLower]);

  // sizes present in this category
  const normalizeSizesForProduct = (p) => {
    let arr = Array.isArray(p?.sizes) ? p.sizes : [];
    const catRaw = String(p?.categoryRaw || p?.category || '').toLowerCase();
    // Apply UK size conversion for footwear products only (womenshoes uses raw sizes)
    if (isFootwearProduct(p) && catRaw !== 'womenshoes') return uniqueUKLabels(arr);
    if (isJeansProduct(p)) return normalizeJeansSizes(arr);
    return arr.map((s) => String(s)).filter(Boolean);
  };

  // Discounted handling
  const isDiscounted = catKeyLower === 'discounted' || catKeyLower === 'sale';
  const [subFilter, setSubFilter] = useState(() => (isDiscounted ? '' : ''));

  // Scope the size source: for Discounted, respect selected sub-category
  const sizeSource = useMemo(() => {
    if (!isDiscounted) return baseProducts;
    if (!subFilter) return [];
    const key = subFilter.toLowerCase();
    return baseProducts.filter((p) => String(p?.subCategory || '').toLowerCase() === key);
  }, [isDiscounted, baseProducts, subFilter]);

  const availableSizes = useMemo(() => {
    const set = new Set();
    const selectedIsFootwear = isDiscounted && subFilter.toLowerCase() === 'footwear';
    const selectedIsTopwear = isDiscounted && subFilter.toLowerCase() === 'topwear';

    if (selectedIsFootwear) {
      // Only UK shoe sizes across all items; clamp to UK 5..12 and sort ascending
      for (const p of sizeSource) {
        const arr = Array.isArray(p?.sizes) ? p.sizes : [];
        for (const raw of arr) {
          const uk = toUKLabel(raw);
          if (!uk) continue;
          const n = parseFloat(String(uk).replace(/[^0-9.]/g, ''));
          if (!Number.isFinite(n) || n < 5 || n > 12) continue;
          set.add(`UK-${n % 1 === 0 ? n.toFixed(0) : n.toFixed(1)}`);
        }
      }
      const out = Array.from(set);
      out.sort((a, b) => parseFloat(a.replace(/[^0-9.]/g, '')) - parseFloat(b.replace(/[^0-9.]/g, '')));
      return out;
    }

    if (selectedIsTopwear) {
      // Only apparel chip sizes in canonical order
      const order = ['XS','S','M','L','XL','XXL'];
      for (const p of sizeSource) {
        const arr = Array.isArray(p?.sizes) ? p.sizes : [];
        for (const raw of arr) {
          const s = String(raw).toUpperCase().trim();
          if (order.includes(s)) set.add(s);
        }
      }
      const out = Array.from(set);
      out.sort((a,b) => order.indexOf(a) - order.indexOf(b));
      return out;
    }

    // Default (non-discounted categories): derive from entire category and sort naturally
    for (const p of baseProducts) {
      for (const s of normalizeSizesForProduct(p)) set.add(s);
    }
    const out = Array.from(set);
    out.sort((a,b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
    return out;
  }, [baseProducts, isDiscounted, sizeSource, subFilter]);
  const hasSizes = availableSizes.length > 0;

  const [sizeFilters, setSizeFilters] = useState([]);
  const [list, setList] = useState(baseProducts);
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

  // Sub-category handling for Discounted page
  // Build list with counts; include Topwear and Footwear; show Topwear first
  const subcats = useMemo(() => {
    if (!isDiscounted) return [];
    const counts = new Map();
    for (const p of baseProducts) {
      const raw = String(p?.subCategory || '').trim().toLowerCase();
      if (!raw) continue;
      counts.set(raw, (counts.get(raw) || 0) + 1);
    }
    const arr = Array.from(counts.entries()).map(([key, count]) => ({
      key,
      display: key === 'topwear' ? 'Topwear' : toDisplay(key),
      count,
    }));
    arr.sort((a, b) => {
      const order = (k) => (k === 'topwear' ? 0 : k === 'footwear' ? 1 : 9);
      const ra = order(a.key);
      const rb = order(b.key);
      if (ra !== rb) return ra - rb;
      return a.display.localeCompare(b.display);
    });
    return arr;
  }, [isDiscounted, baseProducts]);
  
  // Ensure we always have a valid subFilter on Discounted and remove "All"
  useEffect(() => {
    if (!isDiscounted) return;
    if (!subcats.some((s) => s.key === subFilter)) {
      // Default to Topwear when available; else Footwear; else first
      const pref = subcats.find((s) => s.key === 'topwear')?.key
        || subcats.find((s) => s.key === 'footwear')?.key
        || subcats[0]?.key
        || '';
      setSubFilter(pref);
    }
  }, [isDiscounted, subcats, subFilter]);

  const toggleSize = (val) =>
    setSizeFilters((prev) => (prev.includes(val) ? prev.filter((s) => s !== val) : [...prev, val]));

  const applyFilterAndOrder = () => {
    let copy = baseProducts.slice();

    // search (only when global search UI is visible)
    if (showSearch && debouncedSearch) {
      const q = debouncedSearch.trim().toLowerCase();
      copy = copy.filter((p) => (p.name || "").toLowerCase().includes(q));
    }

    // Discounted sub-category filter
    if (isDiscounted && subFilter) {
      const key = subFilter.toLowerCase();
      copy = copy.filter((p) => String(p?.subCategory || '').toLowerCase() === key);
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
    setVisibleCount(PAGE_SIZE);
    setLoadingMore(false);
  };

  useEffect(() => {
    applyFilterAndOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseProducts, sizeSource, hasSizes, sizeFilters, showSearch, debouncedSearch, sortValue, catKeyLower, subFilter]);

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
        // small delay for a pleasant loading state and to coalesce renders
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
    <div className="pt-10 border-t">
      <SEO
        title={`${isDiscounted ? 'Sale' : toDisplay(catKey)} – Solo Wardrobe`}
        description={`Browse ${isDiscounted ? 'discounted' : toDisplay(catKey)} products at Solo Wardrobe.`}
        url={typeof window !== 'undefined' ? window.location.href : ''}
        canonical={typeof window !== 'undefined' ? window.location.href : ''}
        type="website"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Home", "item": typeof window !== 'undefined' ? window.location.origin : ''},
            {"@type": "ListItem", "position": 2, "name": isDiscounted ? 'Sale' : toDisplay(catKey), "item": typeof window !== 'undefined' ? window.location.href : ''}
          ]
        }}
      />
      <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row gap-6">
        {/* LEFT: Desktop filters */}
        {hasSizes && (!isDiscounted || !!subFilter) && (
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
                {hasSizes && (!isDiscounted || !!subFilter) && (
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
            <Title
              text1={"CATEGORY"}
              text2={isDiscounted ? 'Sale' : toDisplay(catKey)}
              text2ClassName={isDiscounted ? 'text-red-600' : undefined}
            />
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

          {/* Discounted sub-category tiles styled like home */}
          {isDiscounted && subcats.length > 0 && (
            <div className="mb-6">
              {/* Mobile/Tablet: 3 per row */}
              <div className="lg:hidden">
                <div className="grid grid-cols-3 gap-4">
                  {subcats.map((sc, idx) => (
                    <button
                      key={sc.key}
                      type="button"
                      onClick={() => setSubFilter(sc.key)}
                      className={`group block overflow-hidden border bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-black/30 hover:shadow-md transition-shadow hover-lift ${subFilter===sc.key ? 'ring-2 ring-red-500' : ''}`}
                      style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                      <div className="relative aspect-[5/4] overflow-hidden bg-white">
                        <div className="absolute inset-0 grid place-content-center text-center px-4">
                          <h3 className={`prata-regular text-base sm:text-lg px-1 ${subFilter===sc.key ? 'text-red-600' : 'text-gray-800'}`}>{sc.display}</h3>
                          <div className="mt-2 h-px w-8 bg-gray-300 mx-auto" />
                          <p className="mt-2 text-xs text-gray-500">{sc.count} items</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              {/* Desktop: 5 per row */}
              <div className="hidden lg:block">
                <div className="grid grid-cols-5 gap-4">
                  {subcats.map((sc, idx) => (
                    <button
                      key={sc.key}
                      type="button"
                      onClick={() => setSubFilter(sc.key)}
                      className={`group block overflow-hidden border bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-black/30 hover:shadow-md transition-shadow hover-lift ${subFilter===sc.key ? 'ring-2 ring-red-500' : ''}`}
                      style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                      <div className="relative aspect-[5/4] overflow-hidden bg-white">
                        <div className="absolute inset-0 grid place-content-center text-center px-4">
                          <h3 className={`prata-regular text-base sm:text-lg px-1 ${subFilter===sc.key ? 'text-red-600' : 'text-gray-800'}`}>{sc.display}</h3>
                          <div className="mt-2 h-px w-8 bg-gray-300 mx-auto" />
                          <p className="mt-2 text-xs text-gray-500">{sc.count} items</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {isEmpty && <p className="text-sm text-gray-500 mb-6">No products match your filters.</p>}

          <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4 lg:gap-6">
            {list.slice(0, visibleCount).map((item, index) => (
              <ProductItem
                key={item._id || item.id || item.slug || index}
                id={item._id ?? item.id ?? item.slug}
                image={item.image}
                name={item.name}
                price={item.price}
                i={index}
              />
            ))}
          </div>
          {/* Infinite loader sentinel */}
          {!isLoading && (
            <div className="mt-8 flex justify-center">
              {visibleCount < list.length ? (
                <div ref={sentinelRef} className="h-10 w-full max-w-xs grid place-content-center">
                  {loadingMore && (
                    <div className="w-6 h-6 border-2 border-gray-300 border-t-black rounded-full animate-spin" aria-label="Loading" />
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

export default Category;

