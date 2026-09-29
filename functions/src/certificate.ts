import { HttpsError } from "firebase-functions/v2/https";
import { Timestamp, type Firestore } from "firebase-admin/firestore";
import { ASSESSMENT_VERSION } from "./assessment";

// Keep in sync with src/lib/questionnaires.ts / modules.tsx / vr-simulation.tsx —
// functions/ is a separate TS project and can't import client-side content
// directly. Same constants index.ts's admin QA tool already keeps in sync.
const QUESTIONNAIRE_KEYS = ["lme", "sss", "srl", "ux"] as const;
const MODULE_IDS = ["m1", "m2", "m3", "m4", "m5"];
const SCENARIO_IDS = ["s1", "s2", "s3", "s4", "s5"];

export interface CertificateInfo {
  issuedAt: Timestamp;
  certificateId: string;
}

// The only place a certificate number is ever assigned — a learner can never
// write users/{uid}.certificate directly (see firestore.rules), so this
// transaction is the sole source of truth for both eligibility and
// numbering. Mirrors saveAssessment's split: server decides/scores, client
// only ever renders what already got written here.
export async function issueCertificate(db: Firestore, uid: string): Promise<CertificateInfo> {
  const userRef = db.collection("users").doc(uid);
  const sessionsQuery = db.collection("sessions").where("userId", "==", uid);

  return db.runTransaction(async (tx) => {
    const [userSnap, sessionsSnap] = await Promise.all([tx.get(userRef), tx.get(sessionsQuery)]);
    if (!userSnap.exists)
      throw new HttpsError("failed-precondition", "กรุณากรอกข้อมูลผู้เข้าร่วมก่อน");
    const user = userSnap.data()!;

    // Idempotent — a reload or a second automatic trigger must never
    // reassign a new number to someone who already has one.
    const existing = user.certificate as CertificateInfo | undefined;
    if (existing?.certificateId) return existing;

    const profile = user.profile ?? {};
    const consent = user.consent ?? {};
    const moduleProgress = (user.moduleProgress ?? {}) as Record<string, { completed?: boolean }>;
    const surveyCompleted = (user.survey?.completed ?? {}) as Record<string, boolean>;
    const completedScenarioIds = new Set<string>();
    sessionsSnap.docs.forEach((d) => {
      const data = d.data();
      if (data.stage4?.completedAt) completedScenarioIds.add(data.scenarioId);
    });

    const eligible =
      !!consent.researchConsent &&
      !!consent.microphonePermission &&
      !!consent.audioRecordingConsent &&
      !!profile.displayName?.trim() &&
      !!profile.university?.trim() &&
      !!profile.faculty?.trim() &&
      typeof profile.teachingExperienceYears === "number" &&
      user.assessmentResults?.pretest?.version === ASSESSMENT_VERSION &&
      user.assessmentResults?.posttest?.version === ASSESSMENT_VERSION &&
      MODULE_IDS.every((id) => moduleProgress[id]?.completed) &&
      SCENARIO_IDS.every((id) => completedScenarioIds.has(id)) &&
      QUESTIONNAIRE_KEYS.every((key) => surveyCompleted[key]);

    if (!eligible)
      throw new HttpsError("failed-precondition", "ยังทำไม่ครบทุกขั้นตอนสำหรับการออกใบรับรอง");

    const year = new Date().getFullYear();
    const counterRef = db.collection("counters").doc(`certificates_${year}`);
    const counterSnap = await tx.get(counterRef);
    const next = ((counterSnap.data()?.count as number | undefined) ?? 0) + 1;
    const certificateId = `LI-MU-${year}-${String(next).padStart(4, "0")}`;
    const certificate: CertificateInfo = { issuedAt: Timestamp.now(), certificateId };

    tx.set(counterRef, { count: next }, { merge: true });
    tx.update(userRef, { certificate });
    return certificate;
  });
}
