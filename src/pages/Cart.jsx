import React, { useContext, useEffect, useState } from 'react'
import Title from '../components/Title'
import { ShopContext } from '../context/ShopContext'
import { assets } from '../assets/assets';
import CartTotal from '../components/CartTotal';
import QuantityStepper from '../components/QuantityStepper';
import CartSteps from '../components/CartSteps';
import Accordion from '../components/Accordion';
import CartRecommendations from '../components/CartRecommendations';
import CartStickyBar from '../components/CartStickyBar';

const Cart = () => {

  const { products, currency, navigate, cartItems, updateQuantity } = useContext(ShopContext);

  const [cartData, setCartData] = useState([]);

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
    console.log(tempData);
    setCartData(tempData)
  }, [cartItems])

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

        <div className='space-y-4'>
          {cartData.map((item, index) => {
            const productData = products.find((product) => product._id === item._id);
            const cover = Array.isArray(productData?.image)
              ? (productData.image[0] || '')
              : (Array.isArray(productData?.images) ? (productData.images[0] || '') : (productData?.image || ''));

          return (
            <div key={index} className='rounded-md border bg-white p-4 sm:p-5 text-gray-700 flex items-center gap-4 sm:gap-6 hover:shadow-md transition-all duration-200'>
              <img className='w-20 h-20 rounded-md object-cover border' src={cover} alt="" />
              <div className='flex-1 min-w-0'>
                <p className='text-sm sm:text-base font-medium truncate'>{productData?.name}</p>
                <div className='mt-2 flex items-center gap-3'>
                  <span className='text-sm font-semibold'>{currency}{productData?.price}</span>
                  {item.size && <span className='text-xs px-2 py-1 rounded-full border bg-slate-50'>{item.size}</span>}
                </div>
                <div className='mt-3 hidden sm:flex items-center gap-6 text-xs text-gray-500'>
                  <button className='underline' onClick={() => updateQuantity(item._id, item.size, 0)}>Remove</button>
                  <button className='underline opacity-50 cursor-not-allowed' title='Coming soon'>Move to wishlist</button>
                </div>
              </div>
              <div className='flex items-center gap-3'>
                <QuantityStepper
                  value={item.quantity}
                  min={1}
                  onChange={(q) => updateQuantity(item._id, item.size, q)}
                />
                <button
                  type='button'
                  aria-label='Remove item'
                  onClick={() => updateQuantity(item._id, item.size, 0)}
                  className='p-2 rounded hover:bg-gray-100 active:scale-95 transition sm:hidden'
                >
                  <img className='w-5 sm:w-5' src={assets.bin_icon} alt='' />
                </button>
              </div>
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
          <Accordion title="Gift Voucher">
            <div className='flex gap-2'>
              <input className='flex-1 border rounded px-3 h-10' placeholder='Enter voucher code' />
              <button className='h-10 px-4 rounded bg-black text-white text-sm'>Redeem</button>
            </div>
          </Accordion>
        </div>

        {/* Totals removed from My Bag (shown on Payment step) */}

        <CartRecommendations />
      </div>

      <CartStickyBar
        buttonText="CONTINUE"
        onClick={() => navigate('/address')}
        disabled={cartData.length === 0}
      />

    </div>
  )
}

export default Cart
