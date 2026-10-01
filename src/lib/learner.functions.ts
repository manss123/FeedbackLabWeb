// Learner store: identity (profile/consent) and all progress (assessments,
// modules, VR scenarios, survey) are real Firestore data — this file is now
// a computed view over it, plus a localStorage write-through cache so pages
// render instantly on repeat visits. Keeps the same export names/shapes as
// the original client-only mock so pages didn't need to change when each
// piece migrated (assessments and survey already had; see computeState).
import { doc, getDocFromServer } from "firebase/firestore";
import { getDb, getFirebaseAuth } from "@/lib/firebase";
import { waitForFirebaseUser } from "@/lib/firebase-auth";
import { listSessionsForUser, type UserDoc } from "@/lib/firestore";
import type { AssessmentPhase, AssessmentResult } from "./assessment";
import { ASSESSMENT_VERSION } from "./assessment";
import { getAssessmentResults } from "./assessment.functions";
import { isAllQuestionnairesComplete, type QuestionnaireKey } from "./questionnaires";
import { getQuestionnaireCompletion } from "./questionnaires.functions";

export const CONSENT_DOC_VERSION = "v2-2026-10-local-audio";

const STORAGE_KEY = "flvr.mock.v1";
const AUTH_KEY = "flvr.mock.auth.v1";

// -------- Types --------

export interface MockProfile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  university: string | null;
  faculty: string | null;
  department: string | null;
  teaching_experience_years: number | null;
}

export interface MockLearnerState {
  consent_completed: boolean;
  onboarding_completed: boolean;
  pretest_completed: boolean;
  modules_completed: number;
  vr_scenarios_completed: number;
  posttest_completed: boolean;
  survey_completed: boolean;
  certificate_issued: boolean;
  current_stage:
    | "consent"
    | "onboarding"
    | "diagnostic"
    | "modules"
    | "vr_simulation"
    | "posttest"
    | "survey"
    | "certificate"
    | "completed";
  total_points: number;
  level: number;
  completed_modules: string[];
  completed_scenarios: string[];
}

export interface MockConsent {
  document_version: string;
  research_consent: boolean;
  microphone_permission: boolean;
  audio_recording_consent: boolean;
  created_at: string;
}

export interface MockPosttest {
  empathy_score: number;
  clarity_score: number;
  motivation_score: number;
  actionability_score: number;
  total_score: number;
  max_score: number;
  percentage: number;
  passed: boolean;
  created_at: string;
}

export interface MockDiagnostic {
  empathy: number;
  clarity: number;
  motivation: number;
  actionability: number;
  total: number;
  created_at: string;
}

export interface MockCertificate {
  issued_at: string;
  certificate_id: string;
}

export interface MockData {
  assessmentResults?: Partial<Record<AssessmentPhase, AssessmentResult>>;
  profile: MockProfile | null;
  state: MockLearnerState;
  consent: MockConsent | null;
  posttest: MockPosttest | null;
  // Firestore-backed completion mirror (see getQuestionnaireCompletion) —
  // not a local mock like the other fields here; kept in this shape only so
  // pages don't need major changes, per this file's header comment.
  survey: Partial<Record<QuestionnaireKey, boolean>> | null;
  diagnostic: MockDiagnostic | null;
  // Server-issued only (see issueCertificate in certificate.functions.ts) —
  // never written by the client, same trust boundary as assessmentResults.
  certificate: MockCertificate | null;
}

// -------- Store --------

function defaultState(): MockLearnerState {
  return {
    consent_completed: false,
    onboarding_completed: false,
    pretest_completed: false,
    modules_completed: 0,
    vr_scenarios_completed: 0,
    posttest_completed: false,
    survey_completed: false,
    certificate_issued: false,
    current_stage: "consent",
    total_points: 0,
    level: 1,
    completed_modules: [],
    completed_scenarios: [],
  };
}

function emptyData(profile: MockProfile | null): MockData {
  return {
    profile,
    state: defaultState(),
    consent: null,
    posttest: null,
    survey: null,
    diagnostic: null,
    certificate: null,
  };
}

function isBrowser() {
  return typeof window !== "undefined";
}

function loadData(): MockData {
  if (!isBrowser()) return emptyData(null);
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const auth = loadAuth();
      return emptyData(auth ? profileFromAuth(auth) : null);
    }
    return JSON.parse(raw) as MockData;
  } catch {
    return emptyData(null);
  }
}

function saveData(d: MockData) {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
}

function recomputeLevel(state: MockLearnerState) {
  state.level = Math.max(1, Math.floor(state.total_points / 300) + 1);
}

// -------- Derived progress (Firestore is the source of truth) --------

const STAGE_POINTS = {
  consent: 50,
  onboarding: 50,
  module: 100,
  vrScenario: 150,
  survey: 100,
} as const;

// Single place that turns real completion flags into current_stage/points/
// level — replaces the old sequential single-step `if` chains that only
// ever advanced current_stage one step at a time and would leave it stale
// after several stages complete at once (e.g. an admin seeding progress).
function computeState(input: {
  consentCompleted: boolean;
  onboardingCompleted: boolean;
  pretestCompleted: boolean;
  completedModuleIds: string[];
  completedScenarioIds: string[];
  posttestCompleted: boolean;
  surveyCompleted: boolean;
  certificateIssued: boolean;
}): Pick<
  MockLearnerState,
  | "consent_completed"
  | "onboarding_completed"
  | "pretest_completed"
  | "modules_completed"
  | "vr_scenarios_completed"
  | "posttest_completed"
  | "survey_completed"
  | "certificate_issued"
  | "current_stage"
  | "total_points"
  | "level"
  | "completed_modules"
  | "completed_scenarios"
> {
  const {
    consentCompleted,
    onboardingCompleted,
    pretestCompleted,
    completedModuleIds,
    completedScenarioIds,
    posttestCompleted,
    surveyCompleted,
    certificateIssued,
  } = input;

  // Strict canonical order — nothing actually blocks a learner from
  // visiting /posttest or /survey before finishing modules/VR (only pretest
  // gates posttest), so each stage must be individually confirmed done, not
  // inferred from a later one being done (surveyCompleted alone used to
  // short-circuit straight to "certificate" even with 0/5 modules).
  let current_stage: MockLearnerState["current_stage"];
  if (!consentCompleted) current_stage = "consent";
  else if (!onboardingCompleted) current_stage = "onboarding";
  else if (!pretestCompleted) current_stage = "diagnostic";
  else if (completedModuleIds.length < 5) current_stage = "modules";
  else if (completedScenarioIds.length < 5) current_stage = "vr_simulation";
  else if (!posttestCompleted) current_stage = "posttest";
  else if (!surveyCompleted) current_stage = "survey";
  else current_stage = certificateIssued ? "completed" : "certificate";

  const total_points =
    (consentCompleted ? STAGE_POINTS.consent : 0) +
    (onboardingCompleted ? STAGE_POINTS.onboarding : 0) +
    completedModuleIds.length * STAGE_POINTS.module +
    completedScenarioIds.length * STAGE_POINTS.vrScenario +
    (surveyCompleted ? STAGE_POINTS.survey : 0);

  return {
    consent_completed: consentCompleted,
    onboarding_completed: onboardingCompleted,
    pretest_completed: pretestCompleted,
    modules_completed: completedModuleIds.length,
    vr_scenarios_completed: completedScenarioIds.length,
    posttest_completed: posttestCompleted,
    survey_completed: surveyCompleted,
    certificate_issued: certificateIssued,
    current_stage,
    total_points,
    level: Math.max(1, Math.floor(total_points / 300) + 1),
    completed_modules: completedModuleIds,
    completed_scenarios: completedScenarioIds,
  };
}

// users/{uid}.moduleProgress was always in the schema but never written
// until modules.tsx started doing so directly via upsertUserDoc. Certificate
// info piggybacks on this same read (rather than a second full-document
// fetch) since both live on the same user doc.
interface ModuleProgressAndCertificate {
  completedModuleIds: string[];
  certificate: MockCertificate | null;
}

async function getModuleProgressAndCertificate(): Promise<ModuleProgressAndCertificate> {
  const user = await waitForFirebaseUser();
  if (!user) return { completedModuleIds: [], certificate: null };
  const snapshot = await getDocFromServer(doc(getDb(), "users", user.uid));
  if (getFirebaseAuth().currentUser?.uid !== user.uid)
    throw new Error("บัญชีผู้ใช้เปลี่ยนระหว่างโหลดข้อมูล กรุณาลองอีกครั้ง");
  const data = snapshot.data();
  const progress = data?.moduleProgress as Record<string, { completed?: boolean }> | undefined;
  const completedModuleIds = Object.entries(progress ?? {})
    .filter(([, p]) => p?.completed)
    .map(([id]) => id);
  const cert = data?.certificate as
    { issuedAt?: { toDate: () => Date }; certificateId?: string } | undefined;
  const certificate =
    cert?.certificateId && cert.issuedAt
      ? { issued_at: cert.issuedAt.toDate().toISOString(), certificate_id: cert.certificateId }
      : null;
  return { completedModuleIds, certificate };
}

// No dedicated field for this — a scenario counts as completed once its
// session's stage4 (round 2) has a real completedAt, exactly the signal
// vr-simulation.tsx already writes via updateSession at the summary step.
async function getCompletedScenarioIds(): Promise<string[]> {
  const user = await waitForFirebaseUser();
  if (!user) return [];
  const sessions = await listSessionsForUser(user.uid);
  if (getFirebaseAuth().currentUser?.uid !== user.uid)
    throw new Error("บัญชีผู้ใช้เปลี่ยนระหว่างโหลดข้อมูล กรุณาลองอีกครั้ง");
  const ids = new Set<string>();
  for (const s of sessions) if (s.stage4?.completedAt) ids.add(s.scenarioId);
  return [...ids];
}

// Personal VR coaching-score trend for the results dashboard (certificate.tsx)
// — average AI "overall" score across the learner's own sessions, round 1
// (stage3, first attempt) vs round 2 (stage4, after retrying with coaching).
// Same signal AdminMonitoring charts cohort-wide; this is the single-learner
// version, computed client-side since sessions are already own-uid readable.
export interface VrRoundScores {
  round1: number | null;
  round2: number | null;
  pairedCount: number;
}

export async function getVrRoundScores(): Promise<VrRoundScores> {
  const user = await waitForFirebaseUser();
  if (!user) return { round1: null, round2: null, pairedCount: 0 };
  const sessions = await listSessionsForUser(user.uid);
  if (getFirebaseAuth().currentUser?.uid !== user.uid)
    throw new Error("บัญชีผู้ใช้เปลี่ยนระหว่างโหลดข้อมูล กรุณาลองอีกครั้ง");
  const round1 = sessions
    .map((s) => s.stage3?.aiScores?.overall)
    .filter((v): v is number => typeof v === "number");
  const round2 = sessions
    .map((s) => s.stage4?.aiScores?.overall)
    .filter((v): v is number => typeof v === "number");
  const pairedCount = sessions.filter(
    (s) =>
      typeof s.stage3?.aiScores?.overall === "number" &&
      typeof s.stage4?.aiScores?.overall === "number",
  ).length;
  const avg = (values: number[]) =>
    values.length ? Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)) : null;
  return { round1: avg(round1), round2: avg(round2), pairedCount };
}

// -------- Auth (mock) --------

export interface MockAuth {
  id: string;
  email: string;
  name: string;
}

function profileFromAuth(auth: MockAuth): MockProfile {
  return {
    id: auth.id,
    email: auth.email,
    display_name: auth.name,
    avatar_url: null,
    university: null,
    faculty: null,
    department: null,
    teaching_experience_years: null,
  };
}

export function loadAuth(): MockAuth | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(AUTH_KEY);
    return raw ? (JSON.parse(raw) as MockAuth) : null;
  } catch {
    return null;
  }
}

export function isSignedIn(): boolean {
  return !!loadAuth();
}

// Mirrors a real, already-authenticated Firebase user into the local
// session/progress store. Learner progress (this whole file) is still a
// localStorage mock — see PROJECT_CONTEXT.md — so a real identity is bridged
// into it here rather than migrating the whole data layer at once.
export function setAuthFromFirebaseUser(user: {
  id: string;
  email: string;
  name: string | null;
}): void {
  if (!isBrowser()) return;
  const auth: MockAuth = { id: user.id, email: user.email, name: user.name ?? user.email };
  // A different account must not inherit another participant's progress/drafts.
  const existingData = loadData();
  if (loadAuth()?.id !== user.id || existingData.profile?.id !== user.id) resetMockData();
  window.localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
  // Initialize learner data if missing
  const existing = window.localStorage.getItem(STORAGE_KEY);
  if (!existing) saveData(emptyData(profileFromAuth(auth)));
}

// Reconcile setup before rendering any learner page — everything here is
// now real Firestore data (or, for VR scenarios, derived from it below).
export async function syncLearnerSetup(
  userDoc: UserDoc | null,
  destination: "/consent" | "/onboarding" | "/overview",
): Promise<MockData> {
  const d = loadData();
  const consentCompleted = destination !== "/consent";
  const onboardingCompleted = destination === "/overview";
  if (userDoc?.profile && d.profile) {
    d.profile = {
      ...d.profile,
      display_name: userDoc.profile.displayName,
      avatar_url: userDoc.profile.avatarUrl,
      university: userDoc.profile.university,
      faculty: userDoc.profile.faculty,
      department: userDoc.profile.department,
      teaching_experience_years: userDoc.profile.teachingExperienceYears,
    };
  }
  d.assessmentResults = {};
  for (const phase of ["pretest", "posttest"] as const) {
    const r = userDoc?.assessmentResults?.[phase];
    if (r?.version === ASSESSMENT_VERSION)
      d.assessmentResults[phase] = { ...r, submittedAt: r.submittedAt.toDate().toISOString() };
  }
  d.diagnostic = null;
  d.posttest = null;
  d.survey = userDoc?.survey?.completed ?? null;
  d.certificate = userDoc?.certificate
    ? {
        issued_at: userDoc.certificate.issuedAt.toDate().toISOString(),
        certificate_id: userDoc.certificate.certificateId,
      }
    : null;

  const completedModuleIds = Object.entries(userDoc?.moduleProgress ?? {})
    .filter(([, p]) => p?.completed)
    .map(([id]) => id);
  // Only userDoc is available here (no extra round trip at route-guard
  // time) — getCompletedScenarioIds needs a separate sessions query, so
  // this uses whatever was last cached; getLearnerOverview (called right
  // after, on every page) re-derives it for real and corrects this.
  const completedScenarioIds = d.state.completed_scenarios;

  d.state = {
    ...d.state,
    ...computeState({
      consentCompleted,
      onboardingCompleted,
      pretestCompleted: !!d.assessmentResults.pretest,
      completedModuleIds,
      completedScenarioIds,
      posttestCompleted: !!d.assessmentResults.posttest,
      surveyCompleted: isAllQuestionnairesComplete(d.survey),
      certificateIssued: !!d.certificate,
    }),
  };
  saveData(d);
  return d;
}

// Clears every mock-related key, not just STORAGE_KEY/AUTH_KEY — also sweeps
// every usePersistedState form-draft key (all prefixed "flvr.draft.*"), so a
// logout leaves no stale draft data behind on any page.
export function resetMockData() {
  if (!isBrowser()) return;
  const keys = Object.keys(window.localStorage).filter((k) => k.startsWith("flvr."));
  keys.forEach((k) => window.localStorage.removeItem(k));
}

// -------- Helpers --------

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// -------- API (all client-side, simulate latency) --------

export async function getLearnerOverview(): Promise<MockData> {
  const d = loadData();
  const [results, surveyCompletion, moduleAndCert, completedScenarioIds] = await Promise.all([
    getAssessmentResults(),
    getQuestionnaireCompletion(),
    getModuleProgressAndCertificate(),
    getCompletedScenarioIds(),
  ]);
  d.assessmentResults = results;
  d.diagnostic = null;
  d.posttest = null;
  d.survey = surveyCompletion;
  d.certificate = moduleAndCert.certificate;
  d.state = {
    ...d.state,
    ...computeState({
      consentCompleted: d.state.consent_completed,
      onboardingCompleted: d.state.onboarding_completed,
      pretestCompleted: !!results.pretest,
      completedModuleIds: moduleAndCert.completedModuleIds,
      completedScenarioIds,
      posttestCompleted: !!results.posttest,
      surveyCompleted: isAllQuestionnairesComplete(surveyCompletion),
      certificateIssued: !!moduleAndCert.certificate,
    }),
  };
  saveData(d);
  return d;
}

export async function submitConsent(args: {
  data: {
    research_consent: boolean;
    microphone_permission: boolean;
    audio_recording_consent: boolean;
  };
}) {
  const { data } = args;
  if (!data.research_consent || !data.microphone_permission || !data.audio_recording_consent) {
    throw new Error("ต้องให้ความยินยอมทุกข้อจึงจะเริ่มโครงการวิจัยได้");
  }
  const d = loadData();
  d.consent = {
    document_version: CONSENT_DOC_VERSION,
    research_consent: data.research_consent,
    microphone_permission: data.microphone_permission,
    audio_recording_consent: data.audio_recording_consent,
    created_at: new Date().toISOString(),
  };
  d.state.consent_completed = true;
  d.state.current_stage = "onboarding";
  d.state.total_points += 50;
  recomputeLevel(d.state);
  saveData(d);
  await sleep(300);
  return { ok: true };
}

export async function submitOnboarding(args: {
  data: {
    display_name: string;
    university: string;
    faculty: string;
    department: string | null;
    teaching_experience_years: number;
  };
}) {
  const { data } = args;
  const d = loadData();
  d.profile = {
    ...(d.profile ?? {
      id: "mock-user-001",
      email: "lecturer.demo@university.ac.th",
      display_name: null,
      avatar_url: null,
      university: null,
      faculty: null,
      department: null,
      teaching_experience_years: null,
    }),
    display_name: data.display_name,
    university: data.university,
    faculty: data.faculty,
    department: data.department,
    teaching_experience_years: data.teaching_experience_years,
  };
  d.state.onboarding_completed = true;
  d.state.current_stage = "diagnostic";
  d.state.total_points += 50;
  recomputeLevel(d.state);
  saveData(d);
  await sleep(300);
  return { ok: true };
}

// Module completion and VR scenario completion are both real Firestore data
// now — modules.tsx writes moduleProgress directly via upsertUserDoc, and VR
// scenario completion is derived from sessions.stage4.completedAt (see
// getCompletedModuleIds/getCompletedScenarioIds above). Neither needs a
// function here anymore — same retirement submitSurvey already got.

// Survey submission now goes through submitQuestionnaireResponse
// (@/lib/questionnaires.functions) directly, bypassing this file — same
// split as the ranking assessment (submitRankingAssessment vs.
// getAssessmentResults here). This just handles the local-only
// points/level/stage bookkeeping submitSurvey used to do, called once after
// all questionnaires are submitted.
export async function markSurveyCompletionAwarded() {
  const d = loadData();
  if (d.state.current_stage === "survey") {
    d.state.current_stage = "certificate";
    d.state.total_points += 100;
    recomputeLevel(d.state);
    saveData(d);
  }
}
