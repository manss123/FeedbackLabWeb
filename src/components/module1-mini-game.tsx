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
  Lightbulb,
  MessageCircle,
  RotateCcw,
  Target,
  Trophy,
  Users,
  XCircle,
  Star,
} from "lucide-react";
import banner from "@/assets/banners/module1-banner.webp";
// Shared across every module's mini-game (not M1-specific): coach mascot,
// checkmark/celebration badges, step-number badges.
import aiCoaching1 from "@/assets/contents/ai-coaching-1.webp";
import correctBadge from "@/assets/contents/correct.webp";
import greatJobBadge from "@/assets/contents/great-job.webp";
import step1Badge from "@/assets/contents/step-1.webp";
import step2Badge from "@/assets/contents/step-2.webp";
// M1-specific content: its own round scenarios and AI-feedback avatar art.
import avatarFeedback from "@/assets/contents/M1/avatar-feedback.webp";
import scenarioR1 from "@/assets/contents/M1/scenario-R1.webp";
import scenarioR2 from "@/assets/contents/M1/scenario-R2.webp";
import scenarioR3 from "@/assets/contents/M1/scenario-R3.webp";
import { Button } from "./ui/button";
import {
  PURPOSES,
  ROUNDS,
  REFLECTION_CHOICES,
  REFLECTION_HINTS,
  checkBuild,
  miniGameResult,
  roundComplete,
  type MiniGameState,
  type RoundProgress,
} from "@/lib/module1-mini-game";

const tones = [
  "border-monitor-teal/30 bg-monitor-teal/10 text-monitor-teal",
  "border-monitor-blue/30 bg-monitor-blue/10 text-monitor-blue",
  "border-monitor-amber/30 bg-monitor-amber/10 text-monitor-amber",
  "border-monitor-violet/30 bg-monitor-violet/10 text-monitor-violet",
];
const slotIcons = [Trophy, BarChart3, Lightbulb, Star];
const cardOrder = [4, 1, 6, 3, 0, 5, 2];
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

// The sentence pool and each of the 4 answer slots are all drop targets.
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

export function Module1MiniGame({
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
  const [cards, setCards] = useState<number[]>([-1, -1, -1, -1]);
  const [dragging, setDragging] = useState<number | null>(null);
  // Step 2 only appears once the learner clicks "ไปขั้นตอนถัดไป" — answering
  // Step 1 correctly alone used to reveal it immediately, skipping the click.
  const [advanced, setAdvanced] = useState(false);
  // Round 3's second question (followup) had the same issue — answering the
  // opening question correctly revealed it immediately with no click gate.
  const [openingAdvanced, setOpeningAdvanced] = useState(false);
  const roundRef = useRef<HTMLElement>(null);
  const buildRef = useRef<HTMLDivElement>(null);
  const followupRef = useRef<HTMLDivElement>(null);
  const round = ROUNDS[roundIndex];
  const progress = value.rounds[roundIndex];
  const purpose = progress.purpose.at(-1);
  const build = progress.builds.at(-1);
  const passed = roundComplete(progress, roundIndex);
  const result = miniGameResult(value);
  const buildMatches = build?.cards.every((c, i) => c === cards[i]);
  function update(next: RoundProgress) {
    onChange({ ...value, rounds: value.rounds.map((r, i) => (i === roundIndex ? next : r)) });
  }
  function choose(key: "purpose" | "opening" | "followup", answer: number) {
    if (progress[key].at(-1)?.correct) return;
    update({
      ...progress,
      [key]: [
        ...progress[key],
        {
          answer,
          correct: answer === (key === "purpose" ? round.purpose : 1),
          at: new Date().toISOString(),
        },
      ],
    });
  }
  function place(slot: number, card: number) {
    if (build?.complete || !Number.isInteger(card) || card < 0 || card > 6) return;
    setCards((previous) =>
      previous.map((c, i) => (i === slot ? card : c === card ? previous[slot] : c)),
    );
    setDragging(null);
  }
  // PointerSensor covers mouse and touch alike, so this replaces both the
  // native HTML5 drag events and the manual pointer/elementFromPoint
  // hit-testing that used to shim touch support separately.
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
    if (build?.complete) return;
    setCards((previous) => previous.map((card) => (card === id ? -1 : card)));
    setDragging(null);
  }
  function nextRound() {
    setRoundIndex(roundIndex + 1);
    setCards([-1, -1, -1, -1]);
    setDragging(null);
    setAdvanced(false);
    setOpeningAdvanced(false);
    roundRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function choices(key: "purpose" | "opening" | "followup", labels: string[]) {
    const attempt = progress[key].at(-1);
    return (
      <fieldset disabled={!!attempt?.correct} className="space-y-2">
        <legend className="sr-only">
          {key === "purpose"
            ? "เลือกจุดมุ่งหมายหลัก"
            : key === "opening"
              ? "เลือกประโยคเริ่มบทสนทนา"
              : "เลือกคำถามต่อเนื่อง"}
        </legend>
        {labels.map((text, i) => (
          <label
            key={text}
            className={`flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 ${attempt?.answer === i ? "border-mint-primary bg-mint-primary/10" : "border-control-border/35 bg-background hover:border-mint-primary"}`}
          >
            <input
              type="radio"
              className="mt-1 size-4 shrink-0 accent-mint-primary"
              name={`mini-${roundIndex}-${key}`}
              checked={attempt?.answer === i}
              onChange={() => choose(key, i)}
            />
            <span>
              <strong>{String.fromCharCode(65 + i)}.</strong> {text}
            </span>
          </label>
        ))}
      </fieldset>
    );
  }
  return (
    <div className="mini-game space-y-5">
      <header className="relative isolate overflow-hidden rounded-2xl bg-gradient-to-r from-background to-mint-primary/5 px-4 py-5 sm:p-8">
        {/* h-full + w-auto (no object-fit) lets the image keep its native
            aspect ratio while filling the header's full height, so the whole
            image shows with no vertical cropping and no letterbox gaps.
            mini-banner-fade masks its left edge to transparent so it blends
            into the header's own background gradient instead of showing a
            hard rectangular edge. */}
        <img
          src={banner}
          alt=""
          className="mini-banner-fade pointer-events-none absolute right-0 top-0 -z-10 hidden h-full w-auto min-[1440px]:block"
        />
        <div className="min-[1440px]:w-[58%]">
          <p className="mb-3 inline-flex rounded-full bg-mint-primary/10 px-3 py-1 text-sm font-semibold text-monitor-teal">
            MINI GAME · MODULE 1
          </p>
          <h2 className="text-2xl font-bold sm:text-3xl">Build the Best Feedback</h2>
          <p className="mt-1 text-xl font-semibold">สร้าง Feedback ที่เหมาะสมที่สุด</p>
          <p className="mt-4 leading-relaxed text-slate-text">
            ในแต่ละสถานการณ์ ลองคิดว่า ผู้เรียนต้องการอะไรในขณะนั้น และเลือก Feedback
            ที่ช่วยให้เกิดการเรียนรู้มากที่สุด
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
            <Lightbulb className="text-monitor-teal" /> ฝึกให้ Feedback อย่างสร้างสรรค์
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
            <h4 className="font-semibold">Mini Challenge: Build the Best Feedback</h4>
            <p className="mt-3 rounded-xl bg-mint-primary/10 p-4 leading-relaxed">
              “ในแต่ละสถานการณ์ ลองคิดว่า ผู้เรียนต้องการอะไรในขณะนั้น และเลือก Feedback
              ที่ช่วยให้เกิดการเรียนรู้มากที่สุด”
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
                  “การให้ Feedback ที่ดีไม่ได้เริ่มจากการคิดว่า ‘ฉันจะพูดอะไร’ แต่เริ่มจากการคิดว่า
                  ‘ผู้เรียนต้องการอะไร และฉันต้องการให้ Feedback นี้ช่วยเขาอย่างไร’”
                </blockquote>
              </div>
            </div>
          </div>
          <div className="flex flex-col">
            <div className="rounded-xl border border-monitor-violet/15 bg-gradient-to-br from-monitor-violet/5 to-monitor-blue/10 p-5 text-center">
              <h4 className="mb-6 font-semibold">Process for Constructive Feedback</h4>
              <div className="grid gap-5 text-sm min-[480px]:grid-cols-3 min-[480px]:gap-3">
                {[
                  {
                    icon: Users,
                    title: "Understand the learner",
                    subtitle: "เข้าใจผู้เรียน",
                    tone: "mini-process-teal",
                  },
                  {
                    icon: Target,
                    title: "Choose the purpose",
                    subtitle: "กำหนดเป้าหมาย",
                    tone: "mini-process-violet",
                  },
                  {
                    icon: MessageCircle,
                    title: "Build the feedback",
                    subtitle: "สร้าง Feedback",
                    tone: "mini-process-amber",
                  },
                ].map(({ icon: Icon, title, subtitle, tone }, i) => (
                  <div key={title} className="relative min-w-0">
                    <div className={"mini-process-icon " + tone}>
                      <Icon className="size-7" />
                    </div>
                    {i < 2 && (
                      <ArrowRight
                        className="absolute -right-3 top-5 hidden size-4 text-monitor-violet/60 min-[480px]:block"
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
                  <span className="mr-2 text-slate-deep">Step 1</span> Choose the Main Purpose
                </h4>
                <p className="mt-1 text-sm text-slate-text">
                  Feedback นี้ควรมีจุดมุ่งหมายหลักอะไร?
                </p>
              </div>
            </div>
            <div className="grid gap-4 p-4 min-[1440px]:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
              {choices("purpose", PURPOSES)}
              <div
                role="status"
                aria-live="polite"
                className="self-start rounded-xl border border-mint-primary/20 bg-gradient-to-br from-background to-mint-primary/5 p-5"
              >
                {purpose ? (
                  <>
                    <p className="mb-3 flex items-center gap-3 text-lg font-semibold text-monitor-teal">
                      {purpose.correct ? (
                        <img
                          src={correctBadge}
                          alt=""
                          aria-hidden="true"
                          className="size-10 shrink-0"
                        />
                      ) : (
                        <Lightbulb className="text-monitor-amber" />
                      )}
                      {purpose.correct ? "ถูกต้องค่ะ!" : "ลองพิจารณาอีกครั้ง"}
                    </p>
                    <p className="leading-relaxed">
                      {purpose.correct ? round.success : round.hint}
                    </p>
                    {purpose.correct && (
                      <>
                        <div className="mt-4 flex flex-col items-center gap-4 overflow-hidden sm:flex-row rounded-xl border border-monitor-violet/15 bg-monitor-violet/5">
                          <img
                            src={avatarFeedback}
                            alt=""
                            aria-hidden="true"
                            className="h-20 w-20 shrink-0 object-cover sm:h-28 sm:w-28"
                          />
                          <p className="py-3 pr-3 text-sm leading-relaxed">
                            <strong className="block text-monitor-violet">ดีมากค่ะ!</strong>
                            พร้อมฝึกสร้าง Feedback ที่เหมาะกับผู้เรียนแล้ว
                          </p>
                        </div>
                        <Button
                          className="mini-game-primary mt-3 w-full"
                          onClick={() => {
                            setAdvanced(true);
                            // Step 2 only mounts once `advanced` is true, so
                            // buildRef isn't attached yet on this click —
                            // wait a frame for it to commit before scrolling.
                            requestAnimationFrame(() =>
                              buildRef.current?.scrollIntoView({
                                behavior: "smooth",
                                block: "start",
                              }),
                            );
                          }}
                        >
                          ไปขั้นตอนถัดไป <ArrowRight />
                        </Button>
                      </>
                    )}
                  </>
                ) : (
                  <p className="text-slate-text">
                    เลือกเป้าหมายโดยพิจารณาว่าผู้เรียนต้องการอะไรในสถานการณ์นี้
                  </p>
                )}
              </div>
            </div>
          </div>

          {purpose?.correct && advanced && roundIndex < 2 && (
            <div ref={buildRef} className="mini-game-step scroll-mt-40 space-y-4">
              <div className="mini-game-step-heading">
                <img src={step2Badge} alt="" aria-hidden="true" className="size-10 shrink-0" />
                <div>
                  <h4 className="text-lg font-semibold">
                    <span className="mr-2 text-slate-deep">Step 2</span> Build the Feedback
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
                    {cardOrder
                      .filter((id) => !cards.includes(id))
                      .map((id) => (
                        <DraggableCard
                          key={id}
                          id={id}
                          disabled={!!build?.complete}
                          highlighted={dragging === id}
                          className="flex w-full items-start gap-2 rounded-lg border p-3 text-left disabled:cursor-default focus-visible:outline-2 focus-visible:outline-mint-primary"
                        >
                          <GripVertical className="mt-1 size-4 shrink-0 text-slate-text" />
                          <span className="min-w-0 [overflow-wrap:anywhere]">
                            {round.cards[id]}
                          </span>
                        </DraggableCard>
                      ))}
                  </DropZone>
                  <div className="min-w-0">
                    <h5 className="mb-3 font-semibold">จัดเรียงประโยคให้ถูกต้อง (4 ช่อง)</h5>
                    <div className="space-y-3">
                      {round.slots.map((slot, i) => {
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
                                <span className="mt-1 block text-xs leading-relaxed">
                                  {round.slotLabels[i]}
                                </span>
                              </span>
                            </div>
                            <DropZone
                              id={`slot-${i}`}
                              className="min-w-0 rounded-lg border border-dashed border-control-border/50 p-2"
                            >
                              {cards[i] >= 0 ? (
                                <DraggableCard
                                  id={cards[i]}
                                  disabled={!!build?.complete}
                                  highlighted={dragging === cards[i]}
                                  className="flex min-h-20 w-full items-center gap-2 rounded px-2 py-3 text-left text-sm"
                                >
                                  <GripVertical className="size-4 shrink-0 text-slate-text" />
                                  <span className="min-w-0 [overflow-wrap:anywhere]">
                                    {round.cards[cards[i]]}
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
                        disabled={!!build?.complete}
                        onClick={() => {
                          setCards([-1, -1, -1, -1]);
                          setDragging(null);
                        }}
                      >
                        <RotateCcw />
                        รีเซ็ต
                      </Button>
                      <Button
                        className="mini-game-primary flex-1"
                        disabled={cards.includes(-1) || !!build?.complete || !!buildMatches}
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
                        {round.cards[dragging]}
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
                      {build?.complete ? "เฉลยคำตอบ" : "คำแนะนำสำหรับการลองใหม่"}
                    </h5>
                  </div>
                  {!build?.complete && (
                    <>
                      <div className="mb-3 flex flex-wrap gap-3">
                        {(roundIndex === 0
                          ? ["Specific", "Respectful", "Supportive", "Actionable"]
                          : ["Supportive Language", "Guidance + Encouragement"]
                        ).map((label, i) => (
                          <span key={label} className="inline-flex items-center gap-1 text-sm">
                            {build?.checks[i] ? (
                              <CheckCircle2 className="size-4 text-monitor-teal" />
                            ) : (
                              <XCircle className="size-4 text-monitor-amber" />
                            )}
                            {label}
                          </span>
                        ))}
                      </div>
                      <p>
                        ลองทบทวนหน้าที่ของแต่ละช่อง เลือกข้อความที่ระบุพฤติกรรมชัดเจน ให้เกียรติ
                        สนับสนุนผู้เรียน และบอกแนวทางที่นำไปใช้ได้ แล้วตรวจคำตอบอีกครั้ง
                      </p>
                    </>
                  )}
                  {build?.complete && (
                    <ol className="space-y-3">
                      {round.slots.map((slot, i) => {
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
                              “{round.cards[i]}”
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
          {purpose?.correct &&
            advanced &&
            roundIndex === 2 &&
            ["opening", "followup"].map(
              (key, i) =>
                (i === 0 || (progress.opening.at(-1)?.correct && openingAdvanced)) && (
                  <div
                    key={key}
                    ref={i === 0 ? buildRef : followupRef}
                    className="scroll-mt-40 space-y-3 border-t border-border pt-5"
                  >
                    <h4 className="text-lg font-semibold text-monitor-teal">
                      Step {i + 2} ·{" "}
                      {i === 0 ? "Choose the Best Opening" : "Continue the Coaching Feedback"}
                    </h4>
                    <p>
                      {i === 0
                        ? "คุณจะเริ่มบทสนทนาอย่างไร?"
                        : "นักศึกษาตอบว่า ‘หนูคิดว่าส่วนวิเคราะห์ยังไม่ลึกพอค่ะ’ คุณควรพูดอะไรต่อ?"}
                    </p>
                    {choices(key as "opening" | "followup", REFLECTION_CHOICES[i])}
                    {progress[key as "opening" | "followup"].at(-1) && (
                      <p role="status" className="rounded-lg bg-mint-primary/5 p-4">
                        {progress[key as "opening" | "followup"].at(-1)?.correct
                          ? "ดีมากค่ะ คุณเปิดโอกาสให้นักศึกษาได้สะท้อนและประเมินผลงานของตนเอง แทนที่จะรีบบอกคำตอบหรือแนวทางแก้ไขทันที"
                          : REFLECTION_HINTS[i][
                              progress[key as "opening" | "followup"].at(-1)!.answer
                            ]}
                      </p>
                    )}
                    {i === 0 && progress.opening.at(-1)?.correct && !openingAdvanced && (
                      <Button
                        className="mini-game-primary w-full"
                        onClick={() => {
                          setOpeningAdvanced(true);
                          requestAnimationFrame(() =>
                            followupRef.current?.scrollIntoView({
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
                    src={avatarFeedback}
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
                  <p className="mt-1 text-base text-slate-text">
                    {roundIndex === 2
                      ? "คุณเปิดโอกาสให้ผู้เรียนสะท้อนคิดและค้นหาแนวทางพัฒนาด้วยตนเอง"
                      : "Feedback ของคุณมีทั้งการสนับสนุนผู้เรียนและแนวทางที่นำไปปฏิบัติได้"}
                  </p>
                  {build?.complete && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(roundIndex === 0
                        ? ["Specific", "Respectful", "Supportive", "Actionable"]
                        : ["Supportive Language", "Guidance + Encouragement"]
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
