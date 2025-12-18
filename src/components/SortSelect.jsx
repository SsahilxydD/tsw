import React from "react";
import { getSortOptions } from "../utils/sortProducts";

/**
 * Consistent sort dropdown with chevron icon.
 * Props:
 *  - value: string (sort option value)
 *  - onChange: (nextValue: string) => void
 *  - className: optional width overrides (e.g. "w-40")
 */
const SortSelect = ({ value, onChange, className = "w-48" }) => {
  const sortOptions = getSortOptions();
  
  // Map old values to new values for backward compatibility
  const normalizedValue = value === "" ? "featured" : value;

  return (
    <div className={`relative ${className}`}>
      <select
        aria-label="Sort products"
        value={normalizedValue}
        onChange={(e) => onChange?.(e.target.value)}
        className="w-full appearance-none border-2 border-gray-300 text-sm px-3 h-12 rounded pr-9
                   focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black
                   hover:border-gray-400 transition-colors
                   min-h-[44px] md:min-h-0"
      >
        {sortOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {/* Chevron */}
      <svg
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path fillRule="evenodd"
          d="M5.23 7.21a.75.75 0 011.06.02L10 11.116l3.71-3.886a.75.75 0 111.08 1.04l-4.24 4.44a.75.75 0 01-1.08 0l-4.24-4.44a.75.75 0 01.02-1.06z"
          clipRule="evenodd" />
      </svg>
    </div>
  );
};

export default SortSelect;
