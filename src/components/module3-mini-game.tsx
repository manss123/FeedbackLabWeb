import { useRef, useState, type ReactNode } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  ArrowRight,
  BookOpenText,
  CheckCircle2,
  Eye,
  Gamepad2,
  GripVertical,
  Heart,
  Lightbulb,
  MessageCircle,
  RotateCcw,
  Search,
  ShieldCheck,
  Trophy,
} from "lucide-react";
import banner from "@/assets/banners/module1-banner.webp";
import coach from "@/assets/contents/ai-coaching-1.webp";
import avatar from "@/assets/contents/M1/avatar-feedback.webp";
import greatJob from "@/assets/contents/great-job.webp";
import correctBadge from "@/assets/contents/correct.webp";
import { Button } from "./ui/button";
import {
  DELIVERY_SLOTS,
  DELIVERY_VERSIONS,
  ROUNDS,
  miniGameResult,
  recordAttempt,
  roundComplete,
  type Attempt,
  type MiniGameState,
  type Step,
} from "@/lib/module3-mini-game";

const tones = [
  "border-monitor-teal/25 bg-monitor-teal/10 text-monitor-teal",
  "border-monitor-blue/25 bg-monitor-blue/10 text-monitor-blue",
  "border-monitor-violet/25 bg-monitor-violet/10 text-monitor-violet",
];
function DropZone({ id, children }: { id: string; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`min-h-20 min-w-0 rounded-xl border border-dashed p-3 ${isOver ? "border-mint-primary bg-mint-primary/10 ring-2 ring-mint-primary/30" : "border-control-border/40 bg-background"}`}
    >
      {children}
    </div>
  );
}
function DragCard({ id, text, disabled }: { id: number; text: string; disabled: boolean }) {
  const { setNodeRef, attributes, listeners, isDragging } = useDraggable({
    id: `delivery-${id}`,
    disabled,
  });
  return (
    <button
      ref={setNodeRef}
      type="button"
      disabled={disabled}
      {...attributes}
      {...listeners}
      className={`flex min-h-12 w-full touch-none items-start gap-2 rounded-lg border border-border bg-background p-3 text-left text-sm shadow-sm ${isDragging ? "opacity-30" : ""} ${disabled ? "" : "cursor-grab active:cursor-grabbing"}`}
    >
      <GripVertical className="mt-0.5 size-4 shrink-0 text-slate-text" />
      <span className="min-w-0 break-words">{text}</span>
    </button>
  );
}

function StepEditor({
  config,
  history,
  onSubmit,
  onNext,
  last,
}: {
  config: Step;
  history: Attempt[];
  onSubmit: (
    selected: number[],
    timing: { at: string; presentedAt: string; responseTimeMs: number },
  ) => void;
  onNext: () => void;
  last: boolean;
}) {
  const latest = history.at(-1);
  const locked = !!latest?.correct;
  const [selected, setSelected] = useState<number[]>(
    () => latest?.selected ?? (config.kind === "delivery" ? [-1, -1, -1] : []),
  );
  const [review, setReview] = useState<Attempt | null>(latest ?? null);
  const [dragging, setDragging] = useState<number | null>(null);
  const [timer, setTimer] = useState(() => ({
    at: new Date().toISOString(),
    start: performance.now(),
  }));
  const [submittedCount, setSubmittedCount] = useState(history.length);
  // onSubmit appends one immutable attempt. Keep feedback tied to that attempt,
  // not to edits the learner makes while preparing their next answer.
  if (history.length !== submittedCount) {
    setSubmittedCount(history.length);
    setReview(history.at(-1) ?? null);
  }
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );
  function edit(next: number[]) {
    if (locked) return;
    setSelected(next);
    setReview(null);
  }
  function submit() {
    if (locked) return;
    onSubmit(selected, {
      presentedAt: timer.at,
      at: new Date().toISOString(),
      responseTimeMs: performance.now() - timer.start,
    });
    setTimer({ at: new Date().toISOString(), start: performance.now() });
  }
  function drop({ active, over }: DragEndEvent) {
    setDragging(null);
    if (!over || locked) return;
    const id = Number(String(active.id).replace("delivery-", ""));
    if (!Number.isInteger(id) || id < 0 || id >= config.options.length) return;
    if (over.id === "delivery-pool") return edit(selected.map((n) => (n === id ? -1 : n)));
    const slot = Number(String(over.id).replace("delivery-slot-", ""));
    if (!Number.isInteger(slot) || slot < 0 || slot > 2) return;
    edit(selected.map((n, i) => (i === slot ? id : n === id ? selected[slot] : n)));
  }
  const ready =
    config.kind === "delivery"
      ? selected.length === 3 && selected.every((n) => n >= 0)
      : selected.length > 0;
  return (
    <div className="space-y-4 p-3 sm:p-5">
      {config.context && (
        <p className="rounded-xl bg-monitor-blue/5 p-4 leading-relaxed">{config.context}</p>
      )}
      <p className="font-semibold">{config.prompt}</p>
      {config.kind === "delivery" ? (
        <DndContext
          sensors={sensors}
          onDragStart={(e) => setDragging(Number(String(e.active.id).replace("delivery-", "")))}
          onDragEnd={drop}
          onDragCancel={() => setDragging(null)}
        >
          <p className="text-sm text-slate-text">
            ลากไปวางในช่องที่ตรงกัน ลากกลับฝั่งซ้ายเพื่อคืนตัวเลือก หรือลากตัวเลือกใหม่ไปแทนที่ได้
          </p>
          <div className="grid items-start gap-5 min-[1440px]:grid-cols-2">
            <div className="space-y-3">
              <h4 className="font-semibold">ตัวเลือกวิธีส่งสาร</h4>
              <DropZone id="delivery-pool">
                <div className="space-y-2">
                  {[0, 4, 8, 2, 6, 1, 5, 7, 3]
                    .filter((n) => !selected.includes(n))
                    .map((n) => (
                      <DragCard key={n} id={n} text={config.options[n].text} disabled={locked} />
                    ))}
                </div>
              </DropZone>
            </div>
            <div className="space-y-3">
              <h4 className="font-semibold">ปรับ 3 องค์ประกอบ</h4>
              {DELIVERY_SLOTS.map((slot, i) => (
                <div key={slot} className={`rounded-xl border p-3 ${tones[i]}`}>
                  <p className="mb-2 font-semibold">{slot}</p>
                  <DropZone id={`delivery-slot-${i}`}>
                    {selected[i] >= 0 ? (
                      <DragCard
                        id={selected[i]}
                        text={config.options[selected[i]].text}
                        disabled={locked}
                      />
                    ) : (
                      <p className="py-3 text-sm text-slate-text">ลากตัวเลือกมาวางที่นี่</p>
                    )}
                  </DropZone>
                </div>
              ))}
              <Button
                variant="outline"
                disabled={locked || selected.every((n) => n < 0)}
                onClick={() => edit([-1, -1, -1])}
              >
                <RotateCcw /> รีเซ็ต
              </Button>
            </div>
          </div>
          <DragOverlay>
            {dragging !== null && (
              <div className="max-w-xs rounded-lg border border-mint-primary bg-background p-3 text-sm shadow-xl">
                {config.options[dragging]?.text}
              </div>
            )}
          </DragOverlay>
        </DndContext>
      ) : (
        <fieldset disabled={locked} className="space-y-2">
          <legend className="sr-only">{config.prompt}</legend>
          {config.options.map((opt, i) => (
            <label
              key={opt.text}
              className={`flex items-start gap-3 rounded-xl border p-3 sm:p-4 ${selected.includes(i) ? "border-mint-primary bg-mint-primary/10" : "border-control-border/30 bg-background"} ${locked ? "" : "cursor-pointer hover:border-mint-primary"}`}
            >
              <input
                type={config.kind === "multi" ? "checkbox" : "radio"}
                name={config.title}
                checked={selected.includes(i)}
                onChange={() =>
                  edit(
                    config.kind === "single"
                      ? [i]
                      : selected.includes(i)
                        ? selected.filter((n) => n !== i)
                        : [...selected, i],
                  )
                }
                className="mt-1 size-4 shrink-0 accent-mint-primary"
              />
              <span className="min-w-0">
                <strong>{String.fromCharCode(65 + i)}.</strong> {opt.text}
              </span>
            </label>
          ))}
        </fieldset>
      )}
      {!locked && (
        <Button className="mini-game-primary w-full sm:w-auto" disabled={!ready} onClick={submit}>
          <CheckCircle2 />
          {history.length ? "ตรวจคำตอบอีกครั้ง" : "ตรวจคำตอบ"}
        </Button>
      )}
      {review && (
        <div
          role="status"
          aria-live="polite"
          className={`space-y-3 rounded-xl border p-4 ${review.correct ? "border-mint-primary/30 bg-mint-primary/5" : "border-monitor-amber/30 bg-monitor-amber/5"}`}
        >
          <p className="flex items-center gap-2 font-bold text-monitor-teal">
            {review.correct ? <CheckCircle2 /> : <Lightbulb />}
            {review.correct ? "ถูกต้องค่ะ!" : "ลองพิจารณาอีกครั้งนะคะ"}
          </p>
          {review.selected.map((n, i) => (
            <div key={n} className="space-y-1 text-sm leading-relaxed">
              <p>
                {config.kind === "delivery" && <strong>{DELIVERY_SLOTS[i]}: </strong>}
                {config.kind === "delivery" && Math.floor(n / 3) !== i
                  ? "ตัวเลือกนี้เป็นคนละองค์ประกอบ ลองจับคู่กับหัวข้อของช่องก่อนนะคะ"
                  : config.options[n].response}
              </p>
              {!review.correct && config.options[n].hint && (
                <p className="text-slate-text">คำใบ้: {config.options[n].hint}</p>
              )}
            </div>
          ))}
          {!review.correct && config.kind === "multi" && (
            <p className="text-sm text-slate-text">
              ตรวจให้ครบทั้งน้ำเสียง จังหวะ ท่าทาง และการสบตา
              โดยแยกความชัดเจนของข้อความออกจากวิธีส่งสาร
            </p>
          )}
          {!review.correct && config.kind === "delivery" && (
            <p className="text-sm text-slate-text">
              จับคู่แต่ละองค์ประกอบให้ตรง แล้วเลือกวิธีที่สงบ เป็นธรรมชาติ และเปิดรับผู้เรียน
            </p>
          )}
          {review.correct && (
            <div className="flex flex-wrap gap-2">
              {config.achievements.map((a) => (
                <span
                  key={a}
                  className="rounded-full bg-mint-primary/10 px-3 py-1 text-xs font-semibold text-monitor-teal"
                >
                  ✓ {a}
                </span>
              ))}
            </div>
          )}
          {review.correct && config.title === "Notice Your Own Reaction" && (
            <p className="text-sm font-semibold">Notice → Pause → Regulate → Respond</p>
          )}
          {review.correct && !last && (
            <Button className="mini-game-primary w-full sm:w-auto" onClick={onNext}>
              ไปขั้นตอนถัดไป <ArrowRight />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export function Module3MiniGame({
  value,
  onChange,
}: {
  value: MiniGameState;
  onChange: (next: MiniGameState) => void;
}) {
  const [roundIndex, setRoundIndex] = useState(() => {
    const index = value.rounds.findIndex((r, i) => !roundComplete(r, i));
    return index < 0 ? 2 : index;
  });
  const [stepIndex, setStepIndex] = useState(() => {
    const index = value.rounds[roundIndex].steps.findIndex((a) => !a.at(-1)?.correct);
    return index < 0 ? 2 : index;
  });
  const roundRef = useRef<HTMLElement>(null);
  const stepRef = useRef<HTMLDivElement>(null);
  const round = ROUNDS[roundIndex];
  const config = round.steps[stepIndex];
  const passed = roundComplete(value.rounds[roundIndex], roundIndex);
  const result = miniGameResult(value);
  const scrollTo = (ref: { current: HTMLElement | null }) =>
    requestAnimationFrame(() =>
      ref.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  function nextRound() {
    setRoundIndex(roundIndex + 1);
    setStepIndex(0);
    scrollTo(roundRef);
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
            <Gamepad2 className="size-4" /> MINI GAME · MODULE 3
          </p>
          <h2 className="mini-game-hero-title">
            Read the Emotion,
            <br />
            <span className="text-monitor-teal">Shape the Feedback</span>
          </h2>
          <p className="mt-3 text-lg font-semibold sm:text-xl">
            อ่านอารมณ์ ปรับ Feedback ให้เหมาะสม
          </p>
          <p className="mt-4 leading-relaxed text-slate-text">
            Feedback เดียวกัน อาจให้ผลต่างกันได้ ขึ้นอยู่กับว่าเราพูดอย่างไร
            และผู้เรียนกำลังรู้สึกอย่างไร
          </p>
        </div>
        <div className="mini-game-facts mt-5 flex w-fit flex-wrap gap-5 rounded-xl bg-background/95 p-4 text-sm">
          <span className="flex items-center gap-2">
            <BookOpenText /> 3 รอบสถานการณ์
          </span>
          <span className="flex items-center gap-2">
            <Trophy /> คะแนนเต็ม 10
          </span>
          <span className="flex items-center gap-2">
            <Heart /> ฝึกให้ Feedback อย่างเข้าใจผู้เรียน
          </span>
        </div>
      </header>
      <section className="mini-game-panel rounded-2xl border border-border bg-background p-3 sm:p-6">
        <h3 className="mb-5 flex flex-wrap items-center gap-3 text-xl font-bold">
          <Gamepad2 className="mini-game-heading-icon" />
          Game Opening{" "}
          <span className="rounded-full bg-mint-primary/10 px-3 py-1 text-xs font-medium text-monitor-teal">
            Introduction
          </span>
        </h3>
        <div className="grid items-start gap-6 min-[1440px]:grid-cols-2">
          <div className="mini-game-opening-copy min-w-0">
            <h4 className="font-semibold">Mini Challenge: Read the Emotion, Shape the Feedback</h4>
            <p className="mt-3 rounded-xl bg-mint-primary/10 p-4 leading-relaxed">
              “ก่อนตอบ ลองสังเกตอารมณ์ของผู้เรียน แล้วเลือกน้ำเสียง ภาษากาย
              และคำพูดที่ช่วยให้เขายังพร้อมเรียนรู้”
            </p>
            <div className="ai-coach-layout mt-4 flex flex-col-reverse items-start gap-5">
              <span className="flex h-32 w-32 shrink-0 items-center justify-center rounded-full bg-monitor-violet-soft shadow-sm sm:h-40 sm:w-40">
                <img src={coach} alt="" className="h-[80%] w-[80%] object-contain" />
              </span>
              <div className="ai-coach-speech w-full min-w-0 p-4 sm:p-5">
                <p className="mb-2 text-sm font-semibold text-monitor-violet">AI Learning Coach</p>
                <blockquote className="text-sm leading-relaxed">
                  “ก่อนเลือกคำพูด ลองสังเกตอารมณ์ของผู้เรียน และอารมณ์ของตัวเองก่อน เพราะ Feedback
                  ที่ดีไม่ได้มีแค่เนื้อหา แต่รวมถึงน้ำเสียง ภาษากาย และวิธีตอบสนองด้วย”
                </blockquote>
              </div>
            </div>
          </div>
          <div>
            <div className="rounded-xl border border-monitor-violet/15 bg-gradient-to-br from-monitor-violet/5 to-monitor-blue/10 p-5 text-center">
              <h4 className="mb-6 font-semibold">Feedback ที่เข้าใจอารมณ์</h4>
              <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                {[
                  { name: "Observe", label: "สังเกตอารมณ์", icon: Eye },
                  { name: "Regulate", label: "กำกับอารมณ์ตนเอง", icon: ShieldCheck },
                  { name: "Respond", label: "เลือกการตอบสนอง", icon: MessageCircle },
                  { name: "Support", label: "สนับสนุนการเรียนรู้", icon: Heart },
                ].map(({ name, label, icon: Icon }, i) => (
                  <div key={name}>
                    <div
                      className={`mini-process-icon ${i % 2 ? "mini-process-violet" : "mini-process-teal"}`}
                    >
                      <Icon />
                    </div>
                    <p className="mt-3 font-semibold">{name}</p>
                    <p className="mt-1 text-xs text-slate-text">{label}</p>
                  </div>
                ))}
              </div>
            </div>
            <Button
              className="mini-game-primary mt-3 w-full"
              disabled={value.started}
              onClick={() => {
                onChange({ ...value, started: true });
                scrollTo(roundRef);
              }}
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
          className="mini-game-panel scroll-mt-64 space-y-5 rounded-2xl border border-border bg-background p-3 sm:p-6"
        >
          <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
            <h3 className="flex min-w-0 items-start gap-3 text-lg font-bold sm:text-xl">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-mint-primary text-white">
                {roundIndex + 1}
              </span>
              <span>
                Round {roundIndex + 1} — {round.title}
              </span>
            </h3>
            <span className="shrink-0 rounded-full bg-mint-primary/10 px-3 py-1 text-xs font-semibold text-monitor-teal">
              {roundIndex + 1} / 3
            </span>
          </div>
          <div className="rounded-xl border border-monitor-blue/15 bg-gradient-to-br from-background to-monitor-blue/10 p-4 sm:p-5">
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-monitor-teal">
              <MessageCircle className="size-5" />
              สถานการณ์
            </p>
            <p className="leading-relaxed">{round.situation}</p>
            {round.cues.length > 0 && (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-text">
                {round.cues.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            )}
          </div>
          {roundIndex === 1 && (
            <div className="space-y-3">
              <p className="text-sm text-slate-text">
                อ่านคำอธิบายการส่งสารแต่ละแบบประกอบการเลือกคำตอบ
              </p>
              <div className="grid gap-3 md:grid-cols-3">
                {DELIVERY_VERSIONS.map((v, i) => (
                  <div key={v.name} className={`rounded-xl border p-4 ${tones[i]}`}>
                    <h4 className="font-bold">{v.name}</h4>
                    <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">
                      {v.cues.map((c) => (
                        <li key={c}>{c}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
          <ol aria-label="ขั้นตอนในรอบนี้" className="flex flex-wrap gap-2">
            {round.steps.map((s, i) => (
              <li
                key={s.title}
                aria-current={i === stepIndex ? "step" : undefined}
                className={`rounded-full px-3 py-1 text-xs font-medium ${i === stepIndex ? "bg-mint-primary text-white" : "bg-secondary text-slate-text"}`}
              >
                {value.rounds[roundIndex].steps[i].at(-1)?.correct ? "✓ " : ""}Step {i + 1}
              </li>
            ))}
          </ol>
          <div ref={stepRef} className="mini-game-step scroll-mt-64">
            <div className="mini-game-step-heading">
              <Search className="mini-game-heading-icon" />
              <h4 className="min-w-0 font-bold">
                Step {stepIndex + 1} · {config.title}
              </h4>
            </div>
            <StepEditor
              key={`${roundIndex}-${stepIndex}`}
              config={config}
              history={value.rounds[roundIndex].steps[stepIndex]}
              onSubmit={(selected, timing) =>
                onChange(recordAttempt(value, roundIndex, stepIndex, selected, timing))
              }
              last={stepIndex === 2}
              onNext={() => {
                setStepIndex(stepIndex + 1);
                scrollTo(stepRef);
              }}
            />
          </div>
          {passed && (
            <div className="mini-game-celebration relative overflow-hidden rounded-2xl border border-mint-primary/15 px-5 sm:px-0">
              <div className="mini-game-celebration-layout flex flex-col-reverse items-center gap-4 pt-5 sm:gap-6 sm:pt-6 min-[1440px]:flex-row min-[1440px]:pt-0">
                <div className="mini-game-celebration-portrait relative h-64 w-64 max-w-full shrink-0 sm:h-80 sm:w-80">
                  <img
                    src={avatar}
                    alt=""
                    className="absolute inset-0 h-full w-full object-contain object-bottom pt-3"
                  />
                </div>
                <div className="w-full min-w-0 flex-1 sm:px-6 sm:pb-2 min-[1440px]:w-auto min-[1440px]:px-0 min-[1440px]:py-6">
                  <h4 className="mb-2 flex items-center gap-2 text-xl font-bold">
                    <img src={correctBadge} alt="" className="size-10" />
                    AI Feedback
                  </h4>
                  <p className="font-bold text-monitor-teal">
                    ยอดเยี่ยม! ผ่านรอบที่ {roundIndex + 1} แล้ว
                  </p>
                  <p className="mt-2 leading-relaxed text-slate-text">{round.success}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {round.steps
                      .flatMap((s) => s.achievements)
                      .map((a) => (
                        <span
                          key={a}
                          className="rounded-full bg-mint-primary/10 px-3 py-1 text-xs font-semibold text-monitor-teal"
                        >
                          ✓ {a}
                        </span>
                      ))}
                  </div>
                  <p className="mt-2 text-xs text-slate-text">ตรวจตามเกณฑ์กิจกรรม</p>
                  {roundIndex < 2 ? (
                    <Button className="mini-game-primary mt-4 w-full sm:w-auto" onClick={nextRound}>
                      ไปรอบถัดไป <ArrowRight />
                    </Button>
                  ) : (
                    <div className="mt-4 space-y-2">
                      <p className="font-bold">Emotionally Intelligent Feedback</p>
                      <p className="text-sm">
                        Notice → Understand → Regulate → Respond → Support Learning
                      </p>
                      <p className="text-sm">Teacher + Learner → Looking at the Evidence</p>
                      <p className="leading-relaxed text-slate-text">
                        การให้ Feedback ที่มีคุณภาพไม่ได้ขึ้นอยู่กับคำพูดเพียงอย่างเดียว
                        แต่ต้องอาศัยการสังเกตอารมณ์ การควบคุมตนเอง น้ำเสียง ภาษากาย
                        และการเลือกวิธีตอบสนองที่ช่วยให้ผู้เรียนยังพร้อมเรียนรู้
                      </p>
                      <p className="font-semibold">
                        คะแนนหลังการฝึก {result.finalLearningScore} / 10 ·
                        ไปขั้นตอนสะท้อนคิดด้านล่างได้เลย
                      </p>
                    </div>
                  )}
                </div>
                <img
                  src={greatJob}
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
