import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { onCall, onRequest, HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import type { GoogleAuth as GoogleAuthType } from "google-auth-library";

initializeApp();
const db = getFirestore();

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
    const response = await fetch(
      "https://texttospeech.googleapis.com/v1/text:synthesize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "x-goog-user-project": projectId ?? "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(ttsPayload),
      }
    );

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
  }
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
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k,
        serializeTimestamps(v),
      ])
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
