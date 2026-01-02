import React, { useEffect, useState } from "react";

/**
 * Prevents ultra-fast Suspense loads from flashing a loader for a single frame.
 * Renders children only after `delayMs`.
 */
export default function DelayedFallback({ delayMs = 150, children }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShow(true), delayMs);
    return () => clearTimeout(t);
  }, [delayMs]);

  return show ? <>{children}</> : null;
}

