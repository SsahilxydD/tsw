import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

const HeroSlider = () => {
  const sliderRef = useRef(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch products from API
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/products?category=cursor&limit=10');
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        setProducts(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error fetching products:', error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  useEffect(() => {
    // Initialize Slick after products are loaded and DOM is ready
    if (!loading && products.length > 0 && sliderRef.current) {
      // Use requestAnimationFrame to ensure DOM is fully rendered
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
          centerPadding: '60px',
          slidesToShow: 3,
          responsive: [
            {
              breakpoint: 768,
              settings: {
                arrows: false,
                centerMode: true,
                centerPadding: '40px',
                slidesToShow: 3
              }
            },
            {
              breakpoint: 480,
              settings: {
                arrows: false,
                centerMode: true,
                centerPadding: '40px',
                slidesToShow: 1
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
  }, [loading, products]);

  if (loading) {
    return (
      <div className="hero-slider-wrapper">
        <div className="hero-slider-loading">Loading products...</div>
      </div>
    );
  }

  if (products.length === 0) {
    return null;
  }

  const handleProductClick = (product) => {
    if (product._id || product.slug) {
      navigate(`/product/${product._id || product.slug}`);
    }
  };

  return (
    <div className="hero-slider-wrapper">
      <div className="center" ref={sliderRef}>
        {products.map((product, index) => (
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
    </div>
  );
};

export default HeroSlider;

