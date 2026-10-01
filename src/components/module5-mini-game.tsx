import { useRef, useState } from "react";
import {
  ArrowRight,
  BookOpenText,
  CheckCircle2,
  Gamepad2,
  Lightbulb,
  MessageCircle,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
} from "lucide-react";
import banner from "@/assets/banners/module1-banner.webp";
import coach from "@/assets/contents/ai-coaching-1.webp";
import avatar from "@/assets/contents/M1/avatar-feedback.webp";
import greatJob from "@/assets/contents/great-job.webp";
import correctBadge from "@/assets/contents/correct.webp";
import { Button } from "./ui/button";
import {
  ROUNDS,
  miniGameResult,
  recordAttempt,
  roundComplete,
  type Attempt,
  type MiniGameState,
  type Step,
} from "@/lib/module5-mini-game";

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
  const [selected, setSelected] = useState<number[]>(() => latest?.selected ?? []);
  const [review, setReview] = useState<Attempt | null>(latest ?? null);
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
  return (
    <div className="space-y-4 p-3 sm:p-5">
      {config.context && (
        <p className="rounded-xl bg-monitor-blue/5 p-4 leading-relaxed">{config.context}</p>
      )}
      <p className="font-semibold">{config.prompt}</p>
      <fieldset disabled={locked} className="space-y-2">
        <legend className="sr-only">{config.prompt}</legend>
        {config.options.map((opt, i) => (
          <label
            key={opt.text}
            className={`flex items-start gap-3 rounded-xl border p-3 sm:p-4 ${selected.includes(i) ? "border-mint-primary bg-mint-primary/10" : "border-control-border/30 bg-background"} ${locked ? "" : "cursor-pointer hover:border-mint-primary"}`}
          >
            <input
              type="radio"
              name={config.title}
              checked={selected.includes(i)}
              onChange={() => edit([i])}
              className="mt-1 size-4 shrink-0 accent-mint-primary"
            />
            <span className="min-w-0">
              <strong>{String.fromCharCode(65 + i)}.</strong> {opt.text}
            </span>
          </label>
        ))}
      </fieldset>
      {!locked && (
        <Button
          className="mini-game-primary w-full sm:w-auto"
          disabled={selected.length === 0}
          onClick={submit}
        >
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
          {review.selected.map((n) => (
            <div key={n} className="space-y-1 text-sm leading-relaxed">
              <p>{config.options[n].response}</p>
              {!review.correct && config.options[n].hint && (
                <p className="text-slate-text">คำใบ้: {config.options[n].hint}</p>
              )}
            </div>
          ))}
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

export function Module5MiniGame({
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
    const last = ROUNDS[roundIndex].steps.length - 1;
    const index = value.rounds[roundIndex].steps.findIndex((a) => !a.at(-1)?.correct);
    return index < 0 ? last : index;
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
            <Gamepad2 className="size-4" /> MINI GAME · MODULE 5
          </p>
          <h2 className="mini-game-hero-title">
            Reflect, Set a Goal,
            <br />
            <span className="text-monitor-teal">Grow</span>
          </h2>
          <p className="mt-3 text-lg font-semibold sm:text-xl">
            สะท้อนคิด ตั้งเป้าหมาย และพัฒนา Feedback ของคุณ
          </p>
          <p className="mt-4 leading-relaxed text-slate-text">
            การให้ Feedback ที่ดีไม่ได้จบเมื่อบทสนทนาจบ แต่เริ่มต้นอีกครั้งเมื่อเราสะท้อนว่า
            เราทำได้ดีตรงไหน และจะพัฒนาอะไรต่อ
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
            <TrendingUp /> ฝึกสะท้อนคิดและพัฒนาตนเอง
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
            <h4 className="font-semibold">Final Mini Challenge: Reflect, Set a Goal, Grow</h4>
            <p className="mt-3 rounded-xl bg-mint-primary/10 p-4 leading-relaxed">
              “ตลอดสี่โมดูลที่ผ่านมา คุณได้เรียนรู้เรื่องเป้าหมาย โครงสร้าง อารมณ์ เวลา และบริบทของ
              Feedback ใน Mini Challenge สุดท้าย ลองเปลี่ยนมุมมองจาก ‘ฉันจะ Feedback
              ผู้เรียนอย่างไร’ มาเป็น ‘ฉันจะพัฒนาการให้ Feedback ของตัวเองอย่างไร’”
            </p>
            <div className="ai-coach-layout mt-4 flex flex-col-reverse items-start gap-5">
              <span className="flex h-32 w-32 shrink-0 items-center justify-center rounded-full bg-monitor-violet-soft shadow-sm sm:h-40 sm:w-40">
                <img src={coach} alt="" className="h-[80%] w-[80%] object-contain" />
              </span>
              <div className="ai-coach-speech w-full min-w-0 p-4 sm:p-5">
                <p className="mb-2 text-sm font-semibold text-monitor-violet">AI Learning Coach</p>
                <blockquote className="text-sm leading-relaxed">
                  “การให้ Feedback ที่ดีไม่ได้จบเมื่อบทสนทนาจบ แต่เริ่มต้นอีกครั้งเมื่อเราสะท้อนว่า
                  เราทำได้ดีตรงไหน และจะพัฒนาอะไรต่อ”
                </blockquote>
              </div>
            </div>
          </div>
          <div>
            <div className="rounded-xl border border-monitor-violet/15 bg-gradient-to-br from-monitor-violet/5 to-monitor-blue/10 p-5 text-center">
              <h4 className="mb-6 font-semibold">Review → Reflect → Goal → Practice → Grow</h4>
              <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                {[
                  { name: "Review", label: "ทบทวน Performance", icon: Search },
                  { name: "Reflect", label: "สะท้อนคิด", icon: Lightbulb },
                  { name: "Goal", label: "ตั้งเป้าหมาย", icon: Target },
                  { name: "Grow", label: "ฝึกและพัฒนาต่อเนื่อง", icon: TrendingUp },
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
              last={stepIndex === round.steps.length - 1}
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
                      <p className="flex items-center gap-2 font-bold">
                        <Sparkles className="size-4 text-monitor-teal" />
                        From Feedback Giver to Reflective Practitioner
                      </p>
                      <p className="text-sm">
                        Review Performance → Recognize Strength → Identify Development Need → Set
                        a Goal → Practice → Review Evidence → Reflect & Adjust → Grow
                      </p>
                      <p className="leading-relaxed text-slate-text">
                        Feedback ช่วยให้ผู้เรียนพัฒนา และ Reflection ช่วยให้ผู้สอนพัฒนาเช่นกัน
                        ทุกครั้งที่คุณให้ Feedback ลองถามตัวเองว่า ‘อะไรได้ผล?’ ‘อะไรควรเปลี่ยน?’
                        และ ‘ครั้งหน้าฉันจะทดลองทำอะไรต่างจากเดิม?’
                      </p>
                      <p className="font-semibold">Reflect • Set a Goal • Practice • Review • Grow</p>
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
