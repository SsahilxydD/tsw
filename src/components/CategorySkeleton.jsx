import React from "react";

const CategorySkeleton = () => (
  <div className="overflow-hidden border bg-white">
    <div className="aspect-[5/4] animate-pulse bg-gray-200" />
    <div className="p-3 space-y-2">
      <div className="h-3 w-2/3 bg-gray-200 animate-pulse" />
      <div className="h-3 w-1/3 bg-gray-200 animate-pulse" />
    </div>
  </div>
);

export default CategorySkeleton;
