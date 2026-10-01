import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
const module = { exports: {} };
runInNewContext(
  ts.transpileModule(
    readFileSync(new URL("../src/lib/module3-mini-game.ts", import.meta.url), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
  ).outputText,
  { module, exports: module.exports },
);
const { newMiniGame, gradeStep, recordAttempt, miniGameResult } = module.exports;
const keys = [
  [[1], [2], [1]],
  [[2], [0, 1, 2, 3], [1, 4, 7]],
  [[1], [2], [2]],
];
const timing = {
  at: "2026-10-01T00:00:02Z",
  presentedAt: "2026-10-01T00:00:00Z",
  responseTimeMs: 2000.25,
};
function started() {
  return { ...newMiniGame(), started: true };
}
function solveThrough(state, round, step) {
  for (let r = 0; r <= round; r++)
    for (let s = 0; s < 3; s++) {
      if (r === round && s > step) break;
      state = recordAttempt(state, r, s, keys[r][s], timing);
    }
  return state;
}
test("PDF answer keys complete all 9 steps with round scores 3/3/4", () => {
  const state = solveThrough(started(), 2, 2);
  const result = miniGameResult(state);
  assert.equal(result.completed, true);
  assert.equal(result.firstAttemptScore, 10);
  assert.equal(result.finalLearningScore, 10);
  assert.deepEqual(
    Array.from(result.rounds, (r) => r.finalLearningScore),
    [3, 3, 4],
  );
  assert.equal(
    JSON.stringify(miniGameResult(JSON.parse(JSON.stringify(state)))),
    JSON.stringify(result),
  );
});
test("failed first attempt is preserved after hint and retry", () => {
  let state = recordAttempt(started(), 0, 0, [0], timing);
  state = recordAttempt(state, 0, 0, [1], timing);
  const step = miniGameResult(state).rounds[0].steps[0];
  assert.equal(step.firstAttemptScore, 0);
  assert.equal(step.finalLearningScore, 1);
  assert.equal(step.retryCount, 1);
  assert.equal(step.attempts[0].hintDisplayed, true);
  assert.equal(step.attempts[1].hintDisplayed, false);
  assert.equal(step.attempts[0].responseTimeMs, 2000);
  assert.equal(step.attempts[0].errorTypes[0], "emotion_misread");
});
test("multi-select requires A-D, excludes E, independent of selection order", () => {
  for (let mask = 1; mask < 32; mask++) {
    const selected = Array.from({ length: 5 }, (_, i) => i).filter((i) => mask & (1 << i));
    const grade = gradeStep(1, 1, selected);
    assert.equal(grade.correct, mask === 15);
    assert.equal(grade.score, 0);
  }
  assert.equal(gradeStep(1, 1, [3, 1, 0, 2]).correct, true);
});
test("delivery gives one point per matching dimension, with no duplicate or invalid cards", () => {
  assert.equal(gradeStep(1, 2, [0, 4, 7]).score, 2);
  assert.equal(gradeStep(1, 2, [4, 1, 7]).score, 1);
  for (const selection of [
    [1, 1, 7],
    [1, -1, 7],
    [1, 4, 9],
    [1, 4],
    [1, 4, 7, 8],
  ])
    assert.throws(() => gradeStep(1, 2, selection));
  let state = solveThrough(started(), 1, 1);
  state = recordAttempt(state, 1, 2, [0, 4, 7], timing);
  state = recordAttempt(state, 1, 2, [1, 4, 7], timing);
  const r = miniGameResult(state).rounds[1];
  assert.equal(r.firstAttemptScore, 2);
  assert.equal(r.finalLearningScore, 3);
});
test("gates block skipping and rewriting correct answers; empty game is incomplete", () => {
  assert.equal(miniGameResult(newMiniGame()).completed, false);
  assert.throws(() => recordAttempt(newMiniGame(), 0, 0, [1], timing));
  assert.throws(() => recordAttempt(started(), 0, 1, [2], timing));
  assert.throws(() => recordAttempt(started(), 1, 0, [2], timing));
  assert.throws(() =>
    recordAttempt(recordAttempt(started(), 0, 0, [1], timing), 0, 0, [0], timing),
  );
});
test("round 3 tags distinguish authority, avoidance, empathy and evidence", () => {
  assert.equal(gradeStep(2, 1, [0]).responseTags.includes("authority_based"), true);
  assert.equal(gradeStep(2, 1, [1]).responseTags.includes("avoidance"), true);
  assert.equal(gradeStep(2, 1, [2]).responseTags.includes("empathic"), true);
  assert.equal(gradeStep(2, 1, [2]).score, 2);
  assert.equal(gradeStep(2, 2, [2]).responseTags.includes("evidence_focused"), true);
});
