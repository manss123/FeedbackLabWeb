import { useMemo } from "react";
import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { ArrowRight, Users, Headset, ClipboardCheck, Activity } from "lucide-react";
import { Button } from "./ui/button";
import { monitoringSummary } from "@/lib/admin-monitoring";
import type { ResearchRow } from "@/lib/research-log";

type Props = {
  events: ResearchRow[];
  modules: ResearchRow[];
  vr: ResearchRow[];
  participants: ResearchRow[];
  assessments: ResearchRow[];
  complete: boolean;
  name: (code: string) => string;
  openDetails: (tab: string) => void;
};
const panel = "min-w-0 rounded-2xl border border-border/60 bg-card p-5 sm:p-8";
const tones = [
  "border-monitor-teal/50 text-monitor-teal",
  "border-monitor-blue/50 text-monitor-blue",
  "border-monitor-violet/50 text-monitor-violet",
  "border-monitor-amber/50 text-monitor-amber",
];
const tooltipStyle = {
  background: "var(--background)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "var(--foreground)",
};
export function AdminMonitoring({
  events,
  modules,
  vr,
  participants,
  assessments,
  complete,
  name,
  openDetails,
}: Props) {
  const summary = useMemo(() => monitoringSummary(events, modules, vr), [events, modules, vr]);
  const assessed = new Set(
    assessments.filter((r) => r.assessment_phase === "posttest").map((r) => r.participant_code),
  ).size;
  const recent = [...participants]
    .filter((r) => typeof r.last_event_at_utc === "string")
    .sort((a, b) => String(b.last_event_at_utc).localeCompare(String(a.last_event_at_utc)))
    .slice(0, 6);
  const metrics = [
    { label: "ผู้เรียนที่พบกิจกรรม", value: summary.observedLearners, unit: "คน", icon: Users },
    { label: "การฝึก VR", value: vr.length, unit: "รอบฝึก", icon: Headset },
    { label: "มีคะแนน VR ครบสองรอบ", value: summary.paired, unit: "รอบฝึก", icon: Activity },
    { label: "ส่ง Post-test ในช่วงนี้", value: assessed, unit: "คน", icon: ClipboardCheck },
  ];
  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-text">
        {complete
          ? "ภาพรวมตามช่วงวันที่และผู้เรียนที่เลือก"
          : "ภาพรวมชั่วคราว · คำนวณจากข้อมูลที่โหลดแล้วเท่านั้น"}{" "}
        · ไม่ใช่สถานะออนไลน์แบบเรียลไทม์
      </p>
      <dl className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        {metrics.map(({ label, value, unit, icon: Icon }, index) => (
          <div
            key={label}
            className={`rounded-2xl border border-t-4 bg-card p-5 sm:p-6 ${tones[index]}`}
          >
            <dt className="flex items-center gap-2 text-sm font-medium">
              <Icon className="size-5 shrink-0" />
              {label}
            </dt>
            <dd className="mt-5 text-4xl font-semibold tabular-nums sm:text-5xl">
              {value}
              <span className="ml-2 text-sm font-normal text-slate-text">{unit}</span>
            </dd>
          </div>
        ))}
      </dl>
      <div className="grid gap-6">
        <section className={panel}>
          <h2 className="text-xl font-semibold">การเข้าใช้งานตามวัน</h2>
          <p className="mt-1 text-sm text-slate-text">
            ผู้เรียนไม่ซ้ำต่อวัน · แสดงเฉพาะวันที่พบกิจกรรม (เวลาไทย)
          </p>
          {summary.activity.length ? (
            <>
              <div
                className="mt-6 h-80 sm:h-96"
                role="img"
                aria-label="กราฟแท่งจำนวนผู้เรียนที่พบกิจกรรมต่อวัน"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={summary.activity}>
                    <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 5" />
                    <XAxis
                      dataKey="day"
                      tickFormatter={(s) => String(s).slice(5)}
                      axisLine={false}
                      tickLine={false}
                      tickMargin={12}
                      tick={{ fontSize: 13, fill: "var(--muted-foreground)" }}
                    />
                    <YAxis
                      allowDecimals={false}
                      width={40}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "var(--muted-foreground)", fontSize: 13 }}
                    />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar
                      dataKey="learners"
                      name="ผู้เรียน (คน)"
                      fill="var(--monitor-blue)"
                      maxBarSize={64}
                      radius={[8, 8, 0, 0]}
                      isAnimationActive={false}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <details className="mt-2 text-sm">
                <summary className="cursor-pointer underline underline-offset-4">
                  อ่านตัวเลขรายวัน
                </summary>
                <div className="mt-3 max-h-48 overflow-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr>
                        <th>วันที่</th>
                        <th>ผู้เรียน (คน)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.activity.map((r) => (
                        <tr key={r.day}>
                          <td className="py-1">{r.day}</td>
                          <td>{r.learners}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </>
          ) : (
            <Empty text="ยังไม่พบกิจกรรมในข้อมูลที่เลือก" />
          )}
        </section>
        <section className={panel}>
          <h2 className="text-xl font-semibold">การเรียนแต่ละบท</h2>
          <p className="mt-1 text-sm text-slate-text">
            จำนวนผู้เรียนที่พบเหตุการณ์เริ่ม / จบในช่วงนี้ นับแต่ละประเภทแยกกัน
          </p>
          {modules.length ? (
            <>
              <div
                className="mt-6 h-80 sm:h-96"
                role="img"
                aria-label="กราฟผู้เรียนที่เริ่มและจบแต่ละบท"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={summary.learning}>
                    <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 5" />
                    <XAxis
                      dataKey="module"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 14 }}
                    />
                    <YAxis
                      allowDecimals={false}
                      width={40}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "var(--muted-foreground)", fontSize: 13 }}
                    />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend />
                    <Bar
                      dataKey="started"
                      name="เริ่มบทเรียน (คน)"
                      fill="var(--monitor-blue)"
                      radius={[8, 8, 0, 0]}
                      isAnimationActive={false}
                    />
                    <Bar
                      dataKey="completed"
                      name="พบบทเรียนจบ (คน)"
                      fill="var(--monitor-teal)"
                      radius={[8, 8, 0, 0]}
                      isAnimationActive={false}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <details className="mt-2 text-sm">
                <summary className="cursor-pointer underline underline-offset-4">
                  อ่านตัวเลขรายบท
                </summary>
                <table className="mt-3 w-full text-left">
                  <thead>
                    <tr>
                      <th>บท</th>
                      <th>เริ่ม</th>
                      <th>จบ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.learning.map((r) => (
                      <tr key={r.module}>
                        <td>{r.module}</td>
                        <td>{r.started}</td>
                        <td>{r.completed}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            </>
          ) : (
            <Empty text="ยังไม่พบข้อมูลการเรียนในช่วงที่เลือก" />
          )}
        </section>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className={panel}>
          <h2 className="text-xl font-semibold">ผลการฝึก VR ก่อน–หลัง</h2>
          <p className="mt-1 text-sm text-slate-text">
            ค่าเฉลี่ยเฉพาะรอบฝึกที่มีคะแนนทั้งสองครั้ง · {summary.paired} รอบฝึก
          </p>
          {summary.scores.length ? (
            <div className="mt-8 space-y-8">
              {summary.scores.map((r) => (
                <div key={r.round}>
                  <div className="mb-2 flex justify-between text-sm">
                    <span>{r.round}</span>
                    <strong>{r.score.toFixed(1)} / 100</strong>
                  </div>
                  <div className="h-5 overflow-hidden rounded-full bg-secondary">
                    <div
                      className={`h-full ${r.round === "รอบแรก" ? "bg-monitor-amber" : "bg-monitor-teal"}`}
                      style={{ width: `${r.score}%` }}
                    />
                  </div>
                </div>
              ))}
              <p className="text-xs text-slate-text">
                หน่วยเป็นรอบฝึก ผู้เรียนหนึ่งคนอาจมีหลายรอบ · ไม่ใช่คะแนน Pre-test/Post-test
              </p>
            </div>
          ) : (
            <Empty text="ยังไม่มีคู่คะแนนจริงสำหรับเปรียบเทียบ" />
          )}
          <Button
            variant="link"
            className="mt-3 min-h-11 px-0 underline"
            onClick={() => openDetails("learning")}
          >
            ดูรอบฝึกและผลวิเคราะห์ <ArrowRight className="size-4" />
          </Button>
        </section>
        <section className={panel}>
          <h2 className="text-xl font-semibold">ข้อมูลที่ควรตรวจสอบ</h2>
          <p className="mt-1 text-sm text-slate-text">
            ใช้ตรวจความครบถ้วนของข้อมูล ไม่ใช่การตัดสินผลผู้เรียน
          </p>
          <div className="mt-5 flex items-center justify-between gap-4 border-l-4 border-monitor-amber bg-card p-5">
            <div>
              <p>รอบฝึกที่ยังไม่มีคะแนนครบสองรอบ</p>
              <p className="mt-1 text-sm text-slate-text">อาจยังฝึกไม่จบหรือ AI ยังไม่มีผล</p>
            </div>
            <strong className="text-2xl">{summary.incompleteScores}</strong>
          </div>
          <Button
            variant="link"
            className="min-h-11 px-0 underline"
            onClick={() => openDetails("learning")}
          >
            ตรวจรายละเอียดรอบฝึก <ArrowRight className="size-4" />
          </Button>
        </section>
      </div>
      <section className="min-w-0 rounded-2xl border border-border/60 bg-card p-5 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">ผู้เรียนที่มีกิจกรรมล่าสุด</h2>
          <Button
            variant="link"
            className="min-h-11 px-0 underline"
            onClick={() => openDetails("participants")}
          >
            ดูผู้เรียนทั้งหมด <ArrowRight className="size-4" />
          </Button>
        </div>
        {recent.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-slate-text">
                <tr>
                  <th className="py-3">ผู้เรียน</th>
                  <th>กิจกรรมล่าสุด (ไทย)</th>
                  <th className="text-right">รอบฝึก VR ในช่วงนี้</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={String(r.participant_code)} className="border-b border-border">
                    <td className="py-4 pr-3">{name(String(r.participant_code))}</td>
                    <td>
                      {new Date(String(r.last_event_at_utc)).toLocaleString("th-TH", {
                        timeZone: "Asia/Bangkok",
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="text-right">{String(r.vr_session_count)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty text="ยังไม่พบผู้เรียนที่มีกิจกรรมในข้อมูลที่เลือก" />
        )}
      </section>
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <p className="mt-6 flex min-h-64 items-center justify-center rounded-xl bg-secondary/50 px-8 text-center text-base text-muted-foreground">
      {text}
    </p>
  );
}
