import React, { useEffect, useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShopContext } from '../context/ShopContext';
import Title from './Title';
import './HeroSlider.css';

const NO_IMAGE_PLACEHOLDER = '/assets/no-image.svg';

const DiscountedSlider = () => {
  const [sliderProducts, setSliderProducts] = useState([]);
  const { products, loadingProducts } = useContext(ShopContext);
  const navigate = useNavigate();

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

  const ProductCard = ({ product }) => (
    <div
      className="flex-shrink-0 w-[42vw] sm:w-[30vw] md:w-[24vw] lg:w-[20vw] xl:w-[16vw] max-w-[220px] px-1.5"
    >
      <div
        className="bg-white rounded-lg overflow-hidden shadow-sm cursor-pointer h-full flex flex-col hover:shadow-md transition-shadow"
        onClick={() => handleProductClick(product)}
      >
        <div className="aspect-square overflow-hidden bg-gray-50">
          <img
            src={product.image || NO_IMAGE_PLACEHOLDER}
            alt={product.title || 'Product'}
            className="w-full h-full object-contain"
            onError={(e) => { e.target.src = NO_IMAGE_PLACEHOLDER; }}
            draggable={false}
          />
        </div>
        <div className="p-2.5 flex flex-col gap-1 flex-1">
          <h3 className="text-xs sm:text-sm font-medium text-gray-900 line-clamp-2 leading-snug">
            {product.title || 'Product'}
          </h3>
          <div className="flex items-center gap-2 mt-auto">
            <span className="text-sm font-semibold text-gray-900">
              ₹{Number(product.price || 0).toLocaleString('en-IN')}
            </span>
            {product.mrp && product.mrp > product.price && (
              <span className="text-xs text-gray-400 line-through">
                ₹{Number(product.mrp).toLocaleString('en-IN')}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full py-4 sm:py-6 bg-gray-50/50 overflow-hidden">
      <div className="text-center mb-4">
        <Title text1="SPECIAL" text2="Offers" />
      </div>

      {/* Infinite Marquee */}
      <div className="relative">
        <div className="flex slider-track">
          {sliderProducts.map((product, index) => (
            <ProductCard key={`a-${product._id || index}`} product={product} />
          ))}
          {sliderProducts.map((product, index) => (
            <ProductCard key={`b-${product._id || index}`} product={product} />
          ))}
        </div>
      </div>

      <div className="flex justify-center mt-5">
        <Link
          to="/category/discounted"
          className="px-6 py-2.5 bg-gray-900 text-white text-xs font-medium tracking-wide hover:bg-gray-800 transition-colors"
        >
          View All
        </Link>
      </div>
    </div>
  );
};

export default DiscountedSlider;
