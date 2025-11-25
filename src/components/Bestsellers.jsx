import React, { useContext, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShopContext } from '../context/ShopContext';
import SafeImg from './SafeImg';

const Bestsellers = () => {
  const { products, currency } = useContext(ShopContext);
  const [bestsellers, setBestsellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const carouselRef = useRef(null);
  const listRef = useRef(null);
  const prevBtnRef = useRef(null);
  const nextBtnRef = useRef(null);

  useEffect(() => {
    const fetchBestsellers = async () => {
      try {
        setLoading(true);
        setError(null);

        // Try API endpoint first
        try {
          const apiRes = await fetch('/api/products?sort=bestsellers&limit=8');
          if (apiRes.ok) {
            const data = await apiRes.json();
            if (Array.isArray(data) && data.length > 0) {
              // Normalize API response
              const normalized = data.map(p => ({
                _id: p.id || p._id || p.handle || String(Math.random()),
                name: p.title || p.name || '',
                price: p.price || p.price_cents || (p.variants?.[0]?.price || 0),
                image: p.image || (Array.isArray(p.images) ? p.images[0] : '') || '/assets/no-image.png',
                url: p.url || `/product/${p.handle || p.id || p._id}`,
                slug: p.handle || p.slug || p.id || p._id
              }));
              setBestsellers(normalized);
              setLoading(false);
              return;
            }
          }
        } catch (apiErr) {
          console.warn('API fetch failed, trying fallback:', apiErr);
        }

        // Fallback 1: Try JSON file
        try {
          const jsonRes = await fetch('/assets/bestsellers.json');
          if (jsonRes.ok) {
            const data = await jsonRes.json();
            if (Array.isArray(data) && data.length > 0) {
              setBestsellers(data);
              setLoading(false);
              return;
            }
          }
        } catch (jsonErr) {
          console.warn('JSON fallback failed, using context products:', jsonErr);
        }

        // Fallback 2: Use products from context with bestseller flag
        if (Array.isArray(products) && products.length > 0) {
          const bestsellerProducts = products
            .filter(p => p.bestseller === true)
            .slice(0, 8)
            .map(p => ({
              _id: p._id || p.slug || String(Math.random()),
              name: p.name || '',
              price: p.price || 0,
              image: p.image || (Array.isArray(p.images) ? p.images[0] : '') || '/assets/no-image.png',
              url: `/product/${p._id || p.slug}`,
              slug: p._id || p.slug
            }));
          
          if (bestsellerProducts.length > 0) {
            setBestsellers(bestsellerProducts);
            setLoading(false);
            return;
          }
        }

        // If all fallbacks fail, set empty
        setBestsellers([]);
        setError('No bestsellers available');
      } catch (err) {
        console.error('Error fetching bestsellers:', err);
        setError(err.message);
        setBestsellers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBestsellers();
  }, [products]);

  // Carousel controls
  useEffect(() => {
    if (!listRef.current || !prevBtnRef.current || !nextBtnRef.current) return;

    const list = listRef.current;
    const prev = prevBtnRef.current;
    const next = nextBtnRef.current;

    const updateControls = () => {
      if (list.scrollWidth > list.clientWidth) {
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
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        scrollPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        scrollNext();
      }
    };

    carouselRef.current?.addEventListener('keydown', handleKeyDown);

    // Update on resize
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

  if (loading) {
    return (
      <section className="my-10">
        <div className="text-center py-8">
          <div className="inline-flex gap-3 items-center mb-3 select-none">
            <p className="uppercase tracking-[0.18em] text-[11px] sm:text-xs text-gray-500">
              BESTSELLERS
            </p>
            <p className="w-8 sm:w-12 h-[1px] sm:h-[2px] bg-gray-300"></p>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-3 overflow-x-auto pb-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex-shrink-0 w-[72%] max-w-[220px] bg-white border border-gray-200 rounded-xl p-3 animate-pulse">
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

  if (error || bestsellers.length === 0) {
    return (
      <section className="my-10">
        <div className="text-center py-8">
          <Title text1="BESTSELLERS" text2="" />
        </div>
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center py-8">
            <Link
              to="/collection"
              className="inline-block px-4 py-2 border border-gray-300 rounded-lg bg-white hover:shadow-md transition-shadow"
            >
              Explore our store →
            </Link>
          </div>
        </div>
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
        >
          <button
            ref={prevBtnRef}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 sm:-translate-x-4 z-10 bg-white border border-gray-300 rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/30 transition-colors hidden"
            aria-label="Previous bestsellers"
            type="button"
          >
            <span className="text-lg sm:text-xl">‹</span>
          </button>

          <ul
            ref={listRef}
            className="flex gap-3 overflow-x-auto scroll-snap-x-mandatory pb-4 scrollbar-hide"
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
                className="flex-shrink-0 w-[72%] max-w-[220px] sm:w-[30%] lg:w-[22%] scroll-snap-align-center"
                role="listitem"
                style={{ scrollSnapAlign: 'center' }}
              >
                <Link
                  to={product.url || `/product/${product.slug || product._id}`}
                  className="block bg-white border border-gray-200 rounded-xl p-3 hover:shadow-md transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-black/30"
                  aria-label={`${product.name} - ${currency}${product.price}`}
                >
                  <div className="relative w-full aspect-square overflow-hidden bg-gray-100 rounded-lg mb-2">
                    <SafeImg
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <h3 className="text-sm font-medium text-gray-800 line-clamp-1 mb-1">
                    {product.name}
                  </h3>
                  <p className="text-sm font-semibold text-gray-900">
                    {currency}{product.price}
                  </p>
                </Link>
              </li>
            ))}
          </ul>

          <button
            ref={nextBtnRef}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 sm:translate-x-4 z-10 bg-white border border-gray-300 rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/30 transition-colors hidden"
            aria-label="Next bestsellers"
            type="button"
          >
            <span className="text-lg sm:text-xl">›</span>
          </button>
        </div>
      </div>

      <noscript>
        <div className="max-w-6xl mx-auto px-4 py-4 text-center">
          <Link
            to="/collection"
            className="inline-block px-4 py-2 border border-gray-300 rounded-lg bg-white hover:shadow-md transition-shadow"
          >
            Shop our top sellers
          </Link>
        </div>
      </noscript>
    </section>
  );
};

export default Bestsellers;

