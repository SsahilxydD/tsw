import React from "react";

export default function StickyATC({ show, priceLabel, hasSizes, sizes, size, onSize, onAdd }) {
  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur border-t">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
        <p className="font-semibold text-base flex-1">{priceLabel}</p>

        {hasSizes && sizes?.length > 0 && (
          <select
            value={size}
            onChange={(e) => onSize(e.target.value)}
            className="border rounded px-2 h-9 text-sm"
            aria-label="Select size"
          >
            {sizes.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        )}

        <button
          onClick={onAdd}
          className="px-4 py-2 bg-black text-white rounded text-sm"
        >
          Add to cart
        </button>
      </div>
    </div>
  );
}
