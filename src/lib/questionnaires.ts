// Post-experiment questionnaires — four validated instruments from the
// thesis methodology (LME-VRGF, SSS-VRGF, SRL-VRGF, UX-VRGF). Plain
// TypeScript content, same convention as SCENARIOS (vr-simulation.tsx) and
// RATING_STATEMENTS_BY_SCENARIO (ranking-assessment.tsx) — no separate
// JSON, since (unlike assessment-content.json) nothing here needs to stay
// hidden from the client: these are self-report scales with no "correct"
// answer key.

export const QUESTIONNAIRES_VERSION = "post-questionnaires-2026-09-v1";

// A 5th questionnaire extends this union — see QUESTIONNAIRES below.
export type QuestionnaireKey = "lme" | "sss" | "srl" | "ux";

export interface QuestionnaireItem {
  id: string;
  text: string;
}

export interface QuestionnaireDimension {
  key: string;
  title: string;
  items: QuestionnaireItem[];
}

export interface QuestionnaireDef {
  key: QuestionnaireKey;
  code: string;
  titleTh: string;
  instructionsTh: string;
  // Index 0 = score 1 ... index 4 = score 5, ascending for left-to-right display.
  scaleLabels: [string, string, string, string, string];
  dimensions: QuestionnaireDimension[];
}

const LME: QuestionnaireDef = {
  key: "lme",
  code: "LME-VRGF",
  titleTh: "แบบประเมินแรงจูงใจและการมีส่วนร่วมในการเรียนรู้",
  instructionsTh:
    "โปรดพิจารณาประสบการณ์ของท่านหลังจากเรียนรู้และฝึกการให้ Constructive Feedback ผ่านระบบ และเลือกคำตอบที่ตรงกับความคิดเห็นของท่านมากที่สุด",
  scaleLabels: ["ไม่เห็นด้วยอย่างยิ่ง", "ไม่เห็นด้วย", "ปานกลาง", "เห็นด้วย", "เห็นด้วยอย่างยิ่ง"],
  dimensions: [
    {
      key: "intrinsic_motivation",
      title: "แรงจูงใจภายในจากการเรียนรู้ผ่านสถานการณ์จำลอง VR",
      items: [
        { id: "lme_1", text: "ฉันรู้สึกมีส่วนร่วมกับสถานการณ์จำลองใน VR อย่างแท้จริง" },
        {
          id: "lme_2",
          text: "การเรียนผ่านสถานการณ์จำลองใน VR ทำให้ฉันสนใจฝึกการให้ Constructive Feedback มากขึ้น",
        },
        {
          id: "lme_3",
          text: "ฉันรู้สึกสนุกกับการเรียนรู้และฝึกการให้ Constructive Feedback ผ่านสถานการณ์จำลองใน VR",
        },
        {
          id: "lme_4",
          text: "ฉันอยากกลับมาฝึกผ่านสถานการณ์จำลองใน VR อีก เพื่อพัฒนาทักษะการให้ Constructive Feedback ของตนเอง",
        },
      ],
    },
    {
      key: "perceived_competence",
      title: "การรับรู้ความสามารถของตนเองในการให้ Constructive Feedback",
      items: [
        { id: "lme_5", text: "ฉันมีความมั่นใจมากขึ้นในการให้ Constructive Feedback แก่ผู้เรียน" },
        {
          id: "lme_6",
          text: "ฉันสามารถนำ Feedback และคำแนะนำจากระบบมาใช้ปรับปรุงวิธีการให้ Constructive Feedback ของตนเองได้",
        },
        { id: "lme_7", text: "ฉันเข้าใจหลักการของการให้ Constructive Feedback ที่มีคุณภาพมากขึ้น" },
        {
          id: "lme_8",
          text: "ฉันมั่นใจว่าสามารถนำสิ่งที่ได้เรียนรู้จากระบบไปประยุกต์ใช้ในการให้ Feedback แก่ผู้เรียนในสถานการณ์จริงได้",
        },
      ],
    },
    {
      key: "gamified_engagement",
      title: "การมีส่วนร่วมจากองค์ประกอบ Gamification",
      items: [
        {
          id: "lme_9",
          text: "องค์ประกอบของเกมในระบบช่วยกระตุ้นให้ฉันมีส่วนร่วมกับกิจกรรมการเรียนรู้อย่างต่อเนื่อง",
        },
        {
          id: "lme_10",
          text: "ความท้าทายของกิจกรรมและสถานการณ์ต่าง ๆ ทำให้ฉันอยากพัฒนาผลการฝึกของตนเองให้ดีขึ้น",
        },
        {
          id: "lme_11",
          text: "การได้รับผลตอบกลับหรือการแสดงความสำเร็จหลังทำกิจกรรม ทำให้ฉันรู้สึกถึงความก้าวหน้าของตนเอง",
        },
        {
          id: "lme_12",
          text: "การได้เห็นความก้าวหน้าของตนเองในระบบกระตุ้นให้ฉันอยากทำกิจกรรมต่อไป",
        },
      ],
    },
    {
      key: "effort_persistence",
      title: "ความพยายามและความต่อเนื่องในการเรียนรู้",
      items: [
        { id: "lme_13", text: "ฉันพยายามทำกิจกรรมการเรียนรู้และการฝึกในแต่ละโมดูลให้สำเร็จ" },
        {
          id: "lme_14",
          text: "ฉันใช้เวลาและความตั้งใจในการฝึกการให้ Constructive Feedback อย่างจริงจัง",
        },
        {
          id: "lme_15",
          text: "ฉันพยายามนำ Feedback หรือคำแนะนำที่ได้รับจากระบบมาใช้ปรับปรุงการให้ Constructive Feedback ของตนเองอย่างต่อเนื่อง",
        },
        {
          id: "lme_16",
          text: "ฉันยังคงพยายามเรียนรู้และฝึกฝน แม้บางกิจกรรมหรือสถานการณ์จะมีความท้าทาย",
        },
      ],
    },
    {
      key: "interaction_reflective",
      title: "การมีส่วนร่วมผ่านปฏิสัมพันธ์และการสะท้อนคิด",
      items: [
        {
          id: "lme_17",
          text: "กิจกรรม Reflection ช่วยให้ฉันได้ทบทวนวิธีการให้ Constructive Feedback ของตนเอง",
        },
        {
          id: "lme_18",
          text: "Feedback หรือคำแนะนำจากระบบช่วยให้ฉันวิเคราะห์ได้ว่าการให้ Constructive Feedback ของตนเองควรปรับปรุงอย่างไร",
        },
        {
          id: "lme_19",
          text: "การได้ลองฝึกอีกครั้งหลังจากได้รับ Feedback ช่วยให้ฉันนำสิ่งที่ได้เรียนรู้ไปปรับใช้กับการให้ Constructive Feedback ของตนเอง",
        },
        {
          id: "lme_20",
          text: "กระบวนการฝึกและสะท้อนคิดในระบบช่วยให้ฉันตระหนักมากขึ้นว่า วิธีการให้ Feedback ของผู้สอนสามารถส่งผลต่อการเรียนรู้และการพัฒนาของผู้เรียนได้",
        },
      ],
    },
  ],
};

const SSS: QuestionnaireDef = {
  key: "sss",
  code: "SSS-VRGF",
  titleTh: "แบบประเมินความพึงพอใจต่อระบบ",
  instructionsTh:
    "โปรดประเมินระดับความพึงพอใจของท่าน หลังจากใช้งานระบบ โดยเลือกคำตอบที่ตรงกับความคิดเห็นของท่านมากที่สุด",
  scaleLabels: [
    "พึงพอใจน้อยที่สุด",
    "พึงพอใจน้อย",
    "พึงพอใจปานกลาง",
    "พึงพอใจมาก",
    "พึงพอใจมากที่สุด",
  ],
  dimensions: [
    {
      key: "content_activities",
      title: "ความพึงพอใจต่อเนื้อหาและกิจกรรมการเรียนรู้",
      items: [
        {
          id: "sss_1",
          text: "ฉันพึงพอใจกับความถูกต้องและความน่าเชื่อถือของเนื้อหาเกี่ยวกับ Constructive Feedback ในระบบ",
        },
        {
          id: "sss_2",
          text: "ฉันพึงพอใจกับความครอบคลุมของเนื้อหาที่จำเป็นต่อการพัฒนาทักษะการให้ Constructive Feedback",
        },
        {
          id: "sss_3",
          text: "ฉันพึงพอใจกับระดับความยากและความเหมาะสมของเนื้อหาและกิจกรรมการเรียนรู้",
        },
        { id: "sss_4", text: "ฉันพึงพอใจกับการจัดลำดับเนื้อหาและกิจกรรมการเรียนรู้ในแต่ละโมดูล" },
        { id: "sss_5", text: "โดยรวม ฉันพึงพอใจกับเนื้อหาและกิจกรรมการเรียนรู้ที่นำเสนอในระบบ" },
      ],
    },
    {
      key: "system_use_design",
      title: "ความพึงพอใจต่อการใช้งานและการออกแบบระบบ",
      items: [
        { id: "sss_6", text: "ฉันพึงพอใจกับความสะดวกในการใช้งานระบบ" },
        { id: "sss_7", text: "ฉันพึงพอใจกับความชัดเจนของคำสั่งและขั้นตอนการทำกิจกรรมในระบบ" },
        { id: "sss_8", text: "ฉันพึงพอใจกับการจัดวางและการนำเสนอข้อมูลบนหน้าจอ" },
        { id: "sss_9", text: "ฉันพึงพอใจกับความต่อเนื่องในการใช้งานระหว่างกิจกรรมต่าง ๆ ในระบบ" },
        { id: "sss_10", text: "โดยรวม ฉันพึงพอใจกับการออกแบบและการใช้งานระบบ" },
      ],
    },
    {
      key: "practice_feedback",
      title: "ความพึงพอใจต่อประสบการณ์การฝึกและ Feedback",
      items: [
        {
          id: "sss_11",
          text: "ฉันพึงพอใจกับสถานการณ์จำลองที่ใช้ในการฝึกการให้ Constructive Feedback",
        },
        {
          id: "sss_12",
          text: "ฉันพึงพอใจกับโอกาสที่ระบบเปิดให้ฉันได้ฝึกตัดสินใจและให้ Feedback ในสถานการณ์ต่าง ๆ",
        },
        { id: "sss_13", text: "ฉันพึงพอใจกับ Feedback หรือคำแนะนำที่ได้รับจากระบบหลังการฝึก" },
        {
          id: "sss_14",
          text: "ฉันพึงพอใจกับกิจกรรม Reflection ที่ช่วยให้ฉันทบทวนการให้ Feedback ของตนเอง",
        },
        {
          id: "sss_15",
          text: "ฉันพึงพอใจกับโอกาสในการนำ Feedback ที่ได้รับไปใช้ในการฝึกหรือปรับปรุงครั้งต่อไป",
        },
      ],
    },
    {
      key: "perceived_value",
      title: "ความพึงพอใจต่อคุณค่าและประสบการณ์โดยรวมของระบบ",
      items: [
        {
          id: "sss_16",
          text: "ฉันพึงพอใจกับประโยชน์ของระบบต่อการพัฒนาทักษะการให้ Constructive Feedback ของตนเอง",
        },
        {
          id: "sss_17",
          text: "ฉันพึงพอใจกับการที่ระบบช่วยเชื่อมโยงการเรียนรู้กับสถานการณ์ที่สามารถเกิดขึ้นในการสอนจริง",
        },
        {
          id: "sss_18",
          text: "ฉันพึงพอใจกับการที่ระบบช่วยสนับสนุนการพัฒนาการให้ Feedback ของตนเอง",
        },
        { id: "sss_19", text: "ฉันคิดว่าประสบการณ์จากระบบนี้มีคุณค่าต่อการพัฒนาการสอนของฉัน" },
        { id: "sss_20", text: "โดยรวม ฉันพึงพอใจกับประสบการณ์การเรียนรู้ผ่านระบบนี้" },
      ],
    },
  ],
};

const SRL: QuestionnaireDef = {
  key: "srl",
  code: "SRL-VRGF",
  titleTh: "แบบประเมินการกำกับตนเองในการเรียนรู้",
  instructionsTh:
    "โปรดพิจารณาประสบการณ์ของท่านระหว่างการเรียนรู้และฝึกการให้ Constructive Feedback ผ่านระบบ และเลือกคำตอบที่ตรงกับความคิดเห็นของท่านมากที่สุด",
  scaleLabels: ["ไม่เห็นด้วยอย่างยิ่ง", "ไม่เห็นด้วย", "ปานกลาง", "เห็นด้วย", "เห็นด้วยอย่างยิ่ง"],
  dimensions: [
    {
      key: "goal_setting",
      title: "การกำหนดเป้าหมายและการวางแผน",
      items: [
        {
          id: "srl_1",
          text: "ก่อนเริ่มการฝึก ฉันกำหนดเป้าหมายว่าต้องการพัฒนาทักษะการให้ Constructive Feedback ของตนเองในด้านใด",
        },
        {
          id: "srl_2",
          text: "ฉันคิดล่วงหน้าว่าจะนำความรู้และหลักการที่ได้เรียนไปใช้ในการฝึกให้ Constructive Feedback อย่างไร",
        },
        {
          id: "srl_3",
          text: "ฉันสามารถระบุได้ว่าทักษะการให้ Constructive Feedback ด้านใดของตนเองที่ควรให้ความสำคัญในการพัฒนา",
        },
        {
          id: "srl_4",
          text: "ฉันวางแผนว่าควรปรับปรุงวิธีการให้ Constructive Feedback ของตนเองอย่างไรในการฝึกครั้งต่อไป",
        },
        {
          id: "srl_5",
          text: "เมื่อได้รับ Feedback จากระบบ ฉันสามารถกำหนดเป้าหมายเฉพาะสำหรับการฝึกครั้งต่อไปได้",
        },
      ],
    },
    {
      key: "strategy_use",
      title: "การใช้กลยุทธ์และการควบคุมการเรียนรู้",
      items: [
        {
          id: "srl_6",
          text: "ฉันเลือกใช้วิธีการเรียนรู้หรือการฝึกที่ช่วยให้ตนเองเข้าใจหลักการให้ Constructive Feedback ได้ดีขึ้น",
        },
        {
          id: "srl_7",
          text: "เมื่อพบว่าวิธีที่ใช้ในการให้ Constructive Feedback ยังไม่ได้ผลตามที่ต้องการ ฉันพยายามปรับวิธีการของตนเอง",
        },
        {
          id: "srl_8",
          text: "ฉันนำ Feedback หรือคำแนะนำจากระบบมาใช้เป็นแนวทางในการปรับวิธีการให้ Constructive Feedback ของตนเอง",
        },
        {
          id: "srl_9",
          text: "ฉันพยายามเชื่อมโยงสิ่งที่เรียนรู้ในระบบกับสถานการณ์การให้ Feedback ที่อาจเกิดขึ้นในการสอนจริง",
        },
        {
          id: "srl_10",
          text: "เมื่อพบสถานการณ์การให้ Feedback ที่มีความท้าทาย ฉันพยายามใช้หลักการหรือกลยุทธ์ที่ได้เรียนรู้เพื่อจัดการกับสถานการณ์นั้น",
        },
      ],
    },
    {
      key: "self_monitoring",
      title: "การติดตามตนเอง",
      items: [
        {
          id: "srl_11",
          text: "ระหว่างการฝึก ฉันติดตามว่าตนเองกำลังพัฒนาทักษะการให้ Constructive Feedback ได้ดีขึ้นเพียงใด",
        },
        {
          id: "srl_12",
          text: "ระหว่างเรียน ฉันตรวจสอบว่าตนเองเข้าใจหลักการของ Constructive Feedback ที่กำลังเรียนรู้อยู่หรือไม่",
        },
        {
          id: "srl_13",
          text: "ขณะฝึกให้ Constructive Feedback ฉันสังเกตวิธีการสื่อสารและการตอบสนองของตนเอง",
        },
        {
          id: "srl_14",
          text: "ฉันสามารถสังเกตได้ว่าตนเองมีจุดแข็งและจุดที่ยังต้องพัฒนาในการให้ Constructive Feedback ด้านใด",
        },
        {
          id: "srl_15",
          text: "ฉันสามารถประเมินได้ว่า Feedback ที่ตนเองให้มีความเหมาะสมกับสถานการณ์เพียงใด",
        },
      ],
    },
    {
      key: "self_reflection",
      title: "การสะท้อนคิดและการปรับตัว",
      items: [
        {
          id: "srl_16",
          text: "หลังการฝึก ฉันทบทวนว่าวิธีการให้ Constructive Feedback ของตนเองมีส่วนใดที่ทำได้ดีและส่วนใดที่ควรพัฒนา",
        },
        {
          id: "srl_17",
          text: "ฉันเปรียบเทียบวิธีการให้ Constructive Feedback ของตนเองกับ Feedback หรือคำแนะนำที่ได้รับจากระบบ",
        },
        {
          id: "srl_18",
          text: "ฉันนำสิ่งที่ค้นพบจากการสะท้อนคิดและ Feedback ของระบบมาใช้ปรับปรุงการให้ Constructive Feedback ในการฝึกครั้งต่อไป",
        },
        {
          id: "srl_19",
          text: "เมื่อได้ลองฝึกอีกครั้ง ฉันพยายามเปลี่ยนวิธีการของตนเองตามสิ่งที่ได้เรียนรู้จากการฝึกครั้งก่อน",
        },
        {
          id: "srl_20",
          text: "ฉันนำประสบการณ์จากการฝึกในระบบมาใช้กำหนดแนวทางในการพัฒนาการให้ Constructive Feedback ของตนเองต่อไป",
        },
      ],
    },
  ],
};

const UX: QuestionnaireDef = {
  key: "ux",
  code: "UX-VRGF",
  titleTh: "แบบสอบถามการรับรู้ประสบการณ์ผู้ใช้",
  instructionsTh:
    "โปรดพิจารณาประสบการณ์ของท่านหลังจากใช้งานระบบ และเลือกคำตอบที่ตรงกับความคิดเห็นของท่านมากที่สุด",
  scaleLabels: ["ไม่เห็นด้วยอย่างยิ่ง", "ไม่เห็นด้วย", "ปานกลาง", "เห็นด้วย", "เห็นด้วยอย่างยิ่ง"],
  dimensions: [
    {
      key: "vr_presence",
      title: "การรับรู้ความสมจริงและการมีส่วนร่วมในสถานการณ์ VR",
      items: [
        { id: "ux_1", text: "ฉันรู้สึกเหมือนกำลังอยู่ในสถานการณ์การให้ Feedback จริงขณะฝึกผ่าน VR" },
        { id: "ux_2", text: "ฉันรู้สึกมีส่วนร่วมกับเหตุการณ์ที่เกิดขึ้นในสถานการณ์จำลอง VR" },
        { id: "ux_3", text: "ฉันรู้สึกว่าตนเองเป็นส่วนหนึ่งของสถานการณ์ที่เกิดขึ้นใน VR" },
        { id: "ux_4", text: "ฉันสามารถจดจ่อกับสถานการณ์และกิจกรรมที่เกิดขึ้นใน VR ได้ดี" },
        { id: "ux_5", text: "การโต้ตอบกับตัวละครและเหตุการณ์ใน VR ทำให้สถานการณ์มีความสมจริง" },
        {
          id: "ux_6",
          text: "ฉันตอบสนองต่อเหตุการณ์ใน VR ราวกับว่ากำลังเผชิญกับสถานการณ์การให้ Feedback จริง",
        },
        {
          id: "ux_7",
          text: "ฉันรู้สึกเชื่อมโยงกับอารมณ์หรือการตอบสนองของตัวละครในสถานการณ์ VR",
        },
        {
          id: "ux_8",
          text: "สถานการณ์ใน VR สะท้อนเหตุการณ์การให้ Feedback ที่สามารถเกิดขึ้นได้ในการสอนจริง",
        },
      ],
    },
    {
      key: "system_support",
      title: "การรับรู้การสนับสนุนการเรียนรู้และ Feedback จากระบบ",
      items: [
        {
          id: "ux_9",
          text: "ระบบช่วยให้ฉันเข้าใจว่าการให้ Constructive Feedback ของตนเองมีจุดใดที่ทำได้ดี",
        },
        {
          id: "ux_10",
          text: "ระบบช่วยให้ฉันระบุจุดที่ควรพัฒนาในการให้ Constructive Feedback ของตนเองได้",
        },
        {
          id: "ux_11",
          text: "Feedback หรือคำแนะนำจากระบบสอดคล้องกับการตอบสนองหรือการปฏิบัติของฉันในสถานการณ์ฝึก",
        },
        {
          id: "ux_12",
          text: "Feedback จากระบบมีความเฉพาะเจาะจงเพียงพอที่จะช่วยให้ฉันเข้าใจสิ่งที่ควรปรับปรุง",
        },
        {
          id: "ux_13",
          text: "Feedback จากระบบช่วยให้ฉันเห็นแนวทางในการพัฒนาการให้ Constructive Feedback ของตนเอง",
        },
        { id: "ux_14", text: "ระบบช่วยให้ฉันเชื่อมโยงสิ่งที่เรียนรู้กับการปฏิบัติในสถานการณ์จำลองได้" },
        {
          id: "ux_15",
          text: "การได้รับ Feedback หลังการฝึกช่วยให้ฉันเตรียมตัวสำหรับการลองฝึกครั้งต่อไปได้ดีขึ้น",
        },
        {
          id: "ux_16",
          text: "โดยรวม ระบบให้การสนับสนุนที่เป็นประโยชน์ต่อการพัฒนาทักษะการให้ Constructive Feedback ของฉัน",
        },
      ],
    },
    {
      key: "usability_interaction",
      title: "ประสบการณ์ด้านการใช้งานและปฏิสัมพันธ์กับระบบ",
      items: [
        { id: "ux_17", text: "ฉันเข้าใจวิธีการใช้งานระบบและขั้นตอนของกิจกรรมต่าง ๆ ได้ง่าย" },
        { id: "ux_18", text: "ฉันสามารถใช้งานส่วนต่าง ๆ ของระบบได้โดยไม่สับสน" },
        { id: "ux_19", text: "คำสั่ง คำแนะนำ และข้อความที่แสดงในระบบมีความชัดเจน" },
        { id: "ux_20", text: "การโต้ตอบกับกิจกรรมและสถานการณ์ต่าง ๆ ในระบบทำได้อย่างสะดวก" },
        {
          id: "ux_21",
          text: "การเปลี่ยนจากกิจกรรมหนึ่งไปยังอีกกิจกรรมหนึ่งในระบบมีความต่อเนื่องและเข้าใจง่าย",
        },
        { id: "ux_22", text: "ระบบตอบสนองต่อการกระทำหรือคำตอบของฉันได้อย่างเหมาะสม" },
        { id: "ux_23", text: "องค์ประกอบต่าง ๆ บนหน้าจอช่วยให้ฉันทราบว่าควรทำอะไรต่อไป" },
        {
          id: "ux_24",
          text: "โดยรวม ฉันรู้สึกว่าระบบนี้ใช้งานง่ายและเหมาะสมสำหรับการฝึก Constructive Feedback",
        },
      ],
    },
  ],
};

// A 5th questionnaire slots in here later — nothing else needs to change.
export const QUESTIONNAIRES: QuestionnaireDef[] = [LME, SSS, SRL, UX];

export function questionnaireItems(def: QuestionnaireDef): QuestionnaireItem[] {
  return def.dimensions.flatMap((d) => d.items);
}

export function answeredCount(def: QuestionnaireDef, answers: Record<string, number>): number {
  return questionnaireItems(def).filter((it) => typeof answers[it.id] === "number").length;
}

export function isQuestionnaireComplete(
  def: QuestionnaireDef,
  answers: Record<string, number>,
): boolean {
  return answeredCount(def, answers) === questionnaireItems(def).length;
}

export function isAllQuestionnairesComplete(
  completed: Partial<Record<QuestionnaireKey, boolean>> | null | undefined,
): boolean {
  return QUESTIONNAIRES.every((def) => !!completed?.[def.key]);
}

export interface QuestionnaireResult {
  key: QuestionnaireKey;
  version: string;
  submittedAt: string;
  overallMean: number;
  dimensionMeans: Record<string, number>;
  answers: Record<string, number>;
}

// Dimension Mean = sum of its items ÷ item count; Overall Mean = total ÷ item
// count — the exact formulas from each instrument's scoring sheet. No hidden
// answer key: these are self-report scales, not graded.
export function scoreQuestionnaire(
  def: QuestionnaireDef,
  answers: Record<string, number>,
): QuestionnaireResult {
  const dimensionMeans: Record<string, number> = {};
  let total = 0;
  let count = 0;
  for (const dim of def.dimensions) {
    let dimSum = 0;
    for (const item of dim.items) {
      const v = answers[item.id] ?? 0;
      dimSum += v;
      total += v;
      count += 1;
    }
    dimensionMeans[dim.key] = Number((dimSum / dim.items.length).toFixed(2));
  }
  return {
    key: def.key,
    version: QUESTIONNAIRES_VERSION,
    submittedAt: new Date().toISOString(),
    overallMean: Number((total / count).toFixed(2)),
    dimensionMeans,
    answers,
  };
}
