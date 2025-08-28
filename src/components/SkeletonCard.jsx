import React from "react";

export default function SkeletonCard() {
  return (
    <div className="animate-pulse">
      <div className="rounded-md bg-gray-100 h-48 sm:h-56 md:h-64" />
      <div className="mt-3 h-4 bg-gray-100 rounded w-3/4" />
      <div className="mt-2 h-4 bg-gray-100 rounded w-1/3" />
    </div>
  );
}
