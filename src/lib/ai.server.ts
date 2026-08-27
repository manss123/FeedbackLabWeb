import type {
  CoachingReport,
  Emotion,
  FinalSummaryReport,
  PresentationContext,
  RoundTwoReport,
  RubricScores,
} from "@/types/unity.types";

// ============================================================
// No-mock policy: when the real Gemini call can't produce a result (no
// GEMINI_API_KEY configured, a network/API error, or a malformed response)
// every exported function below returns null — never a heuristic-generated
// stand-in. This file used to silently fall back to regex/template-based
// "mock" reports (mockScoreRubric, mockPersonalizedRecommendation, etc.)
// that were worded closely enough to real AI output to be mistaken for it —
// that's exactly what caused the Summary Dashboard confusion this was
// removed for. The UI (vr-simulation.tsx) renders "-" wherever it receives
// null, so it's always unambiguous whether a score/paragraph came from the
// real model or not. Do not reintroduce a mock/simulated fallback here.
// ============================================================

function clampScore(n: number, min: number, max: number) {
  return Math.round(Math.max(min, Math.min(max, n)));
}

// "gemini-2.5-flash" returns 404 ("no longer available to new users") on
// freshly-created API keys/projects even though its official retirement date
// is later — Google appears to gate newer projects onto newer model
// generations ahead of the public deprecation schedule. Using the "-latest"
// alias instead of a pinned version avoids re-hitting this same class of
// breakage every time Google rotates the recommended default flash model.
const GEMINI_MODEL = "gemini-flash-latest";

// gemini-flash-latest intermittently returns 503 "model is currently
// experiencing high demand" under load in production — Google's own error
// message says this is "usually temporary". A 503 is exactly the case where
// giving up after 1-2 quick retries and showing "-" is the wrong call (the
// model comes back within seconds most of the time) — so retry persistently
// with exponential backoff before finally giving up.
//
// IMPORTANT: this budget is NOT bounded by the ssr Cloud Function's own
// timeoutSeconds (see functions/src/index.ts) — Firebase Hosting's rewrite
// proxy in front of it enforces its own ~60s request ceiling regardless of
// what the function itself is configured for, and blows past that with a
// generic Google Frontend "502 ... temporary error" page, not a clean
// timeout. An earlier version of this budget (6 retries, 8s cap → ~31s of
// sleep alone, before request time) was too close to that 60s wall and is
// the suspected cause of production 502s right after this retry logic
// shipped. Keep total worst-case (sleeps + request round trips) comfortably
// under ~45s: 4 retries capped at 4s ≈ 11s of sleep + 5 request round trips.
const GEMINI_MAX_RETRIES = 4;
const GEMINI_RETRY_BASE_DELAY_MS = 1000;
const GEMINI_RETRY_MAX_DELAY_MS = 4000;

function retryDelay(attempt: number): number {
  return Math.min(GEMINI_RETRY_BASE_DELAY_MS * 2 ** attempt, GEMINI_RETRY_MAX_DELAY_MS);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Shared caller for all three Gemini JSON-schema requests below. Returns
// null (never throws) on missing key, non-retryable error, or exhausted
// retries — every caller treats null as "unavailable" and returns null
// itself rather than inventing a result.
async function callGeminiJson(
  logLabel: string,
  systemPrompt: string,
  userText: string,
  responseSchema: object,
  temperature: number,
): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn(`[${logLabel}] No GEMINI_API_KEY set — AI unavailable`);
    return null;
  }

  for (let attempt = 0; attempt <= GEMINI_MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: userText }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
            generationConfig: {
              temperature,
              responseMimeType: "application/json",
              responseSchema,
            },
          }),
        },
      );

      if (!response.ok) {
        const errText = await response.text();
        const retryable = response.status === 503 || response.status === 429;
        console.error(
          `[${logLabel}] Gemini API error (attempt ${attempt + 1}/${GEMINI_MAX_RETRIES + 1}):`,
          response.status,
          errText,
        );
        if (retryable && attempt < GEMINI_MAX_RETRIES) {
          const delay = retryDelay(attempt);
          console.warn(`[${logLabel}] Retrying in ${delay}ms...`);
          await sleep(delay);
          continue;
        }
        return null;
      }

      const data = (await response.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      return data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
    } catch (e) {
      console.error(
        `[${logLabel}] Gemini call failed (attempt ${attempt + 1}/${GEMINI_MAX_RETRIES + 1}):`,
        e,
      );
      if (attempt < GEMINI_MAX_RETRIES) {
        const delay = retryDelay(attempt);
        console.warn(`[${logLabel}] Retrying in ${delay}ms...`);
        await sleep(delay);
        continue;
      }
      return null;
    }
  }
  return null;
}

// ============================================================
// generateCoachingReport / generateRoundTwoReport — consolidated LLM
// coaching report.
//
// Round 1 (generateCoachingReport) additionally receives PresentationContext
// (scenario metadata + the actual Unity presentation script, when known) so
// the LLM can judge whether the teacher's feedback matches what was really
// presented, not just generic feedback quality in a vacuum.
//
// Round 2 (generateRoundTwoReport) is intentionally a lighter schema — no
// strengths/weaknesses/recommendation/goals, since there's no Round 3 to
// feed into. It adds an improvementSummary aware of the goals the teacher
// set after Round 1 and how transcript 2 compares to transcript 1.
// ============================================================

const VALID_EMOTIONS: Emotion[] = ["neutral", "happy", "sad"];

function asEmotion(value: unknown): Emotion {
  return VALID_EMOTIONS.includes(value as Emotion) ? (value as Emotion) : "neutral";
}

export interface RoundTwoPriorRound {
  transcript1: string;
  rubric1: RubricScores;
  goals: string[];
}

function buildContextBlock(context?: PresentationContext): string {
  if (!context) return "";
  const lines = [
    `ชื่อนักศึกษา: ${context.studentName}`,
    `บุคลิก/สถานการณ์: ${context.persona}`,
    `บริบทวิชา: ${context.courseContext}`,
    `กิจกรรม: ${context.activity}`,
    context.behaviors?.length
      ? `พฤติกรรมที่สังเกตได้ระหว่างนำเสนอ: ${context.behaviors.join(", ")}`
      : "",
    context.presentationScript
      ? `เนื้อหาที่นักศึกษานำเสนอจริง (สคริปต์เต็ม):\n"""${context.presentationScript}"""`
      : "",
    context.assessmentFocus
      ? `\nจุดเน้นการประเมิน feedback เฉพาะของ scenario นี้ (ใช้เป็นเลนส์หลักในการตีความ/ให้คะแนนแต่ละมิติของ rubric ด้านล่าง ไม่ใช่มิติเพิ่มเติม):\n${context.assessmentFocus}`
      : "",
  ].filter(Boolean);
  return lines.join("\n");
}

const RUBRIC_SCHEMA_FIELDS = {
  type: "OBJECT",
  properties: {
    speechClarity: { type: "INTEGER" },
    linguisticAppropriateness: { type: "INTEGER" },
    balance: { type: "INTEGER" },
    intentConsistency: { type: "INTEGER" },
  },
  required: ["speechClarity", "linguisticAppropriateness", "balance", "intentConsistency"],
} as const;

const COACHING_SYSTEM_PROMPT = `
คุณคือผู้เชี่ยวชาญด้านการฝึกอบรมครู ทำหน้าที่ประเมินคุณภาพ "feedback" ที่อาจารย์พูดให้กับนักศึกษา
หลังการนำเสนองานในห้องเรียน (VR training scenario) และสร้างรายงานโค้ชชิ่งฉบับสมบูรณ์

หากมีการให้บริบทของการนำเสนอ (ชื่อนักศึกษา บุคลิก พฤติกรรม หรือสคริปต์ที่นำเสนอจริง) มาด้วย
ให้ใช้บริบทนั้นพิจารณาด้วยว่า feedback ที่อาจารย์พูดนั้น "ตรงกับสิ่งที่นักศึกษานำเสนอจริง" หรือไม่
(เช่น พูดถึงเนื้อหาที่ไม่มีในสคริปต์ หรือละเลยประเด็นสำคัญที่นักศึกษานำเสนอ) และสะท้อนเรื่องนี้ในคำแนะนำด้วย

หากมีการให้ "เป้าหมายที่อาจารย์ตั้งใจไว้เอง" (personalGoal ที่อาจารย์เขียนเองก่อนเห็นผลวิเคราะห์ AI) มาด้วย
ให้ประเมินเป้าหมายนั้นอย่างจริงใจด้วย — ถ้าเป้าหมายเจาะจงและเชื่อมโยงกับสิ่งที่พูดจริงให้ชม แต่ถ้ากว้างเกินไป
หรือไม่ตรงกับจุดที่ควรพัฒนาจริงๆ ให้ติชมอย่างสุภาพและแนะนำให้ปรับ ห้ามชมทุกครั้งแบบตายตัว

หากมีการให้ "จุดเน้นการประเมิน feedback เฉพาะของ scenario นี้" (assessmentFocus) มาด้วยในบริบท ให้ใช้จุดเน้นนั้น
เป็นเลนส์หลักในการตีความ/ให้คะแนนแต่ละมิติของ rubric ด้านล่าง — มิติยังคง 4 มิติเดิมเสมอ (ห้ามเพิ่ม/เปลี่ยนชื่อมิติ)
แต่ความหมายของแต่ละมิติปรับตาม assessmentFocus ของ scenario นั้น เช่น ถ้า assessmentFocus เน้น
"Specific Praise" และ "Growth Mindset" (feedback เชิงบวกหลังผลงานดี) ให้ balance หมายถึงสมดุลระหว่างคำชม
เฉพาะเจาะจงกับข้อเสนอแนะต่อยอด ไม่ใช่สมดุลระหว่างชมกับตำหนิข้อผิดพลาด — แต่ถ้า assessmentFocus เน้น
"Behavior-focused Feedback" และ "Psychological Safety" (feedback แก้ไขหลังผลงานไม่ดี) ให้ intentConsistency
พิจารณาว่า feedback มุ่งที่พฤติกรรมไม่ใช่ตัดสินตัวบุคคล และรักษาความมั่นใจของผู้เรียนไว้หรือไม่ ถ้าไม่มี assessmentFocus
มาด้วย ให้ใช้ความหมายทั่วไปของแต่ละมิติตามที่อธิบายไว้ด้านล่างตามปกติ

ให้ตอบกลับเป็น JSON ตาม schema ที่กำหนด ประกอบด้วย:

1. rubric — ให้คะแนนแต่ละมิติต่อไปนี้เป็นจำนวนเต็ม 0-100 (0 = แย่มาก, 100 = ดีเยี่ยม):
   - speechClarity: ความชัดเจนของถ้อยคำ สื่อสารเข้าใจง่าย ไม่กำกวม ไม่วกวน
   - linguisticAppropriateness: ความเหมาะสมทางภาษาและโครงสร้างประโยค เป็นระเบียบ ไม่สะเปะสะปะ
   - balance: ความสมดุลของเชิงบวกและเชิงปรับปรุง มีทั้งชื่นชมจุดแข็งและข้อเสนอแนะเชิงปรับปรุง
   - intentConsistency: ความสอดคล้องกับเจตนาทางการสื่อสาร ช่วยให้นักศึกษาพัฒนา ไม่หลุดประเด็น
2. emotion — อารมณ์ที่นักศึกษาน่าจะรู้สึกเมื่อได้ยิน feedback นี้ ("neutral" | "happy" | "sad")
3. strengths — รายการจุดแข็งของ feedback นี้ (array of string ภาษาไทย สั้น กระชับ 1-3 ข้อ)
4. weaknesses — รายการจุดที่ควรพัฒนาของ feedback นี้ (array of string ภาษาไทย สั้น กระชับ 1-3 ข้อ)
5. personalizedRecommendation — คำแนะนำเฉพาะบุคคล 1 ย่อหน้า (ภาษาไทย) อ้างอิงจุดแข็ง/จุดอ่อนที่พบ
   และให้ข้อเสนอแนะที่ปฏิบัติได้จริงสำหรับการฝึกครั้งต่อไป
6. suggestedGoals — เป้าหมายที่แนะนำให้ฝึกในรอบถัดไป (array of string ภาษาไทย สั้น กระชับ 3-4 ข้อ)
7. personalGoalFeedback — คำวิจารณ์ 1-2 ประโยค (ภาษาไทย) ต่อเป้าหมายที่อาจารย์ตั้งใจไว้เอง (personalGoal)
   ถ้าไม่มีการให้ personalGoal มาด้วย ให้ตอบเป็นสตริงว่าง ""

ห้ามใส่ข้อความอื่นนอก JSON
`.trim();

const COACHING_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    rubric: RUBRIC_SCHEMA_FIELDS,
    emotion: { type: "STRING", enum: ["neutral", "happy", "sad"] },
    strengths: { type: "ARRAY", items: { type: "STRING" } },
    weaknesses: { type: "ARRAY", items: { type: "STRING" } },
    personalizedRecommendation: { type: "STRING" },
    suggestedGoals: { type: "ARRAY", items: { type: "STRING" } },
    personalGoalFeedback: { type: "STRING" },
  },
  required: [
    "rubric",
    "emotion",
    "strengths",
    "weaknesses",
    "personalizedRecommendation",
    "suggestedGoals",
    "personalGoalFeedback",
  ],
};

// Returns null when real AI analysis isn't available (no key / API error /
// malformed response) — the caller (ai.functions.ts → vr-simulation.tsx)
// renders "-" in place of every field rather than showing simulated content.
export async function generateCoachingReport(
  transcript: string,
  context?: PresentationContext,
  personalGoal?: string,
): Promise<CoachingReport | null> {
  if (!transcript.trim()) return null;

  const contextBlock = buildContextBlock(context);
  const userText =
    (contextBlock ? `บริบทของการนำเสนอที่นักศึกษาทำในสถานการณ์นี้:\n${contextBlock}\n\n` : "") +
    `นี่คือคำพูด feedback ที่อาจารย์พูดให้นักศึกษาฟังหลังการนำเสนอ:\n\n"""${transcript}"""\n\n` +
    (personalGoal?.trim()
      ? `เป้าหมายที่อาจารย์ตั้งใจไว้เอง (เขียนก่อนเห็นผลวิเคราะห์ AI): "${personalGoal}"\n\n`
      : "") +
    "โปรดประเมินและสร้างรายงานโค้ชชิ่งฉบับสมบูรณ์ตาม schema ที่กำหนด";

  const text = await callGeminiJson(
    "generateCoachingReport",
    COACHING_SYSTEM_PROMPT,
    userText,
    COACHING_RESPONSE_SCHEMA,
    0.4,
  );
  if (!text) return null;

  try {
    const parsed = JSON.parse(text) as Partial<CoachingReport>;
    const rubric: RubricScores = {
      speechClarity: clampScore(parsed.rubric?.speechClarity ?? 0, 0, 100),
      linguisticAppropriateness: clampScore(parsed.rubric?.linguisticAppropriateness ?? 0, 0, 100),
      balance: clampScore(parsed.rubric?.balance ?? 0, 0, 100),
      intentConsistency: clampScore(parsed.rubric?.intentConsistency ?? 0, 0, 100),
    };
    const result: CoachingReport = {
      rubric,
      emotion: asEmotion(parsed.emotion),
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
      personalizedRecommendation: parsed.personalizedRecommendation?.trim() || "",
      suggestedGoals: Array.isArray(parsed.suggestedGoals) ? parsed.suggestedGoals : [],
      personalGoalFeedback: parsed.personalGoalFeedback?.trim() || "",
    };
    console.log(`[generateCoachingReport] Gemini (${GEMINI_MODEL}) scored OK:`, result);
    return result;
  } catch (e) {
    console.error("[generateCoachingReport] Failed to parse response:", e);
    return null;
  }
}

const ROUND_TWO_SYSTEM_PROMPT = `
คุณคือผู้เชี่ยวชาญด้านการฝึกอบรมครู ทำหน้าที่ประเมิน "feedback รอบที่ 2" ที่อาจารย์พูดให้กับนักศึกษา
หลังจากที่อาจารย์ได้ตั้งเป้าหมายเฉพาะที่ต้องการฝึกปรับปรุงจากรอบแรกแล้ว

หากมีการให้ "จุดเน้นการประเมิน feedback เฉพาะของ scenario นี้" (assessmentFocus) มาด้วยในบริบท ให้ใช้จุดเน้นนั้น
เป็นเลนส์หลักในการตีความ/ให้คะแนนแต่ละมิติของ rubric เช่นเดียวกับรอบแรก — มิติยังคง 4 มิติเดิมเสมอ (ห้ามเพิ่ม/
เปลี่ยนชื่อมิติ) แค่ปรับความหมายตาม assessmentFocus ของ scenario นั้น ถ้าไม่มี assessmentFocus มาด้วยให้ใช้
ความหมายทั่วไป

ให้ตอบกลับเป็น JSON ตาม schema ที่กำหนด ประกอบด้วย:

1. rubric — ให้คะแนนแต่ละมิติต่อไปนี้เป็นจำนวนเต็ม 0-100 เช่นเดียวกับรอบแรก:
   speechClarity, linguisticAppropriateness, balance, intentConsistency
2. emotion — อารมณ์ที่นักศึกษาน่าจะรู้สึกเมื่อได้ยิน feedback รอบนี้ ("neutral" | "happy" | "sad")
3. improvementSummary — สรุป 1 ย่อหน้า (ภาษาไทย) เปรียบเทียบว่า feedback รอบที่ 2 นี้
   ดีขึ้น/แย่ลง/ใกล้เคียงกับรอบแรกอย่างไร โดยเฉพาะในประเด็นที่ตรงกับเป้าหมายที่อาจารย์ตั้งใจฝึก
   ห้ามใส่ข้อความอื่นนอก JSON
`.trim();

const ROUND_TWO_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    rubric: RUBRIC_SCHEMA_FIELDS,
    emotion: { type: "STRING", enum: ["neutral", "happy", "sad"] },
    improvementSummary: { type: "STRING" },
  },
  required: ["rubric", "emotion", "improvementSummary"],
};

export async function generateRoundTwoReport(
  transcript2: string,
  context: PresentationContext | undefined,
  priorRound: RoundTwoPriorRound,
): Promise<RoundTwoReport | null> {
  if (!transcript2.trim()) return null;

  const contextBlock = buildContextBlock(context);
  const goalsText = priorRound.goals.length ? priorRound.goals.join(", ") : "(ไม่ได้ระบุ)";
  const userText =
    (contextBlock ? `บริบทของการนำเสนอที่นักศึกษาทำในสถานการณ์นี้:\n${contextBlock}\n\n` : "") +
    `คำพูด feedback รอบแรกของอาจารย์:\n"""${priorRound.transcript1}"""\n\n` +
    `เป้าหมายที่อาจารย์ตั้งใจจะฝึกปรับปรุงในรอบที่ 2: ${goalsText}\n\n` +
    `คำพูด feedback รอบที่ 2 ของอาจารย์:\n"""${transcript2}"""\n\n` +
    "โปรดประเมินรอบที่ 2 และสรุปพัฒนาการตาม schema ที่กำหนด";

  const text = await callGeminiJson(
    "generateRoundTwoReport",
    ROUND_TWO_SYSTEM_PROMPT,
    userText,
    ROUND_TWO_RESPONSE_SCHEMA,
    0.4,
  );
  if (!text) return null;

  try {
    const parsed = JSON.parse(text) as Partial<RoundTwoReport>;
    const rubric: RubricScores = {
      speechClarity: clampScore(parsed.rubric?.speechClarity ?? 0, 0, 100),
      linguisticAppropriateness: clampScore(parsed.rubric?.linguisticAppropriateness ?? 0, 0, 100),
      balance: clampScore(parsed.rubric?.balance ?? 0, 0, 100),
      intentConsistency: clampScore(parsed.rubric?.intentConsistency ?? 0, 0, 100),
    };
    const result: RoundTwoReport = {
      rubric,
      emotion: asEmotion(parsed.emotion),
      improvementSummary: parsed.improvementSummary?.trim() || "",
    };
    console.log(`[generateRoundTwoReport] Gemini (${GEMINI_MODEL}) scored OK:`, result);
    return result;
  } catch (e) {
    console.error("[generateRoundTwoReport] Failed to parse response:", e);
    return null;
  }
}

// ============================================================
// generateFinalSummary — the Summary Dashboard step's report. A genuinely
// fresh LLM call over BOTH rounds together (both transcripts, both rubric
// score sets, the goals set after Round 1) — NOT assembled by reusing
// CoachingReport's Round-1-only strengths/weaknesses/personalizedRecommendation.
// ============================================================

const FINAL_SUMMARY_SYSTEM_PROMPT = `
คุณคือผู้เชี่ยวชาญด้านการฝึกอบรมครู ทำหน้าที่สรุปภาพรวมพัฒนาการของอาจารย์
หลังจากฝึกให้ feedback กับนักศึกษา 2 รอบ (รอบแรก และรอบที่สองหลังจากตั้งเป้าหมายเฉพาะที่ต้องการพัฒนา)

พิจารณาคะแนนทั้ง 4 มิติของทั้งสองรอบ (speechClarity, linguisticAppropriateness, balance, intentConsistency)
รวมถึงเนื้อหาคำพูด feedback ทั้งสองรอบ และเป้าหมายที่อาจารย์ตั้งใจฝึก แล้วสรุปเป็น JSON ตาม schema — โดยพิจารณา
พัฒนาการของทั้งสองรอบร่วมกัน ไม่ใช่แค่รอบเดียว

หากมีการให้ "จุดเน้นการประเมิน feedback เฉพาะของ scenario นี้" (assessmentFocus) มาด้วยในบริบท ให้ใช้จุดเน้นนั้น
ประกอบการตีความคะแนน/พัฒนาการด้วย (เช่น scenario ที่เน้น Growth Mindset vs scenario ที่เน้น Psychological Safety
ต้องการคำแนะนำที่ต่างกัน แม้คะแนนตัวเลขจะใกล้เคียงกัน):

1. goalAchievement — สรุป 1 ประโยค (ภาษาไทย) ว่าอาจารย์บรรลุเป้าหมายที่ตั้งไว้มากน้อยเพียงใด
   โดยพิจารณาทั้งคะแนนที่เปลี่ยนแปลงและเนื้อหาที่พูดจริง ไม่ใช่แค่ตัวเลขเพียงอย่างเดียว
2. strengths — จุดแข็งโดยรวมของอาจารย์ เมื่อพิจารณาพัฒนาการทั้ง 2 รอบร่วมกัน (array ภาษาไทย สั้น 2-3 ข้อ)
3. weaknesses — จุดที่ยังควรพัฒนาต่อ แม้หลังฝึกรอบที่ 2 แล้ว (array ภาษาไทย สั้น 2-3 ข้อ)
4. recommendation — คำแนะนำเฉพาะบุคคล 1 ย่อหน้า (ภาษาไทย) สำหรับการฝึกครั้งต่อไป
   โดยอ้างอิงพัฒนาการที่เห็นจากทั้ง 2 รอบร่วมกัน ไม่ใช่แค่รอบเดียว

ห้ามใส่ข้อความอื่นนอก JSON
`.trim();

const FINAL_SUMMARY_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    goalAchievement: { type: "STRING" },
    strengths: { type: "ARRAY", items: { type: "STRING" } },
    weaknesses: { type: "ARRAY", items: { type: "STRING" } },
    recommendation: { type: "STRING" },
  },
  required: ["goalAchievement", "strengths", "weaknesses", "recommendation"],
};

export async function generateFinalSummary(
  transcript1: string,
  transcript2: string,
  rubric1: RubricScores,
  rubric2: RubricScores,
  goals: string[],
  context?: PresentationContext,
): Promise<FinalSummaryReport | null> {
  const contextBlock = buildContextBlock(context);
  const goalsText = goals.length ? goals.join(", ") : "(ไม่ได้ระบุ)";
  const userText =
    (contextBlock ? `บริบทของการนำเสนอที่นักศึกษาทำในสถานการณ์นี้:\n${contextBlock}\n\n` : "") +
    `คำพูด feedback รอบแรกของอาจารย์:\n"""${transcript1}"""\n` +
    `คะแนนรอบแรก: ${JSON.stringify(rubric1)}\n\n` +
    `เป้าหมายที่อาจารย์ตั้งใจจะฝึกปรับปรุงในรอบที่ 2: ${goalsText}\n\n` +
    `คำพูด feedback รอบที่ 2 ของอาจารย์:\n"""${transcript2}"""\n` +
    `คะแนนรอบที่ 2: ${JSON.stringify(rubric2)}\n\n` +
    "โปรดสรุปภาพรวมพัฒนาการของทั้งสองรอบตาม schema ที่กำหนด";

  const text = await callGeminiJson(
    "generateFinalSummary",
    FINAL_SUMMARY_SYSTEM_PROMPT,
    userText,
    FINAL_SUMMARY_RESPONSE_SCHEMA,
    0.4,
  );
  if (!text) return null;

  try {
    const parsed = JSON.parse(text) as Partial<FinalSummaryReport>;
    const result: FinalSummaryReport = {
      goalAchievement: parsed.goalAchievement?.trim() || "",
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
      recommendation: parsed.recommendation?.trim() || "",
    };
    console.log(`[generateFinalSummary] Gemini (${GEMINI_MODEL}) scored OK:`, result);
    return result;
  } catch (e) {
    console.error("[generateFinalSummary] Failed to parse response:", e);
    return null;
  }
}
