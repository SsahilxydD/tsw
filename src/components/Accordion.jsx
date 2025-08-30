import React from "react";

export default function Accordion({ title, children, defaultOpen = false }) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className="border rounded-md bg-white">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm"
      >
        <span className="font-medium text-gray-800">{title}</span>
        <svg
          className={`h-4 w-4 text-gray-500 transition-transform ${open ? 'rotate-180' : 'rotate-0'}`}
          viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"
        >
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.12l3.71-3.89a.75.75 0 111.08 1.04l-4.24 4.44a.75.75 0 01-1.08 0L4.15 8.27a.75.75 0 011.08-1.06z" clipRule="evenodd" />
        </svg>
      </button>
      {open && (
        <div className="px-4 pb-4 text-sm text-gray-700">
          {children}
        </div>
      )}
    </div>
  );
}

