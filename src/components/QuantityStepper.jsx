import React from "react";

function calcDims(w) {
  const WW = Number.isFinite(w) ? w : 1024;
  // Smart scaling for buttons (min..max bounds)
  // Mobile: minimum 44px for touch targets (WCAG/PRD requirement)
  // Desktop: can be smaller (32-36px)
  const btn = WW < 640 ? 44 : WW < 1024 ? 36 : 36; // Minimum 44px on mobile
  const gap = WW < 360 ? 8 : WW < 400 ? 10 : 12;
  const font = WW < 360 ? 13 : WW < 640 ? 14 : 13; // number font size
  const textMinW = Math.max(28, Math.round(btn * 0.7));
  return { btn, gap, font, textMinW };
}

export default function QuantityStepper({ value = 1, min = 1, max, onChange }) {
  const v = Number.isFinite(value) ? value : min;
  const canDec = v > min;
  const canInc = typeof max === "number" ? v < max : true;

  const [dims, setDims] = React.useState(() => calcDims(typeof window !== 'undefined' ? window.innerWidth : 1024));
  React.useEffect(() => {
    const onR = () => setDims(calcDims(window.innerWidth));
    window.addEventListener('resize', onR);
    return () => window.removeEventListener('resize', onR);
  }, []);

  const [bump, setBump] = React.useState(false);
  React.useEffect(() => {
    setBump(true);
    const t = setTimeout(() => setBump(false), 200);
    return () => clearTimeout(t);
  }, [v]);

  const dec = () => onChange?.(Math.max(min, v - 1));
  const inc = () => onChange?.(Math.min(max ?? Infinity, v + 1));

  return (
    <div
      className="inline-flex items-center rounded-md border border-gray-300 bg-white px-1.5 py-1 shadow-sm select-none"
      style={{ gap: `${dims.gap}px` }}
    >
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={!canDec}
        onClick={dec}
        style={{ touchAction: 'manipulation', width: dims.btn, height: dims.btn, fontSize: 16, lineHeight: 1 }}
        className={`grid place-content-center rounded-md text-white transition pressable
          ${canDec ? "bg-black hover:opacity-90" : "bg-gray-300 cursor-not-allowed"}`}
      >
        −
      </button>
      <span
        className={`text-center font-medium tabular-nums transition-transform ${bump ? 'scale-110' : 'scale-100'}`}
        style={{ minWidth: dims.textMinW, fontSize: dims.font }}
        aria-label={`Quantity: ${v}`}
      >
        {v}
      </span>
      <button
        type="button"
        aria-label="Increase quantity"
        disabled={!canInc}
        onClick={inc}
        style={{ touchAction: 'manipulation', width: dims.btn, height: dims.btn, fontSize: 16, lineHeight: 1 }}
        className={`grid place-content-center rounded-md text-white transition pressable
          ${canInc ? "bg-black hover:opacity-90" : "bg-gray-300 cursor-not-allowed"}`}
      >
        +
      </button>
    </div>
  );
}
