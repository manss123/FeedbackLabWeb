import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const module = { exports: {} };
runInNewContext(
  ts.transpileModule(
    readFileSync(new URL("../src/lib/learning-unlocks.ts", import.meta.url), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
  ).outputText,
  { module, exports: module.exports },
);
const { canOpenModule, canOpenVr, canOpenScenario, MODULE_SEQUENCE, SCENARIO_SEQUENCE } =
  module.exports;
const state = (modules = [], scenarios = [], pretest = true) => ({
  pretest_completed: pretest,
  completed_modules: modules,
  completed_scenarios: scenarios,
});

test("missing data and unfinished pretest never unlock activities, even with old completion data", () => {
  for (const progress of [undefined, state(MODULE_SEQUENCE, SCENARIO_SEQUENCE, false)]) {
    for (const id of MODULE_SEQUENCE) assert.equal(canOpenModule(progress, id), false);
    for (const id of SCENARIO_SEQUENCE) assert.equal(canOpenScenario(progress, id), false);
  }
});
test("pretest unlocks only module 1; each completion unlocks the next module", () => {
  for (let completed = 0; completed <= 5; completed++) {
    const progress = state(MODULE_SEQUENCE.slice(0, completed));
    MODULE_SEQUENCE.forEach((id, index) =>
      assert.equal(canOpenModule(progress, id), index <= completed),
    );
    assert.equal(canOpenVr(progress), completed === 5);
  }
});
test("VR requires all five known modules, not a count or an out-of-order completion", () => {
  assert.equal(canOpenVr(state(["m1", "m2", "m3", "m4", "other"])), false);
  assert.equal(canOpenVr(state(["m1", "m2", "m3", "m4", "m4"])), false);
  assert.equal(canOpenModule(state(["m2", "m3", "m4", "m5"]), "m5"), false);
});
test("scenarios unlock in order and completed earlier scenarios remain replayable", () => {
  for (let completed = 0; completed <= 5; completed++) {
    const progress = state(MODULE_SEQUENCE, SCENARIO_SEQUENCE.slice(0, completed));
    SCENARIO_SEQUENCE.forEach((id, index) =>
      assert.equal(canOpenScenario(progress, id), index <= completed),
    );
  }
  assert.equal(canOpenScenario(state(MODULE_SEQUENCE, ["s2"]), "s3"), false);
  assert.equal(canOpenScenario(state(MODULE_SEQUENCE), "invalid"), false);
  assert.equal(canOpenModule(state(MODULE_SEQUENCE), "invalid"), false);
});
