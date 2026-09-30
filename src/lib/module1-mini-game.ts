export const MINI_GAME_VERSION = "m1-build-feedback-2026-09-v1";
export const PURPOSES = [
  "Reinforce Strength — เสริมจุดแข็ง",
  "Improve Performance — พัฒนาผลงาน",
  "Maintain Motivation — รักษาแรงจูงใจ",
  "Encourage Reflection — กระตุ้นการสะท้อนคิด",
  "Clarify Expectations — ทำให้ความคาดหวังชัดเจน",
];
export const ROUNDS = [
  {
    title: "Reinforce and Improve",
    purpose: 1,
    situation:
      "เมย์นำเสนอเนื้อหาได้ถูกต้อง ใช้ตัวอย่างจริงได้ดี แต่พูดค่อนข้างเร็ว ทำให้ผู้ฟังบางคนตามไม่ทัน",
    success: "ถูกต้องค่ะ เป้าหมายหลักคือช่วยให้เมย์พัฒนาการนำเสนอให้ผู้ฟังติดตามได้ง่ายขึ้น",
    hint: "ลองดูอีกครั้งนะคะ นักศึกษามีจุดแข็งอยู่แล้ว แต่มีพฤติกรรมหนึ่งที่สามารถปรับให้ดีขึ้นได้",
    slots: ["Strength", "Improvement", "Action", "Benefit"],
    slotLabels: [
      "ระบุจุดแข็ง",
      "ระบุสิ่งที่ควรปรับ",
      "เสนอแนวทางปฏิบัติ",
      "ผลลัพธ์ที่คาดว่าจะเกิดขึ้น",
    ],
    cards: [
      "ตัวอย่างที่คุณใช้ช่วยให้ผู้ฟังเข้าใจเนื้อหาได้ดี",
      "ช่วงกลางของการนำเสนอคุณพูดค่อนข้างเร็ว",
      "ครั้งหน้าลองลดความเร็วและเว้นจังหวะหลังแต่ละประเด็น",
      "จะช่วยให้ผู้ฟังติดตามเนื้อหาได้ง่ายขึ้น",
      "พูดเร็วเกินไป",
      "ต้องกลับไปซ้อมใหม่",
      "โดยรวมก็โอเค",
    ],
  },
  {
    title: "Maintain Motivation",
    purpose: 2,
    situation:
      "นนท์พยายามแก้โจทย์ด้วยตนเอง แต่คำตอบยังไม่ถูกต้อง เขาพูดว่า ‘ผมคงไม่เก่งเรื่องนี้จริง ๆ ครับ’",
    success: "ถูกต้องค่ะ ก่อนให้คำแนะนำเพิ่มเติม ควรช่วยให้นักศึกษายังเชื่อว่าตนเองสามารถพัฒนาได้",
    hint: "ลองพิจารณาว่าขณะนี้ผู้เรียนยังเชื่อว่าตนเองสามารถพัฒนาได้หรือไม่",
    slots: ["Acknowledge", "Strength", "Action", "Encouragement"],
    slotLabels: ["ยอมรับความท้าทาย", "มองเห็นจุดแข็ง", "แนะนำขั้นตอนถัดไป", "ให้กำลังใจ"],
    cards: [
      "โจทย์นี้ค่อนข้างท้าทาย",
      "คุณเลือกแนวทางเริ่มต้นได้ถูกต้องแล้ว",
      "ลองกลับไปตรวจสอบขั้นตอนที่สามอีกครั้ง",
      "อาจารย์เชื่อว่าคุณจะหาจุดที่คลาดเคลื่อนได้",
      "ถ้ายังทำไม่ได้ก็ควรทบทวนใหม่ทั้งหมด",
      "เห็นไหมว่าอาจารย์บอกแล้ว",
      "ไม่เป็นไร เดี๋ยวก็ได้เอง",
    ],
  },
  {
    title: "Encourage Reflection",
    purpose: 3,
    situation:
      "นักศึกษาหญิงเพิ่งส่ง Project ซึ่งโดยรวมอยู่ในระดับดี แต่ถามว่า ‘อาจารย์คะ ถ้าหนูอยากให้งานนี้ดีขึ้นกว่านี้ หนูควรแก้ตรงไหนคะ’",
    success:
      "ถูกต้องค่ะ ในสถานการณ์นี้ นักศึกษาพร้อมเรียนรู้ จึงเหมาะที่จะเปิดโอกาสให้เธอประเมินตนเองก่อน",
    hint: "ลองเลือกเป้าหมายที่เปิดโอกาสให้ผู้เรียนประเมินงานของตนเองก่อนรับคำแนะนำ",
    slots: [],
    slotLabels: [],
    cards: [],
  },
];
export const REFLECTION_CHOICES = [
  [
    "เพิ่มหลักฐานอีกสองแหล่ง แล้วแก้บทสรุปใหม่",
    "ก่อนที่อาจารย์จะเสนอความคิดเห็น คุณคิดว่าส่วนใดของงานทำได้ดีที่สุด และส่วนใดที่ยังพัฒนาได้อีก",
    "งานดีแล้ว ไม่ต้องแก้อะไร",
    "ถ้าอยากให้ดีขึ้นก็ต้องทำให้ละเอียดกว่านี้",
  ],
  [
    "ถูกต้อง งั้นไปเพิ่ม Analysis",
    "อะไรทำให้คุณรู้สึกว่าส่วนนั้นยังไม่ลึกพอ",
    "อาจารย์ก็คิดแบบนั้น",
    "ก็ลองอ่าน Paper เพิ่มค่ะ",
  ],
];
export const REFLECTION_HINTS = [
  [
    "คำแนะนำนี้นำไปปฏิบัติได้ แต่คุณกำลังบอกวิธีแก้ทันที ลองเริ่มด้วยคำถามที่ช่วยให้นักศึกษามองเห็นจุดแข็งและสิ่งที่ต้องการพัฒนาด้วยตนเอง",
    "",
    "ข้อความนี้ให้กำลังใจ แต่ยังไม่ได้ช่วยให้สะท้อนผลงาน ลองถามคำถามที่ทำให้นักศึกษากลับไปพิจารณางานของตนเอง",
    "Feedback นี้ยังค่อนข้างกว้าง ลองใช้คำถามปลายเปิด เช่น ‘คุณคิดว่าส่วนใดของงานยังสามารถพัฒนาได้อีก?’",
  ],
  [
    "คุณยืนยันสิ่งที่นักศึกษาคิดได้ดี แต่รีบให้คำตอบต่อทันที ลองถามต่อว่า ‘เพราะอะไร’ หรือ ‘อะไรทำให้คุณคิดเช่นนั้น’",
    "",
    "การเห็นด้วยยังไม่ช่วยให้สำรวจเหตุผล ลองถามให้นักศึกษาอธิบายว่าอะไรทำให้เขาคิดว่าส่วนนั้นยังไม่ดีพอ",
    "ยังเป็นการให้คำตอบจากอาจารย์ ลองถามต่อก่อนว่า ‘คุณคิดว่าจะทำอย่างไรให้การวิเคราะห์ลึกขึ้น?’",
  ],
];
export type ChoiceAttempt = { answer: number; correct: boolean; at: string };
export type BuildAttempt = {
  cards: number[];
  score: number;
  checks: boolean[];
  complete: boolean;
  at: string;
};
export type RoundProgress = {
  purpose: ChoiceAttempt[];
  builds: BuildAttempt[];
  opening: ChoiceAttempt[];
  followup: ChoiceAttempt[];
};
export type MiniGameState = { started: boolean; rounds: RoundProgress[] };
export const newMiniGame = (): MiniGameState => ({
  started: false,
  rounds: ROUNDS.map(() => ({ purpose: [], builds: [], opening: [], followup: [] })),
});

/** Explicit card rubric; these are content-key checks, not AI evaluation. */
export function checkBuild(round: number, cards: number[]): Omit<BuildAttempt, "at"> {
  if (
    ![0, 1].includes(round) ||
    cards.length !== 4 ||
    new Set(cards).size !== 4 ||
    cards.some((c) => !Number.isInteger(c) || c < 0 || c > 6)
  )
    throw new Error("เลือก 4 ประโยคไม่ซ้ำกันก่อนตรวจคำตอบ");
  const checks =
    round === 0
      ? [
          cards[0] === 0 && cards[1] === 1,
          !cards.includes(4) && !cards.includes(5),
          cards[0] === 0 && cards[3] === 3,
          cards[2] === 2,
        ]
      : [cards[1] === 1, cards[2] === 2 && cards[3] === 3];
  return {
    cards: [...cards],
    checks,
    score: checks.filter(Boolean).length,
    complete: cards.every((c, i) => c === i),
  };
}
export function roundComplete(round: RoundProgress, index: number) {
  return (
    !!round.purpose.at(-1)?.correct &&
    (index < 2
      ? !!round.builds.at(-1)?.complete
      : !!round.opening.at(-1)?.correct && !!round.followup.at(-1)?.correct)
  );
}
export function miniGameResult(state: MiniGameState) {
  const rounds = state.rounds.map((r, i) => {
    const score = (first: boolean) => {
      const take = <T>(items: T[]) => (first ? items[0] : items.at(-1));
      return i === 0
        ? (take(r.builds)?.score ?? 0)
        : i === 1
          ? Number(take(r.purpose)?.correct ?? false) + (take(r.builds)?.score ?? 0)
          : Number(take(r.purpose)?.correct ?? false) +
            Number(take(r.opening)?.correct ?? false) +
            Number(take(r.followup)?.correct ?? false);
    };
    return {
      round: i + 1,
      firstAttemptScore: score(true),
      finalLearningScore: score(false),
      hintsUsed:
        [...r.purpose, ...r.opening, ...r.followup].filter((a) => !a.correct).length +
        r.builds.filter((a) => !a.complete).length,
      ...r,
    };
  });
  return {
    version: MINI_GAME_VERSION,
    completed: state.rounds.every(roundComplete),
    firstAttemptScore: rounds.reduce((sum, r) => sum + r.firstAttemptScore, 0),
    finalLearningScore: rounds.reduce((sum, r) => sum + r.finalLearningScore, 0),
    maxScore: 10,
    rounds,
  };
}
