import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  query,
  where,
  type DocumentData,
  type Timestamp,
  type WithFieldValue,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";

// Collection names — keep in sync with PROJECT_CONTEXT.md §5. Per-user data
// only; static content (scenarios, modules, question banks) stays hardcoded
// in the app, deliberately not modeled as collections here.
export const COLLECTIONS = {
  users: "users",
  sessions: "sessions",
  activity_log: "activity_log",
} as const;

export interface UserProfile {
  displayName: string | null;
  email: string;
  avatarUrl: string | null;
  faculty: string | null;
  department: string | null;
  teachingExperienceYears: number | null;
}

export interface UserConsent {
  documentVersion: string;
  researchConsent: boolean;
  microphonePermission: boolean;
  audioRecordingConsent: boolean;
  createdAt: Timestamp;
}

// 4-dimension rubric — shared shape family with UserPosttest. Deliberately
// distinct from SessionAiScores (VR scenario scoring) — see PROJECT_CONTEXT.md §5.
export interface UserDiagnostic {
  empathy: number;
  clarity: number;
  motivation: number;
  actionability: number;
  total: number;
  createdAt: Timestamp;
}

export interface UserPosttest {
  empathyScore: number;
  clarityScore: number;
  motivationScore: number;
  actionabilityScore: number;
  totalScore: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  createdAt: Timestamp;
}

export interface UserSurvey {
  satisfaction: number;
  usability: number;
  perceivedLearning: number;
  recommendation: number;
  comments: string | null;
  createdAt: Timestamp;
}

export interface UserCertificate {
  issuedAt: Timestamp;
  certificateId: string;
}

// Keyed by the hardcoded MODULES[].id ("m1".."m5") in modules.tsx.
export interface ModuleProgress {
  completed: boolean;
  quizScore: number | null;
  matchScore: number | null;
  reflectionText: string | null;
  timeSpentSeconds: number | null;
  completedAt: Timestamp | null;
}

export type UserStage =
  | "consent"
  | "onboarding"
  | "diagnostic"
  | "modules"
  | "vr_simulation"
  | "posttest"
  | "survey"
  | "certificate"
  | "completed";

export interface UserLearnerProgress {
  currentStage: UserStage;
  totalPoints: number;
  level: number;
  consentCompleted: boolean;
  onboardingCompleted: boolean;
  pretestCompleted: boolean;
  modulesCompletedCount: number;
  vrScenariosCompletedCount: number;
  posttestCompleted: boolean;
  surveyCompleted: boolean;
  certificateIssued: boolean;
  completedModuleIds: string[];
  completedScenarioIds: string[];
}

export interface UserDoc {
  profile: UserProfile;
  consent: UserConsent | null;
  diagnostic: UserDiagnostic | null;
  moduleProgress: Record<string, ModuleProgress>;
  posttest: UserPosttest | null;
  survey: UserSurvey | null;
  certificate: UserCertificate | null;
  progress: UserLearnerProgress;
}

// 4-dimension rubric from generateCoachingReport/generateRoundTwoReport
// (src/lib/ai.server.ts, real Gemini calls) — NOT the 4-dimension diagnostic/posttest rubric above, despite
// both having 4 dimensions. Must mirror RubricScores in src/types/unity.types.ts
// and COMPETENCIES in vr-simulation.tsx exactly.
export interface SessionAiScores {
  speechClarity: number;
  linguisticAppropriateness: number;
  balance: number;
  intentConsistency: number;
  overall: number;
}

export type SessionEmotion = "neutral" | "happy" | "sad";

export interface SessionStage1 {
  presented: boolean;
  transcript: string;
  durationSeconds: number;
  // In-memory Blob/ObjectURL today, never uploaded — see PROJECT_CONTEXT.md §5.
  recordingUrl: string | null;
  startedAt: Timestamp | null;
  completedAt: Timestamp | null;
}

export interface SessionStage2 {
  selfRatings: number[];
  bestPart: string;
  personalGoal: string;
  completedAt: Timestamp | null;
}

export interface SessionStage3 {
  aiScores: SessionAiScores | null;
  selectedGoals: string[];
  customGoal: string;
  emotion: SessionEmotion | null;
  completedAt: Timestamp | null;
}

export interface SessionStage4 {
  presented: boolean;
  transcript: string;
  durationSeconds: number;
  recordingUrl: string | null;
  aiScores: SessionAiScores | null;
  emotion: SessionEmotion | null;
  completedAt: Timestamp | null;
}

// One doc per full VR scenario run (all 4 Kolb stages of one attempt).
export interface SessionDoc {
  userId: string;
  scenarioId: string; // "s1".."s5" — references the hardcoded SCENARIOS array, no scenarios collection
  createdAt: Timestamp;
  stage1: SessionStage1 | null;
  stage2: SessionStage2 | null;
  stage3: SessionStage3 | null;
  stage4: SessionStage4 | null;
}

export async function getUserDoc(userId: string): Promise<UserDoc | null> {
  const snap = await getDoc(doc(getDb(), COLLECTIONS.users, userId));
  return snap.exists() ? (snap.data() as UserDoc) : null;
}

export async function upsertUserDoc(
  userId: string,
  data: WithFieldValue<Partial<UserDoc>>,
): Promise<void> {
  await setDoc(doc(getDb(), COLLECTIONS.users, userId), data, { merge: true });
}

export async function createSession(data: WithFieldValue<SessionDoc>): Promise<string> {
  const ref = await addDoc(collection(getDb(), COLLECTIONS.sessions), data as DocumentData);
  return ref.id;
}

export async function updateSession(
  sessionId: string,
  data: WithFieldValue<Partial<SessionDoc>>,
): Promise<void> {
  await updateDoc(doc(getDb(), COLLECTIONS.sessions, sessionId), data);
}

export async function getSession(sessionId: string): Promise<(SessionDoc & { id: string }) | null> {
  const snap = await getDoc(doc(getDb(), COLLECTIONS.sessions, sessionId));
  return snap.exists() ? { id: snap.id, ...(snap.data() as SessionDoc) } : null;
}

export async function listSessionsForUser(
  userId: string,
): Promise<Array<SessionDoc & { id: string }>> {
  const snap = await getDocs(
    query(collection(getDb(), COLLECTIONS.sessions), where("userId", "==", userId)),
  );
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as SessionDoc) }));
}
