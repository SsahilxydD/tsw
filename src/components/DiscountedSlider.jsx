import React, { useEffect, useRef, useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShopContext } from '../context/ShopContext';
import $ from 'jquery';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import 'slick-carousel';
import './HeroSlider.css';

// Make jQuery available globally for Slick
if (typeof window !== 'undefined' && !window.jQuery) {
  window.jQuery = $;
  window.$ = $;
}

const NO_IMAGE_PLACEHOLDER = '/assets/no-image.svg';

const DiscountedSlider = () => {
  const sliderRef = useRef(null);
  const [sliderProducts, setSliderProducts] = useState([]);
  const { products, loadingProducts } = useContext(ShopContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (!loadingProducts && Array.isArray(products) && products.length > 0) {
      // Filter products from Discounted category
      const discountedProducts = products.filter(p => {
        const catRaw = String(p.categoryRaw || '').toLowerCase();
        return catRaw === 'discounted';
      });

      // Separate by subCategory
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

      // Combine: first 5 topwear, then 5 footwear
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
    // Initialize Slick after products are loaded and DOM is ready
    if (!loadingProducts && sliderProducts.length > 0 && sliderRef.current) {
      const initSlider = () => {
        if (!sliderRef.current) return;
        
        const $slider = $(sliderRef.current);

        // Destroy existing instance if any
        if ($slider.hasClass('slick-initialized')) {
          $slider.slick('unslick');
        }

        // Initialize Slick with the provided config
        $slider.slick({
          centerMode: true,
          centerPadding: '120px',
          slidesToShow: 3,
          slidesToScroll: 1,
          infinite: true,
          dots: false,
          arrows: true,
          variableWidth: false,
          responsive: [
            {
              breakpoint: 768,
              settings: {
                arrows: false,
                centerMode: true,
                centerPadding: '60px',
                slidesToShow: 2,
                slidesToScroll: 1
              }
            },
            {
              breakpoint: 480,
              settings: {
                arrows: false,
                centerMode: true,
                centerPadding: '20px',
                slidesToShow: 3,
                slidesToScroll: 1
              }
            }
          ]
        });
      };

      // Small delay to ensure DOM is ready
      const timeoutId = setTimeout(() => {
        requestAnimationFrame(initSlider);
      }, 100);

      // Cleanup on unmount
      return () => {
        clearTimeout(timeoutId);
        if (sliderRef.current) {
          const $slider = $(sliderRef.current);
          if ($slider.hasClass('slick-initialized')) {
            $slider.slick('unslick');
          }
        }
      };
    }
  }, [loadingProducts, sliderProducts]);

  if (loadingProducts) {
    return (
      <div className="hero-slider-wrapper">
        <div className="hero-slider-loading">Loading products...</div>
      </div>
    );
  }

  if (sliderProducts.length === 0 && !loadingProducts) {
    return null;
  }

  const handleProductClick = (product) => {
    if (product._id || product.slug) {
      navigate(`/product/${product._id || product.slug}`);
    }
  };

  return (
    <div className="hero-slider-wrapper">
      <h2 className="hero-slider-title">Special Offers</h2>
      <div className="center" ref={sliderRef}>
        {sliderProducts.map((product, index) => (
          <div key={product._id || index} className="hero-slide">
            <div 
              className="hero-product-card"
              onClick={() => handleProductClick(product)}
            >
              <div className="hero-product-image-wrapper">
                <img
                  src={product.image || NO_IMAGE_PLACEHOLDER}
                  alt={product.title || 'Product'}
                  className="hero-product-image"
                  onError={(e) => {
                    e.target.src = NO_IMAGE_PLACEHOLDER;
                  }}
                />
              </div>
              <div className="hero-product-info">
                <h3 className="hero-product-title">{product.title || 'Product'}</h3>
                <div className="hero-product-price">
                  {product.mrp && product.mrp > product.price ? (
                    <>
                      <span className="hero-price-current">₹{Number(product.price || 0).toLocaleString('en-IN')}</span>
                      <span className="hero-price-mrp">₹{Number(product.mrp || 0).toLocaleString('en-IN')}</span>
                    </>
                  ) : (
                    <span className="hero-price-current">₹{Number(product.price || 0).toLocaleString('en-IN')}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="hero-view-all-wrapper">
        <Link to="/category/discounted" className="hero-view-all-button">
          View All
        </Link>
      </div>
    </div>
  );
};

export default DiscountedSlider;

