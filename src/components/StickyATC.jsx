import React from "react";

/**
 * Mobile-only sticky add-to-cart bar.
 * Props:
 *  - priceText: string
 *  - disabled: boolean
 *  - onClick: () => void
 */
export default function StickyATC({ priceText, disabled, onClick }) {
  return (
    <div className="sm:hidden fixed inset-x-0 bottom-0 z-30 bg-white border-t
                    pb-[max(env(safe-area-inset-bottom),0px)]">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
        <div className="text-base font-semibold">{priceText}</div>
        <button
          disabled={disabled}
          onClick={onClick}
          className={`ml-auto px-5 py-3 rounded text-white text-sm
            ${disabled ? "bg-gray-400" : "bg-black active:scale-[0.98]"}`
          }
        >
          ADD TO CART
        </button>
      </div>
    </div>
  );
}
