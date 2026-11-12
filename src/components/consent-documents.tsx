import { useState } from "react";
import { Download, FileText, ShieldCheck, UserRound } from "lucide-react";
import { CONSENT_DOCUMENTS } from "@/lib/consent-details";

export const emptyConsentFields = {
  fullName: "",
  age: "",
  houseNumber: "",
  road: "",
  subdistrict: "",
  district: "",
  province: "",
  postalCode: "",
  phone: "",
};
const fields = [
  ["fullName", "ข้าพเจ้า (ชื่อ-นามสกุล)", "กรอกชื่อ-นามสกุลด้วยตนเอง"],
  ["age", "อายุ (ปี)", "กรอกอายุ"],
  ["houseNumber", "อาศัยอยู่บ้านเลขที่", "กรอกบ้านเลขที่"],
  ["road", "ถนน (ถ้ามี)", "กรอกชื่อถนน"],
  ["subdistrict", "ตำบล / แขวง", "กรอกตำบล / แขวง"],
  ["district", "อำเภอ / เขต", "กรอกอำเภอ / เขต"],
  ["province", "จังหวัด", "กรอกจังหวัด"],
  ["postalCode", "รหัสไปรษณีย์", "กรอกรหัสไปรษณีย์"],
  ["phone", "โทรศัพท์", "กรอกเบอร์โทรศัพท์"],
] as const;

export function ConsentDocuments({
  values,
  onChange,
  disabled,
}: {
  values: typeof emptyConsentFields;
  onChange: (values: typeof emptyConsentFields) => void;
  disabled: boolean;
}) {
  const [active, setActive] = useState<string | null>(null);
  const document = CONSENT_DOCUMENTS.find((d) => d.id === active);
  return (
    <section className="overflow-hidden rounded-2xl border border-emerald-100 bg-white">
      <div className="grid items-stretch gap-4 bg-gradient-to-r from-emerald-50/70 to-sky-50/70 p-4 xl:grid-cols-[1.4fr_1fr_1fr]">
        <div className="flex gap-3">
          <ShieldCheck className="size-10 shrink-0 text-emerald-600" />
          <div>
            <h2 className="text-lg font-bold">เอกสารสำหรับการยินยอม (PDPA)</h2>
            <p className="text-sm text-slate-text">
              กรุณาอ่านเอกสารทั้ง 2 ฉบับให้ครบถ้วน
              ก่อนกรอกชื่อเพื่อยืนยันการยินยอมเข้าร่วมโครงการวิจัย
            </p>
          </div>
        </div>
        {CONSENT_DOCUMENTS.map((doc) => (
          <div
            key={doc.id}
            className="flex items-center gap-2 rounded-xl border border-border bg-white p-3 shadow-sm"
          >
            <FileText className="size-7 shrink-0 text-red-500" />
            <button
              type="button"
              aria-expanded={active === doc.id}
              onClick={() => setActive(active === doc.id ? null : doc.id)}
              className="flex-1 text-left text-sm font-bold hover:text-emerald-700"
            >
              {doc.title}
              <span className="mt-1 block text-xs font-normal text-slate-text">
                อ่านเอกสาร · {doc.pages} หน้า
              </span>
            </button>
            <a
              href={`/documents/consent/${doc.id}.pdf`}
              download
              aria-label={`ดาวน์โหลด ${doc.title}`}
              className="rounded-lg p-2 hover:bg-slate-100"
            >
              <Download className="size-5" />
            </a>
          </div>
        ))}
      </div>
      {document && (
        <div className="border-y border-border bg-slate-50 p-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold">{document.title}</h3>
            <a
              className="text-sm text-emerald-700 underline"
              href={`/documents/consent/${document.id}.pdf`}
              target="_blank"
              rel="noreferrer"
            >
              เปิด PDF ขนาดเต็มในแท็บใหม่
            </a>
          </div>
          <div
            tabIndex={0}
            role="region"
            aria-label={document.title}
            className="max-h-[65vh] space-y-3 overflow-auto rounded-lg border bg-slate-200 p-2"
          >
            {Array.from({ length: document.pages }, (_, i) => (
              <img
                key={`${document.id}-${i}`}
                src={`/documents/consent/${document.id}-${i + 1}.webp`}
                alt={`${document.title} หน้า ${i + 1} จาก ${document.pages} (อ่านเนื้อหาแบบข้อความได้จาก PDF)`}
                loading="lazy"
                className="mx-auto w-full max-w-4xl bg-white shadow-sm"
              />
            ))}
          </div>
        </div>
      )}
      <fieldset disabled={disabled} className="p-4 sm:p-5">
        <legend className="sr-only">ข้อมูลผู้ให้ความยินยอม</legend>
        <div className="mb-4 flex items-start gap-3">
          <UserRound className="size-7 shrink-0 text-emerald-600" />
          <p className="font-bold">
            ข้าพเจ้าเข้าใจข้อความในเอกสารชี้แจงผู้เข้าร่วมการวิจัย
            และหนังสือแสดงเจตนายินยอมนี้โดยตลอดแล้ว จึงพิมพ์ชื่อเพื่อยืนยันความยินยอม
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {fields.map(([key, label, placeholder]) => (
            <label
              key={key}
              className="space-y-1.5 text-sm font-semibold"
              htmlFor={`consent-${key}`}
            >
              {label} {key !== "road" && <span className="text-red-500">*</span>}
              <input
                id={`consent-${key}`}
                name={key}
                value={values[key]}
                onChange={(e) => onChange({ ...values, [key]: e.target.value })}
                placeholder={placeholder}
                required={key !== "road"}
                autoComplete="off"
                type={key === "age" ? "number" : key === "phone" ? "tel" : "text"}
                min={key === "age" ? 18 : undefined}
                max={key === "age" ? 65 : undefined}
                maxLength={key === "postalCode" ? 5 : key === "phone" ? 20 : 200}
                inputMode={key === "postalCode" ? "numeric" : undefined}
                pattern={key === "postalCode" ? "[0-9]{5}" : undefined}
                className="block h-10 w-full rounded-lg border border-control-border bg-white px-3 font-normal outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </label>
          ))}
        </div>
      </fieldset>
    </section>
  );
}
