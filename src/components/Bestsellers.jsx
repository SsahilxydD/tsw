import React, { useContext, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShopContext } from '../context/ShopContext';

const NO_IMAGE_PLACEHOLDER = '/assets/no-image.png';

const Bestsellers = () => {
  const { products, currency, loadingProducts } = useContext(ShopContext);
  const [bestsellers, setBestsellers] = useState([]);
  const carouselRef = useRef(null);
  const listRef = useRef(null);
  const prevBtnRef = useRef(null);
  const nextBtnRef = useRef(null);
  const imageObserverRef = useRef(null);

  // Load top 6 products from shoes section
  useEffect(() => {
    if (loadingProducts) return;

    if (Array.isArray(products) && products.length > 0) {
      const shoesProducts = products
        .filter(p => p.categoryRaw === 'shoes')
        .slice(0, 12)
        .map(p => ({
          title: p.name || '',
          image: p.image || (Array.isArray(p.images) ? p.images[0] : '') || NO_IMAGE_PLACEHOLDER,
          price: Number(p.price) || 0,
          url: p._id || p.slug ? `/product/${p._id || p.slug}` : '#',
          _id: p._id || p.slug || ''
        }))
        .filter(p => p.title && p._id);

      setBestsellers(shoesProducts);
    }
  }, [products, loadingProducts]);

  // IntersectionObserver for lazy image loading
  useEffect(() => {
    if (!listRef.current || bestsellers.length === 0) return;

    const imageElements = listRef.current.querySelectorAll('img[data-lazy]');
    if (imageElements.length === 0) return;

    if (typeof IntersectionObserver === 'undefined') {
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
      { rootMargin: '50px' }
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

  const handleImageError = (e) => {
    if (e.target.src !== NO_IMAGE_PLACEHOLDER && e.target.src !== window.location.origin + NO_IMAGE_PLACEHOLDER) {
      e.target.src = NO_IMAGE_PLACEHOLDER;
    }
  };

  if (loadingProducts) {
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
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="flex-shrink-0 w-[calc(50%-6px)] sm:w-[calc(33.333%-8px)] lg:w-[calc(20%-9.6px)] max-w-[220px] bg-white border border-gray-200 rounded-xl p-3 animate-pulse">
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

  if (bestsellers.length === 0) {
    return null;
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
                  to={product.url}
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
    </section>
  );
};

export default Bestsellers;
