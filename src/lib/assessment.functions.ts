import { httpsCallable } from "firebase/functions";
import { doc, getDocFromServer } from "firebase/firestore";
import { getDb, getFirebaseAuth, getFirebaseFunctions } from "./firebase";
import { waitForFirebaseUser } from "./firebase-auth";
import {
  ASSESSMENT_VERSION,
  type AssessmentAnswers,
  type AssessmentPhase,
  type AssessmentResult,
} from "./assessment";

export async function getAssessmentResults(): Promise<
  Partial<Record<AssessmentPhase, AssessmentResult>>
> {
  const user = await waitForFirebaseUser();
  if (!user) throw new Error("กรุณาเข้าสู่ระบบ");
  const snapshot = await getDocFromServer(doc(getDb(), "users", user.uid));
  if (getFirebaseAuth().currentUser?.uid !== user.uid)
    throw new Error("บัญชีผู้ใช้เปลี่ยนระหว่างโหลดข้อมูล กรุณาลองอีกครั้ง");
  const results = snapshot.data()?.assessmentResults ?? {};
  const current: Partial<Record<AssessmentPhase, AssessmentResult>> = {};
  for (const phase of ["pretest", "posttest"] as const) {
    const r = results[phase];
    if (r?.version === ASSESSMENT_VERSION)
      current[phase] = {
        ...r,
        submittedAt: r.submittedAt?.toDate?.().toISOString() ?? r.submittedAt,
      };
  }
  return current;
}

export async function submitRankingAssessment(phase: AssessmentPhase, answers: AssessmentAnswers) {
  const user = await waitForFirebaseUser();
  if (!user) throw new Error("กรุณาเข้าสู่ระบบ");
  const call = httpsCallable<unknown, AssessmentResult>(
    getFirebaseFunctions(),
    "submitRankingAssessment",
  );
  return (
    await call({
      phase,
      version: ASSESSMENT_VERSION,
      answers: Object.entries(answers).map(([id, ranks]) => ({ id, ranks })),
    })
  ).data;
}
