import React from "react";

export default function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 bg-black text-white text-sm px-3 py-2 rounded z-[1000]"
    >
      Skip to content
    </a>
  );
}
