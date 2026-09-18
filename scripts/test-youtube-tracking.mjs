import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import { webcrypto } from "node:crypto";
import ts from "typescript";

function load(file, globals = {}) {
  const module = { exports: {} };
  runInNewContext(
    ts.transpileModule(readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText,
    { module, exports: module.exports, crypto: webcrypto, queueMicrotask, ...globals },
  );
  return module.exports;
}
const { videoSlice } = load("src/lib/video-clock.ts");
const { measuredSeconds } = load("src/lib/usage-clock.ts");
const { deferredEffect } = load("src/lib/deferred-effect.ts");
const { summarizeVideoVisits } = load("src/lib/video-summary.ts");
const { researchRowKey } = load("src/lib/research-row-key.ts");

test("video table keys distinguish visits in one web session and survive filtering/reordering", () => {
  const base = {
    event_type: "video_observation",
    participant_code: "P1",
    web_session_id: "same-session",
    module_id: "m1",
    run_id: "run1",
    video_id: "v1",
  };
  const input = [
    { ...base, event_id: "e1", video_visit_id: "visit1" },
    { ...base, event_id: "e2", video_visit_id: "visit2" },
    { ...base, event_id: "legacy1", video_visit_id: null },
    { ...base, event_id: "legacy2", video_visit_id: null },
    { ...base, event_id: "e3", video_visit_id: "visit1", run_id: "run2" },
  ];
  const rows = summarizeVideoVisits(input);
  const keys = rows.map(researchRowKey);
  assert.equal(new Set(keys).size, 5);
  assert.equal(researchRowKey(summarizeVideoVisits([input[1]])[0]), keys[1]);
  assert.deepEqual(
    Array.from(summarizeVideoVisits([...input].reverse()), researchRowKey),
    [...keys].reverse(),
  );
  assert.equal(researchRowKey({ ...rows[0], video_playback_seconds: 99 }), keys[0]);
  assert.notEqual(
    researchRowKey({ ...base, event_id: "a" }),
    researchRowKey({ ...base, event_id: "b" }),
  );
});

test("video summary groups old and new intervals by visit without merging learners or missing IDs", () => {
  const base = {
    event_type: "video_observation",
    participant_code: "P1",
    web_session_id: "w1",
    run_id: "r1",
    module_id: "m1",
    video_id: "v1",
    video_visit_id: "visit1",
    video_playback_seconds: 2.5,
    video_visible_playback_seconds: 2,
    video_position_seconds: 100,
    video_player_state: 1,
    video_is_test: true,
  };
  const rows = summarizeVideoVisits([
    {
      ...base,
      event_id: "a",
      interval_start_client_utc: "2026-09-17T10:00:00Z",
      ended_at_client_utc: "2026-09-17T10:00:03Z",
    },
    {
      ...base,
      event_id: "b",
      video_player_state: 0,
      reason: "unmounted",
      ended_at_client_utc: "2026-09-17T10:00:10Z",
    },
    { ...base, event_id: "c", video_visit_id: "visit2" },
    { ...base, event_id: "d", participant_code: "P2" },
    { ...base, event_id: "e", video_visit_id: null, video_playback_seconds: null },
    { ...base, event_id: "f", video_visit_id: null },
    { event_type: "web_heartbeat" },
  ]);
  assert.equal(rows.length, 5);
  assert.equal(rows[0].video_playback_seconds, 5);
  assert.equal(rows[0].video_visible_playback_seconds, 4);
  assert.equal(rows[0].observation_count, 2);
  assert.equal(rows[0].reached_end, true);
  assert.equal(rows[0].exit_observed, true);
  assert.equal(rows[0].last_observed_at_utc, "2026-09-17T10:00:10Z");
  assert.equal(rows[3].video_playback_seconds, null);
  assert.equal(rows[1].exit_observed, false);
});

test("video wall time excludes pause, hidden viewing and sleep; is independent of seek/rate", () => {
  assert.equal(videoSlice(0, 10000, true, true).visible, 10000);
  assert.equal(videoSlice(0, 10000, true, false).visible, 0);
  assert.equal(videoSlice(0, 10000, true, false).playing, 10000);
  assert.equal(videoSlice(0, 10000, false, true).playing, 0);
  assert.equal(videoSlice(0, 60000, true, true).playing, 0);
  assert.equal(videoSlice(0, 60000, true, true).unobserved, 60000);
  assert.equal(videoSlice(1000, 0, true, true).visible, 0);
});

async function harness({ fail = false } = {}) {
  let now = 0,
    options,
    observerCallback,
    ended = 0,
    created = 0,
    destroyed = 0;
  let uid = "u1",
    position = 0,
    rate = 1;
  const effects = [],
    events = [],
    listeners = new Map(),
    timers = new Map();
  const host = { appendChild() {}, replaceChildren() {}, contains: (el) => el === host };
  const document = {
    visibilityState: "visible",
    fullscreenElement: null,
    createElement: () => ({}),
    addEventListener: (name, fn) => listeners.set(name, fn),
    removeEventListener: (name) => listeners.delete(name),
  };
  const player = {
    getCurrentTime: () => position,
    getPlaybackRate: () => rate,
    getPlayerState: () => -1,
    getIframe: () => ({}),
    destroy: () => destroyed++,
  };
  const { TrackedYouTube } = load("src/components/tracked-youtube.tsx", {
    performance: { now: () => now },
    document,
    Date,
    clearInterval: (id) => timers.delete(id),
    clearTimeout() {},
    window: {
      location: { pathname: "/modules", origin: "http://localhost:8080" },
      addEventListener: document.addEventListener,
      removeEventListener: document.removeEventListener,
      setInterval: (fn) => {
        timers.set(1, fn);
        return 1;
      },
      setTimeout: () => 2,
    },
    IntersectionObserver: class {
      constructor(fn) {
        observerCallback = fn;
      }
      observe() {}
      disconnect() {}
    },
    require: (id) => {
      if (id === "react")
        return {
          useRef: (value) => ({ current: value === null ? host : value }),
          useState: (value) => [value, () => {}],
          useEffect: (fn) => effects.push(fn),
        };
      if (id === "react/jsx-runtime") return { jsx() {}, jsxs() {} };
      if (id === "@/lib/deferred-effect") return { deferredEffect };
      if (id === "@/lib/video-clock") return { videoSlice };
      if (id === "@/lib/usage-clock") return { measuredSeconds };
      if (id === "@/lib/firebase") return { getFirebaseAuth: () => ({ currentUser: { uid } }) };
      if (id === "@/lib/activity") return { logActivity: (e) => events.push(e) };
      if (id === "@/lib/youtube-api")
        return {
          loadYouTubeApi: () =>
            fail
              ? Promise.reject(new Error("offline"))
              : Promise.resolve({
                  Player: class {
                    constructor(_el, opts) {
                      created++;
                      options = opts;
                      return player;
                    }
                  },
                }),
        };
      throw new Error(id);
    },
  });
  TrackedYouTube({
    videoId: "M7lc1UVf-VE",
    moduleId: "m1",
    runId: "run1",
    isTest: true,
    onEnded: () => ended++,
  });
  effects[0]();
  // Actual Strict Mode replay: cancelled setup must never create a player/event.
  effects[1]()();
  const cleanup = effects[1]();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  if (!fail) {
    options.events.onReady({ target: player });
    observerCallback([{ isIntersecting: true, intersectionRatio: 1 }]);
  }
  return {
    events,
    cleanup,
    document,
    host,
    state: (value) => options.events.onStateChange({ data: value }),
    advance: (ms) => {
      now += ms;
      timers.get(1)?.();
    },
    visibility: (value) => {
      document.visibilityState = value;
      listeners.get("visibilitychange")();
    },
    fullscreen: () => {
      document.fullscreenElement = host;
      listeners.get("fullscreenchange")();
    },
    viewport: (value) =>
      observerCallback([{ isIntersecting: value, intersectionRatio: value ? 1 : 0 }]),
    seek: (value) => {
      position = value;
    },
    rate: (value) => {
      rate = value;
      options.events.onPlaybackRateChange({ data: value });
    },
    error: (value) => options.events.onError({ data: value }),
    account: (value) => {
      uid = value;
    },
    get created() {
      return created;
    },
    get destroyed() {
      return destroyed;
    },
    get ended() {
      return ended;
    },
  };
}

test("iframe play/pause, seek, rate, fullscreen and hidden tab record disjoint real intervals", async () => {
  const h = await harness();
  assert.equal(h.created, 1);
  h.state(1);
  h.advance(10000);
  h.state(2);
  h.advance(5000);
  h.state(1); // Pause is not viewing.
  h.seek(200);
  h.rate(2);
  h.advance(5000); // Seek/speed cannot invent 200 seconds.
  h.visibility("hidden");
  h.advance(5000);
  h.state(2);
  h.visibility("visible");
  h.viewport(false);
  h.fullscreen();
  h.state(1);
  h.advance(5000);
  h.state(0);
  h.cleanup();
  const sum = (key) => h.events.reduce((n, e) => n + e[key], 0);
  assert.equal(sum("videoPlaybackSeconds"), 25);
  assert.equal(sum("videoVisiblePlaybackSeconds"), 20);
  assert.equal(h.ended, 1);
  assert.equal(h.destroyed, 1);
  assert.equal(new Set(h.events.map((e) => e.videoVisitId)).size, 1);
  assert.ok(
    h.events.every((e) => e.runId === "run1" && e.videoIsTest && e.activeSeconds === undefined),
  );
});

test("player errors and API failures are recorded, never fake completion", async () => {
  const h = await harness();
  h.state(1);
  h.advance(2000);
  h.error(150);
  h.advance(10000);
  h.cleanup();
  assert.equal(h.ended, 0);
  assert.equal(h.events.find((e) => e.reason === "player_error").videoErrorCode, 150);
  assert.equal(
    h.events.reduce((n, e) => n + e.videoPlaybackSeconds, 0),
    2,
  );
  const offline = await harness({ fail: true });
  assert.ok(offline.events.some((e) => e.reason === "api_load_error"));
  assert.equal(offline.ended, 0);
  offline.cleanup();
});

test("account change does not assign old video observations to the new account", async () => {
  const h = await harness();
  h.state(1);
  h.advance(1000);
  h.account("u2");
  const count = h.events.length;
  h.state(2);
  h.cleanup();
  assert.equal(h.events.length, count);
});

test("unchanged visibility/state and paused heartbeats do not spam durable logs", async () => {
  const h = await harness();
  assert.equal(h.events.length, 1); // Ready, no initial observer event.
  h.state(5);
  h.viewport(true);
  h.fullscreen();
  h.rate(2);
  assert.equal(h.events.length, 1);
  h.state(1);
  for (let i = 0; i < 30; i++) {
    h.state(1);
    h.viewport(true);
    h.advance(1000);
  }
  assert.equal(h.events.length, 3); // Ready + play + one 30-second checkpoint.
  h.state(2);
  const count = h.events.length;
  for (let i = 0; i < 60; i++) h.advance(1000);
  assert.equal(h.events.length, count);
  h.cleanup();
  assert.equal(
    h.events.reduce((n, e) => n + e.videoVisiblePlaybackSeconds, 0),
    30,
  );
});
