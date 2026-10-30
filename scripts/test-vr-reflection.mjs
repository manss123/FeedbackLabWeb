import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { test } from "node:test";
import ts from "typescript";
import { z } from "zod";
import React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";

function load(path, globals = {}) {
  const module = { exports: {} };
  runInNewContext(
    ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    { module, exports: module.exports, console: { log() {}, warn() {}, error() {} }, ...globals },
  );
  return module.exports;
}
const reflection = load("../src/lib/vr-reflection.ts");

test("rating and comparison UI render all items and gate only on available evidence", () => {
  const source = readFileSync(
    new URL("../src/routes/_authenticated/vr-simulation.tsx", import.meta.url),
    "utf8",
  );
  const functions =
    [
      source.slice(
        source.indexOf("function Stage2Rating("),
        source.indexOf("function Stage2Reflection("),
      ),
      source.slice(
        source.indexOf("function Stage3Awareness("),
        source.indexOf("function AiWaitingCard("),
      ),
    ].join("\n") + "\nexports.rating = Stage2Rating; exports.awareness = Stage3Awareness;";
  const module = { exports: {} };
  runInNewContext(
    ts.transpileModule(functions, {
      compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS },
    }).outputText,
    {
      module,
      exports: module.exports,
      require: () => jsxRuntime,
      ArrowRight: () => null,
    },
  );
  for (const [id, criteria] of Object.entries(reflection.REFLECTION_CRITERIA)) {
    const ratingProps = {
      ratings: Array(criteria.length).fill(4),
      statements: criteria.map((c) => c.statement),
      setRatings() {},
      onNext() {},
      onBack() {},
    };
    const rating = renderToStaticMarkup(React.createElement(module.exports.rating, ratingProps));
    assert.equal((rating.match(/<button/g) ?? []).length, criteria.length * 5 + 2);
    assert.equal(rating.includes('disabled=""'), false);
    const missing = renderToStaticMarkup(
      React.createElement(module.exports.rating, { ...ratingProps, ratings: Array(8).fill(4) }),
    );
    if (criteria.length > 8) assert.ok(missing.includes('disabled=""'));
    const props = {
      ratings: ratingProps.ratings,
      criteria,
      analysis: [],
      questions: reflection.POST_AI_QUESTIONS[id],
      answers: [],
      setAnswers() {},
      onNext() {},
    };
    const unavailable = renderToStaticMarkup(React.createElement(module.exports.awareness, props));
    assert.equal((unavailable.match(/<textarea/g) ?? []).length, props.questions.length);
    assert.equal(unavailable.includes('disabled=""'), false);
    const scored = renderToStaticMarkup(
      React.createElement(module.exports.awareness, {
        ...props,
        analysis: [{ criterionId: `${id}-1`, score: 3, evidence: "test", limitation: "" }],
      }),
    );
    assert.ok(scored.includes('disabled=""'));
    assert.ok(scored.includes("3/5"));
  }
});

test("all 41 text criteria have stable IDs, correct counts and post-AI questions", () => {
  for (const [scenario, count] of Object.entries({ s1: 7, s2: 8, s3: 7, s4: 10, s5: 9 })) {
    const rows = reflection.REFLECTION_CRITERIA[scenario];
    assert.equal(rows.length, count);
    assert.equal(
      reflection.POST_AI_QUESTIONS[scenario].length,
      ["s4", "s5"].includes(scenario) ? 2 : 1,
    );
    rows.forEach((r, i) => {
      assert.equal(
        r.id,
        `${scenario}-${["s1", "s3"].includes(scenario) && i >= 5 ? i + 2 : i + 1}`,
      );
      assert.ok(r.statement && r.dimension && r.indicators);
      assert.ok(reflection.reflectionContext(scenario).includes(r.indicators));
    });
  }
});

test("missing, malformed, duplicate, and unsupported audio scores never become numeric comparisons", () => {
  const result = reflection.normalizeReflectionAnalysis(
    [
      { criterionId: "s1-1", score: 4, evidence: "ข้อความอ้างอิง", limitation: "" },
      { criterionId: "s1-2", score: "5", evidence: "x" },
      { criterionId: "s1-3", score: 6, evidence: "x" },
      { criterionId: "s1-4", score: 4, evidence: "" },
      { criterionId: "s1-5", score: 3, evidence: "x" },
      { criterionId: "s1-5", score: 5, evidence: "x" },
      { criterionId: "s1-6", score: 5, evidence: "fabricated audio claim" },
      { criterionId: "s2-1", score: 5, evidence: "wrong scenario" },
    ],
    "s1",
  );
  assert.equal(result[0].score, 4);
  assert.ok(result.slice(1).every((r) => r.score === null));
  assert.equal(
    result.some((r) => r.criterionId === "s1-6"),
    false,
  );
  assert.equal(reflection.normalizeReflectionAnalysis(null, "s4").length, 10);
});

test("server validator preserves scenario ID for all three LLM endpoints", () => {
  const serverFn = () => ({
    validator(validate) {
      return {
        handler() {
          return { validate };
        },
      };
    },
  });
  const api = load("../src/lib/ai.functions.ts", {
    require(name) {
      if (name === "zod") return { z };
      if (name === "@tanstack/react-start") return { createServerFn: serverFn };
      throw new Error(name);
    },
  });
  const context = {
    scenarioId: "s4",
    studentName: "เมย์",
    persona: "",
    courseContext: "",
    activity: "",
    behaviors: [],
  };
  const rubric = {
    speechClarity: 50,
    linguisticAppropriateness: 50,
    balance: 50,
    intentConsistency: 50,
  };
  assert.equal(
    api.generateCoachingReportFn.validate({ transcript: "test", context }).context.scenarioId,
    "s4",
  );
  assert.equal(
    api.generateRoundTwoReportFn.validate({
      transcript2: "test",
      context,
      priorRound: { transcript1: "test", rubric1: rubric, goals: [] },
    }).context.scenarioId,
    "s4",
  );
  assert.equal(
    api.generateFinalSummaryFn.validate({
      transcript1: "test",
      transcript2: "test",
      rubric1: rubric,
      rubric2: rubric,
      goals: [],
      context,
    }).context.scenarioId,
    "s4",
  );
  assert.throws(() =>
    api.generateCoachingReportFn.validate({
      transcript: "test",
      context: { ...context, scenarioId: "invalid" },
    }),
  );
});

test("real prompt builder sends every scenario criterion to all three LLM calls (mock transport)", async () => {
  const requests = [];
  const api = load("../src/lib/ai.server.ts", {
    require(name) {
      assert.equal(name, "@/lib/vr-reflection");
      return reflection;
    },
    process: { env: { GEMINI_API_KEY: "test-only-not-a-real-key" } },
    fetch: async (_url, options) => {
      requests.push(JSON.parse(options.body));
      return {
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      rubric: {
                        speechClarity: 70,
                        linguisticAppropriateness: 70,
                        balance: 70,
                        intentConsistency: 70,
                      },
                      emotion: "neutral",
                      reflectionAnalysis: [],
                    }),
                  },
                ],
              },
            },
          ],
        }),
      };
    },
  });
  const rubric = {
    speechClarity: 70,
    linguisticAppropriateness: 70,
    balance: 70,
    intentConsistency: 70,
  };
  for (const scenarioId of Object.keys(reflection.REFLECTION_CRITERIA)) {
    const context = {
      scenarioId,
      studentName: "test",
      persona: "test",
      courseContext: "test",
      activity: "test",
      behaviors: [],
    };
    const report = await api.generateCoachingReport("ข้อความของอาจารย์", context, "เป้าหมาย");
    assert.equal(
      report.reflectionAnalysis.length,
      reflection.REFLECTION_CRITERIA[scenarioId].length,
    );
    assert.ok(report.reflectionAnalysis.every((r) => r.score === null));
    await api.generateRoundTwoReport("รอบสอง", context, {
      transcript1: "รอบแรก",
      rubric1: rubric,
      goals: [],
    });
    await api.generateFinalSummary("รอบแรก", "รอบสอง", rubric, rubric, [], context);
    for (const request of requests.splice(0)) {
      const prompt = request.contents[0].parts[0].text;
      for (const item of reflection.REFLECTION_CRITERIA[scenarioId])
        assert.ok(prompt.includes(item.id) && prompt.includes(item.indicators));
      assert.ok(prompt.includes("ไม่มีไฟล์เสียง"));
    }
  }
});
