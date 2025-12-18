import React, { useEffect, useState, useContext, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShopContext } from '../context/ShopContext';
import Title from './Title';
import SafeImg from './SafeImg';
import ProductItem from './ProductItem';
import './HeroSlider.css';

const NO_IMAGE_PLACEHOLDER = '/assets/no-image.svg';

const RecentlyViewed = ({ maxItems = 10, excludeProductId = null }) => {
  const [recentlyViewedProducts, setRecentlyViewedProducts] = useState([]);
  const { products, loadingProducts, getRecentlyViewedProducts } = useContext(ShopContext);
  const navigate = useNavigate();
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!loadingProducts && Array.isArray(products) && products.length > 0) {
      const viewedProducts = getRecentlyViewedProducts();
      
      // Filter out the current product if excludeProductId is provided
      let filtered = viewedProducts;
      if (excludeProductId) {
        filtered = viewedProducts.filter(p => 
          String(p._id) !== String(excludeProductId) && 
          String(p.slug) !== String(excludeProductId)
        );
      }
      
      // Limit to maxItems
      const limited = filtered.slice(0, maxItems);
      
      setRecentlyViewedProducts(limited);
    }
  }, [products, loadingProducts, getRecentlyViewedProducts, excludeProductId, maxItems]);

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

  // Fixed height container to prevent CLS
  const SLIDER_MIN_HEIGHT = 'min-h-[200px] sm:min-h-[220px]';

  // Don't render if no recently viewed products
  if (loadingProducts) {
    return (
      <div className={`w-full py-4 sm:py-6 bg-gray-50/50 ${SLIDER_MIN_HEIGHT}`}>
        <div className="text-center mb-4">
          <Title text1="RECENTLY" text2="Viewed" />
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
      </div>
    );
  }

  // Don't render if no recently viewed products
  if (recentlyViewedProducts.length === 0) {
    return null;
  }

  return (
    <div className={`w-full py-4 sm:py-6 bg-gray-50/50 overflow-hidden ${SLIDER_MIN_HEIGHT} relative`}>
      <div className="text-center mb-4">
        <Title text1="RECENTLY" text2="Viewed" />
      </div>

      {/* Desktop Navigation Buttons */}
      {recentlyViewedProducts.length > 3 && (
        <>
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
        </>
      )}

      <div 
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide px-4 sm:px-6 scroll-smooth"
      >
        {recentlyViewedProducts.map((product) => (
          <div 
            key={product._id || product.slug}
            className="slide-item flex-shrink-0 w-[40vw] sm:w-[28vw] md:w-[22vw] lg:w-[18vw] xl:w-[14vw] max-w-[200px]"
          >
            <ProductItem
              id={product._id || product.slug}
              name={product.name || ''}
              image={product.image || (Array.isArray(product.images) ? product.images[0] : '') || NO_IMAGE_PLACEHOLDER}
              old_price={product.mrp || 0}
              new_price={product.price || 0}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentlyViewed;

