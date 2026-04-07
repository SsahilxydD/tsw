import React, { useContext } from 'react';
import { ShopContext } from '../context/ShopContext';

const FREE_SHIPPING_THRESHOLD = 999;

export default function ShippingProgressBar() {
  const { getCartSubtotal, currency } = useContext(ShopContext);
  const subtotal = getCartSubtotal();
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const progress = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);
  const unlocked = remaining <= 0;

  if (subtotal === 0) return null;

  return (
    <div className="py-3">
      {unlocked ? (
        <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          You've unlocked FREE shipping!
        </div>
      ) : (
        <p className="text-xs text-gray-600 mb-1.5">
          Add <span className="font-semibold text-gray-900">{currency}{remaining.toLocaleString('en-IN')}</span> more for <span className="font-semibold text-green-600">FREE shipping</span>
        </p>
      )}
      <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${unlocked ? 'bg-green-500' : 'bg-green-400'}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
