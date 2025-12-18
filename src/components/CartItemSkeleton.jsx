// src/components/CartItemSkeleton.jsx
import React from 'react';

/**
 * Skeleton loader for cart items
 * Matches Cart page item layout
 */
const CartItemSkeleton = () => {
  return (
    <div className="rounded-md border bg-white p-4 sm:p-5 animate-pulse">
      <div className="flex items-center gap-4 sm:gap-6">
        {/* Image */}
        <div className="w-20 h-20 bg-gray-200 rounded-md flex-shrink-0" />
        
        {/* Content */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Product Name */}
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          
          {/* Size and Price */}
          <div className="flex gap-3">
            <div className="h-6 bg-gray-200 rounded w-16" />
            <div className="h-6 bg-gray-200 rounded w-20" />
          </div>
          
          {/* Actions (desktop) */}
          <div className="hidden sm:flex items-center gap-6">
            <div className="h-4 bg-gray-200 rounded w-16" />
            <div className="h-4 bg-gray-200 rounded w-24" />
          </div>
        </div>
        
        {/* Quantity and Remove */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="h-8 w-24 bg-gray-200 rounded" />
          <div className="h-8 w-8 bg-gray-200 rounded sm:hidden" />
        </div>
      </div>
    </div>
  );
};

export default CartItemSkeleton;

