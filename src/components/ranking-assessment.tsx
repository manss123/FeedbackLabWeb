import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Compass,
  ListChecks,
  MessageCircle,
  Save,
  Circle,
  CheckCircle2,
  ClipboardList,
  Loader2,
  Send,
  Lightbulb,
} from "lucide-react";
import testBanner from "@/assets/banners/test-banner.webp";
import testProp from "@/assets/contents/tests/prop-1.webp";
import { toast } from "sonner";
import { LearnerShell } from "./learner-shell";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Progress } from "./ui/progress";
import { AssessmentScaleIcon } from "./assessment-scale-icon";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { useLearningTiming } from "@/hooks/use-learning-timing";
import {
  ASSESSMENT_QUESTIONS,
  ASSESSMENT_VERSION,
  RANK_LABELS,
  assignRank,
  isRankComplete,
  type AssessmentAnswers,
  type AssessmentPhase,
  type AssessmentResult,
  type OptionId,
} from "@/lib/assessment";
import { submitRankingAssessment } from "@/lib/assessment.functions";
import { getLearnerOverview } from "@/lib/learner.functions";
import { logActivity } from "@/lib/activity";

// Fisher-Yates — used to randomize each question's option display order (see
// AssessmentForm's displayOrder) so the correct answer isn't always in the
// same on-screen position; scoring stays keyed by option.id regardless of
// where it's drawn, so this only ever affects layout, never grading.
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function AssessmentSummary({
  results,
}: {
  results: Partial<Record<AssessmentPhase, AssessmentResult>>;
}) {
  const pre = results.pretest;
  const post = results.posttest;
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        {(["pretest", "posttest"] as const).map((phase) => {
          const r = results[phase];
          return (
            <Card key={phase} className="rounded-lg p-6 shadow-none">
              <p className="text-sm text-slate-text">
                {phase === "pretest" ? "ก่อนเรียน · Pre-test" : "หลังเรียน · Post-test"}
              </p>
              {r ? (
                <>
                  <p className="mt-3 text-3xl font-bold text-slate-deep">
                    {r.totalScore}{" "}
                    <span className="text-base font-normal text-slate-text">
                      / {r.maxScore} คะแนน
                    </span>
                  </p>
                  <p className="mt-2 text-mint-primary">{r.percentage.toFixed(2)}%</p>
                </>
              ) : (
                <p className="mt-3 text-slate-text">ยังไม่ได้ทำแบบทดสอบ</p>
              )}
            </Card>
          );
        })}
      </div>
      {pre && post && (
        <p className="border-l-4 border-monitor-teal bg-card p-5 text-slate-deep">
          ผลต่างหลังเรียนเทียบก่อนเรียน:{" "}
          <strong>
            {post.percentage - pre.percentage > 0 ? "+" : ""}
            {(post.percentage - pre.percentage).toFixed(2)} จุดร้อยละ
          </strong>
        </p>
      )}
      <p className="text-sm leading-relaxed text-slate-text">
        คะแนนสะท้อนการจัดอันดับในสถานการณ์ตามแบบทดสอบ คะแนนเต็ม 240 คะแนน
        ยังไม่มีเกณฑ์ผ่าน–ไม่ผ่านหรือเกณฑ์ออกใบรับรองสำหรับแบบทดสอบชุดนี้
      </p>
    </div>
  );
}

export function RankingAssessment({ phase }: { phase: AssessmentPhase }) {
  const qc = useQueryClient();
  const overview = useQuery({ queryKey: ["learner-overview"], queryFn: getLearnerOverview });
  const results = overview.data?.assessmentResults ?? {};
  const uid = overview.data?.profile?.id;
  // Mount draft state only after identity is known, so shared devices never reuse another learner's answers.
  return (
    <LearnerShell
      wide
      displayName={overview.data?.profile?.display_name}
      avatarUrl={overview.data?.profile?.avatar_url}
    >
      {overview.isLoading ? (
        <div className="flex min-h-[50vh] items-center justify-center" role="status">
          <Loader2 className="mr-2 size-6 animate-spin text-mint-primary" />
          กำลังโหลดแบบทดสอบ
        </div>
      ) : overview.error || !uid ? (
        <Card className="app-content-container my-6 space-y-4 rounded-lg p-8 shadow-none">
          <h1 className="text-xl font-semibold">ยังโหลดแบบทดสอบไม่สำเร็จ</h1>
          <p className="text-slate-text">กรุณาตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง</p>
          <Button
            onClick={() => {
              void overview.refetch();
            }}
          >
            ลองอีกครั้ง
          </Button>
        </Card>
      ) : (
        <AssessmentForm
          key={`${uid}.${phase}`}
          uid={uid}
          phase={phase}
          initialResults={results}
          onSaved={(result) => {
            qc.setQueryData(["learner-overview"], {
              ...overview.data,
              assessmentResults: { ...results, [phase]: result },
            });
            void qc.invalidateQueries({ queryKey: ["learner-overview"] });
          }}
        />
      )}
    </LearnerShell>
  );
}

function AssessmentForm({
  uid,
  phase,
  initialResults,
  onSaved,
}: {
  uid: string;
  phase: AssessmentPhase;
  initialResults: Partial<Record<AssessmentPhase, AssessmentResult>>;
  onSaved: (result: AssessmentResult) => void;
}) {
  const PhaseIcon = phase === "pretest" ? Compass : ListChecks;
  const questions = ASSESSMENT_QUESTIONS[phase];
  // Randomized fresh every time this form mounts (i.e. every time the
  // learner opens the pre/post-test) — the answer key for most questions
  // happens to rank option A best, B second, etc., so always ranking in
  // reading order (1,2,3,4) would otherwise score 100% regardless of
  // understanding. Stable for the rest of this sitting (computed once via
  // useState, not recomputed on every render/rank click).
  const [displayOrder] = useState<Record<string, OptionId[]>>(() =>
    Object.fromEntries(questions.map((q) => [q.id, shuffle(q.options.map((o) => o.id))])),
  );
  const [answers, setAnswers, clearDraft] = usePersistedState<AssessmentAnswers>(
    `assessment.${uid}.${ASSESSMENT_VERSION}.${phase}`,
    {},
  );
  const [index, setIndex] = useState(0);
  const [review, setReview] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [result, setResult] = useState<AssessmentResult | undefined>(initialResults[phase]);
  const [announcement, setAnnouncement] = useState("");
  const titleRef = useRef<HTMLHeadingElement>(null);
  const blocked = phase === "posttest" && !initialResults.pretest;
  const timing = useLearningTiming(
    "assessment",
    phase === "pretest" ? "diagnostic" : "posttest",
    "form",
    !result && !blocked,
  );
  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true });
  }, [index, review]);
  const mutation = useMutation({
    mutationFn: () =>
      submitRankingAssessment(
        phase,
        Object.fromEntries(questions.map((q) => [q.id, answers[q.id] ?? {}])),
      ),
    onSuccess: (r) => {
      timing.finish();
      setResult(r);
      clearDraft();
      onSaved(r);
      void logActivity({
        type: phase === "pretest" ? "diagnostic_submitted" : "posttest_submitted",
        runId: timing.runId(),
      });
      toast.success("บันทึกคำตอบเรียบร้อยแล้ว");
    },
    onError: () => toast.error("ยังส่งคำตอบไม่สำเร็จ คำตอบยังอยู่ กรุณาลองอีกครั้ง"),
  });
  const completed = questions.filter((q) => isRankComplete(answers[q.id])).length;
  const question = questions[index];
  const orderedOptions = (displayOrder[question.id] ?? question.options.map((o) => o.id)).map(
    (id) => question.options.find((o) => o.id === id)!,
  );
  const ranks = answers[question.id] ?? {};
  const label = phase === "pretest" ? "แบบทดสอบก่อนเรียน" : "แบบทดสอบหลังเรียน";
  function goTo(next: number) {
    setIndex(next);
    setReview(false);
    setConfirm(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (blocked)
    return (
      <Card className="app-content-container my-6 space-y-4 rounded-lg p-8 shadow-none">
        <ClipboardList className="size-8 text-mint-primary" />
        <h1 className="text-2xl font-bold">เริ่มจากแบบทดสอบก่อนเรียน</h1>
        <p className="text-slate-text">
          กรุณาทำแบบทดสอบก่อนเรียนชุดนี้ก่อน เพื่อใช้เปรียบเทียบผลก่อนและหลังเรียน
        </p>
        <Button asChild>
          <Link to="/diagnostic">
            ไปทำแบบทดสอบก่อนเรียน <ArrowRight />
          </Link>
        </Button>
      </Card>
    );
  if (result)
    return (
      <div className="app-content-container space-y-6 py-6">
        <Card className="rounded-xl border-t-4 border-monitor-teal bg-card p-8 text-center shadow-none">
          <CheckCircle2 className="mx-auto mb-3 size-10 text-mint-primary" />
          <h1 className="text-2xl font-bold text-slate-deep">บันทึก{label}เรียบร้อยแล้ว</h1>
          <p className="mt-3 text-sm text-slate-text">
            ส่งคำตอบครบ 20 ข้อแล้ว ขอบคุณที่ร่วมทำแบบทดสอบ
          </p>
        </Card>
        <AssessmentSummary results={{ ...initialResults, [phase]: result }} />
        <Button asChild className="w-full">
          <Link to={phase === "pretest" ? "/modules" : "/survey"}>
            {phase === "pretest" ? "ไปยังบทเรียน" : "ไปยังแบบประเมินความพึงพอใจ"}
            <ArrowRight />
          </Link>
        </Button>
      </div>
    );

  return (
    <div className="assessment-form w-full space-y-6 pb-8 font-prompt">
      <header className="assessment-hero relative isolate">
        <div className="assessment-banner-frame" aria-hidden="true">
          <img src={testBanner} alt="" className="assessment-hero-art" />
        </div>
        <div className="app-content-container relative">
          <div className="assessment-hero-copy relative space-y-4">
            <span className="assessment-kicker inline-flex items-center gap-2 text-sm font-semibold">
              <PhaseIcon className="size-4" aria-hidden="true" />
              {phase === "pretest" ? "DIAGNOSTIC · PRETEST" : "ASSESSMENT · POSTTEST"}
            </span>
            <h1 className="text-2xl font-bold text-slate-deep sm:text-3xl">{label}</h1>
            <p className="leading-relaxed text-slate-text">
              โปรดจัดลำดับวิธีให้ Feedback ทั้ง 4 ตัวเลือกตามความเหมาะสมในแต่ละสถานการณ์
              ไม่มีตัวเลือกใดจำเป็นต้อง “ผิดทั้งหมด”
              แต่แต่ละตัวเลือกมีระดับความเหมาะสมแตกต่างกันตามหลักการให้ Constructive Feedback
            </p>
            <div className="assessment-hero-facts">
              <div className="flex items-center gap-3">
                <ClipboardList className="assessment-fact-icon" aria-hidden="true" />
                <div>
                  <p className="text-xs text-slate-text">ทั้งหมด</p>
                  <p className="font-semibold">20 สถานการณ์</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Lightbulb className="assessment-fact-icon" aria-hidden="true" />
                <div>
                  <p className="text-xs text-slate-text">ทักษะที่ประเมิน</p>
                  <p className="font-semibold">Constructive Feedback</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>
      <div className="app-content-container relative space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 font-medium text-slate-deep">
              <CheckCircle2 className="assessment-accent size-4" aria-hidden="true" />
              ตอบครบแล้ว {completed} / 20 ข้อ
            </span>
            <span className="text-slate-text">{completed * 5}%</span>
          </div>
          <Progress value={completed * 5} aria-label="ความคืบหน้าการตอบแบบทดสอบ" />
          <p className="flex items-start gap-2 text-xs text-slate-text">
            <Save className="size-4 shrink-0" aria-hidden="true" />
            คำตอบระหว่างทำเก็บไว้ในเบราว์เซอร์นี้ ส่งคำตอบเมื่อทบทวนครบแล้ว
          </p>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm" aria-label="ความหมายของอันดับ">
          {RANK_LABELS.map((text, i) => (
            <span
              key={text}
              data-scale={4 - i}
              className="assessment-scale-label inline-flex items-center gap-1.5"
            >
              <AssessmentScaleIcon level={4 - i} />
              <strong>{i + 1}</strong> {text}
            </span>
          ))}
        </div>
        <p className="sr-only" role="status" aria-live="polite">
          {announcement}
        </p>
        {!review ? (
          <>
            <Card className="assessment-panel assessment-question-panel rounded-3xl p-4 sm:p-7 lg:p-8">
              <p className="assessment-question-kicker mb-4 inline-flex items-center gap-2 text-sm font-semibold">
                <MessageCircle className="size-5" aria-hidden="true" />
                สถานการณ์ที่ {index + 1} จาก 20
              </p>
              <h2
                ref={titleRef}
                tabIndex={-1}
                className="text-lg font-semibold leading-relaxed text-slate-deep outline-none sm:text-xl"
              >
                {question.question}
              </h2>
              <p className="mb-6 mt-3 text-sm text-slate-text">
                เลือกอันดับให้แต่ละตัวเลือก โดยใช้อันดับ 1–4 ไม่ซ้ำกัน หากเลือกอันดับที่ใช้แล้ว
                ระบบจะสลับอันดับให้
              </p>
              {/* Divided rows, not per-option cards — DESIGN_SYSTEM.md §1/§6: the
                whole row must not change color when a rank is chosen, only the
                selected rank control and its legend text do. */}
              <div className="divide-y divide-border">
                {orderedOptions.map((option, optionIndex) => {
                  // Labels describe screen position; canonical IDs still own ranks and scoring.
                  const displayLabel = String.fromCharCode(65 + optionIndex);
                  return (
                    <div key={option.id} className="py-4 first:pt-0 last:pb-0">
                      <div className="flex items-start gap-3">
                        <span
                          className="assessment-accent mt-0.5 shrink-0 text-lg font-semibold"
                          aria-hidden="true"
                        >
                          {displayLabel}
                        </span>
                        <p
                          id={`option-${option.id}`}
                          className="flex-1 leading-relaxed text-slate-deep"
                        >
                          {option.label}
                        </p>
                      </div>
                      <fieldset className="mt-3 min-w-0 sm:pl-7" disabled={mutation.isPending}>
                        <legend
                          data-scale={ranks[option.id] ? 5 - ranks[option.id]! : undefined}
                          className="assessment-scale-label mb-2 text-xs text-slate-text"
                        >
                          อันดับของตัวเลือก {displayLabel}
                          {ranks[option.id]
                            ? ` · ${RANK_LABELS[ranks[option.id]! - 1]}`
                            : " · ยังไม่ได้เลือก"}
                        </legend>
                        <div className="grid max-w-xs grid-cols-4 gap-2">
                          {[1, 2, 3, 4].map((rank) => (
                            <label key={rank} className="relative cursor-pointer">
                              <input
                                type="radio"
                                name={`${question.id}-${option.id}`}
                                className="peer sr-only"
                                checked={ranks[option.id] === rank}
                                onChange={() => {
                                  setAnswers((a) => ({
                                    ...a,
                                    [question.id]: assignRank(
                                      a[question.id] ?? {},
                                      option.id,
                                      rank,
                                    ),
                                  }));
                                  setAnnouncement(
                                    `ตัวเลือก ${displayLabel} อันดับ ${rank} ${RANK_LABELS[rank - 1]}`,
                                  );
                                }}
                                aria-label={`ตัวเลือก ${displayLabel} อันดับ ${rank} ${RANK_LABELS[rank - 1]}`}
                              />
                              <span className="assessment-choice" data-scale={5 - rank}>
                                <span className="assessment-radio" aria-hidden="true">
                                  {ranks[option.id] === rank && <span />}
                                </span>
                                {rank}
                                <AssessmentScaleIcon level={5 - rank} />
                              </span>
                            </label>
                          ))}
                        </div>
                      </fieldset>
                    </div>
                  );
                })}
              </div>
            </Card>
            <div className="flex flex-wrap justify-between gap-3">
              <Button variant="outline" disabled={index === 0} onClick={() => goTo(index - 1)}>
                <ArrowLeft />
                ก่อนหน้า
              </Button>
              <Button
                className="assessment-primary"
                onClick={() => (index === 19 ? setReview(true) : goTo(index + 1))}
              >
                {index === 19 ? "ทบทวนคำตอบ" : "ข้อถัดไป"}
                <ArrowRight />
              </Button>
            </div>
          </>
        ) : (
          <Card className="assessment-panel assessment-question-panel space-y-5 rounded-3xl p-4 sm:p-7">
            <h2
              ref={titleRef}
              tabIndex={-1}
              className="flex items-center gap-2 text-xl font-bold outline-none"
            >
              <ListChecks className="assessment-accent size-6" aria-hidden="true" />
              ทบทวนก่อนส่งคำตอบ
            </h2>
            <p className="text-sm text-slate-text">
              ตอบครบ {completed} ข้อจาก 20 ข้อ เลือก “แก้ไขข้อ”
              ด้านล่างเพื่อกลับไปตรวจหรือแก้ไขคำตอบ
            </p>
            <ul className="divide-y divide-border">
              {questions.map((q, i) => (
                <li key={q.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-slate-deep">ข้อ {i + 1}</span>
                    <span
                      className={
                        isRankComplete(answers[q.id])
                          ? "text-xs text-mint-primary"
                          : "text-xs text-slate-text"
                      }
                    >
                      {isRankComplete(answers[q.id]) ? (
                        <span className="inline-flex items-center gap-1 text-monitor-teal">
                          <CheckCircle2 className="size-4" aria-hidden="true" />
                          ครบแล้ว
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <Circle className="size-4" aria-hidden="true" />
                          ยังไม่ครบ
                        </span>
                      )}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="text-sm font-medium text-primary underline underline-offset-4 hover:no-underline"
                    onClick={() => goTo(i)}
                  >
                    แก้ไขข้อ {i + 1}
                  </button>
                </li>
              ))}
            </ul>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg bg-secondary p-4 text-sm leading-relaxed">
              <input
                type="checkbox"
                className="mt-1 size-4 accent-mint-primary"
                checked={confirm}
                disabled={mutation.isPending}
                onChange={(e) => setConfirm(e.target.checked)}
              />
              <span>ตรวจคำตอบแล้วและยืนยันส่ง เมื่อส่งสำเร็จจะไม่สามารถแก้ไขคำตอบได้</span>
            </label>
            {mutation.isError && (
              <p role="alert" className="text-sm text-destructive">
                ส่งคำตอบไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อแล้วกดส่งอีกครั้ง คำตอบยังอยู่ครบ
              </p>
            )}
            <Button
              className="assessment-primary w-full"
              disabled={completed !== 20 || !confirm || mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? <Loader2 className="animate-spin" /> : <Send />}
              {mutation.isPending ? "กำลังบันทึกคำตอบ…" : "ยืนยันส่งคำตอบ"}
            </Button>
            {completed !== 20 && (
              <p className="text-center text-sm text-slate-text">
                เหลืออีก {20 - completed} ข้อที่ยังจัดอันดับไม่ครบ
              </p>
            )}
          </Card>
        )}
        {!review && (
          <section className="assessment-review-strip">
            <div className="assessment-review-status flex min-w-0 items-center gap-3">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-mint-light">
                <CheckCircle2 className="size-8 text-mint-primary" aria-hidden="true" />
              </span>
              <div>
                <p className="font-semibold text-monitor-teal">ตอบครบแล้ว {completed} / 20 ข้อ</p>
                <p className="mt-1 text-sm text-slate-text">
                  {completed === 20
                    ? "พร้อมทบทวนและส่งคำตอบของคุณ"
                    : "จัดอันดับให้ครบทุกตัวเลือกก่อนส่งคำตอบ"}
                </p>
              </div>
            </div>
            <div className="assessment-review-action">
              <Button
                type="button"
                className="assessment-review-button w-full"
                onClick={() => setReview(true)}
              >
                ทบทวนคำตอบทั้งหมด
                <span className="assessment-review-arrow" aria-hidden="true">
                  <ArrowRight />
                </span>
              </Button>
              <p className="mt-2 text-center text-xs text-slate-text">
                {completed === 20
                  ? "ตรวจสอบอีกครั้งก่อนยืนยันส่ง"
                  : "ดูสถานะและกลับไปทำข้อที่ยังไม่ครบ"}
              </p>
            </div>
            <img src={testProp} alt="" aria-hidden="true" className="assessment-review-prop" />
          </section>
        )}
      </div>
    </div>
  );
}
