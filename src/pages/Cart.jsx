import React, { useContext, useEffect, useState } from 'react'
import Title from '../components/Title'
import { ShopContext } from '../context/ShopContext'
import { assets } from '../assets/assets';
import CartTotal from '../components/CartTotal';
import QuantityStepper from '../components/QuantityStepper';

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

  const buildWhatsAppMessage = () => {
    const lines = [];
    lines.push("Hi! I'd like to order these items:");
    lines.push("");
    for (const it of cartData) {
      const p = products.find((pr) => String(pr._id) === String(it._id) || String(pr.slug) === String(it._id));
      if (!p) continue;
      const pid = String(p._id ?? p.slug ?? it._id);
      const url = `${window.location.origin}/product/${pid}`;
      const sizeText = it.size && it.size !== 'std' ? ` (Size: ${it.size})` : '';
      const qtyText = it.quantity > 1 ? ` x${it.quantity}` : '';
      lines.push(`• ${p.name || p.title}${sizeText}${qtyText} – ${url}`);
    }
    const total = cartData.reduce((sum, it) => {
      const p = products.find((pr) => String(pr._id) === String(it._id) || String(pr.slug) === String(it._id));
      return sum + (p ? (Number(p.price) || 0) * (Number(it.quantity) || 0) : 0);
    }, 0);
    if (total > 0) {
      lines.push("");
      lines.push(`Estimated total: ${currency}${total.toLocaleString()}`);
    }
    lines.push("");
    lines.push("Please confirm availability and payment options. Thanks!");
    return lines.join("\n");
  };

  const openWhatsApp = () => {
    const msg = buildWhatsAppMessage();
    const href = `https://wa.me/919933778870?text=${encodeURIComponent(msg)}`;
    window.open(href, '_blank', 'noopener');
  };

  return (
    <div className='border-t pt-14'>

      <div className='text-2xl mb-3'>
        <Title text1={'YOUR'} text2={'CART'} />
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
                  className='p-2 rounded hover:bg-gray-100 active:scale-95 transition'
                >
                  <img className='w-5 sm:w-5' src={assets.bin_icon} alt='' />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div className='flex justify-end my-20'>
        <div className='w-full sm:w-[450px]'>
          <CartTotal />
          <div className='w-full text-end'>
            <button onClick={openWhatsApp} disabled={cartData.length === 0} className={`text-sm my-8 px-8 py-3 rounded ${cartData.length === 0 ? 'bg-gray-300 text-white cursor-not-allowed' : 'bg-black text-white hover:opacity-90'}`}>
              BUY ON WHATSAPP
            </button>
          </div>
        </div>

      </div>

    </div>
  )
}

export default Cart
