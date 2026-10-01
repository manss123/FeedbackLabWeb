import { Module1MiniGame } from "@/components/module1-mini-game";
import { newMiniGame, miniGameResult } from "@/lib/module1-mini-game";
import { Module2MiniGame } from "@/components/module2-mini-game";
import { Module3MiniGame } from "@/components/module3-mini-game";
import { Module4MiniGame } from "@/components/module4-mini-game";
import { Module5MiniGame } from "@/components/module5-mini-game";
import {
  newMiniGame as newMiniGame3,
  miniGameResult as miniGameResult3,
} from "@/lib/module3-mini-game";
import {
  newMiniGame as newMiniGame2,
  miniGameResult as miniGameResult2,
} from "@/lib/module2-mini-game";
import {
  newMiniGame as newMiniGame4,
  miniGameResult as miniGameResult4,
} from "@/lib/module4-mini-game";
import {
  newMiniGame as newMiniGame5,
  miniGameResult as miniGameResult5,
} from "@/lib/module5-mini-game";
import { TrackedYouTube } from "@/components/tracked-youtube";
import { LEARNING_VIDEOS } from "@/lib/learning-videos";
import { deferredEffect } from "@/lib/deferred-effect";
import { useLearningTiming } from "@/hooks/use-learning-timing";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  BookOpenText,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Lock,
  PlayCircle,
  Puzzle,
  PenLine,
  Award,
  Sparkles,
  Info,
  Timer,
  Home,
  Target,
  Users,
  Heart,
  BarChart3,
  NotebookPen,
  Clock,
  MessageCircle,
} from "lucide-react";
import { LearningHubLayout } from "@/components/learning-hub-layout";
import { LearnerShell } from "@/components/learner-shell";
import { getLearnerOverview } from "@/lib/learner.functions";
import { logActivity } from "@/lib/activity";
import { getFirebaseAuth } from "@/lib/firebase";
import { waitForFirebaseUser } from "@/lib/firebase-auth";
import { getUserDoc, upsertUserDoc } from "@/lib/firestore";
import { serverTimestamp } from "firebase/firestore";
import { toast } from "sonner";
import badgeM1 from "@/assets/badge-m1.png";
import badgeM2 from "@/assets/badge-m2.png";
import badgeM3 from "@/assets/badge-m3.png";
import badgeM4 from "@/assets/badge-m4.png";
import badgeM5 from "@/assets/badge-m5.png";

export const Route = createFileRoute("/_authenticated/modules")({
  head: () => ({
    meta: [{ title: "บทเรียน 5 โมดูล — My Feedback Lab" }, { name: "robots", content: "noindex" }],
  }),
  component: ModulesPage,
});

// ---------- Module metadata ----------

interface ModuleMeta {
  id: string;
  order: number;
  title: string;
  subtitle: string;
  duration: string;
  badge: string;
  badgeImage: string;
  color: string;
}

const MODULES: ModuleMeta[] = [
  {
    id: "m1",
    order: 1,
    title: "วัตถุประสงค์และหลักการของการให้ข้อเสนอแนะเชิงสร้างสรรค์",
    subtitle: "Introduction to Constructive Feedback",
    duration: "10 นาที",
    badge: "Feedback Explorer",
    badgeImage: badgeM1,
    color: "from-emerald-50 to-mint-light",
  },
  {
    id: "m2",
    order: 2,
    title: "หลักการและโมเดลของการให้ Feedback",
    subtitle: "Principles and Models of Feedback",
    duration: "10 นาที",
    badge: "Principle Master",
    badgeImage: badgeM2,
    color: "from-rose-50 to-slate-50",
  },
  {
    id: "m3",
    order: 3,
    title: "การรับฟังอย่างเข้าอกเข้าใจ",
    subtitle: "Empathic Communication",
    duration: "10 นาที",
    badge: "Empathy Communicator",
    badgeImage: badgeM3,
    color: "from-sky-50 to-blue-50",
  },
  {
    id: "m4",
    order: 4,
    title: "สร้างแรงจูงใจและ Growth Mindset",
    subtitle: "Motivation & Growth Mindset",
    duration: "10 นาที",
    badge: "Motivator Coach",
    badgeImage: badgeM4,
    color: "from-emerald-50 to-teal-50",
  },
  {
    id: "m5",
    order: 5,
    title: "Feedback ที่นำไปปฏิบัติได้จริง",
    subtitle: "Actionable Feedforward",
    duration: "10 นาที",
    badge: "Action Designer",
    badgeImage: badgeM5,
    color: "from-violet-50 to-purple-50",
  },
];

// ---------- Module 1 content ----------

const M1_OBJECTIVES = [
  "อธิบายความหมายของ Constructive Feedback ในบริบทการเรียนการสอนได้",
  "เปรียบเทียบ Feedback เชิงบวกกับเชิงลบและผลต่อผู้เรียน",
  "ระบุองค์ประกอบสำคัญของ Feedback ที่มีคุณภาพ",
  "ตระหนักถึงบทบาทของอาจารย์ในฐานะ Coach ผู้สร้างการเรียนรู้",
];

// Reflection content for the Evaluate stage — one set per module, from the
// "B Module Reflection" source document. Q1 is a free-text key-understanding
// question; Q2 is a single-select practice-intention/development-focus
// question (option count varies 4-6 per module) with a required reason;
// Module 5 alone adds Q3, a concrete practice-goal prompt for the upcoming
// VR practice (per the source doc, filed under "Reflection Module 5").
interface ReflectionOption {
  id: string;
  label: string;
  description: string;
}

interface ModuleReflection {
  q1: string;
  q2Label: string;
  q2Question: string;
  q2Options: ReflectionOption[];
  q2ReasonPrompt: string;
  q3?: { prompt: string; placeholder: string };
}

const MODULE_REFLECTIONS: Record<string, ModuleReflection> = {
  m1: {
    q1: "หลังจากเรียน Module 1 คุณคิดว่าสิ่งสำคัญที่สุดที่ควรคำนึงถึงเมื่อให้ Constructive Feedback แก่ผู้เรียนคืออะไร?",
    q2Label: "Personal Practice Intention",
    q2Question:
      "เมื่อต้องให้ Feedback ในสถานการณ์ VR ต่อไปนี้ คุณตั้งใจจะให้ความสำคัญกับเรื่องใดมากที่สุด?",
    q2Options: [
      { id: "specific", label: "Specific", description: "ให้ Feedback อย่างเฉพาะเจาะจง" },
      { id: "respectful", label: "Respectful", description: "ใช้ภาษาที่ให้เกียรติผู้เรียน" },
      { id: "supportive", label: "Supportive", description: "สนับสนุนและรักษากำลังใจ" },
      {
        id: "actionable",
        label: "Actionable",
        description: "ให้แนวทางที่ผู้เรียนสามารถนำไปใช้ได้",
      },
    ],
    q2ReasonPrompt: "เพราะเหตุใดคุณจึงเลือกข้อนี้?",
  },
  m2: {
    q1: "หลังจากเรียน Module 2 คุณคิดว่าสิ่งสำคัญที่สุดที่ทำให้ Feedback มีประสิทธิผลและช่วยให้ผู้เรียนสามารถนำไปพัฒนาต่อได้คืออะไร?",
    q2Label: "Personal Practice Intention",
    q2Question:
      "เมื่อต้องให้ Feedback ในสถานการณ์ VR ต่อไปนี้ คุณตั้งใจจะให้ความสำคัญกับเรื่องใดมากที่สุด?",
    q2Options: [
      { id: "clarify", label: "Clarify", description: "ทำให้เป้าหมายหรือความคาดหวังของงานชัดเจน" },
      {
        id: "specificity",
        label: "Specificity",
        description: "ระบุพฤติกรรมหรือส่วนของผลงานที่ต้องการกล่าวถึงอย่างเฉพาะเจาะจง",
      },
      {
        id: "relevance",
        label: "Relevance",
        description: "ให้ Feedback ที่เชื่อมโยงกับเป้าหมายการเรียนรู้หรือสิ่งที่ผู้เรียนควรพัฒนา",
      },
      {
        id: "timeliness",
        label: "Timeliness",
        description: "ให้ Feedback ในเวลาที่ผู้เรียนยังสามารถนำไปใช้ปรับปรุงได้",
      },
      {
        id: "structure",
        label: "Appropriate Structure",
        description:
          "เลือกโครงสร้าง Feedback ที่เหมาะสมกับสถานการณ์ เช่น Pendleton, BOOST หรือ AID",
      },
      {
        id: "constructive_language",
        label: "Constructive Language",
        description:
          "ใช้ภาษาที่มุ่งเน้นผลงานหรือพฤติกรรม ลดการตัดสินตัวบุคคล และช่วยให้ผู้เรียนพร้อมรับ Feedback",
      },
    ],
    q2ReasonPrompt: "เพราะเหตุใดคุณจึงเลือกข้อนี้?",
  },
  m3: {
    q1: "หลังจากเรียน Module 3 คุณคิดว่าสิ่งสำคัญที่สุดที่ผู้สอนควรคำนึงถึงเมื่อผู้เรียนมีอารมณ์หรือมีปฏิกิริยาต่อ Feedback คืออะไร?",
    q2Label: "Personal Practice Intention",
    q2Question:
      "เมื่อต้องให้ Feedback ในสถานการณ์ VR ต่อไปนี้ คุณตั้งใจจะให้ความสำคัญกับเรื่องใดมากที่สุด?",
    q2Options: [
      {
        id: "emotion_awareness",
        label: "Emotion Awareness",
        description: "สังเกตและทำความเข้าใจอารมณ์ของผู้เรียนก่อนตอบสนอง",
      },
      {
        id: "empathy",
        label: "Empathy",
        description: "รับรู้และตอบสนองต่อความรู้สึกของผู้เรียนอย่างเข้าใจ",
      },
      {
        id: "tone_body",
        label: "Tone & Body Language",
        description: "ใช้น้ำเสียง สีหน้า และภาษากายที่เหมาะสมกับข้อความ",
      },
      {
        id: "supportive_language",
        label: "Supportive Language",
        description: "ใช้ภาษาที่ให้เกียรติและช่วยให้ผู้เรียนยังพร้อมรับ Feedback",
      },
      {
        id: "self_regulation",
        label: "Self-Regulation",
        description: "ตระหนักและควบคุมอารมณ์ของตนเองก่อนตอบสนอง",
      },
      {
        id: "learning_focus",
        label: "Learning Focus",
        description: "แม้มีอารมณ์เกิดขึ้น ยังสามารถพาบทสนทนากลับมาสู่การเรียนรู้และการพัฒนาได้",
      },
    ],
    q2ReasonPrompt: "เพราะเหตุใดคุณจึงเลือกข้อนี้?",
  },
  m4: {
    q1: "หลังจากเรียน Module 4 คุณคิดว่าปัจจัยใดสำคัญที่สุดในการตัดสินใจว่าควรให้ Feedback เมื่อใด และในบริบทใด จึงจะช่วยให้ผู้เรียนสามารถรับและนำ Feedback ไปใช้พัฒนาการเรียนรู้ได้อย่างเหมาะสม?",
    q2Label: "Personal Practice Intention",
    q2Question:
      "เมื่อต้องให้ Feedback ในสถานการณ์ VR ต่อไปนี้ คุณตั้งใจจะให้ความสำคัญกับเรื่องใดมากที่สุด?",
    q2Options: [
      {
        id: "timing",
        label: "Appropriate Timing",
        description:
          "เลือกช่วงเวลาที่เหมาะสมในการให้ Feedback โดยไม่จำเป็นต้องให้ทันทีในทุกสถานการณ์",
      },
      {
        id: "opportunity",
        label: "Opportunity to Improve",
        description:
          "ให้ Feedback ในขณะที่ผู้เรียนยังมีโอกาสนำข้อมูลไปใช้ปรับปรุงหรือพัฒนาผลงานต่อได้",
      },
      {
        id: "context",
        label: "Appropriate Context",
        description: "พิจารณาสถานการณ์และสภาพแวดล้อมก่อนตัดสินใจว่าจะให้ Feedback อย่างไร",
      },
      {
        id: "privacy",
        label: "Privacy & Psychological Safety",
        description:
          "พิจารณาว่า Feedback ใดสามารถให้ต่อหน้าผู้อื่นได้ และ Feedback ใดควรให้เป็นการส่วนตัว",
      },
      {
        id: "readiness",
        label: "Learner Readiness",
        description: "พิจารณาว่าผู้เรียนอยู่ในสภาวะที่พร้อมรับ ฟัง และประมวล Feedback หรือไม่",
      },
      {
        id: "assessment_context",
        label: "Assessment Context",
        description:
          "พิจารณาว่าการให้ Feedback ในขณะนั้นจะช่วยการเรียนรู้หรืออาจรบกวนความถูกต้องและความยุติธรรมของการประเมิน",
      },
    ],
    q2ReasonPrompt: "เพราะเหตุใดคุณจึงเลือกข้อนี้?",
  },
  m5: {
    q1: "หลังจากเรียน Module 5 คุณคิดว่าการสะท้อนผลการให้ Feedback ของตนเองควรพิจารณาอะไรบ้าง เพื่อช่วยให้คุณมองเห็นทั้งสิ่งที่ทำได้ดีและสิ่งที่ควรพัฒนาต่อ?",
    q2Label: "Personal Development Focus",
    q2Question:
      "เมื่อต้องฝึกให้ Feedback ในสถานการณ์ VR ต่อไปนี้ คุณตั้งใจจะพัฒนาด้านใดของการให้ Feedback ของตนเองมากที่สุด?",
    q2Options: [
      {
        id: "specific_actionable",
        label: "Specific & Actionable Feedback",
        description: "ให้ Feedback ที่เฉพาะเจาะจงและช่วยให้ผู้เรียนรู้ว่าจะพัฒนาอะไรต่อ",
      },
      {
        id: "structure",
        label: "Structure",
        description: "จัดลำดับและโครงสร้าง Feedback ให้ชัดเจนและเหมาะสมกับสถานการณ์",
      },
      {
        id: "empathy_supportive",
        label: "Empathy & Supportive Communication",
        description: "ใช้ภาษาและวิธีสื่อสารที่เข้าใจความรู้สึกและสนับสนุนผู้เรียน",
      },
      {
        id: "tone_delivery",
        label: "Tone & Delivery",
        description: "ปรับน้ำเสียง จังหวะการพูด และภาษากายให้เหมาะสมกับ Feedback",
      },
      {
        id: "timing_context",
        label: "Timing & Context",
        description:
          "เลือกเวลาและบริบทในการให้ Feedback ให้เหมาะสมกับสถานการณ์และความพร้อมของผู้เรียน",
      },
      {
        id: "reflection_dialogue",
        label: "Learner Reflection & Dialogue",
        description: "เปิดโอกาสให้ผู้เรียนได้คิด สะท้อน และมีส่วนร่วมในการสนทนา Feedback",
      },
    ],
    q2ReasonPrompt: "เพราะเหตุใดคุณจึงเลือกด้านนี้เป็นสิ่งที่ต้องการพัฒนามากที่สุด?",
    q3: {
      prompt: "ในการฝึกครั้งต่อไป คุณตั้งใจจะทำอะไรให้แตกต่างจากเดิม เพื่อพัฒนาด้านที่คุณเลือก?",
      placeholder: "ครั้งนี้ฉันจะ...",
    },
  },
};

// Cycled by option index within a module (max 6 options, so every module
// gets distinct icons/colors) — the source doc has no per-option icon, so
// this just keeps the established visual language without inventing
// meaning-specific icons for all ~28 options across 5 modules.
const OPTION_STYLES: { icon: typeof Target; tone: string }[] = [
  { icon: Target, tone: "bg-mint-light text-mint-primary" },
  { icon: Users, tone: "bg-sky-100 text-sky-600" },
  { icon: Heart, tone: "bg-rose-100 text-rose-500" },
  { icon: BarChart3, tone: "bg-violet-100 text-violet-600" },
  { icon: Clock, tone: "bg-amber-100 text-amber-600" },
  { icon: MessageCircle, tone: "bg-teal-100 text-teal-600" },
];

const MIN_REFLECTION_CHARS = 20;
const MAX_REFLECTION_CHARS = 500;
const MAX_REASON_CHARS = 300;
const MAX_GOAL_CHARS = 200;

// Merges all reflection answers into the single reflectionText field
// moduleProgress already has (firestore.ts's ModuleProgress) — kept as one
// research-readable string rather than widening the schema for a UX-only
// addition.
function formatReflectionText(input: {
  moduleId: string;
  reflection: string;
  practiceChoice: string | null;
  practiceReason: string;
  practiceGoal: string;
}): string {
  const content = MODULE_REFLECTIONS[input.moduleId] ?? MODULE_REFLECTIONS.m1;
  const choiceLabel = content.q2Options.find((o) => o.id === input.practiceChoice)?.label ?? "-";
  const parts = [
    `Q1 (Key Understanding): ${input.reflection}`,
    `Q2 (${content.q2Label} — เลือก: ${choiceLabel}): ${input.practiceReason}`,
  ];
  if (content.q3 && input.practiceGoal) {
    parts.push(`Q3 (Personal Practice Goal): ${input.practiceGoal}`);
  }
  return parts.join("\n\n");
}

const POSITIVE_KEYWORDS = [
  "support",
  "motivate",
  "improve",
  "empathy",
  "specific",
  "growth",
  "encourage",
  "listen",
  "care",
  "guide",
  "สนับสนุน",
  "กำลังใจ",
  "พัฒนา",
  "เข้าใจ",
  "เจาะจง",
  "เติบโต",
  "รับฟัง",
  "ห่วงใย",
  "แนะนำ",
  "เห็นใจ",
];

// ---------- Page ----------

function ModulesPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["learner-overview"],
    queryFn: () => getLearnerOverview(),
  });
  // Persisted (not just in-memory) so refreshing mid-module returns here
  // instead of dropping back to the module list.
  const [activeModule, setActiveModule] = usePersistedState<string | null>("modules.active", null);

  if (isLoading) {
    return (
      <LearnerShell>
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-mint-primary" />
        </div>
      </LearnerShell>
    );
  }

  const completed = new Set(data?.state.completed_modules ?? []);
  const progress = Math.round((completed.size / MODULES.length) * 100);
  const allDone = completed.size >= MODULES.length;

  if (activeModule) {
    return (
      <ModuleRunner
        moduleId={activeModule}
        onExit={() => setActiveModule(null)}
        alreadyCompleted={completed.has(activeModule)}
        displayName={data?.profile?.display_name}
        avatarUrl={data?.profile?.avatar_url}
      />
    );
  }

  return (
    <LearnerShell
      wide
      displayName={data?.profile?.display_name}
      avatarUrl={data?.profile?.avatar_url}
    >
      <LearningHubLayout
        hero={
          <>
            <header className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-mint-light px-3 py-1 text-xs font-bold uppercase tracking-wider text-mint-primary">
                <BookOpenText className="h-3 w-3" />
                Cognitive Learning · 5 Modules
              </div>
              <h1 className="text-2xl font-bold leading-tight sm:text-3xl">
                บทเรียน Constructive Feedback
              </h1>
              <p className="text-slate-text">
                แต่ละโมดูลใช้เวลาประมาณ 10 นาที ผ่าน 3 กิจกรรม (Engage · Elaborate · Evaluate) พร้อม
                Badge เมื่อจบโมดูล
              </p>
            </header>

            <div className="rounded-2xl border border-border bg-background/95 p-4 shadow-sm sm:p-5">
              <div className="mb-3 flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-deep">ความคืบหน้าโมดูล</span>
                <span className="text-slate-text">
                  {completed.size} / {MODULES.length} ({progress}%)
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-mint-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              {completed.size > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {MODULES.filter((m) => completed.has(m.id)).map((m) => (
                    <span
                      key={m.id}
                      className="inline-flex items-center gap-1.5 rounded-full bg-mint-light px-3 py-1 text-xs font-semibold text-mint-primary"
                    >
                      <img
                        src={m.badgeImage}
                        alt=""
                        className="h-4 w-4 rounded-full object-cover"
                      />{" "}
                      {m.badge}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </>
        }
      >
        <h2 className="text-lg font-bold text-slate-deep">เลือกบทเรียนของคุณ</h2>
        <div className="space-y-3">
          {MODULES.map((m, i) => {
            const done = completed.has(m.id);
            const prevDone = i === 0 || completed.has(MODULES[i - 1].id);
            const locked = !prevDone && !done;
            return (
              <button
                key={m.id}
                onClick={() => !locked && setActiveModule(m.id)}
                disabled={locked}
                className={`flex w-full items-center gap-3 rounded-2xl border p-4 sm:gap-4 sm:p-5 text-left transition-all ${
                  done
                    ? "border-mint-primary bg-mint-light/40"
                    : locked
                      ? "cursor-not-allowed border-border bg-secondary/40 opacity-60"
                      : "border-border bg-background hover:border-mint-primary hover:shadow-sm"
                }`}
              >
                <div
                  className={`flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br p-1 ${m.color} ${locked ? "grayscale opacity-60" : ""}`}
                >
                  <img
                    src={m.badgeImage}
                    alt={m.badge}
                    className="h-full w-full object-contain drop-shadow-sm"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-slate-text">
                    <span className="font-bold text-mint-primary">Module {m.order}</span>
                    <span>·</span>
                    <span>{m.duration}</span>
                    {done && (
                      <>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1 font-semibold text-mint-primary">
                          <CheckCircle2 className="h-3 w-3" /> ได้ Badge แล้ว
                        </span>
                      </>
                    )}
                  </div>
                  <div className="font-bold text-slate-deep">{m.title}</div>
                  <div className="text-sm text-slate-text">{m.subtitle}</div>
                </div>
                {locked ? (
                  <Lock className="h-5 w-5 shrink-0 text-slate-text" />
                ) : (
                  <ArrowRight className="h-5 w-5 shrink-0 text-mint-primary" />
                )}
              </button>
            );
          })}
        </div>

        {allDone && (
          <button
            onClick={() => navigate({ to: "/vr-simulation" })}
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-mint-primary to-monitor-teal px-5 py-4 font-bold text-white hover:opacity-90"
          >
            เรียนครบทุกโมดูล · ไป VR Simulation <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </LearningHubLayout>
    </LearnerShell>
  );
}

// ---------- Module Runner (5E flow) ----------

type StageId = "intro" | "engage" | "elaborate" | "evaluate" | "summary";

// Every module now runs the same 3-step flow M1 pioneered — the interactive
// concept map ("explore") and mini quiz ("explain") stages were dropped
// across the board, not just for M1.
const STAGES: { id: StageId; label: string; icon: typeof PlayCircle }[] = [
  { id: "engage", label: "Engage · Video", icon: PlayCircle },
  { id: "elaborate", label: "Elaborate · Mini Game", icon: Puzzle },
  { id: "evaluate", label: "Evaluate · Reflect", icon: PenLine },
];

// Sweeps every usePersistedState draft key for one module (stage, quiz
// answers, mini-game progress, reflection text, ...) — called once that
// module is actually completed in Firestore, so local drafts don't linger.
function clearModuleDraft(moduleId: string) {
  if (typeof window === "undefined") return;
  const prefix = `flvr.draft.modules.${moduleId}.`;
  Object.keys(window.localStorage)
    .filter((k) => k.startsWith(prefix))
    .forEach((k) => window.localStorage.removeItem(k));
}

function ModuleRunner({
  moduleId,
  onExit,
  alreadyCompleted,
  displayName,
  avatarUrl,
}: {
  moduleId: string;
  onExit: () => void;
  alreadyCompleted: boolean;
  displayName: string | null | undefined;
  avatarUrl: string | null | undefined;
}) {
  const meta = MODULES.find((m) => m.id === moduleId)!;
  const isM1 = moduleId === "m1";
  const isM2 = moduleId === "m2";
  const isM3 = moduleId === "m3";
  const isM4 = moduleId === "m4";
  const isM5 = moduleId === "m5";
  const stages = STAGES;
  const stageOrder: StageId[] = ["intro", ...stages.map((step) => step.id), "summary"];
  const navigate = useNavigate();
  const qc = useQueryClient();
  // Every field below except showBadge (a one-shot completion animation, not
  // progress) is persisted per moduleId — otherwise a refresh mid-module lost
  // all in-progress work and dropped the learner back to stage "intro".
  // moduleId is a stable prop for the life of this component (ModuleRunner
  // only (re)mounts when the parent's activeModule changes), so it's safe to
  // bake into these keys directly.
  const [stage, setStage] = usePersistedState<StageId>(`modules.${moduleId}.stage`, "intro");
  // A stage persisted from before a flow change (e.g. "explore" for M1,
  // removed above) would otherwise match none of the render branches below
  // and leave the screen blank forever. Correct it back to "intro" — safe to
  // call during render since the condition is false again next render.
  if (!stageOrder.includes(stage)) setStage("intro");
  const [videoDone, setVideoDone] = usePersistedState(`modules.${moduleId}.videoDone`, false);
  const [videoNote, setVideoNote] = usePersistedState(`modules.${moduleId}.videoNote`, "");
  const [miniGame, setMiniGame] = usePersistedState(`modules.${moduleId}.miniGame`, newMiniGame());
  const gameResult = miniGameResult(miniGame);
  const [miniGame2, setMiniGame2] = usePersistedState(
    `modules.${moduleId}.miniGame2`,
    newMiniGame2(),
  );
  const gameResult2 = miniGameResult2(miniGame2);
  const [miniGame3, setMiniGame3] = usePersistedState(
    `modules.${moduleId}.miniGame3`,
    newMiniGame3(),
  );
  const gameResult3 = miniGameResult3(miniGame3);
  const [miniGame4, setMiniGame4] = usePersistedState(
    `modules.${moduleId}.miniGame4`,
    newMiniGame4(),
  );
  const gameResult4 = miniGameResult4(miniGame4);
  const [miniGame5, setMiniGame5] = usePersistedState(
    `modules.${moduleId}.miniGame5`,
    newMiniGame5(),
  );
  const gameResult5 = miniGameResult5(miniGame5);
  // A draft from the old matching placeholder must not bypass the new game.
  if (
    ((isM3 && !gameResult3.completed) ||
      (isM4 && !gameResult4.completed) ||
      (isM5 && !gameResult5.completed)) &&
    (stage === "evaluate" || stage === "summary")
  ) {
    setStage("elaborate");
  }
  const [reflection, setReflection] = usePersistedState(`modules.${moduleId}.reflection`, "");
  const [practiceChoice, setPracticeChoice] = usePersistedState<string | null>(
    `modules.${moduleId}.practiceChoice`,
    null,
  );
  const [practiceReason, setPracticeReason] = usePersistedState(
    `modules.${moduleId}.practiceReason`,
    "",
  );
  const [practiceGoal, setPracticeGoal] = usePersistedState(`modules.${moduleId}.practiceGoal`, "");
  const [reflectionSaved, setReflectionSaved] = usePersistedState(
    `modules.${moduleId}.reflectionSaved`,
    false,
  );
  const [showBadge, setShowBadge] = useState(false);

  const timing = useLearningTiming("module", moduleId, stage);

  // Fires once per open, including re-opening an already-completed module —
  // a re-engagement signal is informative, not noise, at this data volume.
  useEffect(
    () =>
      deferredEffect(() => {
        void logActivity({ type: "module_started", moduleId, runId: timing.runId() });
      }),
    // One start event per mounted run; step changes retain the run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const mutation = useMutation({
    mutationFn: async (id: string) => {
      const user = getFirebaseAuth().currentUser ?? (await waitForFirebaseUser());
      if (!user) throw new Error("กรุณาเข้าสู่ระบบอีกครั้ง");
      const gameByModule: Record<string, typeof gameResult3 | undefined> = {
        m3: gameResult3,
        m4: gameResult4,
        m5: gameResult5,
      };
      const game = gameByModule[id];
      if (game) {
        if (!game.completed) throw new Error(`กรุณาทำ Mini Game ${meta.title} ให้ครบก่อน`);
        // Backfill learners who finished the previous placeholder. Keep the
        // first completed run of this content version when practicing again.
        const saved = (await getUserDoc(user.uid))?.moduleProgress?.[id]?.miniGame;
        if (saved?.version === game.version && saved.completed) return;
      }
      // Firestore merges map fields recursively under {merge:true}, so this
      // only ever adds/overwrites this one module's entry — the other
      // modules' entries in moduleProgress are untouched.
      await upsertUserDoc(user.uid, {
        moduleProgress: {
          [id]: {
            completed: true,
            quizScore: null,
            matchScore: null,
            ...(id === "m1"
              ? { miniGame: gameResult }
              : id === "m2"
                ? { miniGame: gameResult2 }
                : game
                  ? { miniGame: game }
                  : {}),
            reflectionText: reflection
              ? formatReflectionText({
                  moduleId: id,
                  reflection,
                  practiceChoice,
                  practiceReason,
                  practiceGoal,
                })
              : null,
            timeSpentSeconds: null,
            completedAt: serverTimestamp(),
          },
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["learner-overview"] });
      void logActivity({ type: "module_completed", moduleId, runId: timing.runId() });
      // The module is now complete in Firestore — the local draft has done
      // its job, so drop it rather than let it linger in localStorage.
      clearModuleDraft(moduleId);
    },
  });

  function trySaveReflection() {
    if (reflection.trim().length < MIN_REFLECTION_CHARS) {
      toast.error(`ช่วยเขียนสะท้อนความคิดอย่างน้อย ${MIN_REFLECTION_CHARS} ตัวอักษร`);
      return;
    }
    if (!practiceChoice) {
      toast.error("กรุณาเลือกแนวทางที่คุณให้ความสำคัญที่สุด");
      return;
    }
    const content = MODULE_REFLECTIONS[moduleId] ?? MODULE_REFLECTIONS.m1;
    if (content.q3 && !practiceGoal.trim()) {
      toast.error("กรุณาระบุเป้าหมายที่คุณตั้งใจจะทำในการฝึกครั้งต่อไป");
      return;
    }
    setReflectionSaved(true);
    toast.success("บันทึกคำตอบเรียบร้อย");
  }

  // ----- Derived gating -----
  const engageDone = videoDone;
  // Every module (m1-m5) now has a real mini game, keyed by id so the gating
  // and summary logic below don't need a long isM1/isM2/.../isM5 ternary each.
  const miniGameByModule: Record<string, { completed: boolean; finalLearningScore: number }> = {
    m1: gameResult,
    m2: gameResult2,
    m3: gameResult3,
    m4: gameResult4,
    m5: gameResult5,
  };
  const currentMiniGame = miniGameByModule[moduleId];
  const elaborateDone = !!currentMiniGame?.completed;
  const evaluateDone = reflectionSaved;

  const reflectionKeywords = useMemo(() => {
    const text = reflection.toLowerCase();
    return POSITIVE_KEYWORDS.filter((k) => text.includes(k.toLowerCase()));
  }, [reflection]);

  const stageIndex = stages.findIndex((s) => s.id === stage);
  const progressPct =
    stage === "intro"
      ? 0
      : stage === "summary"
        ? 100
        : Math.round(((stageIndex + 1) / stages.length) * 100);

  const canProceed = () => {
    switch (stage) {
      case "engage":
        return engageDone;
      case "elaborate":
        return elaborateDone;
      case "evaluate":
        return evaluateDone;
      default:
        return true;
    }
  };

  const nextStage = () => {
    timing.finish("next_step");
    const order = stageOrder;
    const i = order.indexOf(stage);
    if (i < order.length - 1) {
      const next = order[i + 1];
      setStage(next);
      if (next === "summary") {
        // trigger completion
        if (!alreadyCompleted || isM3 || isM4 || isM5) {
          mutation.mutate(moduleId);
        } else {
          void logActivity({ type: "module_completed", moduleId, runId: timing.runId() });
        }
        setTimeout(() => setShowBadge(true), 400);
      }
    }
  };

  const prevStage = () => {
    const order = stageOrder;
    const i = order.indexOf(stage);
    if (i > 0) setStage(order[i - 1]);
  };

  return (
    <LearnerShell displayName={displayName} avatarUrl={avatarUrl}>
      <div className="w-full">
        {/* Sticky progress header */}
        <div className="module-progress-header sticky top-16 z-20 mb-5 rounded-2xl border border-mint-primary/15 bg-background/95 p-3 backdrop-blur sm:p-5 xl:top-2">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <button
              onClick={onExit}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-slate-text transition-colors hover:bg-mint-light hover:text-monitor-teal focus-visible:outline-2 focus-visible:outline-mint-primary"
            >
              <ArrowLeft className="h-4 w-4" /> รายการโมดูล
            </button>
            <div className="order-3 inline-flex w-full min-w-0 items-center justify-center gap-2 text-sm font-medium text-slate-text sm:order-none sm:w-auto">
              <img
                src={meta.badgeImage}
                alt=""
                className="h-7 w-7 shrink-0 rounded-full object-cover"
              />
              Module {meta.order} · {meta.badge}
            </div>
            <div className="rounded-full bg-mint-primary/10 px-3 py-1 text-sm font-bold text-monitor-teal">
              {stage === "intro"
                ? "เริ่มต้น"
                : stage === "summary"
                  ? "จบโมดูล"
                  : `${stageIndex + 1} / ${stages.length}`}
            </div>
          </div>
          <div
            role="progressbar"
            aria-label="ตำแหน่งขั้นตอนในโมดูล"
            aria-valuemin={0}
            aria-valuemax={stages.length}
            aria-valuenow={stage === "summary" ? stages.length : Math.max(0, stageIndex + 1)}
            className="h-2 overflow-hidden rounded-full bg-secondary"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-mint-primary to-monitor-teal transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <ol aria-label="ขั้นตอนการเรียน" className="mt-3 grid grid-cols-3 gap-1.5 sm:gap-3">
            {stages.map((s) => {
              const active = s.id === stage;
              const complete =
                s.id === "engage"
                  ? engageDone
                  : s.id === "elaborate"
                    ? elaborateDone
                    : evaluateDone;
              const Icon = s.icon;
              return (
                <li
                  key={s.id}
                  aria-current={active ? "step" : undefined}
                  aria-label={`${s.label}: ${active ? "ขั้นตอนปัจจุบัน" : complete ? "ทำครบแล้ว" : "ยังไม่เสร็จ"}`}
                  className={`flex min-h-9 min-w-0 items-center justify-center gap-1 rounded-full px-1 py-2 text-center text-xs font-semibold sm:gap-2 sm:px-3 sm:text-sm lg:justify-start lg:gap-3 lg:px-4 ${
                    active
                      ? "bg-gradient-to-r from-mint-primary to-monitor-teal text-white shadow-sm"
                      : complete
                        ? "bg-mint-light text-monitor-teal"
                        : "bg-secondary text-slate-text"
                  }`}
                >
                  {complete ? (
                    <CheckCircle2 className="hidden size-4 shrink-0 min-[400px]:block sm:size-5" />
                  ) : (
                    <Icon className="hidden size-4 shrink-0 min-[400px]:block sm:size-5" />
                  )}
                  <span className="whitespace-nowrap lg:hidden">
                    {s.id === "engage" ? "Video" : s.id === "elaborate" ? "Mini Game" : "Reflect"}
                  </span>
                  <span className="hidden whitespace-nowrap lg:inline">{s.label}</span>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Screens — every module now runs the same 3-step flow (M1's
            shape): Engage (video) → Elaborate (mini game) → Evaluate
            (reflection). Only the "elaborate" stage's content differs per
            module — real mini games for M1/M2/M3, a "coming soon" placeholder
            for the rest until their content is built. */}
        {stage === "intro" && (
          <IntroScreen
            meta={meta}
            onStart={nextStage}
            contentReady={isM1 || isM2 || isM3 || isM4 || isM5}
          />
        )}

        {stage === "engage" && (
          <EngageScreen
            moduleId={moduleId}
            runId={timing.runId()}
            videoDone={videoDone}
            setVideoDone={setVideoDone}
            note={videoNote}
            setNote={setVideoNote}
          />
        )}

        {stage === "elaborate" &&
          (isM1 ? (
            <Module1MiniGame value={miniGame} onChange={setMiniGame} />
          ) : isM2 ? (
            <Module2MiniGame value={miniGame2} onChange={setMiniGame2} />
          ) : isM3 ? (
            <Module3MiniGame value={miniGame3} onChange={setMiniGame3} />
          ) : isM4 ? (
            <Module4MiniGame value={miniGame4} onChange={setMiniGame4} />
          ) : isM5 ? (
            <Module5MiniGame value={miniGame5} onChange={setMiniGame5} />
          ) : null)}

        {stage === "evaluate" && (
          <EvaluateScreen
            meta={meta}
            reflection={reflection}
            setReflection={setReflection}
            practiceChoice={practiceChoice}
            setPracticeChoice={setPracticeChoice}
            practiceReason={practiceReason}
            setPracticeReason={setPracticeReason}
            practiceGoal={practiceGoal}
            setPracticeGoal={setPracticeGoal}
            saved={reflectionSaved}
            onSave={trySaveReflection}
            keywordsFound={reflectionKeywords}
          />
        )}

        {stage === "summary" && (
          <>
            {mutation.isPending && (
              <p role="status" className="mb-4 text-sm text-slate-text">
                กำลังบันทึกผลโมดูล…
              </p>
            )}
            {mutation.isError && (
              <div
                role="alert"
                className="mb-4 rounded-xl border border-destructive/30 bg-background p-4"
              >
                <p className="text-sm text-destructive">
                  บันทึกผลไม่สำเร็จ คำตอบยังอยู่ในอุปกรณ์นี้ กรุณาลองอีกครั้ง
                </p>
                <button
                  type="button"
                  className="mt-2 min-h-11 font-semibold text-monitor-teal underline"
                  onClick={() => mutation.mutate(moduleId)}
                >
                  บันทึกอีกครั้ง
                </button>
              </div>
            )}
            <SummaryScreen
              meta={meta}
              matchScore={currentMiniGame?.finalLearningScore ?? 0}
              matchMax={10}
              gameLabel="Mini Game"
              reflectionKeywords={reflectionKeywords}
              showBadge={showBadge}
              onNext={() => {
                const idx = MODULES.findIndex((m) => m.id === moduleId);
                const nextMod = MODULES[idx + 1];
                if (nextMod) {
                  onExit();
                } else {
                  navigate({ to: "/vr-simulation" });
                }
              }}
              onHome={onExit}
              hasNext={MODULES.findIndex((m) => m.id === moduleId) < MODULES.length - 1}
            />
          </>
        )}

        {/* Footer nav */}
        {stage !== "intro" && stage !== "summary" && (
          <div className="mt-8 flex items-center justify-between gap-3">
            <button
              onClick={prevStage}
              className="inline-flex items-center gap-1 rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-slate-text hover:bg-secondary"
            >
              <ArrowLeft className="h-4 w-4" /> ย้อนกลับ
            </button>
            <div className="flex-1" />
            <div className="relative group">
              <button
                onClick={nextStage}
                disabled={!canProceed()}
                className="inline-flex items-center gap-1 rounded-xl bg-slate-deep px-6 py-2.5 text-sm font-bold text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:bg-secondary disabled:text-slate-text"
              >
                ถัดไป <ArrowRight className="h-4 w-4" />
              </button>
              {!canProceed() && (
                <div className="pointer-events-none absolute bottom-full right-0 mb-2 hidden w-64 rounded-lg bg-slate-deep px-3 py-2 text-xs text-white group-hover:block">
                  {gatingHint(stage)}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </LearnerShell>
  );
}

function gatingHint(stage: StageId): string {
  switch (stage) {
    case "engage":
      return "กรุณาดูวิดีโอให้จบก่อนไปขั้นถัดไป";
    case "elaborate":
      return "ทำกิจกรรม Mini Game ให้ครบก่อนเข้าสู่ขั้นตอนถัดไป";
    case "evaluate":
      return "เขียน Reflection แล้วกดบันทึกคำตอบ";
    default:
      return "";
  }
}

// ---------- Screens ----------

function IntroScreen({
  meta,
  onStart,
  contentReady,
}: {
  meta: ModuleMeta;
  onStart: () => void;
  contentReady: boolean;
}) {
  return (
    <div className="animate-fade-in">
      <div className={`mb-6 rounded-3xl bg-gradient-to-br p-8 ${meta.color}`}>
        <img
          src={meta.badgeImage}
          alt={meta.badge}
          className="mb-4 h-24 w-24 object-contain drop-shadow-md"
        />
        <div className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-deep/70">
          Module {meta.order} · {meta.subtitle}
        </div>
        <h2 className="mb-2 text-2xl font-bold text-slate-deep">{meta.title}</h2>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-slate-deep">
          <Timer className="h-3 w-3" /> เวลาโดยประมาณ {meta.duration}
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-border bg-background p-6">
        <div className="mb-3 text-xs font-bold uppercase tracking-wider text-mint-primary">
          วัตถุประสงค์การเรียนรู้
        </div>
        <ul className="space-y-2">
          {M1_OBJECTIVES.map((o, i) => (
            <li key={i} className="flex gap-2 text-sm text-slate-deep">
              <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-mint-light text-xs font-bold text-mint-primary">
                {i + 1}
              </span>
              <span>{o}</span>
            </li>
          ))}
        </ul>
      </div>

      {!contentReady && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-dashed border-mint-primary/40 bg-mint-light/30 p-4 text-sm text-slate-deep">
          <Info className="h-4 w-4 shrink-0 text-mint-primary" />
          <span>
            Mini Game ของโมดูลนี้กำลังจัดทำ — ท่านสามารถเดินผ่านโครงกิจกรรมทั้ง 3 ขั้นตอน
            เพื่อทำความคุ้นเคยและรับ Badge ได้ (จะแทนที่ด้วยคอนเทนต์เต็มในเวอร์ชันถัดไป)
          </span>
        </div>
      )}

      <button
        onClick={onStart}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-deep px-8 py-4 font-bold text-white hover:opacity-90"
      >
        เริ่มเรียน <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function EngageScreen({
  moduleId,
  runId,
  videoDone,
  setVideoDone,
  note,
  setNote,
}: {
  moduleId: string;
  runId: string;
  videoDone: boolean;
  setVideoDone: (v: boolean) => void;
  note: string;
  setNote: (v: string) => void;
}) {
  // Only M1 has its own video today — every other module reuses it rather
  // than showing an empty Engage stage while module-specific videos are
  // being produced.
  const video = LEARNING_VIDEOS[moduleId] ?? LEARNING_VIDEOS.m1;

  return (
    <section className="animate-fade-in">
      <div className="mb-2 text-xs font-bold uppercase tracking-wider text-mint-primary">
        กิจกรรมที่ 1 · Engage
      </div>
      <h2 className="mb-1 text-2xl font-bold text-slate-deep">Video: อาจารย์ A vs อาจารย์ B</h2>
      <p className="mb-6 text-sm text-slate-text">
        ชมสถานการณ์สั้น ๆ ที่อาจารย์สองท่านให้ Feedback ต่างสไตล์ แล้วสังเกตความรู้สึกของนักศึกษา
      </p>

      {video?.test && (
        <p className="mb-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          วิดีโอทดสอบระบบ YouTube — ยังไม่ใช่เนื้อหาบทเรียน อาจารย์ A vs อาจารย์ B
        </p>
      )}
      {video ? (
        <TrackedYouTube
          videoId={video.id}
          isTest={video.test}
          moduleId={moduleId}
          runId={runId}
          onEnded={() => setVideoDone(true)}
        />
      ) : (
        <p role="status">ยังไม่มีวิดีโอสำหรับบทเรียนนี้</p>
      )}

      {videoDone && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-mint-light px-4 py-3 text-sm font-semibold text-mint-primary">
          <CheckCircle2 className="h-4 w-4" /> วิดีโอเล่นถึงจุดสิ้นสุดแล้ว
        </div>
      )}

      <div className="rounded-2xl border border-dashed border-border p-5">
        <label className="mb-2 block text-sm font-semibold text-slate-deep">
          คุณสังเกตเห็นความแตกต่างอะไร <span className="text-slate-text">(ไม่บังคับ)</span>
        </label>
        <textarea
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="เช่น อาจารย์ A ยอมรับความพยายามก่อนเสนอทางแก้..."
          className="w-full resize-none rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-mint-primary"
        />
      </div>
    </section>
  );
}

function EvaluateScreen({
  meta,
  reflection,
  setReflection,
  practiceChoice,
  setPracticeChoice,
  practiceReason,
  setPracticeReason,
  practiceGoal,
  setPracticeGoal,
  saved,
  onSave,
  keywordsFound,
}: {
  meta: ModuleMeta;
  reflection: string;
  setReflection: (v: string) => void;
  practiceChoice: string | null;
  setPracticeChoice: (v: string) => void;
  practiceReason: string;
  setPracticeReason: (v: string) => void;
  practiceGoal: string;
  setPracticeGoal: (v: string) => void;
  saved: boolean;
  onSave: () => void;
  keywordsFound: string[];
}) {
  const content = MODULE_REFLECTIONS[meta.id] ?? MODULE_REFLECTIONS.m1;

  return (
    <section className="animate-fade-in">
      <div className="mb-2 flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-mint-primary">
            กิจกรรมที่ 3 · Evaluate &amp; Reflect
          </div>
          <h2 className="text-2xl font-bold text-slate-deep sm:text-3xl">Reflection</h2>
          <p className="mt-1 text-sm text-slate-text">
            สะท้อนความเข้าใจจาก Module {meta.order} และเตรียมแนวทางการให้ Feedback ในสถานการณ์จริง
          </p>
        </div>
        <div className="hidden shrink-0 rounded-2xl bg-mint-light p-4 sm:block" aria-hidden="true">
          <NotebookPen className="h-8 w-8 text-mint-primary" />
        </div>
      </div>

      <div className="mt-6 space-y-8 rounded-3xl border border-border bg-background p-5 sm:p-8">
        {/* Question 1 — open reflection */}
        <div>
          <div className="mb-3 flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-mint-primary text-sm font-bold text-white">
              1
            </span>
            <span className="inline-flex items-center rounded-full bg-mint-light px-3 py-1 text-xs font-bold text-mint-primary">
              คำถามที่ 1 — Key Understanding
            </span>
          </div>
          <p className="mb-3 font-semibold text-slate-deep">{content.q1}</p>
          <textarea
            rows={4}
            value={reflection}
            onChange={(e) => setReflection(e.target.value.slice(0, MAX_REFLECTION_CHARS))}
            disabled={saved}
            placeholder="พิมพ์คำตอบของคุณที่นี่ โดยอธิบายสิ่งที่คุณคิดว่าสำคัญที่สุด..."
            className="w-full resize-none rounded-2xl border border-border bg-background p-4 text-sm outline-none focus:border-mint-primary disabled:opacity-60"
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-text">
            <span className="flex items-center gap-1">
              <Info className="h-3.5 w-3.5 shrink-0" /> เขียนอย่างน้อย {MIN_REFLECTION_CHARS}{" "}
              ตัวอักษร
            </span>
            <span>
              {reflection.length} / {MAX_REFLECTION_CHARS}
            </span>
          </div>
          {keywordsFound.length > 0 && (
            <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-mint-primary">
              <Sparkles className="h-3.5 w-3.5 shrink-0" /> ตรวจพบคำเชิงบวก:{" "}
              {keywordsFound.slice(0, 5).join(", ")}
            </p>
          )}
        </div>

        {/* Question 2 — practice intention/development focus + reason */}
        <div>
          <div className="mb-3 flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-mint-primary text-sm font-bold text-white">
              2
            </span>
            <span className="inline-flex items-center rounded-full bg-mint-light px-3 py-1 text-xs font-bold text-mint-primary">
              คำถามที่ 2 — {content.q2Label}
            </span>
          </div>
          <p className="mb-1 font-semibold text-slate-deep">{content.q2Question}</p>
          <p className="mb-4 text-sm text-slate-text">ให้เลือก 1 ข้อ</p>

          <div className="grid gap-3 sm:grid-cols-2">
            {content.q2Options.map((opt, i) => {
              const style = OPTION_STYLES[i % OPTION_STYLES.length];
              const Icon = style.icon;
              const selected = practiceChoice === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={saved}
                  onClick={() => setPracticeChoice(opt.id)}
                  className={`flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition-all disabled:cursor-not-allowed ${
                    selected
                      ? "border-mint-primary bg-mint-light/40"
                      : "border-border bg-background hover:border-mint-primary/50"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                      selected ? "border-mint-primary bg-mint-primary" : "border-border"
                    }`}
                    aria-hidden="true"
                  >
                    {selected && <span className="h-2 w-2 rounded-full bg-white" />}
                  </span>
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${style.tone}`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-slate-deep">{opt.label}</span>
                    <span className="block text-xs text-slate-text">{opt.description}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-4">
            <label className="mb-2 block text-sm font-semibold text-slate-deep">
              {content.q2ReasonPrompt}
            </label>
            <textarea
              rows={3}
              value={practiceReason}
              onChange={(e) => setPracticeReason(e.target.value.slice(0, MAX_REASON_CHARS))}
              disabled={saved}
              placeholder="อธิบายสั้น ๆ ถึงเหตุผลของคุณ..."
              className="w-full resize-none rounded-2xl border border-border bg-background p-4 text-sm outline-none focus:border-mint-primary disabled:opacity-60"
            />
            <div className="mt-2 text-right text-xs text-slate-text">
              {practiceReason.length} / {MAX_REASON_CHARS}
            </div>
          </div>
        </div>

        {/* Question 3 — Module 5 only: a concrete goal for the upcoming VR practice */}
        {content.q3 && (
          <div>
            <div className="mb-3 flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-mint-primary text-sm font-bold text-white">
                3
              </span>
              <span className="inline-flex items-center rounded-full bg-mint-light px-3 py-1 text-xs font-bold text-mint-primary">
                คำถามที่ 3 — Personal Practice Goal
              </span>
            </div>
            <p className="mb-3 font-semibold text-slate-deep">{content.q3.prompt}</p>
            <textarea
              rows={2}
              value={practiceGoal}
              onChange={(e) => setPracticeGoal(e.target.value.slice(0, MAX_GOAL_CHARS))}
              disabled={saved}
              placeholder={content.q3.placeholder}
              className="w-full resize-none rounded-2xl border border-border bg-background p-4 text-sm outline-none focus:border-mint-primary disabled:opacity-60"
            />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-text">
              <span>
                ไม่มีคำตอบถูกหรือผิด — คำตอบนี้จะกลายเป็นเป้าหมายส่วนตัวของคุณสำหรับการฝึก VR
              </span>
              <span>
                {practiceGoal.length} / {MAX_GOAL_CHARS}
              </span>
            </div>
          </div>
        )}
      </div>

      <button
        onClick={onSave}
        disabled={saved}
        className={`mt-6 flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-3 font-bold transition-all ${
          saved ? "bg-mint-light text-mint-primary" : "bg-slate-deep text-white hover:opacity-90"
        }`}
      >
        {saved ? (
          <>
            <CheckCircle2 className="h-4 w-4" /> บันทึกคำตอบแล้ว
          </>
        ) : (
          "บันทึกคำตอบ"
        )}
      </button>
    </section>
  );
}

function SummaryScreen({
  meta,
  matchScore,
  matchMax = 10,
  gameLabel = "Mini Game",
  reflectionKeywords,
  showBadge,
  onNext,
  onHome,
  hasNext,
}: {
  meta: ModuleMeta;
  matchScore: number;
  matchMax?: number;
  gameLabel?: string;
  reflectionKeywords: string[];
  showBadge: boolean;
  onNext: () => void;
  onHome: () => void;
  hasNext: boolean;
}) {
  const cognitivePct = Math.round((matchScore / matchMax) * 100);
  const affectivePct = Math.min(100, reflectionKeywords.length * 20);

  return (
    <section className="animate-fade-in">
      {showBadge && (
        <div className="mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-amber-100 via-mint-light to-emerald-100 p-8 text-center">
          <div className="animate-scale-in">
            <img
              src={meta.badgeImage}
              alt={meta.badge}
              className="mx-auto mb-2 h-32 w-32 object-contain drop-shadow-lg animate-scale-in"
            />
            <div className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-deep/70">
              Badge Unlocked
            </div>
            <h2 className="mb-1 text-2xl font-bold text-slate-deep">{meta.badge}</h2>
            <p className="text-sm text-slate-text">คุณจบ Module {meta.order} เรียบร้อยแล้ว</p>
          </div>
        </div>
      )}

      <h2 className="mb-4 text-xl font-bold text-slate-deep">สรุปผลการเรียนรู้</h2>
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-background p-5">
          <div className="mb-1 text-xs font-bold uppercase tracking-wider text-mint-primary">
            Cognitive Understanding
          </div>
          <div className="mb-2 text-3xl font-bold text-slate-deep">{cognitivePct}%</div>
          <div className="mb-2 h-2 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-mint-primary"
              style={{ width: `${cognitivePct}%` }}
            />
          </div>
          <div className="text-xs text-slate-text">
            {gameLabel} {matchScore}/{matchMax}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-background p-5">
          <div className="mb-1 text-xs font-bold uppercase tracking-wider text-mint-primary">
            Affective Reflection
          </div>
          <div className="mb-2 text-3xl font-bold text-slate-deep">{affectivePct}%</div>
          <div className="mb-2 h-2 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-mint-primary"
              style={{ width: `${affectivePct}%` }}
            />
          </div>
          <div className="text-xs text-slate-text">
            คำเชิงบวกที่ตรวจพบ:{" "}
            {reflectionKeywords.length > 0 ? reflectionKeywords.slice(0, 4).join(", ") : "—"}
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-2xl bg-mint-light p-5 text-center">
        <Award className="mx-auto mb-2 h-8 w-8 text-mint-primary" />
        <p className="font-semibold text-slate-deep">
          {hasNext
            ? `คุณพร้อมเข้าสู่ Module ${meta.order + 1}`
            : "คุณจบครบทุกโมดูลแล้ว พร้อมไป VR Simulation"}
        </p>
      </div>

      <div className="flex flex-col gap-2 md:flex-row">
        <button
          onClick={onHome}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-background px-6 py-3 font-bold text-slate-deep hover:bg-secondary"
        >
          <Home className="h-4 w-4" /> กลับหน้ารายการโมดูล
        </button>
        <button
          onClick={onNext}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-deep px-6 py-3 font-bold text-white hover:opacity-90"
        >
          {hasNext ? `ไป Module ${meta.order + 1}` : "ไป VR Simulation"}{" "}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}

// ---------- Utils ----------
