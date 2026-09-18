import { TrackedYouTube } from "@/components/tracked-youtube";
import { LEARNING_VIDEOS } from "@/lib/learning-videos";
import { deferredEffect } from "@/lib/deferred-effect";
import { useLearningTiming } from "@/hooks/use-learning-timing";
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
  Network,
  ListChecks,
  Puzzle,
  PenLine,
  Award,
  Sparkles,
  Info,
  Timer,
  Home,
} from "lucide-react";
import { LearnerShell } from "@/components/learner-shell";
import { completeModule, getLearnerOverview } from "@/lib/learner.functions";
import { logActivity } from "@/lib/activity";
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

interface ConceptNode {
  id: "meaning" | "importance" | "roles";
  label: string;
  icon: string;
  title: string;
  body: string;
  example: string;
}

const CONCEPT_NODES: ConceptNode[] = [
  {
    id: "meaning",
    label: "Meaning",
    icon: "📖",
    title: "ความหมายของ Constructive Feedback",
    body: "ข้อมูลที่สะท้อนช่องว่างระหว่างสถานะปัจจุบันของผู้เรียนกับเป้าหมาย พร้อมชี้แนวทางพัฒนา — ไม่ใช่การประเมินตัดสิน",
    example:
      "ตัวอย่าง: “ย่อหน้าที่ 2 ยังขาดหลักฐานสนับสนุน ลองเพิ่มสถิติจากแหล่งที่คุณอ้างไว้ในบทที่ 1 ดู”",
  },
  {
    id: "importance",
    label: "Importance",
    icon: "⭐",
    title: "ทำไมจึงสำคัญ",
    body: "Hattie & Timperley (2007) พบว่า Feedback ที่มีคุณภาพส่ง effect size 0.79 ต่อผลสัมฤทธิ์ — สูงกว่าค่าเฉลี่ยของทุก intervention ทางการศึกษา",
    example: "ผลลัพธ์: ผู้เรียนพัฒนา Growth Mindset · เพิ่มความมั่นใจ · ลดความวิตกกังวลในการเรียน",
  },
  {
    id: "roles",
    label: "Roles",
    icon: "🎓",
    title: "บทบาทของอาจารย์",
    body: "อาจารย์ = Coach + Mirror + Guide ไม่ใช่ผู้ตัดสิน หน้าที่คือช่วยผู้เรียนเห็นตัวเองและเดินต่อได้",
    example: "การปฏิบัติ: ฟังก่อนพูด · ถามก่อนสอน · ชี้แนวทางก่อนตัดสินผล",
  },
];

interface QuizItem {
  id: string;
  scenario: string;
  options: { text: string; correct: boolean; explanation: string }[];
}

const QUIZ_ITEMS: QuizItem[] = [
  {
    id: "q1",
    scenario: "นักศึกษาส่งรายงานที่มีจุดแข็งชัดเจนแต่บทสรุปยังอ่อน คุณจะพูดกับเขาว่าอย่างไร",
    options: [
      {
        text: "“บทสรุปแย่มาก เขียนใหม่ทั้งหมด”",
        correct: false,
        explanation: "เป็น Evaluative Feedback ที่ทำร้ายและไม่ชี้ทางแก้",
      },
      {
        text: "“การวิเคราะห์ในบทที่ 2 หนักแน่นมาก ลองต่อยอดตรรกะนั้นให้บทสรุปชัดขึ้นได้ไหม”",
        correct: true,
        explanation: "ยอมรับจุดแข็ง · เจาะจง · เสนอทางเดินต่อ — ครบหลัก Constructive",
      },
      {
        text: "“ก็โอเคนะ ลองแก้บทสรุปดู”",
        correct: false,
        explanation: "กว้างเกินไป ผู้เรียนไม่รู้ว่าจะเริ่มตรงไหน",
      },
    ],
  },
  {
    id: "q2",
    scenario: "นักศึกษานำเสนอด้วยความประหม่า เนื้อหาถูกแต่ speaking pace เร็วเกินไป",
    options: [
      {
        text: "“พูดเร็วเกินไป ฟังไม่ทัน”",
        correct: false,
        explanation: "ไม่รับรู้ความรู้สึก · ไม่มี actionable step",
      },
      {
        text: "“เนื้อหาแน่นดี เห็นได้ว่าตั้งใจ ครั้งหน้าลองเว้นจังหวะ 2 วิที่ท้าย key point”",
        correct: true,
        explanation: "ยืนยันความพยายาม · คำแนะนำเจาะจง · เป็น Feedforward",
      },
      {
        text: "“ยังต้องฝึกอีกเยอะนะ”",
        correct: false,
        explanation: "Fixed mindset language · ไม่มีทางเดินต่อ",
      },
    ],
  },
  {
    id: "q3",
    scenario: "นักศึกษามาถามงานที่ยังไม่เสร็จและดูท้อ อยากได้กำลังใจก่อน",
    options: [
      {
        text: "เริ่มจากชี้ข้อผิดพลาดทันทีเพื่อประหยัดเวลา",
        correct: false,
        explanation: "ปิดกั้น Psychological Safety · สมองปิดรับ",
      },
      {
        text: "“ก่อนที่เราจะดูงาน อาจารย์อยากถามก่อนว่ารู้สึกอย่างไรกับส่วนที่ทำอยู่”",
        correct: true,
        explanation: "Empathy first · เปิดพื้นที่ปลอดภัยก่อน feedback",
      },
      {
        text: "ให้คะแนนตามที่เห็นแล้วส่งกลับ ไม่ต้องคุยเพิ่ม",
        correct: false,
        explanation: "ขาด Coaching · เสียโอกาสพัฒนา",
      },
    ],
  },
];

interface MatchPair {
  id: string;
  principle: string;
  description: string;
}

const MATCH_PAIRS: MatchPair[] = [
  { id: "p1", principle: "Specific", description: "ชี้จุดพัฒนาอย่างเจาะจง อ้างอิงชิ้นงาน" },
  { id: "p2", principle: "Empathetic", description: "เข้าใจอารมณ์และบริบทของผู้เรียน" },
  { id: "p3", principle: "Motivating", description: "สร้างแรงจูงใจ ยอมรับความพยายาม" },
  { id: "p4", principle: "Actionable", description: "จบด้วยขั้นตอนที่ปฏิบัติได้จริง" },
  { id: "p5", principle: "Timely", description: "ให้ในจังหวะที่ผู้เรียนยังต่อยอดได้" },
];

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
  const [activeModule, setActiveModule] = useState<string | null>(null);

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
    <LearnerShell displayName={data?.profile?.display_name} avatarUrl={data?.profile?.avatar_url}>
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-mint-light px-3 py-1 text-xs font-bold uppercase tracking-wider text-mint-primary">
            <BookOpenText className="h-3 w-3" />
            Cognitive Learning · 5 Modules · 5E Model
          </div>
          <h1 className="text-3xl font-bold">บทเรียน Constructive Feedback</h1>
          <p className="text-slate-text">
            แต่ละโมดูลใช้เวลาประมาณ 10 นาที ผ่าน 5 กิจกรรมตามหลัก 5E (Engage · Explore · Explain ·
            Elaborate · Evaluate) พร้อม Badge เมื่อจบโมดูล
          </p>
        </div>

        <div className="mb-8 rounded-2xl border border-border bg-background p-6">
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
                  <img src={m.badgeImage} alt="" className="h-4 w-4 rounded-full object-cover" />{" "}
                  {m.badge}
                </span>
              ))}
            </div>
          )}
        </div>

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
                className={`flex w-full items-center gap-4 rounded-2xl border p-5 text-left transition-all ${
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
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2 text-xs text-slate-text">
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
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-deep px-8 py-4 font-bold text-white hover:opacity-90"
          >
            เรียนครบทุกโมดูล · ไป VR Simulation <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </LearnerShell>
  );
}

// ---------- Module Runner (5E flow) ----------

type StageId = "intro" | "engage" | "explore" | "explain" | "elaborate" | "evaluate" | "summary";

const STAGES: { id: StageId; label: string; icon: typeof PlayCircle }[] = [
  { id: "engage", label: "Engage · Video", icon: PlayCircle },
  { id: "explore", label: "Explore · Concept", icon: Network },
  { id: "explain", label: "Explain · Quiz", icon: ListChecks },
  { id: "elaborate", label: "Elaborate · Match", icon: Puzzle },
  { id: "evaluate", label: "Evaluate · Reflect", icon: PenLine },
];

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
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [stage, setStage] = useState<StageId>("intro");
  const [videoDone, setVideoDone] = useState(false);
  const [videoNote, setVideoNote] = useState("");
  const [openedNodes, setOpenedNodes] = useState<Set<string>>(new Set());
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [matchedIds, setMatchedIds] = useState<Set<string>>(new Set());
  const [selectedPrinciple, setSelectedPrinciple] = useState<string | null>(null);
  const [shuffledDescs] = useState(() => shuffle(MATCH_PAIRS.map((p) => p.id)));
  const [reflection, setReflection] = useState("");
  const [reflectionSaved, setReflectionSaved] = useState(false);
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
    mutationFn: (id: string) => completeModule({ data: { module_id: id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["learner-overview"] });
      void logActivity({ type: "module_completed", moduleId, runId: timing.runId() });
    },
  });

  // ----- Derived gating -----
  const engageDone = videoDone;
  const exploreDone = openedNodes.size >= 3;
  const explainDone = Object.keys(quizAnswers).length >= QUIZ_ITEMS.length;
  const elaborateDone = matchedIds.size >= MATCH_PAIRS.length;
  const evaluateDone = reflectionSaved;

  const quizScore = useMemo(() => {
    let s = 0;
    for (const q of QUIZ_ITEMS) {
      const idx = quizAnswers[q.id];
      if (idx != null && q.options[idx]?.correct) s++;
    }
    return s;
  }, [quizAnswers]);

  const reflectionKeywords = useMemo(() => {
    const text = reflection.toLowerCase();
    return POSITIVE_KEYWORDS.filter((k) => text.includes(k.toLowerCase()));
  }, [reflection]);

  const stageIndex = STAGES.findIndex((s) => s.id === stage);
  const progressPct =
    stage === "intro"
      ? 0
      : stage === "summary"
        ? 100
        : Math.round(((stageIndex + 1) / STAGES.length) * 100);

  const canProceed = () => {
    switch (stage) {
      case "engage":
        return engageDone;
      case "explore":
        return exploreDone;
      case "explain":
        return explainDone;
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
    const order: StageId[] = [
      "intro",
      "engage",
      "explore",
      "explain",
      "elaborate",
      "evaluate",
      "summary",
    ];
    const i = order.indexOf(stage);
    if (i < order.length - 1) {
      const next = order[i + 1];
      setStage(next);
      if (next === "summary") {
        // trigger completion
        if (!alreadyCompleted) {
          mutation.mutate(moduleId);
        } else {
          void logActivity({ type: "module_completed", moduleId, runId: timing.runId() });
        }
        setTimeout(() => setShowBadge(true), 400);
      }
    }
  };

  const prevStage = () => {
    const order: StageId[] = [
      "intro",
      "engage",
      "explore",
      "explain",
      "elaborate",
      "evaluate",
      "summary",
    ];
    const i = order.indexOf(stage);
    if (i > 0) setStage(order[i - 1]);
  };

  // If this is not module 1, show a lighter placeholder flow
  const isM1 = moduleId === "m1";

  return (
    <LearnerShell displayName={displayName} avatarUrl={avatarUrl}>
      <div className="mx-auto max-w-4xl">
        {/* Sticky progress header */}
        <div className="sticky top-0 z-20 -mx-4 mb-6 border-b border-border bg-background/95 px-4 py-4 backdrop-blur">
          <div className="mb-3 flex items-center justify-between gap-4">
            <button
              onClick={onExit}
              className="inline-flex items-center gap-1 text-sm font-semibold text-slate-text hover:text-slate-deep"
            >
              <ArrowLeft className="h-4 w-4" /> รายการโมดูล
            </button>
            <div className="inline-flex items-center gap-1.5 text-xs text-slate-text">
              <img src={meta.badgeImage} alt="" className="h-5 w-5 rounded-full object-cover" />
              Module {meta.order} · {meta.badge}
            </div>
            <div className="text-xs font-bold text-mint-primary">
              {stage === "intro"
                ? "เริ่มต้น"
                : stage === "summary"
                  ? "จบโมดูล"
                  : `${stageIndex + 1} / ${STAGES.length}`}
            </div>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-mint-primary transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="mt-3 hidden gap-1 md:flex">
            {STAGES.map((s, i) => {
              const active = s.id === stage;
              const past = i < stageIndex;
              const Icon = s.icon;
              return (
                <div
                  key={s.id}
                  className={`flex flex-1 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                    active
                      ? "bg-mint-primary text-white"
                      : past
                        ? "bg-mint-light text-mint-primary"
                        : "bg-secondary text-slate-text"
                  }`}
                >
                  <Icon className="h-3 w-3 shrink-0" />
                  <span className="truncate">{s.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Screens */}
        {stage === "intro" && <IntroScreen meta={meta} onStart={nextStage} isM1={isM1} />}

        {isM1 ? (
          <>
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
            {stage === "explore" && (
              <ExploreScreen
                opened={openedNodes}
                setOpened={setOpenedNodes}
                active={activeNode}
                setActive={setActiveNode}
              />
            )}
            {stage === "explain" && (
              <ExplainScreen answers={quizAnswers} setAnswers={setQuizAnswers} />
            )}
            {stage === "elaborate" && (
              <ElaborateScreen
                matched={matchedIds}
                setMatched={setMatchedIds}
                selected={selectedPrinciple}
                setSelected={setSelectedPrinciple}
                descOrder={shuffledDescs}
              />
            )}
            {stage === "evaluate" && (
              <EvaluateScreen
                reflection={reflection}
                setReflection={setReflection}
                saved={reflectionSaved}
                onSave={() => {
                  if (reflection.trim().length < 20) {
                    toast.error("ช่วยเขียนสะท้อนความคิดอย่างน้อย 20 ตัวอักษร");
                    return;
                  }
                  setReflectionSaved(true);
                  toast.success("บันทึกคำตอบเรียบร้อย");
                }}
                keywordsFound={reflectionKeywords}
              />
            )}
            {stage === "summary" && (
              <SummaryScreen
                meta={meta}
                quizScore={quizScore}
                matchScore={MATCH_PAIRS.length}
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
            )}
          </>
        ) : (
          // Non-M1 lightweight flow — same shell, placeholder activities that just require read + continue
          <PlaceholderStages
            stage={stage}
            meta={meta}
            onQuickPass={() => {
              // auto-satisfy gating for non-M1 modules for now
              if (stage === "engage") setVideoDone(true);
              if (stage === "explore") setOpenedNodes(new Set(CONCEPT_NODES.map((n) => n.id)));
              if (stage === "explain") {
                const auto: Record<string, number> = {};
                QUIZ_ITEMS.forEach((q) => {
                  auto[q.id] = q.options.findIndex((o) => o.correct);
                });
                setQuizAnswers(auto);
              }
              if (stage === "elaborate") setMatchedIds(new Set(MATCH_PAIRS.map((p) => p.id)));
              if (stage === "evaluate") setReflectionSaved(true);
            }}
            reflection={reflection}
            setReflection={setReflection}
            reflectionSaved={reflectionSaved}
            onSaveReflection={() => {
              if (reflection.trim().length < 20) {
                toast.error("ช่วยเขียนสะท้อนความคิดอย่างน้อย 20 ตัวอักษร");
                return;
              }
              setReflectionSaved(true);
              toast.success("บันทึกคำตอบเรียบร้อย");
            }}
            summaryProps={{
              meta,
              quizScore,
              matchScore: MATCH_PAIRS.length,
              reflectionKeywords,
              showBadge,
              hasNext: MODULES.findIndex((m) => m.id === moduleId) < MODULES.length - 1,
              onNext: () => {
                const idx = MODULES.findIndex((m) => m.id === moduleId);
                const nextMod = MODULES[idx + 1];
                if (nextMod) onExit();
                else navigate({ to: "/vr-simulation" });
              },
              onHome: onExit,
            }}
          />
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
    case "explore":
      return "คลิกให้ครบทั้ง 3 node ในแผนภาพ";
    case "explain":
      return "ตอบคำถาม Mini Quiz ให้ครบทุกข้อ";
    case "elaborate":
      return "จับคู่หลักการกับคำอธิบายให้ครบทุกคู่";
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
  isM1,
}: {
  meta: ModuleMeta;
  onStart: () => void;
  isM1: boolean;
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

      {!isM1 && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-dashed border-mint-primary/40 bg-mint-light/30 p-4 text-sm text-slate-deep">
          <Info className="h-4 w-4 shrink-0 text-mint-primary" />
          <span>
            เนื้อหาเชิงลึกของโมดูลนี้กำลังจัดทำ — ท่านสามารถเดินผ่านโครงกิจกรรม 5E
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
  const video = LEARNING_VIDEOS[moduleId];

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

function ExploreScreen({
  opened,
  setOpened,
  active,
  setActive,
}: {
  opened: Set<string>;
  setOpened: (s: Set<string>) => void;
  active: string | null;
  setActive: (v: string | null) => void;
}) {
  const openNode = (id: string) => {
    setActive(id);
    const next = new Set(opened);
    next.add(id);
    setOpened(next);
  };
  const activeNode = CONCEPT_NODES.find((n) => n.id === active);

  return (
    <section className="animate-fade-in">
      <div className="mb-2 text-xs font-bold uppercase tracking-wider text-mint-primary">
        กิจกรรมที่ 2 · Explore
      </div>
      <h2 className="mb-1 text-2xl font-bold text-slate-deep">Interactive Concept Map</h2>
      <p className="mb-6 text-sm text-slate-text">
        คลิกทั้ง 3 node เพื่อสำรวจความหมาย · ความสำคัญ · และบทบาทของ Constructive Feedback
      </p>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="relative aspect-square rounded-3xl border border-border bg-gradient-to-br from-mint-light/40 to-transparent p-6">
          {/* central node */}
          <div className="absolute left-1/2 top-1/2 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-slate-deep text-center text-xs font-bold text-white shadow-lg">
            Constructive
            <br />
            Feedback
          </div>
          {/* nodes */}
          {CONCEPT_NODES.map((n, i) => {
            const positions = [
              { top: "8%", left: "50%", transform: "translate(-50%, 0)" },
              { top: "70%", left: "12%", transform: "translate(0, 0)" },
              { top: "70%", right: "12%", transform: "translate(0, 0)" },
            ];
            const style = positions[i];
            const isOpen = opened.has(n.id);
            const isActive = active === n.id;
            return (
              <button
                key={n.id}
                onClick={() => openNode(n.id)}
                style={style}
                className={`absolute flex h-20 w-20 flex-col items-center justify-center rounded-2xl border-2 text-xs font-bold transition-all hover:scale-105 ${
                  isActive
                    ? "border-mint-primary bg-mint-primary text-white shadow-lg"
                    : isOpen
                      ? "border-mint-primary bg-mint-light text-mint-primary"
                      : "border-border bg-background text-slate-deep"
                }`}
                title={n.label}
              >
                <span className="text-2xl">{n.icon}</span>
                <span>{n.label}</span>
                {isOpen && (
                  <CheckCircle2 className="absolute -right-1 -top-1 h-5 w-5 rounded-full bg-white text-mint-primary" />
                )}
              </button>
            );
          })}
        </div>

        <div className="rounded-2xl border border-border bg-background p-6">
          {activeNode ? (
            <div className="animate-fade-in">
              <div className="mb-2 text-3xl">{activeNode.icon}</div>
              <div className="mb-1 text-xs font-bold uppercase tracking-wider text-mint-primary">
                {activeNode.label}
              </div>
              <h3 className="mb-2 text-lg font-bold text-slate-deep">{activeNode.title}</h3>
              <p className="mb-4 text-sm leading-relaxed text-slate-text">{activeNode.body}</p>
              <div className="rounded-xl bg-mint-light/50 p-3 text-sm text-slate-deep">
                {activeNode.example}
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-center text-sm text-slate-text">
              คลิก node ในแผนภาพเพื่ออ่านรายละเอียด
            </div>
          )}
          <div className="mt-4 flex items-center gap-2 text-xs text-slate-text">
            <span className="font-semibold">เปิดแล้ว:</span>
            <span>
              {opened.size} / {CONCEPT_NODES.length}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

function ExplainScreen({
  answers,
  setAnswers,
}: {
  answers: Record<string, number>;
  setAnswers: (a: Record<string, number>) => void;
}) {
  return (
    <section className="animate-fade-in">
      <div className="mb-2 text-xs font-bold uppercase tracking-wider text-mint-primary">
        กิจกรรมที่ 3 · Explain
      </div>
      <h2 className="mb-1 text-2xl font-bold text-slate-deep">Mini Quiz · Positive vs Negative</h2>
      <p className="mb-6 text-sm text-slate-text">
        เลือกประโยค Feedback ที่เหมาะสมที่สุดในแต่ละสถานการณ์
      </p>

      <div className="space-y-5">
        {QUIZ_ITEMS.map((q, qi) => {
          const chosen = answers[q.id];
          return (
            <div key={q.id} className="rounded-2xl border border-border bg-background p-5">
              <div className="mb-3 flex items-start gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-mint-light text-xs font-bold text-mint-primary">
                  {qi + 1}
                </span>
                <p className="text-sm font-semibold text-slate-deep">{q.scenario}</p>
              </div>
              <div className="space-y-2">
                {q.options.map((opt, oi) => {
                  const isChosen = chosen === oi;
                  const showResult = chosen != null;
                  const correct = opt.correct;
                  return (
                    <button
                      key={oi}
                      disabled={showResult}
                      onClick={() => setAnswers({ ...answers, [q.id]: oi })}
                      className={`w-full rounded-xl border p-3 text-left text-sm transition-all ${
                        !showResult
                          ? "border-border hover:border-mint-primary hover:bg-mint-light/30"
                          : isChosen && correct
                            ? "border-emerald-400 bg-emerald-50 text-emerald-900"
                            : isChosen && !correct
                              ? "border-rose-400 bg-rose-50 text-rose-900"
                              : correct
                                ? "border-emerald-200 bg-emerald-50/60 text-emerald-900"
                                : "border-border bg-background opacity-60"
                      }`}
                    >
                      <div className="font-medium">{opt.text}</div>
                      {showResult && (isChosen || correct) && (
                        <div className="mt-1 text-xs opacity-80">
                          {correct ? "✓ " : "✗ "}
                          {opt.explanation}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {Object.keys(answers).length >= QUIZ_ITEMS.length && (
        <div className="mt-5 flex items-center justify-between rounded-2xl bg-mint-light p-4">
          <span className="text-sm font-semibold text-slate-deep">คะแนน Mini Quiz</span>
          <span className="text-xl font-bold text-mint-primary">
            {QUIZ_ITEMS.reduce((acc, q) => acc + (q.options[answers[q.id]]?.correct ? 1 : 0), 0)} /{" "}
            {QUIZ_ITEMS.length}
          </span>
        </div>
      )}
    </section>
  );
}

function ElaborateScreen({
  matched,
  setMatched,
  selected,
  setSelected,
  descOrder,
}: {
  matched: Set<string>;
  setMatched: (s: Set<string>) => void;
  selected: string | null;
  setSelected: (v: string | null) => void;
  descOrder: string[];
}) {
  const tryMatch = (principleId: string, descId: string) => {
    if (principleId === descId) {
      const next = new Set(matched);
      next.add(principleId);
      setMatched(next);
      setSelected(null);
      toast.success("จับคู่ถูกต้อง");
    } else {
      toast.error("ยังไม่ใช่คู่ที่ถูกต้อง ลองพิจารณาอีกครั้ง");
      setSelected(null);
    }
  };

  const principleMonograms: Record<string, string> = {
    p1: "S",
    p2: "E",
    p3: "M",
    p4: "A",
    p5: "T",
  };
  const descMonograms = ["I", "II", "III", "IV", "V"];

  return (
    <section className="animate-fade-in">
      <div className="mb-2 text-xs font-bold uppercase tracking-wider text-mint-primary">
        กิจกรรมที่ 4 · Elaborate
      </div>
      <h2 className="mb-1 text-2xl font-bold text-slate-deep">Card Matching · หลักการ 5 ข้อ</h2>
      <p className="mb-4 text-sm text-slate-text">
        เลือกไพ่ "หลักการ" ทางซ้าย จากนั้นเลือกไพ่ "คำอธิบาย" ทางขวาที่สอดคล้องกัน
      </p>

      {/* Progress ribbon */}
      <div className="mb-6 flex items-center justify-between rounded-xl border border-border bg-mint-light/30 px-4 py-2.5 text-xs">
        <span className="font-semibold uppercase tracking-wider text-slate-deep">
          ความคืบหน้าเกม
        </span>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-32 overflow-hidden rounded-full bg-white">
            <div
              className="h-full rounded-full bg-mint-primary transition-all"
              style={{ width: `${(matched.size / MATCH_PAIRS.length) * 100}%` }}
            />
          </div>
          <span className="font-bold text-mint-primary tabular-nums">
            {matched.size} / {MATCH_PAIRS.length}
          </span>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* PRINCIPLES */}
        <div>
          <div className="mb-3 flex items-center gap-2">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-text">
              Principles · หลักการ
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="space-y-3">
            {MATCH_PAIRS.map((p) => {
              const done = matched.has(p.id);
              const active = selected === p.id;
              return (
                <button
                  key={p.id}
                  disabled={done}
                  onClick={() => setSelected(active ? null : p.id)}
                  className={`group relative w-full overflow-hidden rounded-2xl border-2 text-left transition-all duration-300 ${
                    done
                      ? "border-mint-primary/40 bg-white shadow-none"
                      : active
                        ? "-translate-y-0.5 border-mint-primary bg-white shadow-lg shadow-mint-primary/20"
                        : "border-border bg-white hover:-translate-y-0.5 hover:border-mint-primary/60 hover:shadow-md"
                  }`}
                >
                  {/* corner rank */}
                  <span className="absolute right-4 top-3 font-serif text-3xl italic leading-none text-slate-deep/10">
                    {principleMonograms[p.id]}
                  </span>
                  <div className="flex items-center gap-4 p-5">
                    <div
                      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl font-serif text-2xl font-bold transition-colors ${
                        done
                          ? "bg-mint-primary/15 text-mint-primary"
                          : active
                            ? "bg-mint-primary text-white"
                            : "bg-mint-light text-mint-primary group-hover:bg-mint-primary group-hover:text-white"
                      }`}
                    >
                      {principleMonograms[p.id]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-text">
                        Principle
                      </div>
                      <div className="font-serif text-lg font-bold tracking-tight text-slate-deep">
                        {p.principle}
                      </div>
                    </div>
                    {done ? (
                      <CheckCircle2 className="h-5 w-5 text-mint-primary" />
                    ) : active ? (
                      <span className="rounded-full bg-slate-deep px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                        Selected
                      </span>
                    ) : null}
                  </div>
                  {/* refined bottom accent */}
                  <div
                    className={`h-1 w-full transition-colors ${
                      done ? "bg-mint-primary/60" : active ? "bg-mint-primary" : "bg-transparent"
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* DESCRIPTIONS */}
        <div>
          <div className="mb-3 flex items-center gap-2">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-text">
              Descriptions · คำอธิบาย
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="space-y-3">
            {descOrder.map((id, i) => {
              const pair = MATCH_PAIRS.find((p) => p.id === id)!;
              const done = matched.has(id);
              const armed = !!selected && !done;
              return (
                <button
                  key={id}
                  disabled={done || !selected}
                  onClick={() => selected && tryMatch(selected, id)}
                  className={`group relative w-full overflow-hidden rounded-2xl border-2 text-left transition-all duration-300 ${
                    done
                      ? "border-mint-primary/40 bg-white"
                      : armed
                        ? "border-dashed border-mint-primary bg-white hover:-translate-y-0.5 hover:border-solid hover:shadow-lg hover:shadow-mint-primary/20"
                        : "cursor-not-allowed border-border bg-secondary/40"
                  }`}
                >
                  <span className="absolute right-4 top-3 font-serif text-3xl italic leading-none text-slate-deep/10">
                    {descMonograms[i]}
                  </span>
                  <div className="flex items-center gap-4 p-5">
                    <div
                      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl font-serif text-lg font-bold ${
                        done
                          ? "bg-mint-primary/15 text-mint-primary"
                          : armed
                            ? "bg-mint-light text-mint-primary group-hover:bg-mint-primary group-hover:text-white"
                            : "bg-white text-slate-text"
                      }`}
                    >
                      {descMonograms[i]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-text">
                        Description
                      </div>
                      <div className="text-sm leading-relaxed text-slate-deep">
                        {pair.description}
                      </div>
                    </div>
                    {done && <CheckCircle2 className="h-5 w-5 shrink-0 text-mint-primary" />}
                  </div>
                  <div
                    className={`h-1 w-full transition-colors ${
                      done ? "bg-mint-primary/60" : "bg-transparent"
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Hint / status */}
      <div className="mt-6 rounded-xl border border-dashed border-mint-primary/40 bg-mint-light/20 p-3 text-center text-xs text-slate-deep">
        {matched.size === MATCH_PAIRS.length
          ? "✓ จับคู่ครบทั้งหมดแล้ว — สามารถไปขั้นตอนถัดไปได้"
          : selected
            ? "เลือกไพ่ 'คำอธิบาย' ทางขวาที่คิดว่าตรงกับหลักการที่เลือกไว้"
            : "เริ่มด้วยการเลือกไพ่ 'หลักการ' ทางซ้าย"}
      </div>
    </section>
  );
}

function EvaluateScreen({
  reflection,
  setReflection,
  saved,
  onSave,
  keywordsFound,
}: {
  reflection: string;
  setReflection: (v: string) => void;
  saved: boolean;
  onSave: () => void;
  keywordsFound: string[];
}) {
  return (
    <section className="animate-fade-in">
      <div className="mb-2 text-xs font-bold uppercase tracking-wider text-mint-primary">
        กิจกรรมที่ 5 · Evaluate & Reflect
      </div>
      <h2 className="mb-1 text-2xl font-bold text-slate-deep">Reflection</h2>
      <p className="mb-6 text-sm text-slate-text">
        การเขียนสะท้อนคิดช่วยตกผลึกความรู้ — งานวิจัยชี้ว่าพิมพ์ดีกว่าอัดเสียงในการกระตุ้น deep
        reflection
      </p>

      <div className="mb-4 rounded-2xl border border-border bg-background p-5">
        <label className="mb-2 block text-sm font-semibold text-slate-deep">
          คุณคิดว่าอาจารย์ที่ดีควรให้ Feedback อย่างไร?
        </label>
        <textarea
          rows={6}
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          disabled={saved}
          placeholder="เขียนอย่างน้อย 20 ตัวอักษร — ลองใช้คำเช่น รับฟัง · เจาะจง · สนับสนุน · พัฒนา..."
          className="w-full resize-none rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-mint-primary disabled:opacity-60"
        />
        <div className="mt-2 flex items-center justify-between text-xs text-slate-text">
          <span>{reflection.length} ตัวอักษร</span>
          {keywordsFound.length > 0 && (
            <span className="inline-flex items-center gap-1 font-semibold text-mint-primary">
              <Sparkles className="h-3 w-3" /> ตรวจพบคำเชิงบวก:{" "}
              {keywordsFound.slice(0, 5).join(", ")}
            </span>
          )}
        </div>
      </div>

      <button
        onClick={onSave}
        disabled={saved}
        className={`flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-3 font-bold transition-all ${
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
  quizScore,
  matchScore,
  reflectionKeywords,
  showBadge,
  onNext,
  onHome,
  hasNext,
}: {
  meta: ModuleMeta;
  quizScore: number;
  matchScore: number;
  reflectionKeywords: string[];
  showBadge: boolean;
  onNext: () => void;
  onHome: () => void;
  hasNext: boolean;
}) {
  const cognitivePct = Math.round(
    ((quizScore + matchScore) / (QUIZ_ITEMS.length + MATCH_PAIRS.length)) * 100,
  );
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
            Quiz {quizScore}/{QUIZ_ITEMS.length} · Matching {matchScore}/{MATCH_PAIRS.length}
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

// ---------- Placeholder flow for M2-M5 ----------

function PlaceholderStages({
  stage,
  meta,
  onQuickPass,
  reflection,
  setReflection,
  reflectionSaved,
  onSaveReflection,
  summaryProps,
}: {
  stage: StageId;
  meta: ModuleMeta;
  onQuickPass: () => void;
  reflection: string;
  setReflection: (v: string) => void;
  reflectionSaved: boolean;
  onSaveReflection: () => void;
  summaryProps: {
    meta: ModuleMeta;
    quizScore: number;
    matchScore: number;
    reflectionKeywords: string[];
    showBadge: boolean;
    hasNext: boolean;
    onNext: () => void;
    onHome: () => void;
  };
}) {
  if (stage === "intro") return null;
  if (stage === "summary") {
    return <SummaryScreen {...summaryProps} />;
  }

  const activityMeta: Record<
    Exclude<StageId, "intro" | "summary">,
    { title: string; desc: string; icon: typeof PlayCircle }
  > = {
    engage: {
      title: "Engage · เปิดประเด็น",
      desc: "ชมสถานการณ์ตัวอย่างเพื่อกระตุ้นความสนใจ",
      icon: PlayCircle,
    },
    explore: {
      title: "Explore · สำรวจแนวคิด",
      desc: "สำรวจโครงสร้างและองค์ประกอบสำคัญของหัวข้อ",
      icon: Network,
    },
    explain: {
      title: "Explain · ทำความเข้าใจ",
      desc: "ตอบคำถามสั้น ๆ เพื่อสรุปหลักการ",
      icon: ListChecks,
    },
    elaborate: {
      title: "Elaborate · ต่อยอด",
      desc: "จับคู่ / ประยุกต์ใช้ในสถานการณ์จริง",
      icon: Puzzle,
    },
    evaluate: {
      title: "Evaluate · สะท้อนคิด",
      desc: "เขียนสะท้อนสิ่งที่เรียนรู้",
      icon: PenLine,
    },
  };
  const info = activityMeta[stage];
  const Icon = info.icon;

  if (stage === "evaluate") {
    return (
      <EvaluateScreen
        reflection={reflection}
        setReflection={setReflection}
        saved={reflectionSaved}
        onSave={onSaveReflection}
        keywordsFound={POSITIVE_KEYWORDS.filter((k) =>
          reflection.toLowerCase().includes(k.toLowerCase()),
        )}
      />
    );
  }

  return (
    <section className="animate-fade-in">
      <div className="mb-2 text-xs font-bold uppercase tracking-wider text-mint-primary">
        {info.title}
      </div>
      <h2 className="mb-1 text-2xl font-bold text-slate-deep">{meta.title}</h2>
      <p className="mb-6 text-sm text-slate-text">{info.desc}</p>

      <div className="mb-4 flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-mint-light/20 p-12 text-center">
        <Icon className="mb-3 h-12 w-12 text-mint-primary" />
        <p className="mb-1 text-sm font-semibold text-slate-deep">กำลังจัดทำเนื้อหาเชิงลึก</p>
        <p className="mb-4 max-w-md text-xs text-slate-text">
          กิจกรรมนี้จะใช้ template เดียวกับ Module 1 — สามารถ preview flow ได้โดยคลิกด้านล่าง
          เพื่อจำลองว่าจบกิจกรรม
        </p>
        <button
          onClick={onQuickPass}
          className="rounded-xl bg-slate-deep px-5 py-2 text-sm font-bold text-white hover:opacity-90"
        >
          จำลองว่าจบกิจกรรมนี้
        </button>
      </div>
    </section>
  );
}

// ---------- Utils ----------

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
