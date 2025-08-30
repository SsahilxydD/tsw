import React from "react";

/**
 * Reusable chip list for size filters.
 * Props:
 *  - sizes: string[]
 *  - selected: string[]
 *  - onToggle: (size: string) => void
 *  - columns: number (optional; default 3 for grid)
 */
export default function SizeChips({ sizes = [], selected = [], onToggle, columns = 3 }) {
  const colClass =
    columns === 4 ? "grid-cols-4" :
    columns === 2 ? "grid-cols-2" :
    "grid-cols-3";

  return (
    <div className={`grid ${colClass} gap-2`}>
      {sizes.map((s) => {
        const isOn = selected.includes(s);
        return (
          <button
            key={s}
            type="button"
            onClick={() => onToggle?.(s)}
            aria-pressed={isOn}
            className={`px-3 py-1.5 rounded-full border text-sm transition pressable
              ${isOn
                ? "bg-black text-white border-black"
                : "bg-white text-gray-800 border-gray-300 hover:border-black"
              } focus:outline-none focus:ring-2 focus:ring-black/25`}
            title={s}
          >
            {s}
          </button>
        );
      })}
    </div>
  );
}
