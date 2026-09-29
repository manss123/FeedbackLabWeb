import content from "./assessment-content.json";
export const ASSESSMENT_VERSION = "cfct-ranking-2026-09-v1";
export type AssessmentPhase = "pretest" | "posttest";
export type OptionId = "A" | "B" | "C" | "D";
export type Ranks = Partial<Record<OptionId, number>>;
export type AssessmentAnswers = Record<string, Ranks>;
export interface AssessmentQuestion {
  id: string;
  question: string;
  options: { id: OptionId; label: string }[];
}
export const ASSESSMENT_QUESTIONS = content as Record<AssessmentPhase, AssessmentQuestion[]>;
export const RANK_LABELS = [
  "เหมาะสมที่สุด",
  "เหมาะสมรองลงมา",
  "เหมาะสมน้อยลง",
  "เหมาะสมน้อยที่สุด",
];
export function isRankComplete(ranks?: Ranks) {
  const values = (["A", "B", "C", "D"] as const).map((id) => ranks?.[id]);
  return (
    values.every((v) => typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 4) &&
    new Set(values).size === 4
  );
}
// Swap an occupied rank with the option's previous rank; if unranked, clear the displaced option.
export function assignRank(ranks: Ranks, option: OptionId, rank: number): Ranks {
  const next = { ...ranks };
  const previous = ranks[option];
  for (const key of ["A", "B", "C", "D"] as const) {
    if (key !== option && next[key] === rank) {
      if (previous === undefined) delete next[key];
      else next[key] = previous;
    }
  }
  next[option] = rank;
  return next;
}
export interface AssessmentResult {
  phase: AssessmentPhase;
  version: string;
  totalScore: number;
  maxScore: number;
  percentage: number;
  submittedAt: string;
  answers: {
    id: string;
    ranks: Record<OptionId, number>;
    score: number;
    optionScores: Record<OptionId, number>;
  }[];
}
