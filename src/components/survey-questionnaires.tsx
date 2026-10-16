import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  MessageSquare,
  Send,
  ListChecks,
  CheckCircle2,
  Circle,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { LearnerShell } from "./learner-shell";
import { AssessmentHero } from "./ranking-assessment";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Progress } from "./ui/progress";
import { AssessmentScaleIcon } from "./assessment-scale-icon";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { useLearningTiming } from "@/hooks/use-learning-timing";
import {
  QUESTIONNAIRES,
  QUESTIONNAIRES_VERSION,
  answeredCount,
  isQuestionnaireComplete,
  questionnaireItems,
  type QuestionnaireDef,
  type QuestionnaireKey,
} from "@/lib/questionnaires";
import { submitQuestionnaireResponse } from "@/lib/questionnaires.functions";
import { getLearnerOverview, markSurveyCompletionAwarded } from "@/lib/learner.functions";
import { logActivity } from "@/lib/activity";

type SurveyAnswers = Partial<Record<QuestionnaireKey, Record<string, number>>>;

export function SurveyQuestionnaires() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["learner-overview"],
    queryFn: () => getLearnerOverview(),
  });

  useEffect(() => {
    if (data?.state && !data.state.posttest_completed) {
      toast.error("กรุณาทำ Posttest ให้ผ่านก่อนทำแบบสอบถาม");
      navigate({ to: "/posttest", replace: true });
    }
  }, [data, navigate]);

  if (isLoading || !data?.profile?.id || !data.state.posttest_completed) {
    return (
      <LearnerShell wide>
        <div className="flex min-h-[50vh] items-center justify-center" role="status">
          <Loader2 className="h-8 w-8 animate-spin text-mint-primary" />
        </div>
      </LearnerShell>
    );
  }

  return (
    <LearnerShell wide displayName={data.profile.display_name} avatarUrl={data.profile.avatar_url}>
      {data.state.survey_completed ? (
        <SurveyDone />
      ) : (
        <SurveyWizard
          key={data.profile.id}
          uid={data.profile.id}
          onAllSubmitted={() => {
            qc.setQueryData(["learner-overview"], {
              ...data,
              state: { ...data.state, survey_completed: true },
            });
            void qc.invalidateQueries({ queryKey: ["learner-overview"] });
          }}
        />
      )}
    </LearnerShell>
  );
}

// Mirrors AssessmentSummary's role on the assessment pages (ranking-assessment.tsx)
// — a content block under the hero so the result screen doesn't read as
// sparse/unfinished next to the posttest result page. Surveys have no score,
// so this lists which of the 4 instruments were submitted instead.
function SurveySummary() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {QUESTIONNAIRES.map((def) => (
        <Card key={def.key} className="rounded-lg p-6 shadow-none">
          <div className="flex items-center gap-2 text-sm font-semibold text-monitor-teal">
            <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
            {def.code}
          </div>
          <p className="mt-2 text-sm text-slate-text">{def.titleTh}</p>
        </Card>
      ))}
    </div>
  );
}

// Same treatment as AssessmentForm's post-submission screen (ranking-assessment.tsx,
// reusing its exact AssessmentHero component) — an explicit next step, not a
// silent redirect. Shown both right after submitting and on any later
// revisit while survey_completed is true.
function SurveyDone() {
  return (
    <div className="assessment-form w-full space-y-6 pb-8 font-prompt">
      <AssessmentHero
        icon={CheckCircle2}
        kicker="SURVEY · COMPLETED"
        titlePrefix="บันทึก"
        titleHighlight="แบบสอบถาม"
        titleSuffix="เรียบร้อยแล้ว"
        subtitle="ส่งคำตอบครบทั้ง 4 ชุดแล้ว ขอบคุณสำหรับความคิดเห็น"
      />
      <div className="app-content-container relative space-y-6">
        <SurveySummary />
        <Button asChild className="w-full">
          <Link to="/dashboard">
            ไปที่แดชบอร์ด <ArrowRight />
          </Link>
        </Button>
      </div>
    </div>
  );
}

function SurveyWizard({ uid, onAllSubmitted }: { uid: string; onAllSubmitted: () => void }) {
  const [answers, setAnswers, clearDraft] = usePersistedState<SurveyAnswers>(
    `survey.${uid}.${QUESTIONNAIRES_VERSION}`,
    {},
  );
  const [qIndex, setQIndex] = useState(0);
  const [review, setReview] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const titleRef = useRef<HTMLHeadingElement>(null);
  const timing = useLearningTiming("assessment", "survey", "form", true);

  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true });
  }, [qIndex, review]);

  const mutation = useMutation({
    mutationFn: async () => {
      for (const def of QUESTIONNAIRES) {
        await submitQuestionnaireResponse(def, answers[def.key] ?? {});
      }
      await markSurveyCompletionAwarded();
    },
    onSuccess: () => {
      timing.finish();
      clearDraft();
      void logActivity({ type: "survey_submitted", runId: timing.runId() });
      toast.success("ขอบคุณสำหรับความคิดเห็น");
      onAllSubmitted();
    },
    onError: () => toast.error("ส่งแบบสอบถามไม่สำเร็จ คำตอบยังอยู่ กรุณาลองอีกครั้ง"),
  });

  function goTo(next: number) {
    setQIndex(next);
    setReview(false);
    setConfirm(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const current = QUESTIONNAIRES[qIndex];
  const currentAnswers = answers[current.key] ?? {};
  const itemCount = questionnaireItems(current).length;
  const completedCount = answeredCount(current, currentAnswers);
  const allComplete = QUESTIONNAIRES.every((def) =>
    isQuestionnaireComplete(def, answers[def.key] ?? {}),
  );

  function setItemAnswer(def: QuestionnaireDef, itemId: string, value: number) {
    setAnswers((a) => ({
      ...a,
      [def.key]: { ...(a[def.key] ?? {}), [itemId]: value },
    }));
  }

  return (
    <div className="assessment-form w-full pb-8 font-prompt">
      <div className="app-content-container space-y-6">
        <p className="sr-only" role="status" aria-live="polite">
          {announcement}
        </p>

        {!review ? (
          <>
            <header className="space-y-3">
              <span className="assessment-kicker inline-flex items-center gap-2 text-sm font-semibold">
                <MessageSquare className="size-4" aria-hidden="true" />
                แบบสอบถามที่ {qIndex + 1} จาก {QUESTIONNAIRES.length}
              </span>
              <h1
                ref={titleRef}
                tabIndex={-1}
                className="text-2xl font-bold text-slate-deep outline-none sm:text-3xl"
              >
                {current.titleTh}
              </h1>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-text">
                {current.code}
              </p>
              <p className="leading-relaxed text-slate-text">{current.instructionsTh}</p>
            </header>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 font-medium text-slate-deep">
                  <CheckCircle2 className="assessment-accent size-4" aria-hidden="true" />
                  ตอบครบแล้ว {completedCount} / {itemCount} ข้อ
                </span>
                <span className="text-slate-text">
                  {Math.round((completedCount / itemCount) * 100)}%
                </span>
              </div>
              <Progress
                value={(completedCount / itemCount) * 100}
                aria-label={`ความคืบหน้า ${current.code}`}
              />
            </div>

            <div
              className="flex flex-wrap gap-x-5 gap-y-2 text-sm"
              aria-label="ความหมายของระดับคำตอบ"
            >
              {current.scaleLabels.map((text, i) => (
                <span
                  key={text}
                  data-scale={i + 1}
                  className="assessment-scale-label inline-flex items-center gap-1.5"
                >
                  <AssessmentScaleIcon level={i + 1} total={5} />
                  <strong>{i + 1}</strong> {text}
                </span>
              ))}
            </div>

            {current.dimensions.map((dim) => (
              <Card key={dim.key} className="assessment-panel rounded-xl p-3 shadow-none sm:p-8">
                <h2 className="assessment-accent mb-5 flex items-center gap-2 text-base font-semibold">
                  <Layers className="size-5 shrink-0" aria-hidden="true" />
                  {dim.title}
                </h2>
                <div className="divide-y divide-border">
                  {dim.items.map((item) => (
                    <div key={item.id} className="py-4 first:pt-0 last:pb-0">
                      <fieldset disabled={mutation.isPending}>
                        <legend className="mb-3 leading-relaxed text-slate-deep">
                          {item.text}
                        </legend>
                        <div className="grid max-w-md grid-cols-5 gap-1.5 sm:gap-2">
                          {[1, 2, 3, 4, 5].map((val) => (
                            <label key={val} className="relative cursor-pointer">
                              <input
                                type="radio"
                                name={item.id}
                                className="peer sr-only"
                                checked={currentAnswers[item.id] === val}
                                onChange={() => {
                                  setItemAnswer(current, item.id, val);
                                  setAnnouncement(
                                    `${item.text} — ${val} ${current.scaleLabels[val - 1]}`,
                                  );
                                }}
                                aria-label={`${item.text} — ระดับ ${val} ${current.scaleLabels[val - 1]}`}
                              />
                              <span className="assessment-choice" data-scale={val}>
                                <span className="assessment-radio" aria-hidden="true">
                                  {currentAnswers[item.id] === val && <span />}
                                </span>
                                {val}
                                <AssessmentScaleIcon level={val} total={5} />
                              </span>
                            </label>
                          ))}
                        </div>
                      </fieldset>
                    </div>
                  ))}
                </div>
              </Card>
            ))}

            <div className="flex flex-wrap justify-between gap-3">
              <Button variant="outline" disabled={qIndex === 0} onClick={() => goTo(qIndex - 1)}>
                <ArrowLeft />
                ก่อนหน้า
              </Button>
              <Button
                className="assessment-primary"
                onClick={() =>
                  qIndex === QUESTIONNAIRES.length - 1 ? setReview(true) : goTo(qIndex + 1)
                }
              >
                {qIndex === QUESTIONNAIRES.length - 1 ? "ทบทวนคำตอบ" : "ถัดไป"}
                <ArrowRight />
              </Button>
            </div>
          </>
        ) : (
          <Card className="assessment-panel space-y-5 rounded-xl p-6 shadow-none">
            <h2
              ref={titleRef}
              tabIndex={-1}
              className="flex items-center gap-2 text-xl font-bold outline-none"
            >
              <ListChecks className="assessment-accent size-6" aria-hidden="true" />
              ทบทวนก่อนส่งแบบสอบถาม
            </h2>
            <p className="text-sm text-slate-text">
              เลือก “แก้ไข” ด้านล่างเพื่อกลับไปตรวจหรือแก้ไขคำตอบของแบบสอบถามแต่ละชุด
            </p>
            <ul className="divide-y divide-border">
              {QUESTIONNAIRES.map((def, i) => {
                const complete = isQuestionnaireComplete(def, answers[def.key] ?? {});
                return (
                  <li key={def.key} className="flex items-center justify-between gap-3 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-slate-deep">{def.code}</span>
                      <span
                        className={
                          complete ? "text-xs text-mint-primary" : "text-xs text-slate-text"
                        }
                      >
                        {complete ? (
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
                      แก้ไข {def.code}
                    </button>
                  </li>
                );
              })}
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
                ส่งแบบสอบถามไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อแล้วกดส่งอีกครั้ง คำตอบยังอยู่ครบ
              </p>
            )}
            <Button
              className="assessment-primary w-full"
              disabled={!allComplete || !confirm || mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? <Loader2 className="animate-spin" /> : <Send />}
              {mutation.isPending ? "กำลังบันทึกคำตอบ…" : "ยืนยันส่งแบบสอบถามทั้งหมด"}
            </Button>
            {!allComplete && (
              <p className="text-center text-sm text-slate-text">
                ยังมีแบบสอบถามที่ตอบไม่ครบ กรุณาตรวจสอบก่อนส่ง
              </p>
            )}
          </Card>
        )}

        {!review && (
          <button
            type="button"
            className="block w-full text-center text-sm font-medium text-primary underline underline-offset-4 hover:no-underline"
            onClick={() => setReview(true)}
          >
            ดูสถานะแบบสอบถามทั้งหมด / ทบทวนคำตอบ
          </button>
        )}
      </div>
    </div>
  );
}
