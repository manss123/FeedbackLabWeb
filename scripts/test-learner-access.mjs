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
  faculty: "Education",
  department: null,
  teachingExperienceYears: 0,
  avatarUrl: null,
};
const complete = { consent, profile };

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
  const store = loadSource("src/lib/learner.functions.ts", {}, window);
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
  const auth = loadSource("src/routes/auth.tsx", routeMocks, window).Route;
  const learner = loadSource("src/routes/_authenticated/route.tsx", routeMocks, window).Route;
  const visit = (pathname) =>
    (pathname === "/auth" ? auth : learner).beforeLoad({
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

test("returning user with empty localStorage goes directly from auth to dashboard", async () => {
  const f = fixture();
  await expectRedirect(f.visit("/auth"), "/dashboard");
  const overview = f.queryClient.getQueryData(["learner-overview"]);
  assert.equal(overview.state.consent_completed, true);
  assert.equal(overview.state.onboarding_completed, true);
  assert.equal(overview.profile.display_name, profile.displayName);
  assert.deepEqual(f.state.reads, ["returning"]);
  await f.visit("/dashboard");
  assert.equal(f.state.reads.length, 1, "reuse the status read across the login redirect");
});

test("new user and consent-only user go straight to their missing setup step", async () => {
  const first = fixture();
  first.state.doc = null;
  await expectRedirect(first.visit("/auth"), "/consent");
  await first.visit("/consent");
  const second = fixture();
  second.state.doc = { consent };
  await expectRedirect(second.visit("/auth"), "/onboarding");
  await second.visit("/onboarding");
});

test("direct setup URLs skip completed forms before they mount", async () => {
  const f = fixture();
  await expectRedirect(f.visit("/consent"), "/dashboard");
  await expectRedirect(f.visit("/onboarding/"), "/dashboard");
  await f.visit("/modules");
});

test("partial profile and false consent are not treated as complete", async () => {
  const f = fixture();
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
  assert.equal(f.access.getLearnerEntryRoute(complete), "/dashboard", "zero years is valid");
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
  const navigation = f.visit("/auth").catch((error) => {
    settled = true;
    throw error;
  });
  const result = expectRedirect(navigation, "/dashboard");
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
  await assert.rejects(f.visit("/auth"), (error) => error === failure);
  assert.equal(f.store.loadAuth(), null);
  f.state.read = null;
  await expectRedirect(f.visit("/auth"), "/dashboard");
});

test("stale local completion cannot override Firestore or an expired Firebase login", async () => {
  const f = fixture();
  await expectRedirect(f.visit("/auth"), "/dashboard");
  f.state.doc = null;
  await f.queryClient.invalidateQueries({ queryKey: f.access.learnerAccessKey("returning") });
  await expectRedirect(f.visit("/dashboard"), "/consent");
  f.state.user = null;
  await expectRedirect(f.visit("/dashboard"), "/auth");
  assert.equal(f.store.loadAuth(), null);
});

test("successful setup invalidation advances the guard without bouncing to a stale form", async () => {
  const f = fixture();
  f.state.doc = null;
  await expectRedirect(f.visit("/auth"), "/consent");
  f.state.doc = { consent };
  await f.queryClient.invalidateQueries({ queryKey: f.access.learnerAccessKey("returning") });
  await f.visit("/onboarding");
  f.state.doc = complete;
  await f.queryClient.invalidateQueries({ queryKey: f.access.learnerAccessKey("returning") });
  await f.visit("/dashboard");
});

test("switching accounts clears the old learner state and drafts; same account keeps progress", async () => {
  const f = fixture();
  await expectRedirect(f.visit("/auth"), "/dashboard");
  const data = JSON.parse(f.storage.getItem("flvr.mock.v1"));
  data.state.current_stage = "modules";
  data.state.total_points = 700;
  f.storage.setItem("flvr.mock.v1", JSON.stringify(data));
  f.storage.setItem("flvr.draft.onboarding.form", "old-user-draft");
  await f.visit("/dashboard");
  assert.equal(f.queryClient.getQueryData(["learner-overview"]).state.total_points, 700);
  assert.equal(f.queryClient.getQueryData(["learner-overview"]).state.current_stage, "modules");
  f.state.user = { ...f.state.user, uid: "new-user" };
  f.state.doc = null;
  await expectRedirect(f.visit("/auth"), "/consent");
  const next = f.queryClient.getQueryData(["learner-overview"]);
  assert.equal(next.profile.id, "new-user");
  assert.equal(next.state.total_points, 0);
  assert.equal(f.storage.getItem("flvr.draft.onboarding.form"), null);
  assert.deepEqual(f.state.reads, ["returning", "new-user"]);
});
