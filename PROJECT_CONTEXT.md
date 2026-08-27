# PROJECT_CONTEXT.md

Use this document as the single source of truth when working on the **FeedbackLabsVR** project. All implementation decisions, naming conventions, and architectural rules should align with the context below.

---

## 1. Project Overview

- **Name:** FeedbackLabsVR
- **Purpose:** A web-based training system for university lecturers to practice giving constructive feedback in realistic classroom scenarios. The system uses a VR-web visual layer (Unity WebGL) combined with a React-based UI and learning flow.
- **Primary Users:** University lecturers (Thai-speaking educators who want to improve feedback delivery skills).
- **Core Goal:** Help lecturers move from judgmental or vague feedback toward empathetic, clear, motivating, and actionable feedback through guided experiential learning.

---

## 2. Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| Backend | Firebase (Auth, Firestore, Storage, Cloud Functions) |
| 3D / VR Visuals | Unity WebGL, embedded via `<iframe>` |
| AI Services | Whisper API (ASR), Claude / GPT (LLM scoring), Google TTS |
| UI Generation | Lovable |

> Note: The current codebase is a **mock UI prototype**. Firebase and AI integrations are stubbed or simulated unless explicitly being wired up.

> **Cloud Functions live in a separate deployable codebase** at `functions/` (its own `package.json`, `firebase-admin`/`firebase-functions` deps, compiled via `tsc` to `functions/lib/`). The main web app never imports `firebase-admin` — only the client SDK (`firebase` package) via `src/lib/firebase.ts`/`firestore.ts`. The web app calls deployed functions with `httpsCallable(getFirebaseFunctions(), name)`. Root `firebase.json` points the Firebase CLI at `functions/`; `.firebaserc` points at the real `feedbacklabs` project.

> **Three backend-access paths exist — pick by what the operation actually needs, not by habit:**
> 1. **Direct client Firestore SDK** (`src/lib/firestore.ts`, e.g. `consent.tsx`/`onboarding.tsx`) — default choice for anything a signed-in user does to their *own* data, where ownership is expressible in `firestore.rules` (`request.auth.uid == userId`). No server involved.
> 2. **TanStack Start server function** (`*.server.ts` + `*.functions.ts`, e.g. `ai.server.ts`/`ai.functions.ts`) — for logic that needs a secret (API key) but no Firestore Admin privileges and no event trigger. Ships with the same app deploy, no separate deploy step.
> 3. **Firebase Cloud Function** (`functions/`, `firebase-admin`) — for anything a client can't be trusted to do itself: bypassing security rules (e.g. certificate issuance, writing to a doc the caller doesn't own, cross-user aggregation), or reacting to a Firestore/Auth/Storage **event** (something a server function can't do — it only ever responds to a direct client call, never fires on a database write). `certificate.tsx`'s issuance (currently stubbed) is the clearest future candidate for this path.

---

## 3. Architecture

- **Unity WebGL** acts purely as the **visual display layer**. It renders the classroom scene, student avatar, and environmental feedback. It does not store business logic or user state.
- **React** owns **all UI, state management, and business logic**. Forms, assessments, scoring, progress tracking, and navigation live entirely in React.
- **Communication between Unity and React** happens through a **JavaScript Bridge** based on `postMessage`.
  - React sends commands into the iframe via `iframe.contentWindow.postMessage(...)`.
  - Unity sends events back to the parent window via `window.parent.postMessage(...)`.
- Firebase is the source of truth for persisted user data, session history, and scenario content.

---

## 4. Unity Bridge Events

### Unity → React (outgoing events)

| Event | Payload | Meaning |
|-------|---------|---------|
| `UNITY_READY` | `{ type: "UNITY_READY" }` | Unity scene has loaded and is ready to receive commands. |
| `STAGE_CHANGED` | `{ type: "STAGE_CHANGED", stage: number }` | User has moved to a new stage inside the scenario. |
| `AUDIO_RECORDED` | `{ type: "AUDIO_RECORDED", blobUrl: string, duration: number }` | A voice recording is available from the Unity layer (fallback path). |
| `SESSION_COMPLETE` | `{ type: "SESSION_COMPLETE", summary: object }` | Scenario session has ended inside Unity. |

### React → Unity (incoming commands)

Sent as an explicit `{ command, payload }` envelope (`command` is the discriminant Unity dispatches on; the table below shows each command's `payload` shape).

| Command | Payload | Meaning |
|---------|---------|---------|
| `OnSessionInit` | `{ scenarioId: string, userId: string }` | Start a new scenario session. |
| `OnScoresReceived` | `{ empathy: number, clarity: number, motivation: number, actionability: number }` | Send final or interim feedback scores to update the scene. |
| `OnRetryRequested` | `{ scenarioId: string }` | Ask Unity to reset the scenario for a second attempt. |
| `OnEmotionalFeedback` | `{ emotion: "neutral" \| "happy" \| "sad" }` | Relay the AI-derived emotional reaction (produced by a server-side, currently-mocked LLM scoring call on the round's transcript) so Unity can animate the student avatar's expression after each round's feedback is transcribed. |

---

## 5. Firestore Collections

> Per-user data only — static content (`SCENARIOS`, `MODULES`, question banks, survey items, wrap-up chapters) is deliberately **not** modeled as Firestore collections; it stays hardcoded in the relevant route files (`vr-simulation.tsx`, `modules.tsx`, `learner.functions.ts`, etc.). `scenarioId`/module-progress keys below are plain string IDs (`"s1"`, `"m1"`) referencing that hardcoded content.
>
> **Two independent AI-scoring rubrics exist — do not conflate them.** `diagnostic`/`posttest` below use a 4-dimension rubric (**empathy/clarity/motivation/actionability**). `sessions.stage3`/`stage4`'s `aiScores` use a different, unrelated 4-dimension rubric — **speechClarity/linguisticAppropriateness/balance/intentConsistency** (`RubricScores` in `src/types/unity.types.ts`; scored as part of the consolidated `generateCoachingReport`/`generateRoundTwoReport` calls in `src/lib/ai.server.ts`, real Gemini API calls with a deterministic mock fallback when `GEMINI_API_KEY` is unset). Only "clarity"-ish naming overlaps loosely — they measure different things. `COMPETENCIES` in `vr-simulation.tsx` must mirror `RubricScores` exactly; this has already drifted into three different ad-hoc schemas once before. See §6 note.

```
/users/{userId}
  profile: { displayName, email, avatarUrl, faculty, department, teachingExperienceYears }
  consent: { documentVersion, researchConsent, microphonePermission, audioRecordingConsent, createdAt } | null
  diagnostic: { empathy, clarity, motivation, actionability, total, createdAt } | null   // 4-dim rubric
  posttest: { empathyScore, clarityScore, motivationScore, actionabilityScore, totalScore, maxScore, percentage, passed, createdAt } | null  // same 4-dim rubric
  survey: { satisfaction, usability, perceivedLearning, recommendation, comments, createdAt } | null
  certificate: { issuedAt, certificateId } | null   // certificate.tsx issuance is stubbed/disabled today
  moduleProgress: {
    [moduleId]: { completed, quizScore, matchScore, reflectionText, timeSpentSeconds, completedAt }
  }
  progress: {
    currentStage, totalPoints, level,
    consentCompleted, onboardingCompleted, pretestCompleted,
    modulesCompletedCount, vrScenariosCompletedCount,
    posttestCompleted, surveyCompleted, certificateIssued,
    completedModuleIds: string[], completedScenarioIds: string[]
  }

/sessions/{sessionId}        // one doc per full VR scenario run (all 4 Kolb stages of one attempt)
  userId, scenarioId, createdAt
  stage1: { presented, transcript, durationSeconds, recordingUrl, startedAt, completedAt } | null
  stage2: { selfRatings: number[], bestPart, personalGoal, completedAt } | null
  stage3: { aiScores: { speechClarity, linguisticAppropriateness, balance, intentConsistency, overall } | null,  // 4-dim rubric — see note above; `overall` is a client-side weighted sum, not part of RubricScores itself
            selectedGoals: string[], customGoal, emotion, completedAt } | null
  stage4: { presented, transcript, durationSeconds, recordingUrl,
            aiScores: { speechClarity, linguisticAppropriateness, balance, intentConsistency, overall } | null, emotion, completedAt } | null
```

Design notes:
- `consent`/`diagnostic`/`posttest`/`survey`/`moduleProgress`/`progress` are embedded directly on the user doc, not subcollections — each is 1:1 with the user or a small fixed-size map, keeping a future real `getLearnerOverview()` a single-doc read (matches today's single `loadData()` mock call).
- `recordingUrl` fields are aspirational — today's recordings are in-memory `Blob`/`URL.createObjectURL()` values, revoked on unmount, never uploaded. Persisting real audio needs an actual Firebase Storage upload first (`getFirebaseStorage()` in `src/lib/firebase.ts`; `storage.rules`' `/recordings/{userId}/**` path is already reserved for this) — not wired yet.
- `where("userId","==",uid)` on `/sessions` needs no composite index; add one (`userId ASC, createdAt DESC`) only if/when a query also sorts by `createdAt`.

---

## 6. User Flow (Kolb Experiential Learning Cycle)

The VR simulation follows a four-stage Kolb cycle:

1. **Stage 1 — Concrete Experience**
   - The lecturer watches a Unity WebGL classroom scene and observes a student situation.
   - The lecturer records verbal feedback using the browser microphone.

2. **Stage 2 — Reflective Observation**
   - The lecturer plays back their own recording.
   - They complete a self-rating form with 8 non-judgmental reflection items.
   - No AI scores or judgments are shown at this stage.

3. **Stage 3 — Abstract Conceptualization**
   - The lecturer receives AI-generated coaching feedback.
   - A radar chart compares self-rating vs. AI scoring across four dimensions: Speech Clarity, Linguistic Appropriateness & Sentence Structure, Balance of Positive & Corrective Feedback, Intent Consistency (`generateCoachingReport`/`generateRoundTwoReport` in `src/lib/ai.server.ts`, real Gemini calls — see §5's rubric note; this is **not** the same four-dimension Empathy/Clarity/Motivation/Actionability rubric used by the diagnostic pretest and posttest, despite both having 4 dimensions).
   - Coaching tips are presented in Thai.

4. **Stage 4 — Active Experimentation**
   - The lecturer retries the same scenario.
   - A before/after comparison table shows Round 1 vs. Round 2 results.
   - Round 1 is visualized in **amber/gold**, Round 2 in **emerald/mint**.

---

## 7. Folder Structure

```
src/
├── hooks/
│   ├── useUnityBridge.ts      # [implemented] postMessage listener/dispatcher for Unity
│   ├── useFirebase.ts         # Firestore reads/writes and Auth state
│   └── useSession.ts          # Local or persisted session state
├── components/
│   ├── UnityPlayer.tsx        # [implemented] iframe wrapper + loading state + no-build fallback scene
│   ├── ScenarioUI.tsx         # scenario selector / launcher
│   ├── ReflectionForm.tsx     # self-rating form for Stage 2
│   └── Dashboard.tsx          # progress dashboard component
├── pages/                     # (conceptual; current stack uses src/routes/)
│   ├── ScenarioPage.tsx
│   ├── ReflectionPage.tsx
│   ├── CoachingPage.tsx
│   └── RetryPage.tsx
├── lib/
│   ├── firebase.ts            # Firebase app initialization
│   ├── api.ts                 # API helpers for AI services
│   ├── ai.functions.ts        # [implemented] createServerFn wrappers for generateCoachingReport/generateRoundTwoReport (client-safe)
│   └── ai.server.ts           # [implemented] server-only Gemini coaching-report logic; mocked until GEMINI_API_KEY is set
├── types/
│   ├── unity.types.ts         # [implemented] TypeScript types for Unity events + React→Unity commands
│   └── session.types.ts       # Session, score, and user types

functions/                      # [implemented, scaffold-only] separate Cloud Functions codebase
├── package.json                # own deps: firebase-admin, firebase-functions
├── tsconfig.json
└── src/
    └── index.ts                # `ping` onCall scaffold — replace with real Admin-SDK logic
```

> In the current TanStack Start codebase, routes live under `src/routes/` and shared logic lives under `src/lib/`. Preserve this structure unless migrating explicitly. Server-only code (touches secrets/env vars) lives in `*.server.ts` files and must only be imported dynamically from `*.functions.ts`/route files — see `src/lib/ai.server.ts` for the established convention.

---

## 8. Design Constraints

- **UI Language:** Thai only. All labels, instructions, feedback, and button text must be in Thai.
- **Target Form Factor:** Desktop-first browser experience. Mobile layout is secondary.
- **Stage 2 Rule:** The reflection screen must **never** display scores, AI judgment, or evaluative language. Use supportive, self-reflective prompts only.
- **Progress Gating:** The "Next" button must remain disabled until the user has completed the required activity for the current stage (e.g., recording finished, all self-ratings answered, coaching read).
- **Visual Theme:** Mint Laboratory — soft mint green primary, warm gold accents, clean card-based layout, rounded corners, and subtle shadows.
- **Accessibility:** Maintain clear focus states, readable contrast, and large enough touch targets for mouse interaction.

---

## 9. Admin Dashboard (`src/routes/admin/`)

A separate, researcher-facing section — not part of the lecturer flow, not gated by `_authenticated`'s mock-based guard. Reads across *all* users, which `firestore.rules` correctly forbids for a normal authenticated client — so this is the first real use of the `functions/` Cloud Functions codebase beyond its `ping` scaffold (see §2's three-backend-access-paths note, path 3).

- **Authorization: hardcoded email allowlist**, not Firebase custom claims. `functions/src/index.ts`'s `requireAdmin()` checks the caller's token email against `ADMIN_EMAILS` (comma-separated, `functions/.env`, never shipped to the client — see `functions/.env.example`). Every admin callable calls `requireAdmin(request)` as its first line; skipping it on a new one would leak all users' data to any authenticated caller.
- **Cloud Functions:** `adminListUsers` (full `/users` scan), `adminGetUserSessions({userId})` (that user's `/sessions`), `adminExportData` (both, raw, for client-side CSV formatting). All three convert Firestore `Timestamp`s to ISO strings before returning (`serializeTimestamps()`) — the callable JSON encoding doesn't preserve `Timestamp` otherwise.
- **Routes:** `admin/route.tsx` (own minimal shell, no lecturer nav) → `admin/index.tsx` (aggregate table + "ส่งออก CSV" button, downloads `users.csv`/`sessions.csv`) → `admin/$userId.tsx` (per-user VR session drill-down: transcripts, the 5-dim VR `aiScores` rubric, emotion). No router-level guard — a `permission-denied` from the callable itself renders the access-denied view.
- **Known gap:** only `consent`/`profile` are actually written to Firestore today (§5); `diagnostic`/`posttest`/`survey`/`/sessions` are designed but unwired, so those columns/the drill-down will show empty/placeholder values until those pages get their own Firestore-wiring pass.
- No pagination — fine at research-participant scale (tens–low hundreds of users), not solved for larger scale.

---

## Quick Reference for Claude Code

- Always write new UI text in **Thai**.
- Keep Unity logic thin; React owns state.
- Use the existing design tokens in `src/styles.css` and `DESIGN_SYSTEM.md`.
- Do not show scores during Stage 2 reflection.
- Lock navigation until the current stage requirement is satisfied.
- Prefer `src/routes/` for pages and `src/lib/` for shared logic in the current codebase.
