import React from "react";

// Deterministic hash: same product always gets same number
function hashId(id) {
  let h = 0;
  const s = String(id);
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return (Math.abs(h) % 6) + 2; // Range 2-7
}

export default function UrgencyBadge({ productId, bestseller = false, discounted = false, className = "" }) {
  const n = hashId(productId);

  let label = null;
  let variant = null;

  if (bestseller) {
    label = "Selling fast";
    variant = "orange";
  } else if (discounted) {
    label = n <= 4 ? `Only ${n} left!` : "Selling fast";
    variant = n <= 4 ? "red" : "orange";
  } else if (n <= 3) {
    label = `Only ${n} left!`;
    variant = "red";
  } else if (n <= 5) {
    label = "Selling fast";
    variant = "orange";
  } else {
    return null; // 6-7: no badge
  }

  const styles = {
    red: "bg-red-50 text-red-600 border-red-200 animate-[pulse_2s_ease-in-out_infinite]",
    orange: "bg-orange-50 text-orange-600 border-orange-200",
  };

  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full border text-[10px] font-semibold leading-none whitespace-nowrap ${styles[variant]} ${className}`}>
      {label}
    </span>
  );
}
