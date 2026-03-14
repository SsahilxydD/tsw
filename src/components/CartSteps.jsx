import React from "react";

export default function CartSteps({ active = "bag" }) {
  const steps = [
    { key: "bag", label: "MY BAG" },
    { key: "address", label: "CHECKOUT" },
  ];

  const idx = steps.findIndex((s) => s.key === active);

  return (
    <div className="w-full max-w-6xl mx-auto px-4">
      <ol className="flex items-center gap-4 text-[11px] sm:text-xs font-medium tracking-wide select-none">
        {steps.map((s, i) => {
          const on = i <= idx;
          return (
            <li key={s.key} className="flex items-center gap-2">
              <span className={`h-6 w-6 grid place-content-center rounded-full border ${on ? 'bg-black text-white border-black' : 'bg-white text-gray-600 border-gray-300'}`}>{i+1}</span>
              <span className={`${on ? 'text-black' : 'text-gray-500'}`}>{s.label}</span>
              {i < steps.length - 1 && (
                <span className="mx-2 h-px w-8 sm:w-12 bg-gray-300 inline-block" aria-hidden="true" />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
