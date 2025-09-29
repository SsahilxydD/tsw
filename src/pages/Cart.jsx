import React, { useContext, useEffect, useMemo, useRef, useState } from 'react'
import Title from '../components/Title'
import { ShopContext } from '../context/ShopContext'
import { assets } from '../assets/assets';
import CartTotal from '../components/CartTotal';
import QuantityStepper from '../components/QuantityStepper';
import CartSteps from '../components/CartSteps';
import Accordion from '../components/Accordion';
import CartRecommendations from '../components/CartRecommendations';
// import CartStickyBar from '../components/CartStickyBar';
import { isFootwearProduct, toUKLabel } from '../utils/size';

const Cart = () => {

  const { products, currency, navigate, cartItems, updateQuantity } = useContext(ShopContext);

  const [cartData, setCartData] = useState([]);
  // Track items that are animating out (delay actual removal)
  const [leaving, setLeaving] = useState(new Set());
  const leaveTimersRef = useRef(new Map());

  const keyFor = useMemo(() => (it) => `${it._id}::${it.size || 'std'}` , []);

  // cleanup timers on unmount
  useEffect(() => () => {
    try {
      leaveTimersRef.current.forEach((t) => clearTimeout(t));
      leaveTimersRef.current.clear();
    } catch {}
  }, []);

  useEffect(() => {
    const tempData = []
    for (const items in cartItems) {
      for (const item in cartItems[items]) {
        if (cartItems[items][item] > 0) {
          tempData.push({
            _id: items,
            size: item,
            quantity: cartItems[items][item]
          })
        }
      }
    }
    setCartData(tempData)
  }, [cartItems])


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

  // No checkout on My Bag; proceed to Address.

  return (
    <div className='border-t pt-14'>

      <div className='mb-5'>
        <CartSteps active="bag" />
      </div>

      <div className='max-w-6xl mx-auto px-4'>
        <div className='flex items-center justify-between mb-4'>
          <div className='text-2xl'>
            <Title text1={'YOUR'} text2={'CART'} />
          </div>
          <div className='text-sm text-gray-600'>
            {cartData.filter(i => i && i.quantity > 0).length} item{cartData.filter(i => i && i.quantity > 0).length !== 1 ? 's' : ''} selected
          </div>
        </div>

        <div className='space-y-4 max-h-[50vh] overflow-auto pr-1'>
          {cartData.filter(item => item && item._id && item.quantity > 0).length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">Your cart is empty</p>
              <button 
                onClick={() => navigate('/collection')}
                className="mt-4 px-6 py-2 bg-black text-white rounded hover:bg-gray-800 transition-colors"
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            cartData.filter(item => item && item._id && item.quantity > 0).map((item, index) => {
            const productData = products.find((product) => product._id === item._id);
            
            // Skip rendering if product not found
            if (!productData) {
              console.warn(`Product not found for cart item: ${item._id}`);
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
              <img 
                className='w-20 h-20 rounded-md object-cover border' 
                src={cover || '/placeholder-image.png'} 
                alt={productData?.name || 'Product'} 
                onError={(e) => {
                  e.target.src = '/placeholder-image.png';
                }}
              />
              <div className='flex-1 min-w-0'>
                <p className='text-sm sm:text-base font-medium truncate'>{productData?.name || 'Unknown Product'}</p>
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
                <div className='mt-3 hidden sm:flex items-center gap-6 text-xs text-gray-500'>
                  <button className='underline pressable' onClick={() => requestRemove(item._id, item.size)}>Remove</button>
                  <button className='underline opacity-50 cursor-not-allowed' title='Coming soon'>Move to wishlist</button>
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
                  className='p-2 rounded hover:bg-gray-100 active:scale-95 transition sm:hidden pressable'
                >
                  <img className='w-5 sm:w-5' src={assets.bin_icon} alt='' />
                </button>
              </div>
            </div>
          )
        })
          )}
        </div>

        <div className='mt-8 grid sm:grid-cols-2 gap-4'>
          <Accordion title="Apply Coupon">
            <div className='flex gap-2'>
              <input className='flex-1 border rounded px-3 h-10' placeholder='Enter coupon code' />
              <button className='h-10 px-4 rounded bg-black text-white text-sm'>Apply</button>
            </div>
          </Accordion>
        </div>

        {/* Primary action placed beneath coupon section */}
        <div className='mt-6 flex justify-center'>
          <button
            type='button'
            disabled={cartData.length === 0}
            onClick={() => navigate('/address')}
            className={`px-6 py-3 text-sm rounded text-white pressable ${cartData.length === 0 ? 'bg-gray-300 cursor-not-allowed' : 'bg-black hover:opacity-90'}`}
          >
            Proceed to checkout
          </button>
        </div>

        {/* Totals removed from My Bag (shown on Payment step) */}

        <CartRecommendations />
      </div>


      {/* Removed sticky bar on cart page to keep CTA near coupon */}

    </div>
  )
}

export default Cart


