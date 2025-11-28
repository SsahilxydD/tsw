import React, { useEffect, useRef, useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShopContext } from '../context/ShopContext';
import Title from './Title';
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
  const [sliderProducts, setSliderProducts] = useState([]);
  const { products, loadingProducts } = useContext(ShopContext);
  const navigate = useNavigate();

  useEffect(() => {
    // Try API first, fallback to ShopContext
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

      // Fallback: Use ShopContext products filtered by shoes category
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
    if (
      loadingProducts ||
      sliderProducts.length === 0 ||
      !sliderRef.current ||
      typeof window === 'undefined'
    ) {
      return;
    }

    const $slider = $(sliderRef.current);
    let resizeObserver = null;
    let rafId = null;
    let resizeRaf = null;

    const slidesFor = (target) => Math.min(target, sliderProducts.length);
    const shouldLoop = sliderProducts.length > 2;

    const refreshSlider = () => {
      if (resizeRaf) {
        cancelAnimationFrame(resizeRaf);
      }
      resizeRaf = requestAnimationFrame(() => {
        if ($slider.hasClass('slick-initialized')) {
          $slider.slick('setPosition');
        }
      });
    };

    const initSlider = () => {
      if (!$slider || $slider.length === 0) {
        return;
      }

      if ($slider.hasClass('slick-initialized')) {
        $slider.slick('unslick');
      }

      $slider.slick({
        slidesToShow: slidesFor(4),
        slidesToScroll: 1,
        infinite: shouldLoop,
        dots: false,
        arrows: sliderProducts.length > 2,
        variableWidth: false,
        centerMode: false,
        adaptiveHeight: true,
        swipe: true,
        swipeToSlide: true,
        touchMove: true,
        draggable: sliderProducts.length > 1,
        respondTo: 'window',
        speed: 400,
        cssEase: 'ease',
        touchThreshold: 8,
        mobileFirst: false,
        responsive: [
          {
            breakpoint: 1280,
            settings: {
              slidesToShow: slidesFor(3)
            }
          },
          {
            breakpoint: 1024,
            settings: {
              slidesToShow: slidesFor(3)
            }
          },
          {
            breakpoint: 900,
            settings: {
              slidesToShow: slidesFor(2)
            }
          },
          {
            breakpoint: 768,
            settings: {
              slidesToShow: slidesFor(2),
              arrows: false,
              dots: true
            }
          },
          {
            breakpoint: 640,
            settings: {
              slidesToShow: slidesFor(1),
              arrows: false,
              dots: true
            }
          },
          {
            breakpoint: 480,
            settings: {
              slidesToShow: slidesFor(1),
              arrows: false,
              dots: true
            }
          }
        ]
      });

      refreshSlider();
      $(window).on('resize.heroSlider orientationchange.heroSlider', refreshSlider);

      if (typeof ResizeObserver !== 'undefined' && sliderRef.current) {
        resizeObserver = new ResizeObserver(() => refreshSlider());
        resizeObserver.observe(sliderRef.current);
      }
    };

    const timeoutId = setTimeout(() => {
      rafId = requestAnimationFrame(initSlider);
    }, 80);

    return () => {
      clearTimeout(timeoutId);
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      if (resizeRaf) {
        cancelAnimationFrame(resizeRaf);
      }
      $(window).off('.heroSlider');
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if ($slider.hasClass('slick-initialized')) {
        $slider.slick('unslick');
      }
    };
  }, [loadingProducts, sliderProducts]);

  if (loadingProducts) {
    return (
      <div className="hero-slider-wrapper">
        <div className="hero-slider-loading">Loading products...</div>
      </div>
    );
  }

  if (sliderProducts.length === 0 && !loadingProducts) {
    // Don't render if no products found
    return null;
  }

  const handleProductClick = (product) => {
    if (product._id || product.slug) {
      navigate(`/product/${product._id || product.slug}`);
    }
  };

  return (
    <div className="hero-slider-wrapper">
      <div className="text-center" style={{ marginBottom: '4px' }}>
        <Title text1="BEST SELLING" text2="Shoes" />
      </div>
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
        <Link to="/category/shoes" className="hero-view-all-button">
          View All
        </Link>
      </div>
    </div>
  );
};

export default HeroSlider;

