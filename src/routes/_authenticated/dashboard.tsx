import type { ReactElement } from "react";
import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Award,
  Loader2,
  BookOpenText,
  Headset,
  ClipboardCheck,
  MessageSquare,
  ArrowRight,
  Download,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { toast } from "sonner";
import { LearnerShell } from "@/components/learner-shell";
import { Button } from "@/components/ui/button";
import { getLearnerOverview, getVrRoundScores } from "@/lib/learner.functions";
import { getQuestionnaireResults } from "@/lib/questionnaires.functions";
import { QUESTIONNAIRES } from "@/lib/questionnaires";
import { issueCertificateCall } from "@/lib/certificate.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "สรุปผลและใบรับรอง — My Feedback Lab" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CertificatePage,
});

const tooltipStyle = {
  background: "var(--background)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "var(--foreground)",
};

function CertificatePage() {
  const qc = useQueryClient();
  const overview = useQuery({ queryKey: ["learner-overview"], queryFn: getLearnerOverview });
  const vrScores = useQuery({ queryKey: ["vr-round-scores"], queryFn: getVrRoundScores });
  const questionnaireResults = useQuery({
    queryKey: ["questionnaire-results"],
    queryFn: getQuestionnaireResults,
  });

  // Every stage complete but not yet issued — issueCertificate re-verifies
  // eligibility and assigns the number server-side; this just triggers it
  // once per page load. A failure (stale client-side flag, network error,
  // etc.) is rendered in the certificate panel below, with a retry button —
  // never only logged, since the learner has no other way to know it failed.
  const issueMutation = useMutation({
    mutationFn: issueCertificateCall,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["learner-overview"] }),
  });
  const readyToIssue = overview.data?.state?.current_stage === "certificate";
  useEffect(() => {
    if (readyToIssue && issueMutation.isIdle) issueMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readyToIssue]);

  // pdf-lib/fontkit are only ever needed here, in the browser, on click — a
  // dynamic import keeps them out of both the SSR server bundle and every
  // other route's client chunk.
  const downloadMutation = useMutation({
    mutationFn: async () => {
      const profile = overview.data?.profile;
      const certificate = overview.data?.certificate;
      if (!profile?.display_name || !certificate) throw new Error("ข้อมูลใบรับรองยังไม่พร้อม");
      const { generateCertificatePdf, downloadCertificatePdf } =
        await import("@/lib/certificate-pdf");
      const bytes = await generateCertificatePdf({
        fullName: profile.display_name,
        issuedAt: certificate.issued_at,
        certificateId: certificate.certificate_id,
      });
      downloadCertificatePdf(bytes, `${certificate.certificate_id}.pdf`);
    },
    onError: () => toast.error("สร้างไฟล์ใบรับรองไม่สำเร็จ กรุณาลองอีกครั้ง"),
  });

  if (overview.isLoading) {
    return (
      <LearnerShell>
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="size-8 animate-spin text-mint-primary" />
        </div>
      </LearnerShell>
    );
  }
  if (overview.error) {
    return (
      <LearnerShell>
        <div
          role="alert"
          className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-destructive"
        >
          <p>โหลดข้อมูลไม่สำเร็จ</p>
          <Button className="mt-3" onClick={() => void overview.refetch()}>
            ลองอีกครั้ง
          </Button>
        </div>
      </LearnerShell>
    );
  }

  const data = overview.data;
  const state = data?.state;
  const results = data?.assessmentResults ?? {};
  const vr = vrScores.data;
  const certificateIssued = !!state?.certificate_issued;
  const surveyDoneCount = Object.values(data?.survey ?? {}).filter(Boolean).length;

  // The exact 7 stages issueCertificate checks server-side (see
  // functions/src/certificate.ts) — shown so a learner can see precisely
  // what's left, not just an aggregate count.
  const certificateSteps = [
    { key: "consent", label: "ยินยอมเข้าร่วมโครงการวิจัย", done: !!state?.consent_completed },
    { key: "onboarding", label: "กรอกข้อมูลพื้นฐาน", done: !!state?.onboarding_completed },
    { key: "pretest", label: "แบบทดสอบก่อนเรียน (Pre-test)", done: !!results.pretest },
    {
      key: "modules",
      label: `บทเรียน (${state?.modules_completed ?? 0}/5)`,
      done: (state?.modules_completed ?? 0) >= 5,
    },
    {
      key: "vr",
      label: `VR Simulation (${state?.vr_scenarios_completed ?? 0}/5)`,
      done: (state?.vr_scenarios_completed ?? 0) >= 5,
    },
    { key: "posttest", label: "แบบทดสอบหลังเรียน (Post-test)", done: !!results.posttest },
    { key: "survey", label: `แบบสำรวจ (${surveyDoneCount}/4)`, done: surveyDoneCount >= 4 },
  ];
  const certificateStepsDone = certificateSteps.filter((s) => s.done).length;

  const metrics = [
    {
      label: "บทเรียนที่เรียนจบ",
      value: `${state?.modules_completed ?? 0}/5`,
      icon: BookOpenText,
      tone: "border-monitor-teal/50 text-monitor-teal",
    },
    {
      label: "VR Simulation ที่ฝึกจบ",
      value: `${state?.vr_scenarios_completed ?? 0}/5`,
      icon: Headset,
      tone: "border-monitor-blue/50 text-monitor-blue",
    },
    {
      label: "แบบทดสอบที่ทำแล้ว",
      value: `${[results.pretest, results.posttest].filter(Boolean).length}/2`,
      icon: ClipboardCheck,
      tone: "border-monitor-violet/50 text-monitor-violet",
    },
    {
      label: "แบบสำรวจที่ตอบแล้ว",
      value: `${Object.values(data?.survey ?? {}).filter(Boolean).length}/4`,
      icon: MessageSquare,
      tone: "border-monitor-amber/50 text-monitor-amber",
    },
  ];

  const assessmentChart = (["pretest", "posttest"] as const).flatMap((phase) => {
    const r = results[phase];
    return r
      ? [
          {
            name: phase === "pretest" ? "ก่อนเรียน" : "หลังเรียน",
            percentage: Number(r.percentage.toFixed(1)),
          },
        ]
      : [];
  });

  const vrChart = [
    ...(vr?.round1 !== null && vr?.round1 !== undefined
      ? [{ name: "รอบแรก", score: vr.round1 }]
      : []),
    ...(vr?.round2 !== null && vr?.round2 !== undefined
      ? [{ name: "รอบสอง (หลังโค้ช)", score: vr.round2 }]
      : []),
  ];

  const questionnaireChart = QUESTIONNAIRES.flatMap((def) => {
    const r = questionnaireResults.data?.[def.key];
    return r ? [{ name: def.code, mean: r.overallMean }] : [];
  });

  return (
    <LearnerShell displayName={data?.profile?.display_name} avatarUrl={data?.profile?.avatar_url}>
      <div className="w-full space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-deep">สรุปผลการเรียนรู้ของฉัน</h1>
          <p className="mt-1 text-slate-text">
            ภาพรวมความคืบหน้า คะแนน และใบรับรองของคุณตลอดโครงการ
          </p>
        </div>

        <div>
          <dl className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {metrics.map(({ label, value, icon: Icon, tone }) => (
              <div key={label} className={`rounded-2xl border border-t-4 bg-card p-5 ${tone}`}>
                <dt className="flex items-center gap-2 text-sm font-medium">
                  <Icon className="size-5 shrink-0" />
                  {label}
                </dt>
                <dd className="mt-4 text-3xl font-semibold tabular-nums text-slate-deep">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
          <Button asChild variant="link" className="mt-2 min-h-11 px-0 underline">
            <Link to="/overview">
              ดูเส้นทางการเรียนรู้แบบละเอียด <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <ChartPanel
            title="แบบทดสอบก่อน–หลังเรียน"
            subtitle="เปอร์เซ็นต์คะแนนจากการจัดอันดับ 20 สถานการณ์"
            empty="ยังไม่มีผลแบบทดสอบให้แสดง"
            data={assessmentChart}
          >
            {(chartData) => (
              <BarChart data={chartData}>
                <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 5" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 13 }} />
                <YAxis
                  domain={[0, 100]}
                  width={40}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 13 }}
                />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `${v}%`} />
                <Bar
                  dataKey="percentage"
                  name="คะแนน (%)"
                  fill="var(--monitor-violet)"
                  radius={[8, 8, 0, 0]}
                  maxBarSize={72}
                  isAnimationActive={false}
                />
              </BarChart>
            )}
          </ChartPanel>

          <ChartPanel
            title="คะแนนโค้ชการฝึก VR ก่อน–หลัง"
            subtitle={
              vr?.pairedCount
                ? `เฉลี่ยจากรอบฝึกที่มีคะแนนครบสองรอบ ${vr.pairedCount} รอบ`
                : "ค่าเฉลี่ยคะแนน AI ต่อรอบการฝึก"
            }
            empty="ยังไม่มีผลการฝึก VR ให้แสดง"
            data={vrChart}
          >
            {(chartData) => (
              <BarChart data={chartData}>
                <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 5" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 13 }} />
                <YAxis
                  domain={[0, 100]}
                  width={40}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 13 }}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar
                  dataKey="score"
                  name="คะแนนเฉลี่ย"
                  fill="var(--monitor-blue)"
                  radius={[8, 8, 0, 0]}
                  maxBarSize={72}
                  isAnimationActive={false}
                />
              </BarChart>
            )}
          </ChartPanel>
        </div>

        <ChartPanel
          title="ผลแบบสำรวจหลังจบการทดลอง"
          subtitle="ค่าเฉลี่ยความคิดเห็นในแต่ละแบบสอบถาม (เต็ม 5)"
          empty="ยังไม่มีผลแบบสำรวจให้แสดง"
          data={questionnaireChart}
        >
          {(chartData) => (
            <BarChart data={chartData}>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 5" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 13 }} />
              <YAxis
                domain={[0, 5]}
                width={32}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 13 }}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar
                dataKey="mean"
                name="ค่าเฉลี่ย (เต็ม 5)"
                fill="var(--monitor-teal)"
                radius={[8, 8, 0, 0]}
                maxBarSize={72}
                isAnimationActive={false}
              />
            </BarChart>
          )}
        </ChartPanel>

        <div
          className={`rounded-3xl border-t-4 p-8 ${
            certificateIssued
              ? "border-monitor-teal bg-monitor-teal-soft"
              : readyToIssue && issueMutation.isError
                ? "border-destructive bg-destructive/5"
                : "border-border bg-card"
          }`}
        >
          <Award
            className={`mb-3 size-8 ${
              certificateIssued
                ? "text-monitor-teal"
                : readyToIssue && issueMutation.isError
                  ? "text-destructive"
                  : "text-mint-primary"
            }`}
          />
          <h2 className="text-xl font-semibold text-slate-deep">ใบรับรอง</h2>
          {certificateIssued && data?.certificate ? (
            <>
              <p className="mt-3 leading-relaxed text-slate-text">
                คุณได้รับใบรับรองสำหรับการเข้าร่วมโครงการนี้แล้ว
              </p>
              <dl className="mt-3 space-y-1 text-sm text-slate-text">
                <div>
                  <dt className="inline font-medium text-slate-deep">เลขที่ใบรับรอง: </dt>
                  <dd className="inline">{data.certificate.certificate_id}</dd>
                </div>
                <div>
                  <dt className="inline font-medium text-slate-deep">วันที่สำเร็จหลักสูตร: </dt>
                  <dd className="inline">
                    {new Date(data.certificate.issued_at).toLocaleDateString("th-TH", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </dd>
                </div>
              </dl>
              <Button
                className="mt-4"
                disabled={downloadMutation.isPending}
                onClick={() => downloadMutation.mutate()}
              >
                {downloadMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Download className="size-4" />
                )}
                ดาวน์โหลดใบรับรอง (PDF)
              </Button>
            </>
          ) : (
            <>
              <div className="mt-3 flex items-center justify-between text-sm text-slate-text">
                <span>ความคืบหน้าสำหรับใบรับรอง</span>
                <span className="font-semibold text-slate-deep">
                  {certificateStepsDone} / {certificateSteps.length} ขั้นตอน
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-background/70">
                <div
                  className="h-full rounded-full bg-monitor-teal transition-all"
                  style={{
                    width: `${(certificateStepsDone / certificateSteps.length) * 100}%`,
                  }}
                />
              </div>
              <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                {certificateSteps.map((s) => (
                  <li
                    key={s.key}
                    className={`flex items-center gap-2 ${
                      s.done ? "text-monitor-teal" : "text-slate-text"
                    }`}
                  >
                    {s.done ? (
                      <CheckCircle2 className="size-4 shrink-0" />
                    ) : (
                      <Circle className="size-4 shrink-0" />
                    )}
                    {s.label}
                  </li>
                ))}
              </ul>
            </>
          )}
          {!certificateIssued &&
            (readyToIssue && issueMutation.isError ? (
              <>
                <p className="mt-3 leading-relaxed text-destructive">
                  ออกใบรับรองไม่สำเร็จ:{" "}
                  {issueMutation.error instanceof Error
                    ? issueMutation.error.message
                    : "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ"}
                </p>
                <Button className="mt-4" onClick={() => issueMutation.mutate()}>
                  ลองอีกครั้ง
                </Button>
              </>
            ) : readyToIssue || issueMutation.isPending ? (
              <p className="mt-4 flex items-center gap-2 leading-relaxed text-slate-text">
                <Loader2 className="size-4 shrink-0 animate-spin" /> กำลังออกใบรับรอง
                กรุณารอสักครู่…
              </p>
            ) : (
              <>
                <p className="mt-4 leading-relaxed text-slate-text">
                  ใบรับรองจะออกให้อัตโนมัติเมื่อคุณทำครบทุกขั้นตอนด้านบน
                </p>
                {!results.posttest && (
                  <Button asChild className="mt-4">
                    <Link to="/posttest">
                      ไปทำแบบทดสอบหลังเรียน <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                )}
              </>
            ))}
        </div>
      </div>
    </LearnerShell>
  );
}

function ChartPanel<T>({
  title,
  subtitle,
  empty,
  data,
  children,
}: {
  title: string;
  subtitle: string;
  empty: string;
  data: T[];
  children: (data: T[]) => ReactElement;
}) {
  return (
    <section className="min-w-0 rounded-2xl border border-border/60 bg-card p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-slate-deep">{title}</h2>
      <p className="mt-1 text-sm text-slate-text">{subtitle}</p>
      {data.length ? (
        <div className="mt-6 h-72">
          <ResponsiveContainer width="100%" height="100%">
            {children(data)}
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="mt-6 flex min-h-48 items-center justify-center rounded-xl bg-secondary/50 px-6 text-center text-sm text-muted-foreground">
          {empty}
        </p>
      )}
    </section>
  );
}
