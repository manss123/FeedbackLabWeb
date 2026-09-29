import {
  doc,
  getDoc,
  getDocFromServer,
  serverTimestamp,
  writeBatch,
  type Timestamp,
} from "firebase/firestore";
import { getDb, getFirebaseAuth } from "./firebase";
import { waitForFirebaseUser } from "./firebase-auth";
import {
  QUESTIONNAIRES,
  QUESTIONNAIRES_VERSION,
  scoreQuestionnaire,
  type QuestionnaireDef,
  type QuestionnaireKey,
  type QuestionnaireResult,
} from "./questionnaires";

// Direct client Firestore writes, unlike submitRankingAssessment — these are
// self-report Likert scales with no hidden answer key to protect, so there's
// nothing a Cloud Function needs to guard that Security Rules can't already
// enforce (own-uid, create-only).

export async function getQuestionnaireCompletion(): Promise<
  Partial<Record<QuestionnaireKey, boolean>>
> {
  const user = await waitForFirebaseUser();
  if (!user) return {};
  const snapshot = await getDocFromServer(doc(getDb(), "users", user.uid));
  if (getFirebaseAuth().currentUser?.uid !== user.uid)
    throw new Error("บัญชีผู้ใช้เปลี่ยนระหว่างโหลดข้อมูล กรุณาลองอีกครั้ง");
  return snapshot.data()?.survey?.completed ?? {};
}

// Scored results (not just the completion mirror) for the results dashboard
// (certificate.tsx) — reads whichever of the 4 questionnaire_responses docs
// already exist, so it works correctly on a partially-completed survey too.
export async function getQuestionnaireResults(): Promise<
  Partial<Record<QuestionnaireKey, QuestionnaireResult>>
> {
  const user = await waitForFirebaseUser();
  if (!user) return {};
  const results: Partial<Record<QuestionnaireKey, QuestionnaireResult>> = {};
  await Promise.all(
    QUESTIONNAIRES.map(async (def) => {
      const snap = await getDoc(
        doc(
          getDb(),
          "users",
          user.uid,
          "questionnaire_responses",
          `${QUESTIONNAIRES_VERSION}_${def.key}`,
        ),
      );
      if (!snap.exists()) return;
      const data = snap.data() as {
        overallMean: number;
        dimensionMeans: Record<string, number>;
        answers: Record<string, number>;
        submittedAt: Timestamp;
      };
      results[def.key] = {
        key: def.key,
        version: QUESTIONNAIRES_VERSION,
        submittedAt: data.submittedAt?.toDate().toISOString() ?? "",
        overallMean: data.overallMean,
        dimensionMeans: data.dimensionMeans,
        answers: data.answers,
      };
    }),
  );
  return results;
}

// Idempotent — safe to call again on a retried/partial submit (e.g. the 2nd
// of 3 questionnaires failed last time): checks for an existing response
// before writing, mirroring saveAssessment's "never overwrite research
// responses" behavior server-side, just enforced client-side here since
// there's no scoring secret this needs a Cloud Function to hide.
export async function submitQuestionnaireResponse(
  def: QuestionnaireDef,
  answers: Record<string, number>,
): Promise<void> {
  const user = await waitForFirebaseUser();
  if (!user) throw new Error("กรุณาเข้าสู่ระบบ");

  const responseRef = doc(
    getDb(),
    "users",
    user.uid,
    "questionnaire_responses",
    `${QUESTIONNAIRES_VERSION}_${def.key}`,
  );
  const existing = await getDoc(responseRef);
  if (existing.exists()) return;

  const result = scoreQuestionnaire(def, answers);
  const batch = writeBatch(getDb());
  batch.set(responseRef, {
    userId: user.uid,
    key: result.key,
    version: result.version,
    dimensionMeans: result.dimensionMeans,
    overallMean: result.overallMean,
    answers: result.answers,
    submittedAt: serverTimestamp(),
  });
  // Lightweight completion mirror on the user doc, same purpose as
  // assessmentResults mirroring pretest/posttest — lets routing/gating
  // checks (getLearnerOverview) avoid reading the subcollection every time.
  batch.update(doc(getDb(), "users", user.uid), {
    [`survey.completed.${def.key}`]: true,
  });
  await batch.commit();
}
