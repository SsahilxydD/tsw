import React, { useEffect, useRef, useState } from "react";
import SizeChips from "./SizeChips";

export default function MobileFilters({
  open,
  onClose,
  sizes = [],
  selected = [],
  onToggle,
  onClear,
  onApply,
}) {
  const sheetRef = useRef(null);
  const closeBtnRef = useRef(null);

  // measured height of the sheet (px)
  const [sheetH, setSheetH] = useState(0);

  // animated offset (px)
  const [offsetY, setOffsetY] = useState(0);
  const offsetRef = useRef(0); // always-current offset (fixes stale state)

  // drag state
  const draggingRef = useRef(false);
  const startYRef = useRef(0);
  const startOffsetRef = useRef(0);
  const lastYRef = useRef(0);
  const lastTRef = useRef(0);

  // Lock background scroll, focus close
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setTimeout(() => closeBtnRef.current?.focus(), 0);
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // measure sheet & animate up on open
  useEffect(() => {
    if (!open) return;
    const r = sheetRef.current?.getBoundingClientRect();
    const h = r?.height || 0;
    setSheetH(h);

    // start below viewport then slide up
    offsetRef.current = h;
    setOffsetY(h);
    const id = requestAnimationFrame(() => {
      offsetRef.current = 0;
      setOffsetY(0);
    });
    return () => cancelAnimationFrame(id);
  }, [open]);

  // ESC closes
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && requestClose(true);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const getY = (e) =>
    e?.clientY ??
    (e?.touches && e.touches[0] ? e.touches[0].clientY : 0);

  const beginDrag = (e) => {
    e.preventDefault?.();
    draggingRef.current = true;
    startYRef.current = getY(e);
    startOffsetRef.current = offsetRef.current;
    lastYRef.current = startYRef.current;
    lastTRef.current = performance.now();
    sheetRef.current?.classList.add("duration-0");

    // listeners
    window.addEventListener("pointermove", onDragMove, { passive: false });
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("touchmove", onDragMove, { passive: false });
    window.addEventListener("touchend", endDrag);
    window.addEventListener("mousemove", onDragMove, { passive: false });
    window.addEventListener("mouseup", endDrag);
  };

  const onDragMove = (e) => {
    if (!draggingRef.current) return;
    if (e.cancelable) e.preventDefault();

    const y = getY(e);
    const dy = y - startYRef.current;
    const next = clamp(startOffsetRef.current + dy, 0, sheetH);

    offsetRef.current = next;
    setOffsetY(next);

    // track velocity
    const t = performance.now();
    lastYRef.current = y;
    lastTRef.current = t;
  };

  const endDrag = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    sheetRef.current?.classList.remove("duration-0");

    const current = offsetRef.current;

    // compute downward velocity (px/ms)
    const now = performance.now();
    const dt = Math.max(1, now - lastTRef.current);
    const vy = (lastYRef.current - startYRef.current) / dt; // >0 => down

    // threshold: smaller of 28% sheet height or 300px, minimum 80px
    const threshold = Math.max(80, Math.min(sheetH * 0.28, 300));

    // also close on a fast downward fling
    const fastFling = vy > 0.6; // ~600px/s

    if (current >= threshold || fastFling) {
      requestClose(true); // animate down then close
    } else {
      offsetRef.current = 0;
      setOffsetY(0); // snap back
    }

    // cleanup listeners
    window.removeEventListener("pointermove", onDragMove);
    window.removeEventListener("pointerup", endDrag);
    window.removeEventListener("touchmove", onDragMove);
    window.removeEventListener("touchend", endDrag);
    window.removeEventListener("mousemove", onDragMove);
    window.removeEventListener("mouseup", endDrag);
  };

  const requestClose = (animate = true) => {
    if (!open) return;
    if (animate) {
      sheetRef.current?.classList.remove("duration-0");
      offsetRef.current = sheetH;
      setOffsetY(sheetH);
      setTimeout(() => onClose?.(), 250);
    } else {
      onClose?.();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label="Filters">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={() => requestClose(true)} />

      {/* Bottom sheet */}
      <div
        ref={sheetRef}
        className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white max-h-[80vh] overflow-hidden transition-transform duration-300 will-change-transform"
        style={{ transform: `translateY(${offsetY}px)` }}
      >
        {/* Header: full-area drag; grid keeps handle centered & Close aligned */}
        <div className="border-b grid grid-cols-3 items-center h-12 touch-none select-none"
             onPointerDown={beginDrag}
             onTouchStart={beginDrag}
             onMouseDown={beginDrag}>
          <div />
          <div className="flex justify-center">
            <div className="w-12 h-1.5 rounded-full bg-gray-300" />
          </div>
          <div className="flex justify-end pr-3">
            <button
              ref={closeBtnRef}
              className="px-3 py-1.5 rounded border text-sm"
              onClick={() => requestClose(true)}
            >
              Close
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 overflow-auto max-h-[calc(80vh-104px)]">
          <p className="mb-3 text-sm font-medium">SIZE</p>
          <SizeChips sizes={sizes} selected={selected} onToggle={onToggle} columns={3} />
        </div>

        {/* Actions */}
        <div className="p-4 border-t flex items-center gap-3">
          <button className="px-4 py-2 border rounded text-sm" onClick={onClear}>
            Clear
          </button>
          <button
            className="ml-auto px-5 py-2 rounded bg-black text-white text-sm"
            onClick={() => {
              onApply?.();
              requestClose(false); // already applied; close immediately
            }}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
