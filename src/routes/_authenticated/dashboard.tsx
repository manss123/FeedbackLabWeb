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
import { getLearnerOverview, POSTTEST_PASS_PERCENT } from "@/lib/learner.functions";
import badgeM1 from "@/assets/badge-m1.png";
import badgeM2 from "@/assets/badge-m2.png";
import badgeM3 from "@/assets/badge-m3.png";
import badgeM4 from "@/assets/badge-m4.png";
import badgeM5 from "@/assets/badge-m5.png";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [{ title: "ภาพรวมการเรียน — My Feedback Lab" }, { name: "robots", content: "noindex" }],
  }),
  component: DashboardPage,
});

const stageLabels: Record<string, string> = {
  consent: "ยินยอมเข้าร่วมโครงการ",
  onboarding: "กรอกข้อมูลพื้นฐาน",
  diagnostic: "ทำแบบทดสอบวินิจฉัย",
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
      label: "แบบทดสอบวินิจฉัย (Pretest)",
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
      title: "แบบทดสอบวินิจฉัย",
      desc: "ประเมินสมรรถนะเริ่มต้นเพื่อสร้างเส้นทางเรียนรู้",
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
      desc: `Posttest 4 มิติ ต้องผ่าน ${POSTTEST_PASS_PERCENT}% เพื่อรับใบรับรอง`,
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
      href: "/certificate",
      done: !!state?.certificate_issued,
    },
  ];
  const currentIdx = quickCards.findIndex((c) => !c.done);

  return (
    <LearnerShell displayName={profile?.display_name} avatarUrl={profile?.avatar_url}>
      <div className="mb-10 space-y-2">
        <div className="text-sm font-medium text-slate-text">สวัสดี</div>
        <h1 className="text-3xl font-bold">{profile?.display_name ?? "อาจารย์ผู้เรียน"}</h1>
        <p className="text-slate-text">
          ขั้นตอนปัจจุบัน:{" "}
          <span className="font-semibold text-mint-primary">
            {stageLabels[state?.current_stage ?? "consent"]}
          </span>
        </p>
      </div>

      {/* Progress card */}
      <div className="mb-10 rounded-3xl bg-slate-deep p-8 text-white">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-white/60">
              ความคืบหน้าโดยรวม
            </div>
            <div className="mt-1 text-3xl font-bold">{progressPct}%</div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-mint-primary">
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
        <div className="mb-6 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-mint-primary transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <ul className="grid gap-2 text-sm md:grid-cols-2">
          {stages.map((s) => (
            <li
              key={s.key}
              className={`flex items-center gap-2 ${s.done ? "text-white" : "text-white/50"}`}
            >
              <span
                className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${s.done ? "bg-mint-primary text-white" : "border border-white/30"}`}
              >
                {s.done ? "✓" : ""}
              </span>
              {s.label}
            </li>
          ))}
        </ul>
      </div>

      {/* Module badges */}
      <div className="mb-10 rounded-3xl border border-border bg-background p-6">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-mint-primary">
              Learning Badges
            </div>
            <h2 className="mt-1 text-lg font-bold text-slate-deep">เหรียญตราจาก 5 โมดูลบทเรียน</h2>
          </div>
          <div className="text-xs text-slate-text">
            ได้รับ{" "}
            {MODULE_BADGES.filter((b) => (state?.completed_modules ?? []).includes(b.id)).length} /{" "}
            {MODULE_BADGES.length}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {MODULE_BADGES.map((b) => {
            const earned = (state?.completed_modules ?? []).includes(b.id);
            return (
              <div
                key={b.id}
                className={`group flex flex-col items-center rounded-2xl border p-4 text-center transition-all ${
                  earned
                    ? `border-transparent bg-gradient-to-br ${b.tint} shadow-sm ring-2 ${b.ring}`
                    : "border-dashed border-border bg-secondary/40"
                }`}
              >
                <div className="relative mb-2 flex h-20 w-20 items-center justify-center">
                  {earned ? (
                    <img
                      src={b.image}
                      alt={b.name}
                      className="h-full w-full object-contain drop-shadow-md transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <>
                      <img
                        src={b.image}
                        alt=""
                        aria-hidden
                        className="h-full w-full object-contain opacity-30 grayscale"
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
                  className={`mt-0.5 text-[10px] leading-tight ${earned ? "text-slate-text" : "text-slate-text/60"}`}
                >
                  {b.subtitle}
                </div>
                <div
                  className={`mt-1.5 text-[10px] font-bold uppercase tracking-wider ${earned ? "text-mint-primary" : "text-slate-text/60"}`}
                >
                  {earned ? "Unlocked" : "Locked"}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mb-4 flex items-end justify-between">
        <h2 className="text-xl font-bold">เส้นทางการเรียนรู้</h2>
        <div className="text-xs text-slate-text">6 ขั้นตอนต่อเนื่อง · แตะเพื่อเข้าสู่ขั้นตอน</div>
      </div>
      <ol className="relative space-y-3">
        {/* connector line */}
        <div
          className="pointer-events-none absolute left-[27px] top-6 bottom-6 w-0.5 bg-gradient-to-b from-mint-primary/60 via-border to-border"
          aria-hidden
        />
        {quickCards.map(({ title, desc, icon: Icon, href, done }, i) => {
          const isCurrent = i === currentIdx;
          const isLocked = currentIdx !== -1 && i > currentIdx;
          const stepNum = i + 1;
          return (
            <li key={href} className="relative">
              <button
                type="button"
                onClick={() => navigate({ to: href })}
                className={`group relative flex w-full items-stretch gap-4 rounded-2xl border p-5 text-left transition-all ${
                  done
                    ? "border-mint-primary/40 bg-mint-light/30 hover:border-mint-primary"
                    : isCurrent
                      ? "border-mint-primary bg-background shadow-md ring-4 ring-mint-primary/15 hover:shadow-lg"
                      : isLocked
                        ? "border-border bg-background/60 opacity-70 hover:opacity-100"
                        : "border-border bg-background hover:border-mint-primary/50 hover:shadow-md"
                }`}
              >
                {/* Step node */}
                <div className="relative flex flex-col items-center">
                  <div
                    className={`z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-4 border-background text-lg font-bold shadow-sm ${
                      done
                        ? "bg-mint-primary text-white"
                        : isCurrent
                          ? "bg-slate-deep text-white ring-4 ring-mint-primary/25"
                          : "bg-secondary text-slate-text"
                    }`}
                  >
                    {done ? (
                      <CheckCircle2 className="h-6 w-6" />
                    ) : isLocked ? (
                      <Lock className="h-5 w-5" />
                    ) : (
                      stepNum
                    )}
                  </div>
                </div>

                {/* Card body */}
                <div className="flex flex-1 items-center gap-4">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                      done ? "bg-mint-primary/15" : isCurrent ? "bg-mint-light" : "bg-secondary"
                    }`}
                  >
                    <Icon
                      className={`h-5 w-5 ${done || isCurrent ? "text-mint-primary" : "text-slate-text"}`}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="mb-0.5 flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-text">
                        ขั้นที่ {stepNum}
                      </span>
                      {done && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-mint-primary/15 px-2 py-0.5 text-[10px] font-bold text-mint-primary">
                          <CheckCircle2 className="h-2.5 w-2.5" /> เสร็จสิ้น
                        </span>
                      )}
                      {isCurrent && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-deep px-2 py-0.5 text-[10px] font-bold text-white">
                          กำลังทำ
                        </span>
                      )}
                      {isLocked && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-slate-text">
                          รอเปิด
                        </span>
                      )}
                    </div>
                    <div className="font-bold text-slate-deep">{title}</div>
                    <div className="text-sm text-slate-text">{desc}</div>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-slate-text transition-transform group-hover:translate-x-1 group-hover:text-mint-primary" />
                </div>
              </button>
            </li>
          );
        })}
      </ol>
    </LearnerShell>
  );
}
