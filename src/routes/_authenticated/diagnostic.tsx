import { useLearningTiming } from "@/hooks/use-learning-timing";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { usePersistedState } from "@/hooks/use-persisted-state";
import {
  Loader2,
  ClipboardCheck,
  ArrowRight,
  Heart,
  MessageCircle,
  Sparkles,
  Target,
} from "lucide-react";
import { LearnerShell } from "@/components/learner-shell";
import {
  DIAGNOSTIC_QUESTIONS,
  getLearnerOverview,
  submitDiagnostic,
} from "@/lib/learner.functions";
import { toast } from "sonner";
import { logActivity } from "@/lib/activity";

export const Route = createFileRoute("/_authenticated/diagnostic")({
  head: () => ({
    meta: [{ title: "แบบทดสอบวินิจฉัย — My Feedback Lab" }, { name: "robots", content: "noindex" }],
  }),
  component: DiagnosticPage,
});

const dimIcon = {
  empathy: Heart,
  clarity: MessageCircle,
  motivation: Sparkles,
  actionability: Target,
} as const;
const dimLabel = {
  empathy: "Empathy",
  clarity: "Clarity",
  motivation: "Motivation",
  actionability: "Actionability",
} as const;

function DiagnosticPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["learner-overview"],
    queryFn: () => getLearnerOverview(),
  });

  const [answers, setAnswers, clearAnswersDraft] = usePersistedState<Record<string, number>>(
    "diagnostic.answers",
    {},
  );
  const [result, setResult] = useState<null | {
    empathy: number;
    clarity: number;
    motivation: number;
    actionability: number;
    total: number;
  }>(null);

  const timing = useLearningTiming("assessment", "diagnostic", "form", !isLoading && !result);

  const mutation = useMutation({
    mutationFn: async () =>
      submitDiagnostic({
        data: {
          answers: DIAGNOSTIC_QUESTIONS.map((q) => ({
            id: q.id,
            score: answers[q.id] ?? 0,
          })),
        },
      }),
    onSuccess: (r) => {
      timing.finish();
      setResult(r);
      clearAnswersDraft();
      qc.invalidateQueries({ queryKey: ["learner-overview"] });
      void logActivity({ type: "diagnostic_submitted", runId: timing.runId() });
      toast.success("บันทึกผลการวินิจฉัยเรียบร้อย");
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

  const all = DIAGNOSTIC_QUESTIONS.every((q) => answers[q.id] !== undefined);

  if (result) {
    return (
      <LearnerShell displayName={data?.profile?.display_name} avatarUrl={data?.profile?.avatar_url}>
        <div className="mx-auto max-w-3xl">
          <div className="mb-8 rounded-3xl bg-mint-light p-10 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-mint-primary text-white">
              <ClipboardCheck className="h-8 w-8" />
            </div>
            <div className="text-sm font-semibold uppercase tracking-wider text-slate-text">
              Learner Profile ของท่าน
            </div>
            <div className="mt-1 text-5xl font-bold text-slate-deep">{result.total}/100</div>
            <p className="mx-auto mt-3 max-w-md text-sm text-slate-text">
              ระบบจะใช้โปรไฟล์นี้แนะนำลำดับบทเรียนและ VR Scenario ที่เหมาะกับจุดที่ควรพัฒนา
            </p>
          </div>

          <div className="mb-8 grid gap-3 sm:grid-cols-2">
            {(["empathy", "clarity", "motivation", "actionability"] as const).map((k) => {
              const Icon = dimIcon[k];
              const val = result[k];
              return (
                <div key={k} className="rounded-2xl border border-border bg-background p-5">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-mint-primary" />
                    <div className="text-xs font-medium uppercase tracking-wider text-slate-text">
                      {dimLabel[k]}
                    </div>
                  </div>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-slate-deep">{val}</span>
                    <span className="text-sm text-slate-text">/25</span>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-mint-primary"
                      style={{ width: `${(val / 25) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={() => navigate({ to: "/modules" })}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-deep px-6 py-4 font-bold text-white hover:opacity-90"
          >
            เริ่มบทเรียน 5 โมดูล <ArrowRight className="h-4 w-4" />
          </button>
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
            Diagnostic · Pretest
          </div>
          <h1 className="text-3xl font-bold">แบบทดสอบวินิจฉัย</h1>
          <p className="text-slate-text">
            ประเมินสมรรถนะพื้นฐาน 4 มิติ (Empathy, Clarity, Motivation, Actionability)
            เพื่อจัดเส้นทางการเรียนรู้เฉพาะบุคคล ใช้เวลาประมาณ 3 นาที
          </p>
        </div>

        <div className="space-y-4">
          {DIAGNOSTIC_QUESTIONS.map((q, i) => {
            const Icon = dimIcon[q.dimension];
            return (
              <div key={q.id} className="rounded-2xl border border-border bg-background p-6">
                <div className="mb-3 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-mint-light px-2 py-0.5 text-xs font-bold text-mint-primary">
                    <Icon className="h-3 w-3" />
                    {dimLabel[q.dimension]}
                  </span>
                  <span className="text-xs text-slate-text">
                    ข้อ {i + 1} / {DIAGNOSTIC_QUESTIONS.length}
                  </span>
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
            );
          })}
        </div>

        <button
          onClick={() => mutation.mutate()}
          disabled={!all || mutation.isPending}
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-deep px-8 py-4 font-bold text-white hover:opacity-90 disabled:opacity-50"
        >
          {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          ส่งคำตอบและสร้าง Learner Profile
        </button>
        {!all && <p className="mt-3 text-center text-xs text-slate-text">กรุณาตอบให้ครบทุกข้อ</p>}
      </div>
    </LearnerShell>
  );
}
