import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { Loader2, MessageSquare, ArrowRight } from "lucide-react";
import { LearnerShell } from "@/components/learner-shell";
import { getLearnerOverview, submitSurvey } from "@/lib/learner.functions";
import { logActivity } from "@/lib/activity";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/survey")({
  head: () => ({
    meta: [
      { title: "แบบสำรวจหลังจบการทดลอง — My Feedback Lab" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SurveyPage,
});

const likertLabels = ["ไม่เห็นด้วยอย่างยิ่ง", "ไม่เห็นด้วย", "ปานกลาง", "เห็นด้วย", "เห็นด้วยอย่างยิ่ง"];

const items = [
  {
    key: "satisfaction",
    title: "ความพึงพอใจ",
    desc: "โดยรวมข้าพเจ้าพึงพอใจกับระบบ Personalized VR Gamified Learning นี้",
  },
  {
    key: "usability",
    title: "ความง่ายในการใช้งาน",
    desc: "ระบบใช้งานง่าย เข้าถึงเนื้อหาและ VR Scenario ได้สะดวก",
  },
  {
    key: "perceived_learning",
    title: "การรับรู้การเรียนรู้",
    desc: "ข้าพเจ้ารู้สึกว่าตนเองพัฒนาทักษะ Constructive Feedback ขึ้นจริง",
  },
  {
    key: "recommendation",
    title: "การแนะนำต่อ",
    desc: "ข้าพเจ้าจะแนะนำระบบนี้ให้เพื่อนอาจารย์ท่านอื่น",
  },
] as const;

function SurveyPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["learner-overview"],
    queryFn: () => getLearnerOverview(),
  });

  const [answers, setAnswers, clearAnswersDraft] = usePersistedState<Record<string, number>>(
    "survey.answers",
    {},
  );
  const [comments, setComments, clearCommentsDraft] = usePersistedState<string>(
    "survey.comments",
    "",
  );

  useEffect(() => {
    if (data?.state && !data.state.posttest_completed) {
      toast.error("กรุณาทำ Posttest ให้ผ่านก่อนทำแบบสำรวจ");
      navigate({ to: "/posttest", replace: true });
    } else if (data?.survey) {
      navigate({ to: "/certificate", replace: true });
    }
  }, [data, navigate]);

  const mutation = useMutation({
    mutationFn: async () =>
      submitSurvey({
        data: {
          satisfaction: answers.satisfaction,
          usability: answers.usability,
          perceived_learning: answers.perceived_learning,
          recommendation: answers.recommendation,
          comments: comments.trim() || null,
        },
      }),
    onSuccess: () => {
      toast.success("ขอบคุณสำหรับความคิดเห็น");
      clearAnswersDraft();
      clearCommentsDraft();
      qc.invalidateQueries({ queryKey: ["learner-overview"] });
      void logActivity({ type: "survey_submitted" });
      navigate({ to: "/certificate" });
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

  const allAnswered = items.every((it) => answers[it.key] !== undefined);

  return (
    <LearnerShell displayName={data?.profile?.display_name} avatarUrl={data?.profile?.avatar_url}>
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-mint-light px-3 py-1 text-xs font-bold uppercase tracking-wider text-mint-primary">
            <MessageSquare className="h-3 w-3" />
            Survey
          </div>
          <h1 className="text-3xl font-bold">แบบสำรวจหลังจบการทดลอง</h1>
          <p className="text-slate-text">
            ความคิดเห็นของท่านจะช่วยปรับปรุงระบบและใช้เพื่อการวิจัยเท่านั้น (ประมาณ 2 นาที)
          </p>
        </div>

        <div className="space-y-4">
          {items.map((it) => (
            <div key={it.key} className="rounded-2xl border border-border bg-background p-6">
              <div className="mb-1 font-bold text-slate-deep">{it.title}</div>
              <div className="mb-4 text-sm text-slate-text">{it.desc}</div>
              <div className="grid grid-cols-5 gap-2">
                {likertLabels.map((label, idx) => {
                  const val = idx + 1;
                  const selected = answers[it.key] === val;
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setAnswers((a) => ({ ...a, [it.key]: val }))}
                      className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-center transition-colors ${
                        selected
                          ? "border-mint-primary bg-mint-light"
                          : "border-border bg-background hover:border-mint-primary/40"
                      }`}
                    >
                      <span
                        className={`text-lg font-bold ${
                          selected ? "text-mint-primary" : "text-slate-deep"
                        }`}
                      >
                        {val}
                      </span>
                      <span className="text-[10px] leading-tight text-slate-text">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="rounded-2xl border border-border bg-background p-6">
            <div className="mb-2 font-bold text-slate-deep">ข้อเสนอแนะเพิ่มเติม (ไม่บังคับ)</div>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              maxLength={2000}
              rows={4}
              placeholder="สิ่งที่ชอบ / อยากให้ปรับปรุง / ข้อเสนอแนะอื่น ๆ"
              className="w-full resize-none rounded-xl border border-border bg-secondary/40 p-3 text-sm outline-none focus:border-mint-primary"
            />
          </div>
        </div>

        <button
          onClick={() => mutation.mutate()}
          disabled={!allAnswered || mutation.isPending}
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-deep px-8 py-4 font-bold text-white hover:opacity-90 disabled:opacity-50"
        >
          {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          ส่งแบบสำรวจและไปหน้าใบรับรอง
          <ArrowRight className="h-4 w-4" />
        </button>
        {!allAnswered && (
          <p className="mt-3 text-center text-xs text-slate-text">กรุณาตอบให้ครบทุกข้อ</p>
        )}
      </div>
    </LearnerShell>
  );
}
