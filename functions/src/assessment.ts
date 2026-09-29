import keys from "./assessment-keys.json";
import { HttpsError } from "firebase-functions/v2/https";
import { Timestamp, type Firestore } from "firebase-admin/firestore";

export const ASSESSMENT_VERSION = "cfct-ranking-2026-09-v1";
type Phase = "pretest" | "posttest";
type Option = "A" | "B" | "C" | "D";
const options: Option[] = ["A", "B", "C", "D"];

export function scoreAssessment(input: unknown) {
  const data = input as {
    phase?: Phase;
    version?: string;
    answers?: { id: string; ranks: Record<Option, number> }[];
  };
  if (
    !data ||
    !["pretest", "posttest"].includes(data.phase ?? "") ||
    data.version !== ASSESSMENT_VERSION ||
    !Array.isArray(data.answers) ||
    data.answers.length !== 20
  ) {
    throw new HttpsError(
      "invalid-argument",
      "แบบทดสอบไม่ครบหรือเป็นเวอร์ชันเก่า กรุณาโหลดหน้าใหม่",
    );
  }
  const phase = data.phase as Phase;
  const seen = new Set<string>();
  const answers = data.answers
    .map((answer) => {
      if (
        !answer ||
        typeof answer.id !== "string" ||
        !/^(?:[1-9]|1[0-9]|20)$/.test(answer.id) ||
        seen.has(answer.id) ||
        !answer.ranks ||
        Object.keys(answer.ranks).sort().join("") !== "ABCD"
      ) {
        throw new HttpsError("invalid-argument", "กรุณาตอบให้ครบทั้ง 20 ข้อโดยไม่ซ้ำข้อ");
      }
      seen.add(answer.id);
      const values = options.map((o) => answer.ranks[o]);
      if (
        values.some((v) => !Number.isInteger(v) || v < 1 || v > 4) ||
        new Set(values).size !== 4
      ) {
        throw new HttpsError("invalid-argument", "แต่ละข้อต้องใช้อันดับ 1–4 ครบและไม่ซ้ำกัน");
      }
      const correct = (keys[phase] as Record<string, Record<Option, number>>)[answer.id];
      const optionScores = Object.fromEntries(
        options.map((o) => [o, 3 - Math.abs(correct[o] - answer.ranks[o])]),
      );
      return {
        id: answer.id,
        ranks: Object.fromEntries(options.map((o) => [o, answer.ranks[o]])),
        optionScores,
        score: Object.values(optionScores).reduce((a, b) => a + b, 0),
      };
    })
    .sort((a, b) => Number(a.id) - Number(b.id));
  const totalScore = answers.reduce((sum, a) => sum + a.score, 0);
  return {
    phase,
    version: ASSESSMENT_VERSION,
    answers,
    totalScore,
    maxScore: 240,
    percentage: Math.round((totalScore / 240) * 10000) / 100,
  };
}

export async function saveAssessment(db: Firestore, uid: string, input: unknown) {
  const scored = scoreAssessment(input);
  const userRef = db.collection("users").doc(uid);
  const attemptRef = userRef
    .collection("assessment_attempts")
    .doc(`${scored.version}_${scored.phase}`);
  return db.runTransaction(async (tx) => {
    const [existing, user] = await Promise.all([tx.get(attemptRef), tx.get(userRef)]);
    // Deterministic ID makes retries and concurrent tabs idempotent. Never overwrite research responses.
    if (existing.exists) return existing.data()!;
    if (!user.exists)
      throw new HttpsError("failed-precondition", "กรุณากรอกข้อมูลผู้เข้าร่วมก่อนทำแบบทดสอบ");
    if (scored.phase === "posttest") {
      const pre = await tx.get(
        userRef.collection("assessment_attempts").doc(`${scored.version}_pretest`),
      );
      if (!pre.exists)
        throw new HttpsError("failed-precondition", "กรุณาส่งแบบทดสอบก่อนเรียนชุดนี้ก่อน");
    }
    const result = { ...scored, userId: uid, submittedAt: Timestamp.now() };
    tx.create(attemptRef, result);
    // Include raw answers in the user snapshot so existing researcher JSON exports retain them.
    tx.update(userRef, { [`assessmentResults.${scored.phase}`]: result });
    return result;
  });
}
