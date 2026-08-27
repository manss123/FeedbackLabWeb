import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { Loader2, ClipboardCheck, CheckCircle2, XCircle, ArrowRight, PlayCircle, Pause, BookOpenText, Sparkles } from "lucide-react";
import { LearnerShell } from "@/components/learner-shell";
import {
  getLearnerOverview,
  submitPosttest,
  POSTTEST_QUESTIONS,
  POSTTEST_PASS_PERCENT,
} from "@/lib/learner.functions";
import { toast } from "sonner";
import { logActivity } from "@/lib/activity";

export const Route = createFileRoute("/_authenticated/posttest")({
  head: () => ({
    meta: [
      { title: "แบบทดสอบหลังเรียน — My Feedback Lab" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PosttestPage,
});

const dimensionLabels = {
  empathy: "Empathy",
  clarity: "Clarity",
  motivation: "Motivation",
  actionability: "Actionability",
} as const;

function PosttestPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["learner-overview"],
    queryFn: () => getLearnerOverview(),
  });

  const [wrapUpDone, setWrapUpDone] = usePersistedState<boolean>("posttest.wrapup_done", false);

  const [answers, setAnswers, clearAnswersDraft] = usePersistedState<Record<string, number>>(
    "posttest.answers",
    {},
  );
  const [result, setResult] = useState<null | {
    passed: boolean;
    percentage: number;
    empathy: number;
    clarity: number;
    motivation: number;
    actionability: number;
    total: number;
  }>(null);

  const mutation = useMutation({
    mutationFn: async () =>
      submitPosttest({
        data: {
          answers: POSTTEST_QUESTIONS.map((q) => ({
            id: q.id,
            score: answers[q.id] ?? 0,
          })),
        },
      }),
    onSuccess: (r) => {
      setResult(r);
      clearAnswersDraft();
      qc.invalidateQueries({ queryKey: ["learner-overview"] });
      void logActivity({ type: "posttest_submitted" });
      if (r.passed) toast.success(`ผ่านเกณฑ์ ${POSTTEST_PASS_PERCENT}% แล้ว!`);
      else toast.error("ยังไม่ผ่านเกณฑ์ ทบทวนบทเรียนแล้วลองอีกครั้ง");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <LearnerShell>
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-mint-primary" />
        </div>
      </LearnerShell>
    );
  }

  const allAnswered = POSTTEST_QUESTIONS.every((q) => answers[q.id] !== undefined);

  if (!result && !wrapUpDone) {
    return (
      <LearnerShell displayName={data?.profile?.display_name} avatarUrl={data?.profile?.avatar_url}>
        <WrapUpScreen onDone={() => setWrapUpDone(true)} />
      </LearnerShell>
    );
  }


  if (result) {
    return (
      <LearnerShell displayName={data?.profile?.display_name} avatarUrl={data?.profile?.avatar_url}>
        <div className="mx-auto max-w-3xl">
          <div
            className={`mb-8 rounded-3xl p-10 text-center ${
              result.passed ? "bg-mint-light" : "bg-destructive/10"
            }`}
          >
            <div
              className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl ${
                result.passed ? "bg-mint-primary" : "bg-destructive"
              } text-white`}
            >
              {result.passed ? (
                <CheckCircle2 className="h-8 w-8" />
              ) : (
                <XCircle className="h-8 w-8" />
              )}
            </div>
            <div className="text-sm font-semibold uppercase tracking-wider text-slate-text">
              คะแนนรวม
            </div>
            <div className="mt-1 text-5xl font-bold text-slate-deep">{result.percentage}%</div>
            <div className="mt-2 text-sm text-slate-text">
              {result.passed
                ? "ยินดีด้วย! ท่านผ่านเกณฑ์และไปทำแบบสำรวจต่อได้"
                : `ยังไม่ผ่านเกณฑ์ ${POSTTEST_PASS_PERCENT}% — ทบทวนบทเรียนและลองใหม่ได้`}
            </div>
          </div>

          <div className="mb-8 grid gap-3 sm:grid-cols-2">
            {(["empathy", "clarity", "motivation", "actionability"] as const).map((k) => (
              <div key={k} className="rounded-2xl border border-border bg-background p-5">
                <div className="text-xs font-medium uppercase tracking-wider text-slate-text">
                  {dimensionLabels[k]}
                </div>
                <div className="mt-1 text-2xl font-bold text-slate-deep">{result[k]}/25</div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-mint-primary"
                    style={{ width: `${(result[k] / 25) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            {result.passed ? (
              <button
                onClick={() => navigate({ to: "/survey" })}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-deep px-6 py-4 font-bold text-white hover:opacity-90"
              >
                ทำแบบสำรวจต่อ <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <>
                <button
                  onClick={() => {
                    setResult(null);
                    setAnswers({});
                  }}
                  className="flex-1 rounded-2xl bg-slate-deep px-6 py-4 font-bold text-white hover:opacity-90"
                >
                  ทำใหม่อีกครั้ง
                </button>
                <button
                  onClick={() => navigate({ to: "/modules" })}
                  className="flex-1 rounded-2xl border border-border bg-background px-6 py-4 font-bold text-slate-deep hover:bg-secondary"
                >
                  กลับไปทบทวนบทเรียน
                </button>
              </>
            )}
          </div>
        </div>
      </LearnerShell>
    );
  }

  return (
    <LearnerShell displayName={data?.profile?.display_name} avatarUrl={data?.profile?.avatar_url}>
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-mint-light px-3 py-1 text-xs font-bold uppercase tracking-wider text-mint-primary">
            <ClipboardCheck className="h-3 w-3" />
            Posttest
          </div>
          <h1 className="text-3xl font-bold">แบบทดสอบหลังเรียน</h1>
          <p className="text-slate-text">
            ประเมินสมรรถนะ Constructive Feedback ทั้ง 4 มิติ — ต้องได้อย่างน้อย {POSTTEST_PASS_PERCENT}%
            จึงจะรับใบรับรองได้
          </p>
        </div>

        <div className="space-y-4">
          {POSTTEST_QUESTIONS.map((q, i) => (
            <div key={q.id} className="rounded-2xl border border-border bg-background p-6">
              <div className="mb-3 flex items-center gap-2">
                <span className="rounded-md bg-mint-light px-2 py-0.5 text-xs font-bold text-mint-primary">
                  {dimensionLabels[q.dimension]}
                </span>
                <span className="text-xs text-slate-text">ข้อ {i + 1} / {POSTTEST_QUESTIONS.length}</span>
              </div>
              <div className="mb-4 font-semibold text-slate-deep">{q.question}</div>
              <div className="space-y-2">
                {q.options.map((opt) => {
                  const selected = answers[q.id] === opt.score;
                  return (
                    <label
                      key={opt.label}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors ${
                        selected
                          ? "border-mint-primary bg-mint-light"
                          : "border-border bg-background hover:border-mint-primary/40"
                      }`}
                    >
                      <input
                        type="radio"
                        className="sr-only"
                        checked={selected}
                        onChange={() => setAnswers((a) => ({ ...a, [q.id]: opt.score }))}
                      />
                      <span
                        className={`inline-flex h-4 w-4 items-center justify-center rounded-full border-2 ${
                          selected ? "border-mint-primary" : "border-slate-text/40"
                        }`}
                      >
                        {selected && <span className="h-2 w-2 rounded-full bg-mint-primary" />}
                      </span>
                      <span className="text-sm text-slate-deep">{opt.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => mutation.mutate()}
          disabled={!allAnswered || mutation.isPending}
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-deep px-8 py-4 font-bold text-white hover:opacity-90 disabled:opacity-50"
        >
          {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          ส่งคำตอบและคำนวณคะแนน
        </button>
        {!allAnswered && (
          <p className="mt-3 text-center text-xs text-slate-text">กรุณาตอบให้ครบทุกข้อ</p>
        )}
      </div>
    </LearnerShell>
  );
}

// ============================================================
// Wrap-up Screen — recap 5 modules via video before posttest
// ============================================================

const WRAPUP_CHAPTERS = [
  {
    id: "m1",
    emoji: "🧭",
    title: "Module 1 · หลักการ Constructive Feedback",
    key: "Feedback คือข้อมูลสะท้อนช่องว่างพร้อมชี้แนวทางพัฒนา — ไม่ใช่การตัดสิน",
    duration: 6,
  },
  {
    id: "m2",
    emoji: "🏛️",
    title: "Module 2 · โมเดลการให้ Feedback",
    key: "ใช้โครงสร้าง Feed-up / Feed-back / Feed-forward เพื่อกำหนดเป้าหมาย · สะท้อน · ต่อยอด",
    duration: 6,
  },
  {
    id: "m3",
    emoji: "💬",
    title: "Module 3 · Empathic Communication",
    key: "รับฟังก่อนพูด · เปิด Psychological Safety · ยืนยันความรู้สึกของผู้เรียน",
    duration: 6,
  },
  {
    id: "m4",
    emoji: "🌱",
    title: "Module 4 · Motivation & Growth Mindset",
    key: "ชื่นชมความพยายามและกระบวนการ — หลีกเลี่ยงภาษาแบบ Fixed Mindset",
    duration: 6,
  },
  {
    id: "m5",
    emoji: "🎯",
    title: "Module 5 · Actionable Feedforward",
    key: "จบทุก Feedback ด้วยขั้นตอนที่ปฏิบัติได้จริงและวัดผลได้",
    duration: 6,
  },
];

const TOTAL_WRAPUP_DURATION = WRAPUP_CHAPTERS.reduce((a, c) => a + c.duration, 0);

function WrapUpScreen({ onDone }: { onDone: () => void }) {
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [watched, setWatched] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!playing) return;
    timerRef.current = window.setInterval(() => {
      setElapsed((e) => {
        if (e + 1 >= TOTAL_WRAPUP_DURATION) {
          if (timerRef.current) window.clearInterval(timerRef.current);
          setPlaying(false);
          setWatched(true);
          return TOTAL_WRAPUP_DURATION;
        }
        return e + 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [playing]);

  // Determine current chapter index from elapsed
  let acc = 0;
  let currentIdx = 0;
  for (let i = 0; i < WRAPUP_CHAPTERS.length; i++) {
    acc += WRAPUP_CHAPTERS[i].duration;
    if (elapsed < acc) {
      currentIdx = i;
      break;
    }
    currentIdx = i;
  }
  const current = WRAPUP_CHAPTERS[currentIdx];
  const progressPct = Math.round((elapsed / TOTAL_WRAPUP_DURATION) * 100);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8 space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full bg-mint-light px-3 py-1 text-xs font-bold uppercase tracking-wider text-mint-primary">
          <BookOpenText className="h-3 w-3" />
          Wrap-up · ก่อนเข้าสู่ Posttest
        </div>
        <h1 className="text-3xl font-bold">สรุปเนื้อหา 5 โมดูล ก่อนทำแบบทดสอบหลังเรียน</h1>
        <p className="text-slate-text">
          ทบทวนสาระสำคัญของบทเรียนทั้งหมดผ่านวิดีโอสรุปสั้น ๆ
          เพื่อเตรียมความพร้อมก่อนประเมินสมรรถนะ Constructive Feedback
        </p>
      </div>

      {/* Mock video player */}
      <div className="mb-4 overflow-hidden rounded-3xl border border-border bg-slate-deep">
        <div className="relative aspect-video">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-deep via-slate-900 to-slate-deep" />
          <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center text-white">
            {!playing && elapsed === 0 && !watched ? (
              <button
                onClick={() => setPlaying(true)}
                className="flex items-center gap-2 rounded-full bg-white/90 px-6 py-3 font-bold text-slate-deep hover:bg-white"
              >
                <PlayCircle className="h-6 w-6" /> เล่นวิดีโอสรุป ({TOTAL_WRAPUP_DURATION} วินาที)
              </button>
            ) : (
              <>
                <div className="mb-2 text-5xl">{current.emoji}</div>
                <div className="mb-1 text-xs uppercase tracking-widest text-white/60">
                  {watched ? "จบวิดีโอสรุปแล้ว" : `บทที่ ${currentIdx + 1} / ${WRAPUP_CHAPTERS.length}`}
                </div>
                <div className="mb-3 text-lg font-bold">{current.title}</div>
                <p className="max-w-lg text-sm text-white/80">{current.key}</p>
              </>
            )}
          </div>
        </div>
        {/* Controls */}
        <div className="flex items-center gap-3 border-t border-white/10 bg-slate-deep px-4 py-3 text-white">
          <button
            onClick={() => setPlaying((p) => !p)}
            disabled={watched}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 hover:bg-white/25 disabled:opacity-50"
          >
            {playing ? <Pause className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
          </button>
          <div className="flex-1">
            <div className="h-1.5 overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-mint-primary transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
          <div className="tabular-nums text-xs text-white/70">
            {String(Math.floor(elapsed / 60)).padStart(2, "0")}:
            {String(elapsed % 60).padStart(2, "0")} /
            {" "}
            {String(Math.floor(TOTAL_WRAPUP_DURATION / 60)).padStart(2, "0")}:
            {String(TOTAL_WRAPUP_DURATION % 60).padStart(2, "0")}
          </div>
        </div>
      </div>

      {/* Chapter list */}
      <div className="mb-6 rounded-2xl border border-border bg-background p-5">
        <div className="mb-3 text-xs font-bold uppercase tracking-wider text-mint-primary">
          สารบัญวิดีโอสรุป
        </div>
        <ol className="space-y-2">
          {WRAPUP_CHAPTERS.map((c, i) => {
            const past = i < currentIdx || watched;
            const active = i === currentIdx && !watched && (playing || elapsed > 0);
            return (
              <li
                key={c.id}
                className={`flex items-start gap-3 rounded-xl border p-3 text-sm transition-colors ${
                  active
                    ? "border-mint-primary bg-mint-light/60"
                    : past
                      ? "border-mint-primary/30 bg-mint-light/20"
                      : "border-border bg-background"
                }`}
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base ${
                    past ? "bg-mint-primary text-white" : "bg-secondary"
                  }`}
                >
                  {past ? <CheckCircle2 className="h-4 w-4" /> : c.emoji}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-slate-deep">{c.title}</div>
                  <div className="text-xs text-slate-text">{c.key}</div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <button
        onClick={onDone}
        disabled={!watched}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-deep px-8 py-4 font-bold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {watched ? (
          <>
            <Sparkles className="h-4 w-4" /> เริ่มทำแบบทดสอบหลังเรียน <ArrowRight className="h-4 w-4" />
          </>
        ) : (
          "รับชมวิดีโอให้จบก่อนทำ Posttest"
        )}
      </button>
    </div>
  );
}

