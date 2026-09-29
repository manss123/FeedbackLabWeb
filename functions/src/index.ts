import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { readResearchPage } from "./research-page";
import { saveAssessment, ASSESSMENT_VERSION } from "./assessment";
import { issueCertificate as issueCertificateTx } from "./certificate";
import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";
import { onCall, onRequest, HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import type { GoogleAuth as GoogleAuthType } from "google-auth-library";

initializeApp();
const db = getFirestore();

export const submitRankingAssessment = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "กรุณาเข้าสู่ระบบก่อนส่งคำตอบ");
  return serializeTimestamps(await saveAssessment(db, request.auth.uid, request.data));
});

// No requireAdmin — any signed-in learner may call this for themselves. It's
// safe because issueCertificateTx re-verifies every stage server-side from
// Firestore itself before assigning a number; caller identity isn't what
// makes this trustworthy, the eligibility check inside it is (same reasoning
// as submitRankingAssessment above).
export const issueCertificate = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "กรุณาเข้าสู่ระบบก่อน");
  return serializeTimestamps(await issueCertificateTx(db, request.auth.uid));
});

// ============================================================
// ssr — serves the TanStack Start app itself via Firebase Hosting's
// catch-all rewrite (see firebase.json). The actual server code is built
// separately (`npm run build:firebase`, Nitro's node_middleware preset) and
// copied here by scripts/copy-ssr-to-functions.mjs as part of both the
// hosting and functions predeploy hooks — functions/ssr/ is a build
// artifact, gitignored, never committed or hand-edited.
// ============================================================

type NodeMiddleware = (req: unknown, res: unknown) => void;
let ssrMiddlewarePromise: Promise<NodeMiddleware> | null = null;

function getSsrMiddleware(): Promise<NodeMiddleware> {
  if (!ssrMiddlewarePromise) {
    ssrMiddlewarePromise = import(
      // @ts-expect-error - copied in at build time, not resolvable by tsc
      "../ssr/server/index.mjs"
    ).then((m) => m.middleware as NodeMiddleware);
  }
  return ssrMiddlewarePromise;
}

// timeoutSeconds bumped from the 60s default so the function itself never
// kills a slow request early. NOTE: this does NOT raise the effective
// ceiling for requests that come in through Firebase Hosting's rewrite (see
// firebase.json) — that proxy layer enforces its own ~60s limit regardless
// of this value, and a request that runs past it comes back as a generic
// Google Frontend "502 ... temporary error", not a clean response. Keep
// anything that can run long (ai.server.ts's Gemini retries) well under
// ~45-50s total; don't rely on this number to justify a longer budget there.
export const ssr = onRequest({ memory: "512MiB", timeoutSeconds: 180 }, async (req, res) => {
  const middleware = await getSsrMiddleware();
  middleware(req, res);
});

// ============================================================
// generateTTS — Gemini TTS proxy
// Unity เรียก function นี้แทนการเรียก Google TTS โดยตรง
// เพราะ Service Account ของ Firebase มี aiplatform.endpoints.predict
// ============================================================

interface TTSRequest {
  text: string;
  prompt?: string;
  voiceName?: string;
  languageCode?: string;
  modelName?: string;
  speakingRate?: number;
  pitch?: number;
}

export const generateTTS = onCall(
  {
    timeoutSeconds: 60,
    memory: "256MiB",
  },
  async (request) => {
    // TODO: re-enable auth check after testing
    // if (!request.auth) {
    //   throw new HttpsError("unauthenticated", "Sign in before calling Functions.");
    // }

    const data = request.data as TTSRequest;

    if (!data.text || data.text.trim() === "") {
      throw new HttpsError("invalid-argument", "text is required");
    }

    const {
      text,
      prompt = "",
      voiceName = "Achernar",
      languageCode = "th-TH",
      modelName = "gemini-2.5-flash-tts",
      speakingRate = 1.0,
      pitch = 0,
    } = data;

    // ใช้ Google Auth Library เพื่อ get Access Token จาก Service Account
    // Imported lazily (not at module scope) so the heavy google-auth-library
    // dependency tree isn't loaded during Firebase's 10s function-discovery
    // pass for every function — only when generateTTS actually runs.
    const { GoogleAuth } = (await import("google-auth-library")) as {
      GoogleAuth: typeof GoogleAuthType;
    };
    const auth = new GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });
    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    const accessToken = tokenResponse.token;

    if (!accessToken) {
      throw new HttpsError("internal", "Failed to get access token");
    }

    // เรียก Cloud TTS API ด้วย Service Account token
    const ttsPayload = {
      input: {
        text,
        ...(prompt ? { prompt } : {}),
      },
      voice: {
        languageCode,
        name: voiceName,
        model_name: modelName,
      },
      audioConfig: {
        audioEncoding: "LINEAR16",
        speakingRate,
        pitch,
      },
    };

    const projectId = process.env.GCLOUD_PROJECT;
    const response = await fetch("https://texttospeech.googleapis.com/v1/text:synthesize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "x-goog-user-project": projectId ?? "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(ttsPayload),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[generateTTS] TTS API error:", errText);
      throw new HttpsError("internal", `TTS API error: ${response.status} ${errText}`);
    }

    const result = (await response.json()) as { audioContent?: string };

    if (!result.audioContent) {
      throw new HttpsError("internal", "No audioContent in TTS response");
    }

    // บันทึก stats ไปใน Firestore (optional — สำหรับ monitoring)
    await db.collection("tts_logs").add({
      uid: request.auth?.uid ?? "anonymous",
      textLength: text.length,
      voiceName,
      modelName,
      createdAt: Timestamp.now(),
    });

    return {
      audioContent: result.audioContent, // base64 LINEAR16
      mimeType: "audio/wav",
    };
  },
);

// ============================================================
// ping — health check
// ============================================================
export const ping = onCall((request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Sign in before calling Functions.");
  }
  return { ok: true, uid: request.auth.uid, receivedAt: Date.now() };
});

// ============================================================
// NOTE: evaluateFeedback (Vertex AI Cloud Function) was removed —
// feedback rubric scoring now happens in the web app directly via a
// TanStack server function calling the Gemini API with a plain API key
// (see FeedbackLabWeb/src/lib/ai.server.ts: scoreFeedbackRubric).
// This avoids needing Vertex AI enabled + IAM roles on this project,
// and matches how scoreFeedbackEmotion already works.
// ============================================================

// ============================================================
// Admin dashboard functions
// ============================================================

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

export const adminResearchPage = onCall(async (request) => {
  requireAdmin(request);
  return serializeTimestamps(await readResearchPage(db, request.data));
});

function requireAdmin(request: CallableRequest): void {
  const email = request.auth?.token.email?.toLowerCase();
  if (!request.auth || !email || !ADMIN_EMAILS.includes(email)) {
    throw new HttpsError("permission-denied", "Admin access required.");
  }
}

function serializeTimestamps(value: unknown): unknown {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(serializeTimestamps);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, serializeTimestamps(v)]),
    );
  }
  return value;
}

// Safe for ANY signed-in caller — unlike the admin-only functions below,
// this deliberately does NOT call requireAdmin (that would throw for the
// common non-admin case). It only ever reveals whether the CALLER
// themselves is on the allowlist, never the list itself or any other
// user's data — used by learner-shell.tsx to decide whether to show the
// admin nav link, without exposing ADMIN_EMAILS to the client bundle.
export const adminCheckAccess = onCall((request) => {
  const email = request.auth?.token.email?.toLowerCase();
  return { isAdmin: !!email && ADMIN_EMAILS.includes(email) };
});

export const adminListUsers = onCall(async (request) => {
  requireAdmin(request);
  const snap = await db.collection("users").get();
  return serializeTimestamps(snap.docs.map((d) => ({ uid: d.id, ...d.data() })));
});

export const adminGetUserSessions = onCall(async (request) => {
  requireAdmin(request);
  const userId = (request.data as { userId?: string } | undefined)?.userId;
  if (!userId) throw new HttpsError("invalid-argument", "userId is required.");
  const snap = await db.collection("sessions").where("userId", "==", userId).get();
  return serializeTimestamps(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
});

// Milestone activity timeline for one learner — see src/lib/activity.ts
// (client-side writer) and firestore.rules' activity_log block (own-write/
// own-read only; this Admin SDK read bypasses that, same as the sessions
// read above).
export const adminGetUserActivity = onCall(async (request) => {
  requireAdmin(request);
  const userId = (request.data as { userId?: string } | undefined)?.userId;
  if (!userId) throw new HttpsError("invalid-argument", "userId is required.");
  const snap = await db
    .collection("activity_log")
    .where("userId", "==", userId)
    .orderBy("createdAt", "desc")
    .get();
  return serializeTimestamps(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
});

// All activity events across every learner, newest first — for the admin
// Activity Log tab (admin/index.tsx). Unlike adminGetUserActivity, this has
// no where() filter, so it only needs Firestore's automatic single-field
// index on createdAt, not a composite one.
export const adminListActivity = onCall(async (request) => {
  requireAdmin(request);
  const snap = await db.collection("activity_log").orderBy("createdAt", "desc").get();
  return serializeTimestamps(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
});

export const adminExportData = onCall(async (request) => {
  requireAdmin(request);
  const [usersSnap, sessionsSnap] = await Promise.all([
    db.collection("users").get(),
    db.collection("sessions").get(),
  ]);
  return serializeTimestamps({
    users: usersSnap.docs.map((d) => ({ uid: d.id, ...d.data() })),
    sessions: sessionsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
  });
});

// ============================================================
// Admin QA tool — fast-forward or reset a demo/test account's progress, so a
// researcher/professor can showcase or re-run the flow without clicking
// through every stage. Both the caller (requireAdmin) and the TARGET uid
// must be on ADMIN_EMAILS — this is what makes it safe: a real study
// participant is never an admin, so this can't touch real research data
// even by mistake. Checked against Firebase Auth directly (not the
// Firestore profile), so it works even before the target has onboarded.
// ============================================================

// Keep in sync with src/lib/questionnaires.ts — functions/ is a separate
// TS project and can't import client-side content directly.
const QUESTIONNAIRES_VERSION = "post-questionnaires-2026-09-v1";
const QUESTIONNAIRE_KEYS = ["lme", "sss", "srl", "ux"] as const;
// Keep in sync with modules.tsx's MODULES / vr-simulation.tsx's SCENARIOS.
const MODULE_IDS = ["m1", "m2", "m3", "m4", "m5"];
const SCENARIO_IDS = ["s1", "s2", "s3", "s4", "s5"];

async function requireTestAccount(uid: string): Promise<void> {
  const authUser = await getAuth()
    .getUser(uid)
    .catch(() => null);
  const email = authUser?.email?.toLowerCase();
  if (!email || !ADMIN_EMAILS.includes(email)) {
    throw new HttpsError("permission-denied", "ใช้ได้เฉพาะบัญชีทดสอบ/แอดมินเท่านั้น");
  }
}

// Mechanically valid, not meaningful — the point is unblocking gates, not
// producing a realistic score. Reuses the real scoring/idempotency path
// (saveAssessment) rather than hand-writing the attempt doc, so a genuine
// prior result is never clobbered and the written shape can never drift
// from what the rest of the app expects.
function syntheticAssessmentAnswers() {
  return Array.from({ length: 20 }, (_, i) => ({
    id: String(i + 1),
    ranks: { A: 1, B: 2, C: 3, D: 4 },
  }));
}

async function seedPretest(uid: string) {
  await saveAssessment(db, uid, {
    phase: "pretest",
    version: ASSESSMENT_VERSION,
    answers: syntheticAssessmentAnswers(),
  });
}

async function seedPosttest(uid: string) {
  await seedPretest(uid); // saveAssessment requires a pretest attempt to already exist
  await saveAssessment(db, uid, {
    phase: "posttest",
    version: ASSESSMENT_VERSION,
    answers: syntheticAssessmentAnswers(),
  });
}

async function seedSurvey(uid: string) {
  const userRef = db.collection("users").doc(uid);
  for (const key of QUESTIONNAIRE_KEYS) {
    const ref = userRef.collection("questionnaire_responses").doc(`${QUESTIONNAIRES_VERSION}_${key}`);
    const existing = await ref.get();
    if (existing.exists) continue; // never overwrite a real response
    await ref.create({
      userId: uid,
      key,
      version: QUESTIONNAIRES_VERSION,
      dimensionMeans: {},
      overallMean: 3,
      answers: {},
      submittedAt: Timestamp.now(),
      seeded: true,
    });
  }
  await userRef.update({
    "survey.completed": Object.fromEntries(QUESTIONNAIRE_KEYS.map((k) => [k, true])),
  });
}

async function seedModulesAndVr(uid: string) {
  const userRef = db.collection("users").doc(uid);
  const moduleProgress = Object.fromEntries(
    MODULE_IDS.map((id) => [
      id,
      {
        completed: true,
        quizScore: null,
        matchScore: null,
        reflectionText: null,
        timeSpentSeconds: null,
        completedAt: Timestamp.now(),
      },
    ]),
  );
  await userRef.set({ moduleProgress }, { merge: true });

  const existingSessions = await db.collection("sessions").where("userId", "==", uid).get();
  const completedScenarioIds = new Set<string>();
  existingSessions.docs.forEach((d) => {
    const data = d.data();
    if (data.stage4?.completedAt) completedScenarioIds.add(data.scenarioId);
  });
  const missing = SCENARIO_IDS.filter((id) => !completedScenarioIds.has(id));
  await Promise.all(
    missing.map((scenarioId) =>
      db.collection("sessions").doc().create({
        userId: uid,
        scenarioId,
        createdAt: Timestamp.now(),
        stage1: null,
        stage2: null,
        stage3: null,
        stage4: {
          presented: true,
          transcript: "",
          durationSeconds: 0,
          recordingUrl: null,
          aiScores: null,
          emotion: null,
          completedAt: Timestamp.now(),
        },
        seeded: true,
      }),
    ),
  );
}

export const adminSeedTestProgress = onCall(async (request) => {
  requireAdmin(request);
  const { uid, upTo } = (request.data ?? {}) as { uid?: string; upTo?: string };
  if (!uid || !["posttest", "survey", "certificate"].includes(upTo ?? "")) {
    throw new HttpsError("invalid-argument", "ระบุบัญชีและเป้าหมายให้ถูกต้อง");
  }
  await requireTestAccount(uid);

  if (upTo === "posttest") await seedPretest(uid);
  if (upTo === "survey") await seedPosttest(uid);
  if (upTo === "certificate") {
    await seedPosttest(uid);
    await seedSurvey(uid);
    await seedModulesAndVr(uid);
  }
  return { ok: true };
});

export const adminResetTestProgress = onCall(async (request) => {
  requireAdmin(request);
  const { uid } = (request.data ?? {}) as { uid?: string };
  if (!uid) throw new HttpsError("invalid-argument", "ระบุบัญชี");
  await requireTestAccount(uid);

  const userRef = db.collection("users").doc(uid);
  const [attempts, responses, sessions] = await Promise.all([
    userRef.collection("assessment_attempts").get(),
    userRef.collection("questionnaire_responses").get(),
    db.collection("sessions").where("userId", "==", uid).get(),
  ]);
  const batch = db.batch();
  attempts.docs.forEach((d) => batch.delete(d.ref));
  responses.docs.forEach((d) => batch.delete(d.ref));
  sessions.docs.forEach((d) => batch.delete(d.ref));
  batch.update(userRef, {
    assessmentResults: FieldValue.delete(),
    survey: FieldValue.delete(),
    moduleProgress: FieldValue.delete(),
    certificate: FieldValue.delete(),
  });
  await batch.commit();
  return { ok: true };
});
