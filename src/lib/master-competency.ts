import type { AdminSessionRow } from "./admin.functions";
import { REFLECTION_VERSION } from "./vr-reflection";

export const CROSSWALK_VERSION = "2026-10-28-text-v1";
export const CROSSWALK_SCENARIOS = ["s1", "s2", "s3", "s4", "s5"] as const;
export type CrosswalkScenario = (typeof CROSSWALK_SCENARIOS)[number];
export interface MasterCompetency {
  id: string;
  label: string;
  core?: boolean;
  excluded?: boolean;
  dimensions: Partial<Record<CrosswalkScenario, number[]>>;
}

// Original D numbers from Master Competency Crosswalk.pdf; never array positions.
export const MASTER_COMPETENCIES: MasterCompetency[] = [
  {
    id: "specific",
    label: "Specific / Evidence-Based Feedback",
    core: true,
    dimensions: { s1: [2], s2: [1, 2], s3: [3, 5], s4: [6], s5: [1, 2, 3] },
  },
  {
    id: "actionable",
    label: "Actionable / Next-Step Feedback",
    core: true,
    dimensions: { s1: [3], s2: [4], s3: [5], s4: [6, 10], s5: [5] },
  },
  {
    id: "supportive",
    label: "Supportive & Respectful Communication",
    core: true,
    dimensions: { s1: [8], s2: [8], s3: [1, 4], s4: [2, 8], s5: [7, 8] },
  },
  {
    id: "structure",
    label: "Feedback Structure / Progression",
    core: true,
    dimensions: {
      s1: [4],
      s2: [5],
      s3: [1, 2, 5, 8],
      s4: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      s5: [9],
    },
  },
  {
    id: "delivery",
    label: "Communication Delivery",
    core: true,
    excluded: true,
    dimensions: { s1: [6], s2: [8], s3: [6], s4: [8], s5: [8] },
  },
  {
    id: "growth",
    label: "Growth / Future Orientation",
    core: true,
    dimensions: { s1: [1], s2: [3, 4, 6], s3: [8], s4: [10], s5: [7, 9] },
  },
  { id: "progress", label: "Progress Recognition", dimensions: { s2: [3], s5: [1] } },
  {
    id: "explanation",
    label: "Explanation of Strength / Evidence of Progress",
    dimensions: { s2: [2], s5: [2] },
  },
  { id: "safety", label: "Psychological Safety", dimensions: { s3: [1], s4: [8] } },
  {
    id: "behavior",
    label: "Behavior-Focused / Non-Judgmental Feedback",
    dimensions: { s3: [3, 4], s4: [4], s5: [7] },
  },
  { id: "emotion", label: "Emotion Recognition & Validation", dimensions: { s4: [1, 2] } },
  { id: "listening", label: "Active Listening & Perspective Exploration", dimensions: { s4: [3] } },
  { id: "deescalation", label: "De-escalation / Emotional Regulation", dimensions: { s4: [4] } },
  { id: "readiness", label: "Readiness & Timing", dimensions: { s4: [5] } },
  { id: "priority", label: "Prioritization", dimensions: { s5: [4] } },
  { id: "agency", label: "Learner Agency / Ownership", dimensions: { s4: [7], s5: [6, 9] } },
  { id: "continuous", label: "Continuous Improvement Orientation", dimensions: { s5: [9] } },
];
export const RADAR_COMPETENCIES = MASTER_COMPETENCIES.filter((c) => c.core && !c.excluded);

export function scoreCompetency(
  competency: MasterCompetency,
  scenario: CrosswalkScenario,
  session?: AdminSessionRow,
) {
  const dimensions = competency.dimensions[scenario] ?? [];
  const analysis =
    session?.scenarioId === scenario &&
    session.stage3?.reflectionVersion === REFLECTION_VERSION &&
    Array.isArray(session.stage3.reflectionAnalysis)
      ? session.stage3.reflectionAnalysis
      : [];
  const items = dimensions.map((dimension) => {
    const id = `${scenario}-${dimension}`;
    const matches = analysis.filter((row) => row.criterionId === id);
    const row = matches.length === 1 ? matches[0] : undefined;
    const value = row?.score;
    const score =
      typeof value === "number" &&
      Number.isInteger(value) &&
      value >= 1 &&
      value <= 5 &&
      row?.evidence?.trim()
        ? value
        : null;
    return { id, score, evidence: row?.evidence ?? "", limitation: row?.limitation ?? "" };
  });
  const available = items.filter((item) => item.score !== null).length;
  const status = competency.excluded
    ? "excluded"
    : !dimensions.length
      ? "not-applicable"
      : available === dimensions.length
        ? "complete"
        : "missing";
  return {
    status,
    required: dimensions.length,
    available,
    items,
    score:
      status === "complete"
        ? items.reduce((sum, item) => sum + item.score!, 0) / dimensions.length
        : null,
  };
}

// Default to the latest saved item-level assessment, never the highest score.
export function competencyAttempts(sessions: AdminSessionRow[], scenario: CrosswalkScenario) {
  return sessions
    .filter(
      (session) =>
        session.scenarioId === scenario &&
        session.stage3?.reflectionVersion === REFLECTION_VERSION &&
        Array.isArray(session.stage3.reflectionAnalysis) &&
        session.stage3.reflectionAnalysis.length > 0 &&
        Number.isFinite(Date.parse(session.stage3.completedAt ?? "")),
    )
    .sort(
      (a, b) =>
        Date.parse(b.stage3!.completedAt!) - Date.parse(a.stage3!.completedAt!) ||
        a.id.localeCompare(b.id),
    );
}
