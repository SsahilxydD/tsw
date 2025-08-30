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
 *  - iconSrc (string): path to icon file (defaults to bundled WhatsApp icon)
 *  - iconOnly (boolean): show only the icon in a circular button
 */
import waIcon from "../assets/whatsapp.png";

export default function WhatsAppCTA({
  phone,
  message = "Hi! I have a question.",
  walinkId,
  label = "Chat with us now",
  iconSrc = waIcon,
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
            ? "rounded-full bg-[#25D366] h-12 w-12 flex items-center justify-center"
            : "flex items-center gap-2 rounded-full bg-[#25D366] text-white px-4 py-3 text-sm font-medium"}
        `}
        style={{ color: iconOnly ? "#fff" : undefined }}
      >
        <img
          src={iconSrc}
          alt=""
          className={iconOnly ? "h-7 w-7" : "h-5 w-5"}
          loading="lazy"
          onError={(e) => { e.currentTarget.style.display = "none"; }}
        />
        {!iconOnly && <span className="text-white">{label}</span>}
      </button>
    </div>
  );
}
