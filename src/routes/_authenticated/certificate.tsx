import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Award, CheckCircle2, XCircle, Sparkles, ArrowRight } from "lucide-react";
import { LearnerShell } from "@/components/learner-shell";
import { getLearnerOverview, POSTTEST_PASS_PERCENT } from "@/lib/learner.functions";

export const Route = createFileRoute("/_authenticated/certificate")({
  head: () => ({
    meta: [
      { title: "สรุปคะแนนและใบรับรอง — My Feedback Lab" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CertificatePage,
});

const dimensionLabels = {
  empathy_score: "Empathy",
  clarity_score: "Clarity",
  motivation_score: "Motivation",
  actionability_score: "Actionability",
} as const;

function CertificatePage() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery({
    queryKey: ["learner-overview"],
    queryFn: () => getLearnerOverview(),
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
  if (error) {
    return (
      <LearnerShell>
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-destructive">
          โหลดข้อมูลไม่สำเร็จ: {error.message}
        </div>
      </LearnerShell>
    );
  }

  const state = data?.state;
  const profile = data?.profile;
  const posttest = data?.posttest;
  const surveyDone = !!data?.survey;
  const passed = !!posttest?.passed;
  const eligible = passed && surveyDone;

  return (
    <LearnerShell displayName={profile?.display_name} avatarUrl={profile?.avatar_url}>
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-mint-light px-3 py-1 text-xs font-bold uppercase tracking-wider text-mint-primary">
            <Award className="h-3 w-3" />
            สรุปผลและใบรับรอง
          </div>
          <h1 className="text-3xl font-bold">สรุปคะแนนการเรียนรู้</h1>
          <p className="text-slate-text">
            สรุปสมรรถนะ 4 มิติจาก Posttest และสถานะการรับใบรับรอง (เกณฑ์ผ่าน {POSTTEST_PASS_PERCENT}%)
          </p>
        </div>

        {!posttest ? (
          <div className="rounded-3xl border border-dashed border-mint-primary/40 bg-mint-light/30 p-10 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-mint-primary/10">
              <Sparkles className="h-7 w-7 text-mint-primary" />
            </div>
            <h2 className="text-xl font-bold">ยังไม่มีคะแนน Posttest</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-text">
              เมื่อทำแบบทดสอบหลังเรียนเสร็จ ระบบจะสรุปคะแนน 4 มิติและสิทธิ์รับใบรับรองที่นี่
            </p>
            <button
              onClick={() => navigate({ to: "/posttest" })}
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-slate-deep px-6 py-3 font-bold text-white hover:opacity-90"
            >
              ไปทำ Posttest <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            {/* Overall score card */}
            <div
              className={`mb-6 overflow-hidden rounded-3xl p-8 text-white ${
                passed ? "bg-slate-deep" : "bg-slate-deep/95"
              }`}
            >
              <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
                <div>
                  <div className="text-xs font-medium uppercase tracking-wider text-white/60">
                    คะแนนรวม Posttest
                  </div>
                  <div className="mt-1 text-5xl font-bold">{Number(posttest.percentage)}%</div>
                  <div className="mt-2 flex items-center gap-2 text-sm">
                    {passed ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-mint-primary" />
                        <span className="text-white/80">ผ่านเกณฑ์ {POSTTEST_PASS_PERCENT}%</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 text-destructive-foreground" />
                        <span className="text-white/80">ยังไม่ผ่านเกณฑ์ {POSTTEST_PASS_PERCENT}%</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-2xl bg-white/10 px-5 py-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-mint-primary">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="text-xs text-white/60">แต้มสะสม</div>
                    <div className="font-bold">
                      {state?.total_points ?? 0} pts · Lv.{state?.level ?? 1}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 4-dimension breakdown */}
            <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {(Object.keys(dimensionLabels) as (keyof typeof dimensionLabels)[]).map((k) => {
                const val = Number(posttest[k as keyof typeof posttest] ?? 0);
                return (
                  <div key={k} className="rounded-2xl border border-border bg-background p-5">
                    <div className="text-xs font-medium uppercase tracking-wider text-slate-text">
                      {dimensionLabels[k]}
                    </div>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-slate-deep">{val}</span>
                      <span className="text-sm text-slate-text">/25</span>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-mint-primary transition-all"
                        style={{ width: `${(val / 25) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Checklist */}
            <div className="mb-6 rounded-2xl border border-border bg-background p-6">
              <h3 className="mb-4 font-bold text-slate-deep">เงื่อนไขการรับใบรับรอง</h3>
              <ul className="space-y-3 text-sm">
                <ChecklistItem done={passed}>
                  ผ่าน Posttest ≥ {POSTTEST_PASS_PERCENT}%
                </ChecklistItem>
                <ChecklistItem done={surveyDone}>
                  ทำแบบสำรวจหลังจบการทดลอง
                </ChecklistItem>
              </ul>
            </div>

            {/* Certificate action */}
            {eligible ? (
              <div className="rounded-3xl border-2 border-mint-primary bg-mint-light/40 p-8 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-mint-primary text-white">
                  <Award className="h-8 w-8" />
                </div>
                <h2 className="text-2xl font-bold text-slate-deep">
                  ท่านมีสิทธิ์รับใบรับรองแล้ว
                </h2>
                <p className="mx-auto mt-2 max-w-md text-sm text-slate-text">
                  ระบบจะสร้างใบรับรอง PDF พร้อม Verification Code — ฟีเจอร์นี้จะพัฒนาต่อใน Phase ถัดไป
                </p>
                <button
                  disabled
                  className="mt-6 inline-flex cursor-not-allowed items-center gap-2 rounded-2xl bg-slate-deep px-6 py-3 font-bold text-white opacity-60"
                >
                  ดาวน์โหลดใบรับรอง (เร็ว ๆ นี้)
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row">
                {!passed && (
                  <button
                    onClick={() => navigate({ to: "/posttest" })}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-deep px-6 py-4 font-bold text-white hover:opacity-90"
                  >
                    ทำ Posttest อีกครั้ง <ArrowRight className="h-4 w-4" />
                  </button>
                )}
                {passed && !surveyDone && (
                  <button
                    onClick={() => navigate({ to: "/survey" })}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-deep px-6 py-4 font-bold text-white hover:opacity-90"
                  >
                    ไปทำแบบสำรวจ <ArrowRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </LearnerShell>
  );
}

function ChecklistItem({ done, children }: { done: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3">
      <span
        className={`inline-flex h-5 w-5 items-center justify-center rounded-full ${
          done ? "bg-mint-primary text-white" : "border border-slate-text/30 text-slate-text"
        }`}
      >
        {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : ""}
      </span>
      <span className={done ? "text-slate-deep" : "text-slate-text"}>{children}</span>
    </li>
  );
}
