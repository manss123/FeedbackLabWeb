import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
const require = createRequire(import.meta.url);
const {
  scoreAssessment,
  saveAssessment,
  ASSESSMENT_VERSION,
} = require("../functions/lib/assessment.js");
const content = JSON.parse(
  readFileSync(new URL("../src/lib/assessment-content.json", import.meta.url), "utf8"),
);
const keys = JSON.parse(
  readFileSync(new URL("../functions/src/assessment-keys.json", import.meta.url), "utf8"),
);
const input = (phase = "pretest") => ({
  phase,
  version: ASSESSMENT_VERSION,
  answers: Object.entries(keys[phase]).map(([id, ranks]) => ({ id, ranks: { ...ranks } })),
});
const plain = (x) => JSON.parse(JSON.stringify(x));
function loadTs(file, mocks = {}) {
  const module = { exports: {} };
  runInNewContext(
    ts.transpileModule(readFileSync(new URL("../" + file, import.meta.url), "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    { module, exports: module.exports, require: (id) => mocks[id] },
  );
  return module.exports;
}
const research = loadTs("src/lib/research-log.ts");
const { assessmentResearchRows } = loadTs("src/lib/assessment-research.ts", {
  "./research-log": research,
});
test("Research export retains all ranks, pseudonymizes identity and filters by Bangkok submission day", () => {
  const result = { ...scoreAssessment(input()), submittedAt: "2026-09-27T17:30:00.000Z" };
  const users = [
    {
      uid: "private-uid",
      profile: { email: "private@example.invalid" },
      assessmentResults: { pretest: result },
    },
  ];
  const rows = assessmentResearchRows(
    users,
    { "private-uid": "P-test" },
    { participant: "", from: "2026-09-28", to: "2026-09-28" },
  );
  assert.equal(rows.length, 20);
  assert.equal(rows[8].rank_D, 3);
  assert.equal(rows[8].rank_C, 4);
  assert.ok(rows.every((r) => r.total_score === 240 && r.participant_code === "P-test"));
  assert.ok(!JSON.stringify(rows).includes("private"));
  assert.equal(
    assessmentResearchRows(users, {}, { participant: "", from: "2026-09-27", to: "2026-09-27" })
      .length,
    0,
  );
  assert.equal(
    assessmentResearchRows(users, {}, { participant: "another", from: "", to: "" }).length,
    0,
  );
});
const m = { exports: {} };
runInNewContext(
  ts.transpileModule(readFileSync(new URL("../src/lib/assessment.ts", import.meta.url), "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText,
  { module: m, exports: m.exports, require: () => content },
);
test("PDF bank has 20 distinct paired scenarios, 160 complete options and no client answer key", () => {
  for (const phase of ["pretest", "posttest"]) {
    assert.equal(content[phase].length, 20);
    content[phase].forEach((q, i) => {
      assert.equal(q.id, String(i + 1));
      assert.deepEqual(
        q.options.map((o) => o.id),
        ["A", "B", "C", "D"],
      );
      assert.ok(q.options.every((o) => o.label.length > 15));
      assert.ok(!JSON.stringify(q).includes("1 = A"));
      assert.ok(!JSON.stringify(q).includes("Correct Rank"));
    });
  }
  assert.deepEqual(
    Object.entries(keys.pretest)
      .filter(([, r]) => r.C === 4)
      .map(([id]) => id),
    ["9", "10", "11", "16", "20"],
  );
  assert.ok(content.pretest.every((q, i) => q.question !== content.posttest[i].question));
});
test("Exact key is 240 / 100%; reversed valid ranking is 80 / 33.33%", () => {
  for (const phase of ["pretest", "posttest"]) {
    assert.equal(scoreAssessment(input(phase)).totalScore, 240);
    assert.equal(scoreAssessment(input(phase)).percentage, 100);
    const reverse = input(phase);
    reverse.answers.forEach((a) => {
      for (const o of ["A", "B", "C", "D"]) a.ranks[o] = 5 - a.ranks[o];
    });
    assert.equal(scoreAssessment(reverse).totalScore, 80);
    assert.equal(scoreAssessment(reverse).percentage, 33.33);
  }
});
test("Pretest special keys remain different from posttest; scores ignore client supplied total", () => {
  const v = input("posttest");
  v.phase = "pretest";
  v.totalScore = 999;
  assert.equal(scoreAssessment(v).totalScore, 230);
});
test("Malformed, missing, duplicate and out of range responses are rejected", () => {
  const cases = [
    null,
    {},
    { ...input(), phase: "survey" },
    { ...input(), version: "old" },
    { ...input(), answers: input().answers.slice(1) },
  ];
  for (const mutate of [
    (v) => (v.answers[0].ranks.A = 2),
    (v) => (v.answers[0].ranks.A = 0),
    (v) => (v.answers[0].ranks.A = "1"),
    (v) => (v.answers[0].ranks.A = 1.5),
    (v) => (v.answers[0].id = "2"),
    (v) => (v.answers[0].id = 1),
    (v) => delete v.answers[0].ranks.D,
    (v) => (v.answers[0].ranks.E = 5),
  ]) {
    const v = input();
    mutate(v);
    cases.push(v);
  }
  for (const v of cases)
    assert.throws(
      () => scoreAssessment(v),
      (e) => e.code === "invalid-argument",
    );
});
test("Rank assignment swaps occupied ranks without creating duplicates", () => {
  const { assignRank, isRankComplete } = m.exports;
  assert.deepEqual(plain(assignRank({ A: 1, B: 2, C: 3, D: 4 }, "A", 2)), {
    A: 2,
    B: 1,
    C: 3,
    D: 4,
  });
  assert.deepEqual(plain(assignRank({ A: 1 }, "B", 1)), { B: 1 });
  assert.equal(isRankComplete({ A: 1, B: 2, C: 3, D: 4 }), true);
  assert.equal(isRankComplete({ A: 1, B: 2, C: 3, D: 3 }), false);
  assert.equal(isRankComplete({ A: 1, B: 2, C: 3 }), false);
});
function fakeDb() {
  const docs = new Map([["users/u", { profile: { displayName: "Fixture" } }]]);
  let writes = 0;
  const ref = (path) => ({
    path,
    collection: (name) => ({ doc: (id) => ref(path + "/" + name + "/" + id) }),
  });
  return {
    docs,
    get writes() {
      return writes;
    },
    collection: (name) => ({ doc: (id) => ref(name + "/" + id) }),
    runTransaction: async (fn) =>
      fn({
        get: async (r) => ({ exists: docs.has(r.path), data: () => docs.get(r.path) }),
        create: (r, v) => {
          assert.ok(!docs.has(r.path));
          docs.set(r.path, v);
          writes++;
        },
        update: (r, v) => {
          docs.set(r.path, { ...docs.get(r.path), ...v });
          writes++;
        },
      }),
  };
}
test("Server submission stores authoritative scores; duplicate retry returns first response", async () => {
  const db = fakeDb();
  const first = await saveAssessment(db, "u", input());
  assert.equal(first.totalScore, 240);
  assert.ok(first.submittedAt.toMillis() > 0);
  const changed = input();
  changed.answers[0].ranks = { A: 4, B: 3, C: 2, D: 1 };
  const retry = await saveAssessment(db, "u", changed);
  assert.equal(retry.totalScore, 240);
  assert.equal(db.writes, 2);
  const after = await saveAssessment(db, "u", input("posttest"));
  assert.equal(after.phase, "posttest");
  assert.equal(db.writes, 4);
});
test("Server rejects posttest without pretest and missing participant records", async () => {
  const db = fakeDb();
  await assert.rejects(
    saveAssessment(db, "u", input("posttest")),
    (e) => e.code === "failed-precondition",
  );
  await assert.rejects(
    saveAssessment(db, "missing", input()),
    (e) => e.code === "failed-precondition",
  );
  assert.equal(db.writes, 0);
});
