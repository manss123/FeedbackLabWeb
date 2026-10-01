export const MINI_GAME_VERSION = "m4-timing-feedback-2026-10-v1";
export type Option = { text: string; response: string; hint?: string; tags?: string[] };
export type Step = {
  title: string;
  prompt: string;
  context?: string;
  kind: "single";
  options: Option[];
  correct: number[];
  points: number;
  achievements: string[];
};
const option = (text: string, response: string, hint = "", tags: string[] = []): Option => ({
  text,
  response,
  hint,
  tags,
});
export const ROUNDS: {
  title: string;
  situation: string;
  cues: string[];
  success: string;
  steps: Step[];
}[] = [
  {
    title: "Feedback While It Can Still Help",
    situation:
      "นักศึกษาชื่อ “เมย์” กำลังซ้อมนำเสนอหน้าชั้นเรียน ระหว่างการซ้อม Dr. Maya สังเกตว่าเมย์หันหลังให้ผู้ฟังและอ่านข้อมูลจาก Slide ต่อเนื่องหลายครั้ง การนำเสนอจริงจะเกิดขึ้นในอีก 3 วัน",
    cues: [],
    success:
      "Feedback ไม่จำเป็นต้องเกิดทันทีทุกครั้ง แต่ควรเกิดในเวลาที่ข้อมูลยังมีความหมาย และผู้เรียนยังสามารถนำไปใช้ได้",
    steps: [
      {
        title: "Choose the Best Timing",
        prompt: "ช่วงเวลาใดเหมาะสมที่สุดในการให้ Feedback?",
        kind: "single",
        correct: [1],
        points: 1,
        achievements: ["Timing"],
        options: [
          option(
            "หยุดการนำเสนอทันทีทุกครั้งที่เมย์หันไปอ่าน Slide",
            "Feedback ทันทีอาจมีประโยชน์ในบางสถานการณ์ แต่การหยุดซ้ำ ๆ ทุกครั้งอาจรบกวน flow ของการฝึกและทำให้ผู้เรียนเสียสมาธิ",
            "ลองคิดว่าปัญหานี้จำเป็นต้องแก้ ‘ในวินาทีนั้น’ หรือสามารถรอจนจบช่วงสั้น ๆ แล้วให้ Feedback โดยที่ผู้เรียนยังมีโอกาสฝึกใหม่ได้",
            ["too_frequent"],
          ),
          option(
            "รอให้เมย์ซ้อมจบ แล้วให้ Feedback ทันทีหลังการซ้อม",
            "ถูกต้องค่ะ ผู้เรียนสามารถฝึกจนจบก่อน แล้วได้รับ Feedback ในขณะที่เหตุการณ์ยังสดใหม่ และยังมีเวลาอีก 3 วันเพื่อนำไปปรับปรุง",
            "",
            ["timely"],
          ),
          option(
            "รอให้เมย์นำเสนอจริงเสร็จในอีก 3 วัน แล้วค่อยบอก",
            "Feedback ยังอาจมีประโยชน์สำหรับอนาคต แต่ผู้เรียนสูญเสียโอกาสใช้ข้อมูลนี้เพื่อพัฒนาการนำเสนอครั้งที่กำลังเตรียมอยู่",
            "Feedback ควรเกิดในเวลาที่ผู้เรียนยังสามารถนำไปใช้กับ performance ที่กำลังพัฒนาได้",
            ["too_late"],
          ),
          option(
            "รอจนสิ้นภาคเรียน แล้วสรุปพร้อม Feedback อื่น ๆ",
            "เวลาผ่านไปนานเกินไป ผู้เรียนอาจจำสถานการณ์ได้ไม่ชัด และไม่สามารถใช้ Feedback กับงานนี้ได้แล้ว",
            "ถามตัวเองว่า ‘ผู้เรียนยังมีโอกาสนำ Feedback นี้ไปใช้เมื่อไร?’",
            ["too_late"],
          ),
        ],
      },
      {
        title: "Choose the Best Feedback",
        prompt: "หลังซ้อมเสร็จ Dr. Maya ควรพูดอย่างไร?",
        kind: "single",
        correct: [1],
        points: 2,
        achievements: ["Specific", "Actionable", "Opportunity to Improve"],
        options: [
          option(
            "“Presentation ยังไม่ค่อยดีค่ะ”",
            "Feedback เกิดในเวลาที่เหมาะสมแล้ว แต่ข้อความยังไม่ระบุว่าผู้เรียนควรปรับอะไร",
            "เชื่อม Timing ที่ดีกับ Feedback ที่เฉพาะเจาะจง และให้ผู้เรียนรู้ว่ารอบถัดไปควรทดลองทำอะไร",
            ["vague"],
          ),
          option(
            "“ช่วงกลางของการนำเสนอ อาจารย์สังเกตว่าคุณหันไปอ่าน Slide หลายครั้งค่ะ ก่อนวันนำเสนอจริง ลองซ้อมโดยใช้ Slide เป็นเพียง keyword และหันกลับมาสบตาผู้ฟังหลังแต่ละประเด็นนะคะ”",
            "ดีมากค่ะ Feedback นี้เกิดขึ้นในเวลาที่ผู้เรียนยังสามารถนำไปทดลอง ปรับ และฝึกใหม่ก่อนการนำเสนอจริง",
            "",
            ["specific_actionable"],
          ),
          option(
            "“ครั้งหน้าต้องเตรียมตัวให้มากกว่านี้นะคะ”",
            "ข้อความนี้อาจทำให้ผู้เรียนเข้าใจว่าปัญหาเกิดจากความพยายาม ทั้งที่สิ่งที่สังเกตได้คือพฤติกรรมระหว่างการนำเสนอ",
            "พูดถึงสิ่งที่สังเกตได้ และสิ่งที่ผู้เรียนสามารถทดลองเปลี่ยนในการซ้อมครั้งต่อไป",
            ["vague_blame"],
          ),
          option(
            "“ไม่เป็นไรค่ะ เดี๋ยววันจริงก็น่าจะดีขึ้น”",
            "ข้อความนี้ช่วยลดความกังวล แต่ปล่อยให้โอกาสในการพัฒนาก่อนวันจริงผ่านไป",
            "ผู้เรียนยังมีเวลา 3 วัน ลองใช้ Feedback เพื่อเปลี่ยนเวลาที่เหลือให้เป็นโอกาสสำหรับการฝึก",
            ["missed_opportunity"],
          ),
        ],
      },
    ],
  },
  {
    title: "Public or Private?",
    situation:
      "หลังการนำเสนอหน้าชั้น นักศึกษาชื่อ “นนท์” ให้ข้อมูลผิดในประเด็นสำคัญ เพื่อนในชั้นบางคนดูสับสน Dr. Maya จำเป็นต้องแก้ข้อมูลเพื่อไม่ให้ทั้งชั้นเข้าใจผิด แต่รายละเอียดเกี่ยวกับผลการประเมินและข้อบกพร่องของนนท์ไม่จำเป็นต้องพูดต่อหน้าทุกคน",
    cues: [],
    success:
      "บริบทที่เหมาะสมไม่ได้หมายความว่า Feedback ทุกอย่างต้องเป็นส่วนตัว สิ่งที่สำคัญคือแยกว่าอะไรจำเป็นต่อการเรียนรู้ของกลุ่ม และอะไรควรพูดคุยกับผู้เรียนเป็นรายบุคคล",
    steps: [
      {
        title: "Choose the Best Immediate Action",
        prompt: "อะไรควรพูดต่อหน้าชั้น และอะไรควรพูดเป็นการส่วนตัว?",
        kind: "single",
        correct: [2],
        points: 1,
        achievements: ["Context", "Privacy"],
        options: [
          option(
            "บอกต่อหน้าชั้นทันทีว่า “นนท์เข้าใจเรื่องนี้ผิดค่ะ” แล้วอธิบายข้อผิดพลาดทั้งหมด",
            "การแก้ข้อมูลต่อหน้าชั้นเป็นสิ่งจำเป็น แต่การระบุว่าผู้เรียน ‘เข้าใจผิด’ และอธิบายข้อบกพร่องทั้งหมดต่อหน้าคนอื่นอาจเกินความจำเป็น",
            "แยกสองเป้าหมายออกจากกัน: สิ่งที่ทั้งชั้นจำเป็นต้องรู้ กับ Feedback ส่วนบุคคลที่นนท์ควรได้รับ",
            ["overexposed"],
          ),
          option(
            "ไม่พูดอะไร เพื่อไม่ให้นนท์เสียหน้า",
            "การรักษาความรู้สึกของผู้เรียนสำคัญ แต่หากปล่อยข้อมูลผิดไว้ นักศึกษาคนอื่นอาจเกิดความเข้าใจผิดตามไปด้วย",
            "มีวิธีแก้ข้อมูลโดยไม่จำเป็นต้องตำหนิผู้เรียน ลองคิดถึงการ Clarify เนื้อหาให้ทั้งชั้นอย่างเป็นกลาง",
            ["avoidance"],
          ),
          option(
            "แก้ข้อมูลสำคัญให้ทั้งชั้นอย่างเป็นกลาง แล้วคุย Feedback รายละเอียดกับนนท์เป็นการส่วนตัวหลังชั้นเรียน",
            "ถูกต้องค่ะ สิ่งที่มีผลต่อการเรียนรู้ของทั้งชั้นควรได้รับการแก้ไขในเวลานั้น ส่วน Feedback ที่เฉพาะกับผลงานของนนท์สามารถพูดคุยเป็นการส่วนตัว",
            "",
            ["balanced"],
          ),
          option(
            "รอคุยกับนนท์เป็นการส่วนตัวเท่านั้นและไม่แก้ข้อมูลให้ทั้งชั้น",
            "การคุยเป็นส่วนตัวเหมาะกับ Feedback รายบุคคล แต่ข้อมูลที่ผิดได้ถูกสื่อออกไปต่อหน้าชั้นแล้ว",
            "ถามว่า ‘ใครบ้างที่ได้รับผลจากข้อมูลนี้?’ หากทั้งชั้นอาจเข้าใจผิด ควรมีการ Clarify ต่อทั้งชั้นด้วย",
            ["underexposed"],
          ),
        ],
      },
      {
        title: "Choose the Best Public Response",
        prompt: "Dr. Maya ควรพูดต่อหน้าชั้นอย่างไร?",
        kind: "single",
        correct: [1],
        points: 1,
        achievements: ["Public Clarification"],
        options: [
          option(
            "“ตรงนี้นนท์ตอบผิดนะคะ จริง ๆ แล้ว…”",
            "ข้อมูลอาจถูกแก้ไขได้ แต่การเน้นว่าใคร ‘ผิด’ ไม่จำเป็นต่อการเรียนรู้ของทั้งชั้น",
            "เปลี่ยน focus จาก ‘ใครผิด’ เป็น ‘แนวคิดที่ถูกต้องคืออะไร’",
            ["names_student"],
          ),
          option(
            "“ขอเพิ่มเติมตรงประเด็นนี้อีกนิดนะคะ แนวคิดที่ถูกต้องคือ… ประเด็นนี้สำคัญเพราะ…”",
            "ดีมากค่ะ คุณแก้ความเข้าใจของทั้งชั้นโดยไม่ทำให้ผู้เรียนคนหนึ่งกลายเป็นจุดสนใจของความผิดพลาด",
            "",
            ["concept_focused"],
          ),
          option(
            "“ทุกคนอย่าจำตามที่นนท์พูดนะคะ”",
            "ข้อความนี้แก้ข้อมูลได้ แต่ทำให้ผู้เรียนถูกระบุเป็นแหล่งของความผิดพลาดต่อหน้าทุกคน",
            "ให้ความสำคัญกับการแก้ concept มากกว่าการระบุตัวผู้ที่ตอบผิด",
            ["names_student"],
          ),
          option(
            "“เดี๋ยวอาจารย์ค่อยบอกคำตอบที่ถูกตอนท้ายคาบ”",
            "การรอนานเกินไปอาจทำให้ความเข้าใจผิดคงอยู่ระหว่างบทเรียน",
            "เมื่อข้อมูลผิดมีผลต่อความเข้าใจของทั้งชั้น ควร Clarify ในจังหวะที่เหมาะสมโดยไม่จำเป็นต้องประเมินผู้เรียนต่อหน้าคนอื่น",
            ["too_delayed"],
          ),
        ],
      },
      {
        title: "Choose the Best Private Follow-up",
        prompt: "“Dr. Maya ควรให้ Feedback กับนนท์เป็นการส่วนตัวอย่างไร?”",
        kind: "single",
        correct: [1],
        points: 1,
        achievements: ["Private Feedback", "Reflection"],
        options: [
          option(
            "“วันนี้คุณตอบผิดหลายอย่างนะคะ”",
            "แม้จะพูดเป็นส่วนตัว แต่ข้อความยังเป็นการสรุปกว้างและเน้นความผิดพลาดมากกว่าการเรียนรู้",
            "ระบุประเด็นที่สังเกตได้ และชวนผู้เรียนตรวจสอบความเข้าใจของตนเอง",
            ["vague"],
          ),
          option(
            "“เมื่อกี้ในประเด็นนี้ อาจารย์สังเกตว่าคำอธิบายของคุณยังสลับสองแนวคิดเข้าด้วยกัน ลองเล่าให้อาจารย์ฟังอีกครั้งได้ไหมคะว่า คุณเข้าใจความแตกต่างของสองแนวคิดนี้อย่างไร”",
            "ยอดเยี่ยมค่ะ บริบทที่เป็นส่วนตัวช่วยให้สามารถพูดถึงความเข้าใจของผู้เรียนได้ละเอียดขึ้น และเปิดโอกาสให้ผู้เรียนอธิบายกระบวนการคิดของตนเอง",
            "",
            ["specific_reflective"],
          ),
          option(
            "“คราวหน้าถ้าไม่แน่ใจก็อย่าพูดนะคะ”",
            "ข้อความนี้อาจลดความกล้าที่จะมีส่วนร่วมในอนาคต และไม่ได้ช่วยแก้ความเข้าใจของผู้เรียน",
            "เป้าหมายคือทำให้ผู้เรียนเข้าใจ concept ดีขึ้น ไม่ใช่ทำให้หลีกเลี่ยงการตอบ",
            ["discourages_participation"],
          ),
          option(
            "“ไม่เป็นไรค่ะ เรื่องนี้ยากอยู่แล้ว”",
            "ข้อความนี้ให้การสนับสนุน แต่ยังไม่ได้ช่วยให้ผู้เรียนค้นหาว่าความเข้าใจคลาดเคลื่อนอยู่ตรงไหน",
            "รักษาน้ำเสียงที่ supportive แต่เพิ่มคำถามหรือข้อมูลที่ช่วยให้ผู้เรียนตรวจสอบความเข้าใจของตนเอง",
            ["supportive_but_vague"],
          ),
        ],
      },
    ],
  },
  {
    title: "Interrupt, Wait, or Follow Up?",
    situation: "นักศึกษาชื่อ “แพรว” กำลังสอบปากเปล่า ระหว่างตอบคำถาม เธอสับสนแนวคิดสำคัญและเริ่มตอบวกวน",
    cues: [
      "แพรวเริ่มพูดเร็วขึ้น",
      "สีหน้ากังวล",
      "หยุดคิดหลายครั้ง",
      "การสอบยังไม่จบ",
      "การให้คำอธิบายคำตอบโดยตรงในตอนนี้อาจมีผลต่อความยุติธรรมของการประเมิน",
    ],
    success:
      "Feedback ที่เหมาะสมไม่ได้หมายถึง Feedback ที่เร็วที่สุด แต่คือ Feedback ที่เกิดในเวลาที่เหมาะกับเป้าหมาย บริบท และความพร้อมของผู้เรียน",
    steps: [
      {
        title: "Decide What to Do During the Assessment",
        prompt: "ระหว่างการประเมิน Dr. Maya ควรทำอย่างไร?",
        kind: "single",
        correct: [2],
        points: 2,
        achievements: ["Assessment Context", "Neutral Support"],
        options: [
          option(
            "หยุดการสอบและอธิบาย concept ที่ถูกต้องทันที",
            "การช่วยทันทีอาจลดความกังวล แต่การให้คำตอบระหว่างการประเมินอาจเปลี่ยนสิ่งที่กำลังถูกวัดและกระทบความยุติธรรมของการสอบ",
            "ลองแยก ‘การช่วยให้เรียนรู้’ ออกจาก ‘การประเมินสิ่งที่ผู้เรียนทำได้ด้วยตนเอง’ บาง Feedback ควรรอจน assessment จบ",
            ["breaks_assessment"],
          ),
          option(
            "ปล่อยให้แพรวตอบต่อโดยไม่ทำอะไรเลย แม้จะเห็นว่าเริ่มกังวลมากขึ้น",
            "การไม่ให้คำตอบระหว่างการสอบเหมาะสม แต่ผู้สอนยังสามารถจัดการกระบวนการสอบโดยไม่เปิดเผยคำตอบได้",
            "คิดถึง neutral support ที่ช่วยให้ผู้เรียนตั้งสติ โดยไม่ช่วยด้านเนื้อหาที่กำลังถูกประเมิน",
            ["no_support"],
          ),
          option(
            "ใช้คำพูดเป็นกลางเพื่อให้แพรวหยุดคิดและจัดคำตอบ โดยไม่ให้ข้อมูลเกี่ยวกับคำตอบที่ถูกต้อง (เช่น “ไม่ต้องรีบนะคะ ลองใช้เวลาสักครู่ แล้วจัดลำดับความคิดก่อนตอบต่อได้ค่ะ”)",
            "ถูกต้องค่ะ คุณช่วยจัดการสภาวะของผู้เรียนโดยไม่ให้ข้อมูลที่เปลี่ยนความหมายของการประเมิน",
            "",
            ["neutral_support"],
          ),
          option(
            "เปลี่ยนไปถามคำถามที่ง่ายกว่าจนแพรวตอบได้",
            "หากเปลี่ยนระดับหรือเนื้อหาของคำถามเพื่อช่วยผู้เรียน อาจทำให้เงื่อนไขการประเมินไม่เท่าเทียมกัน",
            "ใน assessment context การสนับสนุนควรช่วยด้านกระบวนการโดยไม่เปลี่ยนสิ่งที่กำลังถูกประเมิน",
            ["changes_assessment"],
          ),
        ],
      },
      {
        title: "When Should Detailed Feedback Be Given?",
        prompt:
          "หลังการสอบเสร็จสิ้น Dr. Maya ควรให้ Feedback อย่างละเอียดแก่แพรวในช่วงเวลาใด จึงจะเหมาะสมและช่วยให้แพรวพร้อมรับและนำ Feedback ไปใช้พัฒนาต่อได้?",
        kind: "single",
        correct: [1],
        points: 1,
        achievements: ["Timing", "Readiness"],
        options: [
          option(
            "ทันทีที่แพรวพูดคำตอบสุดท้ายจบ โดยเริ่มอธิบายข้อผิดพลาดทั้งหมดทันที",
            "เวลานี้ใกล้กับเหตุการณ์และมีข้อดี แต่ผู้เรียนอาจยังอยู่ในภาวะตึงเครียดจากการสอบ",
            "Timely ไม่ได้แปลว่า ‘เร็วที่สุดเสมอ’ ลองพิจารณาว่าผู้เรียนพร้อมรับและประมวล Feedback หรือยัง",
            ["too_abrupt"],
          ),
          option(
            "ให้เวลาสั้น ๆ เพื่อเปลี่ยนจาก assessment mode เป็น feedback mode แล้วจึงพูดคุยหลังสอบ",
            "ถูกต้องค่ะ Feedback ยังเกิดใกล้กับเหตุการณ์ แต่ให้พื้นที่สั้น ๆ เพื่อให้ผู้เรียนพร้อมเปลี่ยนจากการถูกประเมินเข้าสู่การเรียนรู้",
            "",
            ["timely_ready"],
          ),
          option(
            "รอหนึ่งเดือนแล้วค่อยแจ้ง",
            "ผู้เรียนอาจสงบแล้ว แต่เวลาที่ผ่านไปนานทำให้รายละเอียดของสถานการณ์ไม่สดใหม่ และลดโอกาสนำ Feedback ไปเชื่อมกับ performance นั้น",
            "หา balance ระหว่าง ‘immediate’ กับ ‘too delayed’",
            ["too_late"],
          ),
          option(
            "ไม่ต้องให้ Feedback เพราะการสอบเสร็จแล้ว",
            "การประเมินอาจสิ้นสุดแล้ว แต่ข้อมูลจาก performance ยังสามารถเป็นโอกาสสำคัญสำหรับการเรียนรู้ครั้งต่อไป",
            "Assessment และ Learning ไม่จำเป็นต้องจบพร้อมกัน หลังการประเมินยังสามารถใช้ Feedback เพื่อพัฒนาได้",
            ["skipped"],
          ),
        ],
      },
      {
        title: "Choose the Best Post-Assessment Feedback",
        prompt: "แพรวดูสงบขึ้นและพร้อมคุย Dr. Maya ควรเริ่มอย่างไร?",
        kind: "single",
        correct: [1],
        points: 1,
        achievements: ["Specific", "Reflective", "Context-Appropriate"],
        options: [
          option(
            "“ตอนสอบคุณสับสนมากเลยนะคะ”",
            "ข้อความนี้อธิบายผู้เรียนในภาพรวม แต่ยังไม่ระบุว่าความสับสนเกิดขึ้นตรงส่วนใด",
            "เปลี่ยนจากการ label ผู้เรียน ไปพูดถึงช่วงหรือแนวคิดที่สังเกตได้",
            ["labels_learner"],
          ),
          option(
            "“ช่วงคำถามที่สอง คุณอธิบายแนวคิด A และ B สลับกันอยู่เล็กน้อยค่ะ ก่อนที่อาจารย์จะอธิบายเพิ่มเติม คุณคิดว่าสองแนวคิดนี้ต่างกันอย่างไร?”",
            "ยอดเยี่ยมค่ะ คุณรอจนการประเมินสิ้นสุด เลือกเวลาที่ผู้เรียนพร้อม และใช้ performance ที่เพิ่งเกิดขึ้นเป็นจุดเริ่มต้นของการเรียนรู้",
            "",
            ["specific_reflective"],
          ),
          option(
            "“คำตอบที่ถูกคือ…”",
            "ตอนนี้สามารถอธิบายคำตอบได้แล้ว แต่การให้คำตอบทันทีอาจลดโอกาสที่ผู้เรียนจะตรวจสอบความเข้าใจของตนเองก่อน",
            "ก่อนอธิบาย ลองใช้คำถามเพื่อให้ผู้เรียนสะท้อนว่าตนเองเข้าใจแนวคิดนั้นอย่างไร",
            ["skips_reflection"],
          ),
          option(
            "“ครั้งหน้าต้องอ่านให้ละเอียดกว่านี้นะคะ”",
            "ข้อความนี้สรุปว่าปัญหาเกิดจากการเตรียมตัว โดยไม่ได้ใช้ข้อมูลจาก performance ที่เพิ่งสังเกต",
            "เริ่มจากสิ่งที่เกิดขึ้นจริงในการสอบ แล้วจึงช่วยผู้เรียนวางแนวทางพัฒนาต่อ",
            ["unsupported_assumption"],
          ),
        ],
      },
    ],
  },
];

export type Attempt = {
  selected: number[];
  correct: boolean;
  score: number;
  checks: boolean[];
  at: string;
  presentedAt: string;
  responseTimeMs: number;
  retryCount: number;
  hintDisplayed: boolean;
  responseTags: string[];
  errorTypes: string[];
};
export type MiniGameState = { version: string; started: boolean; rounds: { steps: Attempt[][] }[] };
export function newMiniGame(): MiniGameState {
  return {
    version: MINI_GAME_VERSION,
    started: false,
    rounds: ROUNDS.map((r) => ({ steps: r.steps.map(() => []) })),
  };
}
export function gradeStep(round: number, step: number, selected: number[]) {
  const config = ROUNDS[round]?.steps[step];
  if (!config) throw new Error("Unknown step");
  if (
    !selected.length ||
    new Set(selected).size !== selected.length ||
    selected.some((n) => !Number.isInteger(n) || n < 0 || n >= config.options.length) ||
    selected.length !== 1
  )
    throw new Error("คำตอบไม่ครบหรือไม่ถูกต้อง");
  const checks = [
    selected.length === config.correct.length && config.correct.every((n) => selected.includes(n)),
  ];
  const correct = checks.every(Boolean);
  const tags = [...new Set(selected.flatMap((n) => config.options[n].tags ?? []))];
  return {
    correct,
    checks,
    score: correct ? config.points : 0,
    responseTags: tags,
    errorTypes: correct ? [] : tags,
  };
}
export function roundComplete(round: MiniGameState["rounds"][number], index: number) {
  return ROUNDS[index].steps.every((_, i) => !!round.steps[i]?.at(-1)?.correct);
}
export function recordAttempt(
  state: MiniGameState,
  round: number,
  step: number,
  selected: number[],
  timing: { presentedAt: string; at: string; responseTimeMs: number },
): MiniGameState {
  const history = state.rounds[round]?.steps[step];
  if (
    !state.started ||
    !history ||
    history.at(-1)?.correct ||
    ROUNDS.slice(0, round).some((_, i) => !roundComplete(state.rounds[i], i)) ||
    state.rounds[round].steps.slice(0, step).some((attempts) => !attempts.at(-1)?.correct)
  )
    throw new Error("Step is locked");
  const grade = gradeStep(round, step, selected);
  const attempt: Attempt = {
    ...grade,
    selected: [...selected],
    ...timing,
    responseTimeMs: Math.max(0, Math.round(timing.responseTimeMs)),
    retryCount: history.length,
    hintDisplayed: !grade.correct,
  };
  return {
    ...state,
    rounds: state.rounds.map((r, ri) =>
      ri !== round ? r : { steps: r.steps.map((s, si) => (si !== step ? s : [...s, attempt])) },
    ),
  };
}
export function miniGameResult(state: MiniGameState) {
  const rounds = ROUNDS.map((r, i) => {
    const steps = r.steps.map((s, j) => {
      const attempts = state.rounds[i].steps[j];
      return {
        step: j + 1,
        title: s.title,
        kind: s.kind,
        maxScore: s.points,
        firstAttemptScore: attempts[0]?.score ?? 0,
        finalLearningScore: attempts.at(-1)?.score ?? 0,
        firstAttemptAccuracy: attempts[0]?.correct ?? null,
        finalAccuracy: attempts.at(-1)?.correct ?? null,
        retryCount: Math.max(0, attempts.length - 1),
        attempts,
      };
    });
    return {
      round: i + 1,
      firstAttemptScore: steps.reduce((n, s) => n + s.firstAttemptScore, 0),
      finalLearningScore: steps.reduce((n, s) => n + s.finalLearningScore, 0),
      maxScore: r.steps.reduce((n, s) => n + s.points, 0),
      hintsUsed: steps.reduce((n, s) => n + s.attempts.filter((a) => a.hintDisplayed).length, 0),
      steps,
    };
  });
  return {
    version: MINI_GAME_VERSION,
    completed: state.started && ROUNDS.every((_, i) => roundComplete(state.rounds[i], i)),
    firstAttemptScore: rounds.reduce((n, r) => n + r.firstAttemptScore, 0),
    finalLearningScore: rounds.reduce((n, r) => n + r.finalLearningScore, 0),
    maxScore: 10,
    rounds,
  };
}
