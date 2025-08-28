import { useEffect, useState } from "react";

/**
 * Returns `value` after `delay` ms without changes.
 * Great for search inputs to avoid re-filtering on every keystroke.
 */
export default function useDebouncedValue(value, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
