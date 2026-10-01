export const MINI_GAME_VERSION = "m5-reflect-grow-2026-10-v1";
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
    title: "Read Your Own Performance",
    situation: "ระบบแสดงตัวอย่าง Performance ของ Dr. Maya หลังจากให้ Feedback แก่นักศึกษา",
    cues: [
      "Dr. Maya พูดว่า: “โครงสร้างการนำเสนอของคุณชัดเจนค่ะ แต่ช่วงอธิบายผลยังพูดค่อนข้างเร็ว ลองเว้นจังหวะหลังประเด็นสำคัญ และสังเกตว่าผู้ฟังตามทันหรือไม่ ครั้งหน้าลองฝึกช่วงนี้อีกครั้งนะคะ”",
      "Specific Feedback: ✓",
      "Actionable Guidance: ✓",
      "Supportive Language: ✓",
      "Speaking Pace: Fast",
      "Pause after key feedback point: Very short",
      "นักศึกษาพยักหน้า แต่ยังไม่มีโอกาสพูดหรือสะท้อนความคิดเห็นของตนเอง",
    ],
    success:
      "การสะท้อนที่ดีไม่ใช่การตัดสินว่า ‘ฉันเก่งหรือไม่เก่ง’ แต่คือการใช้ Evidence เพื่อค้นหาว่าอะไรควรรักษาไว้ และอะไรควรทดลองเปลี่ยน",
    steps: [
      {
        title: "Identify the Strength",
        prompt: "จากข้อมูลที่ปรากฏ จุดแข็งที่ชัดเจนที่สุดของ Feedback นี้คือข้อใด?",
        kind: "single",
        correct: [0],
        points: 1,
        achievements: ["Strength Identified"],
        options: [
          option(
            "Feedback มีความเฉพาะเจาะจงและมีแนวทางที่ผู้เรียนสามารถนำไปใช้ได้",
            "ถูกต้องค่ะ Dr. Maya ระบุพฤติกรรมที่สังเกตได้ และเสนอแนวทางที่ผู้เรียนสามารถทดลองใช้ได้จริง",
            "",
            ["strength_identified"],
          ),
          option(
            "Dr. Maya พูดเร็ว ทำให้ Feedback กระชับ",
            "ความกระชับอาจมีประโยชน์ แต่ข้อมูลแสดงว่า Speaking Pace ที่เร็วเป็นประเด็นที่ควรพัฒนา ไม่ใช่จุดแข็งหลัก",
            "ลองแยกระหว่าง ‘พูดสั้น’ กับ ‘Feedback ที่มีคุณภาพ’ แล้วมองหาหลักฐานเกี่ยวกับ Specificity และ Actionability",
            ["misread_pace"],
          ),
          option(
            "นักศึกษาพยักหน้า แสดงว่าเข้าใจ Feedback ทุกอย่างแล้ว",
            "การพยักหน้าเพียงอย่างเดียวยังไม่เพียงพอที่จะสรุปว่าผู้เรียนเข้าใจ Feedback ทั้งหมด",
            "อย่าตีความพฤติกรรมเพียงอย่างเดียวเกินกว่าหลักฐานที่มี ลองดูคุณลักษณะของ Feedback ที่ระบบวิเคราะห์โดยตรง",
            ["overreads_nod"],
          ),
          option(
            "Dr. Maya เป็นผู้พูดตลอด ทำให้ควบคุมบทสนทนาได้ดี",
            "การเป็นผู้พูดตลอดไม่ได้หมายถึง Feedback มีประสิทธิผล และอาจลดโอกาสที่ผู้เรียนจะสะท้อนหรือมีส่วนร่วม",
            "Feedback ที่ดีไม่จำเป็นต้องเป็นการสื่อสารทางเดียว ลองมองหาสิ่งที่ช่วยให้ผู้เรียนรู้ว่าจะพัฒนาอะไรและอย่างไร",
            ["one_way"],
          ),
        ],
      },
      {
        title: "Identify the Development Need",
        prompt: "จาก Evidence สิ่งใดควรเป็นจุดพัฒนาหลักของ Dr. Maya?",
        kind: "single",
        correct: [2],
        points: 1,
        achievements: ["Development Need Identified"],
        options: [
          option(
            "เพิ่มคำชมให้มากขึ้น",
            "ข้อมูลไม่ได้แสดงว่าปัญหาหลักคือการขาดคำชม เพราะ Feedback มี Supportive Language อยู่แล้ว",
            "เลือกจุดพัฒนาจากสิ่งที่ Evidence แสดงว่า ‘ยังขาด’ มากกว่าสิ่งที่คิดว่าน่าจะดีโดยทั่วไป",
            ["wrong_focus"],
          ),
          option(
            "พูดให้ละเอียดและยาวขึ้น",
            "Feedback ที่ยาวขึ้นไม่ได้หมายความว่าจะมีคุณภาพมากขึ้น และไม่ได้แก้ปัญหาที่ข้อมูลแสดงอยู่",
            "ดูที่ Speaking Pace, Pause และโอกาสที่ผู้เรียนได้มีส่วนร่วม",
            ["wrong_focus"],
          ),
          option(
            "ปรับจังหวะการพูดและเปิดพื้นที่ให้ผู้เรียนสะท้อนความเข้าใจ",
            "ถูกต้องค่ะ Evidence แสดงทั้งการพูดเร็ว การเว้นจังหวะสั้น และการที่ผู้เรียนยังไม่มีโอกาสสะท้อนความคิดเห็น",
            "",
            ["development_need_identified"],
          ),
          option(
            "หลีกเลี่ยงการให้ Feedback ทันทีหลัง Performance",
            "ข้อมูลไม่ได้แสดงว่า Timing เป็นปัญหาหลักในสถานการณ์นี้",
            "อย่าเลือกสิ่งที่เคยเรียนใน Module ก่อนหน้าเพียงเพราะเป็นหลักการสำคัญ ให้เลือกจาก Evidence ของ Performance นี้",
            ["wrong_module"],
          ),
        ],
      },
      {
        title: "Choose the Best Reflection",
        prompt: "ข้อใดเป็นการสะท้อนตนเองที่มีคุณภาพมากที่สุด?",
        kind: "single",
        correct: [2],
        points: 1,
        achievements: ["Evidence-Based Reflection"],
        options: [
          option(
            "“ฉันคิดว่าฉันให้ Feedback ได้ดีแล้ว”",
            "Reflection นี้เป็นการประเมินโดยรวม แต่ยังไม่ได้ใช้ Evidence หรือระบุสิ่งที่จะพัฒนา",
            "Reflection ที่ดีควรตอบได้ทั้ง ‘อะไรทำได้ดี?’ และ ‘อะไรควรเปลี่ยนครั้งต่อไป?’",
            ["global_judgment"],
          ),
          option(
            "“ฉันพูดเร็วเกินไป ฉันให้ Feedback ไม่เก่ง”",
            "คุณมองเห็นจุดที่ควรพัฒนาแล้ว แต่กำลังเปลี่ยนพฤติกรรมหนึ่งอย่างให้กลายเป็นการตัดสินความสามารถของตนเอง",
            "สะท้อนที่พฤติกรรม ไม่ใช่ตัดสินตัวเอง แล้วระบุสิ่งที่สามารถทดลองเปลี่ยนได้",
            ["self_judgment"],
          ),
          option(
            "“ฉันให้ Feedback ที่เฉพาะเจาะจงและมีแนวทางที่นำไปใช้ได้ แต่พูดค่อนข้างเร็วและยังไม่ได้เปิดโอกาสให้ผู้เรียนสะท้อน ครั้งต่อไปฉันจะเว้นจังหวะและถามผู้เรียนว่าเขาเข้าใจหรือวางแผนจะนำ Feedback ไปใช้อย่างไร”",
            "ยอดเยี่ยมค่ะ Reflection นี้มองเห็นทั้ง Strength และ Area for Improvement และเชื่อมไปสู่พฤติกรรมที่จะทดลองเปลี่ยนครั้งต่อไป",
            "",
            ["evidence_based"],
          ),
          option(
            "“ครั้งหน้าฉันจะพยายามทำให้ดีกว่านี้”",
            "มีความตั้งใจที่จะพัฒนา แต่ยังไม่ชัดว่าคุณจะเปลี่ยนพฤติกรรมใด",
            "แทนคำว่า ‘ทำให้ดีขึ้น’ ลองระบุว่าครั้งหน้าจะ ‘ทำอะไรต่างจากเดิม’",
            ["vague_intent"],
          ),
        ],
      },
    ],
  },
  {
    title: "Turn Reflection into a Goal",
    situation: "จาก Round 1 Dr. Maya ระบุว่า: “ฉันพูดเร็วและยังเปิดพื้นที่ให้ผู้เรียนสะท้อนน้อยเกินไป”",
    cues: [],
    success:
      "Reflection จะนำไปสู่การพัฒนาได้มากขึ้น เมื่อเปลี่ยนสิ่งที่ค้นพบให้เป็นเป้าหมายที่ชัดเจน และมี Evidence สำหรับตรวจสอบความก้าวหน้า",
    steps: [
      {
        title: "Choose the Best Goal",
        prompt: "เป้าหมายใดจะช่วยให้ Dr. Maya พัฒนาได้ชัดเจนที่สุด?",
        kind: "single",
        correct: [2],
        points: 1,
        achievements: ["Specific Goal", "Observable Goal", "Action-Oriented Goal"],
        options: [
          option(
            "“ฉันจะเป็นผู้ให้ Feedback ที่ดีขึ้น”",
            "เป้าหมายนี้มีทิศทางที่ดีแต่กว้างเกินไปจนยากที่จะรู้ว่าต้องเปลี่ยนพฤติกรรมใด",
            "เป้าหมายที่นำไปใช้ได้ควรบอกว่าคุณจะ ‘ทำอะไร’ ให้ต่างจากเดิม",
            ["too_broad"],
          ),
          option(
            "“ฉันจะพยายามพูดให้ดีขึ้นและใจเย็นขึ้น”",
            "เป้าหมายเริ่มเฉพาะเจาะจงขึ้น แต่คำว่า ‘ดีขึ้น’ และ ‘ใจเย็นขึ้น’ ยังสังเกตหรือประเมินได้ยาก",
            "เปลี่ยนความตั้งใจให้เป็นพฤติกรรมที่มองเห็นหรือสังเกตได้ เช่น เว้นจังหวะ หรือใช้คำถาม",
            ["unobservable"],
          ),
          option(
            "“ในการให้ Feedback ครั้งต่อไป ฉันจะเว้นจังหวะหลังประเด็นสำคัญ และใช้คำถามอย่างน้อยหนึ่งคำถามเพื่อให้ผู้เรียนสะท้อนความเข้าใจก่อนจบบทสนทนา”",
            "ถูกต้องค่ะ เป้าหมายนี้ระบุทั้งพฤติกรรมและสถานการณ์ที่จะนำไปใช้ ทำให้สามารถสังเกตและสะท้อนผลภายหลังได้",
            "",
            ["specific_observable"],
          ),
          option(
            "“ฉันจะไม่พูดเร็วอีกเลย”",
            "เป้าหมายนี้ชัด แต่เป็นแบบ absolute และอาจไม่สมจริง เพราะความเร็วในการพูดเปลี่ยนไปตามสถานการณ์",
            "แทนที่จะตั้งเป้าว่า ‘จะไม่ทำอีกเลย’ ลองกำหนดพฤติกรรมเชิงบวกที่สามารถฝึกและสังเกตได้",
            ["absolute"],
          ),
        ],
      },
      {
        title: "How Will You Know?",
        prompt: "ข้อมูลใดจะช่วยให้ Dr. Maya ตรวจสอบได้ดีที่สุดว่าเป้าหมายนี้เกิดขึ้นจริงหรือไม่?",
        kind: "single",
        correct: [1],
        points: 1,
        achievements: ["Evidence for Goal"],
        options: [
          option(
            "ความรู้สึกหลังจบว่า “วันนี้น่าจะทำได้ดี”",
            "ความรู้สึกของตนเองมีประโยชน์ต่อ Reflection แต่เพียงอย่างเดียวยังไม่ใช่หลักฐานที่ชัดเจนของพฤติกรรม",
            "ลองเลือกข้อมูลที่สามารถสังเกตหรือทบทวนได้ว่าคุณเว้นจังหวะและเปิดพื้นที่ให้ผู้เรียนจริงหรือไม่",
            ["feeling_only"],
          ),
          option(
            "จำนวนครั้งที่เว้นจังหวะและใช้คำถามสะท้อน รวมถึงข้อมูลจากการบันทึกหรือระบบวิเคราะห์การให้ Feedback",
            "ถูกต้องค่ะ เป้าหมายที่ดีควรเชื่อมกับ Evidence ที่ช่วยให้เราตรวจสอบพฤติกรรมของตนเองได้",
            "",
            ["evidence_based"],
          ),
          option(
            "คะแนนของผู้เรียนในการสอบครั้งถัดไปเพียงอย่างเดียว",
            "ผลการเรียนของผู้เรียนมีหลายปัจจัย และไม่สามารถบอกได้โดยตรงว่า Dr. Maya ปรับพฤติกรรมการให้ Feedback ตามเป้าหมายหรือไม่",
            "เลือกข้อมูลที่ใกล้กับพฤติกรรมที่กำลังพัฒนามากที่สุด",
            ["indirect_measure"],
          ),
          option(
            "จำนวนคำที่ Dr. Maya พูดทั้งหมด",
            "จำนวนคำไม่ได้บอกโดยตรงว่า Dr. Maya เว้นจังหวะหรือเปิดโอกาสให้ผู้เรียนสะท้อนหรือไม่",
            "วัดสิ่งที่ตรงกับ Goal เช่น Pause และ Reflective Question",
            ["unrelated_measure"],
          ),
        ],
      },
      {
        title: "Choose the Best Reflection Question",
        prompt: "หลังการฝึกครั้งถัดไป ระบบควรถาม Dr. Maya ว่าอย่างไร?",
        kind: "single",
        correct: [1],
        points: 1,
        achievements: ["Goal-Based Reflection"],
        options: [
          option(
            "“คุณทำได้ดีไหม?”",
            "คำถามนี้กว้างและมีแนวโน้มทำให้ตอบเพียง ‘ดี’ หรือ ‘ไม่ดี’",
            "ใช้คำถามที่พากลับไปดูพฤติกรรมตาม Goal ที่ตั้งไว้",
            ["too_broad"],
          ),
          option(
            "“วันนี้คุณเว้นจังหวะหลังประเด็นสำคัญและเปิดโอกาสให้ผู้เรียนสะท้อนอย่างไร? อะไรได้ผล และอะไรที่คุณอยากปรับในครั้งต่อไป?”",
            "ดีมากค่ะ คำถามนี้เชื่อม Reflection กลับไปยัง Goal และเปิดพื้นที่สำหรับการพัฒนารอบต่อไป",
            "",
            ["goal_based"],
          ),
          option(
            "“ผู้เรียนชอบ Feedback ของคุณหรือไม่?”",
            "ความพึงพอใจของผู้เรียนเป็นข้อมูลหนึ่ง แต่ไม่ได้สะท้อนโดยตรงว่าเป้าหมายด้าน Pause และ Reflection เกิดขึ้นหรือไม่",
            "ถามถึงพฤติกรรมที่คุณตั้งใจฝึกก่อน แล้วจึงใช้ perception ของผู้เรียนเป็นข้อมูลประกอบ",
            ["indirect_measure"],
          ),
          option(
            "“ครั้งหน้าคุณจะพยายามมากขึ้นไหม?”",
            "ความพยายามเป็นสิ่งสำคัญ แต่คำถามนี้ยังไม่ช่วยให้ระบุว่าอะไรควรรักษาหรือเปลี่ยน",
            "Reflection ควรเชื่อม Evidence → Goal → Next Action",
            ["too_broad"],
          ),
        ],
      },
    ],
  },
  {
    title: "Build Your Development Plan",
    situation: "ระบบแสดง Feedback Performance Summary ของ Dr. Maya",
    cues: [
      "Strengths: ✓ Specific Feedback, ✓ Respectful Language, ✓ Actionable Guidance",
      "Development Area: △ Speaking Pace, △ Pause Time, △ Learner Reflection",
    ],
    success:
      "การพัฒนาทักษะ Feedback ไม่ได้เกิดจากการฝึกเพียงครั้งเดียว แต่เกิดจากการฝึก ดูข้อมูลสะท้อน ปรับ และทดลองใหม่อย่างต่อเนื่อง",
    steps: [
      {
        title: "Choose the Best Practice Strategy",
        prompt: "วิธีฝึกใดสอดคล้องกับเป้าหมายของ Dr. Maya มากที่สุด?",
        kind: "single",
        correct: [1],
        points: 1,
        achievements: ["Practice Strategy"],
        options: [
          option(
            "อ่านบทความเกี่ยวกับ Feedback เพิ่มอีกหลายบทความ",
            "การเพิ่มความรู้มีประโยชน์ แต่ Development Gap ในสถานการณ์นี้เป็นพฤติกรรมการสื่อสารที่ต้องอาศัยการฝึก",
            "เลือกกิจกรรมที่เปิดโอกาสให้ Dr. Maya ได้ ‘ทำ’ พฤติกรรมที่ต้องการพัฒนา และได้รับข้อมูลกลับมา",
            ["knowledge_only"],
          ),
          option(
            "ฝึก Feedback ในสถานการณ์จำลอง บันทึกการพูด แล้วทบทวน Pace, Pause และ Reflective Questions หลังการฝึก",
            "ถูกต้องค่ะ วิธีนี้เชื่อม Practice กับ Evidence และ Reflection โดยตรง",
            "",
            ["practice_strategy"],
          ),
          option(
            "เตรียม Script Feedback แบบเต็มทุกคำแล้วอ่านตาม Script",
            "Script อาจช่วยเตรียมโครงสร้าง แต่การอ่านตามทุกคำอาจไม่ช่วยพัฒนาการตอบสนองอย่างเป็นธรรมชาติหรือการเปิดพื้นที่ให้ผู้เรียน",
            "ใช้ Prompt หรือ Checklist ได้ แต่ควรมีการฝึกสนทนาและปรับตามการตอบสนองของผู้เรียน",
            ["scripted"],
          ),
          option(
            "หลีกเลี่ยงสถานการณ์ Feedback ที่ซับซ้อนจนกว่าจะมั่นใจมากขึ้น",
            "การหลีกเลี่ยงอาจลดความกังวล แต่ลดโอกาสในการฝึกพฤติกรรมที่ต้องการพัฒนา",
            "เลือกพื้นที่ฝึกที่ปลอดภัย เช่น Simulation หรือ VR เพื่อทดลองและเรียนรู้จากข้อผิดพลาด",
            ["avoidance"],
          ),
        ],
      },
      {
        title: "Choose the Best Development Plan",
        prompt: "แผนพัฒนาข้อใดมีความชัดเจนและนำไปใช้ได้มากที่สุด?",
        kind: "single",
        correct: [1],
        points: 2,
        achievements: ["Goal", "Practice", "Evidence", "Reflection"],
        options: [
          option(
            "“ฉันจะพัฒนา Feedback ของตัวเองให้ดีที่สุด”",
            "เป็นความตั้งใจที่ดี แต่ยังไม่มี Goal, Practice หรือ Evidence ที่ชัดเจน",
            "Development Plan ควรตอบอย่างน้อยว่า ‘จะพัฒนาอะไร?’ ‘จะฝึกอย่างไร?’ และ ‘จะรู้ได้อย่างไรว่าดีขึ้น?’",
            ["too_broad"],
          ),
          option(
            "“ฉันจะฝึกให้ Feedback ในสถานการณ์จำลอง โดยเน้นการเว้นจังหวะและใช้คำถามสะท้อน หลังการฝึกฉันจะทบทวนข้อมูลการพูดและบันทึกว่าอะไรทำได้ดี อะไรควรปรับ แล้วนำไปทดลองอีกครั้งในการฝึกรอบถัดไป”",
            "ยอดเยี่ยมค่ะ แผนนี้เชื่อม Goal, Practice, Evidence และ Reflection เข้าด้วยกันเป็นวงจรการพัฒนา",
            "",
            ["full_cycle"],
          ),
          option(
            "“ฉันจะพยายามจำหลักการทั้งหมดให้ได้ก่อนให้ Feedback”",
            "ความรู้เป็นพื้นฐานสำคัญ แต่การพัฒนาทักษะต้องอาศัยการนำหลักการไปใช้และสะท้อนจาก Performance จริง",
            "เปลี่ยนจาก ‘จำ’ เป็น ‘Practice → Review → Adjust’",
            ["knowledge_only"],
          ),
          option(
            "“ฉันจะขอให้ผู้เรียนบอกทุกครั้งว่า Feedback ของฉันดีหรือไม่”",
            "ความคิดเห็นของผู้เรียนเป็นข้อมูลที่มีประโยชน์ แต่ไม่ควรเป็น Evidence เพียงแหล่งเดียว",
            "รวมหลายแหล่งข้อมูล เช่น Self-Reflection, Performance Data และ Learner Response เพื่อเห็นภาพการพัฒนาที่ชัดขึ้น",
            ["single_source"],
          ),
        ],
      },
      {
        title: "Complete the Growth Cycle",
        prompt: "Practice → Feedback Data → ______ → Adjust → Practice Again ขั้นตอนใดควรเติมลงในช่องว่าง?",
        kind: "single",
        correct: [0],
        points: 1,
        achievements: ["Growth Cycle Complete"],
        options: [
          option(
            "Reflection",
            "ถูกต้องค่ะ Data จะมีคุณค่าต่อการพัฒนาเมื่อเรานำมาสะท้อน ตัดสินใจว่าจะปรับอะไร แล้วกลับไปทดลองอีกครั้ง",
            "",
            ["growth_cycle"],
          ),
          option(
            "Judgment",
            "เป้าหมายของข้อมูลไม่ใช่การตัดสินว่าคุณ ‘ดี’ หรือ ‘ไม่ดี’ แต่คือการช่วยให้เห็นสิ่งที่ควรพัฒนา",
            "ขั้นตอนนี้ควรช่วยเปลี่ยน Data ให้กลายเป็นความเข้าใจเกี่ยวกับ Performance ของตนเอง",
            ["judgment"],
          ),
          option(
            "Comparison with Others",
            "การเปรียบเทียบกับผู้อื่นอาจให้ข้อมูลบางอย่าง แต่ไม่ใช่หัวใจของวงจรการพัฒนาตนเอง",
            "กลับไปที่คำถามว่า ‘ข้อมูลนี้บอกอะไรเกี่ยวกับ Performance ของฉัน และฉันจะปรับอะไร?’",
            ["comparison"],
          ),
          option(
            "Finish",
            "การพัฒนาทักษะ Feedback ไม่สิ้นสุดหลังได้รับข้อมูลหนึ่งครั้ง",
            "คิดเป็นวงจร ไม่ใช่เส้นตรง: หลังได้รับ Data ต้องมีขั้นตอนที่ช่วยให้ตัดสินใจว่าจะปรับอะไร ก่อนกลับไปฝึกอีกครั้ง",
            ["premature_finish"],
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
