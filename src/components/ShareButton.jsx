import React from 'react';

export default function ShareButton({ product, currency = '₹' }) {
  if (!product) return null;

  const price = Number(product.price) || 0;
  const mrp = Number(product.mrp) || 0;
  const hasDiscount = mrp > price && price > 0;
  const discountPercent = hasDiscount ? Math.round(((mrp - price) / mrp) * 100) : 0;

  const url = typeof window !== 'undefined'
    ? `${window.location.origin}/product/${product._id || product.slug}`
    : '';

  const priceText = hasDiscount
    ? `${currency}${price.toLocaleString('en-IN')} (Save ${discountPercent}%!)`
    : `${currency}${price.toLocaleString('en-IN')}`;

  const message = `Check out this on Solo Wardrobe!\n\n*${product.name}* — ${priceText}\n\n${url}`;

  const href = `https://wa.me/?text=${encodeURIComponent(message)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-sm text-green-600 hover:text-green-700 transition-colors mt-4"
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.52 3.48A11.91 11.91 0 0 0 12.03 0C5.43 0 .06 5.37.06 11.97c0 2.11.55 4.17 1.6 5.99L0 24l6.2-1.62a11.9 11.9 0 0 0 5.83 1.48h.01c6.6 0 11.97-5.37 11.97-11.97 0-3.2-1.25-6.2-3.49-8.41ZM12.04 21.8h-.01a9.92 9.92 0 0 1-5.06-1.39l-.36-.21-3.68.96.98-3.59-.24-.37a9.94 9.94 0 0 1-1.52-5.25C2.15 6.53 6.6 2.08 12.03 2.08c2.65 0 5.14 1.03 7.01 2.9a9.85 9.85 0 0 1 2.91 7.0c0 5.43-4.45 9.82-9.91 9.82Zm5.74-7.41c-.31-.16-1.84-.91-2.12-1.01-.28-.1-.49-.16-.69.16-.2.31-.79 1.01-.97 1.22-.18.2-.36.23-.67.08-.31-.16-1.29-.48-2.46-1.52-.91-.81-1.52-1.8-1.7-2.11-.18-.31-.02-.48.13-.63.14-.14.31-.36.47-.54.16-.18.2-.31.31-.52.1-.2.05-.39-.03-.54-.08-.16-.69-1.67-.95-2.29-.25-.6-.5-.52-.69-.53l-.59-.01c-.2 0-.54.08-.82.39-.28.31-1.08 1.06-1.08 2.6 0 1.54 1.11 3.03 1.27 3.24.16.2 2.18 3.33 5.28 4.67.74.32 1.32.51 1.77.65.75.24 1.43.2 1.97.12.6-.09 1.84-.75 2.1-1.47.26-.72.26-1.34.18-1.47-.08-.13-.28-.2-.59-.36Z" />
      </svg>
      Share this deal
    </a>
  );
}
