# System Diagrams — FeedbackLabVR

Every diagram below is plain text (Mermaid). Edit the text, the picture updates — no drawing tool, nothing to keep in sync by hand. To view: GitHub renders these fences inline automatically; VS Code shows them live with the "Markdown Preview Mermaid Support" extension; or paste any block into [mermaid.live](https://mermaid.live) to tweak and export as PNG/SVG for a slide deck.

Each section names the real files it's drawn from, so it can be checked against the code rather than taken on faith.

---

## 1. Tech Stack

| Layer | Technology |
|---|---|
| Client | React 19, TypeScript, Tailwind CSS v4, Radix UI primitives, Recharts |
| Routing / server functions | TanStack Router + TanStack Start 1.x (file-based routes, `createServerFn`) |
| Client state / data fetching | TanStack Query |
| 3D / VR layer | Unity WebGL build, embedded via `<iframe>`, `postMessage` bridge |
| Application server | Nitro (`node-middleware` preset) — bundles TanStack Start's SSR + server functions into one Node handler |
| Backend platform | Firebase: Hosting, Auth (Google sign-in), Firestore, Cloud Functions (2nd gen, Node 22), Cloud Storage (rules provisioned; no current data flow uses it) |
| AI services | Gemini API (`gemini-flash-latest`) for coaching/scoring; Google Cloud Text-to-Speech for NPC voice |
| Tooling | Vite, ESLint + Prettier, TypeScript strict, Zod (server-fn input validation) |

*Source: `package.json`, `functions/package.json`, `firebase.json`.*

---

## 2. System Architecture Diagram

Split into the two request paths that actually exist, instead of one crowded diagram — they barely share any nodes, so drawing them together only added crossing lines. Arrows are numbered in call order.

### 2a. Web & AI Request Path

```mermaid
%%{init: {'flowchart': {'nodeSpacing': 55, 'rankSpacing': 80, 'curve': 'basis'}}}%%
flowchart LR
  learner["Learner (browser)"]

  subgraph hosting["Firebase Hosting"]
    rewrite["catch-all rewrite"]
  end

  ssr["ssr Cloud Function\n(Nitro node-middleware,\nTanStack Start SSR + server fns)"]
  authsvc["Firebase Auth\n(Google OAuth)"]
  firestore[("Firestore\nusers, sessions")]
  gemini["Gemini API\ngemini-flash-latest"]

  learner -->|"1 page load /\nserver-fn call"| rewrite --> ssr
  ssr -->|"2 verify sign-in"| authsvc
  authsvc -->|"3 identity confirmed"| ssr
  ssr -->|"4 read / write docs"| firestore
  ssr -->|"5 coaching prompt\n(retries on 503/429)"| gemini
  gemini -->|"6 structured JSON report"| ssr
  ssr -->|"7 rendered page + report"| learner
```

### 2b. VR Audio & Admin Path

```mermaid
%%{init: {'flowchart': {'nodeSpacing': 55, 'rankSpacing': 80, 'curve': 'basis'}}}%%
flowchart LR
  unity["Unity WebGL build\n(sandboxed iframe)"]
  tts["generateTTS Cloud Function\n(service-account auth)"]
  cloudtts["Google Cloud\nText-to-Speech"]

  admin["Research Admin (browser)"]
  adminfns["adminListUsers / adminGetUserSessions /\nadminExportData\n(email allowlist gate)"]
  firestore[("Firestore\nusers, sessions")]

  unity -->|"1 onCall:\nNPC line text"| tts
  tts -->|"2 request w/\nservice-account token"| cloudtts
  cloudtts -->|"3 synthesized audio"| tts
  tts -->|"4 base64 audio"| unity

  admin -->|"1 onCall"| adminfns
  adminfns -->|"2 Admin SDK read\n(bypasses per-user rules)"| firestore
  firestore -->|"3 all users / sessions"| adminfns
  adminfns -->|"4 aggregate table / CSV"| admin
```

*Source: `functions/src/index.ts`, `src/lib/ai.server.ts`, `src/hooks/useUnityBridge.ts`, `firebase.json`.*

---

## 3. Use Case Diagram

Mermaid has no native UML use-case shape, so actors are plain nodes and use cases are stadium ovals inside the system boundary — same information, standard workaround.

```mermaid
%%{init: {'flowchart': {'nodeSpacing': 45, 'rankSpacing': 70, 'curve': 'basis'}}}%%
flowchart LR
  learnerActor["Learner\n(university lecturer)"]
  adminActor["Research Admin"]
  geminiActor["Gemini API"]

  subgraph system["FeedbackLabVR"]
    signin(["Sign in with Google"])
    consent(["Complete consent & onboarding"])
    diagnostic(["Take diagnostic assessment"])
    modules(["Complete learning modules"])
    vrsim(["Run VR simulation scenario"])
    record(["Record spoken feedback"])
    aiscore(["Generate AI coaching report"])
    posttest(["Take post-test"])
    survey(["Complete survey"])
    certificate(["View score summary & certificate"])
    dashboard(["View aggregate learner dashboard"])
    drilldown(["Drill into one learner's sessions"])
    export(["Export data as CSV"])
  end

  learnerActor --- signin
  learnerActor --- consent
  learnerActor --- diagnostic
  learnerActor --- modules
  learnerActor --- vrsim
  learnerActor --- posttest
  learnerActor --- survey
  learnerActor --- certificate
  vrsim --- record
  record -.->|"«include»"| aiscore
  aiscore --- geminiActor

  adminActor --- signin
  adminActor --- dashboard
  adminActor --- drilldown
  dashboard --- export
```

*Source: `src/routes/_authenticated/*.tsx`, `src/routes/admin/*.tsx`.*

---

## 4. Data Flow Diagrams

**Legend, used consistently across all three levels:** rectangle = external entity, circle = process, cylinder = data store. Entities, processes, and stores are each grouped in their own cluster so the eye can separate "who's involved" from "what happens" from "what's stored" at a glance.

### 4.1 Level 0 — Context Diagram

```mermaid
%%{init: {'flowchart': {'nodeSpacing': 50, 'rankSpacing': 75, 'curve': 'basis'}}}%%
flowchart LR
  subgraph entities["External Entities"]
    learner["Learner\n(university lecturer)"]
    admin["Research Admin"]
    google["Google Identity\n(OAuth)"]
    gemini["Gemini API"]
    tts["Google Cloud TTS"]
  end

  proc(("0\nFeedbackLabVR\nPlatform"))

  learner -->|"sign-in, consent, assessments,\nspoken feedback, VR interactions"| proc
  proc -->|"pages, AI coaching report,\nscores, certificate"| learner

  admin -->|"login, export request"| proc
  proc -->|"aggregate dashboard, CSV export"| admin

  proc -->|"sign-in request"| google
  google -->|"identity confirmed"| proc
  proc -->|"transcript + context prompt"| gemini
  gemini -->|"structured JSON report"| proc
  proc -->|"NPC line text"| tts
  tts -->|"synthesized audio"| proc
```

### 4.2 Level 1 — System Decomposition

```mermaid
%%{init: {'flowchart': {'nodeSpacing': 45, 'rankSpacing': 75, 'curve': 'basis'}}}%%
flowchart TD
  subgraph entities["External Entities"]
    learner["Learner"]
    admin["Research Admin"]
    google["Google Identity"]
    gemini["Gemini API"]
    ttssvc["Google Cloud TTS"]
  end

  subgraph processes["Processes"]
    p1(("1.0 Auth &\nAccess Control"))
    p2(("2.0 Learner Progress\n& Assessments"))
    p3(("3.0 VR Simulation\nEngine"))
    p4(("4.0 AI Coaching\nEngine"))
    p5(("5.0 Admin\nReporting"))
  end

  subgraph stores["Data Stores"]
    d1[("D1 Firestore: users")]
    d2[("D2 Firestore: sessions")]
  end

  learner -->|"sign-in"| p1
  p1 -->|"verify"| google
  google -->|"identity"| p1
  p1 --- d1
  p1 -->|"session"| learner

  learner -->|"consent, assessments"| p2
  p2 --- d1
  p2 -->|"scores"| learner

  learner -->|"present, feedback"| p3
  p3 --- d2
  p3 -->|"transcript + context"| p4
  p4 -->|"scored report"| p3
  p3 -->|"NPC line"| ttssvc
  ttssvc -->|"audio"| p3
  p3 -->|"scene, report"| learner
  p3 -->|"completion"| p2

  p4 -->|"prompt"| gemini
  gemini -->|"JSON / error"| p4

  admin --> p1
  admin -->|"request"| p5
  p5 --- d1
  p5 --- d2
  p5 -->|"table, CSV"| admin
```

### 4.3 Level 2 — Process 4.0 "AI Coaching Engine" Expanded

This is the part worth showing a client in detail: it's the actual retry/fallback logic behind why the app never hard-fails when Gemini returns a `503`.

```mermaid
%%{init: {'flowchart': {'nodeSpacing': 45, 'rankSpacing': 70, 'curve': 'basis'}}}%%
flowchart TD
  p3in["from 3.0 VR Simulation Engine\n(transcript, context, prior round / goals)"]
  p3out["to 3.0 VR Simulation Engine\n(validated report)"]
  gemini["Gemini API"]

  p41(("4.1\nBuild Prompt\n& Schema"))
  p42(("4.2\nCall Gemini"))
  p43(("4.3\nRetry Handler"))
  p44(("4.4\nParse & Validate\nResponse"))
  p45(("4.5\nMock Fallback\nGenerator"))

  p3in --> p41
  p41 -->|"system + user prompt,\nresponse schema"| p42
  p42 -->|"HTTPS POST generateContent"| gemini
  gemini -->|"200 JSON"| p42
  gemini -->|"503 / 429 error"| p42
  p42 -->|"retryable error"| p43
  p43 -->|"retry (up to 2x, backoff 800ms x n)"| p42
  p43 -->|"retries exhausted /\nnon-retryable error"| p45
  p42 -->|"response text"| p44
  p44 -->|"JSON.parse failure"| p45
  p44 -->|"validated report\n(scores clamped 0-100)"| p3out
  p45 -->|"deterministic heuristic report"| p3out
```

*Source: `src/lib/ai.server.ts` (`callGeminiJson`, `generateCoachingReport`, `generateRoundTwoReport`, `generateFinalSummary`), `src/lib/firestore.ts`, `functions/src/index.ts`.*
