import React from 'react';

// Deterministic hash: same product always gets same number
function hashToRange(str, min, max) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return min + (Math.abs(hash) % (max - min + 1));
}

export default function UrgencyBadge({ productId, bestseller = false, discounted = false }) {
  const num = hashToRange(String(productId), 2, 7);

  let label = null;
  let variant = null;

  if (bestseller) {
    label = 'Selling fast';
    variant = 'orange';
  } else if (discounted) {
    label = num <= 4 ? `Only ${num} left!` : 'Selling fast';
    variant = num <= 4 ? 'red' : 'orange';
  } else if (num <= 3) {
    label = `Only ${num} left!`;
    variant = 'red';
  } else if (num <= 5) {
    label = 'Selling fast';
    variant = 'orange';
  } else {
    return null; // 6-7: no badge
  }

  const styles = {
    red: 'bg-red-50 text-red-600 border-red-200 animate-pulse-subtle',
    orange: 'bg-orange-50 text-orange-600 border-orange-200',
  };

  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-semibold leading-tight whitespace-nowrap ${styles[variant]}`}>
      {label}
    </span>
  );
}
