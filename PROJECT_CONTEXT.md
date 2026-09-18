# FeedbackLabsVR — Project Context

Updated: 2026-09-16. This document records the inspected source code and agreed architecture. **Current** means implemented in this checkout, not verified against a deployed service. **Target** means an agreed direction with implementation still pending. Use [SYSTEM_DIAGRAMS.md](SYSTEM_DIAGRAMS.md) for the corresponding diagrams.

## 1. Purpose and learning framework

FeedbackLabsVR (UI brand: My Feedback Lab) helps Thai-speaking university lecturers practice constructive feedback through learning modules, a Unity WebGL student avatar, self-reflection, and AI coaching. Research administrators review participant records and export research data.

Intended journey: Google sign-in → research consent → profile/onboarding → diagnostic pre-assessment → five learning modules → five VR scenarios → post-assessment → survey → score summary/certificate eligibility.

- **5E modules:** Engage, Explore, Explain, Elaborate, Evaluate. Module 1 has detailed activities; Modules 2–5 currently use placeholder activity screens.
- **Kolb VR cycle:** Concrete Experience (watch and speak), Reflective Observation (listen to oneself, eight self-ratings and reflection), Abstract Conceptualization (AI coaching and goals), Active Experimentation (speak again and compare).
- Stage 2 must not display AI scores or judgments. AI is requested when entering Stage 3.
- Points, levels, and module badges support progression. Current progression is primarily local; UI navigation gates are not server authorization.
- The current posttest pass threshold is 80%. Certificate PDF generation/verification is not implemented.

## 2. Current technology

| Layer                | Implementation                                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Web                  | React 19, TypeScript, Vite, Tailwind CSS v4, Radix UI/shadcn-style components, Recharts                                         |
| Routing and requests | TanStack Router/Start; TanStack Query for client data/mutations                                                                 |
| Hosting/server       | Firebase Hosting serves static files; unmatched requests go to the `ssr` Cloud Function running Nitro's `node_middleware` build |
| Identity             | Firebase Auth with Google sign-in; optional local emulators                                                                     |
| Persistence          | Firestore for profile, consent, VR sessions, activity and TTS logs; localStorage still holds learner progress and assessments   |
| Visuals              | Unity WebGL in an iframe; React–Unity JavaScript bridge                                                                         |
| Learner audio        | Browser MediaRecorder and Web Audio; Web Speech API in Thai for transcription; manual text entry available                      |
| AI                   | Server-side Gemini API, configured as `gemini-flash-latest`, for coaching reports                                               |
| NPC speech           | `generateTTS` callable uses Google Cloud Text-to-Speech; current defaults include `gemini-2.5-flash-tts`, `Achernar`, `th-TH`   |
| Storage              | SDK initializer and rules exist, but learner audio upload is **not a requirement**                                              |

Sources: `package.json`, `functions/package.json`, `firebase.json`, `src/lib/firebase.ts`, audio hooks and `functions/src/index.ts`. Model names above are code configuration, not a claim about provider availability.

## 3. Agreed decisions

### 3.1 Audio is temporary self-reflection material

Recordings are for the lecturer to replay during the current exercise. Keep them as in-memory Blob/object URLs, release object URLs when replaced or when the scenario unmounts, and stop microphone resources when no longer needed. No upload, archive, or administrator audio playback is required.

Persist transcripts, durations, reflection and available scores as research records; do not persist Blob URLs. Existing `SessionStage1.recordingUrl` and `SessionStage4.recordingUrl` fields remain `null` in current writes. They and the unused Storage recording rules are legacy scaffolding, not an upload backlog. Removing that scaffolding can be a later code cleanup.

The Gemini coaching request contains text and scenario context, not recorded audio. Do not describe it as acoustic voice-quality, pitch, pause, or speech-rate analysis. Browser speech recognition may use a browser-provider service; “no recording upload to our Storage” does not mean transcription is guaranteed to happen on-device.

### 3.2 AI failures must remain visible

**Required policy:** return `null` when a genuine AI report is unavailable. Never substitute a mock report, heuristic score, fabricated coaching paragraph, or another result that conceals the failure. Missing data is not a zero score or a neutral emotional assessment.

Current `ai.server.ts` retries real requests on 429/503 and transport errors (up to four retries after the initial request, delays 1s/2s/4s/4s). Missing configuration, unsuccessful calls, empty output and parsing exceptions return `null`. There is no synthetic report generator. Retrying the same real service does not fabricate a result.

Current UI shows a loading card while a request is pending, then “-” for unavailable report values. Server warnings/errors record failures, but no structured per-session AI error status is persisted yet.

**Remaining implementation gaps against this policy:**

- Parsed JSON is normalized with defaults such as missing rubric values → 0 and invalid emotion → neutral. It is not fully validated against the required report shape at runtime. Reject incomplete/invalid reports with `null` instead.
- Round-two/final-summary request construction can replace unavailable prior scores with zeros. Preserve absence and avoid presenting a comparison without a real baseline.
- A static goal list is offered when AI suggestions are absent. If retained as teaching content, label it explicitly as general guidance, not an AI recommendation.
- Add a clear Thai “AI analysis unavailable” state and an explicit retry action; distinguish pending, unavailable and successful results. Do not report a successful analysis for a null result.
- There is no fetch deadline/overall timeout in the current retry loop. The retry count alone does not bound request duration.

### 3.3 Firestore is the target for pre/post assessments

Diagnostic and posttest currently calculate results from fixed-choice answers in `learner.functions.ts` and save them to localStorage. They are **not LLM-scored assessments**.

Both must move to Firestore. Use the existing `users/{uid}.diagnostic` and `users/{uid}.posttest` fields for the latest result/overview; do not claim this migration is already complete. The current schema stores aggregate results, not raw answers or a history of every attempt. Versioned answers/attempt history require a deliberate schema extension before research that depends on them.

For final submission, choose an authenticated callable Cloud Function that validates question IDs and selected answers, calculates scores using a server-owned scoring key, and writes results and related completion fields. Do not accept client-calculated scores or `passed` as authoritative. The browser reads its own saved result through the client SDK. This keeps certificate eligibility based on server-derived results.

The existing question arrays may remain available to render the forms. Submission-function names and an answer/version schema have not yet been implemented.

## 4. Backend access decision

Use Firebase client SDK + Security Rules as the default for ordinary per-user data. Use trusted server operations for results or privileges the browser must not control. SSR is a rendering/deployment mechanism; it is not an alternative identity system.

| Operation                                                         | Chosen path                                                | Current / target                                                   |
| ----------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------ |
| Google login and identity restoration                             | Firebase Auth client SDK                                   | Current; route checks Firebase Auth and Firestore before rendering |
| Read own profile, consent, sessions, assessment results           | Firestore client SDK, ownership rules                      | Helpers exist; overview/result pages still need migration          |
| Write own profile, consent, reflection, transcript, survey        | Firestore client SDK, ownership and field validation rules | Profile/consent/session writes exist; survey still local           |
| Final diagnostic/posttest submission and authoritative completion | Authenticated callable + Admin SDK; browser sends answers  | Target; current scoring/progress are local                         |
| AI coaching                                                       | TanStack server function; API key only on server           | Current; verified caller authentication must still be added        |
| NPC TTS                                                           | Callable Cloud Function with service-account credentials   | Current; caller auth check is commented out and must be restored   |
| Cross-user research dashboard/export                              | Callable Cloud Functions + Admin SDK + admin authorization | Current                                                            |
| Issue certificate                                                 | Authenticated callable, server checks saved eligibility    | Target; UI button disabled                                         |
| Public pages/HTML and server-function transport                   | Firebase Hosting → `ssr`/Nitro                             | Current; no general SSR → Firestore data layer                     |

The client SDK enforces Firestore rules for signed-in users. Admin/server libraries bypass those rules, so each privileged endpoint must authorize its caller itself. This is why own-data reads need no generic SSR proxy. See [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started).

Callable SDK requests include available Firebase Auth tokens and expose verified identity in `request.auth`; handlers must still require an authenticated caller and check roles/ownership. The existing admin data functions use `requireAdmin()` with the server-configured `ADMIN_EMAILS` allowlist. See [Firebase callable functions](https://firebase.google.com/docs/functions/callable).

TanStack server functions do not automatically receive a Firebase identity from the browser SDK. For AI requests, require a Firebase ID token and verify it on the server before invoking Gemini; derive the UID from verification, never a client-supplied UID. This remains target work. Any Admin SDK used for verification must stay in a server-only module and must not enter the browser bundle. See [Firebase ID token verification](https://firebase.google.com/docs/auth/admin/verify-id-tokens).

Current `src/start.ts` has CSRF middleware, not Firebase authentication middleware. Both learner and admin route layouts disable SSR. No authenticated SSR cookie/session data-fetching layer exists or is required for the current client-rendered private pages. Revisit server session cookies only if private SSR becomes a concrete requirement.

**Migration rules:** Firebase Auth is now the route identity source. Move remaining learner state out of localStorage, keeping it only for optional user-scoped drafts/cache; await durable final submission before reporting success, and protect server-owned score/certificate/completion fields from direct client writes. Current `users` rules allow an owner to write the whole document; current `sessions` rules do not enforce immutable ownership or trusted AI scores on update. Rule hardening must accompany authoritative-result migration.

## 5. Current persistence and data model

| Record                                             | Current storage/write path                       | Direction                                                                                                    |
| -------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| Profile and consent                                | Firestore write awaited before local completion  | Keep direct client access                                                                                    |
| Diagnostic and posttest                            | localStorage; Firestore types only               | Move final submission to callable, persist in Firestore                                                      |
| Module completion, points, level, overall progress | localStorage                                     | Move durable overview to Firestore; protect authoritative fields                                             |
| Survey                                             | localStorage, separate Firestore milestone event | Move own survey data to Firestore                                                                            |
| VR session stages                                  | Firestore client create/update during scenario   | Keep transcript/reflection records; distinguish verified AI output if used as authoritative research results |
| Activity events                                    | Firestore client append, durable retry queue     | Milestones plus web/session/step timing; not proof full assessment data was saved                            |
| TTS usage                                          | Firestore `tts_logs`, server writer              | Operational logs                                                                                             |
| Certificate                                        | Type/eligibility UI only                         | Server-issued record later                                                                                   |
| Raw learner audio                                  | In-memory only                                   | Intentionally temporary; never upload                                                                        |

```text
/users/{uid}
  profile: { displayName, email, avatarUrl, faculty, department, teachingExperienceYears }
  consent: { documentVersion, researchConsent, microphonePermission,
             audioRecordingConsent, createdAt } | null
  diagnostic: { empathy, clarity, motivation, actionability, total, createdAt } | null
  posttest: { empathyScore, clarityScore, motivationScore, actionabilityScore,
              totalScore, maxScore, percentage, passed, createdAt } | null
  survey: { satisfaction, usability, perceivedLearning, recommendation, comments, createdAt } | null
  certificate: { issuedAt, certificateId } | null
  moduleProgress: {
    [moduleId]: { completed, quizScore, matchScore, reflectionText,
                  timeSpentSeconds, completedAt }
  }
  progress: { currentStage, totalPoints, level, consentCompleted, onboardingCompleted,
              pretestCompleted, modulesCompletedCount, vrScenariosCompletedCount,
              posttestCompleted, surveyCompleted, certificateIssued,
              completedModuleIds, completedScenarioIds }

/sessions/{sessionId}
  userId, scenarioId, createdAt
  stage1: { presented, transcript, durationSeconds, recordingUrl: null,
            startedAt, completedAt } | null
  stage2: { selfRatings: number[], bestPart, personalGoal, completedAt } | null
  stage3: { aiScores, selectedGoals, customGoal, emotion, completedAt } | null
  stage4: { presented, transcript, durationSeconds, recordingUrl: null,
            aiScores, emotion, completedAt } | null

/activity_log/{eventId}
  userId, type, createdAt
  moduleId?, scenarioId?, sessionId?

/tts_logs/{logId}
  uid, textLength, voiceName, modelName, createdAt
```

The user shape is the declared `UserDoc` schema, not a guarantee that every field is populated: current writes can create partial user documents. Profile/consent/results are embedded maps, not subcollections. A user can have many VR sessions and activity events. One session spans the four Kolb stages and both speaking rounds; repeated round-two practice does not create a separate round-history collection.

`aiScores` contains the four VR dimensions plus `overall` (currently the rounded mean of four equally weighted scores). Missing AI scores remain null. Full coaching narratives and the final AI summary are currently React state, not persisted in the session document.

Static modules, scenarios, question banks and survey items remain in source code. `scenarioId`/`moduleId` are references to those definitions, not Firestore foreign keys. A legacy `/scenarios` read rule does not establish a populated content collection.

The `activity_log` index on `userId ASC, createdAt DESC` supports per-user timelines. Current session queries filter by UID without ordering. TTS logs may have `uid: "anonymous"` while TTS caller auth is disabled; do not assume a mandatory user relationship.

Sources: `src/lib/firestore.ts`, `src/lib/learner.functions.ts`, `src/lib/activity.ts`, `src/types/activity.types.ts`, `firestore.rules`, `firestore.indexes.json`, route submission handlers and `functions/src/index.ts`.

## 6. Assessment rubrics

| Assessment          | Dimensions                                                           | Method                                                                |
| ------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Diagnostic/posttest | empathy, clarity, motivation, actionability                          | Fixed-choice scoring; each dimension normalized to 25, total 100      |
| VR feedback         | speechClarity, linguisticAppropriateness, balance, intentConsistency | Gemini analyzes transcript and scenario context; each dimension 0–100 |

Do not merge the rubrics or call `overall` a fifth VR competency. `RubricScores`, `SessionAiScores` and `COMPETENCIES` must agree. AI emotion is a simulated student reaction, not a measurement of the participant's psychological state.

Round-one coaching includes strengths, weaknesses, recommendation, suggested goals and feedback on the learner's personal goal. Round two produces scores, emotion and improvement summary. The final summary is another AI request across both rounds. The S1 awareness screen compares selected self-ratings with AI scores; the radar screen displays the AI rubric, not a universal validated self-rating mapping for all scenarios.

## 7. Unity integration

React controls UI, navigation, exercise state, recording and report presentation. Server components handle AI services and privileged work. Unity handles the scene, avatar animation, NPC speech and visual reactions; it is not the learner data store.

The build lives in `public/unity-build/`; `VITE_UNITY_BUILD_URL` selects it. The iframe HTML relays commands using `unityInstance.SendMessage("WebGLBridge", command, JSON.stringify(payload))`. The React listener checks origin and source. No iframe sandbox attribute is currently configured. Iframe load reveals the scene, while command dispatch waits for the actual `UNITY_READY` event.

### Unity → React event contract

| Event              | Payload                                                         |
| ------------------ | --------------------------------------------------------------- |
| `UNITY_READY`      | `{ type: "UNITY_READY" }`                                       |
| `STAGE_CHANGED`    | `{ type: "STAGE_CHANGED", stage: number }`                      |
| `AUDIO_RECORDED`   | `{ type: "AUDIO_RECORDED", blobUrl: string, duration: number }` |
| `SESSION_COMPLETE` | `{ type: "SESSION_COMPLETE", summary: object }`                 |

These are declared event types, not proof that the build emits every event. The React runner currently advances on a stage event without using its numeric stage. `SESSION_COMPLETE` is handled by the hook contract but is not wired through the current player/runner.

### React → Unity command contract

Commands use `{ command, payload }`.

| Command               | Payload                                                                    | Current sender                                   |
| --------------------- | -------------------------------------------------------------------------- | ------------------------------------------------ |
| `OnSessionInit`       | `{ scenarioId, userId }`                                                   | UnityPlayer after bridge readiness               |
| `OnScoresReceived`    | `{ speechClarity, linguisticAppropriateness, balance, intentConsistency }` | Type declared; not currently sent by UnityPlayer |
| `OnRetryRequested`    | `{ scenarioId, retryLine }`                                                | UnityPlayer for retry presentation               |
| `OnEmotionalFeedback` | `{ emotion: "neutral" \| "happy" \| "sad" }`                               | UnityPlayer after real AI emotion                |
| `OnMuteToggle`        | `{ muted: boolean }`                                                       | UnityPlayer mute control                         |

Web comments reference SALSA/EmoteR, `WebGLBridge.cs` and `SalsaTTSLinker`. Unity C#/.jslib sources are outside this checkout; internal lip-sync implementation and build coverage of all scenarios have not been verified here. The visual placeholder when no build loads is separate from the prohibited AI-result substitution.

## 8. Admin dashboard

`src/routes/admin/` has its own client-rendered shell. Cloud Functions enforce access to cross-user data through the server-side email allowlist, not localStorage or hidden navigation.

- `adminCheckAccess`: returns only whether the caller is an admin; it does not expose the allowlist.
- `adminListUsers`, `adminGetUserSessions`: user overview and per-user VR records.
- `adminListActivity`, `adminGetUserActivity`: aggregate activity and participant timeline.
- `adminExportData`: user/session records; client formats CSV.
- The admin index now presents participant behavior, Learning Log (VR sessions/module summaries), and chronological Activity Log. It reuses `adminExportData` and `adminListActivity`, with participant/date/content filters, session evidence detail, pseudonymous CSV/JSON datasets and a codebook. See [RESEARCH_LOGS.md](RESEARCH_LOGS.md) for row definitions, missing-data rules and filter semantics. Timestamps are serialized to ISO strings by the server.

Research tables paginate 25 rows in the browser; backend reads still scan all records. Unavailable progress/assessment data is not replaced with zero-valued progress in the research dashboard. Activity events now use a per-event durable retry queue; session document writes remain separate and can fail independently. Schema-v2 instrumentation adds client/server times, per-step runs, authenticated web sessions, page visits, visibility and active-proxy measurements. Elapsed time is not active study time. See [USAGE_TRACKING.md](USAGE_TRACKING.md) for delivery semantics, simultaneous-session analysis and limits.

## 9. Source map and implementation constraints

```text
src/
  routes/                 TanStack file-based pages; learner and admin layouts
  components/UnityPlayer.tsx
  components/learner-shell.tsx
  hooks/useUnityBridge.ts
  hooks/use-audio-recorder.ts
  hooks/use-speech-recognition.ts
  hooks/use-persisted-state.ts
  lib/firebase.ts         Client SDK initialization and emulator configuration
  lib/firebase-auth.ts    Google sign-in and Firebase auth-state helpers
  lib/learner-access.ts   Pre-render identity/setup resolution and UID-scoped query cache
  lib/firestore.ts        Types and own-data read/write helpers
  lib/learner.functions.ts Local mock progress/assessment store (not server functions)
  lib/activity.ts         Firestore event queue and retry writer
  lib/admin.functions.ts  Client wrappers for callable functions
  lib/ai.functions.ts    TanStack server-function wrappers and input validators
  lib/ai.server.ts        Server-only Gemini requests
  types/unity.types.ts    Bridge and AI report contracts
  types/activity.types.ts
functions/src/index.ts    ssr, generateTTS, ping and admin callables
public/unity-build/       Exported Unity build and iframe bridge
scripts/                 Firebase build packaging and emulator export helpers
```

Use Thai learner-facing language, Prompt typography, and the tokens/patterns in [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md). Preserve TanStack file-based routing and do not edit `routeTree.gen.ts` manually. Keep secrets/Admin SDK out of browser modules.

### Known issues to carry into implementation work

1. S2–S5 transition from reflection to `3-radar`, but round-one AI starts only at `3-awareness`. With a transcript, their waiting state can remain pending without a request. This is a source-level finding, not a browser-tested fix.
2. AI response validation, missing-score handling and visible failure states need the changes in §3.2.
3. Authenticated AI/TTS access and protected server-owned Firestore fields remain to be implemented (§4).
4. Durable pre/post assessment migration is agreed; progress/survey storage and authoritative completion must be reconciled with it.
5. Current session/event writes only warn on failure. A completed UI flow does not guarantee a complete research record.

This documentation update does not implement these code changes, migrate data, or change deployed rules.

## 10. Login and setup routing (implemented)

`/auth` and the learner parent route call `loadLearnerAccess()` in `beforeLoad`. The resolver awaits Firebase session restoration, reads the participant document through the client SDK, and chooses `/consent`, `/onboarding`, or `/dashboard` before mounting any form. Returning users with completed setup bypass both forms, including on direct visits to their URLs. Ready users can still open other learner routes directly.

The setup read uses a UID-scoped TanStack Query cache with a 30-second stale time to reuse the login read during redirect. Consent/profile submission awaits Firestore success, invalidates that cache, and then updates local progress and navigates. The former component-effect redirect chains in consent, onboarding and dashboard have been removed.

The resolver hydrates profile/setup flags into the remaining local learner overview before rendering. Account changes clear previous local progress/drafts. Read failures show a retryable error instead of treating the user as missing setup; pending checks show a neutral loading screen. This controls page routing only: Firestore Rules remain the data authorization boundary.

Regression checks: `node --test scripts/test-learner-access.mjs` covers returning/new/partial users, delayed identity/database reads, failed reads, direct setup URLs, stale local state, setup cache invalidation and account switching.
