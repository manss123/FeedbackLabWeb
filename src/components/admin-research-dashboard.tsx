import { formatResearchSeconds } from "@/lib/research-format";
import { researchRowKey } from "@/lib/research-row-key";
import { summarizeVideoVisits, VIDEO_SUMMARY_COLUMNS } from "@/lib/video-summary";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, type ReactNode } from "react";
import {
  Download,
  RefreshCw,
  Loader2,
  Search,
  BookOpenText,
  ListOrdered,
  Users,
} from "lucide-react";
import { adminExportData, adminListActivity } from "@/lib/admin.functions";
import { waitForFirebaseUser } from "@/lib/firebase-auth";
import { ACTIVITY_EVENT_LABELS } from "@/types/activity.types";
import {
  buildResearchLogs,
  EMPTY_RESEARCH_FILTERS,
  makeParticipantCodes,
  participantIds,
  RESEARCH_COLUMNS,
  RESEARCH_TIMEZONE,
  researchCsv,
  TEXT_COLUMNS,
  timestamp,
  type ResearchData,
  type ResearchRow,
  type ResearchValue,
} from "@/lib/research-log";
import { researchCodebook, RESEARCH_NOTES } from "@/lib/research-codebook";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const controlClass =
  "min-w-0 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const statusLabels: Record<string, string> = {
  all_stages_recorded: "มีข้อมูลครบ 4 ขั้น",
  partial_record: "ข้อมูลบางขั้นยังไม่ปรากฏ",
  matched: "เชื่อม session แล้ว",
  not_recorded: "ไม่ได้บันทึก session ID",
  session_missing: "ไม่พบ session",
  mismatch: "ข้อมูลอ้างอิงไม่ตรงกัน",
};
const timeFormat = new Intl.DateTimeFormat("th-TH", {
  timeZone: RESEARCH_TIMEZONE,
  dateStyle: "medium",
  timeStyle: "medium",
});
function valueText(value: ResearchValue | undefined): string {
  if (value == null) return "—";
  if (typeof value === "boolean") return value ? "มี" : "ไม่มี";
  return String(value);
}
function timeText(value: ResearchValue | undefined) {
  return typeof value === "string" && timestamp(value) !== null
    ? timeFormat.format(new Date(value))
    : "—";
}
function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function exportCsv(name: string, rows: ResearchRow[], columns: readonly string[]) {
  download(name, researchCsv(rows, columns), "text/csv;charset=utf-8;");
}

export function AdminResearchDashboard() {
  const query = useQuery({
    queryKey: ["admin-research-data"],
    queryFn: async (): Promise<ResearchData> => {
      await waitForFirebaseUser();
      // Reuse authorized read endpoints. Both sources must succeed so missing
      // activity is never silently interpreted as zero learner engagement.
      const [records, events] = await Promise.all([adminExportData(), adminListActivity()]);
      const data = { ...records, events };
      return { ...data, codes: await makeParticipantCodes(participantIds(data)) };
    },
    retry: false,
    refetchOnWindowFocus: false,
  });
  if (query.isPending)
    return (
      <div
        className="flex min-h-[40vh] items-center justify-center gap-3 text-slate-text"
        role="status"
      >
        <Loader2 className="h-6 w-6 animate-spin" />
        กำลังโหลดข้อมูลการเรียนรู้...
      </div>
    );
  if (query.isError) {
    const denied =
      "code" in query.error &&
      ["functions/permission-denied", "functions/unauthenticated"].includes(
        String(query.error.code),
      );
    return (
      <div
        className="space-y-4 rounded-2xl border border-border bg-background p-10 text-center"
        role="alert"
      >
        <h1 className="text-xl font-bold">
          {denied ? "บัญชีนี้ไม่มีสิทธิ์เข้าถึงข้อมูลวิจัย" : "โหลดข้อมูลวิจัยไม่สำเร็จ"}
        </h1>
        <p className="text-sm text-slate-text">
          {denied
            ? "กรุณาเข้าสู่ระบบด้วยบัญชีผู้ดูแลที่ได้รับสิทธิ์"
            : "ยังไม่สามารถรวมข้อมูลจากทุกแหล่งได้ กรุณาลองโหลดอีกครั้ง"}
        </p>
        <Button variant="outline" onClick={() => void query.refetch()}>
          ลองอีกครั้ง
        </Button>
        {denied && (
          <Link to="/auth" className="ml-4 text-mint-primary">
            เข้าสู่ระบบ
          </Link>
        )}
      </div>
    );
  }
  return (
    <ResearchWorkspace
      data={query.data}
      loadedAt={query.dataUpdatedAt}
      refreshing={query.isFetching}
      refresh={() => void query.refetch()}
    />
  );
}

function ResearchWorkspace({
  data,
  loadedAt,
  refreshing,
  refresh,
}: {
  data: ResearchData;
  loadedAt: number;
  refreshing: boolean;
  refresh: () => void;
}) {
  const [filters, setFilters] = useState(EMPTY_RESEARCH_FILTERS);
  const [tab, setTab] = useState("participants");
  const [search, setSearch] = useState("");
  const [eventType, setEventType] = useState("");
  const [showVideoDetails, setShowVideoDetails] = useState(false);
  const [scenario, setScenario] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [learningKind, setLearningKind] = useState("vr");
  const [includeText, setIncludeText] = useState(false);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const invalidRange = Boolean(filters.from && filters.to && filters.from > filters.to);
  const logs = useMemo(
    () => buildResearchLogs(data, filters, includeText),
    [data, filters, includeText],
  );
  const userMap = useMemo(() => new Map(data.users.map((u) => [u.uid, u])), [data.users]);
  const codeToUid = useMemo(
    () => new Map(Object.entries(data.codes).map(([uid, code]) => [code, uid])),
    [data.codes],
  );
  const participants = useMemo(() => participantIds(data), [data]);
  const matchingIds = useMemo(
    () =>
      new Set(
        participants.filter((uid) => {
          const profile = userMap.get(uid)?.profile;
          return [data.codes[uid], profile?.displayName, profile?.email, profile?.faculty].some(
            (v) => v?.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
          );
        }),
      ),
    [participants, userMap, data.codes, search],
  );
  const matches = (row: ResearchRow) =>
    !invalidRange && matchingIds.has(codeToUid.get(String(row.participant_code)) ?? "");
  const participantRows = logs.participants.filter(matches);
  const vrRows = logs.vr.filter(
    (row) => matches(row) && (!scenario || row.scenario_id === scenario),
  );
  const moduleRows = logs.modules.filter(
    (row) => matches(row) && (!moduleId || row.module_id === moduleId),
  );
  const activityRows = logs.activity.filter(
    (row) => matches(row) && (!eventType || row.event_type === eventType),
  );
  const webRows = logs.web.filter(matches);
  const videoRows = summarizeVideoVisits(activityRows);
  const displayedActivityRows = showVideoDetails
    ? activityRows
    : activityRows.filter((row) => row.event_type !== "video_observation");
  const stepRows = logs.steps.filter(matches);
  const paired = vrRows.filter((row) => row.delta_overall !== null);
  const deltaMean = paired.length
    ? paired.reduce((sum, row) => sum + Number(row.delta_overall), 0) / paired.length
    : null;
  const currentSession = data.sessions.find((s) => s.id === selectedSession);
  const currentSessionRow = logs.vr.find((row) => row.session_id === selectedSession);
  const vrColumns = includeText ? [...RESEARCH_COLUMNS.vr, ...TEXT_COLUMNS] : RESEARCH_COLUMNS.vr;
  const resetFilters = () => {
    setFilters(EMPTY_RESEARCH_FILTERS);
    setSearch("");
    setEventType("");
    setScenario("");
    setModuleId("");
  };
  const eventTypes = [...new Set(data.events.map((e) => e.type))].sort();
  const scenarios = [...new Set(data.sessions.map((s) => s.scenarioId))].sort();
  const moduleIds = [
    ...new Set(data.events.map((e) => e.moduleId).filter((v): v is string => Boolean(v))),
  ].sort();
  const missingTimes =
    data.events.filter((e) => timestamp(e.createdAt) === null).length +
    data.sessions.filter((s) => timestamp(s.createdAt) === null).length;

  const metadata = () => ({
    schema_version: "feedbacklab-research-2.1",
    exported_at_utc: new Date().toISOString(),
    snapshot_loaded_at_utc: new Date(loadedAt).toISOString(),
    timezone: RESEARCH_TIMEZONE,
    filters: {
      participant_code: filters.participant ? data.codes[filters.participant] : null,
      from: filters.from || null,
      to: filters.to || null,
      participant_search_applied: Boolean(search.trim()),
      matched_participant_codes: participantRows.map((r) => r.participant_code),
      vr_scenario: scenario || null,
      module: moduleId || null,
      activity_event_type: eventType || null,
    },
    include_text: includeText,
    notes: RESEARCH_NOTES,
    codebook: researchCodebook(includeText),
  });
  const exportBundle = () =>
    download(
      "feedbacklab_research.json",
      JSON.stringify(
        {
          metadata: metadata(),
          participants: participantRows,
          vr_sessions: vrRows,
          module_logs: moduleRows,
          activity_events: activityRows,
          web_sessions: webRows,
          learning_steps: stepRows,
        },
        null,
        2,
      ),
      "application/json;charset=utf-8;",
    );
  const participantCell = (row: ResearchRow) => {
    const uid = codeToUid.get(String(row.participant_code));
    return (
      <div>
        <span className="font-mono text-xs font-semibold">{row.participant_code}</span>
        <div className="mt-1 text-xs text-slate-text">
          {uid
            ? (userMap.get(uid)?.profile?.displayName ?? "ยังไม่มีข้อมูลชื่อ")
            : "ยังไม่มีข้อมูลชื่อ"}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-mint-primary">
            ข้อมูลการเรียนรู้เพื่อการวิจัย
          </p>
          <h1 className="text-2xl font-bold text-slate-deep">พฤติกรรมการเรียนและการใช้งาน</h1>
          <p className="mt-2 text-sm text-slate-text">
            ติดตามรายผู้เรียน ตรวจสอบแต่ละการฝึก และเชื่อมกลับไปยังเหตุการณ์ต้นทาง
          </p>
        </div>
        <Button variant="outline" onClick={refresh} disabled={refreshing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          อัปเดตข้อมูล
        </Button>
      </header>

      <section
        className="space-y-4 rounded-2xl border border-border bg-background p-5"
        aria-label="ตัวกรองข้อมูลวิจัย"
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="ค้นหาผู้เรียน">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-text" />
              <input
                className={`${controlClass} w-full pl-9`}
                aria-label="ค้นหาชื่อ อีเมล คณะ หรือรหัสผู้เข้าร่วม"
                placeholder="ชื่อ อีเมล คณะ หรือรหัส"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </Field>
          <Field label="ผู้เข้าร่วม">
            <select
              className={controlClass}
              value={filters.participant}
              onChange={(e) => setFilters({ ...filters, participant: e.target.value })}
            >
              <option value="">ผู้เข้าร่วมทุกคน</option>
              {participants.map((uid) => (
                <option key={uid} value={uid}>
                  {data.codes[uid]} · {userMap.get(uid)?.profile?.displayName ?? "ยังไม่มีชื่อ"}
                </option>
              ))}
            </select>
          </Field>
          <Field label="ตั้งแต่วันที่ (เวลาไทย)">
            <input
              type="date"
              className={controlClass}
              value={filters.from}
              onChange={(e) => setFilters({ ...filters, from: e.target.value })}
            />
          </Field>
          <Field label="ถึงวันที่ (รวมวันสิ้นสุด)">
            <input
              type="date"
              className={controlClass}
              value={filters.to}
              onChange={(e) => setFilters({ ...filters, to: e.target.value })}
            />
          </Field>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-text">
          <span>อัปเดตเมื่อ {timeFormat.format(new Date(loadedAt))} · เวลาไทย UTC+7</span>
          <button className="font-medium text-mint-primary hover:underline" onClick={resetFilters}>
            ล้างตัวกรองทั้งหมด
          </button>
        </div>
        {invalidRange && (
          <p role="alert" className="text-sm text-destructive">
            วันสิ้นสุดต้องไม่อยู่ก่อนวันเริ่มต้น
          </p>
        )}
        <p className="text-xs leading-relaxed text-slate-text">
          วันที่เลือกใช้กับเวลา event ของบทเรียน/กิจกรรม และเวลาเริ่มของ VR ส่วนรายละเอียด VR
          แสดงข้อมูลล่าสุดทั้งการฝึก ตัวกรองสถานการณ์ บทเรียน และชนิด event ใช้เฉพาะตารางนั้น
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <Metric
          icon={<Users className="h-5 w-5" />}
          label="ผู้เข้าร่วมในชุดที่เลือก"
          value={participantRows.length}
          detail="รวมผู้มี log แม้ยังไม่มี profile"
        />
        <Metric
          icon={<BookOpenText className="h-5 w-5" />}
          label="รายการฝึก VR"
          value={vrRows.length}
          detail="หนึ่งรายการ = หนึ่ง session"
        />
        <Metric
          icon={<ListOrdered className="h-5 w-5" />}
          label="มีคะแนนรวมสองรอบ"
          value={`${paired.length} / ${vrRows.length}`}
          detail={
            deltaMean === null
              ? "ยังไม่มีคู่คะแนนสำหรับเปรียบเทียบ"
              : `ผลต่างเฉลี่ย ${deltaMean >= 0 ? "+" : ""}${deltaMean.toFixed(1)} คะแนน · n = ${paired.length} sessions`
          }
        />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-auto flex-wrap justify-start gap-1">
          <TabsTrigger value="web">Web Sessions</TabsTrigger>
          <TabsTrigger value="steps">เวลารายขั้น / แบบประเมิน</TabsTrigger>
          <TabsTrigger value="participants">พฤติกรรมรายผู้เรียน</TabsTrigger>
          <TabsTrigger value="learning">บันทึกการเรียนรู้ (Learning Log)</TabsTrigger>
          <TabsTrigger value="activity">ลำดับกิจกรรม (Activity Log)</TabsTrigger>
        </TabsList>
        <TabsContent value="participants" className="space-y-4">
          <SectionHeader
            title="เปรียบเทียบพฤติกรรมรายผู้เรียน"
            description="หนึ่งแถวต่อผู้เข้าร่วม · จำนวนที่แสดงคือสิ่งที่พบในข้อมูล ไม่ใช้แต้มและ Level แทนพฤติกรรมการเรียน"
            onExport={() =>
              exportCsv("participants.csv", participantRows, RESEARCH_COLUMNS.participants)
            }
            disabled={invalidRange}
          />
          <ResearchTable
            rows={participantRows}
            columns={[
              { key: "participant_code", label: "ผู้เข้าร่วม", render: participantCell },
              { key: "observed_event_days", label: "วันที่พบกิจกรรม" },
              { key: "observed_event_count", label: "จำนวน event" },
              { key: "modules_with_start_event", label: "บทเรียนที่เปิด" },
              { key: "modules_with_completion_event", label: "บทเรียนที่พบ event จบ" },
              { key: "vr_session_count", label: "VR sessions" },
              { key: "vr_paired_overall_count", label: "คู่คะแนน VR" },
              { key: "observed_retry_event_count", label: "event ฝึกซ้ำ" },
              {
                key: "last_event_at_utc",
                label: "กิจกรรมล่าสุด",
                render: (r) => timeText(r.last_event_at_utc),
              },
              {
                key: "actions",
                label: "ดูรายละเอียด",
                render: (r) => (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFilters({
                        ...filters,
                        participant: codeToUid.get(String(r.participant_code)) ?? "",
                      });
                      setTab("learning");
                    }}
                  >
                    ดูการเรียนรู้
                  </Button>
                ),
              },
            ]}
          />
        </TabsContent>
        <TabsContent value="learning" className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Field label="หน่วยข้อมูล">
              <select
                className={controlClass}
                value={learningKind}
                onChange={(e) => setLearningKind(e.target.value)}
              >
                <option value="vr">การฝึก VR · หนึ่งแถวต่อ session</option>
                <option value="modules">บทเรียน · หนึ่งแถวต่อผู้เรียนและบทเรียน</option>
              </select>
            </Field>
            {learningKind === "vr" ? (
              <Field label="สถานการณ์">
                <select
                  className={controlClass}
                  value={scenario}
                  onChange={(e) => setScenario(e.target.value)}
                >
                  <option value="">ทุกสถานการณ์</option>
                  {scenarios.map((id) => (
                    <option key={id}>{id}</option>
                  ))}
                </select>
              </Field>
            ) : (
              <Field label="บทเรียน">
                <select
                  className={controlClass}
                  value={moduleId}
                  onChange={(e) => setModuleId(e.target.value)}
                >
                  <option value="">ทุกบทเรียน</option>
                  {moduleIds.map((id) => (
                    <option key={id}>{id}</option>
                  ))}
                </select>
              </Field>
            )}
          </div>
          {learningKind === "vr" ? (
            <>
              <SectionHeader
                title="ประวัติการฝึกและการสะท้อนคิด"
                description="ตรวจขั้นที่มีข้อมูล การฝึกซ้ำที่เชื่อม session ได้ และคะแนนก่อน–หลังฝึกของแต่ละรายการ"
                onExport={() => exportCsv("vr_sessions.csv", vrRows, vrColumns)}
                disabled={invalidRange}
              />
              <ResearchTable
                rows={vrRows}
                columns={[
                  { key: "participant_code", label: "ผู้เข้าร่วม", render: participantCell },
                  { key: "scenario_id", label: "สถานการณ์" },
                  { key: "attempt_index_in_loaded_history", label: "ลำดับ session" },
                  {
                    key: "started_at_utc",
                    label: "เริ่มเมื่อ",
                    render: (r) => timeText(r.started_at_utc),
                  },
                  { key: "recorded_stage_count", label: "ขั้นที่มีข้อมูล / 4" },
                  { key: "linked_retry_event_count", label: "event ฝึกซ้ำที่เชื่อมได้" },
                  { key: "round1_overall", label: "คะแนนรอบ 1" },
                  { key: "round2_overall", label: "คะแนนรอบ 2" },
                  { key: "delta_overall", label: "ผลต่าง" },
                  {
                    key: "detail",
                    label: "หลักฐานการเรียนรู้",
                    render: (r) => (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedSession(String(r.session_id))}
                      >
                        ดูรายละเอียด
                      </Button>
                    ),
                  },
                ]}
              />
            </>
          ) : (
            <>
              <SectionHeader
                title="การเปิดบทเรียนและการกลับมาเรียน"
                description="ไม่จับคู่เริ่ม–จบเป็น attempt เพราะ event เดิมไม่มี run ID · เวลาเรียนจริงยังไม่ได้เก็บ"
                onExport={() => exportCsv("module_logs.csv", moduleRows, RESEARCH_COLUMNS.modules)}
                disabled={invalidRange}
              />
              <ResearchTable
                rows={moduleRows}
                columns={[
                  { key: "participant_code", label: "ผู้เข้าร่วม", render: participantCell },
                  { key: "module_id", label: "บทเรียน" },
                  { key: "observed_start_count", label: "event เปิดบทเรียน" },
                  { key: "observed_completion_count", label: "event จบบทเรียน" },
                  { key: "observed_reopen_after_completion_count", label: "เปิดหลังพบ event จบ" },
                  {
                    key: "first_start_at_utc",
                    label: "เริ่มครั้งแรกในช่วง",
                    render: (r) => timeText(r.first_start_at_utc),
                  },
                  {
                    key: "last_completion_at_utc",
                    label: "event จบล่าสุดในช่วง",
                    render: (r) => timeText(r.last_completion_at_utc),
                  },
                ]}
              />
            </>
          )}
        </TabsContent>
        <TabsContent value="activity" className="space-y-4">
          <SectionHeader
            title="ลำดับเหตุการณ์ที่บันทึกได้"
            description="เรียงตามเวลาจากเก่าไปใหม่ · ลำดับและระยะห่างคำนวณจากประวัติของผู้เรียนก่อนกรอง ไม่ใช่เวลาเรียน"
            onExport={() =>
              exportCsv("activity_events.csv", activityRows, RESEARCH_COLUMNS.activity)
            }
            disabled={invalidRange}
          />
          <Field label="ชนิดกิจกรรม">
            <select
              className={`${controlClass} max-w-md`}
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
            >
              <option value="">ทุกกิจกรรม</option>
              {eventTypes.map((type) => (
                <option key={type} value={type}>
                  {ACTIVITY_EVENT_LABELS[type] ?? type}
                </option>
              ))}
            </select>
          </Field>
          {(!eventType || eventType === "video_observation") && (
            <>
              <SectionHeader
                title="สรุปการเปิดวิดีโอ"
                description="หนึ่งแถวต่อการเปิดตัวเล่นหนึ่งครั้ง รวมช่วงเล่น–หยุดในรอบเดียวกัน เฉพาะข้อมูลในตัวกรอง ไม่ใช่จำนวนครั้งที่ดูครบ"
                onExport={() => exportCsv("video_visits.csv", videoRows, VIDEO_SUMMARY_COLUMNS)}
                disabled={invalidRange}
              />
              <ResearchTable
                rows={videoRows}
                columns={[
                  { key: "participant_code", label: "ผู้เรียน", render: participantCell },
                  { key: "module_id", label: "บทเรียน" },
                  { key: "video_id", label: "วิดีโอ" },
                  {
                    key: "video_is_test",
                    label: "เนื้อหาทดสอบ",
                    render: (r) =>
                      r.video_is_test === true
                        ? "ทดสอบ"
                        : r.video_is_test === false
                          ? "เนื้อหาจริง"
                          : "—",
                  },
                  {
                    key: "first_observed_at_utc",
                    label: "พบครั้งแรก",
                    render: (r) => timeText(r.first_observed_at_utc),
                  },
                  {
                    key: "last_observed_at_utc",
                    label: "ข้อมูลล่าสุด",
                    render: (r) => timeText(r.last_observed_at_utc),
                  },
                  { key: "video_playback_seconds", label: "เวลาเล่นรวม (วินาที)" },
                  { key: "video_visible_playback_seconds", label: "เล่นขณะมองเห็น (วินาที)" },
                  {
                    key: "reached_end",
                    label: "ถึงท้ายคลิป",
                    render: (r) => (r.reached_end ? "พบเหตุการณ์ถึงท้าย" : "ยังไม่พบ"),
                  },
                  {
                    key: "exit_observed",
                    label: "ออกจากตัวเล่น",
                    render: (r) => (r.exit_observed ? "พบเหตุการณ์ออก" : "ยังไม่พบ"),
                  },
                  { key: "error_count", label: "ข้อผิดพลาด" },
                ]}
              />
              <p className="text-xs text-slate-text">
                เวลาเป็นผลรวมช่วงที่บันทึกได้ อาจไม่ครบหากปิดโปรแกรมทันทีหรือกรองเฉพาะบางวัน
                การถึงท้ายคลิปไม่ยืนยันว่าดูครบทุกช่วง CSV ด้านบนสุดและ JSON
                ยังเก็บเหตุการณ์ต้นทางทั้งหมด
              </p>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={showVideoDetails}
                  onChange={(e) => setShowVideoDetails(e.target.checked)}
                />
                แสดงรายละเอียดวิดีโอทุกเหตุการณ์ (สำหรับตรวจสอบ)
              </label>
            </>
          )}
          {(eventType !== "video_observation" || showVideoDetails) && (
            <ResearchTable
              rows={displayedActivityRows}
              columns={[
                { key: "participant_code", label: "ผู้เข้าร่วม", render: participantCell },
                { key: "sequence_in_loaded_history", label: "ลำดับของผู้เรียน" },
                {
                  key: "recorded_at_utc",
                  label: "เวลาที่ server รับ (ไทย)",
                  render: (r) => timeText(r.recorded_at_utc),
                },
                {
                  key: "occurred_at_utc",
                  label: "เวลาเกิดที่ client (ไทย)",
                  render: (r) => timeText(r.occurred_at_utc),
                },
                { key: "web_session_id", label: "Web session" },
                { key: "path", label: "หน้าเว็บ" },
                { key: "elapsed_seconds", label: "ระยะเวลาช่วง (วินาที)" },
                {
                  key: "event_type",
                  label: "กิจกรรม",
                  render: (r) => (
                    <div>
                      {ACTIVITY_EVENT_LABELS[r.event_type as keyof typeof ACTIVITY_EVENT_LABELS] ??
                        r.event_type}
                      <div className="mt-1 font-mono text-xs text-slate-text">{r.event_id}</div>
                    </div>
                  ),
                },
                {
                  key: "content",
                  label: "บทเรียน / สถานการณ์",
                  render: (r) => valueText(r.module_id ?? r.scenario_id),
                },
                {
                  key: "gap_from_previous_event_seconds",
                  label: "ห่างจาก event ก่อนหน้า (วินาที)",
                },
                { key: "video_id", label: "YouTube Video ID" },
                { key: "video_is_test", label: "วิดีโอทดสอบ" },
                { key: "reason", label: "เหตุการณ์ย่อย" },
                {
                  key: "video_player_state",
                  label: "สถานะวิดีโอ",
                  render: (r) =>
                    r.video_player_state == null
                      ? "—"
                      : ({
                          "-1": "ยังไม่เริ่ม / ผิดพลาด",
                          "0": "สิ้นสุด",
                          "1": "กำลังเล่น",
                          "2": "หยุดพัก",
                          "3": "กำลังโหลด",
                          "5": "พร้อมเล่น",
                        }[String(r.video_player_state)] ?? String(r.video_player_state)),
                },
                { key: "video_playback_seconds", label: "เล่นในช่วงนี้ (วินาที)" },
                { key: "video_visible_playback_seconds", label: "เล่นขณะมองเห็น (วินาที)" },
                { key: "video_position_seconds", label: "ตำแหน่งในวิดีโอ (วินาที)" },
                {
                  key: "session_link_status",
                  label: "การเชื่อมกับ VR",
                  render: (r) => (
                    <div>
                      {statusLabels[String(r.session_link_status)]}
                      <div
                        className="mt-1 max-w-44 truncate font-mono text-xs text-slate-text"
                        title={String(r.session_id ?? "")}
                      >
                        {r.session_id}
                      </div>
                    </div>
                  ),
                },
              ]}
            />
          )}
        </TabsContent>
        <TabsContent value="web" className="space-y-4">
          <SectionHeader
            title="การใช้งานเว็บแยก session"
            description="หนึ่งแถวต่อ session ของเอกสารหรือแท็บ · เทียบช่วง heartbeat ตามนาฬิกาเครื่อง ไม่ยืนยันจำนวนอุปกรณ์จริง"
            onExport={() => exportCsv("web_sessions.csv", webRows, RESEARCH_COLUMNS.web)}
            disabled={invalidRange}
          />
          <ResearchTable
            rows={webRows}
            columns={[
              { key: "participant_code", label: "ผู้เรียน", render: participantCell },
              { key: "web_session_id", label: "Web session" },
              { key: "browser_id", label: "รหัสเบราว์เซอร์" },
              { key: "device_category", label: "ประเภทอุปกรณ์ (ประมาณ)" },
              { key: "browser_family", label: "เบราว์เซอร์" },
              {
                key: "first_observed_at_utc",
                label: "พบครั้งแรก",
                render: (r) => timeText(r.first_observed_at_utc),
              },
              {
                key: "last_observed_at_utc",
                label: "พบล่าสุด",
                render: (r) => timeText(r.last_observed_at_utc),
              },
              { key: "visible_seconds", label: "แท็บมองเห็น (วินาที)" },
              { key: "active_proxy_seconds", label: "ปฏิสัมพันธ์ล่าสุด (วินาที)" },
              { key: "overlapping_web_session_count", label: "Session ที่มีช่วงซ้อน" },
              { key: "overlapping_other_browser_count", label: "เบราว์เซอร์อื่นที่มีช่วงซ้อน" },
              { key: "end_event_present", label: "พบ event สิ้นสุด" },
            ]}
          />
        </TabsContent>
        <TabsContent value="steps" className="space-y-4">
          <SectionHeader
            title="เวลาแต่ละครั้งที่เข้าขั้นการเรียน"
            description="แยก run และการเข้าขั้นแต่ละครั้ง รวมแบบประเมิน · ไม่มี event จบจะแสดงเวลาว่าง ไม่ประมาณเติม"
            onExport={() => exportCsv("learning_steps.csv", stepRows, RESEARCH_COLUMNS.steps)}
            disabled={invalidRange}
          />
          <ResearchTable
            rows={stepRows}
            columns={[
              { key: "participant_code", label: "ผู้เรียน", render: participantCell },
              {
                key: "run_id",
                label: "Run / Attempt",
                render: (r) => (
                  <span
                    className="whitespace-nowrap font-mono text-xs"
                    title={String(r.run_id ?? "")}
                  >
                    {typeof r.run_id === "string" ? `${r.run_id.slice(0, 8)}…` : "—"}
                  </span>
                ),
              },
              { key: "step_id", label: "ขั้น" },
              { key: "module_id", label: "บทเรียน" },
              { key: "scenario_id", label: "Scenario" },
              { key: "assessment_id", label: "แบบประเมิน" },
              {
                key: "started_at_client_utc",
                label: "เริ่ม",
                render: (r) => (
                  <span className="whitespace-nowrap">{timeText(r.started_at_client_utc)}</span>
                ),
              },
              {
                key: "ended_at_client_utc",
                label: "สิ้นสุด",
                render: (r) => (
                  <span className="whitespace-nowrap">{timeText(r.ended_at_client_utc)}</span>
                ),
              },
              { key: "elapsed_seconds", label: "เวลารวม (วินาที)" },
              { key: "visible_seconds", label: "แท็บมองเห็น (วินาที)" },
              { key: "active_proxy_seconds", label: "ปฏิสัมพันธ์ล่าสุด (วินาที)" },
              {
                key: "end_reason",
                label: "สาเหตุสิ้นสุดช่วง",
                render: (r) => (
                  <div>
                    {valueText(r.end_reason)}
                    {typeof r.elapsed_seconds === "number" &&
                      r.elapsed_seconds < 0.01 &&
                      r.end_reason === "step_changed_or_unmounted" && (
                        <p className="mt-1 text-xs text-amber-700">
                          ช่วงสั้นมาก อาจเป็นข้อมูลจากการทดสอบหน้าเดิม ควรตรวจสอบ
                        </p>
                      )}
                  </div>
                ),
              },
            ]}
          />
          <p className="text-xs text-slate-text">
            แสดงวินาทีทศนิยม 2 ตำแหน่ง · ค่าบวกต่ำกว่า 0.01 แสดง &lt;0.01 ·
            แต่ละแถวคือการเข้าขั้นหนึ่งครั้ง ไม่ใช่เวลารวมทั้งบทเรียน
            ข้อมูลเก่าไม่ถูกลบหรือปรับระยะเวลาย้อนหลัง
          </p>
        </TabsContent>
      </Tabs>

      <section className="space-y-4 rounded-2xl border border-border bg-background p-5">
        <div>
          <h2 className="font-bold text-slate-deep">ส่งออกชุดข้อมูลสำหรับวิเคราะห์</h2>
          <p className="mt-1 text-sm text-slate-text">
            ทุกไฟล์ใช้รหัสผู้เข้าร่วมเดียวกัน ไม่ใส่ชื่อ อีเมล หรือ UID · CSV
            ส่งออกทุกแถวที่ผ่านตัวกรอง รวมหน้าที่ไม่ได้เปิดอยู่
          </p>
        </div>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={includeText}
            onChange={(e) => setIncludeText(e.target.checked)}
            className="mt-1"
          />
          <span>
            รวม transcript และข้อความสะท้อนคิดในไฟล์ VR/JSON{" "}
            <span className="block text-xs text-slate-text">
              สำหรับวิเคราะห์เชิงคุณภาพ ข้อความอาจมีข้อมูลระบุตัวบุคคล
            </span>
          </span>
        </label>
        <div className="flex flex-wrap gap-3">
          <Button onClick={exportBundle} disabled={invalidRange}>
            <Download className="mr-2 h-4 w-4" />
            ชุดข้อมูลพร้อมคำอธิบาย (JSON)
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              exportCsv("research_codebook.csv", researchCodebook(includeText), [
                "dataset",
                "field",
                "definition",
                "missing_value",
              ])
            }
          >
            คำอธิบายตัวแปร (CSV)
          </Button>
          <Button
            variant="outline"
            disabled={invalidRange}
            onClick={() =>
              download(
                "research_metadata.json",
                JSON.stringify(metadata(), null, 2),
                "application/json;charset=utf-8;",
              )
            }
          >
            เงื่อนไขและวิธีคำนวณ (JSON)
          </Button>
        </div>
        <p className="text-xs text-slate-text">
          ช่องว่างใน CSV / null ใน JSON = ไม่มีข้อมูล · ค่า 0 = พบเป็นศูนย์ตามนิยามตัวแปร · คะแนน VR
          และคะแนนก่อน–หลังเรียนเป็นคนละเกณฑ์
        </p>
      </section>

      <details className="rounded-2xl border border-border bg-background p-5">
        <summary className="cursor-pointer font-semibold text-slate-deep">
          ความครบถ้วนของข้อมูลและข้อจำกัดในการตีความ
        </summary>
        <p className="mt-4 text-sm text-slate-text">
          ข้อมูลทั้งหมดที่โหลด: {data.users.length} users · {data.sessions.length} sessions ·{" "}
          {data.events.length} events · พบเวลาที่อ่านไม่ได้ {missingTimes} รายการ
          (ไม่รวมในช่วงวันที่เมื่อใช้ตัวกรอง)
        </p>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-text">
          {RESEARCH_NOTES.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </details>

      <Dialog
        open={Boolean(currentSession)}
        onOpenChange={(open) => {
          if (!open) setSelectedSession(null);
        }}
      >
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>หลักฐานการเรียนรู้ราย session</DialogTitle>
            <DialogDescription>
              {currentSession &&
                `${data.codes[currentSession.userId]} · ${currentSession.scenarioId} · ${currentSession.id}`}
            </DialogDescription>
          </DialogHeader>
          {currentSession && (
            <div className="space-y-5 text-sm">
              <p className="text-slate-text">
                {statusLabels[String(currentSessionRow?.record_status)]} · มี event จบที่เชื่อมได้{" "}
                {valueText(currentSessionRow?.completion_event_count)} รายการ
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {[currentSession.stage1, currentSession.stage4].map((stage, i) => (
                  <section key={i} className="space-y-2 rounded-xl bg-secondary p-4">
                    <h3 className="font-bold">Feedback รอบที่ {i + 1}</h3>
                    <p className="text-xs text-slate-text">
                      เวลาบันทึก {stage?.durationSeconds ?? "—"} วินาที · บันทึกขั้นเสร็จ{" "}
                      {timeText(stage?.completedAt)}
                    </p>
                    <p className="whitespace-pre-wrap">
                      {stage?.transcript || "ไม่พบข้อความที่บันทึก"}
                    </p>
                  </section>
                ))}
              </div>
              <section className="space-y-2">
                <h3 className="font-bold">การสะท้อนคิดด้วยตนเอง</h3>
                <p className="whitespace-pre-wrap">
                  จุดที่ทำได้ดี: {currentSession.stage2?.bestPart || "—"}
                </p>
                <p className="whitespace-pre-wrap">
                  เป้าหมายส่วนตัว: {currentSession.stage2?.personalGoal || "—"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: 8 }, (_, i) => (
                    <span key={i} className="rounded-lg border border-border px-2 py-1">
                      ข้อ {i + 1}: {valueText(currentSessionRow?.[`self_rating_${i + 1}`])}
                    </span>
                  ))}
                </div>
              </section>
              <section className="space-y-2">
                <h3 className="font-bold">เป้าหมายสำหรับการฝึกรอบสอง</h3>
                <p>{currentSession.stage3?.selectedGoals?.join(" · ") || "—"}</p>
                <p>{currentSession.stage3?.customGoal || "—"}</p>
              </section>
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-2">เกณฑ์ VR</th>
                    <th>รอบ 1</th>
                    <th>รอบ 2</th>
                    <th>ผลต่าง</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    "speechClarity",
                    "linguisticAppropriateness",
                    "balance",
                    "intentConsistency",
                    "overall",
                  ].map((k) => (
                    <tr key={k} className="border-b border-border">
                      <td className="py-2">
                        {
                          (
                            {
                              speechClarity: "ความชัดเจนของถ้อยคำ",
                              linguisticAppropriateness: "ความเหมาะสมของภาษา",
                              balance: "สมดุลคำชมและข้อเสนอแนะ",
                              intentConsistency: "ความสอดคล้องกับเจตนา",
                              overall: "คะแนนรวม",
                            } as Record<string, string>
                          )[k]
                        }
                      </td>
                      <td>{valueText(currentSessionRow?.[`round1_${k}`])}</td>
                      <td>{valueText(currentSessionRow?.[`round2_${k}`])}</td>
                      <td>{valueText(currentSessionRow?.[`delta_${k}`])}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Link
                to="/admin/$userId"
                params={{ userId: currentSession.userId }}
                className="inline-block font-medium text-mint-primary hover:underline"
              >
                เปิดประวัติทั้งหมดของผู้เรียน
              </Link>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-2 text-xs font-medium text-slate-text">
      <span>{label}</span>
      {children}
    </label>
  );
}
function Metric({
  icon,
  label,
  value,
  detail,
}: {
  icon: ReactNode;
  label: string;
  value: number | string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background p-5">
      <div className="mb-3 flex items-center gap-2 text-sm text-slate-text">
        <span className="text-mint-primary">{icon}</span>
        {label}
      </div>
      <div className="text-3xl font-semibold text-slate-deep">{value}</div>
      <p className="mt-2 text-xs text-slate-text">{detail}</p>
    </div>
  );
}
function SectionHeader({
  title,
  description,
  onExport,
  disabled,
}: {
  title: string;
  description: string;
  onExport: () => void;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 pt-3">
      <div>
        <h2 className="font-bold text-slate-deep">{title}</h2>
        <p className="mt-1 max-w-3xl text-sm text-slate-text">{description}</p>
      </div>
      <Button variant="outline" onClick={onExport} disabled={disabled}>
        <Download className="mr-2 h-4 w-4" />
        ส่งออกตาราง CSV
      </Button>
    </div>
  );
}

interface Column {
  key: string;
  label: string;
  render?: (row: ResearchRow) => ReactNode;
}
function ResearchTable({ rows, columns }: { rows: ResearchRow[]; columns: Column[] }) {
  const [page, setPage] = useState(0);
  const [previousRows, setPreviousRows] = useState(rows);
  // Reset pagination for a changed filter/data snapshot without a stale page
  // render. Callers memoize neither display arrays nor JSX, so compare row IDs.
  const identity = (items: ResearchRow[]) => JSON.stringify(items.map(researchRowKey));
  if (previousRows !== rows && identity(previousRows) !== identity(rows)) {
    setPreviousRows(rows);
    setPage(0);
  }
  const pageCount = Math.max(1, Math.ceil(rows.length / 25));
  const currentPage = Math.min(page, pageCount - 1);
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-background">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-secondary text-xs text-slate-text">
            <tr>
              {columns.map((c) => (
                <th key={c.key} scope="col" className="whitespace-nowrap px-4 py-3">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(currentPage * 25, currentPage * 25 + 25).map((row) => (
              <tr
                key={researchRowKey(row)}
                className="border-t border-border align-top hover:bg-secondary/40"
              >
                {columns.map((c) => (
                  <td key={c.key} className="px-4 py-4">
                    {c.render
                      ? c.render(row)
                      : c.key.endsWith("_seconds")
                        ? formatResearchSeconds(row[c.key])
                        : valueText(row[c.key])}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-5 py-12 text-center text-slate-text">
                  ไม่พบข้อมูลตามตัวกรองที่เลือก
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-xs text-slate-text">
        <span>
          {rows.length} รายการ · หน้า {currentPage + 1} / {pageCount} · 25 รายการต่อหน้า
        </span>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={currentPage === 0}
            onClick={() => setPage(currentPage - 1)}
          >
            ก่อนหน้า
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={currentPage + 1 >= pageCount}
            onClick={() => setPage(currentPage + 1)}
          >
            ถัดไป
          </Button>
        </div>
      </div>
    </div>
  );
}
