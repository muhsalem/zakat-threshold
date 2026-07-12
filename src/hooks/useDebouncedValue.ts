import { useEffect, useState } from "react";

/**
 * Returns a debounced copy of `value` that updates only after `delay` ms
 * have passed without further changes. Useful for search inputs to reduce
 * downstream renders, URL updates, or network requests.
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
