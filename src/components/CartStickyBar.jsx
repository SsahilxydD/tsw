import React from "react";

export default function CartStickyBar({ totalText, buttonText = "CONTINUE", onClick, disabled }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 bg-white/95 backdrop-blur border-t animate-slide-up">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
        {totalText ? (
          <div className="text-base sm:text-lg font-semibold">{totalText}</div>
        ) : (
          <div />
        )}
        <button
          type="button"
          disabled={disabled}
          onClick={onClick}
          className={`ml-auto px-6 py-3 rounded text-white text-sm tracking-wide active:scale-95 transition
            ${disabled ? 'bg-gray-300 cursor-not-allowed' : 'bg-black hover:opacity-90'}`}
        >
          {buttonText}
        </button>
      </div>
    </div>
  );
}
