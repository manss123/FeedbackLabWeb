import type { AdminActivityRow, AdminSessionRow, AdminUserRow } from "@/lib/admin.functions";

export const RESEARCH_TIMEZONE = "Asia/Bangkok";
export type ResearchValue = string | number | boolean | null;
export type ResearchRow = Record<string, ResearchValue>;
export interface ResearchData {
  users: AdminUserRow[];
  sessions: AdminSessionRow[];
  events: AdminActivityRow[];
  codes: Record<string, string>;
}
export interface ResearchFilters {
  participant: string;
  from: string;
  to: string;
}
export const EMPTY_RESEARCH_FILTERS: ResearchFilters = { participant: "", from: "", to: "" };
export const VR_DIMENSIONS = [
  "speechClarity",
  "linguisticAppropriateness",
  "balance",
  "intentConsistency",
  "overall",
] as const;

export function timestamp(value: unknown): number | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const result = Date.parse(value);
  return Number.isFinite(result) ? result : null;
}
export function numeric(value: unknown, min = 0, max = Infinity): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max
    ? value
    : null;
}
function iso(value: unknown): string | null {
  const ms = timestamp(value);
  return ms === null ? null : new Date(ms).toISOString();
}
function seconds(start: unknown, end: unknown): number | null {
  const a = timestamp(start),
    b = timestamp(end);
  return a === null || b === null || b < a ? null : Math.round((b - a) / 1000);
}
export function bangkokDay(value: string): string | null {
  const ms = timestamp(value);
  return ms === null ? null : new Date(ms + 7 * 3600_000).toISOString().slice(0, 10);
}
function chronological<T extends { id: string; createdAt: string }>(rows: T[]): T[] {
  return [...rows].sort(
    (a, b) =>
      (timestamp(a.createdAt) ?? Infinity) - (timestamp(b.createdAt) ?? Infinity) ||
      a.id.localeCompare(b.id),
  );
}
export function inDateRange(date: string, filters: ResearchFilters): boolean {
  if (!filters.from && !filters.to) return true;
  const ms = timestamp(date);
  if (ms === null) return false;
  const from = filters.from ? Date.parse(`${filters.from}T00:00:00+07:00`) : -Infinity;
  const to = filters.to ? Date.parse(`${filters.to}T00:00:00+07:00`) + 86400_000 : Infinity;
  return ms >= from && ms < to;
}
export function participantIds(
  data: Pick<ResearchData, "users" | "sessions" | "events">,
): string[] {
  return [
    ...new Set([
      ...data.users.map((u) => u.uid),
      ...data.sessions.map((s) => s.userId),
      ...data.events.map((e) => e.userId),
    ]),
  ].sort();
}
export async function makeParticipantCodes(ids: string[]): Promise<Record<string, string>> {
  const entries = await Promise.all(
    ids.map(async (uid) => {
      const bytes = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(`FeedbackLabsVR:research:v1:${uid}`),
      );
      const hash = Array.from(new Uint8Array(bytes), (byte) =>
        byte.toString(16).padStart(2, "0"),
      ).join("");
      return [uid, `P-${hash.slice(0, 16)}`] as const;
    }),
  );
  if (new Set(entries.map(([, code]) => code)).size !== entries.length)
    throw new Error("Participant code collision");
  return Object.fromEntries(entries);
}

export function buildResearchLogs(
  data: ResearchData,
  filters: ResearchFilters,
  includeText = false,
) {
  const code = (uid: string) => data.codes[uid];
  const selected = (uid: string) => !filters.participant || filters.participant === uid;
  const allEvents = chronological(data.events);
  const events = allEvents.filter((e) => selected(e.userId) && inDateRange(e.createdAt, filters));
  const allSessions = chronological(data.sessions);
  const sessions = allSessions.filter(
    (s) => selected(s.userId) && inDateRange(s.createdAt, filters),
  );
  const sessionMap = new Map(allSessions.map((s) => [s.id, s]));
  const sequence = new Map<string, number>();
  const previous = new Map<string, string>();
  const eventRows = new Map<string, ResearchRow>();

  for (const e of allEvents) {
    const n = (sequence.get(e.userId) ?? 0) + 1;
    sequence.set(e.userId, n);
    const linked = e.sessionId ? sessionMap.get(e.sessionId) : undefined;
    const linkStatus = !e.sessionId
      ? "not_recorded"
      : !linked
        ? "session_missing"
        : linked.userId !== e.userId || (e.scenarioId && e.scenarioId !== linked.scenarioId)
          ? "mismatch"
          : "matched";
    eventRows.set(e.id, {
      participant_code: code(e.userId),
      event_id: e.id,
      sequence_in_loaded_history: n,
      event_type: e.type,
      recorded_at_utc: iso(e.createdAt),
      recorded_date_bangkok: bangkokDay(e.createdAt),
      gap_from_previous_event_seconds: seconds(previous.get(e.userId), e.createdAt),
      module_id: e.moduleId ?? null,
      scenario_id: e.scenarioId ?? null,
      session_id: e.sessionId ?? null,
      session_link_status: linkStatus,
      timestamp_valid: timestamp(e.createdAt) !== null,
      occurred_at_utc: iso(e.occurredAt),
      web_session_id: e.webSessionId ?? null,
      browser_id: e.browserId ?? null,
      tab_id: e.tabId ?? null,
      run_id: e.runId ?? null,
      step_visit_id: e.stepVisitId ?? null,
      page_visit_id: e.pageVisitId ?? null,
      step_id: e.stepId ?? null,
      assessment_id: e.assessmentId ?? null,
      path: e.path ?? null,
      reason: e.reason ?? null,
      started_at_client_utc: iso(e.startedAtClient),
      ended_at_client_utc: iso(e.endedAtClient),
      interval_start_client_utc: iso(e.intervalStartClient),
      elapsed_seconds: numeric(e.elapsedSeconds),
      visible_seconds: numeric(e.visibleSeconds),
      active_proxy_seconds: numeric(e.activeSeconds),
      unobserved_seconds: numeric(e.unobservedSeconds),
      visible: e.visible ?? null,
      focused: e.focused ?? null,
      idle: e.idle ?? null,
      video_id: e.videoId ?? null,
      video_visit_id: e.videoVisitId ?? null,
      video_is_test: e.videoIsTest ?? null,
      video_player_state: numeric(e.videoPlayerState, -1),
      video_playback_seconds: numeric(e.videoPlaybackSeconds),
      video_visible_playback_seconds: numeric(e.videoVisiblePlaybackSeconds),
      video_unobserved_seconds: numeric(e.videoUnobservedSeconds),
      video_position_seconds: numeric(e.videoPositionSeconds),
      video_playback_rate: numeric(e.videoPlaybackRate),
      video_error_code: numeric(e.videoErrorCode),
      schema_version: e.schemaVersion ?? 1,
    });
    if (timestamp(e.createdAt) !== null) previous.set(e.userId, e.createdAt);
  }

  const attemptCounts = new Map<string, number>();
  const attempts = new Map<string, number>();
  for (const s of allSessions) {
    if (timestamp(s.createdAt) === null) continue;
    const key = JSON.stringify([s.userId, s.scenarioId]);
    const n = (attemptCounts.get(key) ?? 0) + 1;
    attemptCounts.set(key, n);
    attempts.set(s.id, n);
  }
  const vrRows = sessions.map((s) => {
    // Explicit session links only. Old scenario-only events are not guessed
    // into a session; matching by time could misattribute concurrent practice.
    const linked = allEvents.filter(
      (e) =>
        e.sessionId === s.id &&
        e.userId === s.userId &&
        (!e.scenarioId || e.scenarioId === s.scenarioId),
    );
    const stageTimes = [
      s.stage1?.completedAt,
      s.stage2?.completedAt,
      s.stage3?.completedAt,
      s.stage4?.completedAt,
    ];
    const recordedStages = [s.stage1, s.stage2, s.stage3, s.stage4].filter(Boolean).length;
    const completionEvents = linked.filter((e) => e.type === "vr_scenario_completed");
    const ratings = Array.isArray(s.stage2?.selfRatings) ? s.stage2.selfRatings : [];
    const row: ResearchRow = {
      participant_code: code(s.userId),
      session_id: s.id,
      scenario_id: s.scenarioId,
      attempt_index_in_loaded_history: attempts.get(s.id) ?? null,
      started_at_utc: iso(s.createdAt),
      stage1_completed_at_utc: iso(stageTimes[0]),
      stage2_completed_at_utc: iso(stageTimes[1]),
      stage3_completed_at_utc: iso(stageTimes[2]),
      stage4_completed_at_utc: iso(stageTimes[3]),
      recorded_stage_count: recordedStages,
      record_status: recordedStages === 4 ? "all_stages_recorded" : "partial_record",
      completion_event_count: completionEvents.length,
      linked_retry_event_count: linked.filter((e) => e.type === "vr_scenario_retried").length,
      elapsed_to_stage4_seconds: seconds(s.createdAt, s.stage4?.completedAt),
      round1_recorded_duration_seconds: numeric(s.stage1?.durationSeconds),
      round2_recorded_duration_seconds: numeric(s.stage4?.durationSeconds),
      round1_transcript_characters:
        typeof s.stage1?.transcript === "string" ? Array.from(s.stage1.transcript).length : null,
      round2_transcript_characters:
        typeof s.stage4?.transcript === "string" ? Array.from(s.stage4.transcript).length : null,
      round1_ai_present: s.stage3?.aiScores != null,
      round2_ai_present: s.stage4?.aiScores != null,
      timestamp_order_valid:
        timestamp(s.createdAt) !== null &&
        stageTimes.every(
          (t, i) =>
            t == null ||
            (timestamp(t) !== null &&
              [s.createdAt, ...stageTimes.slice(0, i)].every(
                (prior) =>
                  prior == null ||
                  (timestamp(prior) !== null && timestamp(t)! >= timestamp(prior)!),
              )),
        ),
    };
    for (const key of VR_DIMENSIONS) {
      const a = numeric(s.stage3?.aiScores?.[key], 0, 100),
        b = numeric(s.stage4?.aiScores?.[key], 0, 100);
      row[`round1_${key}`] = a;
      row[`round2_${key}`] = b;
      row[`delta_${key}`] = a !== null && b !== null ? b - a : null;
    }
    for (let i = 0; i < 8; i++) row[`self_rating_${i + 1}`] = numeric(ratings[i], 1, 5);
    row.selected_goal_count = Array.isArray(s.stage3?.selectedGoals)
      ? s.stage3.selectedGoals.length
      : null;
    if (includeText) {
      row.round1_transcript = s.stage1?.transcript ?? null;
      row.round2_transcript = s.stage4?.transcript ?? null;
      row.best_part = s.stage2?.bestPart ?? null;
      row.personal_goal = s.stage2?.personalGoal ?? null;
      row.selected_goals_json = s.stage3 ? JSON.stringify(s.stage3.selectedGoals ?? []) : null;
      row.custom_goal = s.stage3?.customGoal ?? null;
    }
    return row;
  });

  const moduleGroups = new Map<string, AdminActivityRow[]>();
  for (const e of events) {
    if (!["module_started", "module_completed"].includes(e.type) || !e.moduleId) continue;
    const key = JSON.stringify([e.userId, e.moduleId]);
    moduleGroups.set(key, [...(moduleGroups.get(key) ?? []), e]);
  }
  const moduleRows: ResearchRow[] = [...moduleGroups.values()].map((group) => {
    const starts = group.filter((e) => e.type === "module_started");
    const completions = group.filter((e) => e.type === "module_completed");
    const firstCompletion = completions.find((e) => timestamp(e.createdAt) !== null);
    return {
      participant_code: code(group[0].userId),
      module_id: group[0].moduleId!,
      observed_start_count: starts.length,
      observed_completion_count: completions.length,
      observed_reopen_after_completion_count: firstCompletion
        ? starts.filter(
            (e) =>
              timestamp(e.createdAt) !== null &&
              timestamp(e.createdAt)! > timestamp(firstCompletion.createdAt)!,
          ).length
        : null,
      first_start_at_utc: iso(starts.find((e) => timestamp(e.createdAt) !== null)?.createdAt),
      last_completion_at_utc: iso(
        [...completions].reverse().find((e) => timestamp(e.createdAt) !== null)?.createdAt,
      ),
      active_learning_seconds: null,
    };
  });

  const hasDate = Boolean(filters.from || filters.to);
  const ids = participantIds(data).filter(
    (uid) =>
      selected(uid) &&
      (!hasDate || events.some((e) => e.userId === uid) || sessions.some((s) => s.userId === uid)),
  );
  const participantRows: ResearchRow[] = ids.map((uid) => {
    const ownEvents = events.filter((e) => e.userId === uid);
    const ownSessions = vrRows.filter((r) => r.participant_code === code(uid));
    const dates = ownEvents.map((e) => iso(e.createdAt)).filter((v): v is string => v !== null);
    const user = data.users.find((u) => u.uid === uid);
    const ownModules = moduleRows.filter((r) => r.participant_code === code(uid));
    return {
      participant_code: code(uid),
      profile_record_present: Boolean(user?.profile),
      research_consent_recorded:
        typeof user?.consent?.researchConsent === "boolean" ? user.consent.researchConsent : null,
      faculty: user?.profile?.faculty ?? null,
      department: user?.profile?.department ?? null,
      teaching_experience_years: numeric(user?.profile?.teachingExperienceYears),
      observed_event_count: ownEvents.length,
      observed_event_days: new Set(ownEvents.map((e) => bangkokDay(e.createdAt)).filter(Boolean))
        .size,
      first_event_at_utc: dates[0] ?? null,
      last_event_at_utc: dates.at(-1) ?? null,
      observed_login_count: ownEvents.filter((e) => e.type === "signed_in").length,
      modules_with_start_event: ownModules.filter((r) => Number(r.observed_start_count) > 0).length,
      modules_with_completion_event: ownModules.filter(
        (r) => Number(r.observed_completion_count) > 0,
      ).length,
      vr_session_count: ownSessions.length,
      vr_all_stages_recorded_count: ownSessions.filter(
        (r) => r.record_status === "all_stages_recorded",
      ).length,
      vr_paired_overall_count: ownSessions.filter((r) => r.delta_overall !== null).length,
      observed_retry_event_count: ownEvents.filter((e) => e.type === "vr_scenario_retried").length,
      unlinked_vr_event_count: ownEvents.filter(
        (e) => e.type.startsWith("vr_") && eventRows.get(e.id)?.session_link_status !== "matched",
      ).length,
      invalid_event_timestamp_count: ownEvents.filter((e) => timestamp(e.createdAt) === null)
        .length,
    };
  });
  // Web overlap uses bounded observed heartbeat intervals, never open-ended logins.
  const webGroups = new Map<string, AdminActivityRow[]>();
  for (const e of events) {
    if (!e.webSessionId) continue;
    const key = JSON.stringify([e.userId, e.webSessionId]);
    webGroups.set(key, [...(webGroups.get(key) ?? []), e]);
  }
  const webEntries = [...webGroups.values()];
  const interval = (e: AdminActivityRow): [number, number] | null => {
    const a = timestamp(e.intervalStartClient),
      b = timestamp(e.occurredAt);
    if (
      e.type !== "web_heartbeat" ||
      a === null ||
      b === null ||
      b <= a ||
      b - a > 45_000 ||
      numeric(e.unobservedSeconds) !== 0 ||
      numeric(e.elapsedSeconds) === null ||
      Math.abs((b - a) / 1000 - e.elapsedSeconds!) > 2
    )
      return null;
    return [a, b];
  };
  const intervalCache = new Map(
    webEntries.map((group) => [
      group,
      group
        .map(interval)
        .filter((v): v is [number, number] => v !== null)
        .sort((a, b) => a[0] - b[0]),
    ]),
  );
  const overlaps = (a: AdminActivityRow[], b: AdminActivityRow[]) => {
    const left = intervalCache.get(a)!,
      right = intervalCache.get(b)!;
    let i = 0,
      j = 0;
    while (i < left.length && j < right.length) {
      if (Math.min(left[i][1], right[j][1]) > Math.max(left[i][0], right[j][0])) return true;
      if (left[i][1] <= right[j][1]) i++;
      else j++;
    }
    return false;
  };
  const webRows: ResearchRow[] = webEntries.map((group) => {
    const first = group[0];
    const beats = group.filter((e) => e.type === "web_heartbeat");
    const sum = (key: "visibleSeconds" | "activeSeconds" | "unobservedSeconds") => {
      const values = beats.map((e) => numeric(e[key]));
      // A missing interval measurement must not become a fabricated zero.
      return values.length && values.every((v) => v !== null)
        ? values.reduce<number>((total, value) => total + value!, 0)
        : null;
    };
    const peers = webEntries.filter(
      (other) => other !== group && other[0].userId === first.userId && overlaps(group, other),
    );
    const times = group.map((e) => timestamp(e.occurredAt)).filter((v): v is number => v !== null);
    return {
      participant_code: code(first.userId),
      web_session_id: first.webSessionId!,
      browser_id: first.browserId ?? null,
      tab_id: first.tabId ?? null,
      browser_id_persistent: first.browserIdPersistent ?? null,
      device_category: first.deviceCategory ?? null,
      browser_family: first.browserFamily ?? null,
      auth_at_utc: iso(group.find((e) => e.authTime)?.authTime),
      first_observed_at_utc: times.length ? new Date(Math.min(...times)).toISOString() : null,
      last_observed_at_utc: times.length ? new Date(Math.max(...times)).toISOString() : null,
      start_event_present: group.some((e) => e.type === "web_session_started"),
      end_event_present: group.some((e) => e.type === "web_session_ended"),
      heartbeat_count: beats.length,
      page_entry_count: group.filter((e) => e.type === "page_entered").length,
      visible_seconds: sum("visibleSeconds"),
      active_proxy_seconds: sum("activeSeconds"),
      unobserved_seconds: sum("unobservedSeconds"),
      overlapping_web_session_count: peers.length,
      overlapping_other_browser_count: new Set(
        peers
          .filter((p) => p[0].browserId && first.browserId && p[0].browserId !== first.browserId)
          .map((p) => p[0].browserId),
      ).size,
    };
  });
  const stepGroups = new Map<string, AdminActivityRow[]>();
  for (const e of events) {
    if (!e.stepVisitId) continue;
    const key = JSON.stringify([e.userId, e.stepVisitId]);
    stepGroups.set(key, [...(stepGroups.get(key) ?? []), e]);
  }
  const stepRows: ResearchRow[] = [...stepGroups.values()].map((group) => {
    const first = group[0];
    const end = group.find(
      (e) => e.type === "learning_step_ended" || e.type === "assessment_finished",
    );
    return {
      participant_code: code(first.userId),
      run_id: first.runId ?? null,
      step_visit_id: first.stepVisitId!,
      web_session_id: first.webSessionId ?? null,
      session_id: first.sessionId ?? null,
      module_id: first.moduleId ?? null,
      scenario_id: first.scenarioId ?? null,
      assessment_id: first.assessmentId ?? null,
      step_id: first.stepId ?? null,
      started_at_client_utc: iso(first.startedAtClient),
      ended_at_client_utc: iso(end?.endedAtClient),
      elapsed_seconds: numeric(end?.elapsedSeconds),
      visible_seconds: numeric(end?.visibleSeconds),
      active_proxy_seconds: numeric(end?.activeSeconds),
      unobserved_seconds: numeric(end?.unobservedSeconds),
      end_reason: end?.reason ?? null,
      end_event_present: Boolean(end),
    };
  });
  return {
    web: webRows,
    steps: stepRows,
    participants: participantRows,
    vr: vrRows,
    modules: moduleRows,
    activity: events.map((e) => eventRows.get(e.id)!),
    sessions,
  };
}

// Fixed column lists keep even empty exports usable in analysis software.
export const RESEARCH_COLUMNS = {
  web: [
    "participant_code",
    "web_session_id",
    "browser_id",
    "tab_id",
    "browser_id_persistent",
    "device_category",
    "browser_family",
    "auth_at_utc",
    "first_observed_at_utc",
    "last_observed_at_utc",
    "start_event_present",
    "end_event_present",
    "heartbeat_count",
    "page_entry_count",
    "visible_seconds",
    "active_proxy_seconds",
    "unobserved_seconds",
    "overlapping_web_session_count",
    "overlapping_other_browser_count",
  ],
  steps: [
    "participant_code",
    "run_id",
    "step_visit_id",
    "web_session_id",
    "session_id",
    "module_id",
    "scenario_id",
    "assessment_id",
    "step_id",
    "started_at_client_utc",
    "ended_at_client_utc",
    "elapsed_seconds",
    "visible_seconds",
    "active_proxy_seconds",
    "unobserved_seconds",
    "end_reason",
    "end_event_present",
  ],
  participants: [
    "participant_code",
    "profile_record_present",
    "research_consent_recorded",
    "faculty",
    "department",
    "teaching_experience_years",
    "observed_event_count",
    "observed_event_days",
    "first_event_at_utc",
    "last_event_at_utc",
    "observed_login_count",
    "modules_with_start_event",
    "modules_with_completion_event",
    "vr_session_count",
    "vr_all_stages_recorded_count",
    "vr_paired_overall_count",
    "observed_retry_event_count",
    "unlinked_vr_event_count",
    "invalid_event_timestamp_count",
  ],
  vr: [
    "participant_code",
    "session_id",
    "scenario_id",
    "attempt_index_in_loaded_history",
    "started_at_utc",
    "stage1_completed_at_utc",
    "stage2_completed_at_utc",
    "stage3_completed_at_utc",
    "stage4_completed_at_utc",
    "recorded_stage_count",
    "record_status",
    "completion_event_count",
    "linked_retry_event_count",
    "elapsed_to_stage4_seconds",
    "round1_recorded_duration_seconds",
    "round2_recorded_duration_seconds",
    "round1_transcript_characters",
    "round2_transcript_characters",
    "round1_ai_present",
    "round2_ai_present",
    "timestamp_order_valid",
    ...VR_DIMENSIONS.flatMap((k) => [`round1_${k}`, `round2_${k}`, `delta_${k}`]),
    ...Array.from({ length: 8 }, (_, i) => `self_rating_${i + 1}`),
    "selected_goal_count",
  ],
  modules: [
    "participant_code",
    "module_id",
    "observed_start_count",
    "observed_completion_count",
    "observed_reopen_after_completion_count",
    "first_start_at_utc",
    "last_completion_at_utc",
    "active_learning_seconds",
  ],
  activity: [
    "participant_code",
    "event_id",
    "sequence_in_loaded_history",
    "event_type",
    "recorded_at_utc",
    "recorded_date_bangkok",
    "gap_from_previous_event_seconds",
    "module_id",
    "scenario_id",
    "session_id",
    "session_link_status",
    "timestamp_valid",
    "occurred_at_utc",
    "web_session_id",
    "browser_id",
    "tab_id",
    "run_id",
    "step_visit_id",
    "step_id",
    "assessment_id",
    "path",
    "reason",
    "started_at_client_utc",
    "ended_at_client_utc",
    "interval_start_client_utc",
    "elapsed_seconds",
    "visible_seconds",
    "active_proxy_seconds",
    "unobserved_seconds",
    "visible",
    "focused",
    "idle",
    "schema_version",
    "page_visit_id",
    "video_id",
    "video_visit_id",
    "video_is_test",
    "video_player_state",
    "video_playback_seconds",
    "video_visible_playback_seconds",
    "video_unobserved_seconds",
    "video_position_seconds",
    "video_playback_rate",
    "video_error_code",
  ],
} as const;
export const TEXT_COLUMNS = [
  "round1_transcript",
  "round2_transcript",
  "best_part",
  "personal_goal",
  "selected_goals_json",
  "custom_goal",
];

export function researchCsv(rows: ResearchRow[], columns: readonly string[]): string {
  const escape = (value: ResearchValue | undefined) => {
    let text = value == null ? "" : String(value);
    // Prevent spreadsheet formula execution while preserving negative numbers.
    if (typeof value === "string" && /^[\s]*[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };
  return (
    "\ufeff" +
    [
      columns.map(escape).join(","),
      ...rows.map((row) => columns.map((c) => escape(row[c])).join(",")),
    ].join("\r\n")
  );
}
