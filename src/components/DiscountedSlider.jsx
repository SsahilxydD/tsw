import React, { useEffect, useState, useContext, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShopContext } from '../context/ShopContext';
import Title from './Title';
import SafeImg from './SafeImg';
import Button from './Button';
import './HeroSlider.css';

const NO_IMAGE_PLACEHOLDER = '/assets/no-image.svg';

const DiscountedSlider = () => {
  const [sliderProducts, setSliderProducts] = useState([]);
  const { products, loadingProducts } = useContext(ShopContext);
  const navigate = useNavigate();
  const scrollRef = useRef(null);
  const isResetting = useRef(false);
  const cachedSetWidth = useRef(0);

  useEffect(() => {
    if (!loadingProducts && Array.isArray(products) && products.length > 0) {
      const discountedProducts = products.filter(p => {
        const catRaw = String(p.categoryRaw || '').toLowerCase();
        return catRaw === 'discounted';
      });

      const topwearProducts = discountedProducts
        .filter(p => {
          const subCat = String(p.subCategory || '').toLowerCase();
          return subCat === 'topwear';
        })
        .slice(0, 5);

      const footwearProducts = discountedProducts
        .filter(p => {
          const subCat = String(p.subCategory || '').toLowerCase();
          return subCat === 'footwear';
        })
        .slice(0, 5);

      const combinedProducts = [...topwearProducts, ...footwearProducts]
        .map(p => ({
          _id: p._id || p.slug || '',
          title: p.name || '',
          price: Number(p.price || 0),
          mrp: Number(p.mrp || 0),
          image: p.image || (Array.isArray(p.images) ? p.images[0] : '') || '',
          slug: p.slug || p._id || '',
          subCategory: p.subCategory || ''
        }))
        .filter(p => p._id && p.title);

      setSliderProducts(combinedProducts);
    }
  }, [products, loadingProducts]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || sliderProducts.length === 0) return;

    // Calculate and cache width once to avoid forced reflows
    const calculateSetWidth = () => {
      const items = container.querySelectorAll('.slide-item');
      if (items.length === 0) return 0;
      const itemsPerSet = sliderProducts.length;
      let width = 0;
      for (let i = 0; i < itemsPerSet && i < items.length; i++) {
        width += items[i].offsetWidth + 16; // 16px gap (gap-4)
      }
      cachedSetWidth.current = width;
      return width;
    };

    const initScroll = () => {
      const setWidth = calculateSetWidth();
      if (setWidth > 0) {
        container.scrollLeft = setWidth;
      }
    };

    // Use cached width to avoid reflow during scroll
    let resetTimer = null;
    const handleScroll = () => {
      if (isResetting.current) return;

      const setWidth = cachedSetWidth.current;
      if (setWidth === 0) return;

      const scrollLeft = container.scrollLeft;
      const maxScroll = container.scrollWidth - container.clientWidth;

      if (scrollLeft < setWidth * 0.3) {
        isResetting.current = true;
        container.scrollLeft = scrollLeft + setWidth;
        clearTimeout(resetTimer);
        resetTimer = setTimeout(() => { isResetting.current = false; }, 80);
      }
      else if (scrollLeft > maxScroll - setWidth * 0.3) {
        isResetting.current = true;
        container.scrollLeft = scrollLeft - setWidth;
        clearTimeout(resetTimer);
        resetTimer = setTimeout(() => { isResetting.current = false; }, 80);
      }
    };

    const recalc = () => { calculateSetWidth(); };
    const rafId = requestAnimationFrame(() => {
      initScroll();
      window.addEventListener('resize', recalc, { passive: true });
      container.addEventListener('scroll', handleScroll, { passive: true });
    });
    
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', recalc);
      container.removeEventListener('scroll', handleScroll);
    };
  }, [sliderProducts]);

  const handleProductClick = (product) => {
    if (product._id || product.slug) {
      navigate(`/product/${product._id || product.slug}`);
    }
  };

  // Fixed height container to prevent CLS - always renders with same dimensions
  const SLIDER_MIN_HEIGHT = 'min-h-[300px] sm:min-h-[340px]';

  // Show skeleton placeholders while loading
  if (loadingProducts || sliderProducts.length === 0) {
    return (
      <div className={`w-full py-8 sm:py-12 bg-gray-900 ${SLIDER_MIN_HEIGHT}`}>
        <div className="text-center mb-6">
          <Title text1="SPECIAL" text2="Offers" text2ClassName="text-red-400" />
        </div>
        <div className="flex gap-4 overflow-hidden px-4 sm:px-6">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-[38vw] sm:w-[28vw] md:w-[22vw] lg:w-[18vw] max-w-[200px]"
            >
              <div className="w-full aspect-[4/5] bg-gray-700 rounded-xl animate-pulse" />
              <div className="mt-2 h-4 w-3/4 bg-gray-700 rounded animate-pulse" />
              <div className="mt-1.5 h-4 w-1/2 bg-gray-700 rounded animate-pulse" />
            </div>
          ))}
        </div>
        <div className="flex justify-center mt-6">
          <div className="w-20 h-10 bg-gray-700 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  const loopedProducts = [...sliderProducts, ...sliderProducts, ...sliderProducts];

  const scrollLeft = () => {
    const container = scrollRef.current;
    if (!container) return;
    const itemWidth = container.querySelector('.slide-item')?.offsetWidth || 0;
    const gap = 16;
    const scrollAmount = itemWidth + gap;
    container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
  };

  const scrollRight = () => {
    const container = scrollRef.current;
    if (!container) return;
    const itemWidth = container.querySelector('.slide-item')?.offsetWidth || 0;
    const gap = 16;
    const scrollAmount = itemWidth + gap;
    container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  return (
    <div className={`w-full py-8 sm:py-12 bg-gray-900 overflow-hidden ${SLIDER_MIN_HEIGHT} relative`}>
      <div className="text-center mb-6">
        <p className="uppercase tracking-[0.18em] text-[11px] sm:text-xs text-gray-300 font-medium inline-flex gap-3 items-center mb-1 select-none">
          SPECIAL <span className="normal-case tracking-normal font-semibold text-red-400">Offers</span>
          <span className="w-8 sm:w-12 h-[1px] sm:h-[2px] bg-gray-500"></span>
        </p>
      </div>

      {/* Desktop Navigation Buttons */}
      <button
        onClick={scrollLeft}
        className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 items-center justify-center bg-gray-800/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-gray-700 transition-colors min-w-[44px] min-h-[44px]"
        aria-label="Scroll left"
      >
        <svg className="w-5 h-5 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <button
        onClick={scrollRight}
        className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 items-center justify-center bg-gray-800/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-gray-700 transition-colors min-w-[44px] min-h-[44px]"
        aria-label="Scroll right"
      >
        <svg className="w-5 h-5 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide px-4 sm:px-6"
      >
        {loopedProducts.map((product, index) => {
          const discountPercent = product.mrp > product.price
            ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
            : 0;
          return (
            <div
              key={`${product._id}-${index}`}
              className="slide-item flex-shrink-0 w-[38vw] sm:w-[28vw] md:w-[22vw] lg:w-[18vw] max-w-[200px] cursor-pointer group"
              onClick={() => handleProductClick(product)}
            >
              <div className="w-full aspect-[4/5] bg-gray-800 rounded-xl overflow-hidden shadow-sm group-hover:shadow-lg group-hover:shadow-red-900/20 transition-shadow relative">
                <SafeImg
                  src={product.image || NO_IMAGE_PLACEHOLDER}
                  alt={product.title || 'Product'}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  width={260}
                  height={325}
                  loading="lazy"
                  quality={85}
                />
                {/* Discount badge */}
                {discountPercent > 0 && (
                  <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-md shadow-sm">
                    -{discountPercent}%
                  </span>
                )}
              </div>
              <div className="mt-2 px-1">
                <p className="text-sm text-gray-200 font-medium line-clamp-2 leading-tight">{product.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-sm font-semibold text-white">{'\u20B9'}{product.price.toLocaleString('en-IN')}</p>
                  {product.mrp > product.price && (
                    <p className="text-xs text-gray-400 line-through">{'\u20B9'}{product.mrp.toLocaleString('en-IN')}</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-center mt-6">
        <Button as={Link} to="/category/discounted" variant="outline" size="sm" className="!border-gray-500 !text-gray-200 hover:!bg-gray-800">
          View All
        </Button>
      </div>
    </div>
  );
};

export default DiscountedSlider;
