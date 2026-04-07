// src/pages/Wishlist.jsx
import React, { useContext, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ShopContext } from '../context/ShopContext';
import Title from '../components/Title';
import ProductItem from '../components/ProductItem';
import Button from '../components/Button';
import SafeImg from '../components/SafeImg';
import SEO from '../components/SEO';

const Wishlist = () => {
  const { wishlist, products, productLookup, currency, removeFromWishlist, moveToCart, clearWishlistItems, navigate } = useContext(ShopContext);
  const [showClearConfirm, setShowClearConfirm] = React.useState(false);

  // Get wishlist products
  const wishlistProducts = useMemo(() => {
    if (!wishlist || wishlist.length === 0 || !products || products.length === 0) {
      return [];
    }

    return wishlist
      .map(productId => productLookup.get(String(productId)))
      .filter(Boolean);
  }, [wishlist, productLookup, products]);

  if (wishlistProducts.length === 0) {
    return (
      <div className="min-h-[60vh]">
        <SEO
          title="Wishlist – Solo Wardrobe"
          description="Your saved items"
          url={typeof window !== 'undefined' ? window.location.href : ''}
          canonical={typeof window !== 'undefined' ? window.location.href : ''}
          type="website"
        />
        <div className="max-w-6xl mx-auto px-4 pt-12 sm:pt-16 pb-20 md:pb-16">
          <Title text1="MY" text2="WISHLIST" />
          <div className="mt-12 text-center">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gray-100 mb-6">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">Your wishlist is empty</h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Start adding items you love to your wishlist. You can save them for later and add them to your cart whenever you're ready.
            </p>
            <Button onClick={() => navigate('/collection')}>
              Start Shopping
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh]">
      <SEO
        title="Wishlist – Solo Wardrobe"
        description={`Your wishlist with ${wishlistProducts.length} item${wishlistProducts.length !== 1 ? 's' : ''}`}
        url={typeof window !== 'undefined' ? window.location.href : ''}
        canonical={typeof window !== 'undefined' ? window.location.href : ''}
        type="website"
      />
      <div className="max-w-6xl mx-auto px-4 pt-12 sm:pt-16 pb-20 md:pb-16">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
          <Title text1="MY" text2="WISHLIST" />
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {wishlistProducts.length} item{wishlistProducts.length !== 1 ? 's' : ''}
            </span>
            {wishlistProducts.length > 0 && (
              showClearConfirm ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Clear all?</span>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      clearWishlistItems();
                      setShowClearConfirm(false);
                    }}
                  >
                    Yes
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowClearConfirm(false)}
                  >
                    No
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowClearConfirm(true)}
                >
                  Clear All
                </Button>
              )
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
          {wishlistProducts.map((product) => {
            const cover = Array.isArray(product.image) 
              ? (product.image[0] || '') 
              : (Array.isArray(product.images) ? (product.images[0] || '') : (product.image || ''));

            return (
              <div key={product._id} className="group relative">
                <Link to={`/product/${product._id}`} className="block">
                  <div className="relative aspect-[3/4] overflow-hidden rounded-lg sm:rounded-xl bg-gray-100 mb-2 sm:mb-3">
                    <SafeImg
                      src={cover}
                      alt={product.name}
                      width={400}
                      height={533}
                      className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                    />
                  </div>
                  <h3 className="text-xs sm:text-sm font-medium text-gray-900 line-clamp-2 mb-1">
                    {product.name}
                  </h3>
                  <p className="text-xs sm:text-sm font-bold text-gray-900 mb-3">
                    {currency}{Number(product.price).toLocaleString('en-IN')}
                  </p>
                </Link>
                
                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => {
                      const hasSizes = Array.isArray(product.sizes) && product.sizes.length > 0;
                      if (hasSizes) {
                        navigate(`/product/${product._id}`);
                      } else {
                        moveToCart(product._id, 'std');
                      }
                    }}
                  >
                    {Array.isArray(product.sizes) && product.sizes.length > 0 ? 'Select Size' : 'Add to Cart'}
                  </Button>
                  <button
                    onClick={() => removeFromWishlist(product._id)}
                    className="p-2 border border-gray-300 rounded-lg hover:border-red-500 hover:text-red-500 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                    aria-label={`Remove ${product.name} from wishlist`}
                  >
                    <svg className="w-5 h-5" fill="currentColor" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Wishlist;

