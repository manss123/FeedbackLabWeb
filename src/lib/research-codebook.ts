import { RESEARCH_COLUMNS, TEXT_COLUMNS, type ResearchRow } from "@/lib/research-log";

export const RESEARCH_NOTES = [
  "Video: เวลาเล่นและเวลาเล่นขณะมองเห็นเป็นช่วงย่อยแยกจาก Active ห้ามบวกทับกับเวลาเว็บ/ขั้นเรียน; เล่นถึงท้ายไม่ยืนยันว่าดูครบทุกช่วง; video_is_test=true คือวิดีโอทดสอบ",
  "Web/Steps กรองด้วยเวลาที่ server รับ event (createdAt); ช่วงเวลาภายใน event อาจข้ามขอบเขตวันที่ ไม่มีการตัดสัดส่วนเวลา",
  "Session ซ้อนอิง heartbeat ที่สังเกตและนาฬิกา client; ไม่ใช้ login ที่ไม่มี logout เป็นหลักฐานเปิดค้าง และไม่ยืนยันว่าเป็นคนละอุปกรณ์จริง",
  "Active proxy = visible + focused + interaction ภายใน 60 วินาที; ไม่ใช่เวลาเรียนจริง และอาจไม่นับการอ่านหรือดูวิดีโอเงียบ ๆ",

  "ข้อมูลเป็น milestone และบันทึกการฝึกที่ส่งถึงฐานข้อมูล ไม่ใช่ clickstream หรือเวลาที่ตั้งใจเรียนจริง",
  "วันที่กรองใช้ Asia/Bangkok (UTC+7) รวมวันสิ้นสุด; timestamp ในไฟล์เป็น UTC ISO 8601",
  "Activity/Module เลือก event ในช่วงวันที่; VR เลือก session ที่เริ่มในช่วงวันที่และแสดงสถานะล่าสุดทั้ง session รวม event ที่เชื่อมได้แม้อยู่นอกช่วงวันที่",
  "ระยะห่าง event และเวลาตั้งแต่เริ่ม session ถึงขั้น 4 เป็นเวลาตามนาฬิกา รวมการพัก ห้ามตีความเป็น active learning time",
  "ไม่พบบันทึกจบไม่ได้แปลว่าเลิกเรียน เพราะการเขียน session/activity อาจล้มเหลวแยกกัน; จำนวนศูนย์หมายถึงไม่พบในชุดข้อมูลที่โหลด",
  "จับคู่ event กับ VR ด้วย sessionId + userId + scenarioId ที่สอดคล้องกันเท่านั้น ไม่คาดเดาจากเวลา; event เก่าที่ไม่มี sessionId ยังอยู่ใน Activity Log",
  "Module สรุปหนึ่งผู้เรียนต่อหนึ่งบทเรียนจาก event ในช่วงที่เลือก ไม่ใช่ราย attempt และไม่จับคู่เริ่ม-จบเพื่อสร้างเวลาเรียน",
  "VR หนึ่งแถวคือหนึ่ง session ที่มีสองรอบพูด; การลองรอบสองซ้ำอาจทับข้อมูลเดิม จึงไม่มีคะแนนทุก retry ย้อนหลัง",
  "คะแนนที่ขาด/ผิดช่วงเป็น null ใน JSON และช่องว่างใน CSV; delta คำนวณเฉพาะคู่ที่มีตัวเลขจริง ห้ามแทน missing ด้วยศูนย์",
  "มี aiScores ไม่ได้ยืนยันว่า AI สำเร็จทุกฟิลด์ และไม่มีคะแนนไม่ได้ยืนยันว่า API ล้มเหลว; ระบบยังไม่มี AI error status แบบมีโครงสร้าง",
  "คะแนนเก่าที่ต้นทางเคยแทนค่าที่ขาดด้วย 0 ไม่สามารถแยกจากคะแนนศูนย์จริงได้จาก log นี้ ต้องตรวจเวอร์ชันการให้คะแนนและข้อมูลต้นทางก่อนตีความ",
  "Self-rating เก็บแยกข้อ 1–8 (1–5); ข้อคำถามต่างตาม scenario จึงไม่เฉลี่ยรวมกับ rubric AI หรือเกณฑ์ก่อน-หลังเรียน",
  "ผู้เข้าร่วมรวม UID จาก users, sessions และ activity แม้ไม่มี profile; ชื่อ อีเมล และ UID ไม่อยู่ในไฟล์วิเคราะห์",
  "รหัสผู้เข้าร่วมเป็นรหัสคงที่จาก UID สำหรับเชื่อมชุดข้อมูล ไม่ใช่การรับรองว่าไม่สามารถระบุตัวบุคคลได้; ข้อความสะท้อนคิดอาจมีชื่อบุคคล",
  "ค่าตำแหน่ง attempt/sequence อิงข้อมูลทั้งหมดที่โหลดก่อนกรอง; เวลาเท่ากันเรียงด้วย ID ไม่ได้ยืนยันลำดับจริงระหว่างแท็บ",
  "schema v2 เพิ่ม page, heartbeat, idle และเวลารายขั้นตั้งแต่ติดตั้งเวอร์ชันนี้เท่านั้น; ข้อมูลเก่าไม่มีเวลาย้อนหลังหรือประวัติคำตอบทุกครั้ง",
  "ข้อมูลก่อน-หลังเรียนและ survey ยังอยู่ใน localStorage เป็นหลัก จึงไม่ใช้เป็นตัวชี้วัดผลลัพธ์ในรายงานพฤติกรรมนี้",
  "CSV ใช้ UTF-8 BOM และป้องกันสูตร spreadsheet ในข้อความด้วยอัญประกาศเดี่ยว; JSON เก็บข้อความเดิมเมื่อเลือกส่งออกข้อความ",
];

const descriptions: Record<string, string> = {
  video_id: "YouTube video ID",
  video_visit_id: "รหัสการเปิดตัวเล่นหนึ่งครั้ง รวมหลายช่วงเล่น/หยุด",
  video_is_test: "true = เนื้อหาทดสอบ ไม่ควรใช้เป็นผลการเรียนเนื้อหาจริง",
  video_player_state:
    "สถานะปลายช่วง: -1 ยังไม่เริ่ม/ผิดพลาด, 0 จบ, 1 เล่น, 2 หยุด, 3 buffering, 5 cued; ดู reason และ error ประกอบ",
  video_playback_seconds:
    "วินาทีจริงที่ player รายงาน playing ในช่วงนี้ ไม่คูณความเร็วหรือเพิ่มตามตำแหน่งที่ข้าม; รวมเล่นเบื้องหลัง",
  video_visible_playback_seconds:
    "ส่วนของเวลาเล่นที่ document visible และตัวเล่นอย่างน้อยครึ่งหนึ่งอยู่ใน viewport หรือ fullscreen; ไม่ต้องคลิก ไม่ยืนยันความตั้งใจ",
  video_unobserved_seconds: "ช่องว่างการเก็บตัวอย่างเกิน 45 วินาที ไม่นับเป็นเวลาเล่นหรือมองเห็น",
  video_position_seconds:
    "ตำแหน่ง media ที่ปลายช่วง ไม่ใช่ระยะเวลาที่ดู; ไม่มีการอนุมานว่าคลิกปุ่ม seek ใด",
  video_playback_rate: "ความเร็วการเล่นที่ปลายช่วง เช่น 1 หรือ 2",
  video_error_code: "รหัสข้อผิดพลาด YouTube ถ้ามี; API โหลดไม่สำเร็จดู reason=api_load_error",
  page_visit_id:
    "UUID ต่อการเข้าหน้า จับคู่ page_entered กับ page_left; BFCache resume เป็นช่วงใหม่",
  device_category: "ประเภทอุปกรณ์โดยประมาณจาก user agent; ไม่ยืนยัน hardware จริง",
  browser_family: "ตระกูล browser โดยประมาณ ไม่เก็บ full user agent หรือ fingerprint",
  web_session_id:
    "รหัส session ต่อเอกสาร/แท็บและผู้ใช้; reload หรือบัญชีเปลี่ยนได้ session ใหม่ ไม่ใช่ Firebase token",
  browser_id:
    "UUID ต่อ browser storage และผู้ใช้ ไม่ใช่ hardware ID; ล้าง storage หรือใช้ browser อื่นจะเปลี่ยน",
  tab_id: "UUID ต่อเอกสาร; แท็บซ้ำและ reload มี ID ใหม่",
  browser_id_persistent: "บันทึกรหัส browser ลง localStorage สำเร็จหรือไม่",
  run_id: "UUID ของการเปิดบทเรียน/VR/แบบประเมินแต่ละครั้ง; reload เป็น attempt ใหม่",
  step_visit_id: "UUID ของการเข้าขั้นแต่ละครั้ง แม้กลับมาขั้นเดิมใน run เดิม",
  step_id: "ชื่อขั้นจากเส้นทางการเรียน; form สำหรับแบบประเมิน",
  assessment_id: "diagnostic | posttest | survey",
  path: "pathname เท่านั้น ไม่บันทึก query string หรือ hash",
  reason: "สาเหตุเปลี่ยนสถานะที่ client รายงาน",
  end_reason:
    "submitted | next_step | step_changed_or_unmounted | pagehide; ไม่ใช่สถานะการเรียนสำเร็จเสมอ",
  elapsed_seconds: "เวลาตาม monotonic clock รวมเวลาพัก ตั้งแต่เริ่มช่วงถึงสิ้นสุด",
  visible_seconds: "เวลาที่ document visible จาก sample; ตัดช่วง timer gap >45 วินาที",
  active_proxy_seconds:
    "visible + focused + interaction ภายใน 60 วินาที; เป็น proxy ไม่ใช่ความตั้งใจเรียนจริง",
  unobserved_seconds:
    "ช่วง monotonic timer gap >45 วินาที ไม่รวมใน visible/active; อาจเกิดจากเครื่องพัก",
  heartbeat_count: "จำนวน web_heartbeat ในช่วง createdAt ที่กรอง",
  page_entry_count: "จำนวน page_entered ในช่วงที่กรอง",
  start_event_present: "พบ web_session_started ในช่วงที่กรอง",
  end_event_present: "พบ event สิ้นสุดในช่วงที่กรอง; false ไม่ยืนยันว่า session ยังทำงานอยู่",
  overlapping_web_session_count:
    "จำนวน session อื่นของผู้เรียนเดียวกันที่มี heartbeat interval ไม่เกิน 45 วินาทีทับกัน ใช้เวลาจาก client ซึ่งอาจคลาดเคลื่อน",
  overlapping_other_browser_count:
    "จำนวน browser ID อื่นใน session ที่มีช่วงทับกัน; ไม่ยืนยันจำนวนอุปกรณ์จริง",
  visible: "สถานะ document visible ณ event",
  focused: "สถานะ document.hasFocus ณ event",
  idle: "ไม่มี input อย่างน้อย 60 วินาที ณ event",
  schema_version: "1 สำหรับ legacy / 2 สำหรับ instrumentation ใหม่",
  started_at_client_utc: "เวลาเริ่มจากนาฬิกา client ISO UTC ไม่ใช่เวลา server",
  ended_at_client_utc: "เวลาจบจากนาฬิกา client ISO UTC",
  interval_start_client_utc: "เวลาเริ่มช่วง heartbeat จากนาฬิกา client",
  occurred_at_utc: "เวลาเกิด event ที่ client; อาจคลาดเคลื่อนหรือมาถึงช้าเมื่อ offline",
  auth_at_utc: "authTime จาก Firebase ID token metadata; ไม่เก็บ token",
  participant_code: "รหัส P- ตาม SHA-256 ของ namespace และ UID (16 hex); คงที่ข้ามการกรอง/ส่งออก",
  profile_record_present: "มีแผนที่ profile ใน users ไม่ได้ยืนยันว่ากรอกครบ",
  research_consent_recorded:
    "ค่า researchConsent ที่เก็บไว้; null เมื่อไม่มีค่า (ไม่ได้กรองผู้ให้ความยินยอมโดยอัตโนมัติ)",
  faculty: "คณะจาก profile ล่าสุด ณ เวลาโหลด ไม่ใช่ประวัติ ณ เวลา event",
  department: "ภาควิชาจาก profile ล่าสุด อาจระบุกลุ่มขนาดเล็กได้; null เมื่อไม่มีข้อมูล",
  teaching_experience_years: "ประสบการณ์สอนเป็นปีจาก profile ล่าสุด; 0 เป็นค่าที่ถูกต้อง",
  observed_event_count: "จำนวน event ที่สังเกตในช่วงที่เลือก",
  observed_event_days:
    "จำนวนวันปฏิทิน Bangkok ที่มี event timestamp ถูกต้อง; ไม่ใช่จำนวนวันเข้าเรียนจริง",
  observed_login_count: "จำนวน signed_in event ไม่ใช่จำนวน browser sessions",
  modules_with_start_event: "จำนวน moduleId ไม่ซ้ำที่พบ module_started",
  modules_with_completion_event:
    "จำนวน moduleId ไม่ซ้ำที่พบ module_completed ไม่ใช่ผลประเมินที่ตรวจสอบแล้ว",
  vr_session_count: "จำนวนเอกสาร VR ที่เริ่มในช่วงวันที่",
  vr_all_stages_recorded_count: "จำนวน VR ที่มีแผนที่ stage ครบสี่ขั้น ไม่ใช่การรับรองผ่าน",
  vr_paired_overall_count:
    "จำนวน VR ที่ overall สองรอบเป็นตัวเลข 0–100 (ตัวหารสำหรับการเปรียบเทียบ)",
  observed_retry_event_count: "จำนวน vr_scenario_retried ในช่วงวันที่ รวมที่ไม่มี sessionId",
  unlinked_vr_event_count: "จำนวน VR event ในช่วงวันที่ที่ไม่มีลิงก์ session ตรงกัน",
  invalid_event_timestamp_count: "จำนวน event ที่ parse เวลาไม่ได้; เมื่อกรองวันที่จะถูกตัดออก",
  session_id: "ID เอกสาร session; null ถ้า event ไม่ได้บันทึกไว้",
  scenario_id: "รหัสสถานการณ์ใน source code เช่น s1 ไม่ใช่ version ของโจทย์",
  module_id: "รหัสบทเรียนใน source code เช่น m1",
  attempt_index_in_loaded_history:
    "ลำดับ session ต่อผู้เรียนและ scenario ตามเวลาเริ่มก่อนกรอง; null เมื่อเวลาเริ่มผิดรูปแบบ",
  recorded_stage_count: "จำนวน stage1–stage4 ที่มีแผนที่ข้อมูล (0–4)",
  record_status: "all_stages_recorded หรือ partial_record; ไม่อนุมาน dropout",
  completion_event_count: "จำนวน event จบที่เชื่อมกับ session ได้ในประวัติทั้งหมด",
  linked_retry_event_count: "จำนวน retry event ที่เชื่อมกับ session ได้ในประวัติทั้งหมด",
  elapsed_to_stage4_seconds:
    "วินาทีจาก createdAt ถึง stage4.completedAt; รวมการพัก; null เมื่อขาด/เวลาย้อนกลับ",
  round1_recorded_duration_seconds:
    "durationSeconds ที่บันทึกรอบ 1 อาจเป็น 0 สำหรับพิมพ์ข้อความ; ไม่ใช่เวลาเรียน",
  round2_recorded_duration_seconds:
    "durationSeconds ที่บันทึกรอบ 2 อาจเป็น 0 สำหรับพิมพ์ข้อความ; ไม่ใช่เวลาเรียน",
  round1_transcript_characters:
    "จำนวน Unicode code points ของ transcript รอบ 1; ไม่ใช่จำนวนคำภาษาไทย",
  round2_transcript_characters:
    "จำนวน Unicode code points ของ transcript รอบ 2; ไม่ใช่จำนวนคำภาษาไทย",
  round1_ai_present: "พบ aiScores รอบแรก ไม่ใช่สถานะ API success",
  round2_ai_present: "พบ aiScores รอบสอง ไม่ใช่สถานะ API success",
  timestamp_order_valid:
    "เวลาเริ่มและเวลาขั้นที่มีต้อง parse ได้และเรียงไม่ย้อนหลัง; ไม่ยืนยันว่าข้อมูลครบ",
  selected_goal_count: "จำนวน selectedGoals ที่บันทึก ไม่รวม customGoal",
  observed_start_count: "จำนวน module_started ที่พบ ไม่ใช่จำนวน attempts ที่ยืนยันแล้ว",
  observed_completion_count: "จำนวน module_completed ที่พบ อาจมีการส่งซ้ำ",
  observed_reopen_after_completion_count:
    "จำนวนเริ่มหลัง event จบแรกในช่วงที่เลือก; null เมื่อไม่พบ event จบที่มีเวลาถูกต้อง",
  active_learning_seconds: "ยังไม่ได้เก็บ จึงเป็น null เสมอ",
  event_id: "ID เอกสาร activity_log สำหรับตรวจสอบต้นทาง",
  sequence_in_loaded_history: "ลำดับ event ต่อผู้เรียนก่อนกรอง; invalid timestamp อยู่ท้ายประวัติ",
  event_type: "ชื่อ event ดิบจาก writer; ไม่แปลง submission เป็น completion ของผลลัพธ์",
  recorded_date_bangkok: "วัน YYYY-MM-DD ตาม UTC+7",
  gap_from_previous_event_seconds:
    "วินาทีจาก event ก่อนหน้าที่มีเวลาถูกต้องในประวัติทั้งหมด อาจอยู่นอกช่วงกรอง; ไม่ใช่เวลาเรียน",
  session_link_status: "matched | not_recorded | session_missing | mismatch",
  timestamp_valid: "parse createdAt ของ event ได้หรือไม่",
};

export function researchCodebook(includeText: boolean): ResearchRow[] {
  return Object.entries(RESEARCH_COLUMNS).flatMap(([dataset, fields]) => {
    const columns = dataset === "vr" && includeText ? [...fields, ...TEXT_COLUMNS] : fields;
    return columns.map((field) => ({
      dataset,
      field,
      definition:
        descriptions[field] ??
        (field.endsWith("_at_utc")
          ? "Timestamp ที่เก็บไว้ แปลงเป็น ISO 8601 UTC; null เมื่อขาด/ผิดรูปแบบ"
          : field.startsWith("self_rating_")
            ? "คำตอบ self-rating ตามหมายเลขข้อใน scenario; 1–5; null เมื่อขาด/นอกช่วง"
            : field.startsWith("delta_")
              ? "คะแนนรอบสองลบรอบแรกในมิติเดียวกัน; -100 ถึง 100; null เมื่อขาดคู่"
              : field.startsWith("round1_") || field.startsWith("round2_")
                ? field.endsWith("transcript")
                  ? "ข้อความจริงที่บันทึก เฉพาะเมื่อเลือกส่งออกข้อความ"
                  : "คะแนน rubric VR ที่เก็บไว้ 0–100; overall เป็นค่ารวมในเอกสาร ไม่ใช่มิติที่ห้า"
                : "ข้อความ/รายการเป้าหมายที่บันทึกไว้ เฉพาะเมื่อเลือกส่งออกข้อความ; รายการใช้ JSON array"),
      missing_value: "JSON null / CSV empty cell; not zero",
    }));
  });
}
