import type { Timestamp } from "firebase/firestore";

// Milestone-level audit trail — deliberately NOT fine-grained UI telemetry
// (no page-views/clicks). See activity_log rules in firestore.rules (create +
// own-read only, no update/delete — an event, once logged, is immutable) and
// src/lib/activity.ts's logActivity() for the write path.
export type ActivityEventType =
  | "signed_in"
  | "consent_given"
  | "onboarding_completed"
  | "diagnostic_submitted"
  | "module_started"
  | "module_completed"
  | "vr_scenario_started"
  | "vr_scenario_round1_completed"
  | "vr_scenario_retried"
  | "vr_scenario_completed"
  | "posttest_submitted"
  | "survey_submitted"
  | "certificate_issued";

interface ModuleActivityPayload {
  type: "module_started" | "module_completed";
  moduleId: string;
}

interface ScenarioActivityPayload {
  type:
    | "vr_scenario_started"
    | "vr_scenario_round1_completed"
    | "vr_scenario_retried"
    | "vr_scenario_completed";
  scenarioId: string;
  sessionId?: string;
}

interface GenericActivityPayload {
  type:
    | "signed_in"
    | "consent_given"
    | "onboarding_completed"
    | "diagnostic_submitted"
    | "posttest_submitted"
    | "survey_submitted"
    | "certificate_issued";
}

// What a caller passes to logActivity() — userId/createdAt are filled in
// there, not by the call site.
export type ActivityPayload =
  ModuleActivityPayload | ScenarioActivityPayload | GenericActivityPayload;

// Thai labels for the admin UI — shared by the per-user activity timeline
// (admin/$userId.tsx) and the cross-user Activity Log tab (admin/index.tsx)
// so the two views never drift apart.
export const ACTIVITY_EVENT_LABELS: Record<ActivityEventType, string> = {
  signed_in: "เข้าสู่ระบบ",
  consent_given: "ให้ความยินยอมเข้าร่วมโครงการ",
  onboarding_completed: "กรอกข้อมูลพื้นฐานเสร็จสิ้น",
  diagnostic_submitted: "ส่งแบบทดสอบวินิจฉัย",
  module_started: "เริ่มบทเรียน",
  module_completed: "เรียนบทเรียนจบ",
  vr_scenario_started: "เริ่ม VR Scenario",
  vr_scenario_round1_completed: "ให้ Feedback รอบที่ 1 เสร็จสิ้น",
  vr_scenario_retried: "ฝึกให้ Feedback รอบที่ 2 ซ้ำ",
  vr_scenario_completed: "จบ VR Scenario",
  posttest_submitted: "ส่งแบบทดสอบหลังเรียน",
  survey_submitted: "ส่งแบบสำรวจ",
  certificate_issued: "ได้รับใบรับรอง",
};

// The persisted/read shape — what comes back out of Firestore (or, via the
// admin Cloud Function, with createdAt already serialized to an ISO string;
// see AdminActivityRow in src/lib/admin.functions.ts for that variant).
export type ActivityEvent = ActivityPayload & {
  userId: string;
  createdAt: Timestamp;
};
