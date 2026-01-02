// src/components/WhatsAppCTA.jsx
import React, { useCallback, useEffect, useState } from "react";

/**
 * Floating WhatsApp CTA
 *
 * Props:
 *  - phone (string, REQUIRED): phone in E.164 or digits only (e.g. "+919876543210")
 *  - message (string): prefilled message
 *  - walinkId (string): wa.link short code (e.g. "abcd12"). If omitted, falls back to wa.me.
 *  - label (string): visible text when iconOnly=false (default "Chat with us now")
 *  - iconSrc (string): optional icon url (if provided, renders as <img>)
 *  - iconOnly (boolean): show only the icon in a circular button
 */

export default function WhatsAppCTA({
  phone,
  message = "Hi! I have a question.",
  walinkId,
  label = "Chat with us now",
  iconSrc = null,
  iconOnly = false,
}) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 200);
    return () => clearTimeout(t);
  }, []);
  const normalized = String(phone || "").replace(/\D/g, "");
  const encodedMsg = encodeURIComponent(message);

  const primaryHref = walinkId
    ? `https://wa.link/${walinkId}`
    : `https://wa.me/${normalized}?text=${encodedMsg}`;

  const fallback1 = `https://wa.me/${normalized}?text=${encodedMsg}`;
  const fallback2 = `https://api.whatsapp.com/send?phone=${normalized}&text=${encodedMsg}`;

  const onClick = useCallback(
    (e) => {
      try {
        const win = window.open(primaryHref, "_blank", "noopener,noreferrer");
        setTimeout(() => {
          if (!win || win.closed) {
            window.location.href = fallback1;
            setTimeout(() => {
              try {
                if (document.visibilityState !== "hidden") {
                  window.location.href = fallback2;
                }
              } catch {}
            }, 1200);
          }
        }, 300);
      } catch {
        window.location.href = fallback1;
      }
      e.preventDefault();
    },
    [primaryHref, fallback1, fallback2]
  );

  // Position leaves space for sticky ATC on mobile (bottom-20). Lower on desktop.
  return (
    <div
      className={`fixed right-4 bottom-20 sm:bottom-6 z-40 ${show ? 'animate-slide-up' : 'opacity-0'}`}
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <button
        onClick={onClick}
        aria-label="Chat with us on WhatsApp"
        className={`shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-black/30 active:scale-[0.98] pressable
          ${iconOnly
            ? "rounded-full bg-whatsapp h-12 w-12 flex items-center justify-center"
            : "flex items-center gap-2 rounded-full bg-whatsapp text-white px-4 py-3 text-sm font-medium"}
        `}
        style={{ color: iconOnly ? "#fff" : undefined }}
      >
        {iconSrc ? (
          <img
            src={iconSrc}
            alt=""
            className={iconOnly ? "h-7 w-7" : "h-5 w-5"}
            width={iconOnly ? 28 : 20}
            height={iconOnly ? 28 : 20}
            loading="lazy"
            decoding="async"
            draggable={false}
          />
        ) : (
          <svg
            width={iconOnly ? 28 : 20}
            height={iconOnly ? 28 : 20}
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
            className={iconOnly ? "h-7 w-7" : "h-5 w-5"}
            fill="currentColor"
          >
            <path d="M20.52 3.48A11.91 11.91 0 0 0 12.03 0C5.43 0 .06 5.37.06 11.97c0 2.11.55 4.17 1.6 5.99L0 24l6.2-1.62a11.9 11.9 0 0 0 5.83 1.48h.01c6.6 0 11.97-5.37 11.97-11.97 0-3.2-1.25-6.2-3.49-8.41ZM12.04 21.8h-.01a9.92 9.92 0 0 1-5.06-1.39l-.36-.21-3.68.96.98-3.59-.24-.37a9.94 9.94 0 0 1-1.52-5.25C2.15 6.53 6.6 2.08 12.03 2.08c2.65 0 5.14 1.03 7.01 2.9a9.85 9.85 0 0 1 2.91 7.0c0 5.43-4.45 9.82-9.91 9.82Zm5.74-7.41c-.31-.16-1.84-.91-2.12-1.01-.28-.1-.49-.16-.69.16-.2.31-.79 1.01-.97 1.22-.18.2-.36.23-.67.08-.31-.16-1.29-.48-2.46-1.52-.91-.81-1.52-1.8-1.7-2.11-.18-.31-.02-.48.13-.63.14-.14.31-.36.47-.54.16-.18.2-.31.31-.52.1-.2.05-.39-.03-.54-.08-.16-.69-1.67-.95-2.29-.25-.6-.5-.52-.69-.53l-.59-.01c-.2 0-.54.08-.82.39-.28.31-1.08 1.06-1.08 2.6 0 1.54 1.11 3.03 1.27 3.24.16.2 2.18 3.33 5.28 4.67.74.32 1.32.51 1.77.65.75.24 1.43.2 1.97.12.6-.09 1.84-.75 2.1-1.47.26-.72.26-1.34.18-1.47-.08-.13-.28-.2-.59-.36Z" />
          </svg>
        )}
        {!iconOnly && <span className="text-white">{label}</span>}
      </button>
    </div>
  );
}
