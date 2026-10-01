export const MINI_GAME_VERSION = "m3-emotion-feedback-2026-10-v1";
export type Option = { text: string; response: string; hint?: string; tags?: string[] };
export type Step = {
  title: string;
  prompt: string;
  context?: string;
  kind: "single" | "multi" | "delivery";
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
export const DELIVERY_SLOTS = ["Tone · น้ำเสียง", "Pace · จังหวะการพูด", "Body Language · ภาษากาย"];
export const DELIVERY_VERSIONS = [
  { name: "Version A", cues: ["น้ำเสียงแข็ง", "พูดเร็ว", "คิ้วขมวด", "กอดอก", "ไม่สบตา"] },
  {
    name: "Version B",
    cues: [
      "น้ำเสียงอ่อนมากเกินไป",
      "พูดช้ามาก",
      "ยิ้มมากเกินสถานการณ์",
      "น้ำเสียงคล้ายพูดกับเด็กเล็ก",
    ],
  },
  {
    name: "Version C",
    cues: [
      "น้ำเสียงสงบ",
      "จังหวะปานกลาง",
      "สบตาตามธรรมชาติ",
      "ท่าทางเปิด",
      "ชี้ไปที่งานอย่างนุ่มนวล",
    ],
  },
];
export const ROUNDS: {
  title: string;
  situation: string;
  cues: string[];
  success: string;
  steps: Step[];
}[] = [
  {
    title: "Notice the Emotion",
    situation:
      "นนท์เพิ่งได้รับคะแนนงานที่ต่ำกว่าที่คาดไว้ เขามองกระดาษคะแนนเงียบ ๆ แล้วพูดว่า ‘ผมตั้งใจทำมากเลยครับ แต่คงไม่เก่งเรื่องนี้จริง ๆ’",
    cues: [
      "หลบสายตาเล็กน้อย",
      "ไหล่ตกเล็กน้อย",
      "น้ำเสียงเบาลง",
      "สีหน้าผิดหวัง",
      "ไม่มีความโกรธหรือการแสดงอารมณ์รุนแรง",
    ],
    success:
      "ดีมากค่ะ คุณสามารถอ่านอารมณ์ รับรู้ความรู้สึก และพาผู้เรียนกลับเข้าสู่การเรียนรู้ได้อย่างเหมาะสม",
    steps: [
      {
        title: "Read the Learner’s Emotion",
        prompt: "อารมณ์หลักของผู้เรียนในขณะนี้คืออะไร?",
        kind: "single",
        correct: [1],
        points: 1,
        achievements: ["Emotion Recognized"],
        options: [
          option(
            "Angry — โกรธ",
            "ยังไม่ใช่ค่ะ นนท์ไม่ได้แสดงท่าทีโต้แย้ง น้ำเสียงแข็ง หรือพฤติกรรมที่บ่งบอกถึงความโกรธ",
            "สังเกตคำพูดว่า ‘ผมคงไม่เก่งเรื่องนี้จริง ๆ’ ร่วมกับน้ำเสียงเบาและการหลบสายตา ความรู้สึกนี้เกี่ยวกับตนเองมากกว่าความไม่พอใจต่อผู้อื่น",
            ["emotion_misread"],
          ),
          option(
            "Disappointed / Discouraged — ผิดหวังและหมดกำลังใจ",
            "ถูกต้องค่ะ นนท์กำลังผิดหวังและเริ่มลดความเชื่อมั่นในความสามารถของตนเอง",
            "",
            ["emotion_recognition"],
          ),
          option(
            "Confused — สับสน",
            "ยังไม่ตรงที่สุดค่ะ ผู้เรียนไม่ได้กำลังถามว่าควรทำอะไร แต่กำลังแสดงความผิดหวังจากผลลัพธ์ที่ต่ำกว่าความคาดหวัง",
            "แยกระหว่าง ‘ไม่รู้ว่าต้องทำอะไร’ กับ ‘รู้สึกว่าตนเองทำได้ไม่ดีพอ’",
            ["emotion_misread"],
          ),
          option(
            "Indifferent — ไม่สนใจ",
            "ยังไม่ใช่ค่ะ นนท์ใส่ใจกับผลการเรียน เพราะบอกว่าเขาตั้งใจกับงานนี้มาก",
            "ผู้เรียนที่ไม่สนใจมักไม่แสดงความผิดหวังต่อผลลัพธ์ ลองดูว่าคำพูดสะท้อนความคาดหวังอย่างไร",
            ["emotion_misread"],
          ),
        ],
      },
      {
        title: "Choose the Best First Response",
        prompt: "คุณควรตอบอย่างไรเป็นประโยคแรก?",
        kind: "single",
        correct: [2],
        points: 1,
        achievements: ["Empathy"],
        options: [
          option(
            "อย่าคิดมากค่ะ คะแนนก็แค่นี้เอง",
            "ประโยคนี้ตั้งใจปลอบใจ แต่ ‘อย่าคิดมาก’ อาจทำให้ผู้เรียนรู้สึกว่าความผิดหวังไม่ได้รับการรับฟัง",
            "เริ่มจากสะท้อนหรือยอมรับความรู้สึกก่อนทำให้สถานการณ์เบาลง",
            ["minimization"],
          ),
          option(
            "ถ้าตั้งใจมากกว่านี้ก็น่าจะทำได้ดีกว่านี้นะคะ",
            "ผู้เรียนอาจรู้สึกว่าความพยายามถูกมองข้าม ทั้งที่เพิ่งบอกว่าตั้งใจกับงานนี้มาก",
            "หลีกเลี่ยงการสรุปว่าปัญหาเกิดจากความพยายาม เริ่มจากรับรู้อารมณ์ก่อน",
            ["blame"],
          ),
          option(
            "อาจารย์เข้าใจว่าคุณคงรู้สึกผิดหวัง เพราะคุณตั้งใจกับงานนี้มาก",
            "ถูกต้องค่ะ คุณรับรู้อารมณ์และความพยายามของผู้เรียนก่อนเข้าสู่การแก้ปัญหา",
            "",
            ["empathic"],
          ),
          option(
            "เดี๋ยวอาจารย์อธิบายให้ฟังว่าคุณทำผิดตรงไหน",
            "คำตอบนี้รีบเข้าสู่การแก้ปัญหา ทั้งที่ผู้เรียนกำลังผิดหวังและสูญเสียความมั่นใจ",
            "ก่อนอธิบายข้อผิดพลาด ช่วยให้ผู้เรียนรู้สึกว่าความรู้สึกของเขาได้รับการรับฟังก่อน",
            ["premature_advice"],
          ),
        ],
      },
      {
        title: "Continue Supportively",
        prompt: "ประโยคใดเหมาะสมที่สุดที่จะพูดต่อ?",
        kind: "single",
        correct: [1],
        points: 1,
        achievements: ["Supportive Language", "Learning Focus"],
        options: [
          option(
            "แต่จริง ๆ งานนี้ไม่ได้ยากมากนะคะ",
            "ผู้เรียนอาจรู้สึกว่าความยากที่เผชิญไม่ได้รับการยอมรับ",
            "ชวนมองสิ่งที่ทำได้ดีและจุดที่พัฒนาได้ แทนการบอกว่างานไม่ยาก",
            ["minimization"],
          ),
          option(
            "ลองมาดูด้วยกันนะคะว่าส่วนไหนที่คุณทำได้ดีแล้ว และส่วนไหนที่เราจะพัฒนาต่อได้",
            "ยอดเยี่ยมค่ะ คุณรับรู้อารมณ์และช่วยให้ผู้เรียนกลับเข้าสู่กระบวนการเรียนรู้โดยไม่ลดทอนความมั่นใจ",
            "",
            ["supportive", "learning_focus"],
          ),
          option(
            "คุณต้องไม่คิดว่าตัวเองไม่เก่งค่ะ",
            "แม้ตั้งใจให้กำลังใจ แต่เป็นการบอกผู้เรียนว่าควรรู้สึกหรือคิดอย่างไร",
            "เปลี่ยนจากการบอกให้หยุดคิด เป็นการชวนสำรวจสิ่งที่ทำได้ดีและสิ่งที่พัฒนาต่อได้",
            ["emotion_dismissal"],
          ),
          option(
            "ครั้งหน้าควรเตรียมตัวให้มากกว่านี้",
            "คำแนะนำนี้สรุปสาเหตุว่าเกิดจากการเตรียมตัว ทั้งที่ยังมีข้อมูลไม่เพียงพอ",
            "ดูผลงานร่วมกันก่อน แล้วจึงให้ Feedback ที่อิงหลักฐาน",
            ["unsupported_assumption"],
          ),
        ],
      },
    ],
  },
  {
    title: "Same Words, Different Tone",
    situation:
      "Dr. Maya ต้องการพูดว่า ‘ส่วนนี้ยังต้องปรับอีกเล็กน้อยนะคะ ลองอธิบายเหตุผลให้ชัดขึ้น’ เปรียบเทียบวิธีส่งสารทั้ง 3 Version ของประโยคเดียวกัน",
    cues: [],
    success:
      "ดีมากค่ะ ผู้เรียนไม่ได้ตีความ Feedback จากคำพูดเพียงอย่างเดียว แต่รับรู้ผ่านน้ำเสียง จังหวะ สีหน้า และภาษากายพร้อมกัน",
    steps: [
      {
        title: "Choose the Best Delivery",
        prompt: "Version ใดสนับสนุน Constructive Feedback ได้ดีที่สุด?",
        kind: "single",
        correct: [2],
        points: 0,
        achievements: ["Effective Delivery"],
        options: [
          option(
            "Version A",
            "เนื้อหาชัดเจน แต่การส่งสารอาจทำให้ผู้เรียนรับรู้ว่าเป็นการตำหนิมากกว่าการแนะนำ",
            "มอง beyond the words: น้ำเสียง ความเร็ว สีหน้า และท่าทางควรสอดคล้องกับความตั้งใจช่วยผู้เรียนพัฒนา",
            ["harsh_delivery"],
          ),
          option(
            "Version B",
            "ฟังดูเป็นมิตร แต่การอ่อนโยนมากเกินไปหรือพูดเหมือนกับเด็กเล็กอาจลดความเป็นมืออาชีพและทำให้ดูไม่จริงใจ",
            "Supportive ไม่ได้หมายถึงนุ่มนวลที่สุด แต่ควรเป็นธรรมชาติ ให้เกียรติ และเหมาะกับผู้เรียนระดับมหาวิทยาลัย",
            ["patronizing_delivery"],
          ),
          option(
            "Version C",
            "ถูกต้องค่ะ น้ำเสียงสงบ จังหวะพอดี และภาษากายที่เปิดช่วยให้ Feedback ฟังเป็นคำแนะนำเพื่อการพัฒนา",
            "",
            ["effective_delivery"],
          ),
        ],
      },
      {
        title: "What Creates Resistance?",
        prompt: "องค์ประกอบใดมีแนวโน้มสร้างความต้านทานในการรับ Feedback? (เลือกได้หลายข้อ)",
        context: "ทบทวน Version A: น้ำเสียงแข็ง พูดเร็ว คิ้วขมวด กอดอก และไม่สบตา",
        kind: "multi",
        correct: [0, 1, 2, 3],
        points: 0,
        achievements: ["Recognize Resistance"],
        options: [
          option(
            "Harsh Tone — น้ำเสียงแข็ง",
            "ถูกต้องค่ะ น้ำเสียงที่แข็งอาจทำให้ข้อความเชิงพัฒนาถูกตีความเป็นการตำหนิ",
          ),
          option(
            "Fast Pace — พูดเร็ว",
            "ถูกต้องค่ะ การพูดเร็วเกินไปอาจลดเวลาที่ผู้เรียนใช้ประมวลและทำความเข้าใจ Feedback",
          ),
          option(
            "Closed Posture — ท่าทางปิด",
            "ถูกต้องค่ะ การกอดอกอาจเพิ่มระยะห่างและทำให้บทสนทนาดูเป็นการประเมินมากกว่าการร่วมกันพัฒนา",
          ),
          option(
            "Lack of Eye Contact — ไม่สบตา",
            "ถูกต้องค่ะ การหลีกเลี่ยงการสบตาอาจส่งสัญญาณถึงความไม่ใส่ใจหรือการปิดบทสนทนา",
          ),
          option(
            "Clear Wording — ข้อความชัดเจน",
            "ข้อความที่ชัดเจนไม่ใช่ปัญหาค่ะ ปัญหาอยู่ที่วิธีส่งสาร",
            "แยก ‘what is said’ ออกจาก ‘how it is said’ แล้วทบทวนตัวเลือกอีกครั้ง",
            ["content_delivery_confusion"],
          ),
        ],
      },
      {
        title: "Adjust the Delivery",
        prompt: "ลากตัวเลือกมาจัดน้ำเสียง จังหวะ และภาษากายที่ช่วยให้ผู้เรียนพร้อมรับ Feedback",
        kind: "delivery",
        correct: [1, 4, 7],
        points: 3,
        achievements: ["Tone", "Pace", "Body Language"],
        options: [
          option(
            "Harsh — น้ำเสียงแข็ง",
            "น้ำเสียงนี้อาจทำให้ผู้เรียนรับรู้ Feedback ว่าเป็นการตำหนิ",
            "ใช้น้ำเสียงสงบและจริงจังโดยไม่แข็งหรือกดดัน",
            ["harsh_tone"],
          ),
          option("Neutral-Calm — สงบเป็นธรรมชาติ", "Tone ✓ น้ำเสียงสงบและให้เกียรติ"),
          option(
            "Overly Cheerful — สดใสมากเกินไป",
            "น้ำเสียงสดใสมากเกินไปอาจไม่สอดคล้องกับสาระและทำให้ดูไม่จริงใจ",
            "รักษาน้ำเสียงอบอุ่นแต่เป็นธรรมชาติ ไม่จำเป็นต้องเป็นบวกเกินจริง",
            ["overly_cheerful"],
          ),
          option(
            "Fast — เร็ว",
            "ผู้เรียนอาจไม่มีเวลาประมวลข้อมูลสำคัญ",
            "ลดความเร็วและเว้นจังหวะหลังประเด็นสำคัญ",
            ["fast_pace"],
          ),
          option("Moderate — ปานกลาง", "Pace ✓ จังหวะพอดีกับการสนทนา"),
          option(
            "Very Slow — ช้ามาก",
            "จังหวะที่ช้าเกินไปอาจทำให้ดูไม่เป็นธรรมชาติหรือเหมือนพูดกับเด็ก",
            "ใช้จังหวะปานกลางและหยุดเฉพาะจุดที่ต้องการเน้น",
            ["slow_pace"],
          ),
          option(
            "Closed — ท่าทางปิด",
            "ท่าทางปิดอาจสร้างระยะห่างและเพิ่มความรู้สึกถูกประเมิน",
            "ใช้ท่าทางเปิด ผ่อนคลาย และหันเข้าหาผู้เรียนตามธรรมชาติ",
            ["closed_posture"],
          ),
          option("Open — ท่าทางเปิด", "Body Language ✓ เปิดรับและผ่อนคลาย"),
          option(
            "Overly Animated — เคลื่อนไหวมากเกินไป",
            "ท่าทางมากเกินไปอาจเบี่ยงความสนใจจากสาระ",
            "ใช้ gesture เท่าที่จำเป็นและให้สอดคล้องกับประเด็นที่พูด",
            ["overly_animated"],
          ),
        ],
      },
    ],
  },
  {
    title: "Stay Calm When the Learner Pushes Back",
    situation:
      "Dr. Maya พูดกับพีทว่า ‘ข้อมูลของคุณน่าสนใจค่ะ แต่ข้อสรุปบางส่วนยังไม่มีหลักฐานสนับสนุนเพียงพอ’ พีทตอบด้วยน้ำเสียงตึงเล็กน้อยว่า ‘แต่ผมหาข้อมูลมาเยอะมากนะครับ แล้วเพื่อนกลุ่มอื่นก็ใช้ข้อมูลประมาณนี้เหมือนกัน’",
    cues: ["หยุดสังเกต: ผู้ให้ Feedback ก็อาจรู้สึกว่าตนเองถูกโต้แย้งเช่นกัน"],
    success:
      "ยอดเยี่ยมค่ะ คุณสามารถจัดการทั้งอารมณ์ของตนเองและอารมณ์ของผู้เรียน โดยไม่ปล่อยให้บทสนทนากลายเป็นการโต้แย้ง และยังรักษาเป้าหมายของการเรียนรู้ไว้ได้",
    steps: [
      {
        title: "Notice Your Own Reaction",
        prompt: "หากคุณเริ่มรู้สึกหงุดหงิด คุณควรทำอะไรเป็นอันดับแรก?",
        kind: "single",
        correct: [1],
        points: 1,
        achievements: ["Self-Awareness", "Self-Regulation"],
        options: [
          option(
            "ตอบทันทีเพื่ออธิบายว่าใครถูกใครผิด",
            "การตอบขณะหงุดหงิดอาจทำให้บทสนทนากลายเป็นการปกป้องจุดยืนมากกว่าช่วยผู้เรียน",
            "สร้าง pause สั้น ๆ แล้วถามตนเองว่าเป้าหมายของ Feedback ครั้งนี้คืออะไร",
            ["defensive"],
          ),
          option(
            "หยุดสั้น ๆ รับรู้อารมณ์ของตนเอง แล้วกลับไปที่เป้าหมายของ Feedback",
            "ถูกต้องค่ะ Emotional Intelligence เริ่มจากรู้ว่าตนเองกำลังรู้สึกอะไร แล้วเลือกตอบสนองอย่างมีเป้าหมาย",
            "",
            ["self_regulation"],
          ),
          option(
            "บอกนักศึกษาว่าไม่ควรเถียงอาจารย์",
            "ข้อความนี้เปลี่ยนประเด็นจากผลงานไปเป็นอำนาจและบทบาท ซึ่งอาจเพิ่มความต้านทาน",
            "แยกการไม่เห็นด้วยออกจากการไม่เคารพ แล้วกลับไปดูหลักฐานในงาน",
            ["authority_based", "defensive"],
          ),
          option(
            "ยุติการสนทนา",
            "อาจลดความตึงเครียดชั่วคราว แต่ผู้เรียนยังไม่ได้เรียนรู้จาก Feedback",
            "จัดการอารมณ์ให้เพียงพอที่จะสนทนาต่ออย่างสร้างสรรค์ แทนหลีกเลี่ยงอารมณ์",
            ["avoidance"],
          ),
        ],
      },
      {
        title: "Choose the Best Response",
        prompt: "คุณจะตอบพีทอย่างไร?",
        kind: "single",
        correct: [2],
        points: 2,
        achievements: ["Empathy", "De-escalation"],
        options: [
          option(
            "อาจารย์ตรวจมาหลายงานแล้วค่ะ อาจารย์รู้ว่าหลักฐานระดับไหนเพียงพอ",
            "ข้อความนี้ยืนยันความน่าเชื่อถือของผู้สอน แต่ไม่ได้ช่วยให้ผู้เรียนตรวจสอบงานของตนเอง",
            "ใช้ Evidence ในงานร่วมกัน แทนใช้ประสบการณ์หรือสถานะของอาจารย์เป็นหลักฐาน",
            ["authority_based"],
          ),
          option(
            "ถ้าคุณคิดว่าเพียงพอแล้ว ก็ไม่เป็นไรค่ะ",
            "ลดความขัดแย้งได้ แต่ Feedback ถูกยุติก่อนผู้เรียนมีโอกาสตรวจสอบหรือเรียนรู้",
            "รักษาความสัมพันธ์และเป้าหมายการเรียนรู้ด้วยการชวนดูงานร่วมกัน",
            ["avoidance"],
          ),
          option(
            "อาจารย์เข้าใจว่าคุณใช้เวลาเก็บข้อมูลมากนะคะ ลองมาดูด้วยกันว่าข้อสรุปตรงนี้อ้างอิงจากหลักฐานส่วนไหน แล้วเราจะดูว่ามีส่วนใดที่ควรเพิ่ม",
            "ดีมากค่ะ คุณรับรู้ความพยายามโดยไม่ต้องเห็นด้วยกับข้อโต้แย้ง และพาบทสนทนากลับไปที่หลักฐาน",
            "",
            ["empathic", "de_escalation", "evidence_focused"],
          ),
          option(
            "อย่าเพิ่งเถียงค่ะ ฟัง Feedback ให้จบก่อน",
            "คำว่า ‘เถียง’ อาจทำให้ผู้เรียนรู้สึกว่ามุมมองไม่ได้รับการยอมรับ และเพิ่มการป้องกันตัว",
            "ยอมรับมุมมองหรือความพยายามก่อน แล้วเปลี่ยนเป็นการตรวจสอบงานร่วมกัน",
            ["defensive", "authority_based"],
          ),
        ],
      },
      {
        title: "Learner Still Pushes Back",
        prompt: "คุณควรทำอย่างไรต่อ?",
        context: "พีทตอบ: ‘แต่ผมก็ยังคิดว่ามันพอแล้วครับ’",
        kind: "single",
        correct: [2],
        points: 1,
        achievements: ["Learning Focus"],
        options: [
          option(
            "ถ้าอย่างนั้นก็แล้วแต่คุณค่ะ",
            "การถอนตัวอาจทำให้ผู้เรียนเข้าใจว่า Feedback เป็นเพียงความคิดเห็นที่เลือกยอมรับหรือไม่ก็ได้",
            "ใช้คำถามที่พากลับไปตรวจสอบ Evidence ด้วยตนเอง",
            ["avoidance"],
          ),
          option(
            "คุณผิดตรงที่ยังไม่เข้าใจเรื่องหลักฐานค่ะ",
            "ข้อความนี้เปลี่ยนจากผลงานไปตัดสินความเข้าใจของผู้เรียน และมีแนวโน้มเพิ่มการป้องกันตัว",
            "พูดถึงข้อสรุปและหลักฐานในงาน แทนการตัดสินตัวผู้เรียน",
            ["defensive"],
          ),
          option(
            "ลองช่วยอาจารย์ดูประโยคข้อสรุปนี้นะคะ แล้วบอกว่า Evidence ส่วนไหนรองรับข้อความนี้โดยตรง",
            "ยอดเยี่ยมค่ะ คุณเปลี่ยนจากการโต้แย้งว่าใครถูกหรือผิด ไปเป็นการตรวจสอบผลงานร่วมกัน",
            "",
            ["evidence_focused", "learning_focus"],
          ),
          option(
            "งั้นไปถามอาจารย์ท่านอื่นดูค่ะ",
            "อาจหลีกเลี่ยงความตึงเครียด แต่ไม่ได้ช่วยให้บทสนทนาปัจจุบันเกิดการเรียนรู้",
            "อยู่กับประเด็นเดิมและใช้ Evidence เป็นพื้นที่กลางที่ทั้งสองฝ่ายพิจารณาร่วมกัน",
            ["avoidance"],
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
    (config.kind === "single" && selected.length !== 1) ||
    (config.kind === "delivery" && selected.length !== 3)
  )
    throw new Error("คำตอบไม่ครบหรือไม่ถูกต้อง");
  const checks =
    config.kind === "delivery"
      ? config.correct.map((n, i) => selected[i] === n)
      : [
          selected.length === config.correct.length &&
            config.correct.every((n) => selected.includes(n)),
        ];
  const correct = checks.every(Boolean);
  const tags = [...new Set(selected.flatMap((n) => config.options[n].tags ?? []))];
  return {
    correct,
    checks,
    score: config.kind === "delivery" ? checks.filter(Boolean).length : correct ? config.points : 0,
    responseTags: tags,
    errorTypes: correct
      ? []
      : tags.length
        ? tags
        : [config.kind === "multi" ? "incomplete_resistance_selection" : "delivery_mismatch"],
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
