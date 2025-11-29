import React, { useEffect, useState, useContext, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShopContext } from '../context/ShopContext';
import Title from './Title';
import './HeroSlider.css';

const NO_IMAGE_PLACEHOLDER = '/assets/no-image.svg';

const DiscountedSlider = () => {
  const [sliderProducts, setSliderProducts] = useState([]);
  const { products, loadingProducts } = useContext(ShopContext);
  const navigate = useNavigate();
  const scrollRef = useRef(null);
  const isResetting = useRef(false);

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

    const getSetWidth = () => {
      const items = container.querySelectorAll('.slide-item');
      if (items.length === 0) return 0;
      const itemsPerSet = sliderProducts.length;
      let width = 0;
      for (let i = 0; i < itemsPerSet && i < items.length; i++) {
        width += items[i].offsetWidth + 12;
      }
      return width;
    };

    const initScroll = () => {
      const setWidth = getSetWidth();
      if (setWidth > 0) {
        container.scrollLeft = setWidth;
      }
    };

    const handleScroll = () => {
      if (isResetting.current) return;
      
      const setWidth = getSetWidth();
      if (setWidth === 0) return;
      
      const { scrollLeft, scrollWidth, clientWidth } = container;
      const maxScroll = scrollWidth - clientWidth;
      
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

    requestAnimationFrame(initScroll);
    container.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => container.removeEventListener('scroll', handleScroll);
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
          <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-800 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (sliderProducts.length === 0) {
    return null;
  }

  const loopedProducts = [...sliderProducts, ...sliderProducts, ...sliderProducts];

  return (
    <div className="w-full py-4 sm:py-6 bg-gray-50/50 overflow-hidden">
      <div className="text-center mb-4">
        <Title text1="SPECIAL" text2="Offers" />
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
              <img
                src={product.image || NO_IMAGE_PLACEHOLDER}
                alt={product.title || 'Product'}
                className="w-full h-full object-cover"
                onError={(e) => { e.target.src = NO_IMAGE_PLACEHOLDER; }}
                draggable={false}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-center mt-5">
        <Link
          to="/category/discounted"
          className="px-6 py-2.5 bg-white text-black text-xs font-medium tracking-wide border border-black hover:bg-black hover:text-white transition-colors"
        >
          View All
        </Link>
      </div>
    </div>
  );
};

export default DiscountedSlider;
