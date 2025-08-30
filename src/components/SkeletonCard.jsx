import React from "react";

export default function SkeletonCard() {
  return (
    <div className="animate-pulse">
      <div className="rounded-md h-48 sm:h-56 md:h-64 skeleton-shimmer" />
      <div className="mt-3 h-4 rounded w-3/4 skeleton-shimmer" />
      <div className="mt-2 h-4 rounded w-1/3 skeleton-shimmer" />
    </div>
  );
}
