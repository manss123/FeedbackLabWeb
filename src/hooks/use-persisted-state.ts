import { useEffect, useRef, useState } from "react";

/**
 * Persist any React state to localStorage under a stable key.
 * Restores on mount so users don't lose in-progress form input on refresh.
 *
 * Returns [value, setValue, clear] — call clear() after successful submission
 * to wipe the draft from storage.
 */
export function usePersistedState<T>(
  key: string,
  initial: T,
): [T, React.Dispatch<React.SetStateAction<T>>, () => void] {
  const storageKey = `flvr.draft.${key}`;
  const hydrated = useRef(false);

  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return initial;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw != null) return JSON.parse(raw) as T;
    } catch {
      /* ignore */
    }
    return initial;
  });

  useEffect(() => {
    // Skip the very first render (already loaded from storage above).
    if (!hydrated.current) {
      hydrated.current = true;
      return;
    }
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(value));
    } catch {
      /* ignore quota errors */
    }
  }, [storageKey, value]);

  const clear = () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(storageKey);
    }
  };

  return [value, setValue, clear];
}
