import React, { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom';
import Title from '../components/Title'
import { ShopContext } from '../context/ShopContext'
import { assets } from '../assets/assets';
import CartTotal from '../components/CartTotal';
import QuantityStepper from '../components/QuantityStepper';
import CartSteps from '../components/CartSteps';
import Accordion from '../components/Accordion';
import CartRecommendations from '../components/CartRecommendations';
import CartStickyBar from '../components/CartStickyBar';
import { isFootwearProduct, toUKLabel } from '../utils/size';
import SafeImg from '../components/SafeImg';
import ShippingProgressBar from '../components/ShippingProgressBar';
import PriceDisplay from '../components/PriceDisplay';
import Button from '../components/Button';
import Input from '../components/Input';
import CartItemSkeleton from '../components/CartItemSkeleton';
import Loading from '../components/Loading';

const Cart = () => {

  const { products, productLookup, currency, navigate, cartItems, updateQuantity, loadingProducts, addToWishlist, applyCoupon, removeCoupon, appliedCoupon } = useContext(ShopContext);
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState('');

  const [cartData, setCartData] = useState([]);
  // Track items that are animating out (delay actual removal)
  const [leaving, setLeaving] = useState(new Set());
  const leaveTimersRef = useRef(new Map());

  const keyFor = useMemo(() => (it) => `${it._id}::${it.size || 'std'}`, []);

  // cleanup timers on unmount
  useEffect(() => () => {
    try {
      leaveTimersRef.current.forEach((t) => clearTimeout(t));
      leaveTimersRef.current.clear();
    } catch { }
  }, []);

  useEffect(() => {
    // Don't filter out items if products are still loading
    // This prevents removing valid items before products finish loading
    if (loadingProducts) {
      return;
    }

    const tempData = [];
    const orphans = []; // collect orphaned items for batch removal
    for (const items in cartItems) {
      for (const item in cartItems[items]) {
        if (cartItems[items][item] > 0) {
          // Check if product exists before adding to cart data
          const productExists = productLookup.has(items);
          if (productExists) {
            tempData.push({
              _id: items,
              size: item,
              quantity: cartItems[items][item]
            });
          } else {
            orphans.push({ id: items, size: item });
          }
        }
      }
    }
    // Batch-remove all orphaned items in a single pass after computing the full list
    for (const { id, size } of orphans) {
      updateQuantity(id, size, 0);
    }
    setCartData(tempData);
  }, [cartItems, products, updateQuantity, loadingProducts])


  // Remove stale leaving flags when items are gone or re-added
  useEffect(() => {
    setLeaving((prev) => {
      const next = new Set();
      const present = new Set(cartData.map(keyFor));
      for (const k of prev) if (present.has(k)) next.add(k);
      return next;
    });
  }, [cartData, keyFor]);

  const requestRemove = (id, size) => {
    const k = `${id}::${size || 'std'}`;
    if (leaving.has(k)) return; // already animating out
    setLeaving((prev) => new Set(prev).add(k));
    const t = setTimeout(() => {
      try { updateQuantity(id, size, 0); } finally {
        leaveTimersRef.current.delete(k);
      }
    }, 240); // match CSS leave duration
    leaveTimersRef.current.set(k, t);
  };

  const handleApplyCoupon = () => {
    const code = couponCode.trim().toUpperCase();
    if (!code) {
      setCouponError('Please enter a coupon code');
      return;
    }
    const result = applyCoupon(code);
    if (result.success) {
      setCouponCode('');
      setCouponError('');
    } else {
      setCouponError(result.error || 'Invalid coupon code');
    }
  };

  // No checkout on My Bag; proceed to Address.

  return (
    <div className='border-t pt-14 pb-20 md:pb-0'>

      <div className='mb-5'>
        <CartSteps active="bag" />
      </div>

      <div className='max-w-6xl mx-auto px-4'>
        <div className='flex items-center justify-between mb-4'>
          <div className='text-2xl'>
            <Title text1={'YOUR'} text2={'CART'} />
          </div>
          <div className='text-sm text-gray-600'>
            {loadingProducts ? (
              <Loading size="sm" />
            ) : (
              (() => { const count = cartData.filter(i => i && i.quantity > 0).length; return `${count} item${count !== 1 ? 's' : ''} selected`; })()
            )}
          </div>
        </div>
        {loadingProducts && cartData.length === 0 ? (
          <>
            <CartItemSkeleton />
            <CartItemSkeleton />
            <CartItemSkeleton />
          </>
        ) : (
          cartData.filter(item => item && item._id && item.quantity > 0).map((item, index) => {
            const productData = productLookup.get(item._id);

            // Skip rendering if product not found
            if (!productData) {
              return null;
            }

            const cover = Array.isArray(productData?.image)
              ? (productData.image[0] || '')
              : (Array.isArray(productData?.images) ? (productData.images[0] || '') : (productData?.image || ''));

            const k = keyFor(item);
            const isLeaving = leaving.has(k);
            return (
              <div
                key={k}
                className={`rounded-md border bg-white p-4 sm:p-5 text-gray-700 flex items-center gap-4 sm:gap-6 hover:shadow-md transition-all duration-200 ${isLeaving ? 'animate-cart-leave pointer-events-none' : 'animate-soft-reveal'}`}
              >
                <Link to={`/product/${item._id}`} className="shrink-0">
                  <SafeImg
                    className='w-16 h-16 sm:w-20 sm:h-20 rounded-md object-cover border hover:opacity-80 transition-opacity'
                    src={cover || '/placeholder-image.png'}
                    alt={productData?.name || 'Product'}
                    width={64}
                    height={64}
                    quality={85}
                  />
                </Link>
                <div className='flex-1 min-w-0'>
                  <Link to={`/product/${item._id}`} className="hover:text-gray-600 transition-colors">
                    <p className='text-sm sm:text-base font-medium truncate'>{productData?.name || 'Unknown Product'}</p>
                  </Link>
                  <div className='mt-2 flex items-start gap-3 flex-wrap'>
                    <div className='flex flex-col gap-1 w-fit'>
                      {item.size && (
                        <div className='px-2 py-1 text-xs border rounded-md bg-slate-50 w-fit'>
                          {isFootwearProduct(productData)
                            ? String(toUKLabel(item.size) || item.size).replace(/^UK-/, '')
                            : item.size}
                        </div>
                      )}
                      <div className='px-2 py-1 text-sm font-semibold border rounded-md bg-white w-fit'>
                        {currency}{productData?.price || 0}
                      </div>
                    </div>
                  </div>
                  <div className='mt-3 flex items-center gap-6 text-xs text-gray-500'>
                    <Button variant="link" size="sm" onClick={() => requestRemove(item._id, item.size)} className="text-xs hidden sm:inline-flex">Remove</Button>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => {
                        addToWishlist(item._id);
                        updateQuantity(item._id, item.size, 0);
                      }}
                      className="text-xs"
                    >
                      <span className="hidden sm:inline">Move to wishlist</span>
                      <svg className="w-4 h-4 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </Button>
                  </div>
                </div>
                <div className='flex items-center gap-3 shrink-0'>
                  <QuantityStepper
                    value={item.quantity}
                    min={1}
                    onChange={(q) => q <= 0 ? requestRemove(item._id, item.size) : updateQuantity(item._id, item.size, q)}
                  />
                  <button
                    type='button'
                    aria-label='Remove item'
                    onClick={() => requestRemove(item._id, item.size)}
                    className='p-2.5 rounded hover:bg-gray-100 active:scale-95 transition sm:hidden pressable min-w-[44px] min-h-[44px] flex items-center justify-center'
                  >
                    <SafeImg className='w-5 sm:w-5' src={assets.bin_icon} alt='' width={20} height={20} quality={90} aria-hidden="true" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <ShippingProgressBar />

      <div className='mt-8 grid sm:grid-cols-2 gap-4'>
        <Accordion title="Apply Coupon">
          {appliedCoupon ? (
            <div className='space-y-3'>
              <div className='flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-md'>
                <div className='flex-1'>
                  <p className='text-sm font-medium text-green-800'>
                    Coupon Applied: <span className='font-bold'>{appliedCoupon.code}</span>
                  </p>
                  {appliedCoupon.description && (
                    <p className='text-xs text-green-600 mt-1'>{appliedCoupon.description}</p>
                  )}
                </div>
                <button
                  onClick={() => {
                    removeCoupon();
                    setCouponCode('');
                    setCouponError('');
                  }}
                  className='ml-3 text-green-700 hover:text-green-900 text-sm font-medium'
                  aria-label="Remove coupon"
                >
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <div className='space-y-2'>
              <div className='flex gap-2'>
                <Input
                  placeholder='Enter coupon code'
                  value={couponCode}
                  onChange={(e) => {
                    setCouponCode(e.target.value.toUpperCase());
                    setCouponError('');
                  }}
                  error={!!couponError}
                  errorMessage={couponError}
                  className="flex-1 h-10"
                  label="Coupon Code"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleApplyCoupon();
                    }
                  }}
                />
                <Button
                  size="sm"
                  className="h-10"
                  onClick={handleApplyCoupon}
                  disabled={!couponCode.trim()}
                >
                  Apply
                </Button>
              </div>
            </div>
          )}
        </Accordion>
      </div>

      {/* Primary action placed beneath coupon section */}
      <div className='mt-6 flex justify-center'>
        <Button
          type='button'
          disabled={cartData.length === 0}
          onClick={() => navigate('/address')}
        >
          Proceed to checkout
        </Button>
      </div>

      {/* Totals removed from My Bag (shown on Payment step) */}

      <CartRecommendations />

      <CartStickyBar
        buttonText="CHECKOUT"
        onClick={() => navigate('/address')}
        disabled={cartData.length === 0}
      />
    </div>
  )
}

export default Cart


