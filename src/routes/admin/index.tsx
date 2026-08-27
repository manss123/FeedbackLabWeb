import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Loader2,
  Download,
  FileJson,
  ShieldAlert,
  Users,
  CheckCircle2,
  Percent,
  Star,
  Headset,
} from "lucide-react";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import {
  adminExportData,
  adminListActivity,
  adminListUsers,
  type AdminActivityRow,
  type AdminSessionRow,
  type AdminUserRow,
} from "@/lib/admin.functions";
import { waitForFirebaseUser } from "@/lib/firebase-auth";
import { ACTIVITY_EVENT_LABELS } from "@/types/activity.types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

export const Route = createFileRoute("/admin/")({
  ssr: false,
  component: AdminIndexPage,
});

// UserDoc.progress/profile are typed as required, but nothing in the app
// actually writes `progress` to Firestore yet (it's a mock-only concept
// today — see learner.functions.ts's localStorage-based MockLearnerState),
// and `profile` isn't written until onboarding completes. Real rows can
// genuinely have either as undefined — fall back instead of crashing.
const EMPTY_PROFILE: AdminUserRow["profile"] = {
  displayName: null,
  email: "",
  avatarUrl: null,
  faculty: null,
  department: null,
  teachingExperienceYears: null,
};
const EMPTY_PROGRESS: AdminUserRow["progress"] = {
  currentStage: "consent",
  totalPoints: 0,
  level: 1,
  consentCompleted: false,
  onboardingCompleted: false,
  pretestCompleted: false,
  modulesCompletedCount: 0,
  vrScenariosCompletedCount: 0,
  posttestCompleted: false,
  surveyCompleted: false,
  certificateIssued: false,
  completedModuleIds: [],
  completedScenarioIds: [],
};

const STAGE_LABELS: Record<string, string> = {
  consent: "ยินยอม",
  onboarding: "ข้อมูลพื้นฐาน",
  diagnostic: "แบบทดสอบวินิจฉัย",
  modules: "บทเรียน",
  vr_simulation: "VR Simulation",
  posttest: "แบบทดสอบหลังเรียน",
  survey: "แบบสำรวจ",
  certificate: "ใบรับรอง",
  completed: "เสร็จสิ้น",
};

function AdminIndexPage() {
  const [tab, setTab] = useState("overview");

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-users"],
    // Firebase Auth's session restore is async — on a fresh page load (this
    // route has no in-app nav link, so it's always reached by a full
    // navigation, never client-side), currentUser can still be null the
    // instant this fires, which means httpsCallable sends no ID token at
    // all and requireAdmin rejects it — looking exactly like "wrong email"
    // when it's actually a timing race. Wait for the first auth-state event
    // before calling, same pattern used in consent.tsx/onboarding.tsx.
    queryFn: async () => {
      await waitForFirebaseUser();
      return adminListUsers();
    },
    retry: false,
  });

  const users = useMemo(() => data ?? [], [data]);

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-mint-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-background p-12 text-center">
        <ShieldAlert className="h-8 w-8 text-chart-1" />
        <div className="text-lg font-bold">ไม่มีสิทธิ์เข้าถึงหน้านี้</div>
        <p className="text-sm text-slate-text">บัญชีนี้ไม่ได้รับสิทธิ์ผู้ดูแลระบบ</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">แผงควบคุมผู้ดูแลระบบ</h1>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">ภาพรวมระบบ</TabsTrigger>
          <TabsTrigger value="individuals">ผู้เรียนรายบุคคล</TabsTrigger>
          <TabsTrigger value="activity">บันทึกกิจกรรม</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab users={users} />
        </TabsContent>

        <TabsContent value="individuals">
          <IndividualsTab users={users} />
        </TabsContent>

        <TabsContent value="activity">
          <ActivityLogTab users={users} active={tab === "activity"} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================
// Overview tab — aggregate stats + charts, all computed client-side from
// the already-fetched user list (no extra Cloud Function calls).
// ============================================================

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function percent(count: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((count / total) * 100);
}

const FUNNEL_CHART_CONFIG: ChartConfig = {
  count: { label: "จำนวนผู้เรียน", color: "var(--mint-primary)" },
};

// Round 1 = Amber, Round 2 = Emerald — see DESIGN_SYSTEM.md §8. Diagnostic
// (pre-training) and posttest (post-training) share the same four scoring
// dimensions, making this the natural fit for that convention.
const SCORE_CHART_CONFIG: ChartConfig = {
  diagnostic: { label: "ก่อนเรียน (Diagnostic)", color: "#F59E0B" },
  posttest: { label: "หลังเรียน (Posttest)", color: "#10B981" },
};

const SCORE_DIMENSIONS = [
  {
    key: "empathy",
    label: "ความเข้าอกเข้าใจ",
    diagnosticField: "empathy",
    posttestField: "empathyScore",
  },
  {
    key: "clarity",
    label: "ความชัดเจน",
    diagnosticField: "clarity",
    posttestField: "clarityScore",
  },
  {
    key: "motivation",
    label: "แรงจูงใจ",
    diagnosticField: "motivation",
    posttestField: "motivationScore",
  },
  {
    key: "actionability",
    label: "การนำไปปฏิบัติ",
    diagnosticField: "actionability",
    posttestField: "actionabilityScore",
  },
] as const;

function OverviewTab({ users }: { users: AdminUserRow[] }) {
  const total = users.length;
  const consentCount = users.filter((u) => (u.progress ?? EMPTY_PROGRESS).consentCompleted).length;
  const posttestCount = users.filter(
    (u) => (u.progress ?? EMPTY_PROGRESS).posttestCompleted,
  ).length;
  const posttestPercentages = users
    .map((u) => u.posttest?.percentage)
    .filter((v): v is number => typeof v === "number");
  const satisfactionScores = users
    .map((u) => u.survey?.satisfaction)
    .filter((v): v is number => typeof v === "number");
  const totalVrCompleted = users.reduce(
    (sum, u) => sum + (u.progress ?? EMPTY_PROGRESS).vrScenariosCompletedCount,
    0,
  );

  const funnelData = Object.entries(STAGE_LABELS).map(([stage, label]) => ({
    stage: label,
    count: users.filter((u) => (u.progress ?? EMPTY_PROGRESS).currentStage === stage).length,
  }));

  const usersWithBothScores = users.filter((u) => u.diagnostic && u.posttest);
  const scoreData = SCORE_DIMENSIONS.map((d) => ({
    dimension: d.label,
    diagnostic: average(usersWithBothScores.map((u) => u.diagnostic![d.diagnosticField] as number)),
    posttest: average(usersWithBothScores.map((u) => u.posttest![d.posttestField] as number)),
  }));

  if (total === 0) {
    return (
      <div className="rounded-2xl border border-border bg-background p-12 text-center text-slate-text">
        ยังไม่มีข้อมูลผู้เรียน
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <StatCard icon={Users} label="ผู้เรียนทั้งหมด" value={String(total)} />
        <StatCard
          icon={CheckCircle2}
          label="ให้ความยินยอม"
          value={`${percent(consentCount, total)}%`}
        />
        <StatCard
          icon={Percent}
          label="ทำแบบหลังเรียนแล้ว"
          value={`${percent(posttestCount, total)}%`}
        />
        <StatCard
          icon={Percent}
          label="คะแนนหลังเรียนเฉลี่ย"
          value={posttestPercentages.length ? `${average(posttestPercentages).toFixed(0)}%` : "-"}
        />
        <StatCard
          icon={Star}
          label="ความพึงพอใจเฉลี่ย"
          value={satisfactionScores.length ? average(satisfactionScores).toFixed(1) : "-"}
        />
        <StatCard icon={Headset} label="VR ที่ทำสำเร็จ" value={String(totalVrCompleted)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-background p-6">
          <div className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-text">
            สถานะผู้เรียนแยกตามขั้นตอน
          </div>
          <ChartContainer config={FUNNEL_CHART_CONFIG} className="h-72 w-full">
            <BarChart data={funnelData}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="stage"
                tickLine={false}
                axisLine={false}
                fontSize={11}
                interval={0}
                angle={-20}
                textAnchor="end"
                height={50}
              />
              <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={30} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill="var(--color-count)" radius={4} />
            </BarChart>
          </ChartContainer>
        </div>

        <div className="rounded-2xl border border-border bg-background p-6">
          <div className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-text">
            คะแนนก่อน-หลังเรียนเฉลี่ย (รายด้าน)
          </div>
          {usersWithBothScores.length === 0 ? (
            <p className="flex h-72 items-center justify-center text-sm text-slate-text">
              ยังไม่มีผู้เรียนที่ทำทั้งแบบวินิจฉัยและแบบหลังเรียนครบ
            </p>
          ) : (
            <ChartContainer config={SCORE_CHART_CONFIG} className="h-72 w-full">
              <BarChart data={scoreData}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="dimension" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis tickLine={false} axisLine={false} width={30} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="diagnostic" fill="var(--color-diagnostic)" radius={4} />
                <Bar dataKey="posttest" fill="var(--color-posttest)" radius={4} />
              </BarChart>
            </ChartContainer>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background p-6 shadow-xl">
      <Icon className="mb-3 h-5 w-5 text-mint-primary" />
      <div className="text-2xl font-bold text-slate-deep">{value}</div>
      <div className="text-xs text-slate-text">{label}</div>
    </div>
  );
}

// ============================================================
// Individuals tab — the original flat user table + CSV export, unchanged.
// ============================================================

function IndividualsTab({ users }: { users: AdminUserRow[] }) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const { users: exportUsers, sessions } = await adminExportData();
      downloadCsv("users.csv", usersToCsv(exportUsers));
      downloadCsv("sessions.csv", sessionsToCsv(sessions));
    } catch (e) {
      toast.error("ส่งออกข้อมูลไม่สำเร็จ", {
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">ภาพรวมผู้เรียนทั้งหมด ({users.length})</h2>
        <button
          onClick={handleExport}
          disabled={exporting || users.length === 0}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-deep px-4 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
        >
          {exporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          ส่งออก CSV
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-background">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-secondary/50 text-xs font-bold uppercase tracking-wider text-slate-text">
            <tr>
              <th className="px-4 py-3">ชื่อ</th>
              <th className="px-4 py-3">อีเมล</th>
              <th className="px-4 py-3">คณะ</th>
              <th className="px-4 py-3">สถานะ</th>
              <th className="px-4 py-3">แต้ม</th>
              <th className="px-4 py-3">Level</th>
              <th className="px-4 py-3">ยินยอม</th>
              <th className="px-4 py-3">ข้อมูลพื้นฐาน</th>
              <th className="px-4 py-3">วินิจฉัย</th>
              <th className="px-4 py-3">หลังเรียน</th>
              <th className="px-4 py-3">สำรวจ</th>
              <th className="px-4 py-3">VR ที่ทำ</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const profile = u.profile ?? EMPTY_PROFILE;
              const progress = u.progress ?? EMPTY_PROGRESS;
              return (
                <tr
                  key={u.uid}
                  className="border-b border-border last:border-0 hover:bg-secondary/30"
                >
                  <td className="px-4 py-3">
                    <Link
                      to="/admin/$userId"
                      params={{ userId: u.uid }}
                      className="font-semibold text-mint-primary hover:underline"
                    >
                      {profile.displayName ?? "(ไม่มีชื่อ)"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-text">{profile.email}</td>
                  <td className="px-4 py-3 text-slate-text">{profile.faculty ?? "-"}</td>
                  <td className="px-4 py-3">
                    {STAGE_LABELS[progress.currentStage] ?? progress.currentStage}
                  </td>
                  <td className="px-4 py-3">{progress.totalPoints}</td>
                  <td className="px-4 py-3">{progress.level}</td>
                  <td className="px-4 py-3">{doneMark(progress.consentCompleted)}</td>
                  <td className="px-4 py-3">{doneMark(progress.onboardingCompleted)}</td>
                  <td className="px-4 py-3">{doneMark(progress.pretestCompleted)}</td>
                  <td className="px-4 py-3">{doneMark(progress.posttestCompleted)}</td>
                  <td className="px-4 py-3">{doneMark(progress.surveyCompleted)}</td>
                  <td className="px-4 py-3">{progress.vrScenariosCompletedCount}</td>
                </tr>
              );
            })}
            {users.length === 0 && (
              <tr>
                <td colSpan={12} className="px-4 py-8 text-center text-slate-text">
                  ยังไม่มีข้อมูลผู้เรียน
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function doneMark(done: boolean) {
  return done ? "✓" : "—";
}

// ============================================================
// Activity Log tab — cross-user milestone event feed, fetched only once
// this tab is opened, joined against the already-fetched user list for
// display names, with CSV and JSON export.
// ============================================================

function ActivityLogTab({ users, active }: { users: AdminUserRow[]; active: boolean }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-activity"],
    queryFn: async () => {
      await waitForFirebaseUser();
      return adminListActivity();
    },
    enabled: active,
    retry: false,
  });

  const userMap = useMemo(() => new Map(users.map((u) => [u.uid, u])), [users]);
  const events = data ?? [];

  const handleExportCsv = () => downloadCsv("activity_log.csv", activityToCsv(events, userMap));
  const handleExportJson = () => downloadJson("activity_log.json", events);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">บันทึกกิจกรรมทั้งหมด ({events.length})</h2>
        <div className="flex gap-2">
          <button
            onClick={handleExportCsv}
            disabled={events.length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-deep px-4 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            ส่งออก CSV
          </button>
          <button
            onClick={handleExportJson}
            disabled={events.length === 0}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-bold text-slate-deep hover:bg-secondary"
          >
            <FileJson className="h-4 w-4" />
            ส่งออก JSON
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-mint-primary" />
        </div>
      )}

      {error && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-background p-12 text-center">
          <ShieldAlert className="h-8 w-8 text-chart-1" />
          <div className="text-lg font-bold">โหลดบันทึกกิจกรรมไม่สำเร็จ</div>
        </div>
      )}

      {data && (
        <div className="overflow-x-auto rounded-2xl border border-border bg-background">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-secondary/50 text-xs font-bold uppercase tracking-wider text-slate-text">
              <tr>
                <th className="px-4 py-3">เวลา</th>
                <th className="px-4 py-3">ผู้เรียน</th>
                <th className="px-4 py-3">ประเภทกิจกรรม</th>
                <th className="px-4 py-3">รายละเอียด</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => {
                const user = userMap.get(e.userId);
                const profile = user?.profile ?? EMPTY_PROFILE;
                return (
                  <tr
                    key={e.id}
                    className="border-b border-border last:border-0 hover:bg-secondary/30"
                  >
                    <td className="px-4 py-3 text-slate-text">{e.createdAt}</td>
                    <td className="px-4 py-3">
                      {user ? (
                        <Link
                          to="/admin/$userId"
                          params={{ userId: e.userId }}
                          className="font-semibold text-mint-primary hover:underline"
                        >
                          {profile.displayName ?? profile.email ?? e.userId}
                        </Link>
                      ) : (
                        <span className="text-slate-text">{e.userId}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{ACTIVITY_EVENT_LABELS[e.type] ?? e.type}</td>
                    <td className="px-4 py-3 text-slate-text">
                      {e.moduleId ?? e.scenarioId ?? "-"}
                    </td>
                  </tr>
                );
              })}
              {events.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-text">
                    ยังไม่มีบันทึกกิจกรรม
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// -------- CSV / JSON export --------

function csvEscape(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(rows: Record<string, unknown>[], columns: string[]): string {
  const header = columns.join(",");
  const lines = rows.map((row) => columns.map((c) => csvEscape(row[c])).join(","));
  return [header, ...lines].join("\n");
}

function usersToCsv(users: AdminUserRow[]): string {
  const columns = [
    "uid",
    "displayName",
    "email",
    "faculty",
    "department",
    "teachingExperienceYears",
    "currentStage",
    "totalPoints",
    "level",
    "consentCompleted",
    "onboardingCompleted",
    "pretestCompleted",
    "posttestCompleted",
    "surveyCompleted",
    "certificateIssued",
    "vrScenariosCompletedCount",
    "diagnosticTotal",
    "posttestPercentage",
    "posttestPassed",
    "surveySatisfaction",
  ];
  const rows = users.map((u) => {
    const profile = u.profile ?? EMPTY_PROFILE;
    const progress = u.progress ?? EMPTY_PROGRESS;
    return {
      uid: u.uid,
      displayName: profile.displayName,
      email: profile.email,
      faculty: profile.faculty,
      department: profile.department,
      teachingExperienceYears: profile.teachingExperienceYears,
      currentStage: progress.currentStage,
      totalPoints: progress.totalPoints,
      level: progress.level,
      consentCompleted: progress.consentCompleted,
      onboardingCompleted: progress.onboardingCompleted,
      pretestCompleted: progress.pretestCompleted,
      posttestCompleted: progress.posttestCompleted,
      surveyCompleted: progress.surveyCompleted,
      certificateIssued: progress.certificateIssued,
      vrScenariosCompletedCount: progress.vrScenariosCompletedCount,
      diagnosticTotal: u.diagnostic?.total ?? "",
      posttestPercentage: u.posttest?.percentage ?? "",
      posttestPassed: u.posttest?.passed ?? "",
      surveySatisfaction: u.survey?.satisfaction ?? "",
    };
  });
  return toCsv(rows, columns);
}

function sessionsToCsv(sessions: AdminSessionRow[]): string {
  const columns = [
    "id",
    "userId",
    "scenarioId",
    "createdAt",
    "stage1Transcript",
    "stage1DurationSeconds",
    "stage2SelfRatingsAvg",
    "stage3Overall",
    "stage3Emotion",
    "stage4Transcript",
    "stage4Overall",
    "stage4Emotion",
  ];
  const rows = sessions.map((s) => ({
    id: s.id,
    userId: s.userId,
    scenarioId: s.scenarioId,
    createdAt: s.createdAt,
    stage1Transcript: s.stage1?.transcript ?? "",
    stage1DurationSeconds: s.stage1?.durationSeconds ?? "",
    stage2SelfRatingsAvg: s.stage2
      ? (
          s.stage2.selfRatings.reduce((a, b) => a + b, 0) / (s.stage2.selfRatings.length || 1)
        ).toFixed(2)
      : "",
    stage3Overall: s.stage3?.aiScores?.overall ?? "",
    stage3Emotion: s.stage3?.emotion ?? "",
    stage4Transcript: s.stage4?.transcript ?? "",
    stage4Overall: s.stage4?.aiScores?.overall ?? "",
    stage4Emotion: s.stage4?.emotion ?? "",
  }));
  return toCsv(rows, columns);
}

function activityToCsv(events: AdminActivityRow[], userMap: Map<string, AdminUserRow>): string {
  const columns = [
    "id",
    "userId",
    "userEmail",
    "type",
    "typeLabel",
    "createdAt",
    "moduleId",
    "scenarioId",
    "sessionId",
  ];
  const rows = events.map((e) => ({
    id: e.id,
    userId: e.userId,
    userEmail: userMap.get(e.userId)?.profile?.email ?? "",
    type: e.type,
    typeLabel: ACTIVITY_EVENT_LABELS[e.type] ?? e.type,
    createdAt: e.createdAt,
    moduleId: e.moduleId ?? "",
    scenarioId: e.scenarioId ?? "",
    sessionId: e.sessionId ?? "",
  }));
  return toCsv(rows, columns);
}

const UTF8_BOM = String.fromCharCode(0xfeff);

function downloadCsv(filename: string, content: string) {
  // UTF-8 BOM so Excel renders Thai text correctly instead of mojibake.
  const blob = new Blob([UTF8_BOM + content], { type: "text/csv;charset=utf-8;" });
  downloadBlob(filename, blob);
}

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json;charset=utf-8;",
  });
  downloadBlob(filename, blob);
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
