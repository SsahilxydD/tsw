import React from 'react'
import Title from '../components/Title';
import Button from '../components/Button';
import { useNavigate } from 'react-router-dom';

const Orders = () => {
  const navigate = useNavigate();

  return (
    <div className='border-t pt-16 px-4 max-w-6xl mx-auto pb-20 md:pb-0'>
      <div className='text-2xl'>
        <Title text1={'MY'} text2={'ORDERS'} />
      </div>

      <div className="mt-12 text-center min-h-[40vh] flex flex-col items-center justify-center">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gray-100 mb-6">
          <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-3">No orders yet</h2>
        <p className="text-gray-600 mb-2 max-w-md mx-auto">
          Your order history will appear here once you place an order via WhatsApp.
        </p>
        <p className="text-sm text-gray-500 mb-8 max-w-md mx-auto">
          For existing order tracking, please contact us on WhatsApp.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={() => navigate('/collection')}>
            Start Shopping
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              const phone = import.meta.env.VITE_WHATSAPP_PHONE?.replace(/\D/g, '') || '919933778870';
              window.open(`https://wa.me/${phone}?text=${encodeURIComponent('Hi, I want to check my order status.')}`, '_blank');
            }}
          >
            Track via WhatsApp
          </Button>
        </div>
      </div>
    </div>
  )
}

export default Orders
