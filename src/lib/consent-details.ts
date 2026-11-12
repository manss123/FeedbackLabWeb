import { z } from "zod";

export const consentDetailsSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "กรุณาพิมพ์ชื่อ-นามสกุลด้วยตนเอง")
    .max(200, "ชื่อ-นามสกุลยาวเกินไป (ไม่เกิน 200 ตัวอักษร)"),
  age: z.coerce
    .number({ invalid_type_error: "กรุณากรอกอายุเป็นตัวเลข" })
    .int("กรุณากรอกอายุเป็นจำนวนเต็ม")
    .min(18, "เอกสารนี้สำหรับผู้เข้าร่วมอายุ 18 ปีขึ้นไป")
    .max(65, "เอกสารนี้สำหรับผู้เข้าร่วมอายุไม่เกิน 65 ปี"),
  houseNumber: z
    .string()
    .trim()
    .min(1, "กรุณากรอกบ้านเลขที่")
    .max(200, "บ้านเลขที่ยาวเกินไป (ไม่เกิน 200 ตัวอักษร)"),
  road: z.string().trim().max(200, "ชื่อถนนยาวเกินไป (ไม่เกิน 200 ตัวอักษร)"),
  subdistrict: z
    .string()
    .trim()
    .min(1, "กรุณากรอกตำบล/แขวง")
    .max(200, "ตำบล/แขวง ยาวเกินไป (ไม่เกิน 200 ตัวอักษร)"),
  district: z
    .string()
    .trim()
    .min(1, "กรุณากรอกอำเภอ/เขต")
    .max(200, "อำเภอ/เขต ยาวเกินไป (ไม่เกิน 200 ตัวอักษร)"),
  province: z
    .string()
    .trim()
    .min(1, "กรุณากรอกจังหวัด")
    .max(100, "จังหวัดยาวเกินไป (ไม่เกิน 100 ตัวอักษร)"),
  postalCode: z
    .string()
    .trim()
    .regex(/^\d{5}$/, "กรุณากรอกรหัสไปรษณีย์ 5 หลัก"),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+()\s-]{9,20}$/, "กรุณากรอกหมายเลขโทรศัพท์ให้ถูกต้อง"),
});
export type ConsentDetails = z.infer<typeof consentDetailsSchema>;
export const CONSENT_DOCUMENTS = [
  { id: "participant-information", title: "เอกสารชี้แจงสำหรับผู้เข้าร่วมวิจัย", pages: 6 },
  { id: "informed-consent", title: "หนังสือแสดงเจตนายินยอมของผู้เข้าร่วมวิจัย", pages: 2 },
] as const;
