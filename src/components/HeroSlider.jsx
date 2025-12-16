import React, { useEffect, useState, useContext, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShopContext } from '../context/ShopContext';
import Title from './Title';
import SafeImg from './SafeImg';
import './HeroSlider.css';

const NO_IMAGE_PLACEHOLDER = '/assets/no-image.svg';

const HeroSlider = () => {
  const [sliderProducts, setSliderProducts] = useState([]);
  const { products, loadingProducts } = useContext(ShopContext);
  const navigate = useNavigate();
  const scrollRef = useRef(null);
  const isResetting = useRef(false);
  const cachedSetWidth = useRef(0);

  // Removed blocking API call - use only ShopContext data to prevent LCP delay
  useEffect(() => {
    if (!loadingProducts && Array.isArray(products) && products.length > 0) {
      const shoesProducts = products
        .filter(p => {
          const catRaw = String(p.categoryRaw || '').toLowerCase();
          return catRaw === 'shoes';
        })
        .slice(0, 10)
        .map(p => ({
          _id: p._id || p.slug || '',
          title: p.name || '',
          price: Number(p.price || 0),
          mrp: Number(p.mrp || 0),
          image: p.image || (Array.isArray(p.images) ? p.images[0] : '') || '',
          slug: p.slug || p._id || ''
        }))
        .filter(p => p._id && p.title);

      setSliderProducts(shoesProducts);
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
        width += items[i].offsetWidth + 12; // 12px gap
      }
      cachedSetWidth.current = width;
      return width;
    };

    // Initialize to middle set
    const initScroll = () => {
      const setWidth = calculateSetWidth();
      if (setWidth > 0) {
        container.scrollLeft = setWidth;
      }
    };

    // Handle seamless loop - use cached width to avoid reflow
    const handleScroll = () => {
      if (isResetting.current) return;
      
      const setWidth = cachedSetWidth.current;
      if (setWidth === 0) return;
      
      // Read all layout properties at once (single reflow)
      const scrollLeft = container.scrollLeft;
      const maxScroll = container.scrollWidth - container.clientWidth;
      
      // If near the start, jump to middle
      if (scrollLeft < setWidth * 0.3) {
        isResetting.current = true;
        container.style.scrollBehavior = 'auto';
        container.scrollLeft = scrollLeft + setWidth;
        container.style.scrollBehavior = '';
        requestAnimationFrame(() => { isResetting.current = false; });
      }
      // If near the end, jump to middle
      else if (scrollLeft > maxScroll - setWidth * 0.3) {
        isResetting.current = true;
        container.style.scrollBehavior = 'auto';
        container.scrollLeft = scrollLeft - setWidth;
        container.style.scrollBehavior = '';
        requestAnimationFrame(() => { isResetting.current = false; });
      }
    };

    // Calculate initial width after layout is stable
    requestAnimationFrame(() => {
      initScroll();
      // Recalculate on resize
      const recalc = () => { calculateSetWidth(); };
      window.addEventListener('resize', recalc, { passive: true });
      container.addEventListener('scroll', handleScroll, { passive: true });
    });
    
    return () => {
      window.removeEventListener('resize', () => {});
      container.removeEventListener('scroll', handleScroll);
    };
  }, [sliderProducts]);

  const handleProductClick = (product) => {
    if (product._id || product.slug) {
      navigate(`/product/${product._id || product.slug}`);
    }
  };

  // Fixed height container to prevent CLS - always renders with same dimensions
  const SLIDER_MIN_HEIGHT = 'min-h-[200px] sm:min-h-[220px]';

  // Show skeleton placeholders while loading - prevents CLS and improves perceived speed
  if (loadingProducts || sliderProducts.length === 0) {
    return (
      <div className={`w-full py-4 sm:py-6 bg-gray-50/50 ${SLIDER_MIN_HEIGHT}`}>
        <div className="text-center mb-4">
          <Title text1="BEST SELLING" text2="Shoes" />
        </div>
        <div className="flex gap-3 overflow-hidden px-4 sm:px-6">
          {/* Skeleton placeholder cards - same dimensions as real cards */}
          {[...Array(6)].map((_, i) => (
            <div 
              key={i}
              className="flex-shrink-0 w-[40vw] sm:w-[28vw] md:w-[22vw] lg:w-[18vw] xl:w-[14vw] max-w-[200px] aspect-square"
            >
              <div className="w-full h-full bg-gray-200 rounded-lg animate-pulse" />
            </div>
          ))}
        </div>
        <div className="flex justify-center mt-5">
          <div className="w-20 h-10 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  // Triple for seamless looping
  const loopedProducts = [...sliderProducts, ...sliderProducts, ...sliderProducts];

  return (
    <div className={`w-full py-4 sm:py-6 bg-gray-50/50 overflow-hidden ${SLIDER_MIN_HEIGHT}`}>
      <div className="text-center mb-4">
        <Title text1="BEST SELLING" text2="Shoes" />
      </div>

      <div 
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide px-4 sm:px-6 scroll-smooth"
      >
        {loopedProducts.map((product, index) => (
          <div 
            key={`${product._id}-${index}`}
            className="slide-item flex-shrink-0 w-[40vw] sm:w-[28vw] md:w-[22vw] lg:w-[18vw] xl:w-[14vw] max-w-[200px] aspect-square cursor-pointer"
            onClick={() => handleProductClick(product)}
          >
            <div className="w-full h-full bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <SafeImg
                src={product.image || NO_IMAGE_PLACEHOLDER}
                alt={product.title || 'Product'}
                className="w-full h-full object-cover"
                width={200}
                height={200}
                loading="lazy"
                quality={85}
                decoding="async"
                onError={(e) => { e.target.src = NO_IMAGE_PLACEHOLDER; }}
                draggable={false}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-center mt-5">
        <Link
          to="/category/shoes"
          className="px-6 py-2.5 bg-white text-black text-xs font-medium tracking-wide border border-black hover:bg-black hover:text-white transition-colors"
        >
          View All
        </Link>
      </div>
    </div>
  );
};

export default HeroSlider;
