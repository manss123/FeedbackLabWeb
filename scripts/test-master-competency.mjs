import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { test } from "node:test";
import ts from "typescript";
import React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import * as recharts from "recharts";
import { renderToStaticMarkup } from "react-dom/server";

function load(path, dependencies = {}) {
  const module = { exports: {} };
  runInNewContext(
    ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText,
    { module, exports: module.exports, require: (id) => dependencies[id] },
  );
  return module.exports;
}
const reflection = load("../src/lib/vr-reflection.ts");
const {
  MASTER_COMPETENCIES: criteria,
  RADAR_COMPETENCIES: radar,
  scoreCompetency: score,
  competencyAttempts: attempts,
} = load("../src/lib/master-competency.ts", { "./vr-reflection": reflection });
const find = (id) => criteria.find((c) => c.id === id);
test("admin component renders empty and populated assessments without requiring services", () => {
  const crosswalk = load("../src/lib/master-competency.ts", { "./vr-reflection": reflection });
  const { AdminMasterCompetency } = load("../src/components/admin-master-competency.tsx", {
    react: React,
    "react/jsx-runtime": jsxRuntime,
    recharts,
    "@/lib/master-competency": crosswalk,
  });
  const empty = renderToStaticMarkup(React.createElement(AdminMasterCompetency, { sessions: [] }));
  assert.match(empty, /ยังไม่มีคะแนนรายเกณฑ์/);
  assert.match(empty, /งดประเมิน/);
  assert.match(empty, /ไม่ใช้ในบทนี้/);
  const complete = session("s1", { 1: 4, 2: 4, 3: 4, 4: 4, 5: 4, 7: 4, 8: 4 });
  const populated = renderToStaticMarkup(
    React.createElement(AdminMasterCompetency, { sessions: [complete] }),
  );
  assert.match(populated, /4\.00/);
  assert.match(populated, /quoted evidence/);
  assert.doesNotMatch(populated, /ยังไม่มีสถานการณ์ที่มีคะแนนครบทั้ง 5 มิติ/);
});
function session(scenario = "s1", values = { 2: 3, 8: 5 }) {
  return {
    id: "session",
    scenarioId: scenario,
    stage3: {
      reflectionVersion: reflection.REFLECTION_VERSION,
      completedAt: "2026-10-28T10:00:00Z",
      reflectionAnalysis: Object.entries(values).map(([id, score]) => ({
        criterionId: `${scenario}-${id}`,
        score,
        evidence: "quoted evidence",
        limitation: "",
      })),
    },
  };
}
test("crosswalk retains 17 competencies and excludes audio from five radar axes", () => {
  assert.equal(criteria.length, 17);
  assert.equal(radar.length, 5);
  assert.equal(score(find("delivery"), "s1", session()).score, null);
  assert.equal(score(find("delivery"), "s1", session()).status, "excluded");
  assert.equal(find("structure").dimensions.s4.length, 10);
  assert.equal(find("structure").dimensions.s3.join(","), "1,2,5,8");
});
test("uses original IDs after voice criterion removal, averages all required evidence", () => {
  assert.equal(score(find("supportive"), "s1", session()).score, 5);
  assert.equal(score(find("specific"), "s2", session("s2", { 1: 2, 2: 5 })).score, 3.5);
  const missing = score(find("specific"), "s2", session("s2", { 1: 2 }));
  assert.equal(missing.score, null);
  assert.equal(missing.available, 1);
  assert.equal(score(find("priority"), "s1", session()).status, "not-applicable");
});
test("rejects old versions, wrong scenario, invalid, duplicate and unevidenced scores", () => {
  const c = find("specific");
  const old = session();
  delete old.stage3.reflectionVersion;
  assert.equal(score(c, "s1", old).score, null);
  assert.equal(score(c, "s2", session()).score, null);
  for (const value of [0, 6, 2.5, "4", null])
    assert.equal(score(c, "s1", session("s1", { 2: value })).score, null);
  const duplicate = session();
  duplicate.stage3.reflectionAnalysis.push(duplicate.stage3.reflectionAnalysis[0]);
  assert.equal(score(c, "s1", duplicate).score, null);
  const empty = session();
  empty.stage3.reflectionAnalysis[0].evidence = "";
  assert.equal(score(c, "s1", empty).score, null);
});
test("selects latest assessed attempt, not best score, and does not merge attempts", () => {
  const older = session("s2", { 1: 5, 2: 5 });
  older.id = "older";
  const newer = session("s2", { 1: 2 });
  newer.id = "newer";
  newer.stage3.completedAt = "2026-10-28T11:00:00Z";
  const unsaved = session("s2");
  unsaved.stage3.completedAt = null;
  const picked = attempts([older, unsaved, newer, session()], "s2");
  assert.equal(picked.length, 2);
  assert.equal(picked[0].id, "newer");
  assert.equal(score(find("specific"), "s2", picked[0]).score, null);
  assert.equal(score(find("specific"), "s2", picked[1]).score, 5);
});
