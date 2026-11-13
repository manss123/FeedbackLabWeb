import { useCallback, useState } from "react";

export function useCompetencyRadarRadius() {
  const [radius, setRadius] = useState(35);
  const onResize = useCallback((width: number, height: number) => {
    setRadius(Math.max(20, Math.min(height / 2 - 55, width / 2 - 103)));
  }, []);
  return { radius, onResize };
}

const LABEL_LINES: Record<string, string[]> = {
  "Speech Clarity": ["Speech Clarity"],
  "Linguistic Appropriateness & Sentence Structure": [
    "Linguistic",
    "Appropriateness",
    "& Sentence",
    "Structure",
  ],
  "Balance of Positive & Corrective Feedback": ["Balance of Positive", "& Corrective Feedback"],
  "Intent Consistency": ["Intent", "Consistency"],
};

/** Wrap the rubric's full labels so they fit in the narrow VR coaching panel. */
export function CompetencyAxisTick({
  x = 0,
  y = 0,
  payload,
}: {
  x?: number;
  y?: number;
  payload?: { value: string };
}) {
  const label = payload?.value ?? "";
  const lines = LABEL_LINES[label] ?? [label];
  const left = label === "Intent Consistency";
  const right = label.startsWith("Linguistic");
  const labelX = x + (right ? 6 : left ? -6 : 0);
  const offset =
    label === "Speech Clarity"
      ? -12
      : label.startsWith("Balance")
        ? 22
        : -((lines.length - 1) * 15) / 2;
  return (
    <text
      x={labelX}
      y={y}
      textAnchor={right ? "start" : left ? "end" : "middle"}
      fill="#334155"
      fontSize={11}
      fontWeight={500}
    >
      <title>{label}</title>
      {lines.map((line, index) => (
        <tspan key={line} x={labelX} dy={index === 0 ? offset : 15}>
          {line}
        </tspan>
      ))}
    </text>
  );
}
