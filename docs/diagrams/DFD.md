# FeedbackLab — DFD Level 0–2

เอกสารชุดนี้ใช้ **Level 0 = Context Diagram**, **Level 1 = กระบวนการหลัก**, **Level 2 = รายละเอียดของแต่ละกระบวนการหลัก** โดย ERD ยังคงเป็นแผนภาพความสัมพันธ์ของข้อมูลแยกต่างหาก

แผนภาพอ้างอิงโค้ดปัจจุบัน ไม่ใช่การรับรองระบบที่ deploy แล้ว ลูกศรหมายถึงข้อมูลที่ไหลระหว่างส่วนต่าง ๆ ไม่ใช่ลำดับการทำงานแบบ flowchart และไม่จำเป็นว่าทุกขั้นจะต้องเสร็จก่อนเริ่มขั้นถัดไป

## ไฟล์แผนภาพ

| ระดับ / กระบวนการ | SVG | PNG | แก้ไขด้วย Mermaid |
|---|---|---|---|
| Level 0 — Context | [SVG](06-dfd-level-0.svg) | [PNG](06-dfd-level-0.png) | [Mermaid](06-dfd-level-0.mmd) |
| Level 1 — กระบวนการหลักทั้งหมด | [SVG](07-dfd-level-1.svg) | [PNG](07-dfd-level-1.png) | [Mermaid](07-dfd-level-1.mmd) |
| Level 2 — 1.0 Identity and Setup | [SVG](08-dfd-level-2-identity.svg) | [PNG](08-dfd-level-2-identity.png) | [Mermaid](08-dfd-level-2-identity.mmd) |
| Level 2 — 2.0 Learning and Assessments | [SVG](09-dfd-level-2-learning.svg) | [PNG](09-dfd-level-2-learning.png) | [Mermaid](09-dfd-level-2-learning.mmd) |
| Level 2 — 3.0 VR Practice and Coaching | [SVG](10-dfd-level-2-vr-ai.svg) | [PNG](10-dfd-level-2-vr-ai.png) | [Mermaid](10-dfd-level-2-vr-ai.mmd) |
| Level 2 — 4.0 Usage Event Persistence | [SVG](11-dfd-level-2-logging.svg) | [PNG](11-dfd-level-2-logging.png) | [Mermaid](11-dfd-level-2-logging.mmd) |
| Level 2 — 5.0 Research Reporting | [SVG](12-dfd-level-2-research.svg) | [PNG](12-dfd-level-2-research.png) | [Mermaid](12-dfd-level-2-research.mmd) |

เปิดภาพทั้งหมดใน [gallery](index.html) ภาพ Level 1 มีข้อมูลมากจึงจัดแนวตั้ง ควรใช้ SVG หรือแยกหน้าเมื่อใส่เอกสาร ส่วน PNG ของชุด DFD กว้าง 3,600 พิกเซล

## Level 0 — ขอบเขตระบบ

กระบวนการ 0 FeedbackLab ครอบคลุมเว็บ UI, Unity interface, server functions และแหล่งเก็บข้อมูลภายใน ไม่แสดง data store ในภาพระดับ Context

| รหัส | External entity | ข้อมูลที่แลกเปลี่ยน |
|---|---|---|
| E1 | Lecturer | เข้าสู่ระบบ/ข้อมูลพื้นฐาน, คำตอบและกิจกรรม, speech/text/reflection และ browser observations; รับเนื้อหา ผลลัพธ์ เสียงทบทวน coaching และสถานะ |
| E2 | Research administrator | เข้าสู่ระบบ, ตัวกรอง/คำขอส่งออก และ browser observations; รับสถานะ identity/delivery และรายงาน/ไฟล์ |
| E3 | Firebase Auth / Google | รับ authentication request; ส่ง authenticated identity |
| E4 | Gemini | รับ transcript/context; ส่งผลวิเคราะห์หรือ failure |
| E5 | Speech recognition service | รับเสียงสำหรับรู้จำ; ส่ง transcript หรือ error |
| E6 | Google Cloud TTS | รับข้อความ NPC/เสียงที่เลือก; ส่งเสียงสังเคราะห์หรือ error |

ลูกศร E1/E2 ในภาพ Context รวมหลายรายการเป็นข้อมูลกลุ่มเดียวเพื่อให้อ่านง่าย ชื่อรายการย่อยทั้งหมดแสดงใน Mermaid และ manifest ไม่เพิ่ม external entity ใหม่ใน Level 1

## Level 1 และการแตก Level 2

| Parent | Child processes | ความหมาย |
|---|---|---|
| 1.0 Identity and setup | 1.1 Authenticate identity → 1.2 Read and save setup → 1.3 Resolve access and log | อ่านสถานะก่อน render/redirect; บันทึก profile/consent และ milestone |
| 2.0 Learning and assessments | 2.1 Load learner state → 2.2 Process learning input → 2.3 Save and present results | บทเรียน, pre/post, survey, ผลลัพธ์ปัจจุบันในเครื่องและ event เวลา |
| 3.0 VR practice and coaching | 3.1 Capture and replay → 3.2 Obtain coaching / NPC audio → 3.3 Save stages and outcomes | เสียงชั่วคราว, transcript, reflection, AI จริง, stage records และ completion |
| 4.0 Usage event persistence | 4.1 Measure and identify → 4.2 Queue and retry by UID → 4.3 Persist / verify delivery | session/run IDs, measured intervals, durable queue และตรวจ event ซ้ำ |
| 5.0 Research reporting | 5.1 Authorize and read → 5.2 Transform and filter → 5.3 Present and export | อ่านข้ามผู้ใช้โดยผ่าน admin authorization, วิเคราะห์พฤติกรรมและส่งออก |

ลูกศรในตารางนี้ย่อความสัมพันธ์ของข้อมูล ส่วนภาพมีรายละเอียด input/output และเส้นทางย้อนกลับด้วย การบันทึก VR stages เกิดระหว่างทำแต่ละขั้น ไม่ได้รอจน AI ทุกขั้นสำเร็จ

## Data stores

| รหัส | แหล่งเก็บ | สถานะปัจจุบัน |
|---|---|---|
| D1 | Firestore `users` | Profile/consent และเอกสารที่อาจมีข้อมูลเพียงบางส่วน |
| D2 | Firestore `sessions` | สถานการณ์และข้อมูล stage 1–4 ของ VR |
| D3 | Firestore `activity_log` | Milestone/telemetry แบบ immutable พร้อมเวลา client/server |
| D4 | Browser local learner state | Progress, assessment/survey results และ drafts; ยังไม่ได้ย้ายผลทั้งหมดไป Firestore |
| D5 | Temporary audio memory | Blob/Object URL สำหรับฟังทบทวน ไม่มีการอัปโหลดเสียงผู้เรียน |
| D6 | Firestore `tts_logs` | Metadata การใช้บริการเสียง NPC; บางรายการอาจ anonymous |
| D7 | Local activity queue | Event envelope รอส่งซ้ำภายใต้ UID เดิม; หาก storage ใช้ไม่ได้จะเหลือในหน่วยความจำ |

สัญลักษณ์สีฟ้า = external entity, สีเขียว = process, สีเหลืองที่มีเส้นคู่ = data store สัญลักษณ์ที่ใช้รหัสเดียวกันซ้ำคนละตำแหน่งหมายถึงแหล่งเดิม ไม่ใช่สร้าง collection เพิ่ม ใน Level 2 กระบวนการพี่น้อง เช่น 1.0/2.0/3.0 อาจปรากฏเป็นแหล่งข้อมูลเข้าของ 4.x

## Balancing และข้อจำกัด

- Generator ตรวจว่าเมื่อรวม child processes ของ Level 2 กลับเป็น parent จะได้ input/output และชื่อ data flow ตรงกับ Level 1 ทุกกระบวนการ
- External flows ของ Level 0 มาจาก boundary flows ของ Level 1 และไม่มี entity-to-store หรือ store-to-store โดยข้าม process
- [dfd-flow-manifest.json](dfd-flow-manifest.json) เก็บรายการลูกศรสำหรับตรวจสอบหรือปรับแก้แบบจำลองต่อ
- AI failure/null เป็นผลลัพธ์ที่ต้องแสดงตามจริง; normalization และ known limitations ดูใน [Project Context](../../PROJECT_CONTEXT.md) ภาพไม่ได้รับรองว่าตรวจรูปแบบคำตอบ AI ครบทุกฟิลด์แล้ว
- Speech recognition ขึ้นกับ browser/provider และมีทางเลือกพิมพ์เอง TTS callable มีอยู่ แต่ยังไม่ได้ตรวจ implementation ฝั่ง Unity ที่เรียกใช้จริง
- การอ่าน Admin ใช้ authorization ฝั่ง callable ส่วนการเขียนข้อมูลตนเองใช้ Firebase client SDK และ Firestore Rules
- Session overlap เป็นการคำนวณจากช่วง heartbeat ที่สังเกตและนาฬิกา client ไม่ยืนยันจำนวนอุปกรณ์จริง เวลาที่มีปฏิสัมพันธ์เป็น proxy ไม่ใช่การพิสูจน์ว่าเรียนตลอดช่วง

## สร้างใหม่

```powershell
python scripts/generate-dfd.py
```

คำสั่งนี้สร้างภาพเดิม 5 ภาพและ DFD เพิ่ม 7 ภาพ รวม 12 ภาพ, gallery และ ZIP ใหม่ พร้อมตรวจ balancing โดยไม่แก้ application code และไม่ติดต่อบริการภายนอก
