import type { AdminUserRow } from "./admin.functions";
import { bangkokDay, type ResearchFilters, type ResearchRow } from "./research-log";
export const ASSESSMENT_COLUMNS = [
  "participant_code",
  "assessment_phase",
  "instrument_version",
  "submitted_at_utc",
  "total_score",
  "max_score",
  "percentage",
  "item_id",
  "item_score",
  "rank_A",
  "rank_B",
  "rank_C",
  "rank_D",
  "score_A",
  "score_B",
  "score_C",
  "score_D",
];
export function assessmentResearchRows(
  users: AdminUserRow[],
  codes: Record<string, string>,
  filters: ResearchFilters,
): ResearchRow[] {
  return users.flatMap((user) => {
    if (filters.participant && filters.participant !== user.uid) return [];
    return (["pretest", "posttest"] as const).flatMap((phase) => {
      const r = user.assessmentResults?.[phase];
      if (!r) return [];
      const day = bangkokDay(r.submittedAt);
      if (
        (filters.from || filters.to) &&
        (!day || (filters.from && day < filters.from) || (filters.to && day > filters.to))
      )
        return [];
      return r.answers.map((a) => ({
        participant_code: codes[user.uid] ?? "",
        assessment_phase: phase,
        instrument_version: r.version,
        submitted_at_utc: r.submittedAt,
        total_score: r.totalScore,
        max_score: r.maxScore,
        percentage: r.percentage,
        item_id: a.id,
        item_score: a.score,
        rank_A: a.ranks.A,
        rank_B: a.ranks.B,
        rank_C: a.ranks.C,
        rank_D: a.ranks.D,
        score_A: a.optionScores.A,
        score_B: a.optionScores.B,
        score_C: a.optionScores.C,
        score_D: a.optionScores.D,
      }));
    });
  });
}
