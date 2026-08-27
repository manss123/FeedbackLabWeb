// Mock client-side store — NO backend. All state persisted in localStorage.
// Keeps the same export names as before so pages don't need major changes.

export const CONSENT_DOC_VERSION = "v1-2026";
export const POSTTEST_PASS_PERCENT = 80;

const STORAGE_KEY = "flvr.mock.v1";
const AUTH_KEY = "flvr.mock.auth.v1";

// -------- Types --------

export interface MockProfile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
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

export interface MockSurvey {
  satisfaction: number;
  usability: number;
  perceived_learning: number;
  recommendation: number;
  comments: string | null;
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

export interface MockData {
  profile: MockProfile | null;
  state: MockLearnerState;
  consent: MockConsent | null;
  posttest: MockPosttest | null;
  survey: MockSurvey | null;
  diagnostic: MockDiagnostic | null;
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
  window.localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
  // Initialize learner data if missing
  const existing = window.localStorage.getItem(STORAGE_KEY);
  if (!existing) saveData(emptyData(profileFromAuth(auth)));
}

// Reconciles the local mock after finding a real Firestore consent record on
// a device/browser where the mock never saw it happen (e.g. signed in
// elsewhere before). Without this, dashboard.tsx's own consent_completed
// check (mock-only) keeps sending the user back to /consent forever, while
// consent.tsx's real-Firestore check keeps sending them back to /dashboard —
// an infinite redirect loop between the two pages.
export function markConsentCompletedLocally() {
  const d = loadData();
  if (d.state.consent_completed) return;
  d.state.consent_completed = true;
  if (d.state.current_stage === "consent") d.state.current_stage = "onboarding";
  saveData(d);
}

// Same reconciliation as markConsentCompletedLocally, for onboarding.tsx's
// equivalent real-Firestore check (userDoc.profile) — see that function's
// comment for why this sync-before-navigate step is required.
export function markOnboardingCompletedLocally() {
  const d = loadData();
  if (d.state.onboarding_completed) return;
  d.state.onboarding_completed = true;
  if (d.state.current_stage === "onboarding") d.state.current_stage = "diagnostic";
  saveData(d);
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
  await sleep(150);
  return loadData();
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
      faculty: null,
      department: null,
      teaching_experience_years: null,
    }),
    display_name: data.display_name,
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

// ---- Diagnostic (Pretest) ----

export interface DiagnosticQuestion {
  id: string;
  dimension: "empathy" | "clarity" | "motivation" | "actionability";
  question: string;
  options: { label: string; score: number }[];
}

export const DIAGNOSTIC_QUESTIONS: DiagnosticQuestion[] = [
  {
    id: "d1",
    dimension: "empathy",
    question: "ก่อนให้ Feedback ท่านมักจะรับฟังความรู้สึกของนักศึกษาระดับใด",
    options: [
      { label: "แทบไม่เคย", score: 1 },
      { label: "บางครั้ง", score: 3 },
      { label: "เกือบทุกครั้ง", score: 5 },
    ],
  },
  {
    id: "d2",
    dimension: "empathy",
    question: "เมื่อนักศึกษาแสดงความอึดอัด ท่านตอบสนองอย่างไร",
    options: [
      { label: "ข้ามและอธิบายเนื้อหาต่อ", score: 1 },
      { label: "พักการสนทนาชั่วขณะ", score: 3 },
      { label: "สะท้อนความรู้สึกก่อนดำเนินการต่อ", score: 5 },
    ],
  },
  {
    id: "d3",
    dimension: "clarity",
    question: "โดยทั่วไปประโยค Feedback ของท่านมักอ้างอิงชิ้นงานตรงจุดหรือไม่",
    options: [
      { label: "พูดกว้าง ๆ", score: 1 },
      { label: "บางครั้งอ้างอิงส่วนที่ประทับใจ", score: 3 },
      { label: "อ้างอิงหน้า/บรรทัด/นาทีอย่างเจาะจง", score: 5 },
    ],
  },
  {
    id: "d4",
    dimension: "clarity",
    question: "ท่านตรวจสอบความเข้าใจของนักศึกษาหลังให้ Feedback อย่างไร",
    options: [
      { label: "ถามว่าเข้าใจไหม", score: 1 },
      { label: "ให้ลองสรุปประเด็นสั้น ๆ", score: 3 },
      { label: "ให้เล่าแผนการปรับปรุงกลับมา", score: 5 },
    ],
  },
  {
    id: "d5",
    dimension: "motivation",
    question: "ท่านเริ่ม Feedback ในแบบใดบ่อยที่สุด",
    options: [
      { label: "เริ่มจากข้อผิดพลาดสำคัญ", score: 1 },
      { label: "เริ่มจากข้อสังเกตทั่วไป", score: 3 },
      { label: "ยอมรับความพยายามและระบุจุดแข็ง", score: 5 },
    ],
  },
  {
    id: "d6",
    dimension: "motivation",
    question: "ท่านเชื่อมโยง Feedback กับเป้าหมายส่วนตัวของนักศึกษาบ่อยเพียงใด",
    options: [
      { label: "ไม่เคย", score: 1 },
      { label: "บางครั้ง", score: 3 },
      { label: "เกือบทุกครั้ง", score: 5 },
    ],
  },
  {
    id: "d7",
    dimension: "actionability",
    question: "Feedback ของท่านมักลงท้ายด้วยอะไร",
    options: [
      { label: "สรุปข้อผิดพลาด", score: 1 },
      { label: "คำแนะนำทั่วไป", score: 3 },
      { label: "ขั้นตอนปฏิบัติ + ตัวชี้วัดความสำเร็จ", score: 5 },
    ],
  },
  {
    id: "d8",
    dimension: "actionability",
    question: "ท่านมั่นใจในการวางแผนปรับปรุงงานร่วมกับนักศึกษาระดับใด",
    options: [
      { label: "ยังไม่มั่นใจ", score: 1 },
      { label: "พอทำได้", score: 3 },
      { label: "มั่นใจและมีเทคนิคของตนเอง", score: 5 },
    ],
  },
];

export async function submitDiagnostic(args: {
  data: { answers: { id: string; score: number }[] };
}) {
  const byId = new Map(DIAGNOSTIC_QUESTIONS.map((q) => [q.id, q]));
  const dims = { empathy: 0, clarity: 0, motivation: 0, actionability: 0 };
  const dimMax = { empathy: 0, clarity: 0, motivation: 0, actionability: 0 };
  for (const q of DIAGNOSTIC_QUESTIONS) dimMax[q.dimension] += 5;
  for (const a of args.data.answers) {
    const q = byId.get(a.id);
    if (q) dims[q.dimension] += a.score;
  }
  const norm = {
    empathy: Math.round((dims.empathy / (dimMax.empathy || 1)) * 25),
    clarity: Math.round((dims.clarity / (dimMax.clarity || 1)) * 25),
    motivation: Math.round((dims.motivation / (dimMax.motivation || 1)) * 25),
    actionability: Math.round((dims.actionability / (dimMax.actionability || 1)) * 25),
  };
  const total = norm.empathy + norm.clarity + norm.motivation + norm.actionability;

  const d = loadData();
  d.diagnostic = { ...norm, total, created_at: new Date().toISOString() };
  d.state.pretest_completed = true;
  if (d.state.current_stage === "diagnostic" || d.state.current_stage === "onboarding") {
    d.state.current_stage = "modules";
  }
  d.state.total_points += 100;
  recomputeLevel(d.state);
  saveData(d);
  await sleep(400);
  return { ...norm, total };
}

// ---- Modules ----

export async function completeModule(args: { data: { module_id: string } }) {
  const d = loadData();
  if (!d.state.completed_modules.includes(args.data.module_id)) {
    d.state.completed_modules.push(args.data.module_id);
    d.state.modules_completed = d.state.completed_modules.length;
    d.state.total_points += 100;
    if (d.state.modules_completed >= 5 && d.state.current_stage === "modules") {
      d.state.current_stage = "vr_simulation";
    }
    recomputeLevel(d.state);
    saveData(d);
  }
  await sleep(250);
  return { ok: true };
}

// ---- VR Scenarios ----

export async function completeVrScenario(args: {
  data: { scenario_id: string; mock_transcript?: string };
}) {
  const d = loadData();
  if (!d.state.completed_scenarios.includes(args.data.scenario_id)) {
    d.state.completed_scenarios.push(args.data.scenario_id);
    d.state.vr_scenarios_completed = d.state.completed_scenarios.length;
    d.state.total_points += 150;
    if (
      d.state.vr_scenarios_completed >= 5 &&
      d.state.current_stage === "vr_simulation"
    ) {
      d.state.current_stage = "posttest";
    }
    recomputeLevel(d.state);
    saveData(d);
  }
  await sleep(250);
  return { ok: true };
}

// ---- Posttest ----

export interface PosttestQuestion {
  id: string;
  dimension: "empathy" | "clarity" | "motivation" | "actionability";
  question: string;
  options: { label: string; score: number }[];
}

export const POSTTEST_QUESTIONS: PosttestQuestion[] = [
  {
    id: "q1",
    dimension: "empathy",
    question: "เมื่อให้ Feedback กับนักศึกษาที่ทำผิดพลาด ท่านจะ...",
    options: [
      { label: "ตำหนิและชี้ข้อผิดพลาดตรงไปตรงมา", score: 1 },
      { label: "ชี้ข้อผิดพลาดโดยไม่ใส่ความรู้สึก", score: 3 },
      { label: "รับฟังก่อน แล้วสะท้อนความรู้สึกและชี้แนะอย่างเห็นใจ", score: 5 },
    ],
  },
  {
    id: "q2",
    dimension: "empathy",
    question: "การเข้าใจสภาวะอารมณ์ของผู้เรียนมีผลต่อ Constructive Feedback อย่างไร",
    options: [
      { label: "ไม่จำเป็น เพราะเน้นเนื้อหาวิชาการ", score: 1 },
      { label: "ช่วยเลือกจังหวะที่เหมาะสม", score: 3 },
      { label: "เป็นรากฐานของการสื่อสารที่ปลอดภัยและได้ผล", score: 5 },
    ],
  },
  {
    id: "q3",
    dimension: "clarity",
    question: "ประโยค Feedback แบบใดชัดเจนที่สุด",
    options: [
      { label: "\"งานยังไม่ค่อยดี\"", score: 1 },
      { label: "\"เนื้อหายังขาดหลักฐานสนับสนุน\"", score: 3 },
      { label: "\"บทนำยังไม่มีคำถามวิจัย ควรเพิ่มในย่อหน้าที่ 2\"", score: 5 },
    ],
  },
  {
    id: "q4",
    dimension: "clarity",
    question: "ควรใช้ภาษาแบบใดให้ Feedback เข้าใจง่าย",
    options: [
      { label: "ศัพท์วิชาการล้วน", score: 1 },
      { label: "ผสมภาษาพูดและวิชาการ", score: 3 },
      { label: "รูปธรรม เจาะจง อ้างอิงชิ้นงานตรงจุด", score: 5 },
    ],
  },
  {
    id: "q5",
    dimension: "motivation",
    question: "ควรเริ่ม Feedback อย่างไรจึงกระตุ้นแรงจูงใจ",
    options: [
      { label: "เริ่มด้วยข้อผิดพลาดหลัก", score: 1 },
      { label: "เริ่มด้วยข้อดี", score: 3 },
      { label: "ยอมรับความพยายามและระบุจุดแข็งที่เจาะจง", score: 5 },
    ],
  },
  {
    id: "q6",
    dimension: "motivation",
    question: "การเชื่อม Feedback กับเป้าหมายของผู้เรียนทำหน้าที่อะไร",
    options: [
      { label: "ไม่จำเป็น", score: 1 },
      { label: "ช่วยให้จำได้นานขึ้น", score: 3 },
      { label: "สร้าง Ownership และ Growth Mindset", score: 5 },
    ],
  },
  {
    id: "q7",
    dimension: "actionability",
    question: "Feedback ที่นำไปปฏิบัติได้ต้องมีองค์ประกอบใด",
    options: [
      { label: "ระบุข้อผิดพลาด", score: 1 },
      { label: "ระบุข้อผิดพลาด + คำแนะนำทั่วไป", score: 3 },
      { label: "ระบุจุด + ขั้นตอนที่ทำได้ + ตัวชี้วัดความสำเร็จ", score: 5 },
    ],
  },
  {
    id: "q8",
    dimension: "actionability",
    question: "ท่านมั่นใจในการวางแผนการปรับปรุงงานร่วมกับนักศึกษาระดับใด",
    options: [
      { label: "ยังไม่มั่นใจ", score: 1 },
      { label: "พอทำได้", score: 3 },
      { label: "มั่นใจและมีเทคนิคของตนเอง", score: 5 },
    ],
  },
];

export async function submitPosttest(args: {
  data: { answers: { id: string; score: number }[] };
}) {
  const byId = new Map(POSTTEST_QUESTIONS.map((q) => [q.id, q]));
  const dims = { empathy: 0, clarity: 0, motivation: 0, actionability: 0 };
  const dimMax = { empathy: 0, clarity: 0, motivation: 0, actionability: 0 };
  for (const q of POSTTEST_QUESTIONS) dimMax[q.dimension] += 5;
  for (const a of args.data.answers) {
    const q = byId.get(a.id);
    if (q) dims[q.dimension] += a.score;
  }
  const norm = {
    empathy: Math.round((dims.empathy / (dimMax.empathy || 1)) * 25),
    clarity: Math.round((dims.clarity / (dimMax.clarity || 1)) * 25),
    motivation: Math.round((dims.motivation / (dimMax.motivation || 1)) * 25),
    actionability: Math.round((dims.actionability / (dimMax.actionability || 1)) * 25),
  };
  const total = norm.empathy + norm.clarity + norm.motivation + norm.actionability;
  const percentage = total;
  const passed = percentage >= POSTTEST_PASS_PERCENT;

  const d = loadData();
  d.posttest = {
    empathy_score: norm.empathy,
    clarity_score: norm.clarity,
    motivation_score: norm.motivation,
    actionability_score: norm.actionability,
    total_score: total,
    max_score: 100,
    percentage,
    passed,
    created_at: new Date().toISOString(),
  };
  d.state.posttest_completed = passed;
  if (passed) {
    d.state.current_stage = "survey";
    d.state.total_points += 200;
  }
  recomputeLevel(d.state);
  saveData(d);
  await sleep(400);
  return { passed, percentage, ...norm, total };
}

// ---- Survey ----

export async function submitSurvey(args: {
  data: {
    satisfaction: number;
    usability: number;
    perceived_learning: number;
    recommendation: number;
    comments: string | null;
  };
}) {
  const d = loadData();
  d.survey = { ...args.data, created_at: new Date().toISOString() };
  d.state.survey_completed = true;
  d.state.current_stage = "certificate";
  d.state.total_points += 100;
  recomputeLevel(d.state);
  saveData(d);
  await sleep(300);
  return { ok: true };
}
