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
            {cartData.filter(i => i.quantity>0).length} item{cartData.filter(i => i.quantity>0).length!==1?'s':''} selected
          </div>
        </div>

        {/* Item list: full-height, no inner scroll to avoid glitches */}
        <div className='space-y-4 overflow-x-hidden'>
          {cartData.map((item, index) => {
            const productData = products.find((product) => product._id === item._id);
            const cover = Array.isArray(productData?.image)
              ? (productData.image[0] || '')
              : (Array.isArray(productData?.images) ? (productData.images[0] || '') : (productData?.image || ''));

          const k = keyFor(item);
          const isLeaving = leaving.has(k);
          const unit = Number(productData?.price) || 0;
          const lineTotal = unit * (Number(item.quantity) || 0);
          const sizeLabel = isFootwearProduct(productData)
            ? String(toUKLabel(item.size) || item.size).replace(/^UK-/, '')
            : item.size;

          return (
            <div
              key={k}
              className={`rounded-md border bg-white p-4 sm:p-5 text-gray-800 hover:shadow-md transition-all duration-200 ${isLeaving ? 'animate-cart-leave pointer-events-none' : 'animate-soft-reveal'}`}
            >
              <div className='grid grid-cols-[80px_1fr] sm:grid-cols-[96px_1fr] items-start gap-4 sm:gap-6'>
                <img
                  className='w-20 h-20 sm:w-24 sm:h-24 rounded-md object-cover border'
                  src={cover}
                  alt={productData?.name || 'Product'}
                  loading='lazy'
                />
                <div className='min-w-0'>
                  <p className='text-[15px] sm:text-base font-medium leading-5 sm:leading-6 break-words line-clamp-2 min-h-[2.6rem]'>
                    {productData?.name}
                  </p>
                  <div className='mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-600'>
                    {item.size && (
                      <span className='px-2 py-1 border rounded-md bg-slate-50'>Size: {sizeLabel}</span>
                    )}
                    <span className='px-2 py-1 border rounded-md bg-white font-semibold'>{currency}{unit}</span>
                    <span className='text-gray-500'>Qty</span>
                  </div>
                  <div className='mt-2'>
                    <QuantityStepper
                      size='compact'
                      value={item.quantity}
                      min={1}
                      onChange={(q) => q <= 0 ? requestRemove(item._id, item.size) : updateQuantity(item._id, item.size, q)}
                    />
                  </div>
                  <div className='mt-3 flex items-center text-sm'>
                    <span className='text-gray-600'>Subtotal</span>
                    <span className='font-semibold ml-auto'>{currency}{lineTotal}</span>
                    <button
                      type='button'
                      onClick={() => requestRemove(item._id, item.size)}
                      className='ml-4 hidden sm:inline text-xs text-gray-500 underline pressable'
                    >
                      Remove
                    </button>
                    <button
                      type='button'
                      aria-label='Remove item'
                      onClick={() => requestRemove(item._id, item.size)}
                      className='ml-2 sm:hidden p-2 rounded hover:bg-gray-100 active:scale-95 transition pressable'
                    >
                      <img className='w-5' src={assets.bin_icon} alt='' />
                    </button>
                  </div>
                </div>
              </div>
              {/* End content block */}
            </div>
          )
        })}
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


