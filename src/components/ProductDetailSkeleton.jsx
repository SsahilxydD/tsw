// src/components/ProductDetailSkeleton.jsx
import React from 'react';

/**
 * Skeleton loader for product detail page
 * Matches Product page layout
 */
const ProductDetailSkeleton = () => {
  return (
    <div className="animate-pulse">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Image Gallery Skeleton */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="aspect-square bg-gray-200 rounded-lg" />
            
            {/* Thumbnails */}
            <div className="flex gap-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="w-20 h-20 bg-gray-200 rounded-md" />
              ))}
            </div>
          </div>

          {/* Product Info Skeleton */}
          <div className="space-y-6">
            {/* Brand */}
            <div className="h-4 bg-gray-200 rounded w-1/4" />
            
            {/* Product Name */}
            <div className="space-y-2">
              <div className="h-6 bg-gray-200 rounded w-3/4" />
              <div className="h-6 bg-gray-200 rounded w-1/2" />
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <div className="h-8 bg-gray-200 rounded w-32" />
              <div className="h-5 bg-gray-200 rounded w-24" />
            </div>

            {/* Sizes */}
            <div className="space-y-3">
              <div className="h-5 bg-gray-200 rounded w-24" />
              <div className="flex flex-wrap gap-2">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-10 w-16 bg-gray-200 rounded" />
                ))}
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <div className="h-12 bg-gray-200 rounded flex-1 sm:flex-none sm:w-40" />
              <div className="h-12 bg-gray-200 rounded w-32" />
            </div>

            {/* Description */}
            <div className="space-y-2 pt-4 border-t">
              <div className="h-4 bg-gray-200 rounded w-full" />
              <div className="h-4 bg-gray-200 rounded w-full" />
              <div className="h-4 bg-gray-200 rounded w-3/4" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailSkeleton;

