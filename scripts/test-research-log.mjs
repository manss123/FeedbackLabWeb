import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import { webcrypto } from "node:crypto";
import ts from "typescript";

const module = { exports: {} };
const source = readFileSync(new URL("../src/lib/research-log.ts", import.meta.url), "utf8");
runInNewContext(
  ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText,
  { exports: module.exports, module, crypto: webcrypto, TextEncoder },
);
const {
  buildResearchLogs,
  EMPTY_RESEARCH_FILTERS,
  inDateRange,
  makeParticipantCodes,
  participantIds,
  researchCsv,
  RESEARCH_COLUMNS,
} = module.exports;
const score = (overall) => ({
  overall,
  speechClarity: overall,
  linguisticAppropriateness: overall,
  balance: overall,
  intentConsistency: overall,
});
const event = (id, type, time, extra = {}) => ({
  id,
  userId: "u1",
  type,
  createdAt: time,
  ...extra,
});
const session = (id, start, extra = {}) => ({
  id,
  userId: "u1",
  scenarioId: "s1",
  createdAt: start,
  stage1: null,
  stage2: null,
  stage3: null,
  stage4: null,
  ...extra,
});
const data = (extra) => ({
  users: [],
  events: [],
  sessions: [],
  codes: { u1: "P-1", u2: "P-2" },
  ...extra,
});

test("video measurements survive research CSV/JSON; old records remain missing", () => {
  const logs = buildResearchLogs(
    data({
      events: [
        event("v1", "video_observation", "2026-09-16T02:00:00Z", {
          moduleId: "m1",
          videoId: "M7lc1UVf-VE",
          videoVisitId: "vv1",
          videoIsTest: true,
          videoPlayerState: 2,
          videoPlaybackSeconds: 10,
          videoVisiblePlaybackSeconds: 8,
          videoUnobservedSeconds: 0,
          videoPositionSeconds: 120,
          videoPlaybackRate: 2,
        }),
        event("legacy", "module_started", "2026-09-16T03:00:00Z", { moduleId: "m1" }),
      ],
    }),
    EMPTY_RESEARCH_FILTERS,
  );
  assert.equal(logs.activity[0].video_visible_playback_seconds, 8);
  assert.equal(logs.activity[0].video_is_test, true);
  assert.equal(logs.activity[1].video_visible_playback_seconds, null);
  assert.ok(RESEARCH_COLUMNS.activity.includes("video_visible_playback_seconds"));
  assert.ok(researchCsv(logs.activity, RESEARCH_COLUMNS.activity).includes("M7lc1UVf-VE"));
});

test("Bangkok date boundaries include the entire final day and exclude invalid timestamps", () => {
  const filters = { ...EMPTY_RESEARCH_FILTERS, from: "2026-09-16", to: "2026-09-16" };
  assert.equal(inDateRange("2026-09-15T17:00:00Z", filters), true);
  assert.equal(inDateRange("2026-09-15T16:59:59Z", filters), false);
  assert.equal(inDateRange("2026-09-16T16:59:59.999Z", filters), true);
  assert.equal(inDateRange("2026-09-16T17:00:00Z", filters), false);
  assert.equal(inDateRange("invalid", filters), false);
  assert.equal(inDateRange("invalid", EMPTY_RESEARCH_FILTERS), true);
});

test("missing AI remains null, real zero is retained, deltas need two valid scores", () => {
  const logs = buildResearchLogs(
    data({
      sessions: [
        session("missing", "2026-09-16T01:00:00Z", {
          stage3: { aiScores: null },
          stage4: { aiScores: score(75) },
        }),
        session("zero", "2026-09-16T02:00:00Z", {
          stage3: { aiScores: score(0) },
          stage4: { aiScores: score(10) },
        }),
        session("invalid", "2026-09-16T03:00:00Z", {
          stage3: { aiScores: score(NaN) },
          stage4: { aiScores: score(120) },
        }),
      ],
    }),
    EMPTY_RESEARCH_FILTERS,
  );
  assert.equal(logs.vr[0].round1_overall, null);
  assert.equal(logs.vr[0].delta_overall, null);
  assert.equal(logs.vr[1].round1_overall, 0);
  assert.equal(logs.vr[1].delta_overall, 10);
  assert.equal(logs.vr[2].round2_overall, null);
  assert.equal(logs.participants[0].vr_paired_overall_count, 1);
});

test("only explicit matching session links contribute to retry/completion counts", () => {
  const logs = buildResearchLogs(
    data({
      sessions: [session("s", "2026-09-16T00:00:00Z")],
      events: [
        event("e1", "vr_scenario_retried", "2026-09-16T01:00:00Z", { scenarioId: "s1" }),
        event("e2", "vr_scenario_retried", "2026-09-16T02:00:00Z", {
          sessionId: "s",
          scenarioId: "s1",
        }),
        event("e3", "vr_scenario_retried", "2026-09-16T03:00:00Z", {
          sessionId: "s",
          scenarioId: "s2",
        }),
        event("e4", "vr_scenario_completed", "2026-09-16T04:00:00Z", {
          sessionId: "s",
          userId: "u2",
        }),
        event("e5", "vr_scenario_completed", "2026-09-16T05:00:00Z", { sessionId: "missing" }),
      ],
    }),
    EMPTY_RESEARCH_FILTERS,
  );
  assert.equal(logs.vr[0].linked_retry_event_count, 1);
  assert.equal(logs.vr[0].completion_event_count, 0);
  assert.equal(logs.vr[0].record_status, "partial_record");
  assert.equal(logs.activity[0].session_link_status, "not_recorded");
  assert.equal(logs.activity[2].session_link_status, "mismatch");
  assert.equal(logs.activity[3].session_link_status, "mismatch");
  assert.equal(logs.activity[4].session_link_status, "session_missing");
});

test("history sequence and attempts are stable before filtering; days are per participant", () => {
  const logs = buildResearchLogs(
    data({
      sessions: [session("b", "2026-09-16T00:00:00Z"), session("a", "2026-09-14T00:00:00Z")],
      events: [
        event("e3", "signed_in", "2026-09-16T00:01:00Z"),
        event("e1", "signed_in", "2026-09-14T00:00:00Z"),
        event("e2", "signed_in", "2026-09-16T00:00:00Z"),
      ],
    }),
    { participant: "u1", from: "2026-09-16", to: "2026-09-16" },
  );
  assert.equal(logs.activity[0].sequence_in_loaded_history, 2);
  assert.equal(logs.activity[0].gap_from_previous_event_seconds, 172800);
  assert.equal(logs.vr[0].attempt_index_in_loaded_history, 2);
  assert.equal(logs.participants[0].observed_event_days, 1);
});

test("module logs count observed reopens without fabricating duration or attempts", () => {
  const logs = buildResearchLogs(
    data({
      events: [
        event("e1", "module_started", "2026-09-16T00:00:00Z", { moduleId: "m1" }),
        event("e2", "module_completed", "2026-09-16T01:00:00Z", { moduleId: "m1" }),
        event("e3", "module_started", "2026-09-16T02:00:00Z", { moduleId: "m1" }),
        event("e4", "module_started", "2026-09-16T03:00:00Z", { moduleId: "m2" }),
      ],
    }),
    EMPTY_RESEARCH_FILTERS,
  );
  assert.equal(logs.modules.length, 2);
  assert.equal(logs.modules[0].observed_start_count, 2);
  assert.equal(logs.modules[0].observed_reopen_after_completion_count, 1);
  assert.equal(logs.modules[0].active_learning_seconds, null);
  assert.equal(logs.modules[1].observed_reopen_after_completion_count, null);
});

test("sessions/events without user documents remain in the participant cohort", () => {
  const input = data({
    users: [{ uid: "u2" }],
    events: [event("e", "signed_in", "bad")],
    sessions: [session("s", "2026-09-16T00:00:00Z")],
  });
  assert.equal(participantIds(input).length, 2);
  const logs = buildResearchLogs(input, EMPTY_RESEARCH_FILTERS);
  assert.equal(logs.participants.length, 2);
  assert.equal(logs.participants[0].profile_record_present, false);
  assert.equal(logs.participants[0].research_consent_recorded, null);
  assert.equal(logs.participants[0].invalid_event_timestamp_count, 1);
  assert.equal(logs.activity[0].recorded_at_utc, null);
});

test("session cohort keeps later lifecycle evidence and reports backwards time as invalid", () => {
  const logs = buildResearchLogs(
    data({
      sessions: [
        session("s", "2026-09-16T00:00:00Z", {
          stage1: { completedAt: "2026-09-15T00:00:00Z" },
          stage4: { completedAt: "2026-09-17T00:00:00Z" },
        }),
      ],
      events: [event("end", "vr_scenario_completed", "2026-09-17T00:00:00Z", { sessionId: "s" })],
    }),
    { participant: "", from: "2026-09-16", to: "2026-09-16" },
  );
  assert.equal(logs.activity.length, 0);
  assert.equal(logs.vr[0].completion_event_count, 1);
  assert.equal(logs.vr[0].timestamp_order_valid, false);
  assert.equal(logs.vr[0].elapsed_to_stage4_seconds, 86400);
});

test("text export is opt-in and never includes names, emails, or raw user IDs", () => {
  const input = data({
    users: [{ uid: "u1", profile: { displayName: "SECRET NAME", email: "secret@example.test" } }],
    sessions: [
      session("s", "2026-09-16T00:00:00Z", {
        stage1: { transcript: "PRIVATE TRANSCRIPT", durationSeconds: 0 },
        stage2: { selfRatings: [1, 2, 3, 4, 5, 0, null, 6], personalGoal: "PRIVATE GOAL" },
      }),
    ],
  });
  const logs = buildResearchLogs(input, EMPTY_RESEARCH_FILTERS);
  const exported = JSON.stringify({
    participants: logs.participants,
    vr: logs.vr,
    activity: logs.activity,
  });
  assert.equal(exported.includes("SECRET"), false);
  assert.equal(exported.includes("PRIVATE"), false);
  assert.equal(exported.includes('"u1"'), false);
  assert.equal(logs.vr[0].self_rating_6, null);
  assert.equal(logs.vr[0].self_rating_8, null);
  assert.equal(
    buildResearchLogs(input, EMPTY_RESEARCH_FILTERS, true).vr[0].round1_transcript,
    "PRIVATE TRANSCRIPT",
  );
});

test("participant codes are stable across order/subsets and differ between users", async () => {
  const first = await makeParticipantCodes(["u1", "u2"]);
  const second = await makeParticipantCodes(["u2", "u1"]);
  assert.equal(first.u1, second.u1);
  assert.equal(first.u1, (await makeParticipantCodes(["u1"])).u1);
  assert.notEqual(first.u1, first.u2);
  assert.match(first.u1, /^P-[0-9a-f]{16}$/);
});

test("CSV preserves missing/zero/negative values, escapes text, and includes empty dataset headers", () => {
  const csv = researchCsv(
    [{ missing: null, zero: 0, delta: -10, text: '=HYPERLINK("x")\nnext' }],
    ["missing", "zero", "delta", "text"],
  );
  assert.ok(csv.startsWith("\ufeff"));
  assert.ok(csv.includes('"","0","-10"'));
  assert.ok(csv.includes('"\'=HYPERLINK(""x"")\nnext"'));
  assert.equal(researchCsv([], RESEARCH_COLUMNS.modules).split("\r\n").length, 1);
});
