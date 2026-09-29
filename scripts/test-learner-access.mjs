import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { QueryClient } from "@tanstack/react-query";
import { redirect, isRedirect } from "@tanstack/react-router";

const require = createRequire(import.meta.url);

// Exercise the production TS functions and route beforeLoad callbacks with
// controlled Firebase responses. No emulator, account or external service needed.
function loadSource(file, mocks, window) {
  const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  });
  const module = { exports: {} };
  runInNewContext(
    outputText,
    {
      module,
      exports: module.exports,
      require: (id) => (Object.hasOwn(mocks, id) ? mocks[id] : require(id)),
      window,
      setTimeout,
      console,
    },
    { filename: file },
  );
  return module.exports;
}

const consent = {
  researchConsent: true,
  microphonePermission: true,
  audioRecordingConsent: true,
};
const profile = {
  displayName: "Returning lecturer",
  university: "Mahidol University",
  faculty: "Education",
  department: null,
  teachingExperienceYears: 0,
  avatarUrl: null,
};
const complete = { consent, profile };

// A pathname guaranteed to never equal a real getLearnerEntryRoute() result
// ("/consent" | "/onboarding" | "/overview") — stands in for "just arrived,
// no specific page in mind" so _authenticated/route.tsx's pathname-mismatch
// branch always fires and redirects to the learner's real destination.
const ARRIVAL = "/__test_entry__";

function fixture() {
  const values = {};
  const storage = Object.create({
    getItem: (key) => values[key] ?? null,
    setItem: (key, value) => {
      values[key] = value;
      storage[key] = value;
    },
    removeItem: (key) => {
      delete values[key];
      delete storage[key];
    },
  });
  const window = { localStorage: storage };
  const store = loadSource(
    "src/lib/learner.functions.ts",
    {
      "./assessment.functions": { getAssessmentResults: async () => ({}) },
      "./assessment": { ASSESSMENT_VERSION: "cfct-ranking-2026-09-v1" },
      "./questionnaires.functions": { getQuestionnaireCompletion: async () => ({}) },
      "./questionnaires": { isAllQuestionnairesComplete: () => false },
      // Only required to satisfy this module's top-level imports at load
      // time — getModuleProgressAndCertificate/getVrRoundScores (the
      // functions that actually call these) are never exercised by
      // syncLearnerSetup, the only entry point these tests drive.
      "@/lib/firebase": { getDb: () => ({}), getFirebaseAuth: () => ({ currentUser: null }) },
      "@/lib/firebase-auth": { waitForFirebaseUser: async () => null },
      "@/lib/firestore": { listSessionsForUser: async () => [] },
    },
    window,
  );
  const state = {
    user: { uid: "returning", email: "lecturer@example.test", displayName: "Google name" },
    doc: complete,
    reads: [],
    wait: null,
    read: null,
  };
  const queryClient = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
  const access = loadSource(
    "src/lib/learner-access.ts",
    {
      "@/lib/firebase": { getFirebaseAuth: () => ({ currentUser: state.user }) },
      "@/lib/firebase-auth": {
        waitForFirebaseUser: () => state.wait ?? Promise.resolve(state.user),
      },
      "@/lib/firestore": {
        getUserDoc: (uid) => {
          state.reads.push(uid);
          return state.read ? state.read() : Promise.resolve(state.doc);
        },
      },
      "@/lib/learner.functions": store,
    },
    window,
  );
  const routeMocks = {
    "@tanstack/react-router": { createFileRoute: () => (options) => options, redirect },
    "@/lib/learner-access": access,
    "@/components/learner-access-state": {},
    "@/lib/firebase-auth": {},
    "@/lib/activity": {},
  };
  // There's no standalone /auth route anymore (login/logout both live on
  // "/" now) — every visit goes through _authenticated/route.tsx's guard,
  // the only beforeLoad left that calls loadLearnerAccess.
  const learner = loadSource("src/routes/_authenticated/route.tsx", routeMocks, window).Route;
  const visit = (pathname) =>
    learner.beforeLoad({
      context: { queryClient },
      location: { pathname },
    });
  return { state, access, store, storage, queryClient, visit };
}

async function expectRedirect(promise, to) {
  await assert.rejects(
    promise,
    (error) => isRedirect(error) && error.options.to === to && error.options.replace,
  );
}

test("returning user with empty localStorage lands directly on overview", async () => {
  const f = fixture();
  // Once fully set up, visiting any page other than /consent or /onboarding
  // just resolves — _authenticated/route.tsx only redirects a complete
  // profile away from those two stale forms, it doesn't force every
  // arrival onto /overview specifically (that was /auth's old job, now
  // handled by the sign-in button's own navigate() call, not a guard).
  await f.visit(ARRIVAL);
  const overview = f.queryClient.getQueryData(["learner-overview"]);
  assert.equal(overview.state.consent_completed, true);
  assert.equal(overview.state.onboarding_completed, true);
  assert.equal(overview.profile.display_name, profile.displayName);
  assert.deepEqual(f.state.reads, ["returning"]);
  await f.visit("/overview");
  assert.equal(f.state.reads.length, 1, "reuse the status read across the login redirect");
});

test("new user and consent-only user go straight to their missing setup step", async () => {
  const first = fixture();
  first.state.doc = null;
  await expectRedirect(first.visit(ARRIVAL), "/consent");
  await first.visit("/consent");
  const second = fixture();
  second.state.doc = { consent };
  await expectRedirect(second.visit(ARRIVAL), "/onboarding");
  await second.visit("/onboarding");
});

test("direct setup URLs skip completed forms before they mount", async () => {
  const f = fixture();
  await expectRedirect(f.visit("/consent"), "/overview");
  await expectRedirect(f.visit("/onboarding/"), "/overview");
  await f.visit("/modules");
});

test("partial profile and false consent are not treated as complete", async () => {
  const f = fixture();
  assert.equal(
    f.access.getLearnerEntryRoute({ consent, profile: { ...profile, university: " " } }),
    "/onboarding",
  );
  assert.equal(
    f.access.getLearnerEntryRoute({ consent, profile: { ...profile, faculty: " " } }),
    "/onboarding",
  );
  assert.equal(
    f.access.getLearnerEntryRoute({
      consent,
      profile: { ...profile, teachingExperienceYears: null },
    }),
    "/onboarding",
  );
  assert.equal(
    f.access.getLearnerEntryRoute({ consent: { ...consent, researchConsent: false }, profile }),
    "/consent",
  );
  assert.equal(f.access.getLearnerEntryRoute(complete), "/overview", "zero years is valid");
});

test("Firebase auth restoration and Firestore read both finish before redirecting", async () => {
  const f = fixture();
  let restore;
  let finishRead;
  f.state.wait = new Promise((resolve) => {
    restore = resolve;
  });
  f.state.read = () =>
    new Promise((resolve) => {
      finishRead = resolve;
    });
  let settled = false;
  const navigation = f.visit(ARRIVAL).catch((error) => {
    settled = true;
    throw error;
  });
  const result = navigation; // expected to resolve, not redirect — same reasoning as above
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(settled, false);
  assert.equal(f.state.reads.length, 0);
  restore(f.state.user);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(settled, false);
  assert.equal(f.queryClient.getQueryData(["learner-overview"]), undefined);
  finishRead(complete);
  await result;
});

test("a failed status read is an error, not a redirect to an empty form", async () => {
  const f = fixture();
  const failure = new Error("Firestore unavailable");
  f.state.read = () => Promise.reject(failure);
  await assert.rejects(f.visit(ARRIVAL), (error) => error === failure);
  assert.equal(f.store.loadAuth(), null);
  f.state.read = null;
  await f.visit(ARRIVAL);
});

test("stale local completion cannot override Firestore or an expired Firebase login", async () => {
  const f = fixture();
  await f.visit(ARRIVAL);
  f.state.doc = null;
  await f.queryClient.invalidateQueries({ queryKey: f.access.learnerAccessKey("returning") });
  await expectRedirect(f.visit("/overview"), "/consent");
  f.state.user = null;
  await expectRedirect(f.visit("/overview"), "/");
  assert.equal(f.store.loadAuth(), null);
});

test("successful setup invalidation advances the guard without bouncing to a stale form", async () => {
  const f = fixture();
  f.state.doc = null;
  await expectRedirect(f.visit(ARRIVAL), "/consent");
  f.state.doc = { consent };
  await f.queryClient.invalidateQueries({ queryKey: f.access.learnerAccessKey("returning") });
  await f.visit("/onboarding");
  f.state.doc = complete;
  await f.queryClient.invalidateQueries({ queryKey: f.access.learnerAccessKey("returning") });
  await f.visit("/overview");
});

test("switching accounts clears the old learner state and drafts; same account keeps progress", async () => {
  const f = fixture();
  await f.visit(ARRIVAL);
  f.storage.setItem("flvr.draft.onboarding.form", "old-user-draft");
  await f.visit("/overview");
  // Re-syncing the SAME account must not wipe local drafts/cache — progress
  // fields themselves (total_points/current_stage) aren't checked here
  // since computeState now always recomputes them fresh from real
  // completion flags rather than trusting whatever was last cached.
  assert.equal(f.storage.getItem("flvr.draft.onboarding.form"), "old-user-draft");
  assert.equal(f.queryClient.getQueryData(["learner-overview"]).profile.id, "returning");
  f.state.user = { ...f.state.user, uid: "new-user" };
  f.state.doc = null;
  await expectRedirect(f.visit(ARRIVAL), "/consent");
  const next = f.queryClient.getQueryData(["learner-overview"]);
  assert.equal(next.profile.id, "new-user");
  assert.equal(next.state.total_points, 0);
  assert.equal(f.storage.getItem("flvr.draft.onboarding.form"), null);
  assert.deepEqual(f.state.reads, ["returning", "new-user"]);
});
