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

const AllCategoriesSlider = () => {
  const sliderRef = useRef(null);
  const [sliderProducts, setSliderProducts] = useState([]);
  const { products, loadingProducts } = useContext(ShopContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (!loadingProducts && Array.isArray(products) && products.length > 0) {
      // Get all unique categories
      const categoryMap = new Map();
      
      // Group products by categoryRaw
      products.forEach(p => {
        const category = p.categoryRaw || p.category || 'Misc';
        if (!categoryMap.has(category)) {
          categoryMap.set(category, []);
        }
        categoryMap.get(category).push(p);
      });

      // Take first product from each category (up to 21)
      const allCategoryProducts = [];
      const categories = Array.from(categoryMap.keys());
      
      for (const category of categories.slice(0, 21)) {
        const categoryProducts = categoryMap.get(category);
        if (categoryProducts && categoryProducts.length > 0) {
          const product = categoryProducts[0];
          allCategoryProducts.push({
            _id: product._id || product.slug || '',
            title: product.name || '',
            price: Number(product.price || 0),
            mrp: Number(product.mrp || 0),
            image: product.image || (Array.isArray(product.images) ? product.images[0] : '') || '',
            slug: product.slug || product._id || '',
            category: category
          });
        }
      }

      // Filter out invalid products
      const validProducts = allCategoryProducts.filter(p => p._id && p.title);
      setSliderProducts(validProducts);
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
        slidesToShow: slidesFor(3),
        slidesToScroll: 1,
        infinite: shouldLoop,
        dots: false,
        arrows: sliderProducts.length > 2,
        variableWidth: false,
        centerMode: true,
        centerPadding: '120px',
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
              slidesToShow: slidesFor(3),
              centerMode: true,
              centerPadding: '100px'
            }
          },
          {
            breakpoint: 1024,
            settings: {
              slidesToShow: slidesFor(3),
              centerMode: true,
              centerPadding: '80px'
            }
          },
          {
            breakpoint: 900,
            settings: {
              slidesToShow: slidesFor(2),
              centerMode: true,
              centerPadding: '60px'
            }
          },
          {
            breakpoint: 768,
            settings: {
              slidesToShow: slidesFor(2),
              centerMode: true,
              centerPadding: '40px',
              arrows: false,
              dots: false
            }
          },
          {
            breakpoint: 640,
            settings: {
              slidesToShow: slidesFor(2),
              centerMode: true,
              centerPadding: '20px',
              arrows: false,
              dots: false
            }
          },
          {
            breakpoint: 480,
            settings: {
              slidesToShow: slidesFor(2),
              centerMode: true,
              centerPadding: '20px',
              arrows: false,
              dots: false
            }
          }
        ]
      });

      refreshSlider();
      $(window).on('resize.allCategoriesSlider orientationchange.allCategoriesSlider', refreshSlider);

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
      $(window).off('.allCategoriesSlider');
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
        <Title text1="SHOP BY" text2="Category" />
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
        <Link to="/collection" className="hero-view-all-button">
          View All
        </Link>
      </div>
    </div>
  );
};

export default AllCategoriesSlider;

