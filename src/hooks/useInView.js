import { useCallback, useEffect, useState } from "react";

export default function useInView(options = {}) {
  const [node, setNode] = useState(null);
  const ref = useCallback(n => setNode(n), []);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !('IntersectionObserver' in window)) {
      setInView(true);
      return;
    }
    if (!node) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true);
        if (options?.once) observer.disconnect();
      } else if (!options?.once) {
        // When not in "once" mode, reset so elements can re-trigger on re-entry
        // (otherwise inView latches true forever and "fade out off-screen" never fires).
        setInView(false);
      }
    }, {
      threshold: options?.threshold ?? 0,
      rootMargin: options?.rootMargin ?? '0px'
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, [node, options?.once, options?.threshold, options?.rootMargin]);

  return { ref, inView };
}
