import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import { webcrypto } from "node:crypto";
import ts from "typescript";

function load(file, globals = {}) {
  const module = { exports: {} };
  const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
  runInNewContext(
    ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    {
      module,
      exports: module.exports,
      crypto: webcrypto,
      TextEncoder,
      console: { warn() {} },
      ...globals,
    },
  );
  return module.exports;
}
const { measuredSlice, measuredSeconds } = load("src/lib/usage-clock.ts");
const { deferredEffect } = load("src/lib/deferred-effect.ts", { queueMicrotask });
const { formatResearchSeconds } = load("src/lib/research-format.ts");
test("Strict Mode setup-cleanup-setup emits one real learning visit, not a microsecond attempt", async () => {
  const events = [];
  let effect,
    now = 0;
  const hook = load("src/hooks/use-learning-timing.ts", {
    require: (id) => {
      if (id === "@/lib/deferred-effect") return { deferredEffect };
      if (id === "@/lib/usage-clock") return { measuredSeconds };
      if (id === "react")
        return {
          useRef: (value) => ({ current: value }),
          useState: (value) => [value, () => {}],
          useEffect: (callback) => {
            effect = callback;
          },
        };
      if (id === "@/lib/activity") return { logActivity: (payload) => events.push(payload) };
      if (id === "@/lib/firebase")
        return { getFirebaseAuth: () => ({ currentUser: { uid: "u1" } }) };
      if (id === "@/lib/usage-context")
        return {
          getUsageContext() {},
          sampleUsage: () => ({ mono: now, visible: now, active: now, unobserved: 0 }),
        };
      throw Error(id);
    },
    window: { addEventListener() {}, removeEventListener() {} },
  });
  hook.useLearningTiming("assessment", "diagnostic", "form");
  effect()(); // React discards the probe before microtasks run.
  const realCleanup = effect();
  await Promise.resolve();
  assert.equal(events.length, 1);
  assert.equal(events[0].type, "assessment_started");
  now = 8542.10000000149;
  realCleanup();
  assert.equal(events.length, 2);
  assert.equal(events[1].elapsedSeconds, 8.542);
  assert.equal(events[0].runId, events[1].runId);
  assert.equal(events[0].stepVisitId, events[1].stepVisitId);
});
test("cancellation suppresses discarded setup only; genuine short visits still finish", async () => {
  const events = [];
  deferredEffect(() => {
    events.push("discarded");
  })();
  await Promise.resolve();
  assert.equal(events.length, 0);
  const stop = deferredEffect(() => {
    events.push("start");
    return () => events.push("end");
  });
  await Promise.resolve();
  stop();
  assert.deepEqual(events, ["start", "end"]);
});
test("seconds keep the correct unit, millisecond storage precision and readable display", () => {
  assert.equal(measuredSeconds(1500), 1.5);
  assert.equal(measuredSeconds(8542.10000000149), 8.542);
  assert.equal(formatResearchSeconds(8.5421000000149), "8.54");
  assert.equal(formatResearchSeconds(0.000199999925494194), "<0.01");
  assert.equal(formatResearchSeconds(0), "0.00");
  assert.equal(formatResearchSeconds(null), "—");
  assert.equal(formatResearchSeconds(-1), "—");
  assert.equal(formatResearchSeconds(90), "90.00");
});
test("browser identity persists but separate documents/accounts get isolated sessions", () => {
  const storage = new Map();
  const contextModule = () =>
    load("src/lib/usage-context.ts", {
      require: () => ({ measuredSlice }),
      localStorage: {
        getItem: (key) => storage.get(key),
        setItem: (key, value) => storage.set(key, value),
      },
      navigator: { userAgent: "Chrome" },
      document: { visibilityState: "visible", hasFocus: () => true },
      performance: { now: () => 0 },
    });
  const first = contextModule(),
    second = contextModule();
  const a = first.getUsageContext("u1"),
    b = second.getUsageContext("u1");
  assert.equal(a.browserId, b.browserId);
  assert.notEqual(a.tabId, b.tabId);
  assert.notEqual(a.webSessionId, b.webSessionId);
  assert.equal(first.getUsageContext("u1").webSessionId, a.webSessionId);
  assert.notEqual(first.getUsageContext("u2").browserId, a.browserId);
  first.clearUsageContext();
  assert.notEqual(first.getUsageContext("u1").webSessionId, a.webSessionId);
});
test("learning timing writes matching run/visit IDs and one measured end on submit plus cleanup", async () => {
  const events = [];
  let effect,
    now = 0;
  const hook = load("src/hooks/use-learning-timing.ts", {
    require: (id) => {
      if (id === "@/lib/deferred-effect") return { deferredEffect };
      if (id === "@/lib/usage-clock") return { measuredSeconds };
      if (id === "react")
        return {
          useRef: (value) => ({ current: value }),
          useState: (value) => [value, () => {}],
          useEffect: (callback) => {
            effect = callback;
          },
        };
      if (id === "@/lib/activity") return { logActivity: (payload) => events.push(payload) };
      if (id === "@/lib/firebase")
        return { getFirebaseAuth: () => ({ currentUser: { uid: "u1" } }) };
      if (id === "@/lib/usage-context")
        return {
          getUsageContext() {},
          sampleUsage: () => ({ mono: now, visible: now, active: now / 2, unobserved: 0 }),
        };
      throw Error(id);
    },
    window: { addEventListener() {}, removeEventListener() {} },
  });
  const timing = hook.useLearningTiming("assessment", "diagnostic", "form");
  const cleanup = effect();
  await Promise.resolve();
  now = 12_000;
  timing.finish();
  cleanup();
  assert.equal(events.length, 2);
  assert.equal(events[0].type, "assessment_started");
  assert.equal(events[1].type, "assessment_finished");
  assert.equal(events[1].runId, events[0].runId);
  assert.equal(events[1].stepVisitId, events[0].stepVisitId);
  assert.equal(events[1].elapsedSeconds, 12);
  assert.equal(events[1].activeSeconds, 6);
});
test("active proxy clips exactly at idle threshold; visible time is distinct", () => {
  const value = measuredSlice(50_000, 80_000, 0, true, true);
  assert.equal(value.active, 10_000);
  assert.equal(value.visible, 30_000);
  assert.equal(measuredSlice(0, 30_000, 0, true, false).active, 0);
  assert.equal(measuredSlice(0, 30_000, 0, false, true).visible, 0);
});
test("sleep gaps and reversed clocks never become engagement", () => {
  const value = measuredSlice(0, 300_000, 290_000, true, true);
  assert.equal(value.active, 0);
  assert.equal(value.visible, 0);
  assert.equal(value.unobserved, 300_000);
  assert.equal(measuredSlice(30, 10, 10, true, true).active, 0);
});

function queueHarness(storage = new Map()) {
  const auth = { currentUser: { uid: "u1" } };
  const online = { onLine: false };
  const saved = new Map();
  let fail = false,
    lostAck = false,
    calls = 0,
    storageError = false;
  const localStorage = {
    get length() {
      return storage.size;
    },
    key: (i) => [...storage.keys()][i],
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => {
      if (storageError) throw Error("quota");
      storage.set(key, value);
    },
    removeItem: (key) => storage.delete(key),
  };
  const api = load("src/lib/activity.ts", {
    navigator: online,
    localStorage,
    require: (id) => {
      if (id === "@/lib/firebase") return { getDb: () => ({}), getFirebaseAuth: () => auth };
      if (id === "@/lib/usage-context")
        return {
          getUsageContext: (uid) => ({
            userId: uid,
            webSessionId: "web-" + uid,
            browserId: "browser",
          }),
        };
      if (id === "firebase/firestore")
        return {
          doc: (_db, _collection, id) => id,
          serverTimestamp: () => "server-time",
          setDoc: async (id, data) => {
            calls++;
            if (fail) throw Error("offline");
            if (saved.has(id)) throw Error("immutable");
            saved.set(id, data);
            if (lostAck) throw Error("lost ack");
          },
          getDoc: async (id) => {
            if (fail) throw Error("offline");
            return { exists: () => saved.has(id), data: () => saved.get(id) };
          },
        };
      throw Error(id);
    },
  });
  return {
    api,
    auth,
    online,
    saved,
    storage,
    setFail: (v) => {
      fail = v;
    },
    setLostAck: (v) => {
      lostAck = v;
    },
    setStorageError: (v) => {
      storageError = v;
    },
    calls: () => calls,
  };
}
test("offline queue is durable, immutable ID survives reload, timestamps stay distinct", async () => {
  const first = queueHarness();
  await first.api.logActivity({ type: "module_started", moduleId: "m1" });
  const item = JSON.parse([...first.storage.values()][0]);
  assert.equal(item.userId, "u1");
  assert.ok(item.data.occurredAt);
  assert.equal(item.data.createdAt, undefined);
  const second = queueHarness(first.storage);
  second.online.onLine = true;
  await second.api.flushActivity();
  assert.equal(second.saved.get(item.id).occurredAt, item.data.occurredAt);
  assert.equal(second.saved.get(item.id).createdAt, "server-time");
  assert.equal(first.storage.size, 0);
});
test("failed writes stay pending then retry; acknowledgement loss does not duplicate", async () => {
  const h = queueHarness();
  await h.api.logActivity({ type: "signed_in" });
  h.online.onLine = true;
  h.setFail(true);
  await h.api.flushActivity();
  assert.equal(h.api.activitySyncStatus().pending, 1);
  assert.equal(h.api.activitySyncStatus().writeFailed, true);
  h.setFail(false);
  h.setLostAck(true);
  await h.api.flushActivity();
  assert.equal(h.saved.size, 1);
  assert.equal(h.api.activitySyncStatus().pending, 0);
});
test("account switch never submits another account's queued events", async () => {
  const h = queueHarness();
  await h.api.logActivity({ type: "signed_in" });
  h.auth.currentUser = { uid: "u2" };
  await h.api.logActivity({ type: "signed_in" });
  h.online.onLine = true;
  await h.api.flushActivity();
  assert.equal(h.saved.size, 1);
  assert.equal([...h.saved.values()][0].userId, "u2");
  assert.equal(h.storage.size, 1);
  h.auth.currentUser = { uid: "u1" };
  await h.api.flushActivity();
  assert.equal(h.saved.size, 2);
});
test("storage failure is visible and unsaved metadata remains in memory", async () => {
  const h = queueHarness();
  h.setStorageError(true);
  await h.api.logActivity({ type: "signed_in" });
  assert.equal(h.api.activitySyncStatus().storageFailed, true);
  assert.equal(h.api.activitySyncStatus().pending, 1);
  h.online.onLine = true;
  await h.api.flushActivity();
  assert.equal(h.saved.size, 1);
});
test("concurrent tabs retry the same immutable ID without duplicate records", async () => {
  const h = queueHarness();
  await h.api.logActivity({ type: "signed_in" });
  const serialized = [...h.storage.values()][0];
  const item = JSON.parse(serialized);
  h.online.onLine = true;
  await h.api.flushActivity();
  h.storage.set("feedbacklab.activity.v2." + item.id, serialized);
  await h.api.flushActivity();
  assert.equal(h.saved.size, 1);
  assert.equal(h.storage.size, 0);
});

const { buildResearchLogs, EMPTY_RESEARCH_FILTERS } = load("src/lib/research-log.ts");
const beat = (id, webSessionId, browserId, start, end, extra = {}) => ({
  id,
  userId: "u1",
  type: "web_heartbeat",
  createdAt: end,
  occurredAt: end,
  intervalStartClient: start,
  webSessionId,
  browserId,
  elapsedSeconds: (Date.parse(end) - Date.parse(start)) / 1000,
  visibleSeconds: 10,
  activeSeconds: 5,
  unobservedSeconds: 0,
  ...extra,
});
const logs = (events) =>
  buildResearchLogs(
    { users: [], sessions: [], codes: { u1: "P1", u2: "P2" }, events },
    EMPTY_RESEARCH_FILTERS,
  );
test("overlap distinguishes another tab from another browser and excludes other people", () => {
  const rows = logs([
    beat("1", "a", "browserA", "2026-09-17T00:00:00Z", "2026-09-17T00:00:30Z"),
    beat("2", "b", "browserA", "2026-09-17T00:00:10Z", "2026-09-17T00:00:40Z"),
    beat("3", "c", "browserB", "2026-09-17T00:00:20Z", "2026-09-17T00:00:50Z"),
    beat("4", "d", "browserC", "2026-09-17T00:00:20Z", "2026-09-17T00:00:50Z", { userId: "u2" }),
  ]).web;
  assert.equal(rows[0].overlapping_web_session_count, 2);
  assert.equal(rows[0].overlapping_other_browser_count, 1);
  assert.equal(rows[3].overlapping_web_session_count, 0);
});
test("unclosed logins, sleep gaps, clock jumps and touching intervals do not prove overlap", () => {
  const rows = logs([
    beat("1", "a", "A", "2026-09-17T00:00:00Z", "2026-09-17T00:00:30Z"),
    beat("2", "b", "B", "2026-09-17T00:00:30Z", "2026-09-17T00:01:00Z"),
    beat("3", "c", "C", "2026-09-17T00:00:00Z", "2026-09-17T00:10:00Z", { unobservedSeconds: 600 }),
    beat("4", "d", "D", "2026-09-17T00:00:10Z", "2026-09-17T00:00:40Z", { elapsedSeconds: 1 }),
    {
      id: "5",
      userId: "u1",
      type: "signed_in",
      webSessionId: "e",
      createdAt: "2026-09-17T00:00:00Z",
    },
  ]).web;
  assert.ok(rows.every((r) => r.overlapping_web_session_count === 0));
  assert.equal(rows.find((r) => r.web_session_id === "e").visible_seconds, null);
});
test("repeated steps remain separate; missing end never becomes zero duration", () => {
  const start = {
    userId: "u1",
    type: "learning_step_started",
    runId: "run",
    moduleId: "m1",
    stepId: "intro",
    createdAt: "2026-09-17T00:00:00Z",
    startedAtClient: "2026-09-17T00:00:00Z",
  };
  const rows = logs([
    { ...start, id: "1", stepVisitId: "first" },
    { ...start, id: "2", stepVisitId: "second" },
    {
      ...start,
      id: "3",
      stepVisitId: "first",
      type: "learning_step_ended",
      elapsedSeconds: 20,
      activeSeconds: 0,
      visibleSeconds: 10,
      reason: "next_step",
    },
  ]).steps;
  assert.equal(rows.length, 2);
  assert.equal(rows[0].elapsed_seconds, 20);
  assert.equal(rows[0].active_proxy_seconds, 0);
  assert.equal(rows[1].elapsed_seconds, null);
  assert.equal(rows[1].end_event_present, false);
});
