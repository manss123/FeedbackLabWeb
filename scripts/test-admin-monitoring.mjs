import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { test } from "node:test";
import ts from "typescript";
const module = { exports: {} };
runInNewContext(
  ts.transpileModule(
    readFileSync(new URL("../src/lib/admin-monitoring.ts", import.meta.url), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
  ).outputText,
  { module, exports: module.exports },
);
const { monitoringSummary } = module.exports;
test("daily chart counts unique learners, not telemetry frequency", () => {
  const events = [
    { recorded_date_bangkok: "2026-09-28", participant_code: "a" },
    { recorded_date_bangkok: "2026-09-28", participant_code: "a" },
    { recorded_date_bangkok: "2026-09-28", participant_code: "b" },
    { recorded_date_bangkok: "2026-09-27", participant_code: "a" },
  ];
  const result = monitoringSummary(events, [], []);
  assert.equal(result.observedLearners, 2);
  assert.deepEqual(JSON.parse(JSON.stringify(result.activity)), [
    { day: "2026-09-27", learners: 1 },
    { day: "2026-09-28", learners: 2 },
  ]);
});
test("module counts deduplicate repeat starts and keep completion without start", () => {
  const rows = [
    {
      module_id: "m1",
      participant_code: "a",
      observed_start_count: 4,
      observed_completion_count: 0,
    },
    {
      module_id: "m1",
      participant_code: "a",
      observed_start_count: 1,
      observed_completion_count: 0,
    },
    {
      module_id: "m1",
      participant_code: "b",
      observed_start_count: 0,
      observed_completion_count: 1,
    },
  ];
  const first = monitoringSummary([], rows, []).learning[0];
  assert.equal(first.started, 1);
  assert.equal(first.completed, 1);
});
test("paired averages include real zeros and exclude unavailable or invalid scores", () => {
  const result = monitoringSummary(
    [],
    [],
    [
      { round1_overall: 0, round2_overall: 20 },
      { round1_overall: 60, round2_overall: 100 },
      { round1_overall: null, round2_overall: 100 },
      { round1_overall: NaN, round2_overall: 90 },
    ],
  );
  assert.equal(result.paired, 2);
  assert.equal(result.incompleteScores, 2);
  assert.equal(result.scores[0].score, 30);
  assert.equal(result.scores[1].score, 60);
});
test("empty or filtered data never generates example scores", () => {
  const result = monitoringSummary([], [], []);
  assert.equal(result.scores.length, 0);
  assert.equal(result.activity.length, 0);
  assert.equal(result.observedLearners, 0);
});
