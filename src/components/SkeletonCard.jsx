import React from "react";

/**
 * Skeleton loader for product cards
 * Matches ProductItem component layout
 */
export default function SkeletonCard() {
  return (
    <div className="group animate-pulse">
      {/* Image Container - matches ProductItem aspect ratio */}
      <div className="relative aspect-[3/4] overflow-hidden rounded-lg sm:rounded-xl bg-gray-200" />
      
      {/* Product Info - matches ProductItem spacing */}
      <div className="pt-2 sm:pt-3">
        {/* Product Name */}
        <div className="h-3 sm:h-4 bg-gray-200 rounded w-3/4 mb-1 sm:mb-2" />
        <div className="h-3 sm:h-4 bg-gray-200 rounded w-1/2 mb-1 sm:mb-2" />
        
        {/* Price */}
        <div className="h-3 sm:h-4 bg-gray-200 rounded w-1/4 mb-1.5 sm:mb-2" />
        
        {/* Size Pills */}
        <div className="flex items-center gap-1 flex-wrap mt-1">
          <div className="h-4 sm:h-5 bg-gray-200 rounded w-8 sm:w-10" />
          <div className="h-4 sm:h-5 bg-gray-200 rounded w-8 sm:w-10" />
          <div className="h-4 sm:h-5 bg-gray-200 rounded w-8 sm:w-10" />
        </div>
      </div>
    </div>
  );
}
