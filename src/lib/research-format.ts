const secondsFormat = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// Display precision only; raw legacy/export values are not rewritten.
export function formatResearchSeconds(value: unknown): string {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return "—";
  if (value > 0 && value < 0.01) return "<0.01";
  return secondsFormat.format(value);
}
