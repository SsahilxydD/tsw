import React from "react";
import { ShopContext } from "../context/ShopContext";

export default function Notice() {
  const { notice } = React.useContext(ShopContext) || {};
  if (!notice || !notice.msg) return null;
  return (
    <div
      aria-live="polite"
      className="fixed left-1/2 -translate-x-1/2 bottom-[84px] z-[60] pointer-events-none"
    >
      <div className="pointer-events-auto bg-black/85 text-white text-sm px-3.5 py-2 rounded-full shadow-lg border border-white/10 animate-pop">
        {String(notice.msg)}
      </div>
    </div>
  );
}

