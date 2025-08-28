import React from "react";

export default function PageLoader() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-gray-300 border-t-black rounded-full animate-spin" aria-label="Loading" />
    </div>
  );
}
