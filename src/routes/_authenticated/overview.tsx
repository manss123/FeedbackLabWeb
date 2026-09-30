import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2,
  ClipboardCheck,
  BookOpenText,
  Headset,
  Award,
  Sparkles,
  ArrowRight,
  MessageSquare,
  Lock,
  CheckCircle2,
} from "lucide-react";
import { LearnerShell } from "@/components/learner-shell";
import { getLearnerOverview } from "@/lib/learner.functions";
import overviewBanner from "@/assets/banners/overview-banner.webp";
import badgeM1 from "@/assets/badge-m1.png";
import badgeM2 from "@/assets/badge-m2.png";
import badgeM3 from "@/assets/badge-m3.png";
import badgeM4 from "@/assets/badge-m4.png";
import badgeM5 from "@/assets/badge-m5.png";

export const Route = createFileRoute("/_authenticated/overview")({
  head: () => ({
    meta: [{ title: "ภาพรวมการเรียน — My Feedback Lab" }, { name: "robots", content: "noindex" }],
  }),
  component: DashboardPage,
});

const stageLabels: Record<string, string> = {
  consent: "ยินยอมเข้าร่วมโครงการ",
  onboarding: "กรอกข้อมูลพื้นฐาน",
  diagnostic: "ทำแบบทดสอบก่อนเรียน",
  modules: "เรียนบทเรียน 5 โมดูล",
  vr_simulation: "ฝึก VR Simulation",
  posttest: "ทำแบบทดสอบหลังเรียน",
  survey: "ทำแบบสำรวจหลังจบการทดลอง",
  certificate: "รับใบรับรอง",
  completed: "จบหลักสูตร",
};

const MODULE_BADGES = [
  {
    id: "m1",
    name: "Feedback Explorer",
    subtitle: "นักสำรวจข้อมูลย้อนกลับ",
    image: badgeM1,
    tint: "from-emerald-50 to-mint-light",
    ring: "ring-mint-primary/40",
  },
  {
    id: "m2",
    name: "Principle Master",
    subtitle: "ปรมาจารย์หลักการ",
    image: badgeM2,
    tint: "from-rose-50 to-slate-50",
    ring: "ring-rose-300/50",
  },
  {
    id: "m3",
    name: "Empathy Communicator",
    subtitle: "นักสื่อสารด้วยความเข้าใจ",
    image: badgeM3,
    tint: "from-sky-50 to-blue-50",
    ring: "ring-sky-300/50",
  },
  {
    id: "m4",
    name: "Motivator Coach",
    subtitle: "โค้ชผู้สร้างแรงบันดาลใจ",
    image: badgeM4,
    tint: "from-emerald-50 to-teal-50",
    ring: "ring-emerald-300/50",
  },
  {
    id: "m5",
    name: "Action Designer",
    subtitle: "ผู้ออกแบบการลงมือทำ",
    image: badgeM5,
    tint: "from-violet-50 to-purple-50",
    ring: "ring-violet-300/50",
  },
];

function DashboardPage() {
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

  const stages = [
    {
      key: "consent_completed",
      label: "ยินยอมเข้าร่วมโครงการวิจัย",
      done: !!state?.consent_completed,
    },
    {
      key: "onboarding_completed",
      label: "กรอกข้อมูลพื้นฐาน",
      done: !!state?.onboarding_completed,
    },
    {
      key: "pretest_completed",
      label: "แบบทดสอบก่อนเรียน (Pre-test)",
      done: !!state?.pretest_completed,
    },
    {
      key: "modules",
      label: `บทเรียน (${state?.modules_completed ?? 0}/5)`,
      done: (state?.modules_completed ?? 0) >= 5,
    },
    {
      key: "vr",
      label: `VR Scenarios (${state?.vr_scenarios_completed ?? 0}/5)`,
      done: (state?.vr_scenarios_completed ?? 0) >= 5,
    },
    {
      key: "posttest_completed",
      label: "แบบทดสอบหลังเรียน (Posttest)",
      done: !!state?.posttest_completed,
    },
    { key: "survey_completed", label: "แบบสำรวจหลังจบการทดลอง", done: !!state?.survey_completed },
    { key: "certificate_issued", label: "รับใบรับรอง", done: !!state?.certificate_issued },
  ];
  const completedCount = stages.filter((s) => s.done).length;
  const progressPct = Math.round((completedCount / stages.length) * 100);

  const quickCards = [
    {
      title: "แบบทดสอบก่อนเรียน",
      desc: "จัดอันดับการให้ Feedback ใน 20 สถานการณ์",
      icon: ClipboardCheck,
      href: "/diagnostic",
      done: !!state?.pretest_completed,
    },
    {
      title: "บทเรียน 5 โมดูล",
      desc: "องค์ความรู้ Constructive Feedback แบบโต้ตอบ",
      icon: BookOpenText,
      href: "/modules",
      done: (state?.modules_completed ?? 0) >= 5,
    },
    {
      title: "VR Simulation",
      desc: "ฝึกให้ Feedback กับนักศึกษาเสมือนจริง",
      icon: Headset,
      href: "/vr-simulation",
      done: (state?.vr_scenarios_completed ?? 0) >= 5,
    },
    {
      title: "แบบทดสอบหลังเรียน",
      desc: "จัดอันดับ 20 สถานการณ์และเปรียบเทียบผลก่อน–หลังเรียน",
      icon: ClipboardCheck,
      href: "/posttest",
      done: !!state?.posttest_completed,
    },
    {
      title: "แบบสำรวจ",
      desc: "แบบสำรวจหลังจบการทดลองสำหรับงานวิจัย",
      icon: MessageSquare,
      href: "/survey",
      done: !!state?.survey_completed,
    },
    {
      title: "สรุปคะแนน & ใบรับรอง",
      desc: "ดูสรุปสมรรถนะ 4 มิติและใบรับรองเมื่อครบเงื่อนไข",
      icon: Award,
      href: "/dashboard",
      done: !!state?.certificate_issued,
    },
  ];
  const currentIdx = quickCards.findIndex((c) => !c.done);

  return (
    <LearnerShell wide displayName={profile?.display_name} avatarUrl={profile?.avatar_url}>
      <div className="w-full">
        <section
          className="relative mb-5 xl:min-h-[340px] 2xl:min-h-[380px]"
          aria-label="ภาพรวมความคืบหน้า"
        >
          <div
            className="overview-banner-frame pointer-events-none relative z-0 mb-3 xl:absolute xl:inset-x-0 xl:top-0 xl:mb-0"
            aria-hidden="true"
          >
            <img
              src={overviewBanner}
              alt=""
              className="overview-banner-art block h-auto w-full object-contain object-right-top"
            />
          </div>
          <div className="relative z-[1] app-content-container">
            <div className="min-w-0 pb-4 xl:w-[67%] sm:pt-6">
              <header className="mb-4 flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0 flex-1 basis-48">
                  <p className="text-sm text-slate-text">สวัสดี</p>
                  <h1 className="break-words text-2xl font-bold leading-tight text-slate-deep sm:text-3xl">
                    {profile?.display_name ?? "อาจารย์ผู้เรียน"}
                  </h1>
                  <p className="mt-1 text-sm text-slate-text">
                    ยินดีต้อนรับสู่โมดูล:{" "}
                    <span className="font-semibold text-mint-primary">
                      {stageLabels[state?.current_stage ?? "consent"]}
                    </span>
                  </p>
                </div>
                <div className="ml-auto flex shrink-0 items-center gap-3 rounded-xl border border-border bg-background px-4 py-3">
                  <Sparkles className="size-5 text-mint-primary" aria-hidden="true" />
                  <div>
                    <p className="text-xs text-slate-text">แต้มสะสม</p>
                    <p className="whitespace-nowrap font-bold text-slate-deep">
                      {state?.total_points ?? 0} pts · Lv.{state?.level ?? 1}
                    </p>
                  </div>
                </div>
              </header>
              <div className="rounded-2xl border border-border bg-background/95 p-4 shadow-sm sm:p-5">
                <h2 className="text-sm font-medium">ความคืบหน้าโดยรวม</h2>
                <div className="mt-1 flex items-center gap-5">
                  <strong className="text-3xl text-mint-primary">{progressPct}%</strong>
                  <div
                    role="progressbar"
                    aria-label="ความคืบหน้าโดยรวม"
                    aria-valuenow={progressPct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    className="h-3 flex-1 overflow-hidden rounded-full bg-secondary"
                  >
                    <div
                      className="h-full rounded-full bg-mint-primary transition-all"
                      style={{ width: progressPct + "%" }}
                    />
                  </div>
                </div>
                <ul className="mt-3 grid gap-x-3 gap-y-2 text-xs min-[480px]:grid-cols-2">
                  {stages.map((stage) => (
                    <li key={stage.key} className="flex items-start gap-2">
                      {stage.done ? (
                        <CheckCircle2
                          className="size-4 shrink-0 text-mint-primary"
                          aria-hidden="true"
                        />
                      ) : (
                        <span
                          className="mt-px size-3.5 shrink-0 rounded-full border border-slate-text/60"
                          aria-hidden="true"
                        />
                      )}
                      <span
                        className={stage.done ? "font-medium text-slate-deep" : "text-slate-text"}
                      >
                        <span className="sr-only">
                          {stage.done ? "เสร็จแล้ว: " : "ยังไม่เสร็จ: "}
                        </span>
                        {stage.label}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <div className="relative z-[1] app-content-container">
          {/* Module badges */}
          <div className="relative mb-5 rounded-2xl border border-border bg-background bg-gradient-to-tr from-background via-background to-mint-primary/10 p-4 sm:p-5">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
              <div>
                <div className="text-sm font-bold uppercase text-mint-primary">Learning Badges</div>
                <h2 className="mt-0.5 text-sm font-semibold text-slate-deep">
                  เหรียญตราจาก 5 โมดูลบทเรียน
                </h2>
              </div>
              <div className="text-xs text-slate-text">
                ได้รับ{" "}
                {
                  MODULE_BADGES.filter((b) => (state?.completed_modules ?? []).includes(b.id))
                    .length
                }{" "}
                / {MODULE_BADGES.length}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 min-[540px]:grid-cols-3 xl:grid-cols-5">
              {MODULE_BADGES.map((b) => {
                const earned = (state?.completed_modules ?? []).includes(b.id);
                return (
                  <div
                    key={b.id}
                    className={`group flex flex-col items-center rounded-xl border px-2 py-3 text-center ${
                      earned
                        ? `border-transparent bg-gradient-to-br ${b.tint} shadow-sm ring-2 ${b.ring}`
                        : "border-dashed border-border bg-background"
                    }`}
                  >
                    <div className="relative mb-1 flex h-16 w-16 items-center justify-center">
                      {earned ? (
                        <img
                          src={b.image}
                          alt={b.name}
                          className="h-full w-full object-contain drop-shadow-md "
                        />
                      ) : (
                        <>
                          <img
                            src={b.image}
                            alt=""
                            aria-hidden
                            className="h-full w-full object-contain opacity-50"
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-background/90 shadow">
                              <Lock className="h-4 w-4 text-slate-text" />
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                    <div
                      className={`text-xs font-bold leading-tight ${earned ? "text-slate-deep" : "text-slate-text"}`}
                    >
                      {b.name}
                    </div>
                    <div
                      className={`mt-0.5 text-[10px] leading-tight ${earned ? "text-slate-text" : "text-slate-text"}`}
                    >
                      {b.subtitle}
                    </div>
                    <div
                      className={`mt-1.5 text-[10px] font-bold uppercase tracking-wider ${earned ? "text-mint-primary" : "text-slate-text"}`}
                    >
                      {earned ? "ได้รับแล้ว" : "ยังไม่ปลดล็อก"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <h2 className="text-lg font-bold">เส้นทางการเรียนรู้</h2>
            <div className="text-xs text-slate-text">
              6 ขั้นตอนต่อเนื่อง · แตะเพื่อเข้าสู่ขั้นตอน
            </div>
          </div>
          <ol className="relative space-y-2">
            {quickCards.map(({ title, desc, icon: Icon, href, done }, i) => {
              const isCurrent = i === currentIdx;
              const isLocked = currentIdx !== -1 && i > currentIdx;
              const stepNum = i + 1;
              return (
                <li
                  key={href}
                  className="relative before:pointer-events-none before:absolute before:left-8 before:top-1/2 before:z-10 before:h-[calc(100%+0.5rem)] before:border-l before:border-dashed before:border-border last:before:hidden"
                >
                  <button
                    type="button"
                    onClick={() => navigate({ to: href })}
                    className={`group relative flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mint-primary sm:gap-5 ${
                      done
                        ? "border-border bg-background hover:border-mint-primary"
                        : isCurrent
                          ? "border-mint-primary/60 bg-background ring-2 ring-mint-primary/15 hover:border-mint-primary"
                          : isLocked
                            ? "border-border bg-background/60 opacity-70 hover:opacity-100"
                            : "border-border bg-background hover:border-mint-primary/50 hover:shadow-md"
                    }`}
                  >
                    {/* Step node */}
                    <div className="relative flex flex-col items-center">
                      <div
                        className={`z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-background text-sm font-bold shadow-sm ${
                          done
                            ? "bg-mint-primary text-white"
                            : isCurrent
                              ? "bg-slate-deep text-white ring-2 ring-mint-primary/50"
                              : "bg-secondary text-slate-text"
                        }`}
                      >
                        {done ? <CheckCircle2 className="h-6 w-6" /> : stepNum}
                      </div>
                    </div>

                    {/* Card body */}
                    <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                      <div
                        className={`hidden h-11 w-11 shrink-0 sm:flex items-center justify-center rounded-xl ${
                          done ? "bg-mint-primary/15" : isCurrent ? "bg-mint-light" : "bg-secondary"
                        }`}
                      >
                        <Icon
                          className={`h-5 w-5 ${done || isCurrent ? "text-mint-primary" : "text-slate-text"}`}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-0.5 flex items-center gap-2">
                          <span className="text-xs font-medium text-slate-text">
                            ขั้นที่ {stepNum}
                          </span>
                          {done && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-mint-primary/15 px-2 py-0.5 text-[10px] font-bold text-mint-primary">
                              <CheckCircle2 className="h-2.5 w-2.5" /> เสร็จสิ้น
                            </span>
                          )}
                          {isCurrent && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-mint-primary px-2 py-0.5 text-[10px] font-bold text-white">
                              กำลังทำ
                            </span>
                          )}
                          {isLocked && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-slate-text">
                              รอเปิด
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                          <span className="text-sm font-semibold text-slate-deep">{title}</span>
                          <span className="text-xs leading-relaxed text-slate-text">{desc}</span>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-slate-text transition-transform group-hover:translate-x-1 group-hover:text-mint-primary" />
                    </div>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </LearnerShell>
  );
}
