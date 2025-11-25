import React, { useContext, useEffect, useState } from 'react';
import { ShopContext } from '../context/ShopContext';
import Carousel from './Carousel';

const NO_IMAGE_PLACEHOLDER = '/assets/no-image.png';

const CATEGORIES = [
  { name: 'caps', displayName: 'Cap' },
  { name: 'handbags', displayName: 'Hand bag' },
  { name: 'wallets', displayName: 'Wallet' },
  { name: 'belts', displayName: 'Belt' },
  { name: 't-shirts', displayName: 'T-shirt' },
  { name: 'shirts', displayName: 'Shirt' }
];

const BestSellersFromTopCategories = () => {
  const { products, currency, loadingProducts } = useContext(ShopContext);
  const [shoesProducts, setShoesProducts] = useState([]);
  const [categoryProducts, setCategoryProducts] = useState([]);
  const [baseWidth, setBaseWidth] = useState(200);

  // Responsive baseWidth - mobile first, optimized for side-by-side
  useEffect(() => {
    const updateWidth = () => {
      if (window.innerWidth < 640) {
        setBaseWidth(160); // Mobile: smaller cards, stacked
      } else if (window.innerWidth < 768) {
        setBaseWidth(180); // Tablet: side by side
      } else if (window.innerWidth < 1024) {
        setBaseWidth(200); // Small desktop: side by side
      } else {
        setBaseWidth(240); // Large desktop: side by side, larger cards
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Load top 12 products from shoes section
  useEffect(() => {
    if (loadingProducts) return;

    if (Array.isArray(products) && products.length > 0) {
      const shoes = products
        .filter(p => p.categoryRaw === 'shoes')
        .slice(0, 12)
        .map(p => ({
          title: p.name || '',
          image: p.image || (Array.isArray(p.images) ? p.images[0] : '') || NO_IMAGE_PLACEHOLDER,
          price: Number(p.price) || 0,
          url: p._id || p.slug ? `/product/${p._id || p.slug}` : '#',
          _id: p._id || p.slug || ''
        }))
        .filter(p => p.title && p._id);

      setShoesProducts(shoes);

      // Load 4 products from each of the 6 categories (24 total)
      const allProducts = [];
      CATEGORIES.forEach(category => {
        const categoryProds = products
          .filter(p => p.categoryRaw === category.name)
          .slice(0, 4)
          .map(p => ({
            title: p.name || '',
            image: p.image || (Array.isArray(p.images) ? p.images[0] : '') || NO_IMAGE_PLACEHOLDER,
            price: Number(p.price) || 0,
            url: p._id || p.slug ? `/product/${p._id || p.slug}` : '#',
            _id: p._id || p.slug || '',
            category: category.displayName
          }))
          .filter(p => p.title && p._id);

        allProducts.push(...categoryProds);
      });

      setCategoryProducts(allProducts);
    }
  }, [products, loadingProducts]);

  if (loadingProducts) {
    return (
      <section className="my-10" id="best-sellers-top-categories">
        <div className="text-center py-8">
          <div className="inline-flex gap-3 items-center mb-3 select-none">
            <p className="uppercase tracking-[0.18em] text-[11px] sm:text-xs text-gray-500">
              BEST SELLERS FROM TOP CATEGORIES
            </p>
            <p className="w-8 sm:w-12 h-[1px] sm:h-[2px] bg-gray-300"></p>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 flex flex-col gap-8 items-center">
          <div className="animate-pulse bg-gray-200 rounded-xl" style={{ width: '100%', maxWidth: '300px', height: '300px' }} />
          <div className="animate-pulse bg-gray-200 rounded-xl" style={{ width: '100%', maxWidth: '300px', height: '300px' }} />
        </div>
      </section>
    );
  }

  return (
    <section className="my-10" id="best-sellers-top-categories">
      <div className="text-center py-8">
        <div className="inline-flex gap-3 items-center mb-3 select-none">
          <p className="uppercase tracking-[0.18em] text-[11px] sm:text-xs text-gray-500">
            BEST SELLERS FROM TOP CATEGORIES
          </p>
          <p className="w-8 sm:w-12 h-[1px] sm:h-[2px] bg-gray-300"></p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-center justify-center">
          {/* Shoes Carousel */}
          {shoesProducts.length > 0 && (
            <div className="flex-1 w-full md:w-auto" style={{ maxWidth: '100%' }}>
              <Carousel
                items={shoesProducts}
                baseWidth={baseWidth}
                autoplay={true}
                autoplayDelay={3000}
                pauseOnHover={true}
                loop={true}
                round={false}
                currency={currency}
              />
            </div>
          )}

          {/* Category Products Carousel */}
          {categoryProducts.length > 0 && (
            <div className="flex-1 w-full md:w-auto" style={{ maxWidth: '100%' }}>
              <Carousel
                items={categoryProducts}
                baseWidth={baseWidth}
                autoplay={true}
                autoplayDelay={3000}
                pauseOnHover={true}
                loop={true}
                round={false}
                currency={currency}
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default BestSellersFromTopCategories;

