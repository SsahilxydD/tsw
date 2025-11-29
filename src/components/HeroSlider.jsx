import React, { useEffect, useState, useContext, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShopContext } from '../context/ShopContext';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import Title from './Title';

const NO_IMAGE_PLACEHOLDER = '/assets/no-image.svg';

const ProductCard = ({ product, index, onNavigate }) => {
  return (
    <motion.div
      className="flex-shrink-0 w-[45vw] sm:w-[32vw] md:w-[26vw] lg:w-[22vw] xl:w-[18vw] max-w-[240px]"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
    >
      <motion.div
        className="bg-white rounded-lg overflow-hidden shadow-sm cursor-pointer h-full flex flex-col"
        whileHover={{ y: -4, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
        whileTap={{ scale: 0.98 }}
        onClick={() => onNavigate(product)}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      >
        {/* Image */}
        <div className="relative aspect-square overflow-hidden bg-gray-50">
          <motion.img
            src={product.image || NO_IMAGE_PLACEHOLDER}
            alt={product.title || 'Product'}
            className="w-full h-full object-contain"
            whileHover={{ scale: 1.08 }}
            transition={{ duration: 0.4 }}
            onError={(e) => { e.target.src = NO_IMAGE_PLACEHOLDER; }}
            draggable={false}
          />
        </div>

        {/* Info */}
        <div className="p-3 flex flex-col gap-1.5 flex-1">
          <h3 className="text-xs sm:text-sm font-medium text-gray-900 line-clamp-2 leading-snug min-h-[2.5em]">
            {product.title || 'Product'}
          </h3>
          <div className="flex items-center gap-2 mt-auto">
            <span className="text-sm sm:text-base font-semibold text-gray-900">
              ₹{Number(product.price || 0).toLocaleString('en-IN')}
            </span>
            {product.mrp && product.mrp > product.price && (
              <span className="text-xs text-gray-400 line-through">
                ₹{Number(product.mrp).toLocaleString('en-IN')}
              </span>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const HeroSlider = () => {
  const [sliderProducts, setSliderProducts] = useState([]);
  const { products, loadingProducts } = useContext(ShopContext);
  const navigate = useNavigate();
  
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [scrollWidth, setScrollWidth] = useState(0);
  
  const x = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 300, damping: 30 });

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

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const container = containerRef.current;
        setContainerWidth(container.offsetWidth);
        setScrollWidth(container.scrollWidth);
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    
    // Recalculate after products load
    const timer = setTimeout(updateDimensions, 100);
    
    return () => {
      window.removeEventListener('resize', updateDimensions);
      clearTimeout(timer);
    };
  }, [sliderProducts]);

  const handleProductClick = (product) => {
    if (product._id || product.slug) {
      navigate(`/product/${product._id || product.slug}`);
    }
  };

  if (loadingProducts) {
    return (
      <div className="w-full py-8 bg-gray-50/50">
        <div className="flex justify-center items-center py-12">
          <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-800 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (sliderProducts.length === 0) {
    return null;
  }

  const dragConstraints = {
    left: -(scrollWidth - containerWidth + 32),
    right: 0
  };

  return (
    <div className="w-full py-4 sm:py-6 bg-gray-50/50 overflow-hidden">
      {/* Title */}
      <div className="text-center mb-4">
        <Title text1="BEST SELLING" text2="Shoes" />
      </div>

      {/* Carousel */}
      <div className="relative px-4 sm:px-6 lg:px-8">
        <motion.div
          ref={containerRef}
          className="flex gap-3 sm:gap-4 cursor-grab active:cursor-grabbing"
          drag="x"
          dragConstraints={dragConstraints}
          dragElastic={0.1}
          dragTransition={{ bounceStiffness: 300, bounceDamping: 30 }}
          style={{ x: springX }}
        >
          {sliderProducts.map((product, index) => (
            <ProductCard
              key={product._id || index}
              product={product}
              index={index}
              onNavigate={handleProductClick}
            />
          ))}
        </motion.div>

        {/* Scroll hint gradient */}
        <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-gray-50/90 to-transparent pointer-events-none" />
      </div>

      {/* View All Button */}
      <motion.div 
        className="flex justify-center mt-5"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Link to="/category/shoes">
          <motion.button
            className="px-6 py-2.5 bg-gray-900 text-white text-xs font-medium tracking-wide hover:bg-gray-800 transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            View All
          </motion.button>
        </Link>
      </motion.div>
    </div>
  );
};

export default HeroSlider;
