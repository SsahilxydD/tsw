import React, { useContext, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShopContext } from '../context/ShopContext';

const NO_IMAGE_PLACEHOLDER = '/assets/no-image.png';

/**
 * Robust fetch helper that safely fetches JSON and returns null on any error.
 * Checks Content-Type and status code before parsing.
 */
const fetchJsonOrNull = async (url) => {
  try {
    const response = await fetch(url, { cache: 'no-cache' });
    
    // Check status code
    if (!response.ok || response.status < 200 || response.status >= 300) {
      console.warn(`Bestsellers: ${url} returned non-2xx status (${response.status})`);
      return null;
    }

    // Check Content-Type
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.warn(`Bestsellers: ${url} returned non-JSON content-type (${contentType})`);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    // Network errors, parse errors, etc.
    if (error.name !== 'AbortError') {
      console.warn(`Bestsellers: Failed to fetch ${url}:`, error.message);
    }
    return null;
  }
};

/**
 * Normalize product objects from various sources to a consistent shape.
 */
const normalizeProduct = (item) => {
  const title = item.title || item.name || '';
  const image = item.image || (Array.isArray(item.images) ? item.images[0] : '') || NO_IMAGE_PLACEHOLDER;
  const price = item.price || item.price_cents || item.price_in_cents || 0;
  const url = item.url || item.product_url || (item.handle ? `/product/${item.handle}` : '') || (item._id ? `/product/${item._id}` : '') || '';

  // Skip items missing both title and url
  if (!title && !url) {
    return null;
  }

  return {
    title: title.trim(),
    image: image.trim() || NO_IMAGE_PLACEHOLDER,
    price: Number(price) || 0,
    url: url.trim() || '#',
    _id: item._id || item.id || item.handle || String(Math.random())
  };
};

/**
 * Hard-coded fallback products (final resort)
 */
const HARDCODED_FALLBACK = [
  {
    title: 'Classic Leather Belt',
    image: NO_IMAGE_PLACEHOLDER,
    price: 1999,
    url: '/collections/all',
    _id: 'fallback-1'
  },
  {
    title: 'Everyday Sneakers',
    image: NO_IMAGE_PLACEHOLDER,
    price: 4999,
    url: '/collections/all',
    _id: 'fallback-2'
  },
  {
    title: 'Summer Sunglasses',
    image: NO_IMAGE_PLACEHOLDER,
    price: 2499,
    url: '/collections/all',
    _id: 'fallback-3'
  },
  {
    title: 'Essential Hoodie',
    image: NO_IMAGE_PLACEHOLDER,
    price: 3599,
    url: '/collections/all',
    _id: 'fallback-4'
  }
];

const Bestsellers = () => {
  const { products, currency } = useContext(ShopContext);
  const [bestsellers, setBestsellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const carouselRef = useRef(null);
  const listRef = useRef(null);
  const prevBtnRef = useRef(null);
  const nextBtnRef = useRef(null);
  const imageObserverRef = useRef(null);

  // Load bestsellers with fallback chain
  useEffect(() => {
    const loadBestsellers = async () => {
      setLoading(true);
      let result = null;

      // Try 1: API endpoint
      result = await fetchJsonOrNull('/api/products?sort=bestsellers&limit=8');
      if (result && Array.isArray(result) && result.length > 0) {
        const normalized = result.map(normalizeProduct).filter(Boolean).slice(0, 8);
        if (normalized.length > 0) {
          setBestsellers(normalized);
          setLoading(false);
          return;
        }
      }

      // Try 2: JSON file
      result = await fetchJsonOrNull('/assets/bestsellers.json');
      if (result && Array.isArray(result) && result.length > 0) {
        const normalized = result.map(normalizeProduct).filter(Boolean).slice(0, 8);
        if (normalized.length > 0) {
          setBestsellers(normalized);
          setLoading(false);
          return;
        }
      }

      // Try 3: Inline JSON from script tag (read after a brief delay to ensure DOM is ready)
      try {
        // Use setTimeout to ensure script tag is in DOM
        await new Promise(resolve => setTimeout(resolve, 0));
        const inlineScript = document.getElementById('bestsellers-data');
        if (inlineScript && inlineScript.textContent) {
          const inlineData = JSON.parse(inlineScript.textContent);
          if (Array.isArray(inlineData) && inlineData.length > 0) {
            const normalized = inlineData.map(normalizeProduct).filter(Boolean).slice(0, 8);
            if (normalized.length > 0) {
              console.info('Bestsellers: Using inline JSON fallback');
              setBestsellers(normalized);
              setLoading(false);
              return;
            }
          }
        }
      } catch (err) {
        console.warn('Bestsellers: Inline JSON parse failed:', err.message);
      }

      // Try 4: Context products with bestseller flag
      if (Array.isArray(products) && products.length > 0) {
        const bestsellerProducts = products
          .filter(p => p.bestseller === true)
          .slice(0, 8)
          .map(p => normalizeProduct({
            title: p.name,
            image: p.image || (Array.isArray(p.images) ? p.images[0] : ''),
            price: p.price,
            url: `/product/${p._id || p.slug}`,
            _id: p._id || p.slug
          }))
          .filter(Boolean);
        
        if (bestsellerProducts.length > 0) {
          console.info('Bestsellers: Using context products fallback');
          setBestsellers(bestsellerProducts);
          setLoading(false);
          return;
        }
      }

      // Try 5: Hard-coded fallback
      console.info('Bestsellers: Using hard-coded fallback');
      setBestsellers(HARDCODED_FALLBACK);
      setLoading(false);
    };

    loadBestsellers();
  }, [products]);

  // IntersectionObserver for lazy image loading
  useEffect(() => {
    if (!listRef.current || bestsellers.length === 0) return;

    const imageElements = listRef.current.querySelectorAll('img[data-lazy]');
    if (imageElements.length === 0) return;

    // Check if IntersectionObserver is available
    if (typeof IntersectionObserver === 'undefined') {
      // Fallback: load all images immediately
      imageElements.forEach(img => {
        const src = img.getAttribute('data-lazy');
        if (src) {
          img.src = src;
          img.removeAttribute('data-lazy');
        }
      });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            const src = img.getAttribute('data-lazy');
            if (src) {
              img.src = src;
              img.removeAttribute('data-lazy');
              img.loading = 'lazy';
              observer.unobserve(img);
            }
          }
        });
      },
      {
        rootMargin: '50px'
      }
    );

    imageElements.forEach(img => observer.observe(img));

    imageObserverRef.current = observer;

    return () => {
      if (imageObserverRef.current) {
        imageObserverRef.current.disconnect();
      }
    };
  }, [bestsellers]);

  // Carousel controls
  useEffect(() => {
    if (!listRef.current || !prevBtnRef.current || !nextBtnRef.current || bestsellers.length === 0) return;

    const list = listRef.current;
    const prev = prevBtnRef.current;
    const next = nextBtnRef.current;

    const updateControls = () => {
      const hasOverflow = list.scrollWidth > list.clientWidth;
      if (hasOverflow) {
        prev.classList.remove('hidden');
        next.classList.remove('hidden');
      } else {
        prev.classList.add('hidden');
        next.classList.add('hidden');
      }
    };

    const scrollPrev = () => {
      list.scrollBy({ left: -list.clientWidth * 0.8, behavior: 'smooth' });
    };

    const scrollNext = () => {
      list.scrollBy({ left: list.clientWidth * 0.8, behavior: 'smooth' });
    };

    prev.addEventListener('click', scrollPrev);
    next.addEventListener('click', scrollNext);

    // Keyboard navigation
    const handleKeyDown = (e) => {
      if (e.target === prev || e.target === next || e.target.closest('a')) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        scrollPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        scrollNext();
      }
    };

    carouselRef.current?.addEventListener('keydown', handleKeyDown);

    // Update on resize and initial
    const resizeObserver = new ResizeObserver(updateControls);
    resizeObserver.observe(list);
    updateControls();

    return () => {
      prev.removeEventListener('click', scrollPrev);
      next.removeEventListener('click', scrollNext);
      carouselRef.current?.removeEventListener('keydown', handleKeyDown);
      resizeObserver.disconnect();
    };
  }, [bestsellers]);

  // Handle image errors
  const handleImageError = (e) => {
    if (e.target.src !== NO_IMAGE_PLACEHOLDER && e.target.src !== window.location.origin + NO_IMAGE_PLACEHOLDER) {
      e.target.src = NO_IMAGE_PLACEHOLDER;
    }
  };

  if (loading) {
    return (
      <section className="my-10" id="bestsellers">
        <div className="text-center py-8">
          <div className="inline-flex gap-3 items-center mb-3 select-none">
            <p className="uppercase tracking-[0.18em] text-[11px] sm:text-xs text-gray-500">
              BESTSELLERS
            </p>
            <p className="w-8 sm:w-12 h-[1px] sm:h-[2px] bg-gray-300"></p>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex-shrink-0 w-[calc(50%-6px)] sm:w-[calc(33.333%-8px)] lg:w-[calc(25%-9px)] max-w-[220px] bg-white border border-gray-200 rounded-xl p-3 animate-pulse">
                <div className="w-full aspect-square bg-gray-200 rounded-lg mb-2" />
                <div className="h-4 bg-gray-200 rounded mb-2" />
                <div className="h-3 bg-gray-200 rounded w-2/3" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Empty state: show CTA card
  if (bestsellers.length === 0) {
    return (
      <section className="my-10" id="bestsellers">
        <div className="text-center py-8">
          <div className="inline-flex gap-3 items-center mb-3 select-none">
            <p className="uppercase tracking-[0.18em] text-[11px] sm:text-xs text-gray-500">
              BESTSELLERS
            </p>
            <p className="w-8 sm:w-12 h-[1px] sm:h-[2px] bg-gray-300"></p>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex justify-center">
            <Link
              to="/collections/all"
              className="block bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-black/30 text-center max-w-sm"
              aria-label="Explore bestsellers"
            >
              <p className="text-lg font-medium text-gray-800 mb-2">Explore bestsellers</p>
              <p className="text-sm text-gray-600">→</p>
            </Link>
          </div>
        </div>
        <noscript>
          <div className="max-w-6xl mx-auto px-4 py-4 text-center">
            <Link
              to="/collections/all"
              className="inline-block px-4 py-2 border border-gray-300 rounded-lg bg-white hover:shadow-md transition-shadow"
            >
              Explore bestsellers →
            </Link>
          </div>
        </noscript>
      </section>
    );
  }

  return (
    <section className="my-10" id="bestsellers">
      {/* Inline JSON fallback */}
      <script
        id="bestsellers-data"
        type="application/json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              title: 'Classic Leather Belt',
              image: NO_IMAGE_PLACEHOLDER,
              price: 1999,
              url: '/collections/all',
              handle: 'classic-leather-belt'
            },
            {
              title: 'Everyday Sneakers',
              image: NO_IMAGE_PLACEHOLDER,
              price: 4999,
              url: '/collections/all',
              handle: 'everyday-sneakers'
            },
            {
              title: 'Summer Sunglasses',
              image: NO_IMAGE_PLACEHOLDER,
              price: 2499,
              url: '/collections/all',
              handle: 'summer-sunglasses'
            },
            {
              title: 'Essential Hoodie',
              image: NO_IMAGE_PLACEHOLDER,
              price: 3599,
              url: '/collections/all',
              handle: 'essential-hoodie'
            }
          ])
        }}
      />

      <div className="text-center py-8">
        <div className="inline-flex gap-3 items-center mb-3 select-none">
          <p className="uppercase tracking-[0.18em] text-[11px] sm:text-xs text-gray-500">
            BESTSELLERS
          </p>
          <p className="w-8 sm:w-12 h-[1px] sm:h-[2px] bg-gray-300"></p>
        </div>
        <p className="text-xs sm:text-sm text-gray-500 mt-2">Top selling items this week</p>
      </div>

      <div className="max-w-6xl mx-auto px-4">
        <div
          ref={carouselRef}
          className="relative"
          role="region"
          aria-label="Bestsellers carousel"
          aria-roledescription="carousel"
          tabIndex={0}
        >
          <button
            ref={prevBtnRef}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 sm:-translate-x-4 z-10 bg-white border border-gray-300 rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/30 transition-colors hidden md:flex"
            aria-label="Previous bestsellers"
            type="button"
          >
            <span className="text-lg sm:text-xl" aria-hidden="true">‹</span>
          </button>

          <ul
            ref={listRef}
            className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide"
            role="list"
            style={{
              scrollSnapType: 'x mandatory',
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
            }}
          >
            {bestsellers.map((product, idx) => (
              <li
                key={product._id || idx}
                className="flex-shrink-0 w-[calc(50%-6px)] sm:w-[calc(33.333%-8px)] lg:w-[calc(20%-9.6px)] max-w-[220px]"
                role="listitem"
                style={{ scrollSnapAlign: 'start' }}
              >
                <Link
                  to={product.url || '/collections/all'}
                  className="block bg-white border border-gray-200 rounded-xl p-3 hover:shadow-md transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-black/30"
                  aria-label={`${product.title} - ${currency}${product.price}`}
                >
                  <div className="relative w-full aspect-square overflow-hidden bg-gray-100 rounded-lg mb-2">
                    <img
                      data-lazy={product.image}
                      src={NO_IMAGE_PLACEHOLDER}
                      alt={product.title}
                      className="w-full h-full object-cover"
                      onError={handleImageError}
                      loading="lazy"
                    />
                  </div>
                  <h3 className="text-sm font-medium text-gray-800 line-clamp-1 mb-1" title={product.title}>
                    {product.title}
                  </h3>
                  <p className="text-sm font-semibold text-gray-900 text-center">
                    {currency}{product.price}
                  </p>
                </Link>
              </li>
            ))}
          </ul>

          <button
            ref={nextBtnRef}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 sm:translate-x-4 z-10 bg-white border border-gray-300 rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/30 transition-colors hidden md:flex"
            aria-label="Next bestsellers"
            type="button"
          >
            <span className="text-lg sm:text-xl" aria-hidden="true">›</span>
          </button>
        </div>
      </div>

      <noscript>
        <div className="max-w-6xl mx-auto px-4 py-4 text-center">
          <Link
            to="/collections/all"
            className="inline-block px-4 py-2 border border-gray-300 rounded-lg bg-white hover:shadow-md transition-shadow"
          >
            Explore bestsellers →
          </Link>
        </div>
      </noscript>
    </section>
  );
};

export default Bestsellers;
