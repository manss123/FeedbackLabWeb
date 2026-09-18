// Wall-clock observation, independent of media position (seeks and playback speed).
export function videoSlice(previous: number, now: number, playing: boolean, visible: boolean) {
  const elapsed = Math.max(0, now - previous);
  const unobserved = elapsed > 45_000 ? elapsed : 0;
  return {
    playing: playing && !unobserved ? elapsed : 0,
    visible: playing && visible && !unobserved ? elapsed : 0,
    unobserved,
  };
}
