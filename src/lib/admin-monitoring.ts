import type { ResearchRow } from "./research-log";

export function monitoringSummary(
  events: ResearchRow[],
  modules: ResearchRow[],
  vr: ResearchRow[],
) {
  const days = new Map<string, Set<string>>();
  for (const event of events) {
    const day = event.recorded_date_bangkok;
    if (typeof day !== "string" || !day) continue;
    if (!days.has(day)) days.set(day, new Set());
    days.get(day)!.add(String(event.participant_code));
  }
  const activity = [...days]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, people]) => ({ day, learners: people.size }));
  const moduleIds = [
    ...new Set(["m1", "m2", "m3", "m4", "m5", ...modules.map((r) => String(r.module_id))]),
  ];
  const learning = moduleIds.map((id) => {
    const rows = modules.filter((r) => r.module_id === id);
    return {
      module: id.toUpperCase(),
      started: new Set(
        rows.filter((r) => Number(r.observed_start_count) > 0).map((r) => r.participant_code),
      ).size,
      completed: new Set(
        rows.filter((r) => Number(r.observed_completion_count) > 0).map((r) => r.participant_code),
      ).size,
    };
  });
  const validScore = (v: unknown): v is number =>
    typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 100;
  const paired = vr.filter((r) => validScore(r.round1_overall) && validScore(r.round2_overall));
  const scores = paired.length
    ? [
        {
          round: "รอบแรก",
          score: paired.reduce((sum, r) => sum + Number(r.round1_overall), 0) / paired.length,
        },
        {
          round: "รอบสอง",
          score: paired.reduce((sum, r) => sum + Number(r.round2_overall), 0) / paired.length,
        },
      ]
    : [];
  return {
    activity,
    learning,
    scores,
    paired: paired.length,
    incompleteScores: vr.length - paired.length,
    observedLearners: new Set(events.map((r) => r.participant_code)).size,
  };
}
