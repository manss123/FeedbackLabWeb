export const MINI_GAME_VERSION = "m2-structure-feedback-2026-10-v1";

export type Choice = { text: string; response: string; hint?: string };

export type BuildConfig = {
  slots: string[];
  dimensionLabels: string[];
  cards: string[];
  cardOrder: number[];
};

export type GateStep = { prompt: string; options: Choice[]; correct: number };

export const ROUNDS = [
  {
    title: "Make It Effective",
    situation:
      "นักศึกษาชื่อ “เมย์” ส่งร่างรายงานวิจัยให้อาจารย์ก่อนกำหนดส่งฉบับสมบูรณ์หนึ่งสัปดาห์ อาจารย์ อ่านรายงานแล้วพูดว่า “ส่วนอภิปรายยังไม่ค่อยดีนะครับ ลองแก้ให้ชัดกว่านี้” เมย์มองรายงานแล้วคิด “ต้องแก้ตรงไหนนะ?”",
    gate: {
      prompt: "Feedback นี้มีปัญหาชัดที่สุดในด้านใด?",
      correct: 1,
      options: [
        {
          text: "Clarify — ทำให้ความคาดหวังชัดเจน",
          response:
            "Feedback นี้ให้รายละเอียดบางส่วนแล้ว แต่ผู้เรียนอาจยังไม่เห็นว่าผลงานที่คาดหวังควรเป็นอย่างไร",
          hint: "ลองเพิ่มข้อความที่ช่วยให้ผู้เรียนเข้าใจเป้าหมายหรือมาตรฐานของงาน",
        },
        {
          text: "Specificity — ระบุจุดที่ควรพัฒนาอย่างเฉพาะเจาะจง",
          response: "ถูกต้องครับ เมย์รู้ว่าส่วนอภิปรายควรพัฒนา แต่ยังไม่รู้ว่าปัญหาอยู่ตรงไหน",
        },
        {
          text: "Relevance — เชื่อมโยงกับเป้าหมายการเรียนรู้",
          response:
            "คำแนะนำนี้อาจชัด แต่ยังไม่เชื่อมกับสิ่งที่สำคัญต่อการเรียนรู้หรือผลงานนี้โดยตรง",
          hint: "ลองถามว่าข้อความนี้ช่วยให้ผู้เรียนเข้าใกล้เป้าหมายของงานมากขึ้นอย่างไร",
        },
        {
          text: "Timeliness — ให้ Feedback ในเวลาที่ผู้เรียนยังนำไปใช้ได้",
          response: "Feedback นี้อาจมีประโยชน์ แต่ผู้เรียนต้องมีโอกาสนำไปใช้จริง",
          hint: "ลองระบุช่วงเวลาหรือโอกาสที่ผู้เรียนสามารถนำ Feedback ไปใช้ก่อนงานจะเสร็จสมบูรณ์",
        },
      ],
    } satisfies GateStep,
    build: {
      slots: ["Clarify / Strength", "Specific Issue", "Relevant Action", "Time to Act"],
      dimensionLabels: ["Clarify", "Specificity", "Relevance", "Timeliness"],
      cards: [
        "ข้อสรุปผลของคุณตรงกับข้อมูลที่นำเสนอแล้ว",
        "ในย่อหน้าที่สองของส่วนอภิปราย คุณยังไม่ได้เชื่อมผลที่พบกับงานวิจัยเดิม",
        "ลองเพิ่มงานวิจัยที่เกี่ยวข้องหนึ่งถึงสองแหล่งเพื่อสนับสนุนการตีความผล",
        "คุณสามารถแก้ส่วนนี้ก่อนส่งฉบับสมบูรณ์วันศุกร์หน้า",
        "ส่วนอภิปรายยังไม่ค่อยดี",
        "ต้องอ่าน Paper ให้มากกว่านี้",
        "โดยรวมก็ใช้ได้ครับ",
      ],
      cardOrder: [4, 1, 6, 2, 0, 5, 3],
    } satisfies BuildConfig,
    successMessage:
      "ยอดเยี่ยมครับ Feedback นี้ช่วยให้ผู้เรียนเข้าใจสิ่งที่ทำได้แล้ว เห็นจุดที่ต้องปรับ ได้รับแนวทางที่เกี่ยวข้องกับงาน และยังมีเวลาใช้ Feedback เพื่อพัฒนาผลงาน",
    retryMessage:
      "ลองทบทวนหน้าที่ของแต่ละช่อง: Clarify ระบุจุดแข็ง, Specificity ระบุปัญหาให้ชัด, Relevance เชื่อมกับเป้าหมายงาน และ Timeliness บอกช่วงเวลาที่นำไปใช้ได้ แล้วตรวจคำตอบอีกครั้ง",
  },
  {
    title: "Choose the Right Structure",
    situation:
      "หลังจากนักศึกษาชื่อ “นนท์” สาธิตการสอนหน้าชั้นเสร็จ อาจารย์ ต้องการให้ Feedback เกี่ยวกับการตั้งคำถามในชั้นเรียน ระหว่างการสอน นนท์ถามคำถามหลายครั้ง แต่ตอบคำถามของตนเองเร็วเกินไป ทำให้นักศึกษาในชั้นยังไม่มีเวลาคิด",
    gate: {
      prompt:
        "สถานการณ์นี้ควรใช้โครงสร้างแบบใด เพื่ออธิบายพฤติกรรม ผลที่เกิดขึ้น และสิ่งที่ต้องการให้เกิดขึ้นครั้งต่อไป?",
      correct: 2,
      options: [
        {
          text: "Pendleton — เริ่มจากการสะท้อนสิ่งที่ทำได้ดีและสิ่งที่ควรพัฒนา ผ่านการสนทนาระหว่างผู้ให้และผู้รับ Feedback",
          response:
            "Pendleton สามารถใช้ได้ โดยเฉพาะหากต้องการเปิดการสะท้อนคิด แต่โจทย์นี้ต้องการอธิบายความเชื่อมโยงระหว่างพฤติกรรมกับผลที่เกิดขึ้นอย่างตรงไปตรงมา",
          hint: "ลองมองหาโมเดลที่มีโครงสร้าง Behavior → Effect → Next Direction",
        },
        {
          text: "BOOST — ใช้เป็นกรอบตรวจสอบว่า Feedback มีความ Balanced, Observed, Objective, Specific และ Timely",
          response:
            "BOOST เหมาะสำหรับตรวจสอบคุณภาพของ Feedback แต่ไม่ได้เป็นลำดับบทสนทนาที่ตรงกับสถานการณ์นี้มากที่สุด",
          hint: "โจทย์นี้ต้องการให้คุณสร้างข้อความที่เชื่อม ‘สิ่งที่เกิดขึ้น’ กับ ‘ผลที่เกิดขึ้น’ และ ‘สิ่งที่ต้องการต่อไป’",
        },
        {
          text: "AID — ระบุ Action → Impact → Desired Outcome",
          response:
            "ถูกต้องครับ AID เหมาะกับสถานการณ์ที่เราต้องการช่วยให้ผู้เรียนเห็นความเชื่อมโยงระหว่างพฤติกรรม ผลที่เกิดขึ้น และแนวทางสำหรับครั้งต่อไป",
        },
      ],
    } satisfies GateStep,
    build: {
      slots: ["Action", "Impact", "Desired Outcome"],
      dimensionLabels: ["Action + Impact", "Desired Outcome"],
      cards: [
        "ช่วงที่คุณถามคำถาม คุณตอบคำถามของตัวเองภายในประมาณสองวินาที",
        "ทำให้นักศึกษาหลายคนยังไม่มีเวลาคิดหรือมีส่วนร่วมตอบคำถาม",
        "ครั้งหน้าลองเว้นประมาณห้าวินาทีก่อนพูดต่อ เพื่อเปิดโอกาสให้นักศึกษาได้คิดและตอบ",
        "คุณต้องใจเย็นกว่านี้",
        "เด็กไม่ตอบเพราะคุณถามเร็วเกินไป",
        "การตั้งคำถามยังไม่ดี",
      ],
      cardOrder: [3, 1, 4, 0, 5, 2],
    } satisfies BuildConfig,
    successMessage:
      "ยอดเยี่ยมครับ คุณจัดโครงสร้าง Feedback ตามหลัก AID ได้ครบถ้วน เชื่อมพฤติกรรม ผลที่เกิดขึ้น และแนวทางในครั้งต่อไปได้ชัดเจน",
    retryMessage:
      "ลองทบทวน: Action คือสิ่งที่สังเกตเห็นจริง, Impact คือผลที่เกิดกับผู้เรียน และ Desired Outcome คือพฤติกรรมที่ต้องการให้เกิดขึ้นครั้งต่อไป แล้วตรวจคำตอบอีกครั้ง",
  },
  {
    title: "Coach the Conversation",
    situation:
      "นักศึกษาหญิงชื่อ “แพรว” เพิ่งสอน Microteaching เสร็จ โดยรวมการสอนมีโครงสร้างดีและเนื้อหาถูกต้อง แต่ช่วงอธิบายแนวคิดสำคัญ แพรวพูดต่อเนื่องนานและไม่ได้ตรวจสอบความเข้าใจของนักศึกษา หลังสอน แพรวถามอาจารย์ว่า “อาจารย์คะ หนูรู้สึกว่านักศึกษาดูเงียบ ๆ แต่ไม่แน่ใจว่าหนูควรปรับตรงไหนคะ”",
    gate: {
      prompt: "คุณจะเริ่มบทสนทนาอย่างไร?",
      correct: 1,
      options: [
        {
          text: "ช่วงกลางคุณพูดเยอะเกินไปครับ ควรถามนักศึกษาให้มากขึ้น",
          response: "ข้อความนี้มีคำแนะนำ แต่คุณกำลังระบุปัญหาแทนผู้เรียนทันที",
          hint: "ลองเริ่มด้วยคำถามที่เปิดโอกาสให้ผู้เรียนประเมินการสอนของตนเองก่อน",
        },
        {
          text: "ก่อนที่อาจารย์จะให้ Feedback คุณคิดว่าส่วนไหนของการสอนวันนี้ทำได้ดี และช่วงไหนที่นักศึกษาอาจมีส่วนร่วมน้อยกว่าที่คุณต้องการ?",
          response:
            "ดีมากครับ คุณเริ่มด้วยการเปิดพื้นที่ให้ผู้เรียนสะท้อนผลงานของตนเอง แทนที่จะรีบสรุปปัญหาแทนเขา",
        },
        {
          text: "โดยรวมดีแล้วครับ แค่เด็กไม่ค่อยตอบ",
          response: "คำพูดนี้ให้ความรู้สึกเชิงบวก แต่ทำให้โอกาสในการสำรวจปัญหาหยุดลง",
          hint: "ลองถามทั้งสิ่งที่ทำได้ดีและสิ่งที่ผู้เรียนคิดว่ายังพัฒนาได้",
        },
        {
          text: "คุณต้องปรับ Interaction กับนักศึกษาอีกเยอะครับ",
          response: "Feedback นี้กว้างและอาจถูกตีความว่าเป็นการประเมินความสามารถของผู้เรียน",
          hint: "เปลี่ยนจากการตัดสิน ไปเป็นคำถามเกี่ยวกับเหตุการณ์ที่เกิดขึ้นจริงในการสอน",
        },
      ],
    } satisfies GateStep,
    step2: {
      context: "แพรวตอบ: “หนูคิดว่าช่วงอธิบายทฤษฎี หนูอาจพูดต่อเนื่องนานไปค่ะ”",
      prompt: "คุณควรพูดอะไรต่อ?",
      correct: 1,
      options: [
        {
          text: "ใช่ครับ อาจารย์ก็คิดเหมือนกัน",
          response:
            "การเห็นด้วยช่วยยืนยันความคิดของผู้เรียน แต่ยังไม่ได้ช่วยให้ผู้เรียนสำรวจเหตุผลของตนเอง",
          hint: "ถามต่อว่า ‘อะไรทำให้คุณคิดเช่นนั้น?’",
        },
        {
          text: "อะไรทำให้คุณรู้สึกว่าช่วงนั้นอาจนานเกินไป?",
          response: "ดีมากครับ คุณยังไม่รีบให้คำตอบ แต่ใช้คำถามต่อยอดให้ผู้เรียนสะท้อนคิดต่อเนื่อง",
        },
        {
          text: "งั้นครั้งหน้าถามคำถามให้มากขึ้นนะครับ",
          response: "คุณให้แนวทางเร็วเกินไป ทำให้กระบวนการ Reflection หยุดลง",
          hint: "ก่อนเสนอวิธีแก้ ลองถามให้ผู้เรียนอธิบายสิ่งที่สังเกตหรือเหตุผลของตนเอง",
        },
        {
          text: "จริงครับ นักศึกษาดูไม่สนใจเลย",
          response:
            "ข้อความนี้ตีความพฤติกรรมของนักศึกษาว่า ‘ไม่สนใจ’ ทั้งที่ข้อมูลที่มีคือพวกเขาไม่ได้ตอบหรือถาม",
          hint: "ใช้เฉพาะสิ่งที่สามารถสังเกตได้ แทนการสรุปความรู้สึกหรือเจตนาของผู้เรียน",
        },
      ],
    },
    step3: {
      context: "แพรวตอบ: “หนูสังเกตว่าช่วงนั้นไม่มีใครตอบหรือถามอะไรเลยค่ะ”",
      prompt: "ตอนนี้ประโยคใดเหมาะสมที่สุด?",
      correct: 1,
      options: [
        {
          text: "ใช่ครับ เพราะคุณพูดนานเกินไป",
          response:
            "คุณระบุสาเหตุโดยตรง แต่ยังเป็นการตัดสินจากอาจารย์มากกว่าการให้ข้อมูลที่ผู้เรียนใช้ได้",
          hint: "บอกสิ่งที่คุณสังเกตจริง แล้วเชื่อมกับแนวทางที่จะทดลองครั้งหน้า",
        },
        {
          text: "อาจารย์สังเกตคล้ายกันครับ ช่วงประมาณห้านาทีของการอธิบาย ไม่มีจังหวะที่นักศึกษาได้ตอบคำถาม ครั้งหน้าลองหยุดหลังแนวคิดสำคัญแต่ละช่วง แล้วใช้คำถามสั้น ๆ เพื่อตรวจสอบความเข้าใจดูนะครับ",
          response:
            "ยอดเยี่ยมครับ คุณไม่ได้เพียงให้คำแนะนำ แต่ช่วยให้ผู้เรียนมองเห็นการเรียนรู้ของตนเอง ก่อนเติมข้อมูลจากสิ่งที่คุณสังเกตและเสนอแนวทางที่นำไปใช้ได้",
        },
        {
          text: "เด็กกลุ่มนี้ก็เงียบแบบนี้อยู่แล้วครับ",
          response:
            "ข้อความนี้อธิบายปัญหาด้วยลักษณะของผู้เรียน และไม่ได้ช่วยให้ผู้สอนเห็นสิ่งที่ตนเองสามารถปรับได้",
          hint: "นำความสนใจกลับมาที่พฤติกรรมการสอนที่ผู้เรียนสามารถเปลี่ยนแปลงได้",
        },
        {
          text: "ครั้งหน้าต้อง Active กว่านี้ครับ",
          response: "คำว่า ‘Active กว่านี้’ ยังเป็นคำกว้างและไม่บอกว่าควรทำอะไร",
          hint: "เปลี่ยนคำกว้าง ๆ เป็นพฤติกรรมที่ปฏิบัติได้ เช่น หยุดเป็นช่วง ๆ และใช้คำถามตรวจสอบความเข้าใจ",
        },
      ],
    },
    successMessage:
      "คุณเปิดโอกาสให้ผู้เรียนสะท้อนคิดก่อน แล้วจึงเติมสิ่งที่สังเกตจริงและแนวทางที่นำไปปฏิบัติได้ — Feedback กลายเป็นบทสนทนาที่ช่วยให้ผู้เรียนเรียนรู้ด้วยตนเอง",
  },
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
  gate: ChoiceAttempt[];
  builds: BuildAttempt[];
  step2: ChoiceAttempt[];
  step3: ChoiceAttempt[];
};
export type MiniGameState = { started: boolean; rounds: RoundProgress[] };
export const newMiniGame = (): MiniGameState => ({
  started: false,
  rounds: ROUNDS.map(() => ({ gate: [], builds: [], step2: [], step3: [] })),
});

/** Explicit card rubric; these are content-key checks, not AI evaluation. */
export function checkBuild(round: number, cards: number[]): Omit<BuildAttempt, "at"> {
  const build = ROUNDS[round].build;
  if (!build) throw new Error("This round has no build step");
  const n = build.slots.length;
  if (
    cards.length !== n ||
    new Set(cards).size !== n ||
    cards.some((c) => !Number.isInteger(c) || c < 0 || c >= build.cards.length)
  )
    throw new Error(`เลือก ${n} ประโยคไม่ซ้ำกันก่อนตรวจคำตอบ`);
  const checks =
    round === 0 ? cards.map((c, i) => c === i) : [cards[0] === 0 && cards[1] === 1, cards[2] === 2];
  return {
    cards: [...cards],
    checks,
    score: checks.filter(Boolean).length,
    complete: cards.every((c, i) => c === i),
  };
}
export function roundComplete(round: RoundProgress, index: number) {
  return (
    !!round.gate.at(-1)?.correct &&
    (index < 2
      ? !!round.builds.at(-1)?.complete
      : !!round.step2.at(-1)?.correct && !!round.step3.at(-1)?.correct)
  );
}
export function miniGameResult(state: MiniGameState) {
  const rounds = state.rounds.map((r, i) => {
    const score = (first: boolean) => {
      const take = <T>(items: T[]) => (first ? items[0] : items.at(-1));
      return i === 0
        ? (take(r.builds)?.score ?? 0)
        : i === 1
          ? Number(take(r.gate)?.correct ?? false) + (take(r.builds)?.score ?? 0)
          : Number(take(r.gate)?.correct ?? false) +
            Number(take(r.step2)?.correct ?? false) +
            Number(take(r.step3)?.correct ?? false);
    };
    return {
      round: i + 1,
      firstAttemptScore: score(true),
      finalLearningScore: score(false),
      hintsUsed:
        [...r.gate, ...r.step2, ...r.step3].filter((a) => !a.correct).length +
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
