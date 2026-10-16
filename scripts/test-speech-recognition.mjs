import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
function harness() {
  const slots = [];
  let cursor = 0;
  let id = 0;
  const timers = new Map();
  const instances = [];
  class Recognition {
    constructor() {
      instances.push(this);
      this.starts = 0;
    }
    start() {
      this.starts++;
    }
    stop() {}
  }
  const react = {
    useState(initial) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = initial;
      return [
        slots[i],
        (v) => {
          slots[i] = typeof v === "function" ? v(slots[i]) : v;
        },
      ];
    },
    useRef(initial) {
      const i = cursor++;
      return slots[i] ?? (slots[i] = { current: initial });
    },
    useCallback(fn) {
      return fn;
    },
    useEffect() {},
  };
  const module = { exports: {} };
  runInNewContext(
    ts.transpileModule(readFileSync("src/hooks/use-speech-recognition.ts", "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    {
      module,
      exports: module.exports,
      require: () => react,
      console: { info() {}, warn() {} },
      window: {
        SpeechRecognition: Recognition,
        setTimeout(fn) {
          timers.set(++id, fn);
          return id;
        },
        clearTimeout(i) {
          timers.delete(i);
        },
      },
    },
  );
  return {
    render() {
      cursor = 0;
      return module.exports.useSpeechRecognition();
    },
    instances,
    flush() {
      const pending = [...timers.values()];
      timers.clear();
      pending.forEach((fn) => fn());
    },
    timers,
  };
}
const result = (text, isFinal = true) => ({
  resultIndex: 0,
  results: [{ isFinal, 0: { transcript: text } }],
});
test("final transcript arriving after stop is retained until recognition ends", () => {
  const h = harness();
  h.render().start();
  const r = h.instances[0];
  h.render().stop();
  assert.equal(h.render().listening, true);
  r.onresult(result("ข้อความหลังหยุดอัด"));
  r.onend();
  assert.equal(h.render().finalTranscript, "ข้อความหลังหยุดอัด");
  assert.equal(h.render().listening, false);
});
test("interim speech immediately following final speech is not suppressed", () => {
  const h = harness();
  h.render().start();
  const r = h.instances[0];
  r.onresult(result("ประโยคแรก"));
  r.onresult(result("ประโยคถัดไป", false));
  assert.equal(h.render().interimTranscript, "ประโยคถัดไป");
});
test("error followed by end schedules only one restart; stopped sessions never restart", () => {
  const h = harness();
  h.render().start();
  const r = h.instances[0];
  r.onerror({ error: "no-speech" });
  assert.equal(h.timers.size, 0);
  r.onend();
  h.flush();
  assert.equal(r.starts, 2);
  r.onend();
  h.render().stop();
  h.flush();
  assert.equal(r.starts, 2);
  assert.equal(h.render().listening, false);
});
test("new recording detaches stale callbacks and ignores late results", () => {
  const h = harness();
  h.render().start();
  const old = h.instances[0];
  const late = old.onresult;
  h.render().start();
  late(result("stale"));
  assert.equal(h.render().finalTranscript, "");
  assert.equal(old.onend, null);
});
test("fatal errors expose error and prevent restart", () => {
  const h = harness();
  h.render().start();
  const r = h.instances[0];
  r.onerror({ error: "service-not-allowed" });
  r.onend();
  h.flush();
  assert.equal(r.starts, 1);
  assert.ok(h.render().error);
  assert.equal(h.render().listening, false);
});
