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
  // Only needed for values JSON can't round-trip as-is (e.g. Set/Map) —
  // every existing caller stores plain JSON-safe values and omits this.
  codec?: { serialize: (value: T) => string; deserialize: (raw: string) => T },
): [T, React.Dispatch<React.SetStateAction<T>>, () => void] {
  const storageKey = `flvr.draft.${key}`;
  const hydrated = useRef(false);
  const serialize = codec?.serialize ?? ((v: T) => JSON.stringify(v));
  const deserialize = codec?.deserialize ?? ((raw: string) => JSON.parse(raw) as T);

  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return initial;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw != null) return deserialize(raw);
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
      window.localStorage.setItem(storageKey, serialize(value));
    } catch {
      /* ignore quota errors */
    }
    // serialize/deserialize are passed inline at most call sites (a fresh
    // function every render) — keying the effect on storageKey/value only
    // (both otherwise-stable) avoids redundant writes on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, value]);

  const clear = () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(storageKey);
    }
  };

  return [value, setValue, clear];
}
