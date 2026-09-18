import type { ResearchRow } from "@/lib/research-log";

export const VIDEO_SUMMARY_COLUMNS = [
  "participant_code",
  "module_id",
  "run_id",
  "web_session_id",
  "video_id",
  "video_visit_id",
  "video_is_test",
  "first_observed_at_utc",
  "last_observed_at_utc",
  "video_playback_seconds",
  "video_visible_playback_seconds",
  "video_unobserved_seconds",
  "reached_end",
  "exit_observed",
  "error_count",
  "observation_count",
] as const;

// Input already follows the research cohort/date filter. Never merge separate visits,
// participants or sessions, and never sum media position as if it were viewing time.
export function summarizeVideoVisits(rows: ResearchRow[]): ResearchRow[] {
  const groups = new Map<string, ResearchRow[]>();
  for (const row of rows) {
    if (row.event_type !== "video_observation") continue;
    const key = JSON.stringify([
      row.participant_code,
      row.web_session_id,
      row.module_id,
      row.run_id,
      row.video_id,
      row.video_visit_id || row.event_id,
    ]);
    const group = groups.get(key) ?? [];
    group.push(row);
    groups.set(key, group);
  }
  return [...groups.entries()].map(([key, group]) => {
    const first = group[0];
    const sum = (key: string) => {
      const values = group
        .map((row) => row[key])
        .filter((v): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0);
      return values.length ? Math.round(values.reduce((a, b) => a + b, 0) * 1000) / 1000 : null;
    };
    const times = group
      .flatMap((row) => [
        row.interval_start_client_utc,
        row.ended_at_client_utc,
        row.occurred_at_utc,
      ])
      .filter((v): v is string => typeof v === "string" && Number.isFinite(Date.parse(v)))
      .sort((a, b) => Date.parse(a) - Date.parse(b));
    return {
      row_key: `video:${key}`,
      participant_code: first.participant_code,
      module_id: first.module_id,
      run_id: first.run_id,
      web_session_id: first.web_session_id,
      video_id: first.video_id,
      video_visit_id: first.video_visit_id,
      video_is_test: group.some((row) => row.video_is_test === true)
        ? true
        : group.every((row) => row.video_is_test === false)
          ? false
          : null,
      first_observed_at_utc: times[0] ?? null,
      last_observed_at_utc: times.at(-1) ?? null,
      video_playback_seconds: sum("video_playback_seconds"),
      video_visible_playback_seconds: sum("video_visible_playback_seconds"),
      video_unobserved_seconds: sum("video_unobserved_seconds"),
      reached_end: group.some((row) => row.video_player_state === 0),
      exit_observed: group.some((row) =>
        ["unmounted", "pagehide", "signed_out"].includes(String(row.reason)),
      ),
      error_count: group.filter((row) =>
        ["player_error", "api_load_error", "player_ready_timeout"].includes(String(row.reason)),
      ).length,
      observation_count: group.length,
    };
  });
}
