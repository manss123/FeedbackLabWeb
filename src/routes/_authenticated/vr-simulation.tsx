import { deferredEffect } from "@/lib/deferred-effect";
import { useLearningTiming } from "@/hooks/use-learning-timing";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Loader2,
  Headset,
  Mic,
  MicOff,
  Square,
  Play,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  MessageSquare,
  Sparkles,
  User,
  Volume2,
  RefreshCw,
  Target,
  Lightbulb,
  Award,
} from "lucide-react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import { LearnerShell } from "@/components/learner-shell";
import { UnityPlayer } from "@/components/UnityPlayer";
import { completeVrScenario, getLearnerOverview } from "@/lib/learner.functions";
import {
  generateCoachingReportFn,
  generateFinalSummaryFn,
  generateRoundTwoReportFn,
} from "@/lib/ai.functions";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import type {
  CoachingReport,
  Emotion,
  FinalSummaryReport,
  PresentationContext,
  RoundTwoReport,
} from "@/types/unity.types";
import { toast } from "sonner";
import { createSession, updateSession } from "@/lib/firestore";
import { logActivity } from "@/lib/activity";
import { Timestamp, serverTimestamp } from "firebase/firestore";

export const Route = createFileRoute("/_authenticated/vr-simulation")({
  head: () => ({
    meta: [
      { title: "Web-based VR Simulation — My Feedback Lab" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VrSimulationPage,
});

// ============================================================
// Scenarios
// ============================================================

export interface Scenario {
  id: string;
  order: number;
  title: string;
  studentName: string;
  studentAvatar: string; // color seed
  persona: string;
  emotion: string;
  courseContext: string;
  activity: string;
  difficulty: number; // 1-5
  estimatedMinutes: string;
  studentLineFirst: string;
  studentLineRetry: string;
  behaviors: string[];
  // The exact script the student presented in Unity for this scenario, when
  // known — sent to the LLM alongside the teacher's transcript so it can
  // judge feedback against what was actually presented (not just generic
  // feedback quality). Only populated for scenarios with a real built scene.
  presentationScript?: string;
  // Scenario-specific coaching criteria from that scenario's Instructional
  // Design Manual (Assessment Focus + Expected Learner Behaviour) — sent to
  // the LLM as the lens for interpreting the 4 rubric dimensions (see
  // PresentationContext.assessmentFocus in unity.types.ts). The rubric
  // dimensions themselves never change per-scenario, only how the LLM reads
  // them. Optional — scenarios without one get the generic rubric wording.
  assessmentFocus?: string;
}

const SCENARIOS: Scenario[] = [
  {
    id: "s1",
    order: 1,
    title: "Routine Classroom Feedback — เมย์นำเสนอ Mini Presentation",
    studentName: "เมย์",
    studentAvatar: "linear-gradient(135deg,#a8dadc,#457b9d)",
    persona: "นักศึกษาปี 1",
    emotion: "ตื่นเต้น · อยากได้คำแนะนำ",
    courseContext: "วิชา ‘การออกแบบการเรียนรู้ด้วยเทคโนโลยีดิจิทัล’",
    activity: "Mini Presentation 3 นาที",
    difficulty: 1,
    estimatedMinutes: "7–9 นาที",
    studentLineFirst: "อาจารย์คะ หนูมีอะไรที่ควรปรับปรุงเพิ่มเติมไหมคะ",
    studentLineRetry: "ขอบคุณค่ะอาจารย์ — รอบนี้หนูตั้งใจฟังเต็มที่เลยค่ะ",
    behaviors: ["พูดเร็ว", "อ่านสไลด์", "สบตาน้อย"],
    presentationScript:
      'สวัสดีค่ะอาจารย์ และเพื่อน ๆ ทุกคน วันนี้หนูจะนำเสนอหัวข้อ "การประยุกต์ใช้ AI เพื่อส่งเสริมการเรียนรู้ในห้องเรียน ' +
      "ปัจจุบัน AI เข้ามามีบทบาทในการศึกษามากขึ้น เช่น ChatGPT, Gemini และระบบ AI Tutor " +
      "เครื่องมือเหล่านี้สามารถช่วยอธิบายบทเรียน ตอบคำถาม และให้ข้อเสนอแนะกับนักเรียนได้อย่างรวดเร็ว " +
      "ตัวอย่างกิจกรรมคือ ให้นักเรียนใช้ ChatGPT เพื่อช่วยระดมความคิดในการเขียนเรียงความ " +
      "จากนั้นนักเรียนต้องตรวจสอบความถูกต้องและปรับปรุงด้วยตนเอง " +
      "วิธีนี้จะช่วยให้นักเรียนได้ฝึกคิดวิเคราะห์ ไม่ใช่คัดลอกคำตอบจาก AI " +
      "อย่างไรก็ตาม ครูควรสอนนักเรียนให้ใช้ AI อย่างมีจริยธรรม และตรวจสอบข้อมูลจากหลายแหล่ง " +
      "สุดท้าย หนูคิดว่า AI จะเป็นผู้ช่วยครู ไม่ใช่มาแทนครูค่ะ ขอบคุณค่ะ",
    assessmentFocus:
      "Scenario นี้คือ Foundational/Routine Constructive Feedback (Level 1) — เมย์นำเสนอได้ดีในภาพรวม " +
      "(เนื้อหาถูกต้อง โครงสร้างการนำเสนอดี พูดชัดเจน ยกตัวอย่างเหมาะสม) แต่มีจุดที่ควรปรับ (พูดเร็ว อ่านจากสไลด์ " +
      "สบตาผู้ฟังน้อย ไม่มีการเว้นจังหวะ) Assessment Focus อ้างอิงจากเอกสารต้นฉบับ (Instructional Design Manual + " +
      "AI Functional Specification + เอกสารเปรียบเทียบ Self Reflection and AI ที่จับคู่ 8 ข้อ self-reflection " +
      "กับสัญญาณที่ AI วิเคราะห์จริง) ให้ใช้แนวทางนี้ตีความ 4 มิติของ rubric โดยครอบคลุมสัญญาณทั้ง 8 ข้อจากเอกสารครบถ้วนดังนี้:\n" +
      "- speechClarity: ความชัดเจนของถ้อยคำ ความกระชับ ไม่มีคำซ้ำหรือประโยคที่ไม่จำเป็น (ข้อ 5 — Conciseness: " +
      "Sentence Length + Redundancy + Word Count) และจังหวะ/ความเร็วในการพูดที่ช่วยให้ผู้ฟังติดตามทัน (ข้อ 6 — " +
      "Speech Rate + Pause — ไม่รวม Voice Clarity เพราะระบบไม่ได้วิเคราะห์เสียงโดยตรง มีแค่ transcript)\n" +
      "- linguisticAppropriateness: การใช้ภาษาที่เหมาะสมสุภาพให้เกียรติผู้เรียน ไม่ใช้ถ้อยคำเชิงลบหรือตัดสิน (ข้อ 8 — " +
      "Sentiment + Encouragement Score + Negative Keywords + Respectful Language) และน้ำเสียงที่เป็นมิตร สร้างแรงจูงใจ (Emotional Tone)\n" +
      "- balance: โครงสร้างของ feedback ครบตามลำดับที่คาดหวังหรือไม่ (ข้อ 1 และ ข้อ 4 — Feedback Structure) — " +
      "Positive Opening → Specific Strength → Specific Improvement → Action Suggestion → Encouraging Closing " +
      "โดยต้องระบุสิ่งที่ควรพัฒนาอย่างชัดเจนและเฉพาะเจาะจงจริง ๆ ไม่ใช่พูดผ่าน ๆ (ข้อ 2 — Specific Improvement) " +
      "มีทั้งจุดแข็งและจุดที่ควรพัฒนาอย่างเป็นระบบ ไม่ใช่ชมอย่างเดียวหรือติอย่างเดียว\n" +
      "- intentConsistency: ข้อเสนอแนะ (ข้อ 3 — Action Suggestion) เจาะจงและนำไปปฏิบัติได้จริงหรือไม่ ช่วยให้นักศึกษารู้ว่า " +
      "ควรทำอะไรต่อ ไม่ใช่คำแนะนำกว้าง ๆ และเมื่อมองจากมุมมองผู้รับ (ข้อ 7 — มุมมองผู้รับ: Specific Strength + " +
      "Specific Improvement + Action Suggestion ที่ประกอบกัน) นักศึกษาจะเข้าใจชัดเจนหรือไม่ว่าตนเองทำอะไรได้ดีและควรปรับปรุงอะไรต่อไป\n" +
      "ตัวอย่างการตีความจากเอกสาร: feedback ที่ชมอย่างเดียวไม่มีแนวทางพัฒนา (เช่น มีแต่กำลังใจ ไม่มีข้อเสนอแนะ) " +
      "แม้จะฟังดูดีก็ต้องให้คะแนน balance/intentConsistency ต่ำ เพราะนักศึกษาจะไม่รู้ว่าควรพัฒนาอะไรต่อ และ " +
      'ข้อเสนอแนะที่กว้างเกินไปเช่น "ลองพัฒนาต่อ" ถือว่ายังไม่เพียงพอ ต้องเจาะจงกว่านี้ เช่น "ลองเว้นจังหวะก่อนเริ่มประเด็นใหม่" หรือ "ครั้งหน้าลองเพิ่มตัวอย่างจากงานวิจัยอีก 1–2 เรื่อง"',
  },
  {
    id: "s2",
    order: 2,
    title: "Positive Feedback after Student Success — พาล์มนำเสนอ Design Thinking",
    studentName: "พาล์ม",
    studentAvatar: "linear-gradient(135deg,#ffd166,#f4a300)",
    persona: "นักศึกษาปี 2 · มั่นใจ เตรียมตัวมาดี",
    emotion: "มั่นใจ · ภูมิใจในผลงาน",
    courseContext: "วิชา ‘การออกแบบการเรียนรู้ด้วยเทคโนโลยีดิจิทัล’",
    activity: "Mini Presentation 5 นาที",
    difficulty: 2,
    estimatedMinutes: "8–10 นาที",
    studentLineFirst:
      "ขอบคุณครับอาจารย์ วันนี้ผมตั้งใจนำข้อเสนอแนะจากครั้งก่อนมาปรับใช้ อยากทราบว่าผมพัฒนาได้ดีขึ้นไหมครับ แล้วมีอะไรที่ผมสามารถต่อยอดได้อีกบ้างครับ",
    studentLineRetry: "ขอบคุณครับอาจารย์ รอบนี้ผมจะลองพัฒนาต่อจากที่อาจารย์แนะนำครับ",
    behaviors: ["สบตาต่อเนื่อง", "ใช้ตัวอย่างจริง", "น้ำเสียงมั่นใจ"],
    presentationScript:
      'สวัสดีครับอาจารย์ และเพื่อน ๆ ทุกคน วันนี้ผมจะนำเสนอหัวข้อ "Design Thinking เพื่อพัฒนานวัตกรรมในห้องเรียน" ' +
      "Design Thinking เป็นกระบวนการที่ช่วยให้ผู้เรียนสามารถแก้ปัญหาโดยยึดผู้ใช้เป็นศูนย์กลาง " +
      "กระบวนการนี้ประกอบด้วย 5 ขั้นตอน ได้แก่ Empathize, Define, Ideate, Prototype และ Test " +
      "ตัวอย่างที่ผมเลือกคือการออกแบบห้องสมุดของโรงเรียนใหม่ " +
      "นักเรียนเริ่มจากการสัมภาษณ์เพื่อน ๆ เพื่อค้นหาปัญหา จากนั้นช่วยกันระดมความคิดและสร้างต้นแบบ ก่อนจะนำมาทดลองใช้จริง " +
      "กิจกรรมลักษณะนี้ไม่ได้ช่วยเพียงให้ผู้เรียนคิดสร้างสรรค์เท่านั้น แต่ยังช่วยพัฒนาทักษะการทำงานร่วมกัน การสื่อสาร และการแก้ปัญหาอีกด้วย " +
      "หากเป็นทุกคน ทุกคนอยากพัฒนาหรือออกแบบอะไรในโรงเรียนของตัวเองบ้างครับ",
    assessmentFocus:
      "Scenario นี้คือ Positive Developmental Feedback — พาล์มนำเสนอได้ดีมาก โจทย์ไม่ใช่การแก้ไขข้อผิดพลาด " +
      "แต่คือการต่อยอดจุดแข็ง (Competency: Positive Reinforcement) องค์ประกอบที่ต้องประเมิน:\n" +
      '- Specific Praise: ชมอย่างเฉพาะเจาะจง อธิบายว่าอะไรคือจุดแข็งและทำไมถึงเป็นจุดแข็ง ไม่ใช่คำกว้าง ๆ เช่น "ดีมาก" "เยี่ยมเลย"\n' +
      "- Positive Reinforcement: เชื่อมโยงจุดแข็งกับศักยภาพ/การพัฒนาในอนาคตของนักศึกษา\n" +
      "- Balance between Praise and Development: มีทั้งคำชมเฉพาะเจาะจงและข้อเสนอแนะต่อยอด โดยไม่ลดทอนความสำเร็จเดิม\n" +
      "- Future-oriented Suggestion: เสนอแนวทางพัฒนาต่อที่ปฏิบัติได้จริง โดยยังคงความรู้สึกเชิงบวกไว้\n" +
      "- Growth Mindset Communication: ใช้ภาษาที่ส่งเสริมการเติบโต ไม่ใช่แค่ให้กำลังใจลอย ๆ\n" +
      "โครงสร้างที่คาดหวัง: Specific Praise → อธิบายเหตุผลที่ดี → เชื่อมโยงกับศักยภาพอนาคต → ข้อเสนอแนะเชิงพัฒนา → ปิดท้ายด้วย Growth Mindset\n" +
      "ตัวอย่าง Low-quality Feedback ที่ควรให้คะแนนต่ำ (มีแต่คำชมกว้าง ๆ ไม่อธิบายเหตุผล ไม่มีการต่อยอด): " +
      '"ดีมาก เยี่ยมเลย ทำแบบนี้ต่อไปนะ"',
  },
  {
    id: "s3",
    order: 3,
    title:
      "Constructive Feedback after Poor Performance — นารินนำเสนอ AI for Personalized Learning",
    studentName: "นาริน",
    studentAvatar: "linear-gradient(135deg,#c9d6ff,#8e9ede)",
    persona: "นักศึกษาปี 1 · นำเสนอครั้งแรก ขาดความมั่นใจ",
    emotion: "ประหม่า · กังวลว่าทำได้ไม่ดี",
    courseContext: "วิชา ‘การออกแบบการเรียนรู้ด้วยเทคโนโลยีดิจิทัล’",
    activity: "Mini Presentation 5 นาที",
    difficulty: 3,
    estimatedMinutes: "10–12 นาที",
    studentLineFirst:
      "อาจารย์คะ หนูรู้สึกว่าครั้งนี้หนูทำได้ไม่ค่อยดี หนูพยายามซ้อมมาแล้ว แต่พอขึ้นมาหน้าห้อง หนูตื่นเต้นมาก อาจารย์ช่วยแนะนำหนูได้ไหมคะ หนูอยากทำให้ดีขึ้นจริง ๆ ค่ะ",
    studentLineRetry: "ขอบคุณค่ะอาจารย์ หนูจะลองพยายามทำตามที่อาจารย์แนะนำนะคะ",
    behaviors: ["พูดเบา", "อ่านสไลด์เกือบทั้งหมด", "สบตาน้อย"],
    presentationScript:
      "สวัสดีค่ะอาจารย์ และเพื่อน ๆ ทุกคน วันนี้หนูจะนำเสนอหัวข้อ Artificial Intelligence for Personalized Learning " +
      "หรือการนำ AI มาใช้เพื่อสนับสนุนการเรียนรู้แบบเฉพาะบุคคลค่ะ " +
      "AI เป็นเทคโนโลยีที่สามารถช่วยให้ผู้เรียนแต่ละคนได้รับการเรียนรู้ที่เหมาะสมกับความสามารถของตนเองค่ะ " +
      "Personalized Learning คือ... การเรียนรู้ที่... ผู้เรียนแต่ละคนจะเรียนตามความสามารถของตัวเองค่ะ AI จะช่วยเลือกเนื้อหาที่เหมาะสมกับผู้เรียน " +
      "ตัวอย่างของ AI ก็จะมี ChatGPT, AI Tutor, แล้วก็ Adaptive Quiz ค่ะ โปรแกรมพวกนี้จะช่วยตอบคำถาม แล้วก็ช่วยเรียนค่ะ " +
      "AI จะช่วยให้ผู้เรียนเรียนได้ตามความสามารถของตัวเอง แล้วก็ได้รับ Feedback ทันทีค่ะ แล้วก็สามารถเรียนได้ทุกที่ทุกเวลาค่ะ " +
      "แต่ว่า AI ก็มีข้อจำกัดเหมือนกันค่ะ เช่นเรื่องความเป็นส่วนตัว แล้วก็ AI อาจจะให้ข้อมูลที่ไม่ถูกต้องได้ค่ะ แล้วก็ต้องใช้อย่างมีจริยธรรมค่ะ " +
      "สรุปนะคะ AI สามารถช่วยให้การเรียนรู้มีประสิทธิภาพมากขึ้น ถ้าใช้อย่างเหมาะสมค่ะ ขอบคุณค่ะ",
    assessmentFocus:
      "Scenario นี้คือ Constructive Corrective Feedback — นารินนำเสนอได้ไม่ดี (พูดเบา อ่านสไลด์เกือบทั้งหมด " +
      "เนื้อหาบางส่วนคลาดเคลื่อน ตอบคำถามเพื่อนไม่ได้ชัดเจน) โจทย์คือแก้ไขข้อผิดพลาดโดยไม่ทำลายความมั่นใจของผู้เรียน " +
      "(Competency: Constructive Feedback ที่รักษา Psychological Safety) องค์ประกอบที่ต้องประเมิน:\n" +
      "- Language Appropriateness: ใช้ภาษาที่ให้เกียรติผู้เรียน ไม่ตัดสิน ไม่ใช้ถ้อยคำตำหนิ\n" +
      "- Positive Tone of Voice: สร้างความรู้สึกปลอดภัยตั้งแต่เริ่มพูด (Psychological Safety)\n" +
      '- Behavior-focused Feedback: อธิบายข้อผิดพลาดโดยมุ่งเน้นที่ "พฤติกรรม" ไม่ใช่ตัดสิน "ตัวบุคคล"\n' +
      "- Constructive Corrective Feedback: ชี้ข้อผิดพลาดพร้อมแนวทางแก้ไขที่ปฏิบัติได้จริง ไม่ใช่แค่บอกว่าไม่ดี\n" +
      "- Emotional Support: รักษาความมั่นใจและแรงจูงใจของนักศึกษาไว้ ไม่ทำให้รู้สึกหมดกำลังใจหรือถูกตำหนิ\n" +
      "โครงสร้างที่คาดหวัง: สร้างความรู้สึกปลอดภัยก่อน → กล่าวถึงจุดแข็งที่ยังมีอยู่ (กล้าออกมานำเสนอ เตรียมสไลด์เอง " +
      "พยายามตอบคำถาม) → อธิบายพฤติกรรมที่ควรปรับปรุงแบบไม่ตัดสินตัวบุคคล → เสนอแนวทางแก้ไขที่เป็นรูปธรรม → " +
      "ปิดท้ายด้วยกำลังใจ/ความเชื่อมั่นว่าพัฒนาได้\n" +
      "ตัวอย่าง Low-quality Feedback ที่ควรให้คะแนนต่ำ (มีแต่คำตำหนิ ไม่มีจุดแข็งหรือแนวทางแก้ไข ไม่รักษากำลังใจ): " +
      '"ครั้งนี้ยังไม่ดีเลย คุณเตรียมตัวไม่พอ อ่านแต่สไลด์ ต้องกลับไปซ้อมใหม่"',
  },
  {
    id: "s4",
    order: 4,
    title: "Feedback in Emotional Situation — เมย์ผิดหวังหลังทราบผลคะแนน",
    studentName: "เมย์",
    // เมย์คนเดียวกับ Scenario 1 (เอกสารต้นฉบับระบุไว้ชัดเจน) แต่มาในสถานการณ์ที่ต่างออกไป
    // มาก — คราวนี้นักศึกษาเพิ่งทราบผลคะแนน (68/100) ต่ำกว่าคาด และแสดงอารมณ์ผิดหวัง/
    // เริ่มปกป้องตัวเอง โจทย์ของผู้เรียนคือจัดการอารมณ์ก่อน ไม่ใช่วิจารณ์เนื้อหาการนำเสนอ
    studentAvatar: "linear-gradient(135deg,#ffb4a2,#e5717a)",
    persona: "นักศึกษาปี 2 · Perfectionist คาดหวังกับตัวเองสูง เริ่มปกป้องตัวเองหลังผิดหวัง",
    emotion: "ผิดหวัง · เสียใจ · เริ่มปกป้องตัวเอง",
    courseContext: "วิชา ‘การออกแบบการเรียนรู้ด้วยเทคโนโลยีดิจิทัล’",
    activity:
      "Project Presentation หัวข้อ Designing AI-based Learning Activities (ทราบผลคะแนน 68/100)",
    difficulty: 4,
    estimatedMinutes: "10–12 นาที",
    studentLineFirst:
      "อาจารย์คะ... หนูเห็นคะแนนแล้วค่ะ หนูได้ 68 คะแนน... หนูไม่เข้าใจ... หนูตั้งใจทำโปรเจกต์นี้มาก หนูใช้เวลาหลายสัปดาห์เลยค่ะ หนูคิดว่าหนูทำได้ดีกว่านี้ อาจารย์คิดว่าหนูทำไม่ได้จริง ๆ เหรอคะ",
    studentLineRetry: "ขอบคุณค่ะอาจารย์... หนูเข้าใจมากขึ้นแล้วค่ะ หนูอยากลองปรับปรุงดูค่ะ",
    behaviors: ["หลีกเลี่ยงการสบตา", "น้ำเสียงสั่นเล็กน้อย", "กอดอก"],
    // Scenario นี้ไม่มี "การนำเสนอ" ให้วิจารณ์เหมือน S1-S3 — presentationScript ที่นี่คือ
    // คำพูดเชิงอารมณ์ของเมย์ตอนเดินเข้ามาหาอาจารย์หลังทราบคะแนน (Scene 1 NPC Dialogue
    // เต็มจากเอกสาร VR Scenario Script) ส่งให้ LLM เพื่อให้รู้บริบทว่าอาจารย์กำลังตอบสนอง
    // ต่ออะไรอยู่ ไม่ใช่เพื่อประเมินเนื้อหาการนำเสนอ
    presentationScript:
      "อาจารย์คะ... หนูเห็นคะแนนแล้วค่ะ หนูได้... 68 คะแนน... (เงียบไปพักหนึ่ง) หนูไม่เข้าใจ... หนูตั้งใจทำโปรเจกต์นี้มาก " +
      "หนูใช้เวลาหลายสัปดาห์เลยค่ะ หนูคิดว่าหนูทำได้ดีกว่านี้ (เสียงสั่นเล็กน้อย มองต่ำ หายใจลึก) " +
      "อาจารย์คิดว่า... หนูทำไม่ได้จริง ๆ เหรอคะ (มองหน้าอาจารย์ รอคำตอบ ตาเริ่มแดง)",
    assessmentFocus:
      "Scenario นี้คือ Emotionally Responsive Feedback (Level 4 — Advanced) — เมย์เพิ่งทราบผลคะแนน (68/100) " +
      "ต่ำกว่าที่คาดหวัง และอยู่ในภาวะผิดหวัง เสียใจ เริ่มปกป้องตัวเอง ต่างจาก Scenario 3 ตรงที่ Scenario 3 " +
      "นักศึกษา “เปิดรับ” feedback แต่ Scenario 4 นักศึกษา “มีอารมณ์” — ผู้เรียนต้องจัดการอารมณ์ของนักศึกษาก่อน " +
      "จึงจะให้ feedback เชิงเนื้อหาได้ (โจทย์ไม่ใช่การวิจารณ์การนำเสนอ) Assessment Focus ตามเอกสารต้นฉบับ " +
      "(Instructional Design Manual + VR Scenario Script) คือ Emotion Regulation, Empathic Communication, " +
      "Psychological Safety, Language Appropriateness, Positive Tone of Voice, Facial Expression, " +
      "De-escalation Skills ให้ใช้แนวทางนี้ตีความ 4 มิติของ rubric ดังนี้:\n" +
      "- speechClarity: ในบริบทนี้หมายถึงน้ำเสียงที่สงบ ชัดเจน ไม่รีบเร่ง ช่วยลดความตึงเครียด (Positive Tone of " +
      "Voice, De-escalation Skills) ไม่ใช่แค่ความชัดเจนของเนื้อหา\n" +
      "- linguisticAppropriateness: การเลือกใช้ถ้อยคำที่แสดงความเข้าใจและเห็นอกเห็นใจ (Empathic Communication, " +
      "Language Appropriateness) หลีกเลี่ยงถ้อยคำที่ลดทอนความรู้สึกของนักศึกษา เช่น “คิดมากไปเอง” หรือ “อย่าร้องไห้เลย”\n" +
      "- balance: ในบริบทนี้ไม่ใช่สมดุลระหว่างคำชมกับข้อติ แต่คือสมดุลระหว่างการรับรู้/ยอมรับความรู้สึกของนักศึกษา " +
      "(Validate Feelings) กับการค่อย ๆ นำบทสนทนาไปสู่ข้อเสนอแนะเชิงพัฒนา — ต้องไม่รีบอธิบายเหตุผลของคะแนนก่อนที่ " +
      "นักศึกษาจะพร้อมรับฟัง (Psychological Safety) แต่ก็ต้องไม่ปล่อยให้บทสนทนาวนอยู่กับอารมณ์อย่างเดียวโดยไม่พาไปสู่การเรียนรู้\n" +
      "- intentConsistency: feedback ช่วยคลี่คลายความตึงเครียดและนำนักศึกษากลับเข้าสู่ความเชื่อมั่น/ความพร้อมพัฒนา " +
      "ตนเองหรือไม่ (De-escalation Skills) ตามลำดับที่คาดหวัง: Recognize Emotion → Validate Feelings → Create " +
      "Psychological Safety → Provide Constructive Feedback → Restore Learner Confidence\n" +
      "ตัวอย่างการตีความจากเอกสาร — feedback คุณภาพสูง (ควรให้คะแนนสูงทุกมิติ): เริ่มจากรับรู้ความรู้สึก " +
      "(“อาจารย์เข้าใจนะครับว่าคุณรู้สึกผิดหวัง”) ชื่นชมความตั้งใจ อธิบายว่าคะแนนสะท้อนเฉพาะผลงานชิ้นนี้ไม่ใช่ " +
      "ความสามารถทั้งหมด แล้วจึงค่อยชวนคุยเรื่องการพัฒนาต่อ — ตัวอย่าง Low-quality Feedback ที่ควรให้คะแนนต่ำมาก " +
      "(ลดทอนความรู้สึกของผู้เรียนทันทีโดยไม่รับรู้อารมณ์เลย): “คะแนนก็เป็นไปตามเกณฑ์ ทุกคนก็ได้ประมาณนี้ " +
      "ครั้งหน้าก็พยายามใหม่” หรือ “คุณคิดมากไปเอง” หรือ “อย่าร้องไห้เลย”",
  },
  {
    id: "s5",
    order: 5,
    title: "Capstone Leader ที่ทำเอง 80%",
    studentName: "นัท",
    studentAvatar: "linear-gradient(135deg,#b8e0d2,#7dc9a8)",
    persona: "นักศึกษาปี 4 · Capstone Project",
    emotion: "หงุดหงิด · รู้สึกว่าเพื่อนถ่วง",
    courseContext: "Capstone Project",
    activity: "1-on-1 Coaching",
    difficulty: 5,
    estimatedMinutes: "10–12 นาที",
    studentLineFirst: "ผมทำเองเร็วกว่าครับ อธิบายให้เพื่อนเข้าใจใช้เวลามากกว่าลงมือทำ",
    studentLineRetry: "ผมลองมอบหมายเพื่อนแล้วครับ…แต่ยังกังวลอยู่",
    behaviors: ["ควบคุมทุกอย่าง", "ไม่ยอมมอบหมาย"],
  },
];

// ============================================================
// Page
// ============================================================

function VrSimulationPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["learner-overview"],
    queryFn: () => getLearnerOverview(),
  });

  const [activeId, setActiveId] = useState<string | null>(null);
  const active = SCENARIOS.find((s) => s.id === activeId) ?? null;

  if (isLoading) {
    return (
      <LearnerShell>
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-mint-primary" />
        </div>
      </LearnerShell>
    );
  }

  const completed = new Set(data?.state.completed_scenarios ?? []);
  const progress = Math.round((completed.size / SCENARIOS.length) * 100);

  return (
    <LearnerShell
      displayName={data?.profile?.display_name}
      avatarUrl={data?.profile?.avatar_url}
      fullBleed={!!active}
    >
      {active ? (
        <ScenarioRunner
          scenario={active}
          done={completed.has(active.id)}
          onBack={() => setActiveId(null)}
          userId={data?.profile?.id ?? "guest"}
        />
      ) : (
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-mint-light px-3 py-1 text-xs font-bold uppercase tracking-wider text-mint-primary">
              <Headset className="h-3 w-3" />
              Web-based VR Simulation
            </div>
            <h1 className="text-3xl font-bold">ฝึกให้ Feedback กับนักศึกษาเสมือน</h1>
            <p className="text-slate-text">
              ระบบจำลอง VR แบบ Web-based ตามวงจร Experiential Learning (Experience → Reflection →
              Conceptualization → Experimentation) โดยแต่ละ Scenario จะพาท่านผ่าน 4 Stage
              พร้อมสรุปผลเปรียบเทียบก่อน/หลังการโค้ช
            </p>
          </div>

          <div className="mb-8 rounded-2xl border border-border bg-background p-6">
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-deep">ความคืบหน้า Scenario</span>
              <span className="text-slate-text">
                {completed.size} / {SCENARIOS.length} ({progress}%)
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-mint-primary transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-lg font-bold text-slate-deep">ลำดับ Scenario การฝึก</h2>
            <div className="text-xs text-slate-text">ฝึกเรียงลำดับความยากจาก 1 → 5</div>
          </div>
          <ol className="relative space-y-3">
            <div
              className="pointer-events-none absolute left-[27px] top-6 bottom-6 w-0.5 bg-gradient-to-b from-mint-primary/60 via-border to-border"
              aria-hidden
            />
            {SCENARIOS.map((s, i) => {
              const done = completed.has(s.id);
              const currentIdx = SCENARIOS.findIndex((sc) => !completed.has(sc.id));
              const isCurrent = i === currentIdx;
              const isLocked = currentIdx !== -1 && i > currentIdx;
              return (
                <li key={s.id} className="relative">
                  <button
                    onClick={() => setActiveId(s.id)}
                    className={`group relative flex w-full items-stretch gap-4 rounded-2xl border p-5 text-left transition-all ${
                      done
                        ? "border-mint-primary/40 bg-mint-light/30 hover:border-mint-primary"
                        : isCurrent
                          ? "border-mint-primary bg-background shadow-md ring-4 ring-mint-primary/15 hover:shadow-lg"
                          : isLocked
                            ? "border-border bg-background/60 opacity-75 hover:opacity-100"
                            : "border-border bg-background hover:border-mint-primary/50 hover:shadow-md"
                    }`}
                  >
                    {/* Step node */}
                    <div
                      className={`z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-4 border-background text-lg font-bold shadow-sm ${
                        done
                          ? "bg-mint-primary text-white"
                          : isCurrent
                            ? "bg-slate-deep text-white ring-4 ring-mint-primary/25"
                            : "bg-secondary text-slate-text"
                      }`}
                    >
                      {done ? <CheckCircle2 className="h-6 w-6" /> : s.order}
                    </div>

                    {/* Card body */}
                    <div className="flex flex-1 flex-col gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-mint-primary">
                          Scenario {s.order}
                        </span>
                        {done && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-mint-primary/15 px-2 py-0.5 text-[10px] font-bold text-mint-primary">
                            <CheckCircle2 className="h-2.5 w-2.5" /> ฝึกแล้ว
                          </span>
                        )}
                        {isCurrent && (
                          <span className="rounded-full bg-slate-deep px-2 py-0.5 text-[10px] font-bold text-white">
                            แนะนำถัดไป
                          </span>
                        )}
                        {isLocked && (
                          <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-slate-text">
                            รอเปิด
                          </span>
                        )}
                      </div>
                      <div className="font-bold text-slate-deep">{s.title}</div>
                      <div className="flex items-center gap-2 text-xs text-slate-text">
                        <User className="h-3 w-3" />
                        <span>
                          {s.studentName} · {s.persona}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-text">
                        <span className="rounded-md bg-secondary px-2 py-0.5">
                          ระดับ {s.difficulty}/5
                        </span>
                        <span className="rounded-md bg-secondary px-2 py-0.5">
                          {s.estimatedMinutes}
                        </span>
                        <span className="rounded-md bg-secondary px-2 py-0.5">{s.activity}</span>
                      </div>
                    </div>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 self-center text-slate-text transition-transform group-hover:translate-x-1 group-hover:text-mint-primary" />
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </LearnerShell>
  );
}

// ============================================================
// ScenarioRunner — 4-stage Experiential Learning flow
// ============================================================

type Step =
  | "1-intro"
  | "1-vr"
  | "1-record"
  | "2-transition"
  | "2-playback"
  | "2-rating"
  | "2-reflection"
  | "3-awareness"
  | "3-radar"
  | "3-principles"
  | "3-coaching"
  | "3-goal"
  | "4-before"
  | "4-vr"
  | "4-record"
  | "4-compare"
  | "summary";

const STAGE_OF: Record<Step, 1 | 2 | 3 | 4> = {
  "1-intro": 1,
  "1-vr": 1,
  "1-record": 1,
  "2-transition": 1,
  "2-playback": 1,
  "2-rating": 1,
  "2-reflection": 1,
  "3-awareness": 2,
  "3-radar": 2,
  "3-principles": 2,
  "3-coaching": 2,
  "3-goal": 2,
  "4-before": 3,
  "4-vr": 3,
  "4-record": 3,
  "4-compare": 3,
  summary: 4,
};

// Canonical forward order — drives the generic Unity STAGE_CHANGED → advance
// handler below. NOTE: this advances blindly one step regardless of whether
// the current step's own gating requirement (recording done, ratings filled,
// etc. — see PROJECT_CONTEXT.md §8 "Progress Gating") is satisfied. Safe today
// since no real Unity build sends STAGE_CHANGED yet; once one does, scope
// this to only fire from steps where Unity — not user input — legitimately
// drives the transition (e.g. the "*-vr" presentation steps).
const STEP_ORDER: Step[] = [
  "1-intro",
  "1-vr",
  "1-record",
  "2-transition",
  "2-playback",
  "2-rating",
  "2-reflection",
  "3-awareness",
  "3-radar",
  "3-principles",
  "3-coaching",
  "3-goal",
  "4-before",
  "4-vr",
  "4-record",
  "4-compare",
  "summary",
];

// Self-rating statements are scenario-specific — each scenario has its own
// 8-item self-reflection instrument. Only s1's set has a documented
// item→AI-dimension mapping (see the "ข้อ N" comments below and on
// Stage3Awareness), so the Step 3.1 self-vs-AI comparison is scenario-gated
// to s1 only (see the "2-reflection" step's onNext in ScenarioRunner) until
// a mapping for s2-s5's items is supplied.
const RATING_STATEMENTS_BY_SCENARIO: Record<string, string[]> = {
  // Wording sourced directly from "Scenario 1_เปรียบเทียบ Self Reflection and
  // AI.docx" (8 ข้อ self-reflection ที่จับคู่กับสิ่งที่ AI วิเคราะห์จริง) — ถ้อยคำจาก
  // เอกสารต้นฉบับตรง ๆ เพื่อให้ self-rating กับ AI rubric อ้างอิงคำถามเดียวกันแน่นอน อย่า
  // เปลี่ยนลำดับ — index 0-3 ถูกใช้เทียบกับคะแนน AI ตรง ๆ ใน Stage3Awareness
  // (selfBalance/selfClarity/selfAction/selfStructure) index 4-7 เป็น self-reflection
  // เพิ่มเติม (Conciseness / Speech Rate+Pause / มุมมองผู้รับ / ผลกระทบทางความรู้สึก) ที่เก็บไว้
  // แต่ไม่ได้ทำ 1:1 comparison กับ AI score เดี่ยว ๆ (เอกสารต้นฉบับก็ปล่อยช่อง "Scoring 4
  // Dimensions" ว่างไว้สำหรับข้อเหล่านี้เช่นกัน)
  //
  // ข้อ 6 (index 5): เอกสารต้นฉบับระบุ "Speech Rate + Pause + Voice Clarity" แต่ตัด
  // Voice Clarity ออกตามที่ผู้ใช้ระบุ — ระบบไม่ได้ส่งไฟล์เสียงให้ AI วิเคราะห์โดยตรง (มีแค่
  // transcript ข้อความ) จึงประเมิน "ความชัดเจนของน้ำเสียง" จริง ๆ ไม่ได้ เหลือแค่จังหวะ/
  // ความเร็วในการพูดที่ผู้พูดประเมินตนเองได้
  s1: [
    "ฉันเริ่มต้นการให้ Feedback ด้วยการกล่าวถึงจุดแข็งหรือสิ่งที่นักศึกษาทำได้ดี และลงท้ายด้วยการให้กำลังใจหรือแรงกระตุ้นพัฒนาการ",
    "ฉันระบุสิ่งที่นักศึกษาควรพัฒนาได้อย่างชัดเจนและเฉพาะเจาะจง",
    "ฉันเสนอแนวทางที่นักศึกษาสามารถนำไปใช้ปรับปรุงการนำเสนอครั้งต่อไปได้",
    "Feedback ของฉันมีลำดับที่ช่วยให้นักศึกษาเข้าใจทั้งจุดแข็งและสิ่งที่ควรพัฒนา",
    "Feedback ของฉันมีความกระชับ ตรงประเด็น และไม่มีข้อความที่ซ้ำหรือไม่จำเป็น",
    "ฉันพูดด้วยความเร็วและจังหวะที่เหมาะสม มีการเว้นวรรคที่ช่วยให้นักศึกษาติดตามสิ่งที่ฉันสื่อสารได้",
    "หากฉันเป็นนักศึกษา ฉันจะเข้าใจว่าตนเองทำอะไรได้ดีและควรปรับปรุงอะไรต่อไป",
    "หากฉันเป็นนักศึกษา ฉันจะรู้สึกว่า Feedback นี้ช่วยสนับสนุนให้ฉันพัฒนาตนเอง",
  ],
  s2: [
    "ฉันกล่าวชื่นชมจุดแข็งของนักศึกษาอย่างเฉพาะเจาะจง",
    "ฉันอธิบายได้ว่าทำไมสิ่งที่นักศึกษาทำจึงเป็นจุดแข็ง",
    "ฉันช่วยให้นักศึกษามองเห็นคุณค่าและศักยภาพของตนเอง",
    "ฉันเชื่อมโยงความสำเร็จของนักศึกษากับโอกาสในการพัฒนาต่อไป",
    "ข้อเสนอแนะของฉันช่วยให้นักศึกษาทราบว่าควรต่อยอดสิ่งใด",
    "Feedback ของฉันมีความสมดุลระหว่างการชื่นชมและการเสนอแนะแนวทางพัฒนา",
    "ฉันใช้ภาษาที่สร้างแรงจูงใจและส่งเสริม Growth Mindset",
    "หากฉันเป็นนักศึกษา ฉันจะรู้สึกภาคภูมิใจ พร้อมทั้งอยากพัฒนาตนเองต่อไป",
  ],
  s3: [
    "ฉันเริ่มต้นการสนทนาด้วยถ้อยคำที่ช่วยลดความกังวลของนักศึกษา",
    "ฉันกล่าวถึงจุดแข็งของนักศึกษาก่อนพูดถึงข้อที่ควรปรับปรุง",
    "ฉันอธิบายข้อผิดพลาดโดยมุ่งเน้นที่พฤติกรรมมากกว่าตัวบุคคล",
    "ฉันหลีกเลี่ยงการใช้คำพูดที่อาจทำให้ผู้เรียนรู้สึกถูกตำหนิ",
    "ฉันใช้ถ้อยคำที่สุภาพ ให้เกียรติ และเหมาะสม",
    "น้ำเสียงของฉันช่วยให้นักศึกษารู้สึกได้รับการสนับสนุน",
    "ข้อเสนอแนะของฉันมีความชัดเจนและสามารถนำไปปฏิบัติได้",
    "หากฉันเป็นนักศึกษา ฉันจะรู้สึกว่าตนเองยังสามารถพัฒนาได้",
  ],
  s4: [
    "ฉันรับรู้อารมณ์ของนักศึกษาก่อนเริ่มให้ Feedback",
    "ฉันใช้น้ำเสียงที่สงบและช่วยลดความตึงเครียด",
    "ฉันแสดงความเข้าใจความรู้สึกของนักศึกษา",
    "ฉันหลีกเลี่ยงการโต้แย้งหรือปกป้องการตัดสินใจของตนเองทันที",
    "ฉันใช้ถ้อยคำที่ช่วยให้นักศึกษารู้สึกปลอดภัย",
    "ฉันค่อย ๆ นำบทสนทนาเข้าสู่การพัฒนาตนเอง",
    "หากฉันเป็นนักศึกษา ฉันจะรู้สึกว่าอาจารย์รับฟังและเข้าใจฉัน",
    "หลังจบบทสนทนา นักศึกษาน่าจะพร้อมรับข้อเสนอแนะมากขึ้น",
  ],
  s5: [
    "ฉันใช้คำถามปลายเปิดเพื่อกระตุ้นการคิดของนักศึกษา",
    "ฉันเปิดโอกาสให้นักศึกษาอธิบายความคิดของตนเอง",
    "ฉันรับฟังโดยไม่รีบแทรกหรือบอกคำตอบ",
    "ฉันเว้นจังหวะให้ผู้เรียนได้คิดก่อนตอบ",
    "ฉันช่วยสรุปสิ่งที่นักศึกษาสะท้อนคิดได้อย่างถูกต้อง",
    "ฉันช่วยให้นักศึกษาค้นพบแนวทางพัฒนาด้วยตนเอง",
    "ฉันหลีกเลี่ยงการเป็นผู้ให้คำตอบทั้งหมด",
    "หลังจบบทสนทนา นักศึกษาน่าจะมีเป้าหมายการพัฒนาที่ชัดเจน",
  ],
};

const GOAL_OPTIONS = [
  "เพิ่มความชัดเจนของคำแนะนำ",
  "พูดช้าลง",
  "เพิ่มการชื่นชมอย่างเฉพาะเจาะจง",
  "จัดลำดับ Feedback ใหม่",
];

// Competency dimensions — the project's actual 4-dimension feedback rubric.
// Must mirror RubricScores in unity.types.ts and the schema scoreFeedbackRubric
// (ai.server.ts) returns exactly — one canonical schema, not three anymore.
const COMPETENCIES = [
  { key: "speechClarity", label: "Speech Clarity", weight: 0.25 },
  {
    key: "linguisticAppropriateness",
    label: "Linguistic Appropriateness & Sentence Structure",
    weight: 0.25,
  },
  { key: "balance", label: "Balance of Positive & Corrective Feedback", weight: 0.25 },
  { key: "intentConsistency", label: "Intent Consistency", weight: 0.25 },
] as const;

type CompKey = (typeof COMPETENCIES)[number]["key"];
type CompScores = Record<CompKey, number>;

function withOverall(scores: CompScores): CompScores & { overall: number } {
  const overall = Math.round(COMPETENCIES.reduce((sum, c) => sum + scores[c.key] * c.weight, 0));
  return { ...scores, overall };
}

// ============================================================

function ScenarioRunner({
  scenario,
  done,
  onBack,
  userId,
}: {
  scenario: Scenario;
  done: boolean;
  onBack: () => void;
  userId: string;
}) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("1-intro");
  const timing = useLearningTiming("vr", scenario.id, step);

  // Stage 1 data
  const [transcript1, setTranscript1] = useState("");
  const [duration1, setDuration1] = useState(0);
  const [audioUrl1, setAudioUrl1] = useState<string | null>(null);
  const [presented1, setPresented1] = useState(false);

  // Stage 2 data
  const [ratings, setRatings] = useState<number[]>(() => Array(8).fill(0));
  const [bestPart, setBestPart] = useState("");
  const [personalGoal, setPersonalGoal] = useState("");

  // Stage 3 data
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [customGoal, setCustomGoal] = useState("");

  // Stage 4 data
  const [transcript2, setTranscript2] = useState("");
  const [duration2, setDuration2] = useState(0);
  const [audioUrl2, setAudioUrl2] = useState<string | null>(null);
  const [presented2, setPresented2] = useState(false);

  // Unity bridge state — unityReady flips true once (real build's UNITY_READY,
  // or immediately in fallback mode); isRecording drives the badge shown over
  // the persistent backdrop while StageRecord's mic is actually capturing.
  const [unityReady, setUnityReady] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  // Firestore session doc for this attempt — created once on mount, then
  // progressively filled in as each stage completes below (not just written
  // once at the end), so an abandoned mid-scenario attempt still leaves a
  // partial record (stage3/stage4 stay null) instead of nothing at all.
  // Session writes are best-effort; activity events have their own retry queue.
  // A failed session write must never block the learner's flow.
  const [sessionId, setSessionId] = useState<string | null>(null);
  useEffect(
    () =>
      deferredEffect(() => {
        void logActivity({
          type: "vr_scenario_started",
          scenarioId: scenario.id,
          sessionId: timing.runId(),
          runId: timing.runId(),
        });
        createSession(
          {
            userId,
            scenarioId: scenario.id,
            createdAt: serverTimestamp(),
            stage1: null,
            stage2: null,
            stage3: null,
            stage4: null,
          },
          timing.runId(),
        )
          .then(setSessionId)
          .catch((e) => console.warn("Firestore session create failed", e));
      }),
    // Create the session once per mounted run, independently of step changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const advanceStep = useCallback(() => {
    setStep((prev) => {
      const idx = STEP_ORDER.indexOf(prev);
      return STEP_ORDER[Math.min(idx + 1, STEP_ORDER.length - 1)];
    });
  }, []);

  // Unity's own mic-capture fallback path (PROJECT_CONTEXT.md §4 AUDIO_RECORDED)
  // — saves into whichever round is currently active, same slot StageRecord's
  // onDone already writes to. No transcript accompanies this event, so the
  // textarea stays empty for manual typing, consistent with the browser-mic path.
  const isRetryRound = STAGE_OF[step] >= 3;
  const handleUnityAudioRecorded = useCallback(
    (blobUrl: string, duration: number) => {
      if (isRetryRound) {
        setAudioUrl2((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return blobUrl;
        });
        setDuration2(duration);
      } else {
        setAudioUrl1((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return blobUrl;
        });
        setDuration1(duration);
      }
    },
    [isRetryRound],
  );

  // AI-derived character reaction — one shared value (not per-round, only the
  // current reaction is ever displayed), fed into the persistent Unity
  // backdrop below. UnityPlayer fans this out to both a real bridge send
  // (when a build is loaded) and its own fallback visual badge, so the
  // feature is demoable with zero real Unity build present.
  const [emotion, setEmotion] = useState<Emotion | null>(null);

  // AI rubric scoring (4-dimension) — replaces the old client-side `analyze()`
  // regex heuristic. Async now (a real API/mock-fallback call instead of a
  // synchronous function), so scores1/scores2 start null and populate once
  // the mutation resolves; every render site below already guards on
  // `scores1 &&` / `scores2 &&`, so there's nothing else to change for the
  // brief loading gap.
  const [scores1, setScores1] = useState<(CompScores & { overall: number }) | null>(null);
  const [scores2, setScores2] = useState<(CompScores & { overall: number }) | null>(null);

  // Consolidated LLM reports — Round 1 (rubric + emotion + strengths/
  // weaknesses + personalized recommendation + suggested goals, one call
  // driving steps 3.1-3.5) and Round 2 (lighter: rubric + emotion + an
  // improvement summary aware of the goals set after Round 1). See
  // generateCoachingReport / generateRoundTwoReport in ai.server.ts.
  const [report1, setReport1] = useState<CoachingReport | null>(null);
  const [report2, setReport2] = useState<RoundTwoReport | null>(null);

  // Summary Dashboard's report — a fresh LLM call over BOTH rounds together
  // (not report1's Round-1-only strengths/weaknesses/recommendation reused
  // as-is). See generateFinalSummary in ai.server.ts.
  const [finalSummary, setFinalSummary] = useState<FinalSummaryReport | null>(null);

  // Sent alongside the transcript so the LLM can judge feedback against what
  // was actually presented in Unity — see PresentationContext in
  // unity.types.ts.
  const presentationContext: PresentationContext = {
    studentName: scenario.studentName,
    persona: scenario.persona,
    courseContext: scenario.courseContext,
    activity: scenario.activity,
    behaviors: scenario.behaviors,
    presentationScript: scenario.presentationScript,
    assessmentFocus: scenario.assessmentFocus,
  };

  const coachingMutation = useMutation({
    mutationFn: (transcript: string) =>
      generateCoachingReportFn({
        data: { transcript, context: presentationContext, personalGoal },
      }),
    onSuccess: (result) => {
      // result is null when real AI analysis isn't available (no API key,
      // API error, malformed response — see ai.server.ts's no-mock policy).
      // Leave scores1/report1/emotion at their null defaults so the UI
      // renders "-" instead of a simulated report.
      setReport1(result);
      setScores1(result ? withOverall(result.rubric) : null);
      if (result) setEmotion(result.emotion);
    },
  });
  const roundTwoMutation = useMutation({
    mutationFn: (transcript: string) =>
      generateRoundTwoReportFn({
        data: {
          transcript2: transcript,
          context: presentationContext,
          priorRound: {
            transcript1,
            rubric1: scores1 ?? {
              speechClarity: 0,
              linguisticAppropriateness: 0,
              balance: 0,
              intentConsistency: 0,
            },
            goals: [...selectedGoals, customGoal].filter(Boolean),
          },
        },
      }),
    onSuccess: (result) => {
      setReport2(result);
      setScores2(result ? withOverall(result.rubric) : null);
      if (result) setEmotion(result.emotion);
    },
  });
  const finalSummaryMutation = useMutation({
    mutationFn: () =>
      generateFinalSummaryFn({
        data: {
          transcript1,
          transcript2,
          rubric1: scores1 ?? {
            speechClarity: 0,
            linguisticAppropriateness: 0,
            balance: 0,
            intentConsistency: 0,
          },
          rubric2: scores2 ?? {
            speechClarity: 0,
            linguisticAppropriateness: 0,
            balance: 0,
            intentConsistency: 0,
          },
          goals: [...selectedGoals, customGoal].filter(Boolean),
          context: presentationContext,
        },
      }),
    onSuccess: (result) => setFinalSummary(result),
  });

  const firedRound1 = useRef(false);
  const firedRound2 = useRef(false);
  const firedFinalSummary = useRef(false);
  useEffect(() => {
    if (step === "3-awareness" && transcript1 && !firedRound1.current) {
      firedRound1.current = true;
      coachingMutation.mutate(transcript1);
    }
    if (step === "4-compare" && transcript2 && !firedRound2.current) {
      firedRound2.current = true;
      roundTwoMutation.mutate(transcript2);
    }
    if (step === "summary" && scores2 && !firedFinalSummary.current) {
      firedFinalSummary.current = true;
      finalSummaryMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, transcript1, transcript2, scores2]);

  // "Still trying to get a real AI result" — distinct from "settled, but the
  // result was null/unavailable". Steps below show a loading card only while
  // this is true; once a mutation settles (success OR error) they render
  // immediately, passing possibly-null data through so components show "-"
  // instead of blocking forever or fabricating a placeholder report.
  const round1Waiting =
    Boolean(transcript1) && !coachingMutation.isSuccess && !coachingMutation.isError;
  const round2Waiting =
    Boolean(transcript2) && !roundTwoMutation.isSuccess && !roundTwoMutation.isError;
  const summaryWaiting =
    Boolean(scores2) && !finalSummaryMutation.isSuccess && !finalSummaryMutation.isError;

  // Recorded audio is only kept in-memory for the scenario run (no backend
  // upload) — revoke the object URLs whenever the runner unmounts so blobs
  // don't leak past the current attempt.
  const audioUrlsRef = useRef({ a1: audioUrl1, a2: audioUrl2 });
  useEffect(() => {
    audioUrlsRef.current = { a1: audioUrl1, a2: audioUrl2 };
  }, [audioUrl1, audioUrl2]);
  useEffect(() => {
    return () => {
      if (audioUrlsRef.current.a1) URL.revokeObjectURL(audioUrlsRef.current.a1);
      if (audioUrlsRef.current.a2) URL.revokeObjectURL(audioUrlsRef.current.a2);
    };
  }, []);

  const mutation = useMutation({
    mutationFn: () =>
      completeVrScenario({
        data: { scenario_id: scenario.id, mock_transcript: transcript1 },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["learner-overview"] });
      void logActivity({
        type: "vr_scenario_completed",
        scenarioId: scenario.id,
        sessionId: sessionId ?? undefined,
      });
      toast.success(`Scenario ${scenario.order} เสร็จสิ้น · +150 แต้ม`);
    },
  });

  const currentStage = STAGE_OF[step];
  const isRetryBackdrop = currentStage >= 3;
  const presentedBackdrop = isRetryBackdrop ? presented2 : presented1;
  const onPresentBackdrop = () => (isRetryBackdrop ? setPresented2(true) : setPresented1(true));

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <button
        onClick={onBack}
        className="inline-flex w-fit items-center gap-2 text-sm text-slate-text hover:text-slate-deep"
      >
        <ArrowLeft className="h-4 w-4" /> กลับหน้ารายการ Scenario
      </button>

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-mint-light px-3 py-1 text-xs font-bold uppercase tracking-wider text-mint-primary">
          <Headset className="h-3 w-3" />
          Scenario {scenario.order}
        </div>
        <h1 className="text-xl font-bold text-slate-deep">{scenario.title}</h1>
      </div>

      <StageProgress current={currentStage} />

      {/* Bounded persistent Unity frame — mounts once, never remounts
          between steps, so the character stays visible across the whole
          scenario flow. flex-1 + min-h-80 fills the rest of the viewport
          (LearnerShell renders this route full-bleed, h-dvh not min-h-dvh —
          a hard cap, not a floor) instead of leaving dead space below; the
          interaction panel scrolls internally (h-full overflow-y-auto) on
          tall-content steps instead of growing the frame/page. This only
          works because the whole ancestor chain is height-capped, not just
          min-height'd (LearnerShell's fullBleed div, and min-h-0 on this
          component's own root below) — flex children default to
          min-height:auto, which lets them grow past their flex-basis to fit
          content, silently defeating "overflow-y-auto scrolls instead of
          growing" anywhere that chain is broken. If this frame starts
          visibly resizing with step content again, check that chain first. */}
      <div className="relative min-h-80 flex-1 overflow-hidden rounded-3xl border border-border bg-slate-deep shadow-md">
        <div className="absolute inset-0">
          <UnityPlayer
            scenario={scenario}
            userId={userId}
            isRetry={isRetryBackdrop}
            presented={presentedBackdrop}
            onPresent={onPresentBackdrop}
            emotion={emotion}
            isRecording={isRecording}
            onUnityReady={() => setUnityReady(true)}
            onAudioRecorded={handleUnityAudioRecorded}
            onStageChanged={advanceStep}
          />
        </div>

        <div className="pointer-events-none relative z-10 flex h-full items-start justify-end overflow-y-auto p-4 lg:p-6">
          <OverlayPanel>
            {step === "1-intro" && (
              <Stage1Intro scenario={scenario} onStart={() => setStep("1-vr")} />
            )}
            {step === "1-vr" && (
              <Stage1PresentGate
                scenario={scenario}
                presented={presented1}
                onPresent={() => setPresented1(true)}
                onFinish={() => setStep("1-record")}
                unityReady={unityReady}
              />
            )}

            {step === "1-record" && (
              <div className="space-y-4">
                <SectionLabel
                  index={1}
                  title="Reflection"
                  subtitle="ให้ Feedback แล้วเลื่อนลงเพื่อทบทวนตนเอง"
                />
                <StageRecord
                  isRetry={false}
                  onRecordingChange={setIsRecording}
                  onDone={(result) => {
                    setTranscript1(result.transcript);
                    setDuration1(result.seconds);
                    setAudioUrl1((prev) => {
                      if (prev) URL.revokeObjectURL(prev);
                      return result.audioUrl;
                    });
                    if (sessionId) {
                      updateSession(sessionId, {
                        stage1: {
                          presented: presented1,
                          transcript: result.transcript,
                          durationSeconds: result.seconds,
                          recordingUrl: null, // in-memory only, never uploaded — see PROJECT_CONTEXT.md §5
                          startedAt: timing.startedAt()
                            ? Timestamp.fromDate(new Date(timing.startedAt()!))
                            : null,
                          completedAt: serverTimestamp(),
                        },
                      }).catch((e) => console.warn("Firestore session stage1 update failed", e));
                    }
                    setStep("2-playback");
                  }}
                />
              </div>
            )}
            {(step === "2-playback" || step === "2-rating" || step === "2-reflection") && (
              <div className="space-y-6">
                <SectionLabel
                  index={step === "2-playback" ? 2 : step === "2-rating" ? 3 : 4}
                  title="Reflection"
                  subtitle="ทบทวนตนเองต่อจาก Feedback ที่บันทึกไว้"
                />
                {step === "2-playback" && (
                  <Stage2Playback
                    transcript={transcript1}
                    duration={duration1}
                    audioUrl={audioUrl1}
                    onNext={() => setStep("2-rating")}
                  />
                )}
                {step === "2-rating" && (
                  <Stage2Rating
                    ratings={ratings}
                    setRatings={setRatings}
                    statements={
                      RATING_STATEMENTS_BY_SCENARIO[scenario.id] ?? RATING_STATEMENTS_BY_SCENARIO.s1
                    }
                    onBack={() => setStep("2-playback")}
                    onNext={() => setStep("2-reflection")}
                  />
                )}
                {step === "2-reflection" && (
                  <Stage2Reflection
                    bestPart={bestPart}
                    setBestPart={setBestPart}
                    personalGoal={personalGoal}
                    setPersonalGoal={setPersonalGoal}
                    onReplay={() => setStep("2-playback")}
                    onNext={() => {
                      if (sessionId) {
                        updateSession(sessionId, {
                          stage2: {
                            selfRatings: ratings,
                            bestPart,
                            personalGoal,
                            completedAt: serverTimestamp(),
                          },
                        }).catch((e) => console.warn("Firestore session stage2 update failed", e));
                      }
                      void logActivity({
                        type: "vr_scenario_round1_completed",
                        scenarioId: scenario.id,
                        sessionId: sessionId ?? undefined,
                      });
                      // Step 3.1's self-vs-AI comparison reads ratings[0/1/2/7]
                      // against a mapping only s1's statement set has been
                      // authored against (see RATING_STATEMENTS_BY_SCENARIO
                      // above) — skip straight to the radar step for every
                      // other scenario until a mapping for their items exists.
                      setStep(scenario.id === "s1" ? "3-awareness" : "3-radar");
                    }}
                  />
                )}
              </div>
            )}

            {step === "3-awareness" &&
              (round1Waiting ? (
                <AiWaitingCard />
              ) : (
                <Stage3Awareness
                  ratings={ratings}
                  scores={scores1}
                  onNext={() => setStep("3-radar")}
                />
              ))}
            {step === "3-radar" &&
              (round1Waiting ? (
                <AiWaitingCard />
              ) : (
                <Stage3Radar
                  scores={scores1}
                  strengths={report1?.strengths ?? []}
                  weaknesses={report1?.weaknesses ?? []}
                  onNext={() => setStep("3-principles")}
                />
              ))}
            {step === "3-principles" && <Stage3Principles onNext={() => setStep("3-coaching")} />}
            {step === "3-coaching" &&
              (round1Waiting ? (
                <AiWaitingCard />
              ) : (
                <Stage3Coaching
                  scenario={scenario}
                  recommendation={report1?.personalizedRecommendation ?? ""}
                  personalGoal={personalGoal}
                  personalGoalFeedback={report1?.personalGoalFeedback ?? ""}
                  onNext={() => setStep("3-goal")}
                />
              ))}
            {step === "3-goal" && (
              <Stage3Goal
                selectedGoals={selectedGoals}
                setSelectedGoals={setSelectedGoals}
                customGoal={customGoal}
                setCustomGoal={setCustomGoal}
                personalGoal={personalGoal}
                suggestedGoals={
                  report1?.suggestedGoals?.length ? report1.suggestedGoals : GOAL_OPTIONS
                }
                onNext={() => {
                  if (sessionId) {
                    updateSession(sessionId, {
                      stage3: {
                        aiScores: scores1,
                        selectedGoals,
                        customGoal,
                        emotion,
                        completedAt: serverTimestamp(),
                      },
                    }).catch((e) => console.warn("Firestore session stage3 update failed", e));
                  }
                  setStep("4-before");
                }}
              />
            )}

            {step === "4-before" && (
              <Stage4Before
                selectedGoals={selectedGoals}
                customGoal={customGoal}
                personalGoal={personalGoal}
                onNext={() => setStep("4-vr")}
              />
            )}
            {step === "4-vr" && (
              <Stage1PresentGate
                scenario={scenario}
                presented={presented2}
                onPresent={() => setPresented2(true)}
                onFinish={() => setStep("4-record")}
                unityReady={unityReady}
              />
            )}
            {step === "4-record" && (
              <div className="space-y-4">
                <SectionLabel
                  index={1}
                  title="Reflection · รอบที่ 2"
                  subtitle="ให้ Feedback อีกครั้ง"
                />
                <StageRecord
                  isRetry
                  hint={
                    selectedGoals[0] ?? customGoal ?? "ลองเริ่มด้วยการชื่นชมจุดแข็งที่เจาะจงก่อน"
                  }
                  onRecordingChange={setIsRecording}
                  onDone={(result) => {
                    setTranscript2(result.transcript);
                    setDuration2(result.seconds);
                    setAudioUrl2((prev) => {
                      if (prev) URL.revokeObjectURL(prev);
                      return result.audioUrl;
                    });
                    setStep("4-compare");
                  }}
                />
              </div>
            )}
            {step === "4-compare" &&
              (round2Waiting ? (
                <AiWaitingCard />
              ) : (
                <Stage4Compare
                  scores1={scores1}
                  scores2={scores2}
                  improvementSummary={report2?.improvementSummary}
                  onNext={() => {
                    if (sessionId) {
                      updateSession(sessionId, {
                        stage4: {
                          presented: presented2,
                          transcript: transcript2,
                          durationSeconds: duration2,
                          recordingUrl: null,
                          aiScores: scores2,
                          emotion,
                          completedAt: serverTimestamp(),
                        },
                      }).catch((e) => console.warn("Firestore session stage4 update failed", e));
                    }
                    setStep("summary");
                  }}
                  onRetry={() => {
                    void logActivity({
                      type: "vr_scenario_retried",
                      scenarioId: scenario.id,
                      sessionId: sessionId ?? undefined,
                    });
                    setAudioUrl2((prev) => {
                      if (prev) URL.revokeObjectURL(prev);
                      return null;
                    });
                    setTranscript2("");
                    setDuration2(0);
                    setPresented2(false);
                    firedRound2.current = false;
                    firedFinalSummary.current = false;
                    setEmotion(null);
                    setReport2(null);
                    setFinalSummary(null);
                    setStep("4-vr");
                  }}
                />
              ))}

            {step === "summary" &&
              (summaryWaiting ? (
                <AiWaitingCard />
              ) : (
                <SummaryDashboard
                  scenario={scenario}
                  scores1={scores1}
                  scores2={scores2}
                  report1={report1}
                  report2={report2}
                  finalSummary={finalSummary}
                  selectedGoals={selectedGoals}
                  done={done || mutation.isSuccess}
                  saving={mutation.isPending}
                  onSave={() => mutation.mutate()}
                  onBackList={onBack}
                  onNextScenario={() => {
                    const next = SCENARIOS.find((s) => s.order === scenario.order + 1);
                    if (next) {
                      // Reset and enter the next scenario via parent state.
                      onBack();
                    } else {
                      navigate({ to: "/posttest" });
                    }
                  }}
                />
              ))}
          </OverlayPanel>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Stage indicator
// ============================================================

function StageProgress({ current }: { current: 1 | 2 | 3 | 4 }) {
  const stages = [
    { n: 1, label: "Experience & Reflection" },
    { n: 2, label: "Coaching" },
    { n: 3, label: "Experiment" },
    { n: 4, label: "Summary" },
  ];
  return (
    <div className="flex items-center gap-2">
      {stages.map((s, i) => {
        const active = current === s.n;
        const passed = current > s.n;
        return (
          <div key={s.n} className="flex flex-1 items-center gap-2">
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                passed
                  ? "bg-mint-primary text-white"
                  : active
                    ? "bg-slate-deep text-white ring-4 ring-mint-primary/20"
                    : "bg-secondary text-slate-text"
              }`}
            >
              {passed ? <CheckCircle2 className="h-4 w-4" /> : s.n}
            </div>
            <div
              className={`hidden text-xs sm:block ${
                active ? "font-bold text-slate-deep" : "text-slate-text"
              }`}
            >
              {s.label}
            </div>
            {i < stages.length - 1 && (
              <div
                className={`h-0.5 flex-1 rounded-full ${
                  passed ? "bg-mint-primary" : "bg-secondary"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// STAGE 1
// ============================================================

function Stage1Intro({ scenario, onStart }: { scenario: Scenario; onStart: () => void }) {
  return (
    <div className="rounded-3xl border border-border bg-background p-8">
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <StatCard label="ระดับความยาก" value={`${scenario.difficulty} / 5`} />
        <StatCard label="เวลาโดยประมาณ" value={scenario.estimatedMinutes} />
        <StatCard label="กิจกรรม" value={scenario.activity} />
      </div>
      <h2 className="mb-2 text-xl font-bold text-slate-deep">Stage 1 · Concrete Experience</h2>
      <p className="mb-4 text-sm text-slate-text">
        {scenario.courseContext} — {scenario.studentName} ({scenario.persona}) กำลังจะทำกิจกรรม{" "}
        {scenario.activity} เมื่อจบการนำเสนอ {scenario.studentName}จะขอ Feedback จากท่าน
      </p>
      <div className="mb-6 rounded-2xl bg-mint-light/40 p-4 text-sm text-slate-deep">
        <div className="mb-2 font-bold">สิ่งที่ท่านจะต้องทำ</div>
        <ul className="space-y-1.5">
          <li className="flex gap-2">
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-mint-primary" />
            รับชมการนำเสนอในห้อง VR (~3 นาที)
          </li>
          <li className="flex gap-2">
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-mint-primary" />
            ให้ Feedback ผ่านไมโครโฟน (สูงสุด 90 วินาที)
          </li>
          <li className="flex gap-2">
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-mint-primary" />
            ทบทวนตนเอง รับคำแนะนำจาก AI แล้วลองใหม่อีกครั้ง
          </li>
        </ul>
      </div>
      <button
        onClick={onStart}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-deep px-6 py-4 font-bold text-white hover:opacity-90"
      >
        <Play className="h-4 w-4" /> เริ่ม Scenario
      </button>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border p-4">
      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-text">{label}</div>
      <div className="mt-1 text-lg font-bold text-slate-deep">{value}</div>
    </div>
  );
}

// The persistent UnityPlayer backdrop now handles the character/classroom
// visual for every step. This gate just supplies the "click to present" /
// "ready for feedback" copy+button, floating in the overlay panel.
function Stage1PresentGate({
  scenario,
  presented,
  onPresent,
  onFinish,
  unityReady = true,
}: {
  scenario: Scenario;
  presented: boolean;
  onPresent: () => void;
  onFinish: () => void;
  unityReady?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background p-5 shadow-sm">
      {!presented ? (
        <div className="flex flex-col gap-3">
          <div>
            <div className="text-sm font-bold text-slate-deep">
              พร้อมเริ่มการนำเสนอของ {scenario.studentName}
            </div>
            <div className="text-xs text-slate-text">
              พฤติกรรมที่สังเกตได้: {scenario.behaviors.join(" · ")}
            </div>
          </div>
          {unityReady ? (
            <button
              onClick={onPresent}
              className="flex items-center justify-center rounded-xl bg-slate-deep px-4 py-2 text-sm font-bold text-white hover:opacity-90"
            >
              ▶ เล่นการนำเสนอ
            </button>
          ) : (
            <div className="flex items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-2 text-sm font-medium text-slate-text">
              <Loader2 className="h-4 w-4 animate-spin" />
              กำลังเตรียมฉาก VR...
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div>
            <div className="text-sm font-bold text-slate-deep">
              การนำเสนอจบแล้ว — {scenario.studentName}กำลังรอ Feedback จากท่าน
            </div>
            <div className="text-xs text-slate-text">
              เมื่อพร้อม กดปุ่มเพื่อไปยังหน้าบันทึกเสียง Feedback
            </div>
          </div>
          <button
            onClick={onFinish}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-mint-primary px-4 py-2 text-sm font-bold text-white hover:opacity-90"
          >
            ให้ Feedback <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

// Positional/sizing wrapper for the step content floating over the
// persistent Unity backdrop. Deliberately adds no card chrome of its own —
// every Stage* component already renders its own bordered card(s).
function OverlayPanel({ children }: { children: React.ReactNode }) {
  return <div className="pointer-events-auto w-full max-w-lg xl:max-w-xl">{children}</div>;
}

function SectionLabel({
  index,
  title,
  subtitle,
}: {
  index: number;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-deep text-xs font-bold text-white">
        {index}
      </div>
      <div>
        <div className="text-sm font-bold uppercase tracking-wider text-slate-deep">{title}</div>
        <div className="text-xs text-slate-text">{subtitle}</div>
      </div>
    </div>
  );
}

function StageRecord({
  isRetry,
  hint,
  onDone,
  onRecordingChange,
}: {
  isRetry: boolean;
  hint?: string;
  onDone: (result: { transcript: string; seconds: number; audioUrl: string | null }) => void;
  /** Reports whether the mic is actively capturing — drives the badge over the Unity backdrop. */
  onRecordingChange?: (isRecording: boolean) => void;
}) {
  const MAX = 90;
  const recorder = useAudioRecorder({ maxSeconds: MAX });
  const speech = useSpeechRecognition({ lang: "th-TH" });
  const [transcript, setTranscript] = useState("");

  const recording = recorder.status === "recording";
  const requesting = recorder.status === "requesting-permission";
  const showSilenceHint = recording && !recorder.hasDetectedSpeech && recorder.elapsedSeconds >= 6;

  useEffect(() => {
    onRecordingChange?.(recording);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording]);
  useEffect(() => {
    return () => onRecordingChange?.(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live-seed the transcript from speech-to-text while recording; once
  // stopped, the textarea is fully user-owned (editable) again.
  useEffect(() => {
    if (!recording) return;
    const combined = [speech.finalTranscript, speech.interimTranscript]
      .filter(Boolean)
      .join(" ")
      .trim();
    setTranscript(combined);
  }, [recording, speech.finalTranscript, speech.interimTranscript]);

  // Covers both a manual stop and the recorder's own auto-stop at MAX.
  useEffect(() => {
    if (recorder.status === "stopped") speech.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recorder.status]);

  const start = async () => {
    setTranscript("");
    const ok = await recorder.start();
    if (ok && speech.isSupported) {
      speech.reset();
      speech.start();
    }
  };

  const canContinue = !recording && transcript.trim().length >= 10;

  return (
    <div className="rounded-3xl border border-border bg-background p-8">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-deep">
            {isRetry ? "รอบที่ 2 · ให้ Feedback อีกครั้ง" : "กรุณาให้ Feedback"}
          </h2>
          <p className="text-sm text-slate-text">
            บันทึกเสียงสูงสุด 90 วินาที
            {speech.isSupported && " · ระบบจะแปลงเสียงเป็นข้อความให้อัตโนมัติ"}
          </p>
        </div>
        <div className="rounded-xl bg-secondary px-3 py-2 text-right">
          <div className="text-[10px] font-bold uppercase text-slate-text">เวลา</div>
          <div className="text-lg font-bold tabular-nums text-slate-deep">
            {String(Math.floor(recorder.elapsedSeconds / 60)).padStart(2, "0")}:
            {String(recorder.elapsedSeconds % 60).padStart(2, "0")} / 01:30
          </div>
        </div>
      </div>

      {hint && isRetry && (
        <div className="mb-4 flex items-start gap-2 rounded-xl bg-mint-light/60 p-3 text-sm text-slate-deep">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-mint-primary" />
          <span>
            <strong>Hint สำหรับรอบนี้:</strong> {hint}
          </span>
        </div>
      )}

      {!speech.isSupported && (
        <div className="mb-4 flex items-start gap-2 rounded-xl bg-mint-light/60 p-3 text-sm text-slate-deep">
          <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-mint-primary" />
          <span>
            เบราว์เซอร์นี้ยังไม่รองรับการแปลงเสียงเป็นข้อความอัตโนมัติ กรุณาพิมพ์ Feedback
            ด้วยตนเองด้านล่าง
          </span>
        </div>
      )}
      {speech.isSupported && speech.error && (
        <div className="mb-4 flex items-start gap-2 rounded-xl bg-mint-light/60 p-3 text-sm text-slate-deep">
          <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-mint-primary" />
          <span>{speech.error}</span>
        </div>
      )}
      {recorder.permissionError && (
        <div className="mb-4 flex items-start gap-2 rounded-xl bg-mint-light/60 p-3 text-sm text-slate-deep">
          <MicOff className="mt-0.5 h-4 w-4 shrink-0 text-mint-primary" />
          <span>{recorder.permissionError}</span>
        </div>
      )}

      <div className="mb-6 flex flex-col items-center gap-3">
        <button
          onClick={recording ? () => recorder.stop() : start}
          disabled={requesting}
          className={`flex h-24 w-24 items-center justify-center rounded-full transition-all disabled:opacity-60 ${
            recording
              ? "bg-red-500 text-white shadow-lg shadow-red-500/40"
              : "bg-mint-primary text-white hover:scale-105"
          }`}
        >
          {requesting ? (
            <Loader2 className="h-8 w-8 animate-spin" />
          ) : recording ? (
            <Square className="h-8 w-8" />
          ) : (
            <Mic className="h-10 w-10" />
          )}
        </button>
        <Waveform active={recording} levelsRef={recorder.levelsRef} />
        <div className="text-xs text-slate-text">
          {requesting
            ? "กำลังขอสิทธิ์เข้าถึงไมโครโฟน..."
            : recording
              ? "กำลังบันทึก..."
              : "กดปุ่มเพื่อเริ่มบันทึก"}
        </div>
        {showSilenceHint && (
          <div className="text-xs text-mint-primary">คุณสามารถเริ่มให้ Feedback ได้เลยค่ะ</div>
        )}
      </div>

      <div className="mb-4 rounded-xl bg-secondary/50 p-4">
        <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-text">
          Transcript (แก้ไขได้ก่อนส่ง)
        </div>
        <textarea
          rows={6}
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="พูดหรือพิมพ์ Feedback ของคุณที่นี่..."
          className="w-full resize-none rounded-lg border border-border bg-background p-3 text-sm outline-none focus:border-mint-primary"
        />
      </div>

      <button
        onClick={() =>
          onDone({
            transcript,
            seconds: recorder.lastResult?.durationSeconds ?? recorder.elapsedSeconds ?? 0,
            audioUrl: recorder.lastResult?.url ?? null,
          })
        }
        disabled={!canContinue}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-deep px-6 py-4 font-bold text-white hover:opacity-90 disabled:opacity-40"
      >
        ไปยังการทบทวนตนเอง <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function Waveform({
  active,
  levelsRef,
}: {
  active: boolean;
  levelsRef: React.RefObject<number[]>;
}) {
  const [, forceTick] = useState(0);

  useEffect(() => {
    if (!active) return;
    const iv = window.setInterval(() => forceTick((n) => n + 1), 90);
    return () => window.clearInterval(iv);
  }, [active]);

  return (
    <div className="flex h-8 items-center gap-1">
      {Array.from({ length: 24 }).map((_, i) => {
        const level = active ? (levelsRef.current[i] ?? 0) : 0;
        return (
          <div
            key={i}
            className={`w-1 rounded-full ${active ? "bg-mint-primary" : "bg-secondary"}`}
            style={{
              height: active ? `${6 + level * 26}px` : "6px",
              transition: "height 90ms",
            }}
          />
        );
      })}
    </div>
  );
}

// ============================================================
// STAGE 2 — Reflection (no scores, no judgment)
// ============================================================

function Stage2Transition({
  onContinue,
  onReplay,
}: {
  onContinue: () => void;
  onReplay: () => void;
}) {
  return (
    <div className="rounded-3xl border border-border bg-background p-10 text-center">
      <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-mint-light">
        <Volume2 className="h-7 w-7 text-mint-primary" />
      </div>
      <h2 className="mb-2 text-2xl font-bold text-slate-deep">ทบทวนการให้ Feedback ของคุณ</h2>
      <p className="mx-auto mb-6 max-w-lg text-sm text-slate-text">
        ในขั้นนี้เราจะเปิดโอกาสให้คุณได้ฟังเสียงและทบทวนตนเอง
        <br />
        <strong>ไม่มีคำตอบถูกหรือผิดในขั้นนี้</strong>
      </p>
      <div className="flex flex-col justify-center gap-3 sm:flex-row">
        <button
          onClick={onContinue}
          className="rounded-2xl bg-slate-deep px-6 py-3 font-bold text-white hover:opacity-90"
        >
          เริ่มทบทวน
        </button>
        <button
          onClick={onReplay}
          className="rounded-2xl border border-border bg-background px-6 py-3 font-bold text-slate-deep hover:bg-secondary"
        >
          ฟังเสียงของฉัน
        </button>
      </div>
    </div>
  );
}

function Stage2Playback({
  transcript,
  duration,
  audioUrl,
  onNext,
}: {
  transcript: string;
  duration: number;
  audioUrl: string | null;
  onNext: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const [replays, setReplays] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      audio?.pause();
    };
  }, []);

  const sentences = transcript
    .split(/(?<=[.!?…])\s+|(?<=ค่ะ|ครับ|นะคะ|นะครับ)\s+/)
    .filter((s) => s.trim().length);

  const words = transcript.trim().split(/\s+/).filter(Boolean).length;
  const pauses = Math.max(1, (transcript.match(/[,\s…]{2,}|—/g)?.length ?? 0) + 3);
  const wpm = duration > 0 ? Math.round((words / duration) * 60) : words;

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-border bg-background p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm font-bold text-slate-deep">เสียง Feedback ของคุณ</div>
          <button
            onClick={() => {
              const audio = audioRef.current;
              if (!audio) return;
              audio.currentTime = 0;
              audio.play();
              setReplays((r) => r + 1);
            }}
            disabled={!audioUrl}
            className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1 text-xs font-medium text-slate-deep hover:bg-secondary disabled:opacity-40"
          >
            <RefreshCw className="h-3 w-3" /> ฟังซ้ำ
          </button>
        </div>

        {audioUrl ? (
          <>
            <audio
              ref={audioRef}
              src={audioUrl}
              preload="metadata"
              className="hidden"
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onEnded={() => setPlaying(false)}
              onTimeUpdate={(e) =>
                setPos(Math.min(duration, Math.floor(e.currentTarget.currentTime)))
              }
            />
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  const audio = audioRef.current;
                  if (!audio) return;
                  if (audio.paused) audio.play();
                  else audio.pause();
                }}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-deep text-white hover:opacity-90"
              >
                {playing ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
              <div className="flex-1">
                <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-mint-primary transition-all"
                    style={{ width: `${duration > 0 ? (pos / duration) * 100 : 0}%` }}
                  />
                </div>
                <div className="mt-1 flex justify-between text-[11px] tabular-nums text-slate-text">
                  <span>
                    {String(Math.floor(pos / 60)).padStart(2, "0")}:
                    {String(pos % 60).padStart(2, "0")}
                  </span>
                  <span>
                    {String(Math.floor(duration / 60)).padStart(2, "0")}:
                    {String(duration % 60).padStart(2, "0")}
                  </span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-xl bg-secondary/50 p-4 text-xs text-slate-text">
            ไม่มีไฟล์เสียงบันทึกไว้ในรอบนี้ (ใช้ข้อความที่พิมพ์แทน)
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-border bg-background p-6">
        <div className="mb-3 text-sm font-bold text-slate-deep">Transcript</div>
        <div className="space-y-2 text-sm leading-relaxed text-slate-deep">
          {sentences.map((s, i) => (
            <p key={i}>{s}</p>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-background p-6">
        <div className="mb-3 text-sm font-bold text-slate-deep">ข้อมูลเชิงพรรณนา</div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <MiniStat label="ระยะเวลาพูด" value={`${duration} วินาที`} />
          <MiniStat label="จำนวนคำ" value={`${words} คำ`} />
          <MiniStat label="จำนวนช่วงหยุด" value={`${pauses} ครั้ง`} />
          <MiniStat label="ความเร็วเฉลี่ย" value={`${wpm} คำ/นาที`} />
        </div>
        <p className="mt-3 text-xs text-slate-text">
          ข้อมูลเหล่านี้ใช้ประกอบการสังเกตตนเอง ยังไม่ใช่คะแนนประเมิน
          {replays > 0 && ` · คุณฟังซ้ำ ${replays} ครั้ง`}
        </p>
      </div>

      <button
        onClick={onNext}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-deep px-6 py-4 font-bold text-white hover:opacity-90"
      >
        ประเมินการให้ Feedback ของตนเอง <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-text">{label}</div>
      <div className="mt-0.5 text-base font-bold text-slate-deep">{value}</div>
    </div>
  );
}

function Stage2Rating({
  ratings,
  setRatings,
  statements,
  onBack,
  onNext,
}: {
  ratings: number[];
  setRatings: (v: number[]) => void;
  statements: string[];
  onBack: () => void;
  onNext: () => void;
}) {
  const allRated = ratings.every((r) => r > 0);
  return (
    <div className="rounded-3xl border border-border bg-background p-6">
      <h2 className="mb-1 text-xl font-bold text-slate-deep">Self-Rating</h2>
      <p className="mb-2 text-sm text-slate-text">
        โปรดประเมินการให้ Feedback ของคุณจากสิ่งที่ได้ฟังและทบทวน
      </p>
      <p className="mb-6 text-xs text-slate-text">
        1 = ไม่เห็นด้วยอย่างยิ่ง · 5 = เห็นด้วยอย่างยิ่ง
      </p>

      <div className="space-y-4">
        {statements.map((stmt, i) => (
          <div key={i} className="rounded-2xl border border-border p-4">
            <div className="mb-3 text-sm text-slate-deep">
              <span className="mr-2 font-bold text-mint-primary">{i + 1}.</span>
              {stmt}
            </div>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map((n) => {
                const active = ratings[i] === n;
                return (
                  <button
                    key={n}
                    onClick={() => {
                      const next = [...ratings];
                      next[i] = n;
                      setRatings(next);
                    }}
                    className={`h-10 w-10 rounded-lg border font-bold transition ${
                      active
                        ? "border-slate-deep bg-slate-deep text-white"
                        : "border-border bg-background text-slate-deep hover:border-slate-deep/40"
                    }`}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          onClick={onBack}
          className="flex-1 rounded-2xl border border-border bg-background px-6 py-3 font-bold text-slate-deep hover:bg-secondary"
        >
          ← ย้อนกลับไปฟังอีกครั้ง
        </button>
        <button
          onClick={onNext}
          disabled={!allRated}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-deep px-6 py-3 font-bold text-white hover:opacity-90 disabled:opacity-40"
        >
          ต่อไป <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function Stage2Reflection({
  bestPart,
  setBestPart,
  personalGoal,
  setPersonalGoal,
  onReplay,
  onNext,
}: {
  bestPart: string;
  setBestPart: (v: string) => void;
  personalGoal: string;
  setPersonalGoal: (v: string) => void;
  onReplay: () => void;
  onNext: () => void;
}) {
  const canContinue = bestPart.trim().length > 5 && personalGoal.trim().length > 5;
  return (
    <div className="rounded-3xl border border-border bg-background p-6">
      <h2 className="mb-4 text-xl font-bold text-slate-deep">การสะท้อนคิด (Open Reflection)</h2>

      <div className="mb-4 rounded-2xl border border-border p-4">
        <label className="mb-2 block text-sm font-bold text-slate-deep">
          1. ส่วนใดที่คุณทำได้ดีที่สุด เพราะเหตุใด
        </label>
        <textarea
          rows={4}
          value={bestPart}
          onChange={(e) => setBestPart(e.target.value)}
          placeholder="เขียนสิ่งที่คุณคิดว่าทำได้ดี…"
          className="w-full resize-none rounded-lg border border-border bg-background p-3 text-sm outline-none focus:border-mint-primary"
        />
      </div>

      <div className="rounded-2xl border border-border p-4">
        <label className="mb-2 block text-sm font-bold text-slate-deep">
          2. หากให้ Feedback อีกครั้ง คุณต้องการปรับสิ่งใดมากที่สุด และจะปรับอย่างไร
        </label>
        <textarea
          rows={4}
          value={personalGoal}
          onChange={(e) => setPersonalGoal(e.target.value)}
          placeholder="สิ่งที่ตั้งใจจะปรับในรอบถัดไป…"
          className="w-full resize-none rounded-lg border border-border bg-background p-3 text-sm outline-none focus:border-mint-primary"
        />
        <p className="mt-2 text-xs text-slate-text">
          คำตอบข้อนี้จะเป็น <strong>เป้าหมายส่วนตัว</strong>ในการฝึกรอบที่ 2
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          onClick={onReplay}
          className="flex-1 rounded-2xl border border-border bg-background px-6 py-3 font-bold text-slate-deep hover:bg-secondary"
        >
          ย้อนกลับไปฟังอีกครั้ง
        </button>
        <button
          onClick={onNext}
          disabled={!canContinue}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-deep px-6 py-3 font-bold text-white hover:opacity-90 disabled:opacity-40"
        >
          ไปยังคำแนะนำจาก AI <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ============================================================
// STAGE 3 — Coaching
// ============================================================

// Self-vs-AI dimension mapping per "Scenario 1_เปรียบเทียบ Self Reflection and
// AI.docx" — one row per canonical rubric dimension, each backed by the item
// the doc actually scores under that dimension:
//   ข้อ 1 (opening/closing)      → "Feedback Structure" → balance
//   ข้อ 3 (action suggestion)    → "Action Suggestion"   → intentConsistency
//   ข้อ 8 (emotional impact)     → "Sentiment/Respectful Language" → linguisticAppropriateness
// ข้อ 4 (overall sequence) also scores "Feedback Structure" in the doc (same as
// ข้อ 1) so it's intentionally not given its own row — it would just duplicate
// the balance comparison ข้อ 1 already covers.
function Stage3Awareness({
  ratings,
  scores,
  onNext,
}: {
  ratings: number[];
  scores: (CompScores & { overall: number }) | null;
  onNext: () => void;
}) {
  const selfClarity = ((ratings[1] ?? 3) / 5) * 100;
  const selfSupport = ((ratings[7] ?? 3) / 5) * 100;
  const selfAction = ((ratings[2] ?? 3) / 5) * 100;
  const selfBalance = ((ratings[0] ?? 3) / 5) * 100;
  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-border bg-background p-6">
        <div className="mb-1 text-xs font-bold uppercase tracking-wider text-mint-primary">
          Step 3.1 · Self-Awareness Comparison
        </div>
        <h2 className="mb-1 text-xl font-bold text-slate-deep">
          เปรียบเทียบการประเมินตนเอง กับผลวิเคราะห์จาก AI
        </h2>
        <div className="mb-4 flex flex-wrap items-center gap-4 text-xs font-semibold">
          <span className="inline-flex items-center gap-1.5 text-amber-700">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> ประเมินตนเอง (Self)
          </span>
          <span className="inline-flex items-center gap-1.5 text-mint-primary">
            <span className="h-2.5 w-2.5 rounded-full bg-mint-primary" /> AI วิเคราะห์
          </span>
        </div>
        <div className="space-y-4">
          <CompareRow
            label="ความชัดเจนของคำแนะนำ"
            self={selfClarity}
            ai={scores?.speechClarity ?? null}
          />
          <CompareRow
            label="แนวทางที่นำไปปฏิบัติได้"
            self={selfAction}
            ai={scores?.intentConsistency ?? null}
          />
          <CompareRow
            label="ภาษาที่เหมาะสมและให้กำลังใจ"
            self={selfSupport}
            ai={scores?.linguisticAppropriateness ?? null}
          />
          <CompareRow
            label="ความสมดุลของคำชมและคำแนะนำปรับปรุง"
            self={selfBalance}
            ai={scores?.balance ?? null}
          />
        </div>
        <div className="mt-5 rounded-2xl bg-mint-light/40 p-4 text-sm text-slate-deep">
          <strong>ข้อสังเกต:</strong>{" "}
          {scores === null
            ? "ไม่มีผลวิเคราะห์จาก AI สำหรับรอบนี้"
            : selfClarity > scores.speechClarity + 10
              ? "คุณประเมินตนเองว่าข้อเสนอแนะชัดเจนสูง แต่ระบบพบแนวทางปฏิบัติที่เป็นรูปธรรมเพียงเล็กน้อย"
              : "การประเมินตนเองใกล้เคียงกับผลวิเคราะห์ของระบบ — แสดงถึงการรู้ตนเองที่ดี"}
        </div>
      </div>
      <button
        onClick={onNext}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-deep px-6 py-4 font-bold text-white hover:opacity-90"
      >
        ดูการวิเคราะห์สมรรถนะ <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

// Shown while a coaching/round-2/final-summary mutation is still in flight —
// distinct from the "-" placeholders below, which mean the call already
// settled but returned no real AI result (see ai.server.ts's no-mock policy).
function AiWaitingCard() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-border bg-background p-12 text-center">
      <Loader2 className="h-6 w-6 animate-spin text-mint-primary" />
      <div className="text-sm text-slate-text">AI กำลังวิเคราะห์ feedback ของคุณ...</div>
    </div>
  );
}

function CompareRow({ label, self, ai }: { label: string; self: number; ai: number | null }) {
  return (
    <div>
      <div className="mb-1.5 text-xs font-bold text-slate-deep">{label}</div>
      <div className="grid grid-cols-2 gap-3">
        <ScoreBar tone="self" value={self} />
        <ScoreBar tone="ai" value={ai} />
      </div>
    </div>
  );
}

// value === null means the real AI score isn't available (unavailable, not
// "zero") — shown as "-" with an empty gray bar instead of a 0% bar, which
// would misleadingly look like a real (very low) score.
function ScoreBar({ tone, value }: { tone: "self" | "ai"; value: number | null }) {
  const isSelf = tone === "self";
  return (
    <div>
      <div
        className={`mb-0.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wide ${
          isSelf ? "text-amber-700" : "text-mint-primary"
        }`}
      >
        <span>{isSelf ? "Self" : "AI"}</span>
        <span className="tabular-nums">{value === null ? "-" : Math.round(value)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-secondary">
        <div
          className={`h-full rounded-full ${
            value === null ? "bg-slate-300" : isSelf ? "bg-amber-500" : "bg-mint-primary"
          }`}
          style={{ width: value === null ? "0%" : `${value}%` }}
        />
      </div>
    </div>
  );
}

function Stage3Radar({
  scores,
  strengths,
  weaknesses,
  onNext,
}: {
  scores: (CompScores & { overall: number }) | null;
  strengths: string[];
  weaknesses: string[];
  onNext: () => void;
}) {
  const data = COMPETENCIES.map((c) => ({
    name: c.label,
    score: scores ? scores[c.key] : 0,
    full: 100,
  }));

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-border bg-background p-6">
        <div className="mb-1 text-xs font-bold uppercase tracking-wider text-mint-primary">
          Step 3.2 · Competency Analysis
        </div>
        <h2 className="mb-4 text-xl font-bold text-slate-deep">สมรรถนะการให้ Feedback 4 มิติ</h2>

        <div className="grid gap-6 md:grid-cols-[1fr_1fr]">
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={data} outerRadius="75%">
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="name" tick={{ fill: "#334155", fontSize: 11 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                {scores && (
                  <Radar
                    name="You"
                    dataKey="score"
                    stroke="#059669"
                    fill="#10b981"
                    fillOpacity={0.4}
                  />
                )}
              </RadarChart>
            </ResponsiveContainer>
            {!scores && (
              <div className="-mt-6 text-center text-xs text-slate-text">
                ไม่มีผลวิเคราะห์จาก AI สำหรับรอบนี้
              </div>
            )}
          </div>
          <div>
            <div className="mb-4 rounded-2xl bg-mint-light/40 p-4 text-center">
              <div className="text-xs uppercase text-slate-text">Overall Score</div>
              <div className="text-4xl font-bold text-slate-deep">
                {scores ? scores.overall : "-"}
              </div>
              <div className="text-xs text-slate-text">/ 100</div>
            </div>
            <div className="space-y-1.5">
              {COMPETENCIES.map((c) => (
                <div key={c.key} className="flex items-center justify-between text-xs">
                  <span className="text-slate-deep">
                    {c.label}
                    <span className="ml-1 text-slate-text">({Math.round(c.weight * 100)}%)</span>
                  </span>
                  <span className="font-bold tabular-nums text-slate-deep">
                    {scores ? scores[c.key] : "-"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl bg-emerald-50 p-4">
            <div className="mb-1 text-xs font-bold uppercase text-emerald-700">จุดแข็ง</div>
            <ul className="space-y-1 text-sm text-slate-deep">
              {strengths.length ? strengths.map((s, i) => <li key={i}>✓ {s}</li>) : <li>-</li>}
            </ul>
          </div>
          <div className="rounded-2xl bg-amber-50 p-4">
            <div className="mb-1 text-xs font-bold uppercase text-amber-700">จุดที่ควรพัฒนา</div>
            <ul className="space-y-1 text-sm text-slate-deep">
              {weaknesses.length ? weaknesses.map((w, i) => <li key={i}>△ {w}</li>) : <li>-</li>}
            </ul>
          </div>
        </div>
      </div>
      <button
        onClick={onNext}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-deep px-6 py-4 font-bold text-white hover:opacity-90"
      >
        ไปยังหลักการ Constructive Feedback <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function Stage3Principles({ onNext }: { onNext: () => void }) {
  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-border bg-background p-6">
        <div className="mb-1 text-xs font-bold uppercase tracking-wider text-mint-primary">
          Step 3.3 · Principle Explanation
        </div>
        <h2 className="mb-4 text-xl font-bold text-slate-deep">หลักการ Constructive Feedback</h2>

        <div className="mb-6 grid gap-3 md:grid-cols-3">
          <PrincipleCard
            title="Specific Praise"
            desc="ชื่นชมอย่างเจาะจง อ้างอิงพฤติกรรมหรือส่วนของงานที่ทำได้ดี"
          />
          <PrincipleCard
            title="Actionable Suggestion"
            desc="เสนอแนะเป็นขั้นตอนที่ทำตามได้จริงในระยะสั้น"
          />
          <PrincipleCard
            title="Future-oriented Guidance"
            desc="ชี้ทางไปข้างหน้า สร้าง Growth Mindset ไม่จมกับอดีต"
          />
        </div>

        <div className="rounded-2xl bg-slate-deep p-5 text-white">
          <div className="mb-3 text-xs font-bold uppercase tracking-wider text-white/60">
            โครงสร้างที่คาดหวัง
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {[
              "Positive Opening",
              "Strength",
              "Improvement",
              "Suggestion",
              "Encouraging Closing",
            ].map((s, i, arr) => (
              <div key={s} className="flex items-center gap-2">
                <span className="rounded-lg bg-white/10 px-3 py-1.5 font-medium">{s}</span>
                {i < arr.length - 1 && <ArrowRight className="h-3 w-3 text-white/50" />}
              </div>
            ))}
          </div>
        </div>
      </div>
      <button
        onClick={onNext}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-deep px-6 py-4 font-bold text-white hover:opacity-90"
      >
        ดูคำแนะนำเฉพาะบุคคล <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function PrincipleCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-border p-4">
      <div className="mb-1 text-sm font-bold text-mint-primary">✓ {title}</div>
      <div className="text-xs text-slate-text">{desc}</div>
    </div>
  );
}

function Stage3Coaching({
  scenario,
  recommendation,
  personalGoal,
  personalGoalFeedback,
  onNext,
}: {
  scenario: Scenario;
  recommendation: string;
  personalGoal: string;
  personalGoalFeedback: string;
  onNext: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-border bg-background p-6">
        <div className="mb-1 text-xs font-bold uppercase tracking-wider text-mint-primary">
          Step 3.4 · Personalized Coaching
        </div>
        <h2 className="mb-4 text-xl font-bold text-slate-deep">คำแนะนำเฉพาะสำหรับคุณ</h2>

        <div className="space-y-3 text-sm leading-relaxed text-slate-deep">
          {/* AI-generated recommendation — see personalizedRecommendation in
              CoachingReport (unity.types.ts), produced alongside the rubric
              scores by the same generateCoachingReport call. */}
          <p className="whitespace-pre-line">{recommendation || "-"}</p>
          {personalGoal && (
            <div className="rounded-2xl bg-mint-light/50 p-4">
              <div className="mb-1 text-xs font-bold uppercase text-mint-primary">
                เป้าหมายที่คุณตั้งไว้
              </div>
              <div className="text-sm italic text-slate-deep">"{personalGoal}"</div>
              {/* AI-generated critique of the teacher's own self-set goal —
                  see personalGoalFeedback in CoachingReport, same call as
                  recommendation above. Not a static "well done" caption. "-"
                  when the AI call was unavailable, not just when it's genuinely
                  empty (empty is impossible here since personalGoal is set). */}
              <p className="mt-2 text-xs text-slate-text">{personalGoalFeedback || "-"}</p>
            </div>
          )}
        </div>
      </div>
      <button
        onClick={onNext}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-deep px-6 py-4 font-bold text-white hover:opacity-90"
      >
        ตั้งเป้าหมายสำหรับรอบที่ 2 <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function Stage3Goal({
  selectedGoals,
  setSelectedGoals,
  customGoal,
  setCustomGoal,
  personalGoal,
  suggestedGoals,
  onNext,
}: {
  selectedGoals: string[];
  setSelectedGoals: (v: string[]) => void;
  customGoal: string;
  setCustomGoal: (v: string) => void;
  personalGoal: string;
  suggestedGoals: string[];
  onNext: () => void;
}) {
  const toggle = (g: string) => {
    setSelectedGoals(
      selectedGoals.includes(g) ? selectedGoals.filter((x) => x !== g) : [...selectedGoals, g],
    );
  };
  const canContinue = selectedGoals.length > 0 || customGoal.trim().length > 3;

  return (
    <div className="rounded-3xl border border-border bg-background p-6">
      <div className="mb-1 text-xs font-bold uppercase tracking-wider text-mint-primary">
        Step 3.5 · Goal Setting
      </div>
      <h2 className="mb-2 text-xl font-bold text-slate-deep">
        จากคำแนะนำที่ได้รับ คุณต้องการฝึกอะไรในการลองครั้งถัดไป
      </h2>
      {personalGoal && (
        <p className="mb-4 rounded-lg bg-secondary/60 p-3 text-xs italic text-slate-text">
          เป้าหมายที่คุณเขียนไว้ก่อนหน้า: "{personalGoal}"
        </p>
      )}
      <div className="mb-4 space-y-2">
        {suggestedGoals.map((g) => {
          const active = selectedGoals.includes(g);
          return (
            <button
              key={g}
              onClick={() => toggle(g)}
              className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left text-sm transition ${
                active
                  ? "border-mint-primary bg-mint-light/40 text-slate-deep"
                  : "border-border bg-background text-slate-deep hover:border-mint-primary/50"
              }`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 ${
                  active ? "border-mint-primary bg-mint-primary text-white" : "border-slate-300"
                }`}
              >
                {active && <CheckCircle2 className="h-3 w-3" />}
              </span>
              {g}
            </button>
          );
        })}
      </div>
      <div className="mb-6">
        <label className="mb-1 block text-xs font-bold uppercase text-slate-text">
          อื่น ๆ (ระบุ)
        </label>
        <input
          value={customGoal}
          onChange={(e) => setCustomGoal(e.target.value)}
          placeholder="เป้าหมายเพิ่มเติมของคุณ…"
          className="w-full rounded-lg border border-border bg-background p-3 text-sm outline-none focus:border-mint-primary"
        />
      </div>
      <button
        onClick={onNext}
        disabled={!canContinue}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-mint-primary px-6 py-4 font-bold text-white hover:opacity-90 disabled:opacity-40"
      >
        เริ่มการฝึกรอบที่ 2 <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

// ============================================================
// STAGE 4 — Experimentation
// ============================================================

function Stage4Before({
  selectedGoals,
  customGoal,
  personalGoal,
  onNext,
}: {
  selectedGoals: string[];
  customGoal: string;
  personalGoal: string;
  onNext: () => void;
}) {
  const goals = [...selectedGoals, customGoal].filter(Boolean);
  return (
    <div className="rounded-3xl border border-border bg-background p-8">
      <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-mint-light px-3 py-1 text-xs font-bold uppercase tracking-wider text-mint-primary">
        <Target className="h-3 w-3" /> Before You Try Again
      </div>
      <h2 className="mb-4 text-xl font-bold text-slate-deep">ในรอบนี้ คุณตั้งใจจะฝึก</h2>
      <ul className="mb-6 space-y-2">
        {goals.map((g, i) => (
          <li
            key={i}
            className="flex items-start gap-2 rounded-xl bg-mint-light/40 p-3 text-sm text-slate-deep"
          >
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-mint-primary" />
            {g}
          </li>
        ))}
      </ul>
      {personalGoal && (
        <div className="mb-6 rounded-xl border border-dashed border-slate-300 p-3 text-xs italic text-slate-text">
          และคำตั้งใจของคุณจากการสะท้อนคิด: "{personalGoal}"
        </div>
      )}
      <button
        onClick={onNext}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-deep px-6 py-4 font-bold text-white hover:opacity-90"
      >
        เริ่มการฝึกรอบที่ 2 <Play className="h-4 w-4" />
      </button>
    </div>
  );
}

function Stage4Compare({
  scores1,
  scores2,
  improvementSummary,
  onNext,
  onRetry,
}: {
  scores1: (CompScores & { overall: number }) | null;
  scores2: (CompScores & { overall: number }) | null;
  improvementSummary?: string;
  onNext: () => void;
  onRetry: () => void;
}) {
  const rows = COMPETENCIES.map((c) => ({
    label: c.label,
    v1: scores1 ? scores1[c.key] : null,
    v2: scores2 ? scores2[c.key] : null,
  }));
  const overallDelta = scores1 && scores2 ? scores2.overall - scores1.overall : null;
  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-border bg-background p-6">
        <div className="mb-1 text-xs font-bold uppercase tracking-wider text-mint-primary">
          Performance Comparison
        </div>
        <h2 className="mb-4 text-xl font-bold text-slate-deep">รอบที่ 1 vs รอบที่ 2</h2>

        <div className="overflow-hidden rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-slate-deep">
              <tr>
                <th className="px-4 py-3 text-left">Competency</th>
                <th className="px-4 py-3 text-right">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                    รอบแรก
                  </span>
                </th>
                <th className="px-4 py-3 text-right">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
                    รอบสอง
                  </span>
                </th>
                <th className="px-4 py-3 text-right">Δ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const delta = r.v1 !== null && r.v2 !== null ? r.v2 - r.v1 : null;
                return (
                  <tr key={r.label} className="border-t border-border">
                    <td className="px-4 py-3 font-medium text-slate-deep">{r.label}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-amber-700">
                      {r.v1 === null ? "-" : r.v1}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-bold text-emerald-700">
                      {r.v2 === null ? "-" : r.v2}
                    </td>
                    <td
                      className={`px-4 py-3 text-right tabular-nums font-bold ${
                        delta === null
                          ? "text-slate-text"
                          : delta > 0
                            ? "text-emerald-600"
                            : delta < 0
                              ? "text-rose-600"
                              : "text-slate-text"
                      }`}
                    >
                      {delta === null ? "-" : `${delta > 0 ? "+" : ""}${delta}`}
                    </td>
                  </tr>
                );
              })}
              <tr className="border-t-2 border-border bg-mint-light/30">
                <td className="px-4 py-3 font-bold text-slate-deep">Overall</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {scores1 ? scores1.overall : "-"}
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-bold">
                  {scores2 ? scores2.overall : "-"}
                </td>
                <td
                  className={`px-4 py-3 text-right tabular-nums font-bold ${
                    overallDelta === null
                      ? "text-slate-text"
                      : overallDelta >= 0
                        ? "text-emerald-600"
                        : "text-rose-600"
                  }`}
                >
                  {overallDelta === null ? "-" : `${overallDelta > 0 ? "+" : ""}${overallDelta}`}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* AI-generated improvementSummary — see RoundTwoReport in
            unity.types.ts, produced by generateRoundTwoReport alongside the
            Round 2 rubric scores. "-" when unavailable, not hidden, so it's
            never mistaken for "AI had nothing to say". */}
        <div className="mt-3 rounded-2xl bg-slate-deep/5 p-4 text-sm leading-relaxed text-slate-deep">
          <Sparkles className="mr-1 inline h-4 w-4 text-mint-primary" />
          {improvementSummary || "-"}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          onClick={onRetry}
          className="flex-1 rounded-2xl border border-border bg-background px-6 py-3 font-bold text-slate-deep hover:bg-secondary"
        >
          <RefreshCw className="mr-1 inline h-4 w-4" /> ฝึกอีกครั้ง
        </button>
        <button
          onClick={onNext}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-deep px-6 py-3 font-bold text-white hover:opacity-90"
        >
          ไปยังสรุปผล <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ============================================================
// SUMMARY DASHBOARD
// ============================================================

function SummaryDashboard({
  scenario,
  scores1,
  scores2,
  report1,
  report2,
  finalSummary,
  selectedGoals,
  done,
  saving,
  onSave,
  onBackList,
  onNextScenario,
}: {
  scenario: Scenario;
  scores1: (CompScores & { overall: number }) | null;
  scores2: (CompScores & { overall: number }) | null;
  report1: CoachingReport | null;
  report2: RoundTwoReport | null;
  finalSummary: FinalSummaryReport | null;
  selectedGoals: string[];
  done: boolean;
  saving: boolean;
  onSave: () => void;
  onBackList: () => void;
  onNextScenario: () => void;
}) {
  const finalScores = scores2 ?? scores1;
  const radarData = COMPETENCIES.map((c) => ({
    name: c.label,
    v1: scores1 ? scores1[c.key] : 0,
    v2: scores2 ? scores2[c.key] : scores1 ? scores1[c.key] : 0,
  }));

  // goalAchievement only ever comes from finalSummary — a genuine LLM call
  // over BOTH rounds together. This used to fall back to a numeric guess
  // ("สำเร็จ"/"ใกล้เคียง") computed from the raw score delta when finalSummary
  // wasn't ready yet, which is exactly the kind of "looks like a real
  // AI verdict but isn't" content that caused confusion — now it's just "-".
  const goalMet = finalSummary?.goalAchievement || "-";

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-border bg-background p-6">
        <div className="mb-1 text-xs font-bold uppercase tracking-wider text-mint-primary">
          Summary Dashboard · Scenario {scenario.order}
        </div>
        <h2 className="mb-4 text-2xl font-bold text-slate-deep">สรุปผล — {scenario.studentName}</h2>

        <div className="grid gap-6 md:grid-cols-[1fr_1fr]">
          <div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} outerRadius="75%">
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="name" tick={{ fill: "#334155", fontSize: 11 }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                  {scores1 && (
                    <Radar
                      name="รอบแรก"
                      dataKey="v1"
                      stroke="#d97706"
                      fill="#f59e0b"
                      fillOpacity={0.35}
                      strokeWidth={2}
                    />
                  )}
                  {scores2 && (
                    <Radar
                      name="รอบสอง"
                      dataKey="v2"
                      stroke="#059669"
                      fill="#10b981"
                      fillOpacity={0.4}
                      strokeWidth={2}
                    />
                  )}
                </RadarChart>
              </ResponsiveContainer>
              {!scores1 && !scores2 && (
                <div className="-mt-6 text-center text-xs text-slate-text">
                  ไม่มีผลวิเคราะห์จาก AI
                </div>
              )}
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-4 rounded-2xl border border-border bg-background p-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-full bg-amber-500 ring-2 ring-amber-200" />
                <span className="font-medium text-slate-deep">ผลลัพธ์รอบแรก</span>
                <span className="text-slate-text"></span>
              </div>
              {scores2 ? (
                <div className="flex items-center gap-2">
                  <span className="inline-block h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-emerald-200" />
                  <span className="font-medium text-slate-deep">ผลลัพธ์รอบสอง</span>
                  <span className="text-slate-text"></span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-slate-text">
                  <span className="inline-block h-3 w-3 rounded-full border border-dashed border-slate-300 bg-transparent" />
                  <span>รอบสองจะปรากฏหลังฝึกซ้อมครั้งที่ 2</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col justify-center gap-3">
            <div className="rounded-2xl bg-slate-deep p-5 text-center text-white">
              <div className="text-xs uppercase text-white/60">Overall Score</div>
              <div className="text-5xl font-bold">{finalScores ? finalScores.overall : "-"}</div>
              <div className="text-xs text-white/70">/ 100</div>
              {scores1 && scores2 && (
                <div className="mt-2 text-xs text-mint-primary">
                  {scores2.overall > scores1.overall
                    ? `▲ +${scores2.overall - scores1.overall}`
                    : `▼ ${scores2.overall - scores1.overall}`}{" "}
                  จากรอบแรก
                </div>
              )}
            </div>
            <div className="rounded-2xl bg-mint-light/50 p-4 text-sm text-slate-deep">
              <div className="mb-1 text-xs font-bold uppercase text-mint-primary">
                Goal Achievement
              </div>
              <div className="font-bold">{goalMet}</div>
              {report1 && report1.suggestedGoals.length > 0 && (
                <div className="mt-2">
                  <div className="text-[10px] font-bold uppercase text-slate-text">
                    เป้าหมายที่ระบบแนะนำ (รอบแรก)
                  </div>
                  <ul className="mt-1 space-y-0.5 text-xs text-slate-text">
                    {report1.suggestedGoals.map((g, i) => (
                      <li key={i}>• {g}</li>
                    ))}
                  </ul>
                </div>
              )}
              {selectedGoals.length > 0 && (
                <div className="mt-2">
                  <div className="text-[10px] font-bold uppercase text-slate-text">
                    เป้าหมายที่คุณเลือกฝึก
                  </div>
                  <div className="mt-0.5 text-xs text-slate-deep">{selectedGoals.join(" · ")}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* AI-generated improvementSummary — see RoundTwoReport in
            unity.types.ts, produced by generateRoundTwoReport from
            transcript1/2 + goals set after Round 1. "-" when unavailable. */}
        <div className="mt-3 rounded-2xl bg-slate-deep/5 p-4 text-sm leading-relaxed text-slate-deep">
          <Sparkles className="mr-1 inline h-4 w-4 text-mint-primary" />
          {report2?.improvementSummary || "-"}
        </div>

        {/* Key Strengths/Weaknesses/Recommendation below come ONLY from
            finalSummary — the genuine two-round comparison call (see
            generateFinalSummary in ai.server.ts). This used to silently
            fall back to report1's Round-1-only strengths/weaknesses/
            personalizedRecommendation when finalSummary wasn't ready, which
            is exactly the "not a real AI comparison" bug reported against
            this dashboard — the round 1 data was correct but relabeled as if
            it were the two-round summary. Now: real finalSummary or "-",
            never a substitute from a different call. */}
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl bg-emerald-50 p-4">
            <div className="mb-2 text-xs font-bold uppercase text-emerald-700">Key Strengths</div>
            <ul className="space-y-1 text-sm text-slate-deep">
              {finalSummary?.strengths.length ? (
                finalSummary.strengths.map((s, i) => <li key={i}>✓ {s}</li>)
              ) : (
                <li>-</li>
              )}
            </ul>
          </div>
          <div className="rounded-2xl bg-amber-50 p-4">
            <div className="mb-2 text-xs font-bold uppercase text-amber-700">
              Key Areas for Improvement
            </div>
            <ul className="space-y-1 text-sm text-slate-deep">
              {finalSummary?.weaknesses.length ? (
                finalSummary.weaknesses.map((w, i) => <li key={i}>△ {w}</li>)
              ) : (
                <li>-</li>
              )}
            </ul>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-mint-primary/30 bg-mint-light/30 p-4 text-sm text-slate-deep">
          <Award className="mr-1 inline h-4 w-4 text-mint-primary" />
          <strong>AI Recommendation:</strong> {finalSummary?.recommendation || "-"}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          onClick={onBackList}
          className="flex-1 rounded-2xl border border-border bg-background px-6 py-3 font-bold text-slate-deep hover:bg-secondary"
        >
          กลับหน้าหลัก
        </button>
        {!done ? (
          <button
            onClick={onSave}
            disabled={saving}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-mint-primary px-6 py-3 font-bold text-white hover:opacity-90 disabled:opacity-40"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            บันทึกและไป Scenario ถัดไป <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={onNextScenario}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-deep px-6 py-3 font-bold text-white hover:opacity-90"
          >
            Scenario ถัดไป <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
