import type { SessionDoc } from "./firestore";

type Session = SessionDoc & { id: string };
const score = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100 ? value : null;
const time = (session: Session) => session.createdAt?.toMillis?.() ?? 0;

export function summarizeVrRounds(sessions: Session[]) {
  const scenarios = ["s1", "s2", "s3", "s4", "s5"].map((scenarioId) => {
    const latest = sessions
      .filter((s) => s.scenarioId === scenarioId)
      .sort((a, b) => time(b) - time(a) || b.id.localeCompare(a.id))[0];
    return {
      scenarioId,
      sessionId: latest?.id ?? null,
      round1: score(latest?.stage3?.aiScores?.overall),
      round2: score(latest?.stage4?.aiScores?.overall),
    };
  });
  // Compare the same set of latest attempts; never substitute an older completed run.
  const paired = scenarios.filter((s) => s.round1 !== null && s.round2 !== null);
  const average = (key: "round1" | "round2") =>
    paired.length
      ? Number((paired.reduce((sum, s) => sum + s[key]!, 0) / paired.length).toFixed(1))
      : null;
  return {
    scenarios,
    pairedCount: paired.length,
    round1: average("round1"),
    round2: average("round2"),
  };
}

export type VrRoundScores = ReturnType<typeof summarizeVrRounds>;
