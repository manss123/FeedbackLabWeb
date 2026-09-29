import type { ActivityMeasurements } from "@/types/activity.types";
import type { AssessmentPhase, AssessmentResult } from "./assessment";
import { httpsCallable } from "firebase/functions";
import { getFirebaseFunctions } from "@/lib/firebase";
import type { SessionAiScores, SessionEmotion, UserLearnerProgress } from "@/lib/firestore";
import type { ActivityEventType } from "@/types/activity.types";

// Same shapes as UserDoc/SessionDoc (src/lib/firestore.ts), but every
// Firestore Timestamp field arrives as an ISO string — the Cloud Function
// (functions/src/index.ts's serializeTimestamps) converts them before
// sending, since Timestamp instances don't survive the callable JSON encoding.

export interface AdminUserRow {
  assessmentResults?: Partial<Record<AssessmentPhase, AssessmentResult>>;
  uid: string;
  profile: {
    displayName: string | null;
    email: string;
    avatarUrl: string | null;
    university: string | null;
    faculty: string | null;
    department: string | null;
    teachingExperienceYears: number | null;
  };
  consent: {
    documentVersion: string;
    researchConsent: boolean;
    microphonePermission: boolean;
    audioRecordingConsent: boolean;
    createdAt: string;
  } | null;
  diagnostic: {
    empathy: number;
    clarity: number;
    motivation: number;
    actionability: number;
    total: number;
    createdAt: string;
  } | null;
  moduleProgress: Record<
    string,
    {
      completed: boolean;
      quizScore: number | null;
      matchScore: number | null;
      reflectionText: string | null;
      timeSpentSeconds: number | null;
      completedAt: string | null;
    }
  >;
  posttest: {
    empathyScore: number;
    clarityScore: number;
    motivationScore: number;
    actionabilityScore: number;
    totalScore: number;
    maxScore: number;
    percentage: number;
    passed: boolean;
    createdAt: string;
  } | null;
  // Completion mirror only — see UserSurvey in src/lib/firestore.ts. The
  // actual questionnaire answers/scores live in each user's
  // questionnaire_responses subcollection, not yet surfaced to the admin
  // dashboard (a separate follow-up once the instrument set is finalized).
  survey: { completed: Partial<Record<string, true>> } | null;
  certificate: { issuedAt: string; certificateId: string } | null;
  progress: UserLearnerProgress;
}

export interface AdminSessionRow {
  id: string;
  userId: string;
  scenarioId: string;
  createdAt: string;
  stage1: {
    presented: boolean;
    transcript: string;
    durationSeconds: number;
    recordingUrl: string | null;
    startedAt: string | null;
    completedAt: string | null;
  } | null;
  stage2: {
    selfRatings: number[];
    bestPart: string;
    personalGoal: string;
    completedAt: string | null;
  } | null;
  stage3: {
    aiScores: SessionAiScores | null;
    selectedGoals: string[];
    customGoal: string;
    emotion: SessionEmotion | null;
    completedAt: string | null;
  } | null;
  stage4: {
    presented: boolean;
    transcript: string;
    durationSeconds: number;
    recordingUrl: string | null;
    aiScores: SessionAiScores | null;
    emotion: SessionEmotion | null;
    completedAt: string | null;
  } | null;
}

// Safe to call for any signed-in user, admin or not — see adminCheckAccess
// in functions/src/index.ts for why this one doesn't reject non-admins.
export async function adminCheckAccess(): Promise<boolean> {
  const fn = httpsCallable<void, { isAdmin: boolean }>(getFirebaseFunctions(), "adminCheckAccess");
  const result = await fn();
  return result.data.isAdmin;
}

export async function adminListUsers(): Promise<AdminUserRow[]> {
  const fn = httpsCallable<void, AdminUserRow[]>(getFirebaseFunctions(), "adminListUsers");
  const result = await fn();
  return result.data;
}

export async function adminGetUserSessions(userId: string): Promise<AdminSessionRow[]> {
  const fn = httpsCallable<{ userId: string }, AdminSessionRow[]>(
    getFirebaseFunctions(),
    "adminGetUserSessions",
  );
  const result = await fn({ userId });
  return result.data;
}

// Same shape as ActivityEvent (src/types/activity.types.ts), with createdAt
// arriving as an ISO string, same Timestamp-serialization caveat as
// AdminUserRow/AdminSessionRow above. userId is included for adminListActivity
// (the cross-user Activity Log tab, which needs it to join against the
// learner list) — adminGetUserActivity's rows carry it too since it's just
// whatever the Firestore doc has, it's simply redundant there.
export interface AdminActivityRow extends ActivityMeasurements {
  occurredAt?: string;
  browserId?: string;
  webSessionId?: string;
  tabId?: string;
  authTime?: string | null;
  browserIdPersistent?: boolean;
  deviceCategory?: string;
  browserFamily?: string;
  schemaVersion?: number;
  id: string;
  userId: string;
  type: ActivityEventType;
  createdAt: string;
  moduleId?: string;
  scenarioId?: string;
  sessionId?: string;
}

export interface AdminResearchPage {
  users: AdminUserRow[];
  sessions: AdminSessionRow[];
  events: AdminActivityRow[];
  asOf: string;
  nextCursor: string | null;
}
export async function adminResearchPage(input: {
  from: string;
  to: string;
  cursor?: string | null;
}): Promise<AdminResearchPage> {
  const fn = httpsCallable<typeof input, AdminResearchPage>(
    getFirebaseFunctions(),
    "adminResearchPage",
  );
  return (await fn(input)).data;
}

export async function adminGetUserActivity(userId: string): Promise<AdminActivityRow[]> {
  const fn = httpsCallable<{ userId: string }, AdminActivityRow[]>(
    getFirebaseFunctions(),
    "adminGetUserActivity",
  );
  const result = await fn({ userId });
  return result.data;
}

// All activity events across every learner, newest first — see
// adminListActivity in functions/src/index.ts.
export async function adminListActivity(): Promise<AdminActivityRow[]> {
  const fn = httpsCallable<void, AdminActivityRow[]>(getFirebaseFunctions(), "adminListActivity");
  const result = await fn();
  return result.data;
}

export async function adminExportData(): Promise<{
  users: AdminUserRow[];
  sessions: AdminSessionRow[];
}> {
  const fn = httpsCallable<void, { users: AdminUserRow[]; sessions: AdminSessionRow[] }>(
    getFirebaseFunctions(),
    "adminExportData",
  );
  const result = await fn();
  return result.data;
}

// QA tool — fast-forward or reset a demo/test account's progress. The
// target uid must itself be an admin/test account (enforced server-side in
// functions/src/index.ts) — never usable on a real study participant.
export type AdminSeedUpTo = "posttest" | "survey" | "certificate";

export async function adminSeedTestProgress(uid: string, upTo: AdminSeedUpTo): Promise<void> {
  const fn = httpsCallable<{ uid: string; upTo: AdminSeedUpTo }, { ok: true }>(
    getFirebaseFunctions(),
    "adminSeedTestProgress",
  );
  await fn({ uid, upTo });
}

export async function adminResetTestProgress(uid: string): Promise<void> {
  const fn = httpsCallable<{ uid: string }, { ok: true }>(
    getFirebaseFunctions(),
    "adminResetTestProgress",
  );
  await fn({ uid });
}
