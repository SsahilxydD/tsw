import { useEffect, useRef } from "react";

/**
 * Adds mouse drag-to-scroll on a horizontal scroll container.
 * Pass the same scrollRef used by the slider. Call attach() after
 * the container mounts (e.g. inside a rAF).
 *
 * Exposes isDragging on the returned object so the infinite-loop
 * scroll handler can skip resets during a drag.
 */
export default function useMouseDrag(scrollRef, isDraggingRef) {
  const state = useRef({ isDown: false, startX: 0, scrollLeft: 0, dragged: false });
  const cleanupRef = useRef(null);

  // Call this after the scroll container is in the DOM
  function attach() {
    // Remove old listeners first
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    const el = scrollRef.current;
    if (!el) return;

    const onMouseDown = (e) => {
      if (e.button !== 0) return;
      state.current.isDown = true;
      state.current.dragged = false;
      state.current.startX = e.pageX;
      state.current.scrollLeft = el.scrollLeft;
      if (isDraggingRef) isDraggingRef.current = true;
      el.style.cursor = "grabbing";
      el.style.userSelect = "none";
    };

    const onMouseMove = (e) => {
      if (!state.current.isDown) return;
      e.preventDefault();
      const walk = e.pageX - state.current.startX;
      if (Math.abs(walk) > 5) state.current.dragged = true;
      el.scrollLeft = state.current.scrollLeft - walk;
    };

    const onMouseUp = () => {
      if (!state.current.isDown) return;
      state.current.isDown = false;
      if (isDraggingRef) isDraggingRef.current = false;
      el.style.cursor = "";
      el.style.userSelect = "";
    };

    const onClick = (e) => {
      if (state.current.dragged) {
        e.preventDefault();
        e.stopPropagation();
        state.current.dragged = false;
      }
    };

    const onDragStart = (e) => e.preventDefault();

    el.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    el.addEventListener("mouseleave", onMouseUp);
    el.addEventListener("click", onClick, true);
    el.addEventListener("dragstart", onDragStart);

    cleanupRef.current = () => {
      el.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      el.removeEventListener("mouseleave", onMouseUp);
      el.removeEventListener("click", onClick, true);
      el.removeEventListener("dragstart", onDragStart);
    };
  }

  useEffect(() => {
    return () => {
      if (cleanupRef.current) cleanupRef.current();
    };
  }, []);

  return attach;
}
