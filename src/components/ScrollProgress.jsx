import React from "react";

export default function ScrollProgress() {
  const barRef = React.useRef(null);
  React.useEffect(() => {
    let raf = 0;
    const updateNow = () => {
      raf = 0;
      const doc = document.documentElement;
      const h = doc.scrollHeight - doc.clientHeight;
      const ratio = h > 0 ? Math.min(1, Math.max(0, window.scrollY / h)) : 0;
      if (barRef.current) barRef.current.style.transform = `scaleX(${ratio}) translateZ(0)`;
    };
    const schedule = () => {
      if (raf) return; // coalesce to next paint for max responsiveness
      raf = requestAnimationFrame(updateNow);
    };
    schedule();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
  return (
    <div aria-hidden className="fixed top-0 left-0 right-0 z-[35] h-[3px] bg-transparent pointer-events-none">
      <div
        ref={barRef}
        className="origin-left h-full bg-black/70"
        style={{ transform: 'scaleX(0) translateZ(0)', willChange: 'transform' }}
      />
    </div>
  );
}
