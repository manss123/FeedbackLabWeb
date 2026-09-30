import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
const module = { exports: {} };
runInNewContext(
  ts.transpileModule(
    readFileSync(new URL("../src/lib/module1-mini-game.ts", import.meta.url), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
  ).outputText,
  { module, exports: module.exports },
);
const { checkBuild, newMiniGame, miniGameResult, roundComplete } = module.exports;
const choice = (correct) => ({ answer: correct ? 1 : 0, correct, at: "2026-09-30T00:00:00Z" });
test("rounds use distinct 4/3/3 rubrics and completion requires all steps", () => {
  const state = newMiniGame();
  assert.equal(miniGameResult(state).completed, false);
  state.rounds.forEach((r) => r.purpose.push(choice(true)));
  state.rounds[0].builds.push(checkBuild(0, [0, 1, 2, 3]));
  state.rounds[1].builds.push(checkBuild(1, [0, 1, 2, 3]));
  assert.equal(miniGameResult(state).completed, false);
  state.rounds[2].opening.push(choice(true));
  state.rounds[2].followup.push(choice(true));
  const result = miniGameResult(state);
  assert.equal(result.completed, true);
  assert.equal(result.finalLearningScore, 10);
  assert.deepEqual(
    Array.from(result.rounds, (r) => r.finalLearningScore),
    [4, 3, 3],
  );
});
test("retry preserves first attempt and hint counts", () => {
  const state = newMiniGame();
  state.rounds[0].purpose.push(choice(false), choice(true));
  state.rounds[0].builds.push(checkBuild(0, [6, 1, 2, 3]), checkBuild(0, [0, 1, 2, 3]));
  const result = miniGameResult(state).rounds[0];
  assert.equal(result.firstAttemptScore, 2);
  assert.equal(result.finalLearningScore, 4);
  assert.equal(result.hintsUsed, 2);
});
test("round 2 purpose contributes one point and guidance needs both parts", () => {
  assert.equal(checkBuild(1, [0, 1, 2, 6]).score, 1);
  const state = newMiniGame();
  state.rounds[1].purpose.push(choice(false), choice(true));
  state.rounds[1].builds.push(checkBuild(1, [0, 1, 2, 3]));
  assert.equal(miniGameResult(state).rounds[1].firstAttemptScore, 2);
  assert.equal(miniGameResult(state).rounds[1].finalLearningScore, 3);
});
test("reject duplicate, missing and out-of-range cards; a permutation is not completion", () => {
  for (const cards of [
    [0, 0, 2, 3],
    [-1, 1, 2, 3],
    [0, 1, 2],
    [0, 1, 2, 7],
  ])
    assert.throws(() => checkBuild(0, cards));
  assert.equal(checkBuild(0, [1, 0, 2, 3]).complete, false);
  const state = newMiniGame();
  state.rounds[0].builds.push(checkBuild(0, [0, 1, 2, 3]));
  assert.equal(roundComplete(state.rounds[0], 0), false);
});
