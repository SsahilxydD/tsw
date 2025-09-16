import React from "react";

function calcDims(w, size = 'md') {
  const WW = Number.isFinite(w) ? w : 1024;
  // Smart scaling for buttons (min..max bounds)
  // Very small phones (~320-360): 26-28px; up to tablet: 32-36px
  let btn = WW < 360 ? 26 : WW < 400 ? 28 : WW < 480 ? 30 : WW < 640 ? 32 : 36;
  let gap = WW < 360 ? 6 : WW < 400 ? 8 : 8;
  let font = WW < 360 ? 12 : 13; // number font size
  let textMinW = Math.max(22, Math.round(btn * 0.8));
  if (size === 'sm' || size === 'compact') {
    btn = Math.max(20, btn - 8);
    gap = Math.max(3, gap - 3);
    font = Math.max(10, font - 3);
    textMinW = Math.max(16, Math.round(btn * 0.7));
  }
  return { btn, gap, font, textMinW };
}

export default function QuantityStepper({ value = 1, min = 1, max, onChange, size = 'md' }) {
  const v = Number.isFinite(value) ? value : min;
  const canDec = v > min;
  const canInc = typeof max === "number" ? v < max : true;

  const [dims, setDims] = React.useState(() => calcDims(typeof window !== 'undefined' ? window.innerWidth : 1024, size));
  React.useEffect(() => {
    const onR = () => setDims(calcDims(window.innerWidth, size));
    window.addEventListener('resize', onR);
    return () => window.removeEventListener('resize', onR);
  }, [size]);

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
      className="inline-flex items-center rounded-md border border-gray-300 bg-white px-1 py-0.5 shadow-sm select-none"
      style={{ gap: `${dims.gap}px` }}
    >
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={!canDec}
        onClick={dec}
        style={{ touchAction: 'manipulation', width: dims.btn, height: dims.btn, fontSize: 14, lineHeight: 1 }}
        className={`grid place-content-center rounded-md text-white transition pressable ${canDec ? "bg-black hover:opacity-90" : "bg-gray-300 cursor-not-allowed"}`}
      >
        −
      </button>
      <span
        className={`text-center font-medium tabular-nums transition-transform ${bump ? 'scale-110' : 'scale-100'}`}
        style={{ minWidth: dims.textMinW, fontSize: dims.font }}
      >
        {v}
      </span>
      <button
        type="button"
        aria-label="Increase quantity"
        disabled={!canInc}
        onClick={inc}
        style={{ touchAction: 'manipulation', width: dims.btn, height: dims.btn, fontSize: 14, lineHeight: 1 }}
        className={`grid place-content-center rounded-md text-white transition pressable ${canInc ? "bg-black hover:opacity-90" : "bg-gray-300 cursor-not-allowed"}`}
      >
        +
      </button>
    </div>
  );
}

