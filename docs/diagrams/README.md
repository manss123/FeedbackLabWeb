# FeedbackLab — Diagram package

สร้างจากโค้ดที่ตรวจสอบในวันที่ 17 กันยายน 2026 สำหรับนำไปประกอบเอกสารระบบและงานวิจัย ใช้ข้อความภาษาอังกฤษในภาพเพื่อสะดวกต่อการนำไปจัดทำบทความ

**เปิดดูทั้งหมด:** [index.html](index.html) ใช้งานออฟไลน์ได้ ไม่ต้องติดตั้ง Mermaid

**เพิ่ม DFD Level 0–2 แล้ว:** [คำอธิบายและไฟล์ DFD ทั้ง 7 ภาพ](DFD.md) ประกอบด้วย Context, กระบวนการหลัก และ Level 2 ครบ 5 กระบวนการ โดยคง ERD แยกไว้ตามเดิม

| ภาพ | SVG สำหรับใส่เอกสาร | PNG ความละเอียด 2 เท่า | Mermaid สำหรับแก้ไข |
|---|---|---|---|
| System Architecture | [SVG](01-system-architecture.svg) | [PNG](01-system-architecture.png) | [Mermaid](01-system-architecture.mmd) |
| System Framework | [SVG](02-system-framework.svg) | [PNG](02-system-framework.png) | [Mermaid](02-system-framework.mmd) |
| Logical ERD | [SVG](03-logical-erd.svg) | [PNG](03-logical-erd.png) | [Mermaid](03-logical-erd.mmd) |
| User Use Cases | [SVG](04-user-use-cases.svg) | [PNG](04-user-use-cases.png) | [Mermaid](04-user-use-cases.mmd) |
| Usage Logging / Concurrent Sessions | [SVG](05-usage-session-flow.svg) | [PNG](05-usage-session-flow.png) | [Mermaid](05-usage-session-flow.mmd) |

SVG เป็นเวกเตอร์ ขยายได้โดยไม่เสียความคมชัด ส่วน PNG กว้าง 2,800 พิกเซล Mermaid เป็นแหล่งข้อมูลสำหรับจัดรูปแบบใหม่ด้วย Mermaid renderer; layout อัตโนมัติจะต่างจาก SVG ที่จัดวางไว้ การแก้ Mermaid ไม่แก้ SVG/PNG อัตโนมัติ

## Suggested figure captions

1. **System architecture of FeedbackLab.** Client-side identity and own-data persistence are separated from server-side AI processing and authorized cross-participant research access. Assessment results currently remain in browser storage.
2. **Learning and research framework.** The intended sequence integrates 5E learning modules with the four stages of Kolb's experiential learning cycle, followed by post-assessment and survey. Research observations are collected across this sequence.
3. **Logical Firestore document model.** Participant documents, VR sessions and immutable activity events are related by optional logical identifiers. Browser, web-session and learning-run identities are event fields rather than separate collections.
4. **User use-case view.** Lecturers participate in learning and reflection, while authorized administrators inspect and export research records. Certificate issuance is identified as a planned capability. Actor boxes and use-case ellipses provide a simplified use-case view rather than strict UML notation.
5. **Usage instrumentation and concurrent-session analysis.** Client observations enter a durable retry queue and are appended to Firestore with server receipt timestamps. Observed overlap is derived from bounded heartbeat intervals belonging to the same participant.

## Interpretation and implementation status

- ภาพอ้างอิงโค้ดใน workspace ไม่ใช่การยืนยันระบบที่ deploy แล้ว
- สีเขียวแสดงองค์ประกอบหลัก สีเหลืองแสดง local storage หรือข้อมูลประกอบ สีฟ้าแสดงบริการภายนอก/บริบท สีม่วงระบุความสามารถที่วางแผนไว้
- Firestore เป็น document database: ความสัมพันธ์ใน ERD ไม่ใช่ foreign key ที่ฐานข้อมูลบังคับ และ user document อาจยังไม่มีหรือมีเพียงบางฟิลด์
- แบบประเมินก่อน–หลังและ survey ยังใช้ localStorage สำหรับผลลัพธ์ การย้ายผลไป Firestore ยังเป็นงานในอนาคต ส่วน event และเวลาใหม่เก็บใน Firestore แล้ว
- Audio ใช้ฟังทบทวนในหน่วยความจำ ไม่มี audio-upload entity หรือ use case
- AI ต้องใช้ผลจริงหรือแสดงว่าไม่พร้อมใช้งาน ภาพสถาปัตยกรรมไม่รับรอง strict validation ของทุกฟิลด์: normalization ที่ยังเติมค่าเริ่มต้นและข้อจำกัด AI อื่นระบุใน [SYSTEM_DIAGRAMS.md](../../SYSTEM_DIAGRAMS.md)
- Framework แสดงลำดับการเรียนที่ตั้งใจไว้ ไม่รับรอง prerequisite enforcement ทุกขั้นหรือความสมบูรณ์ของเนื้อหาทุก module
- Browser ID ไม่ยืนยัน hardware identity; session overlap ขึ้นกับนาฬิกา client และข้อมูล heartbeat ที่สังเกตได้ ส่วน active time เป็น interaction proxy ไม่ใช่การพิสูจน์ความตั้งใจเรียน

## Sources and regeneration

อ้างอิง [Project Context](../../PROJECT_CONTEXT.md), [System Diagrams](../../SYSTEM_DIAGRAMS.md), [Research Logs](../../RESEARCH_LOGS.md), [Usage Tracking](../../USAGE_TRACKING.md) และ implementation ใน `src/lib`, `src/routes`, `src/components`, `functions/src/index.ts` และ `firebase.json`.

สร้าง SVG, PNG, Mermaid และ gallery ซ้ำได้ด้วย:

```powershell
python scripts/generate-dfd.py
```

ใช้ Python + Pillow และฟอนต์ Segoe UI บน Windows ไม่เรียก external service และไม่ส่งข้อมูลผู้เรียนออกไป การเปลี่ยน layout/ข้อความหลักให้แก้ generator; Mermaid สามารถนำไปแก้แยกได้
