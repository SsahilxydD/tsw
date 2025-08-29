import React, { useCallback } from "react";

/**
 * Floating WhatsApp CTA
 *
 * Props:
 *  - phone (string, REQUIRED): phone in E.164 or any digits (e.g. "+919876543210")
 *  - message (string, optional): prefilled message
 *  - walinkId (string, optional): wa.link short code (e.g. "abcd12")
 *  - label (string, optional): button label (default: "Chat with us now")
 *  - iconSrc (string, optional): path to an icon (default expects /src/assets/whatsapp.png)
 */
export default function WhatsAppCTA({
  phone,
  message = "Hi! I have a question.",
  walinkId,
  label = "Chat with us now",
  iconSrc = "/src/assets/whatsapp.png",
}) {
  const normalized = String(phone || "").replace(/\D/g, ""); // digits only
  const encodedMsg = encodeURIComponent(message);

  // Primary (wa.link) -> Fallbacks (wa.me, api.whatsapp.com)
  const primaryHref = walinkId ? `https://wa.link/${walinkId}` : `https://wa.me/${normalized}?text=${encodedMsg}`;
  const fallback1 = `https://wa.me/${normalized}?text=${encodedMsg}`;
  const fallback2 = `https://api.whatsapp.com/send?phone=${normalized}&text=${encodedMsg}`;

  const onClick = useCallback((e) => {
    // Try primary in a new tab/window; if popups are blocked, do inline redirect fallback
    try {
      const win = window.open(primaryHref, "_blank", "noopener,noreferrer");
      // If popup blocked or failed, do inline fallback after a tick
      setTimeout(() => {
        if (!win || win.closed) {
          // fall back to wa.me first
          window.location.href = fallback1;
          // If that still fails (very unlikely), try api endpoint shortly after
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
      // Extremely defensive: final inline redirect
      window.location.href = fallback1;
    }
    e.preventDefault();
  }, [primaryHref, fallback1, fallback2]);

  return (
    <div
      className="fixed right-4 bottom-20 sm:bottom-6 z-40"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-live="polite"
    >
      <button
        onClick={onClick}
        className="flex items-center gap-2 rounded-full bg-[#25D366] text-white shadow-lg
                   px-4 py-3 text-sm font-medium active:scale-[0.98] focus:outline-none
                   focus-visible:ring-2 focus-visible:ring-black/30"
        aria-label="Chat with us on WhatsApp"
      >
        {/* Icon is optional; if the file isn't there yet it simply won't render */}
        <img
          src={iconSrc}
          alt=""
          className="h-5 w-5"
          loading="lazy"
          onError={(e) => { e.currentTarget.style.display = "none"; }}
        />
        <span>{label}</span>
      </button>
    </div>
  );
}
