import React, { useContext, useEffect, useState } from 'react';
import { ShopContext } from '../context/ShopContext';
import Carousel from './Carousel';

const NO_IMAGE_PLACEHOLDER = '/assets/no-image.png';

const Bestsellers = () => {
  const { products, currency, loadingProducts } = useContext(ShopContext);
  const [bestsellers, setBestsellers] = useState([]);
  const [baseWidth, setBaseWidth] = useState(280);

  useEffect(() => {
    const updateWidth = () => {
      setBaseWidth(window.innerWidth < 640 ? 250 : 280);
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Load top 12 products from shoes section
  useEffect(() => {
    if (loadingProducts) return;

    if (Array.isArray(products) && products.length > 0) {
      const shoesProducts = products
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

      setBestsellers(shoesProducts);
    }
  }, [products, loadingProducts]);

  if (loadingProducts) {
    return (
      <section className="my-10" id="bestsellers">
        <div className="text-center py-8">
          <div className="inline-flex gap-3 items-center mb-3 select-none">
            <p className="uppercase tracking-[0.18em] text-[11px] sm:text-xs text-gray-500">
              BESTSELLERS
            </p>
            <p className="w-8 sm:w-12 h-[1px] sm:h-[2px] bg-gray-300"></p>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 flex justify-center">
          <div className="animate-pulse bg-gray-200 rounded-xl" style={{ width: '300px', height: '400px' }} />
        </div>
      </section>
    );
  }

  if (bestsellers.length === 0) {
    return null;
  }

  return (
    <section className="my-10" id="bestsellers">
      <div className="text-center py-8">
        <div className="inline-flex gap-3 items-center mb-3 select-none">
          <p className="uppercase tracking-[0.18em] text-[11px] sm:text-xs text-gray-500">
            BESTSELLERS
          </p>
          <p className="w-8 sm:w-12 h-[1px] sm:h-[2px] bg-gray-300"></p>
        </div>
        <p className="text-xs sm:text-sm text-gray-500 mt-2">Top selling items this week</p>
      </div>

      <div className="max-w-6xl mx-auto px-4 flex justify-center">
        <div style={{ height: '500px', position: 'relative', width: '100%', maxWidth: '1200px' }}>
          <Carousel
            items={bestsellers}
            baseWidth={baseWidth}
            autoplay={true}
            autoplayDelay={3000}
            pauseOnHover={true}
            loop={true}
            round={false}
            currency={currency}
          />
        </div>
      </div>
    </section>
  );
};

export default Bestsellers;
