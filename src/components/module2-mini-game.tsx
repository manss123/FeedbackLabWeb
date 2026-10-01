import { useRef, useState, type ReactNode } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  ArrowRight,
  BarChart3,
  BookOpenText,
  CheckCircle2,
  Gamepad2,
  GripVertical,
  Layers,
  Lightbulb,
  MessageCircle,
  Rocket,
  RotateCcw,
  Search,
  Star,
  Trophy,
  XCircle,
} from "lucide-react";
import banner from "@/assets/banners/module2-banner.webp";
import aiCoaching1 from "@/assets/contents/ai-coaching-1.webp";
// Shared across every module's mini-game (not M2-specific):
// checkmark/celebration badges, step-number badges.
import correctBadge from "@/assets/contents/correct.webp";
import greatJobBadge from "@/assets/contents/great-job.webp";
import step1Badge from "@/assets/contents/step-1.webp";
import step2Badge from "@/assets/contents/step-2.webp";
// M2-specific content: its own round scenarios and two AI-feedback avatar
// poses (a pointing bust for the inline tip bubble, a tablet fist-pump for
// the round-complete celebration — mirrors how M1 reuses one avatar for both).
import avatarFeedback from "@/assets/contents/M2/avatar-feedback.webp";
import avatarFeedbackCelebrate from "@/assets/contents/M2/avatar-feedback-2.webp";
import scenarioR1 from "@/assets/contents/M2/scenario-R1.webp";
import scenarioR2 from "@/assets/contents/M2/scenario-R2.webp";
import scenarioR3 from "@/assets/contents/M2/scenario-R3.webp";
import { Button } from "./ui/button";
import {
  ROUNDS,
  checkBuild,
  miniGameResult,
  roundComplete,
  type MiniGameState,
  type RoundProgress,
} from "@/lib/module2-mini-game";

const tones = [
  "border-monitor-teal/30 bg-monitor-teal/10 text-monitor-teal",
  "border-monitor-blue/30 bg-monitor-blue/10 text-monitor-blue",
  "border-monitor-amber/30 bg-monitor-amber/10 text-monitor-amber",
  "border-monitor-violet/30 bg-monitor-violet/10 text-monitor-violet",
];
const slotIcons = [Trophy, BarChart3, Lightbulb, Star];
const scenarioImages = [scenarioR1, scenarioR2, scenarioR3];

// One draggable sentence card — used both in the pool and, once placed, inside
// a slot. Each instance needs its own useDraggable call (drag state is keyed
// by DOM node), so this can't be inlined into a .map() in the parent.
function DraggableCard({
  id,
  disabled,
  highlighted,
  className,
  children,
}: {
  id: number;
  disabled: boolean;
  highlighted: boolean;
  className: string;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `card-${id}`,
    disabled,
  });
  return (
    <button
      type="button"
      ref={setNodeRef}
      disabled={disabled}
      {...listeners}
      {...attributes}
      className={`${className} ${disabled ? "" : "touch-none select-none cursor-grab active:cursor-grabbing"} ${isDragging ? "opacity-30" : ""} ${highlighted ? "border-mint-primary bg-mint-primary/10" : "border-border bg-background"}`}
    >
      {children}
    </button>
  );
}

// The sentence pool and each answer slot are all drop targets.
function DropZone({
  id,
  className,
  children,
}: {
  id: string;
  className: string;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`${className} ${isOver ? "ring-2 ring-mint-primary/50" : ""}`}>
      {children}
    </div>
  );
}

export function Module2MiniGame({
  value,
  onChange,
}: {
  value: MiniGameState;
  onChange: (next: MiniGameState) => void;
}) {
  const [roundIndex, setRoundIndex] = useState(() =>
    Math.max(
      0,
      value.rounds.findIndex((r, i) => !roundComplete(r, i)),
    ),
  );
  const build = ROUNDS[roundIndex].build;
  const [cards, setCards] = useState<number[]>(() => (build ? build.slots.map(() => -1) : []));
  const [dragging, setDragging] = useState<number | null>(null);
  // Step 2 only appears once the learner clicks "ไปขั้นตอนถัดไป" — answering
  // Step 1 correctly alone would otherwise reveal it immediately.
  const [advanced, setAdvanced] = useState(false);
  // Round 3's Step 3 has the same gate — Step 2 answered correctly shouldn't
  // reveal it without an explicit click.
  const [step2Advanced, setStep2Advanced] = useState(false);
  const roundRef = useRef<HTMLElement>(null);
  const buildRef = useRef<HTMLDivElement>(null);
  const step3Ref = useRef<HTMLDivElement>(null);
  const round = ROUNDS[roundIndex];
  const progress = value.rounds[roundIndex];
  const gate = progress.gate.at(-1);
  const buildAttempt = progress.builds.at(-1);
  const passed = roundComplete(progress, roundIndex);
  const result = miniGameResult(value);
  const buildMatches = build && buildAttempt?.cards.every((c, i) => c === cards[i]);
  function update(next: RoundProgress) {
    onChange({ ...value, rounds: value.rounds.map((r, i) => (i === roundIndex ? next : r)) });
  }
  function choose(key: "gate" | "step2" | "step3", answer: number) {
    if (progress[key].at(-1)?.correct) return;
    const step = key === "gate" ? round.gate : key === "step2" ? round.step2! : round.step3!;
    update({
      ...progress,
      [key]: [
        ...progress[key],
        { answer, correct: answer === step.correct, at: new Date().toISOString() },
      ],
    });
  }
  function place(slot: number, card: number) {
    if (
      !build ||
      buildAttempt?.complete ||
      !Number.isInteger(card) ||
      card < 0 ||
      card >= build.cards.length
    )
      return;
    setCards((previous) =>
      previous.map((c, i) => (i === slot ? card : c === card ? previous[slot] : c)),
    );
    setDragging(null);
  }
  // PointerSensor covers mouse and touch alike.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  function handleDragStart(event: DragStartEvent) {
    setDragging(Number(String(event.active.id).replace("card-", "")));
  }
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setDragging(null);
    if (!over) return;
    const cardId = Number(String(active.id).replace("card-", ""));
    if (over.id === "pool") returnToPool(cardId);
    else if (typeof over.id === "string" && over.id.startsWith("slot-")) {
      place(Number(over.id.replace("slot-", "")), cardId);
    }
  }
  function returnToPool(id: number) {
    if (buildAttempt?.complete) return;
    setCards((previous) => previous.map((card) => (card === id ? -1 : card)));
    setDragging(null);
  }
  function nextRound() {
    const next = roundIndex + 1;
    setRoundIndex(next);
    setCards(ROUNDS[next]?.build ? ROUNDS[next].build!.slots.map(() => -1) : []);
    setDragging(null);
    setAdvanced(false);
    setStep2Advanced(false);
    roundRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function options(key: "gate" | "step2" | "step3") {
    const step = key === "gate" ? round.gate : key === "step2" ? round.step2! : round.step3!;
    const attempt = progress[key].at(-1);
    return (
      <fieldset disabled={!!attempt?.correct} className="space-y-2">
        <legend className="sr-only">{step.prompt}</legend>
        {step.options.map((opt, i) => (
          <label
            key={opt.text}
            className={`flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 ${attempt?.answer === i ? "border-mint-primary bg-mint-primary/10" : "border-control-border/35 bg-background hover:border-mint-primary"}`}
          >
            <input
              type="radio"
              className="mt-1 size-4 shrink-0 accent-mint-primary"
              name={`mini2-${roundIndex}-${key}`}
              checked={attempt?.answer === i}
              onChange={() => choose(key, i)}
            />
            <span>
              <strong>{String.fromCharCode(65 + i)}.</strong> {opt.text}
            </span>
          </label>
        ))}
      </fieldset>
    );
  }
  function feedbackPanel(key: "gate" | "step2" | "step3", successCaption: string) {
    const step = key === "gate" ? round.gate : key === "step2" ? round.step2! : round.step3!;
    const attempt = progress[key].at(-1);
    if (!attempt) return <p className="text-slate-text">เลือกคำตอบที่เหมาะสมกับสถานการณ์นี้</p>;
    const opt = step.options[attempt.answer];
    return (
      <>
        <p className="mb-3 flex items-center gap-3 text-lg font-semibold text-monitor-teal">
          {attempt.correct ? (
            <img src={correctBadge} alt="" aria-hidden="true" className="size-10 shrink-0" />
          ) : (
            <Lightbulb className="text-monitor-amber" />
          )}
          {attempt.correct ? successCaption : "ลองพิจารณาอีกครั้ง"}
        </p>
        <p className="leading-relaxed">
          {attempt.correct ? opt.response : (opt.hint ?? opt.response)}
        </p>
      </>
    );
  }
  return (
    <div className="mini-game space-y-5">
      <header className="mini-game-hero relative isolate overflow-hidden rounded-2xl bg-gradient-to-r from-background to-mint-primary/5 px-4 py-5 sm:p-8">
        <img
          src={banner}
          alt=""
          className="mini-banner-fade pointer-events-none absolute right-0 top-0 -z-10 hidden h-full w-auto min-[1440px]:block"
        />
        <div className="min-[1440px]:w-[58%]">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-mint-primary/15 bg-mint-primary/10 px-3 py-1.5 text-xs font-semibold text-monitor-teal">
            <Gamepad2 className="size-4" aria-hidden="true" />
            MINI GAME · MODULE 2
          </p>
          <h2 className="mini-game-hero-title">
            Structure the <span className="text-monitor-teal">Feedback</span>
          </h2>
          <p className="mt-3 text-lg font-semibold sm:text-xl">
            จัดโครงสร้าง Feedback ให้เกิดการเรียนรู้
          </p>
          <p className="mt-4 leading-relaxed text-slate-text">
            Feedback ที่ดีไม่ได้ขึ้นอยู่กับว่าเราพูดมากแค่ไหน
            แต่ขึ้นอยู่กับว่าผู้เรียนเข้าใจสิ่งที่เราต้องการสื่อ
            และรู้ว่าจะนำข้อมูลนั้นไปใช้ต่ออย่างไร
          </p>
        </div>
        <div className="mini-game-facts mt-5 flex w-fit flex-wrap gap-5 rounded-xl bg-background/95 p-4 text-sm">
          <span className="flex items-center gap-2">
            <BookOpenText className="text-monitor-teal" /> 3 รอบสถานการณ์
          </span>
          <span className="flex items-center gap-2">
            <Trophy className="text-monitor-teal" /> คะแนนเต็ม 10
          </span>
          <span className="flex items-center gap-2">
            <Layers className="text-monitor-teal" /> ฝึกจัดโครงสร้าง Feedback ให้ชัดเจน
          </span>
        </div>
      </header>

      <section className="mini-game-panel rounded-2xl border border-border bg-background p-3 sm:p-6">
        <h3 className="mb-5 flex flex-wrap items-center gap-3 text-xl font-bold">
          <Gamepad2 className="mini-game-heading-icon" /> Game Opening{" "}
          <span className="rounded-full bg-mint-primary/10 px-3 py-1 text-xs font-medium text-monitor-teal">
            Introduction
          </span>
        </h3>
        <div className="grid items-start gap-6 min-[1440px]:grid-cols-2">
          <div className="mini-game-opening-copy min-w-0">
            <h4 className="font-semibold">Mini Challenge: Structure the Feedback</h4>
            <p className="mt-3 rounded-xl bg-mint-primary/10 p-4 leading-relaxed">
              “ในแต่ละสถานการณ์ ลองสังเกตว่า Feedback ขาดอะไร เลือกโครงสร้างที่เหมาะสม
              และสร้างข้อความที่ช่วยให้ผู้เรียนก้าวต่อไปได้”
            </p>
            <div className="ai-coach-layout mt-4 flex flex-col-reverse items-start gap-5">
              <span className="flex h-32 w-32 shrink-0 items-center justify-center rounded-full bg-monitor-violet-soft shadow-sm sm:h-40 sm:w-40">
                <img
                  src={aiCoaching1}
                  alt=""
                  aria-hidden="true"
                  className="h-[80%] w-[80%] object-contain"
                />
              </span>
              <div className="ai-coach-speech w-full min-w-0 p-4 sm:p-5">
                <p className="mb-2 text-sm font-semibold text-monitor-violet">AI Learning Coach</p>
                <blockquote className="text-sm leading-relaxed">
                  “Feedback ที่ดีไม่ได้เริ่มจากการเลือกคำพูดที่ฟังดูดี แต่ต้องชัดเจน มีโครงสร้าง
                  เชื่อมโยงกับการเรียนรู้ และช่วยให้ผู้เรียนรู้ว่าจะทำอะไรต่อ”
                </blockquote>
              </div>
            </div>
          </div>
          <div className="flex flex-col">
            <div className="rounded-xl border border-monitor-violet/15 bg-gradient-to-br from-monitor-violet/5 to-monitor-blue/10 p-5 text-center">
              <h4 className="mb-6 font-semibold">Feedback Structuring Flow</h4>
              <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                {[
                  {
                    icon: Search,
                    title: "Identify",
                    subtitle: "ระบุปัญหา",
                    tone: "mini-process-teal",
                  },
                  {
                    icon: Layers,
                    title: "Structure",
                    subtitle: "จัดโครงสร้าง",
                    tone: "mini-process-violet",
                  },
                  {
                    icon: MessageCircle,
                    title: "Communicate",
                    subtitle: "สื่อสารให้ชัดเจน",
                    tone: "mini-process-amber",
                  },
                  {
                    icon: Rocket,
                    title: "Action",
                    subtitle: "นำไปปฏิบัติ",
                    tone: "mini-process-teal",
                  },
                ].map(({ icon: Icon, title, subtitle, tone }, i) => (
                  <div key={title} className="relative min-w-0">
                    <div className={"mini-process-icon " + tone}>
                      <Icon className="size-7" />
                    </div>
                    {i < 3 && (
                      <ArrowRight
                        className="absolute -right-3 top-5 hidden size-4 text-monitor-violet/60 sm:block"
                        aria-hidden="true"
                      />
                    )}
                    <p className="mt-3 font-semibold leading-snug">{title}</p>
                    <p className="mt-1 text-xs text-slate-text">{subtitle}</p>
                  </div>
                ))}
              </div>
            </div>
            <Button
              className="mini-game-primary mt-3 w-full"
              disabled={value.started}
              onClick={() => onChange({ ...value, started: true })}
            >
              {value.started ? "เริ่มกิจกรรมแล้ว" : "เริ่มเล่น Mini Game"}
              <ArrowRight />
            </Button>
          </div>
        </div>
      </section>

      {value.started && (
        <section
          ref={roundRef}
          className="mini-game-panel scroll-mt-40 space-y-5 rounded-2xl border border-border bg-background p-3 sm:p-6"
        >
          <div className="flex items-center justify-between gap-3 border-b border-border pb-4">
            <h3 className="flex min-w-0 items-center gap-3 text-lg font-bold sm:text-xl">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-mint-primary text-white">
                {roundIndex + 1}
              </span>
              Round {roundIndex + 1} — {round.title}
            </h3>
            <span className="rounded-full bg-mint-primary/10 px-4 py-1 whitespace-nowrap text-sm font-semibold text-monitor-teal">
              {roundIndex + 1} / 3
            </span>
          </div>
          <div>
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <MessageCircle className="size-6 rounded-full bg-mint-primary/10 p-1 text-monitor-teal" />
              สถานการณ์
            </p>
            <div className="grid gap-4 md:grid-cols-[0.8fr_1fr]">
              <img
                src={scenarioImages[roundIndex]}
                alt=""
                aria-hidden="true"
                className="h-full min-h-40 w-full rounded-xl object-cover"
              />
              <div className="flex items-center rounded-xl border border-monitor-blue/15 bg-gradient-to-br from-background to-monitor-blue/10 p-5">
                <p className="text-base font-medium leading-relaxed">{round.situation}</p>
              </div>
            </div>
          </div>
          <div className="mini-game-step">
            <div className="mini-game-step-heading">
              <img src={step1Badge} alt="" aria-hidden="true" className="size-10 shrink-0" />
              <div>
                <h4 className="text-lg font-semibold">
                  <span className="mr-2 text-slate-deep">Step 1</span>{" "}
                  {roundIndex === 0
                    ? "Identify the Missing Quality"
                    : roundIndex === 1
                      ? "Choose the Feedback Model"
                      : "Choose the Best Opening"}
                </h4>
                <p className="mt-1 text-sm text-slate-text">{round.gate.prompt}</p>
              </div>
            </div>
            <div className="grid gap-4 p-4 min-[1440px]:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
              {options("gate")}
              <div
                role="status"
                aria-live="polite"
                className="self-start rounded-xl border border-mint-primary/20 bg-gradient-to-br from-background to-mint-primary/5 p-5"
              >
                {feedbackPanel("gate", "ถูกต้องครับ!")}
                {gate?.correct && (
                  <>
                    <div className="mt-4 flex flex-col items-center gap-4 overflow-hidden sm:flex-row rounded-xl border border-monitor-violet/15 bg-monitor-violet/5">
                      <img
                        src={avatarFeedback}
                        alt=""
                        aria-hidden="true"
                        className="h-20 w-20 shrink-0 object-cover sm:h-28 sm:w-28"
                      />
                      <p className="py-3 pr-3 text-sm leading-relaxed">
                        <strong className="block text-monitor-violet">ดีมากครับ!</strong>
                        พร้อมจัดโครงสร้าง Feedback ในขั้นตอนถัดไปแล้ว
                      </p>
                    </div>
                    <Button
                      className="mini-game-primary mt-3 w-full"
                      onClick={() => {
                        setAdvanced(true);
                        // Step 2 only mounts once `advanced` is true, so the
                        // ref isn't attached yet on this click — wait a frame.
                        requestAnimationFrame(() =>
                          buildRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
                        );
                      }}
                    >
                      ไปขั้นตอนถัดไป <ArrowRight />
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>

          {gate?.correct && advanced && build && (
            <div ref={buildRef} className="mini-game-step scroll-mt-40 space-y-4">
              <div className="mini-game-step-heading">
                <img src={step2Badge} alt="" aria-hidden="true" className="size-10 shrink-0" />
                <div>
                  <h4 className="text-lg font-semibold">
                    <span className="mr-2 text-slate-deep">Step 2</span>{" "}
                    {roundIndex === 0
                      ? "Build an Effective Feedback Message"
                      : "Build the AID Message"}
                  </h4>
                  <p className="mt-1 text-sm text-slate-text">
                    ลากประโยคลงในช่องที่ตรงกัน สลับประโยคระหว่างช่อง หรือลากกลับมาฝั่งซ้ายได้
                  </p>
                </div>
              </div>
              <DndContext
                sensors={sensors}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragCancel={() => setDragging(null)}
              >
                <div className="grid gap-5 px-4 pb-4 min-[1440px]:grid-cols-2">
                  <DropZone
                    id="pool"
                    className={`min-w-0 space-y-2 rounded-xl border border-dashed p-3 transition-colors ${dragging !== null ? "border-mint-primary/60 bg-mint-primary/5" : "border-monitor-blue/10 bg-monitor-blue/5"}`}
                  >
                    <h5 className="mb-3 font-semibold">ประโยคที่มีให้เลือก</h5>
                    {build.cardOrder
                      .filter((id) => !cards.includes(id))
                      .map((id) => (
                        <DraggableCard
                          key={id}
                          id={id}
                          disabled={!!buildAttempt?.complete}
                          highlighted={dragging === id}
                          className="flex w-full items-start gap-2 rounded-lg border p-3 text-left disabled:cursor-default focus-visible:outline-2 focus-visible:outline-mint-primary"
                        >
                          <GripVertical className="mt-1 size-4 shrink-0 text-slate-text" />
                          <span className="min-w-0 [overflow-wrap:anywhere]">
                            {build.cards[id]}
                          </span>
                        </DraggableCard>
                      ))}
                  </DropZone>
                  <div className="min-w-0">
                    <h5 className="mb-3 font-semibold">
                      จัดเรียงประโยคให้ถูกต้อง ({build.slots.length} ช่อง)
                    </h5>
                    <div className="space-y-3">
                      {build.slots.map((slot, i) => {
                        const Icon = slotIcons[i];
                        return (
                          <div
                            key={slot}
                            className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]"
                          >
                            <div
                              className={`flex min-w-0 flex-col items-start justify-center gap-2 rounded-lg border p-4 ${tones[i]}`}
                            >
                              <Icon className="size-5 shrink-0" />
                              <span className="min-w-0 w-full [overflow-wrap:anywhere]">
                                <strong className="block text-sm leading-relaxed">{slot}</strong>
                              </span>
                            </div>
                            <DropZone
                              id={`slot-${i}`}
                              className="min-w-0 rounded-lg border border-dashed border-control-border/50 p-2"
                            >
                              {cards[i] >= 0 ? (
                                <DraggableCard
                                  id={cards[i]}
                                  disabled={!!buildAttempt?.complete}
                                  highlighted={dragging === cards[i]}
                                  className="flex min-h-20 w-full items-center gap-2 rounded px-2 py-3 text-left text-sm"
                                >
                                  <GripVertical className="size-4 shrink-0 text-slate-text" />
                                  <span className="min-w-0 [overflow-wrap:anywhere]">
                                    {build.cards[cards[i]]}
                                  </span>
                                </DraggableCard>
                              ) : (
                                <div className="flex min-h-20 items-center gap-2 rounded px-2 py-3 text-sm">
                                  <span className="min-w-0 text-slate-text">
                                    ลากประโยคมาวางที่นี่
                                  </span>
                                </div>
                              )}
                            </DropZone>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <Button
                        variant="outline"
                        disabled={!!buildAttempt?.complete}
                        onClick={() => {
                          setCards(build.slots.map(() => -1));
                          setDragging(null);
                        }}
                      >
                        <RotateCcw />
                        รีเซ็ต
                      </Button>
                      <Button
                        className="mini-game-primary flex-1"
                        disabled={cards.includes(-1) || !!buildAttempt?.complete || !!buildMatches}
                        onClick={() =>
                          update({
                            ...progress,
                            builds: [
                              ...progress.builds,
                              { ...checkBuild(roundIndex, cards), at: new Date().toISOString() },
                            ],
                          })
                        }
                      >
                        ตรวจคำตอบ
                      </Button>
                    </div>
                  </div>
                </div>
                <DragOverlay>
                  {dragging !== null ? (
                    <div className="flex items-center gap-2 rounded-lg border border-mint-primary bg-background p-3 text-sm shadow-lg">
                      <GripVertical className="size-4 shrink-0 text-slate-text" />
                      <span className="min-w-0 [overflow-wrap:anywhere]">
                        {build.cards[dragging]}
                      </span>
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
              {buildMatches && (
                <div
                  role="status"
                  aria-live="polite"
                  className="mx-4 mb-4 rounded-xl border border-mint-primary/20 bg-gradient-to-br from-mint-primary/5 to-background p-5"
                >
                  <div className="mb-4 flex items-center gap-3">
                    <img src={correctBadge} alt="" aria-hidden="true" className="size-9 shrink-0" />
                    <h5 className="text-lg font-bold">
                      {buildAttempt?.complete ? "เฉลยคำตอบ" : "คำแนะนำสำหรับการลองใหม่"}
                    </h5>
                  </div>
                  {!buildAttempt?.complete && (
                    <>
                      <div className="mb-3 flex flex-wrap gap-3">
                        {build.dimensionLabels.map((label, i) => (
                          <span key={label} className="inline-flex items-center gap-1 text-sm">
                            {buildAttempt?.checks[i] ? (
                              <CheckCircle2 className="size-4 text-monitor-teal" />
                            ) : (
                              <XCircle className="size-4 text-monitor-amber" />
                            )}
                            {label}
                          </span>
                        ))}
                      </div>
                      <p>{round.retryMessage}</p>
                    </>
                  )}
                  {buildAttempt?.complete && (
                    <ol className="space-y-3">
                      {build.slots.map((slot, i) => {
                        const Icon = slotIcons[i];
                        return (
                          <li
                            key={slot}
                            className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,3fr)]"
                          >
                            <div
                              className={
                                "flex min-w-0 items-center gap-3 rounded-xl border p-4 [overflow-wrap:anywhere] " +
                                tones[i]
                              }
                            >
                              <Icon className="size-6 shrink-0" />
                              <strong className="text-base font-bold">{slot}</strong>
                            </div>
                            <div className="flex min-w-0 items-center rounded-xl border border-border bg-background p-4 leading-relaxed">
                              “{build.cards[i]}”
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </div>
              )}
            </div>
          )}

          {gate?.correct &&
            advanced &&
            roundIndex === 2 &&
            ["step2", "step3"].map(
              (key, i) =>
                (i === 0 || (progress.step2.at(-1)?.correct && step2Advanced)) && (
                  <div
                    key={key}
                    ref={i === 0 ? buildRef : step3Ref}
                    className="scroll-mt-40 space-y-3 border-t border-border pt-5"
                  >
                    <h4 className="text-lg font-semibold text-monitor-teal">
                      Step {i + 2} ·{" "}
                      {i === 0
                        ? "Respond to Learner Reflection"
                        : "Add Teacher Observation and Guidance"}
                    </h4>
                    <p className="italic text-slate-text">
                      {i === 0 ? round.step2!.context : round.step3!.context}
                    </p>
                    <p className="font-medium">
                      {i === 0 ? round.step2!.prompt : round.step3!.prompt}
                    </p>
                    {options(key as "step2" | "step3")}
                    <div
                      role="status"
                      aria-live="polite"
                      className="rounded-lg bg-mint-primary/5 p-4"
                    >
                      {feedbackPanel(key as "step2" | "step3", "ดีมากครับ!")}
                    </div>
                    {i === 0 && progress.step2.at(-1)?.correct && !step2Advanced && (
                      <Button
                        className="mini-game-primary w-full"
                        onClick={() => {
                          setStep2Advanced(true);
                          requestAnimationFrame(() =>
                            step3Ref.current?.scrollIntoView({
                              behavior: "smooth",
                              block: "start",
                            }),
                          );
                        }}
                      >
                        ไปขั้นตอนถัดไป <ArrowRight />
                      </Button>
                    )}
                  </div>
                ),
            )}
          {passed && (
            <div className="mini-game-celebration relative overflow-hidden rounded-2xl border border-mint-primary/15 px-5 sm:px-0">
              <div className="mini-game-celebration-layout flex flex-col-reverse items-center gap-4 pt-5 sm:gap-6 sm:pt-6 min-[1440px]:flex-row min-[1440px]:pt-0">
                <div className="mini-game-celebration-portrait relative h-64 w-64 max-w-full shrink-0 sm:h-80 sm:w-80">
                  <img
                    src={avatarFeedbackCelebrate}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 h-full w-full object-contain object-bottom pt-3"
                  />
                </div>
                <div className="w-full min-w-0 flex-1 sm:px-6 sm:pb-2 min-[1440px]:w-auto min-[1440px]:px-0 min-[1440px]:py-6">
                  <p className="mb-1 flex items-center gap-2 text-xl font-bold">
                    <img
                      src={correctBadge}
                      alt=""
                      aria-hidden="true"
                      className="size-10 shrink-0"
                    />
                    AI Feedback
                  </p>
                  <p className="text-lg font-semibold text-monitor-teal">
                    ยอดเยี่ยม! ผ่านรอบที่ {roundIndex + 1} แล้ว
                  </p>
                  <p className="mt-1 text-base text-slate-text">{round.successMessage}</p>
                  {(buildAttempt?.complete || roundIndex === 2) && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(build
                        ? build.dimensionLabels
                        : ["Reflection First", "Follow-up Reflection", "Observation + Guidance"]
                      ).map((label) => (
                        <span
                          key={label}
                          className="inline-flex items-center gap-1.5 rounded-full bg-mint-primary/10 px-3 py-1 text-xs font-semibold text-monitor-teal"
                        >
                          <CheckCircle2 className="size-3.5" />
                          {label}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="mt-2 text-xs text-slate-text">ตรวจตามเกณฑ์กิจกรรม</p>

                  {roundIndex < 2 ? (
                    <Button className="mini-game-primary mt-4 w-full sm:w-auto" onClick={nextRound}>
                      ไปรอบถัดไป <ArrowRight />
                    </Button>
                  ) : (
                    <p className="mt-4 font-bold">
                      คะแนนหลังการฝึก {result.finalLearningScore} / 10 ·
                      ไปขั้นตอนถัดไปด้านล่างได้เลย
                    </p>
                  )}
                </div>
                <img
                  src={greatJobBadge}
                  alt="Great Job!"
                  className="mini-game-celebration-badge shrink-0 object-contain"
                />
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
