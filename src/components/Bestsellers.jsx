import React, { useContext, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShopContext } from '../context/ShopContext';

const NO_IMAGE_PLACEHOLDER = '/assets/no-image.png';

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
  const { products, currency, loadingProducts } = useContext(ShopContext);
  const [bestsellers, setBestsellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const carouselRef = useRef(null);
  const listRef = useRef(null);
  const prevBtnRef = useRef(null);
  const nextBtnRef = useRef(null);
  const imageObserverRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Load bestsellers from ShopContext products (primary source)
  useEffect(() => {
    // Don't run if products are still loading
    if (loadingProducts) {
      setLoading(true);
      return;
    }

    // Cleanup any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    const loadBestsellers = () => {
      setLoading(true);

      // Primary source: ShopContext products with bestseller flag
      if (Array.isArray(products) && products.length > 0) {
        const bestsellerProducts = products
          .filter(p => p.bestseller === true)
          .slice(0, 8)
          .map(p => {
            // Handle ShopContext product structure
            const title = p.name || '';
            const image = p.image || (Array.isArray(p.images) ? p.images[0] : '') || NO_IMAGE_PLACEHOLDER;
            const price = p.price || 0;
            const productId = p._id || p.slug || '';
            const url = productId ? `/product/${productId}` : '';

            // Skip items missing both title and url
            if (!title && !url) {
              return null;
            }

            return {
              title: title.trim(),
              image: image.trim() || NO_IMAGE_PLACEHOLDER,
              price: Number(price) || 0,
              url: url.trim() || '#',
              _id: productId || String(Math.random())
            };
          })
          .filter(Boolean);
        
        if (bestsellerProducts.length > 0) {
          console.info('Bestsellers: Loaded from ShopContext products', bestsellerProducts.length);
          if (!signal.aborted) {
            setBestsellers(bestsellerProducts);
            setLoading(false);
          }
          return;
        }
      }

      // Fallback: Hard-coded products if no bestseller products found
      console.info('Bestsellers: No bestseller products found, using fallback');
      if (!signal.aborted) {
        setBestsellers(HARDCODED_FALLBACK);
        setLoading(false);
      }
    };

    loadBestsellers();

    // Cleanup function
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [products, loadingProducts]);

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
