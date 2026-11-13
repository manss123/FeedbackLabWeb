import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
const require = createRequire(new URL("../functions/package.json", import.meta.url));
function load(path) {
  const module = { exports: {} };
  runInNewContext(
    ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    {
      module,
      exports: module.exports,
      require: (id) => (id.endsWith(".json") ? {} : require(id)),
    },
  );
  return module.exports;
}
for (const path of ["../src/lib/assessment.ts", "../functions/src/assessment.ts"]) {
  const { isPosttestPassed, ASSESSMENT_VERSION, POSTTEST_PASS_PERCENT } = load(path);
  test(`${path}: 80% boundary, old results, and invalid scores`, () => {
    assert.equal(POSTTEST_PASS_PERCENT, 80);
    const result = (totalScore) => ({ totalScore, maxScore: 240, version: ASSESSMENT_VERSION });
    assert.equal(isPosttestPassed(result(191)), false);
    assert.equal(isPosttestPassed(result(192)), true);
    assert.equal(isPosttestPassed(result(240)), true);
    assert.equal(isPosttestPassed({ ...result(191), percentage: 80, passed: true }), false);
    assert.equal(isPosttestPassed({ ...result(192), passed: false }), true);
    for (const value of [
      undefined,
      result(NaN),
      result(241),
      { ...result(240), maxScore: 0 },
      { ...result(240), version: "old" },
    ])
      assert.equal(isPosttestPassed(value), false);
  });
}
