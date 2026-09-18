export const IDLE_MS = 60_000;
export const MAX_SAMPLE_GAP_MS = 45_000;
// Store seconds to millisecond precision; avoid binary floating-point tails.
export function measuredSeconds(milliseconds: number): number {
  return Math.round(Math.max(0, milliseconds)) / 1000;
}
// Exclude suspended timers; recent interaction is a proxy, not proof of learning.
export function measuredSlice(
  from: number,
  to: number,
  lastInput: number,
  visible: boolean,
  focused: boolean,
) {
  const elapsed = Math.max(0, to - from);
  if (elapsed > MAX_SAMPLE_GAP_MS) return { visible: 0, active: 0, unobserved: elapsed };
  return {
    visible: visible ? elapsed : 0,
    active: visible && focused ? Math.max(0, Math.min(to, lastInput + IDLE_MS) - from) : 0,
    unobserved: 0,
  };
}
