import React, { useEffect, useState, useContext, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShopContext } from '../context/ShopContext';
import Title from './Title';
import SafeImg from './SafeImg';
import Button from './Button';
import useMouseDrag from '../hooks/useMouseDrag';
import './HeroSlider.css';

const NO_IMAGE_PLACEHOLDER = '/assets/no-image.svg';

const AllCategoriesSlider = () => {
  const [sliderProducts, setSliderProducts] = useState([]);
  const { products, loadingProducts } = useContext(ShopContext);
  const navigate = useNavigate();
  const scrollRef = useRef(null);
  const isResetting = useRef(false);
  const isDragging = useRef(false);
  const cachedSetWidth = useRef(0);
  const attachDrag = useMouseDrag(scrollRef, isDragging);

  useEffect(() => {
    try {
      if (!loadingProducts && Array.isArray(products) && products.length > 0) {
        const categoryMap = new Map();
        
        products.forEach(p => {
          try {
            const category = p.categoryRaw || p.category || 'Misc';
            if (!categoryMap.has(category)) {
              categoryMap.set(category, []);
            }
            categoryMap.get(category).push(p);
          } catch (err) {
            if (import.meta.env.DEV) console.warn('Skipping product:', err);
          }
        });

        const allCategoryProducts = [];
        const categories = Array.from(categoryMap.keys());
        
        for (const category of categories.slice(0, 21)) {
          try {
            const categoryProducts = categoryMap.get(category);
            if (categoryProducts && categoryProducts.length > 0) {
              const product = categoryProducts[0];
              const productTitle = product.name || product.title || product.slug_name || 'Product';
              const productId = product._id || product.slug || '';
              
              // Only add if we have at least an ID
              if (productId) {
                allCategoryProducts.push({
                  _id: productId,
                  title: productTitle,
                  price: Number(product.price || 0),
                  mrp: Number(product.mrp || 0),
                  image: product.image || (Array.isArray(product.images) ? product.images[0] : '') || '',
                  slug: product.slug || product._id || '',
                  category: category
                });
              }
            }
          } catch (err) {
            if (import.meta.env.DEV) console.warn('Skipping product:', err);
          }
        }

        // Filter out products without IDs, but allow products without titles
        const validProducts = allCategoryProducts.filter(p => p._id);
        setSliderProducts(validProducts);
      } else if (!loadingProducts && products.length === 0) {
        // Products loaded but empty - set empty array
        setSliderProducts([]);
      }
    } catch (err) {
      if (import.meta.env.DEV) console.warn('Skipping product:', err);
      setSliderProducts([]);
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
      if (isResetting.current || isDragging.current) return;

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
      attachDrag();
      window.addEventListener('resize', recalc, { passive: true });
      container.addEventListener('scroll', handleScroll, { passive: true });
    });
    
    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(resetTimer);
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
  if (loadingProducts) {
    return (
      <div className={`w-full py-8 sm:py-12 bg-amber-50/30 ${SLIDER_MIN_HEIGHT}`}>
        <div className="text-center mb-6">
          <Title text1="SHOP BY" text2="Category" />
        </div>
        <div className="flex gap-4 overflow-hidden px-4 sm:px-6">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-[38vw] sm:w-[28vw] md:w-[22vw] lg:w-[18vw] max-w-[200px]"
            >
              <div className="w-full aspect-[3/4] bg-amber-100/50 rounded-2xl animate-pulse" />
              <div className="mt-2 h-4 w-2/3 mx-auto bg-amber-100/50 rounded animate-pulse" />
            </div>
          ))}
        </div>
        <div className="flex justify-center mt-6">
          <div className="w-20 h-10 bg-amber-100/50 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  // If no products after loading, show empty state or don't render
  if (sliderProducts.length === 0) {
    return null; // Don't render if no products
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
    <div className={`w-full py-8 sm:py-12 bg-amber-50/30 overflow-hidden ${SLIDER_MIN_HEIGHT} relative`}>
      <div className="text-center mb-6">
        <Title text1="SHOP BY" text2="Category" />
      </div>

      {/* Desktop Navigation Buttons */}
      <button
        onClick={scrollLeft}
        className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 items-center justify-center bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-colors min-w-[44px] min-h-[44px]"
        aria-label="Scroll left"
      >
        <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <button
        onClick={scrollRight}
        className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 items-center justify-center bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-colors min-w-[44px] min-h-[44px]"
        aria-label="Scroll right"
      >
        <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide px-4 sm:px-6 cursor-grab active:cursor-grabbing"
      >
        {loopedProducts.map((product, index) => (
          <div
            key={`${product._id}-${index}`}
            className="slide-item flex-shrink-0 w-[38vw] sm:w-[28vw] md:w-[22vw] lg:w-[18vw] max-w-[200px] cursor-pointer group"
            onClick={() => handleProductClick(product)}
          >
            <div className="w-full aspect-[3/4] bg-white rounded-2xl overflow-hidden shadow-sm group-hover:shadow-lg transition-shadow relative">
              <SafeImg
                src={product.image || NO_IMAGE_PLACEHOLDER}
                alt={product.title || 'Product'}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                width={240}
                height={320}
                loading="lazy"
                quality={85}
              />
              {/* Category label overlay */}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent pt-8 pb-3 px-3">
                <p className="text-white text-sm font-semibold tracking-wide truncate">{product.category || 'Shop'}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-center mt-6">
        <Button as={Link} to="/collection" variant="outline" size="sm">
          View All
        </Button>
      </div>
    </div>
  );
};

export default AllCategoriesSlider;
