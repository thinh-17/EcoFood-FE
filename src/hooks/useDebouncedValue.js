import { useEffect, useState } from "react";

// Generic — moved out of features/tenant once features/user needed the same
// debounce for its own directory search, rather than cross-importing one
// feature's hook from another.
export function useDebouncedValue(value, delayMs = 400) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
