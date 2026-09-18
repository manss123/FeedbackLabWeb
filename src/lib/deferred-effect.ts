// Wait until the current effect setup/cleanup stack has settled before emitting
// durable observations. Strict Mode's discarded setup never becomes a visit.
// This is cancellation, not a duration threshold: real short visits are retained.
export function deferredEffect(setup: () => void | (() => void)): () => void {
  let cancelled = false;
  let cleanup: void | (() => void);
  queueMicrotask(() => {
    if (!cancelled) cleanup = setup();
  });
  return () => {
    cancelled = true;
    cleanup?.();
  };
}
