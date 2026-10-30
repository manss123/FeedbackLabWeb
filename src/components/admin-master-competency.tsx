import { useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AdminSessionRow } from "@/lib/admin.functions";
import {
  competencyAttempts,
  CROSSWALK_SCENARIOS,
  CROSSWALK_VERSION,
  MASTER_COMPETENCIES,
  RADAR_COMPETENCIES,
  scoreCompetency,
  type CrosswalkScenario,
} from "@/lib/master-competency";

const colors = ["#059669", "#2563eb", "#d97706", "#9333ea", "#db2777"];
const shortLabels = ["Evidence", "Next step", "Supportive", "Structure", "Growth"];
const display = (score: number | null) => (score === null ? "—" : score.toFixed(2));
const date = (value?: string | null) =>
  value && Number.isFinite(Date.parse(value))
    ? new Date(value).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })
    : "ไม่ระบุเวลา";

export function AdminMasterCompetency({ sessions }: { sessions: AdminSessionRow[] }) {
  const [selected, setSelected] = useState<Partial<Record<CrosswalkScenario, string>>>({});
  const [detailScenario, setDetailScenario] = useState<CrosswalkScenario>("s1");
  const attempts = Object.fromEntries(
    CROSSWALK_SCENARIOS.map((s) => [s, competencyAttempts(sessions, s)]),
  ) as Record<CrosswalkScenario, AdminSessionRow[]>;
  const chosen = Object.fromEntries(
    CROSSWALK_SCENARIOS.map((s) => [
      s,
      attempts[s].find((a) => a.id === selected[s]) ?? attempts[s][0],
    ]),
  ) as Record<CrosswalkScenario, AdminSessionRow | undefined>;
  const radarScenarios = CROSSWALK_SCENARIOS.filter((s) =>
    RADAR_COMPETENCIES.every((c) => scoreCompetency(c, s, chosen[s]).score !== null),
  );
  const radarData = RADAR_COMPETENCIES.map((c, i) => ({
    label: shortLabels[i],
    ...Object.fromEntries(
      CROSSWALK_SCENARIOS.map((s) => [s, scoreCompetency(c, s, chosen[s]).score]),
    ),
  }));
  const progression = CROSSWALK_SCENARIOS.map((s) => ({
    scenario: s.toUpperCase(),
    ...Object.fromEntries(
      RADAR_COMPETENCIES.map((c) => [c.id, scoreCompetency(c, s, chosen[s]).score]),
    ),
  }));
  const detail = chosen[detailScenario];

  return (
    <section className="space-y-5 rounded-2xl border border-border bg-white p-4 sm:p-6">
      <header className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
          Master Competency · S1–S5
        </p>
        <h2 className="text-xl font-bold">ภาพรวมสมรรถนะการให้ Feedback</h2>
        <p className="text-sm text-slate-text">
          ใช้คะแนน AI รายเกณฑ์จากรอบที่ 1 ของแต่ละสถานการณ์ เลือกผลที่บันทึกล่าสุดให้อัตโนมัติ
          และเปลี่ยนครั้งที่ต้องการดูได้
        </p>
      </header>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {CROSSWALK_SCENARIOS.map((s) => (
          <label key={s} className="min-w-0 space-y-1 text-sm font-semibold">
            {s.toUpperCase()}
            <select
              className="w-full rounded-lg border border-border bg-white p-2 text-xs font-normal"
              value={chosen[s]?.id ?? ""}
              onChange={(e) => setSelected({ ...selected, [s]: e.target.value })}
            >
              {!attempts[s].length && <option value="">ยังไม่มีคะแนนรายเกณฑ์</option>}
              {attempts[s].map((a) => (
                <option key={a.id} value={a.id}>
                  {date(a.stage3?.completedAt)} · {a.id.slice(-6)}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <p className="rounded-xl bg-slate-50 p-3 text-sm leading-relaxed text-slate-text">
        คะแนนเต็ม 5 ใช้ค่าเฉลี่ยน้ำหนักเท่ากันของเกณฑ์ที่เชื่อมโยง และคำนวณเมื่อมีคะแนนครบเท่านั้น
        ไม่ใช้คะแนนประเมินตนเองหรือคะแนนรวม 4 มิติแทนคะแนนรายข้อ
        ข้อมูลเก่าที่ไม่มีเกณฑ์เวอร์ชันปัจจุบันจะแสดงว่าไม่มีข้อมูล ไม่แทนด้วยศูนย์
      </p>
      <div className="grid gap-5 xl:grid-cols-2">
        <div className="min-w-0 rounded-xl border border-border p-3">
          <h3 className="font-bold">Radar สมรรถนะหลัก</h3>
          {radarScenarios.length ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} outerRadius="62%">
                  <PolarGrid />
                  <PolarAngleAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis domain={[0, 5]} tickCount={6} />
                  <Tooltip />
                  <Legend />
                  {radarScenarios.map((s) => (
                    <Radar
                      key={s}
                      name={s.toUpperCase()}
                      dataKey={s}
                      stroke={colors[CROSSWALK_SCENARIOS.indexOf(s)]}
                      fill={colors[CROSSWALK_SCENARIOS.indexOf(s)]}
                      fillOpacity={0.08}
                      isAnimationActive={false}
                    />
                  ))}
                </RadarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="flex h-80 items-center justify-center text-center text-sm text-slate-text">
              ยังไม่มีสถานการณ์ที่มีคะแนนครบทั้ง 5 มิติ
            </p>
          )}
          <p className="text-xs text-slate-text">
            แสดงเฉพาะสถานการณ์ที่ครบ 5 มิติ งด Communication Delivery ตามขอบเขตการประเมินจากข้อความ
          </p>
        </div>
        <div className="min-w-0 rounded-xl border border-border p-3">
          <h3 className="font-bold">เปรียบเทียบคะแนนระหว่าง S1–S5</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={progression} margin={{ top: 20, right: 12, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="scenario" />
                <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} />
                <Tooltip />
                <Legend />
                {RADAR_COMPETENCIES.map((c, i) => (
                  <Line
                    key={c.id}
                    dataKey={c.id}
                    name={shortLabels[i]}
                    stroke={colors[i]}
                    connectNulls={false}
                    dot={{ r: 4 }}
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-slate-text">
            เส้นเว้นช่วงเมื่อไม่มีข้อมูล แต่ละสถานการณ์มีบริบทและความยากต่างกัน
            จึงไม่ใช่ข้อสรุปว่าทักษะเพิ่มขึ้นหรือลดลงโดยตรง
          </p>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[760px] text-left text-sm">
          <caption className="p-3 text-left font-bold">รายละเอียดสมรรถนะและเกณฑ์ต้นทาง</caption>
          <thead className="bg-slate-50">
            <tr>
              <th className="p-3">สมรรถนะ</th>
              {CROSSWALK_SCENARIOS.map((s) => (
                <th className="p-3" key={s}>
                  {s.toUpperCase()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MASTER_COMPETENCIES.map((c) => (
              <tr key={c.id} className="border-t border-border">
                <th className="max-w-72 p-3 font-medium">
                  {c.label}
                  {c.core && !c.excluded && (
                    <span className="ml-2 text-xs text-emerald-700">Radar</span>
                  )}
                </th>
                {CROSSWALK_SCENARIOS.map((s) => {
                  const result = scoreCompetency(c, s, chosen[s]);
                  return (
                    <td key={s} className="p-3 align-top">
                      <span className="font-semibold">
                        {result.status === "excluded"
                          ? "งดประเมิน"
                          : result.status === "not-applicable"
                            ? "ไม่ใช้ในบทนี้"
                            : display(result.score)}
                      </span>
                      {result.required > 0 && (
                        <div className="mt-1 text-xs text-slate-text">
                          {c.dimensions[s]?.map((d) => `D${d}`).join(", ")}
                          {c.id === "behavior" && (s === "s4" || s === "s5") ? " †" : ""}
                        </div>
                      )}
                      {result.status === "missing" && (
                        <div className="text-xs text-slate-text">
                          มีคะแนน {result.available}/{result.required}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs leading-relaxed text-slate-text">
        D อ้างอิงเลขเกณฑ์เดิมในเอกสาร แม้ตัดข้อที่ต้องใช้เสียงออกแล้ว · †
        ความเชื่อมโยงที่มีเครื่องหมายกำกับในต้นฉบับ · Structure ของ S3 และ S4
        ใช้ค่าเฉลี่ยข้อที่ระบุเป็นตัวแทน ไม่ได้ตรวจลำดับบทสนทนาใหม่
      </p>
      <details className="rounded-xl border border-border p-4">
        <summary className="cursor-pointer font-bold">ดูหลักฐานคะแนนรายเกณฑ์</summary>
        <label className="mt-4 block text-sm">
          สถานการณ์{" "}
          <select
            className="ml-2 rounded-lg border p-2"
            value={detailScenario}
            onChange={(e) => setDetailScenario(e.target.value as CrosswalkScenario)}
          >
            {CROSSWALK_SCENARIOS.map((s) => (
              <option key={s} value={s}>
                {s.toUpperCase()}
              </option>
            ))}
          </select>
        </label>
        <p className="my-3 break-all text-xs text-slate-text">
          {detail
            ? `Session: ${detail.id} · ${date(detail.stage3?.completedAt)}`
            : "ยังไม่มีผลประเมินรายเกณฑ์เวอร์ชันปัจจุบัน"}
        </p>
        {detail?.stage3?.reflectionAnalysis?.map((item) => (
          <div key={item.criterionId} className="border-t border-border py-3 text-sm">
            <p className="font-semibold">
              {item.criterionId} · {display(item.score)} / 5
            </p>
            <p className="mt-1 whitespace-pre-wrap">{item.evidence || "ไม่มีหลักฐานข้อความ"}</p>
            {item.limitation && <p className="mt-1 text-slate-text">ข้อจำกัด: {item.limitation}</p>}
          </div>
        ))}
      </details>
      <p className="text-xs text-slate-text">
        อ้างอิง Master Competency Crosswalk · สูตร {CROSSWALK_VERSION} ·
        การเฉลี่ยน้ำหนักเท่ากันเป็นวิธีคำนวณของระบบ เนื่องจากเอกสารไม่ได้กำหนดน้ำหนัก
      </p>
    </section>
  );
}
