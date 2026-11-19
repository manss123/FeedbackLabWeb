import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
const module = { exports: {} };
runInNewContext(
  ts.transpileModule(
    readFileSync(new URL("../src/lib/vr-round-scores.ts", import.meta.url), "utf8"),
    {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    },
  ).outputText,
  { module, exports: module.exports },
);
const { summarizeVrRounds } = module.exports;
const session = (id, scenarioId, created, first, second) => ({
  id,
  scenarioId,
  createdAt: { toMillis: () => created },
  stage3: { aiScores: { overall: first } },
  stage4: { aiScores: { overall: second } },
});
test("latest unfinished attempt never borrows second-round scores from an older attempt", () => {
  const r = summarizeVrRounds([
    session("old", "s1", 1, 20, 70),
    session("new", "s1", 2, 40, null),
    session("s2", "s2", 1, 60, 80),
  ]);
  assert.equal(r.scenarios[0].sessionId, "new");
  assert.equal(r.scenarios[0].round1, 40);
  assert.equal(r.scenarios[0].round2, null);
  assert.equal(r.pairedCount, 1);
  assert.equal(r.round1, 60);
  assert.equal(r.round2, 80);
});
test("latest is selected by creation date regardless of input order, even before any scores", () => {
  const rows = [session("new", "s1", 5, null, null), session("old", "s1", 1, 100, 100)];
  for (const input of [rows, [...rows].reverse()]) {
    const r = summarizeVrRounds(input);
    assert.equal(r.scenarios[0].sessionId, "new");
    assert.equal(r.round1, null);
    assert.equal(r.pairedCount, 0);
  }
});
test("five lessons contribute once each; zero is a real score", () => {
  const rows = Array.from({ length: 5 }, (_, i) =>
    session(String(i), `s${i + 1}`, i, i * 20, i * 20 + 20),
  );
  const r = summarizeVrRounds([...rows, session("older", "s2", -1, 100, 100)]);
  assert.equal(r.pairedCount, 5);
  assert.equal(r.round1, 40);
  assert.equal(r.round2, 60);
  assert.equal(r.scenarios[0].round1, 0);
});
test("empty, unknown scenarios and invalid scores never inflate averages", () => {
  const r = summarizeVrRounds([
    session("x", "s9", 1, 100, 100),
    session("a", "s1", 1, NaN, 100),
    session("b", "s2", 1, 50, 101),
  ]);
  assert.equal(r.pairedCount, 0);
  assert.equal(r.round2, null);
  assert.equal(r.scenarios.length, 5);
  assert.equal(summarizeVrRounds([]).round1, null);
});
