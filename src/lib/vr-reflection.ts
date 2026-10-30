// Research instruments: Scenario 1 Self Reflection and AI V2; Scenarios 2–5,
// supplied 2026-10-27. Keep item order stable within this version.
export const REFLECTION_VERSION = "2026-10-27-text-v2";
export interface ReflectionCriterion {
  id: string;
  dimension: string;
  statement: string;
  indicators: string;
  evidence: "text" | "partial";
}
export interface ReflectionAnalysis {
  criterionId: string;
  score: number | null;
  evidence: string;
  limitation: string;
}
type Item = [string, string, string, ReflectionCriterion["evidence"]?];
function items(scenario: string, rows: Item[]): ReflectionCriterion[] {
  return rows.map(([dimension, statement, indicators, evidence = "text"], i) => ({
    id: `${scenario}-${(scenario === "s1" || scenario === "s3") && i >= 5 ? i + 2 : i + 1}`,
    dimension,
    statement,
    indicators,
    evidence,
  }));
}
export const REFLECTION_CRITERIA: Record<string, ReflectionCriterion[]> = {
  s1: items("s1", [
    [
      "Positive Opening & Closing",
      "ฉันเริ่มต้น Feedback ด้วยการกล่าวถึงจุดแข็งหรือสิ่งที่นักศึกษาทำได้ดี และลงท้ายด้วยข้อความที่ให้กำลังใจหรือส่งเสริมการพัฒนา",
      "Positive Opening: ระบุจุดแข็ง/สิ่งที่ทำได้ดีช่วงต้น; Positive Closing: encouragement/development-oriented closing",
    ],
    [
      "Specific Improvement",
      "ฉันระบุประเด็นที่นักศึกษาควรพัฒนาได้อย่างชัดเจนและเฉพาะเจาะจง",
      "Specific improvement point พร้อมหลักฐาน/ตัวอย่างที่ชี้ว่าควรปรับอะไร",
    ],
    [
      "Actionable Suggestion",
      "ฉันเสนอแนวทางที่ชัดเจนและสามารถนำไปปฏิบัติได้ เพื่อให้นักศึกษาปรับปรุงการนำเสนอครั้งต่อไป",
      "Action suggestion ที่ actionable และ specific",
    ],
    [
      "Feedback Structure",
      "Feedback ของฉันมีลำดับที่ชัดเจน โดยช่วยให้นักศึกษาเข้าใจว่าทำอะไรได้ดี → ควรพัฒนาอะไร → ควรทำอย่างไรต่อไป",
      "Sequence: Strength → Improvement → Action และความต่อเนื่องของ Feedback",
    ],
    [
      "Conciseness & Relevance",
      "Feedback ของฉันกระชับ ตรงประเด็น และไม่มีข้อความที่ซ้ำหรือไม่จำเป็น",
      "Word count + Sentence length + Redundancy + Off-topic content",
    ],
    [
      "Clarity for the Recipient",
      "หากฉันเป็นนักศึกษาที่ได้รับ Feedback นี้ ฉันจะเข้าใจอย่างชัดเจนว่าฉันทำอะไรได้ดี ควรปรับปรุงอะไร และควรทำอะไรต่อไป",
      "ครบ 3 components: Specific Strength + Specific Improvement + Action Suggestion",
    ],
    [
      "Supportive & Respectful Language",
      "Feedback ของฉันใช้ภาษาที่สุภาพ ให้เกียรติ และสนับสนุนการพัฒนา โดยไม่ทำให้นักศึกษารู้สึกถูกตำหนิหรือด้อยคุณค่า",
      "Respectful language + Encouragement + Constructive wording; Negative/judgmental language detection",
    ],
  ]),
  s2: items("s2", [
    [
      "Specific Praise",
      "ฉันกล่าวชื่นชมโดยระบุจุดแข็งหรือสิ่งที่นักศึกษาทำได้ดีอย่างเฉพาะเจาะจง แทนการกล่าวชมแบบกว้าง ๆ",
      "Specific strength/praise linked to observable performance; distinguish generic praise เช่น ดีมาก/เยี่ยมมาก",
    ],
    [
      "Explanation of Strength",
      "ฉันอธิบายได้ว่าเหตุใดสิ่งที่นักศึกษาทำจึงเป็นจุดแข็งหรือส่งผลดีต่อการนำเสนอ",
      "Strength + Reason/Impact เช่น ใช้ตัวอย่างจริง → ช่วยให้ผู้ฟังเข้าใจ Design Thinking ง่ายขึ้น",
    ],
    [
      "Recognition of Improvement",
      "ฉันแสดงให้นักศึกษาเห็นว่าความพยายามหรือการปรับปรุงของเขานำไปสู่พัฒนาการที่ดีขึ้นอย่างไร",
      "Effort, improvement, progress โดยเฉพาะการเชื่อมโยงกับ previous feedback",
    ],
    [
      "Future-Oriented Development",
      "ฉันเสนอแนวทางที่ช่วยให้นักศึกษาเห็นว่าสามารถต่อยอดจากความสำเร็จครั้งนี้อย่างไร",
      "Future-oriented actionable suggestion framed as extension/growth rather than correction",
    ],
    [
      "Balance of Praise and Development",
      "Feedback ของฉันมีความสมดุลระหว่างการชื่นชมความสำเร็จและการเสนอแนวทางสำหรับการพัฒนาต่อ",
      "Balance/sequence Praise → Development; ข้อเสนอแนะไม่กลบหรือลดทอนคำชม",
    ],
    [
      "Growth Mindset Communication",
      "ฉันใช้ภาษาที่เชื่อมโยงความสำเร็จกับความพยายาม การเรียนรู้ และศักยภาพในการพัฒนาต่อไป",
      "Effort/process-oriented + potential/growth language; flag fixed-person praise หรือ purely evaluative praise",
    ],
    [
      "Clarity for the Recipient",
      "หากฉันเป็นนักศึกษา ฉันจะเข้าใจอย่างชัดเจนว่าฉันทำอะไรได้ดี เหตุใดจึงทำได้ดี และควรต่อยอดอย่างไร",
      "Specific Strength + Why/Impact + Future Action",
    ],
    [
      "Supportive & Motivating Language",
      "Feedback ของฉันใช้ภาษาที่สุภาพ ให้เกียรติ และสร้างแรงจูงใจ โดยยังคงคุณค่าของความสำเร็จที่นักศึกษาได้รับ",
      "Respectful + encouraging + supportive language; ตรวจคำที่ลดทอนความสำเร็จโดยไม่จำเป็น",
    ],
  ]),
  s3: items("s3", [
    [
      "Psychological Safety",
      "ฉันเริ่มต้น Feedback ด้วยถ้อยคำที่ช่วยสร้างความรู้สึกปลอดภัยและทำให้นักศึกษาพร้อมรับข้อเสนอแนะ",
      "Supportive opening, acknowledgment of effort, non-threatening/non-judgmental opening; absence of immediate harsh criticism",
    ],
    [
      "Recognition of Existing Strengths",
      "ฉันกล่าวถึงจุดแข็งหรือความพยายามที่สังเกตได้จริงของนักศึกษาก่อนกล่าวถึงสิ่งที่ควรปรับปรุง",
      "Specific strength/effort acknowledgment based on observable performance ก่อน corrective content",
    ],
    [
      "Behavior-Focused Feedback",
      "ฉันอธิบายสิ่งที่ควรปรับปรุงโดยมุ่งเน้นที่พฤติกรรมหรือผลงานที่สังเกตได้ มากกว่าการตัดสินตัวนักศึกษา",
      "Observable behavior statements vs person-focused/judgmental statements",
    ],
    [
      "Respectful & Non-Judgmental Language",
      "ฉันใช้ถ้อยคำที่สุภาพ ให้เกียรติ และหลีกเลี่ยงการตำหนิ กล่าวโทษ หรือตัดสินนักศึกษา",
      "Respectful/descriptive language; blame, judgmental/negative labels, harsh criticism",
    ],
    [
      "Specific & Actionable Correction",
      "ฉันระบุสิ่งที่ควรปรับปรุงอย่างชัดเจน พร้อมเสนอแนวทางที่นักศึกษาสามารถนำไปปฏิบัติได้จริง",
      "Specific improvement point + corresponding actionable suggestion",
    ],
    [
      "Clarity for the Recipient",
      "หากฉันเป็นนักศึกษา ฉันจะเข้าใจอย่างชัดเจนว่าฉันทำอะไรได้ดี อะไรควรปรับปรุง และควรทำอย่างไรต่อไป",
      "Strength + Observable Improvement Point + Actionable Next Step",
    ],
    [
      "Encouragement for Future Improvement",
      "ฉันปิดท้าย Feedback ด้วยถ้อยคำที่แสดงความเชื่อมั่นว่านักศึกษาสามารถเรียนรู้และพัฒนาต่อไปได้",
      "Future-oriented encouragement, confidence-building language, growth-oriented closing",
    ],
  ]),
  s4: items("s4", [
    [
      "Emotion Recognition",
      "ฉันรับรู้อารมณ์และความกังวลของผู้เรียนก่อนที่จะเริ่มอธิบายหรือให้ข้อเสนอแนะ",
      "Emotion acknowledgement before explanation/correction; timing relative to feedback",
    ],
    [
      "Empathy & Validation",
      "ฉันใช้ถ้อยคำที่แสดงว่าได้รับฟังและเข้าใจมุมมองหรือความรู้สึกของผู้เรียน โดยไม่ลดทอนหรือตัดสินความรู้สึกนั้น",
      "Empathic/validating language; flag minimizing/dismissive phrases เช่น อย่าคิดมาก, ไม่ได้แย่ขนาดนั้น",
    ],
    [
      "Active Listening & Perspective Exploration",
      "ฉันเปิดพื้นที่ให้ผู้เรียนอธิบายมุมมองของตนเอง และรับฟังก่อนที่จะอธิบายหรือปกป้องการประเมินของฉัน",
      "Open questions + invitation to elaborate; flag immediate explanation, argument, premature correction in the text",
      "partial",
    ],
    [
      "De-escalation & Emotional Regulation",
      "เมื่อผู้เรียนไม่เห็นด้วยหรือมีท่าทีปกป้องตนเอง ฉันยังคงตอบสนองอย่างสงบและหลีกเลี่ยงการโต้แย้ง ใช้อำนาจ หรือเปรียบเทียบกับผู้อื่น",
      "Defensive/argumentative/authority-based/comparison language in the text",
      "partial",
    ],
    [
      "Readiness & Timing of Feedback",
      "ฉันให้ Constructive Feedback เมื่อผู้เรียนมีความพร้อมที่จะรับฟัง แทนที่จะรีบให้คำแนะนำในขณะที่ผู้เรียนยังอยู่ในภาวะอารมณ์",
      "Timing of corrective feedback relative to emotion acknowledgement, perspective exploration and learner readiness cues",
      "partial",
    ],
    [
      "Specific & Actionable Feedback",
      "เมื่อผู้เรียนพร้อมรับ Feedback แล้ว ฉันให้ข้อเสนอแนะที่เฉพาะเจาะจง เชื่อมโยงกับผลงาน และมีแนวทางที่สามารถนำไปปฏิบัติได้",
      "Observable performance + evidence + specific improvement + actionable next step",
    ],
    [
      "Learner Agency & Reflection",
      "ฉันเปิดโอกาสให้ผู้เรียนคิด ตีความ Feedback และระบุแนวทางหรือขั้นตอนในการพัฒนาด้วยตนเอง",
      "Reflective/open question + learner choice/agency + invitation to identify next step rather than teacher prescribing everything",
    ],
    [
      "Psychological Safety & Supportive Language",
      "ฉันใช้ถ้อยคำที่ช่วยรักษาความปลอดภัยทางจิตใจตลอดการสนทนา",
      "Respectful/supportive language; pressuring/judgmental wording",
      "partial",
    ],
    [
      "Learning Transition",
      "ฉันช่วยให้บทสนทนาค่อย ๆ เปลี่ยนจากการรับมือกับอารมณ์ ไปสู่การทำความเข้าใจ Feedback และการวางแผนพัฒนา",
      "Conversational progression: Emotion → Heard/Validated → Readiness → Feedback → Reflection/Next Step",
      "partial",
    ],
    [
      "Confidence Restoration & Future Direction",
      "เมื่อจบบทสนทนา ฉันช่วยยืนยันสิ่งที่ผู้เรียนเข้าใจ พร้อมสนับสนุนให้ผู้เรียนเห็นแนวทางที่ตนเองสามารถพัฒนาต่อได้",
      "Confirmation + realistic encouragement + clear next step + learner ownership; avoid false reassurance",
      "partial",
    ],
  ]),
  s5: items("s5", [
    [
      "Progress Recognition",
      "ฉันระบุอย่างชัดเจนว่า Lina พัฒนาอะไรขึ้นจาก Version ก่อนหน้า",
      "Explicit improvement/change เช่น Objective ชัดขึ้น หรือ Activity เชื่อมโยงกับ Objective มากขึ้น",
    ],
    [
      "Evidence-Based Feedback",
      "ฉันใช้ Evidence จากผลงานของ Lina เพื่ออธิบายว่าความก้าวหน้าเกิดขึ้นตรงไหนและอย่างไร",
      "Specific observable evidence from Version 1 vs Version 2 rather than generic praise เช่น ดีขึ้นมาก",
    ],
    [
      "Remaining Gap & Specificity",
      "ฉันระบุประเด็นที่ยังต้องพัฒนาอย่างเฉพาะเจาะจง โดยเชื่อมโยงกับผลงานปัจจุบันของ Lina",
      "Specific remaining gap; distinguish Assessment ยังไม่ดี from explicit Objective–Assessment misalignment",
    ],
    [
      "Prioritization",
      "ฉันช่วยให้ Lina เห็นอย่างชัดเจนว่าอะไรคือประเด็นสำคัญที่ควรพัฒนาเป็นลำดับต่อไป โดยไม่ให้ Feedback หลายเรื่องพร้อมกันเกินไป",
      "One meaningful priority, number of development points, information load; Assessment Alignment as next priority",
    ],
    [
      "Actionability & Next-Step Orientation",
      "ฉันให้แนวทางที่ชัดเจนว่า Lina สามารถเริ่มพัฒนางานต่อจากตรงไหนและทำอะไรเป็นขั้นตอนต่อไป",
      "Clear first step/action; answers What should I work on next?",
    ],
    [
      "Learner Agency",
      "ฉันช่วยให้ Lina คิดและตัดสินใจเกี่ยวกับแนวทางพัฒนาด้วยตนเอง แทนที่จะให้ Solution สำเร็จรูปทั้งหมด",
      "Open/reflection questions, invitations to think/choose vs instructor-prescribed complete solution",
    ],
    [
      "Growth-Oriented Language",
      "ฉันใช้ภาษาที่สื่อว่าผลงานสามารถพัฒนาต่อได้ โดยมุ่งที่การพัฒนา Performance มากกว่าการตัดสินความสามารถของ Lina",
      "Growth/development-oriented language; flag fixed-ability, labeling, judgmental or person-focused language",
    ],
    [
      "Supportive Communication",
      "ฉันใช้ถ้อยคำที่ช่วยสนับสนุนให้ Lina พร้อมพัฒนางานต่อ",
      "Supportive/Respectful Language + Judgmental Language",
      "partial",
    ],
    [
      "Continuous Improvement Orientation",
      "Feedback ของฉันเชื่อมโยงสิ่งที่ Lina พัฒนาแล้วกับสิ่งที่ควรพัฒนาต่อ และเปิดโอกาสให้เธอเป็นเจ้าของก้าวต่อไปของตนเอง",
      "Progress → Evidence → Remaining Gap → Priority → Next Step → Learner Agency",
    ],
  ]),
};

export const POST_AI_QUESTIONS: Record<string, string[]> = {
  s1: [
    "หลังเปรียบเทียบการสะท้อนคิดของตนเองกับผลวิเคราะห์ AI คุณจะปรับเปลี่ยน Feedback ของคุณอย่างไร?",
  ],
  s2: [
    "หลังเปรียบเทียบการสะท้อนคิดของตนเองกับผลวิเคราะห์ AI คุณจะปรับ Feedback ด้านใดหนึ่งด้าน เพื่อสนับสนุนการเติบโตต่อไปของปาล์มให้ดียิ่งขึ้น?",
  ],
  s3: [
    "หลังเปรียบเทียบการสะท้อนคิดของตนเองกับผลวิเคราะห์ AI ระบุข้อความหนึ่งใน Feedback ที่คุณจะเรียบเรียงใหม่ คุณจะปรับอย่างไรให้มุ่งที่พฤติกรรมที่สังเกตได้ของนักศึกษา พร้อมคงการให้กำลังใจไว้?",
  ],
  s4: [
    "ผลวิเคราะห์ AI ส่วนใดแตกต่างจากการสะท้อนคิดของคุณมากที่สุด? หลักฐานใดจากบทสนทนาอาจอธิบายความแตกต่างนี้?",
    "เมื่อย้อนมองบทสนทนา ระบุช่วงหนึ่งที่คุณอาจรับฟังหรือสำรวจมุมมองของผู้เรียนเพิ่มเติมก่อนให้ Feedback คุณจะพูดต่างจากเดิมอย่างไร?",
  ],
  s5: [
    "ผลวิเคราะห์ AI ส่วนใดแตกต่างจากการสะท้อนคิดของคุณมากที่สุด? หลักฐานใดจาก Feedback ของคุณอาจอธิบายความแตกต่างนี้?",
    "เมื่อย้อนมอง Feedback ระบุส่วนหนึ่งที่คุณอาจเชื่อมโยงความก้าวหน้าของ Lina กับก้าวต่อไปได้ดีขึ้น พร้อมให้เธอยังคงเป็นเจ้าของกระบวนการพัฒนา คุณจะพูดต่างจากเดิมอย่างไร?",
  ],
};

export function reflectionContext(scenarioId?: string): string {
  const criteria = REFLECTION_CRITERIA[scenarioId ?? ""];
  if (!criteria) return "";
  return (
    `เกณฑ์ Self–AI รายข้อ เวอร์ชัน ${REFLECTION_VERSION} (แยกจาก rubric รวม 4 มิติ; ใช้เกณฑ์และข้อจำกัดล่าสุดนี้เป็นหลักหากรายละเอียดเกณฑ์เดิมใน assessmentFocus ขัดแย้งกัน):\n` +
    criteria
      .map(
        (c) =>
          `${c.id}. ${c.dimension}\nSelf: ${c.statement}\nAI indicators: ${c.indicators}\nEvidence scope: ${c.evidence}`,
      )
      .join("\n\n") +
    "\nมีเพียง transcript ของอาจารย์ ไม่มีไฟล์เสียง timestamps รายคำ หรือบทสนทนาโต้ตอบจริง ห้ามอนุมาน speech rate, pause, voice clarity, prosody, การขัดจังหวะ หรือยืนยันความพร้อม/ความรู้สึกจริงของนักศึกษา จากเครื่องหมายวรรคตอนหรือสคริปต์ NPC สคริปต์เป็นบริบท ไม่ใช่หลักฐานว่าอาจารย์กล่าวข้อความนั้น ข้อ partial ประเมินเฉพาะถ้อยคำ/ลำดับข้อความที่สังเกตได้และระบุข้อจำกัด หากหลักฐานไม่พอให้ score=null ความไม่มีพฤติกรรมใน transcript ที่ครบถ้วนของข้อ text เป็นหลักฐานคะแนนต่ำได้ ไม่ใช่ missing data"
  );
}

// Do not manufacture a comparison from the unrelated four aggregate rubric scores.
export function normalizeReflectionAnalysis(
  value: unknown,
  scenarioId?: string,
): ReflectionAnalysis[] {
  const rows = Array.isArray(value) ? value : [];
  return (REFLECTION_CRITERIA[scenarioId ?? ""] ?? []).map((c) => {
    const matches = rows.filter((r) => r && r.criterionId === c.id);
    const row = matches.length === 1 ? matches[0] : undefined;
    const evidence = typeof row?.evidence === "string" ? row.evidence.trim() : "";
    const valid = evidence && Number.isInteger(row?.score) && row.score >= 1 && row.score <= 5;
    return {
      criterionId: c.id,
      score: valid ? row.score : null,
      evidence,
      limitation:
        c.evidence === "partial"
          ? "ประเมินเฉพาะถ้อยคำใน transcript ไม่ยืนยันปฏิกิริยาจริงของผู้เรียน"
          : typeof row?.limitation === "string"
            ? row.limitation
            : "ไม่มีผลวิเคราะห์รายข้อนี้",
    };
  });
}
