import React from 'react';

export default function PriceDisplay({ price, mrp, currency = '₹', compact = false }) {
  const numPrice = Number(price) || 0;
  const numMrp = Number(mrp) || 0;
  const hasDiscount = numMrp > numPrice && numPrice > 0;
  const discountPercent = hasDiscount ? Math.round(((numMrp - numPrice) / numMrp) * 100) : 0;
  const savings = hasDiscount ? numMrp - numPrice : 0;

  if (!hasDiscount) {
    return (
      <span className="font-semibold text-gray-900">
        {currency}{numPrice.toLocaleString('en-IN')}
      </span>
    );
  }

  return (
    <div className={compact ? "flex items-center gap-1.5 flex-wrap" : "space-y-1"}>
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className={`font-bold text-gray-900 ${compact ? '' : 'text-lg'}`}>
          {currency}{numPrice.toLocaleString('en-IN')}
        </span>
        <span className="text-gray-400 line-through text-xs">
          {currency}{numMrp.toLocaleString('en-IN')}
        </span>
        <span className="bg-green-100 text-green-700 text-[10px] font-bold px-1.5 py-0.5 rounded">
          SAVE {discountPercent}%
        </span>
      </div>
      {!compact && savings > 0 && (
        <p className="text-xs text-green-600 font-medium">
          You save {currency}{savings.toLocaleString('en-IN')}
        </p>
      )}
    </div>
  );
}
