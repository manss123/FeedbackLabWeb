import type { ResearchRow } from "@/lib/research-log";

// Keep rendering and pagination identity consistent. A web session can contain
// multiple video visits; the summary supplies its exact composite grouping key.
export function researchRowKey(row: ResearchRow): string {
  if (typeof row.row_key === "string") return row.row_key;
  return JSON.stringify([
    row.participant_code,
    row.event_id,
    row.step_visit_id,
    row.video_visit_id,
    row.web_session_id,
    row.session_id,
    row.module_id,
    row.run_id,
    row.video_id,
  ]);
}
