import React, { useEffect, useState, useContext, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShopContext } from '../context/ShopContext';
import Title from './Title';
import './HeroSlider.css';

const NO_IMAGE_PLACEHOLDER = '/assets/no-image.svg';

const HeroSlider = () => {
  const [sliderProducts, setSliderProducts] = useState([]);
  const { products, loadingProducts } = useContext(ShopContext);
  const navigate = useNavigate();
  
  const trackRef = useRef(null);
  const position = useRef(0);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startPos = useRef(0);
  const itemWidth = useRef(0);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('/api/products?category=shoes&limit=10');
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data) && data.length > 0) {
            setSliderProducts(data);
            return;
          }
        }
      } catch (error) {
        console.warn('API fetch failed, using ShopContext:', error);
      }

      if (Array.isArray(products) && products.length > 0) {
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
    };

    if (!loadingProducts) {
      fetchProducts();
    }
  }, [products, loadingProducts]);

  const updatePosition = (newPos) => {
    if (!trackRef.current || sliderProducts.length === 0) return;
    
    const totalItems = sliderProducts.length;
    const singleSetWidth = itemWidth.current * totalItems;
    
    // Normalize position to always stay within one set width (seamless wrapping)
    let normalized = newPos % singleSetWidth;
    if (normalized > 0) normalized -= singleSetWidth;
    
    position.current = normalized;
    trackRef.current.style.transform = `translateX(${normalized}px)`;
  };

  useEffect(() => {
    if (!trackRef.current || sliderProducts.length === 0) return;
    
    // Calculate item width after render
    const firstItem = trackRef.current.querySelector('.slide-item');
    if (firstItem) {
      const style = getComputedStyle(firstItem);
      const gap = 12; // gap-3 = 12px
      itemWidth.current = firstItem.offsetWidth + gap;
    }
  }, [sliderProducts]);

  const handlePointerDown = (e) => {
    isDragging.current = true;
    startX.current = e.clientX || e.touches?.[0]?.clientX || 0;
    startPos.current = position.current;
    trackRef.current.style.cursor = 'grabbing';
  };

  const handlePointerMove = (e) => {
    if (!isDragging.current) return;
    const x = e.clientX || e.touches?.[0]?.clientX || 0;
    const delta = x - startX.current;
    updatePosition(startPos.current + delta);
  };

  const handlePointerUp = () => {
    isDragging.current = false;
    if (trackRef.current) {
      trackRef.current.style.cursor = 'grab';
    }
  };

  const handleProductClick = (product, e) => {
    // Prevent click if we were dragging
    if (Math.abs(position.current - startPos.current) > 5) {
      e.preventDefault();
      return;
    }
    if (product._id || product.slug) {
      navigate(`/product/${product._id || product.slug}`);
    }
  };

  if (loadingProducts) {
    return (
      <div className="w-full py-8 bg-gray-50/50">
        <div className="flex justify-center items-center py-12">
          <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-800 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (sliderProducts.length === 0) {
    return null;
  }

  // Create enough copies for seamless loop (3 sets)
  const loopedProducts = [...sliderProducts, ...sliderProducts, ...sliderProducts];

  return (
    <div className="w-full py-4 sm:py-6 bg-gray-50/50 overflow-hidden">
      <div className="text-center mb-4">
        <Title text1="BEST SELLING" text2="Shoes" />
      </div>

      <div 
        className="overflow-hidden px-4 sm:px-6"
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
      >
        <div 
          ref={trackRef}
          className="flex gap-3 cursor-grab select-none"
          style={{ willChange: 'transform' }}
        >
          {loopedProducts.map((product, index) => (
            <div 
              key={`${product._id}-${index}`}
              className="slide-item flex-shrink-0 w-[40vw] sm:w-[28vw] md:w-[22vw] lg:w-[18vw] xl:w-[14vw] max-w-[200px] aspect-square"
              onClick={(e) => handleProductClick(product, e)}
            >
              <div className="w-full h-full bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <img
                  src={product.image || NO_IMAGE_PLACEHOLDER}
                  alt={product.title || 'Product'}
                  className="w-full h-full object-cover pointer-events-none"
                  onError={(e) => { e.target.src = NO_IMAGE_PLACEHOLDER; }}
                  draggable={false}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-center mt-5">
        <Link
          to="/category/shoes"
          className="px-6 py-2.5 bg-gray-900 text-white text-xs font-medium tracking-wide hover:bg-gray-800 transition-colors"
        >
          View All
        </Link>
      </div>
    </div>
  );
};

export default HeroSlider;
