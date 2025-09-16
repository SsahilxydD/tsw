import React from "react";

export default function CartSteps({ active = "bag" }) {
  const steps = [
    { key: "bag", label: "MY BAG" },
    { key: "address", label: "ADDRESS" },
    { key: "payment", label: "PAYMENT" },
  ];

  const idx = steps.findIndex((s) => s.key === active);

  return (
    <div className="w-full max-w-6xl mx-auto px-4">
      {/* Responsive, wraps cleanly, circles stay perfect using fixed h/w */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] sm:text-xs font-medium tracking-wide select-none">
        {steps.map((s, i) => {
          const on = i <= idx;
          return (
            <React.Fragment key={s.key}>
              <div className="flex items-center gap-2 min-w-0 shrink-0">
                <span
                  className={`h-6 w-6 sm:h-7 sm:w-7 grid place-content-center rounded-full border shrink-0 ${
                    on ? 'bg-black text-white border-black' : 'bg-white text-gray-600 border-gray-300'
                  }`}
                >
                  {i + 1}
                </span>
                <span className={`${on ? 'text-black' : 'text-gray-500'} whitespace-normal break-words`}>
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <span className="h-px flex-1 bg-gray-300 mx-1" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

