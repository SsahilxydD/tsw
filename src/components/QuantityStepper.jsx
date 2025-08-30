import React from "react";

export default function QuantityStepper({ value = 1, min = 1, max, onChange }) {
  const v = Number.isFinite(value) ? value : min;
  const canDec = v > min;
  const canInc = typeof max === "number" ? v < max : true;

  const [bump, setBump] = React.useState(false);
  React.useEffect(() => {
    setBump(true);
    const t = setTimeout(() => setBump(false), 200);
    return () => clearTimeout(t);
  }, [v]);

  const dec = () => onChange?.(Math.max(min, v - 1));
  const inc = () => onChange?.(Math.min(max ?? Infinity, v + 1));

  return (
    <div className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-1.5 py-1 shadow-sm select-none">
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={!canDec}
        onClick={dec}
        style={{ touchAction: 'manipulation' }}
        className={`h-8 w-8 grid place-content-center rounded-md text-white transition
          ${canDec ? "bg-black hover:opacity-90" : "bg-gray-300 cursor-not-allowed"}`}
      >
        −
      </button>
      <span className={`min-w-6 text-center font-medium tabular-nums transition-transform ${bump ? 'scale-110' : 'scale-100'}`}>
        {v}
      </span>
      <button
        type="button"
        aria-label="Increase quantity"
        disabled={!canInc}
        onClick={inc}
        style={{ touchAction: 'manipulation' }}
        className={`h-8 w-8 grid place-content-center rounded-md text-white transition
          ${canInc ? "bg-black hover:opacity-90" : "bg-gray-300 cursor-not-allowed"}`}
      >
        +
      </button>
    </div>
  );
}
