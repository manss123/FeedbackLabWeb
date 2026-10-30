import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";

function load(path, globals = {}) {
  const module = { exports: {} };
  runInNewContext(ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { module, exports: module.exports, ...globals });
  return module.exports;
}
const types = load("../src/types/unity.types.ts");
test("completion validates scenario and round", () => {
  assert.equal(types.isUnityToReactEvent({ type: "PRESENTATION_COMPLETE", scenarioId: "s1", round: 1 }), true);
  for (const event of [{}, { round: 3, scenarioId: "s1" }, { round: 1 }, { round: "2", scenarioId: "s2" }]) {
    assert.equal(types.isUnityToReactEvent({ type: "PRESENTATION_COMPLETE", ...event }), false);
  }
});
test("bridge forwards completion only from trusted iframe and cleans up listener", () => {
  let handler, cleanup;
  const source = {};
  const calls = [];
  const window = { addEventListener: (_, cb) => handler = cb, removeEventListener: (_, cb) => assert.equal(cb, handler) };
  const react = { useState: () => [false, () => {}], useRef: (current) => ({ current }), useCallback: (cb) => cb, useEffect: (cb) => cleanup = cb() };
  const { useUnityBridge } = load("../src/hooks/useUnityBridge.ts", { window, require: (id) => id === "react" ? react : types });
  useUnityBridge({ iframeRef: { current: { contentWindow: source } }, targetOrigin: "https://example.test", enabled: true, onPresentationComplete: (...args) => calls.push(args) });
  const message = { origin: "https://example.test", source, data: { type: "PRESENTATION_COMPLETE", scenarioId: "s2", round: 2 } };
  handler({ ...message, origin: "https://other.test" });
  handler({ ...message, source: {} });
  handler({ ...message, data: { ...message.data, round: 7 } });
  assert.equal(calls.length, 0);
  handler(message);
  assert.equal(calls[0].join(","), "s2,2");
  cleanup();
});
