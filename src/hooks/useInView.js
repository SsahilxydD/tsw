import { useEffect, useRef, useState } from "react";

export default function useInView(options = {}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !('IntersectionObserver' in window)) {
      setInView(true);
      return;
    }
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          setInView(true);
          if (options.once !== false) observer.unobserve(entry.target);
        }
      }
    }, {
      root: options.root ?? null,
      // Pre-arm well before entering the viewport to avoid blank gaps during rapid scroll
      rootMargin: options.rootMargin ?? "100% 0px 20% 0px",
      threshold: options.threshold ?? 0.01
    });

    observer.observe(node);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref.current]);

  return [ref, inView];
}
