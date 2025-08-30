import React from "react";

// Adds/removes CSS classes on <html> based on scroll velocity to tune animations.
export default function ScrollEffects() {
  React.useEffect(() => {
    let lastY = window.scrollY;
    let lastT = performance.now();
    let raf = 0;
    let fastTimer = 0;

    const setFast = () => {
      document.documentElement.classList.add('scrolling-fast');
      clearTimeout(fastTimer);
      fastTimer = setTimeout(() => {
        document.documentElement.classList.remove('scrolling-fast');
      }, 180);
    };

    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const now = performance.now();
        const dy = Math.abs(window.scrollY - lastY);
        const dt = Math.max(1, now - lastT);
        const v = (dy / dt) * 1000; // px per second
        if (v > 600) setFast(); // mark fast scrolling briefly
        lastY = window.scrollY; lastT = now;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); if (raf) cancelAnimationFrame(raf); clearTimeout(fastTimer); };
  }, []);
  return null;
}

