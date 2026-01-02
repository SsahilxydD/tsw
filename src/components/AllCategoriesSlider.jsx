import React, { useEffect, useState, useContext, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShopContext } from '../context/ShopContext';
import Title from './Title';
import SafeImg from './SafeImg';
import Button from './Button';
import './HeroSlider.css';

const NO_IMAGE_PLACEHOLDER = '/assets/no-image.svg';

const AllCategoriesSlider = () => {
  const [sliderProducts, setSliderProducts] = useState([]);
  const { products, loadingProducts } = useContext(ShopContext);
  const navigate = useNavigate();
  const scrollRef = useRef(null);
  const isResetting = useRef(false);
  const cachedSetWidth = useRef(0);

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
          } catch (e) {
            console.warn('Error processing product for category slider:', e);
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
          } catch (e) {
            console.warn('Error processing category:', category, e);
          }
        }

        // Filter out products without IDs, but allow products without titles
        const validProducts = allCategoryProducts.filter(p => p._id);
        setSliderProducts(validProducts);
      } else if (!loadingProducts && products.length === 0) {
        // Products loaded but empty - set empty array
        setSliderProducts([]);
      }
    } catch (error) {
      console.error('Error in AllCategoriesSlider:', error);
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
        width += items[i].offsetWidth + 12;
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
    const handleScroll = () => {
      if (isResetting.current) return;
      
      const setWidth = cachedSetWidth.current;
      if (setWidth === 0) return;
      
      const scrollLeft = container.scrollLeft;
      const maxScroll = container.scrollWidth - container.clientWidth;
      
      if (scrollLeft < setWidth * 0.3) {
        isResetting.current = true;
        container.style.scrollBehavior = 'auto';
        container.scrollLeft = scrollLeft + setWidth;
        container.style.scrollBehavior = '';
        requestAnimationFrame(() => { isResetting.current = false; });
      }
      else if (scrollLeft > maxScroll - setWidth * 0.3) {
        isResetting.current = true;
        container.style.scrollBehavior = 'auto';
        container.scrollLeft = scrollLeft - setWidth;
        container.style.scrollBehavior = '';
        requestAnimationFrame(() => { isResetting.current = false; });
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
  const SLIDER_MIN_HEIGHT = 'min-h-[200px] sm:min-h-[220px]';

  // Show skeleton placeholders while loading
  if (loadingProducts) {
    return (
      <div className={`w-full py-4 sm:py-6 bg-gray-50/50 ${SLIDER_MIN_HEIGHT}`}>
        <div className="text-center mb-4">
          <Title text1="SHOP BY" text2="Category" />
        </div>
        <div className="flex gap-3 overflow-hidden px-4 sm:px-6">
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

  // If no products after loading, show empty state or don't render
  if (sliderProducts.length === 0) {
    return null; // Don't render if no products
  }

  const loopedProducts = [...sliderProducts, ...sliderProducts, ...sliderProducts];

  const scrollLeft = () => {
    const container = scrollRef.current;
    if (!container) return;
    const itemWidth = container.querySelector('.slide-item')?.offsetWidth || 0;
    const gap = 12;
    const scrollAmount = itemWidth + gap;
    container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
  };

  const scrollRight = () => {
    const container = scrollRef.current;
    if (!container) return;
    const itemWidth = container.querySelector('.slide-item')?.offsetWidth || 0;
    const gap = 12;
    const scrollAmount = itemWidth + gap;
    container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  return (
    <div className={`w-full py-4 sm:py-6 bg-gray-50/50 overflow-hidden ${SLIDER_MIN_HEIGHT} relative`}>
      <div className="text-center mb-4">
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
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-center mt-5">
        <Button as={Link} to="/collection" variant="outline" size="sm">
          View All
        </Button>
      </div>
    </div>
  );
};

export default AllCategoriesSlider;
