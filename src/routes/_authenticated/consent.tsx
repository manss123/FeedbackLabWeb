import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { Loader2, ShieldCheck, Mic, FileText } from "lucide-react";
import { LearnerShell } from "@/components/learner-shell";
import { CONSENT_DOC_VERSION, getLearnerOverview, submitConsent } from "@/lib/learner.functions";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { serverTimestamp } from "firebase/firestore";
import { getFirebaseAuth } from "@/lib/firebase";
import { waitForFirebaseUser } from "@/lib/firebase-auth";
import { upsertUserDoc } from "@/lib/firestore";
import { logActivity } from "@/lib/activity";
import { learnerAccessKey } from "@/lib/learner-access";

export const Route = createFileRoute("/_authenticated/consent")({
  head: () => ({
    meta: [
      { title: "หนังสือแสดงความยินยอม — My Feedback Lab" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ConsentPage,
});

function ConsentPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["learner-overview"],
    queryFn: () => getLearnerOverview(),
  });

  const [research, setResearch, clearResearchDraft] = usePersistedState<boolean>(
    "consent.research",
    false,
  );
  const [mic, setMic, clearMicDraft] = usePersistedState<boolean>("consent.mic", false);
  const [audio, setAudio, clearAudioDraft] = usePersistedState<boolean>("consent.audio", false);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!research || !mic || !audio) {
        throw new Error("ต้องให้ความยินยอมทุกข้อจึงจะเริ่มโครงการวิจัยได้");
      }
      // Request browser mic permission as part of consent flow
      if (mic) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach((t) => t.stop());
        } catch {
          throw new Error("ไม่สามารถขอสิทธิ์ไมโครโฟนจากเบราว์เซอร์ได้ กรุณาอนุญาตแล้วลองใหม่");
        }
      }
      const uid = getFirebaseAuth().currentUser?.uid ?? (await waitForFirebaseUser())?.uid;
      if (!uid) throw new Error("กรุณาเข้าสู่ระบบอีกครั้ง");
      // The route guard reads Firestore, so finish the durable write before
      // marking setup complete locally or navigating to the next step.
      await upsertUserDoc(uid, {
        consent: {
          documentVersion: CONSENT_DOC_VERSION,
          researchConsent: research,
          microphonePermission: mic,
          audioRecordingConsent: audio,
          createdAt: serverTimestamp(),
        },
      });
      await queryClient.invalidateQueries({ queryKey: learnerAccessKey(uid) });
      const result = await submitConsent({
        data: {
          research_consent: research,
          microphone_permission: mic,
          audio_recording_consent: audio,
        },
      });
      void logActivity({ type: "consent_given" });
      return result;
    },
    onSuccess: () => {
      toast.success("บันทึกความยินยอมแล้ว");
      clearResearchDraft();
      clearMicDraft();
      clearAudioDraft();
      queryClient.invalidateQueries({ queryKey: ["learner-overview"] });
      navigate({ to: "/onboarding" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const allChecked = research && mic && audio;

  return (
    <LearnerShell displayName={data?.profile?.display_name} avatarUrl={data?.profile?.avatar_url}>
      <div className="w-full">
        <div className="mb-8 space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-mint-light px-3 py-1 text-xs font-bold uppercase tracking-wider text-mint-primary">
            <ShieldCheck className="h-3 w-3" />
            Step 1 of 3
          </div>
          <h1 className="text-3xl font-bold">หนังสือแสดงความยินยอมเข้าร่วมโครงการวิจัย</h1>
          <p className="text-slate-text">กรุณาอ่านและให้ความยินยอมทุกข้อก่อนเริ่มกิจกรรมการวิจัย</p>
        </div>

        {/* Research information */}
        <section className="mb-6 rounded-2xl border border-border bg-background p-8">
          <div className="mb-4 flex items-center gap-3">
            <FileText className="h-5 w-5 text-mint-primary" />
            <h2 className="text-lg font-bold">ข้อมูลโครงการวิจัย</h2>
          </div>
          <div className="space-y-3 text-sm leading-relaxed text-slate-text">
            <p>
              โครงการวิจัยนี้พัฒนา{" "}
              <strong className="text-slate-deep">Personalized VR Gamified Learning System</strong>
              เพื่อส่งเสริมความสามารถในการให้ข้อเสนอแนะเชิงสร้างสรรค์ (Constructive Feedback)
              ของอาจารย์มหาวิทยาลัย
            </p>
            <p>
              ระบบจะเก็บข้อมูลการเรียนรู้ ผลการทดสอบ เสียงพูดขณะฝึก Scenario และคำตอบแบบสอบถาม
              เพื่อการวิเคราะห์เชิงวิชาการเท่านั้น
              ข้อมูลจะถูกเก็บเป็นความลับและใช้เฉพาะเพื่อการวิจัย
            </p>
            <p>ผู้เข้าร่วมมีสิทธิ์ถอนตัวจากการวิจัยเมื่อใดก็ได้โดยไม่มีผลกระทบใด ๆ</p>
          </div>
        </section>

        {/* Consent checkboxes */}
        <section className="mb-6 space-y-4">
          <label className="flex cursor-pointer items-start gap-4 rounded-2xl border border-border bg-background p-6 transition-colors hover:border-mint-primary/50">
            <Checkbox
              checked={research}
              onCheckedChange={(v) => setResearch(v === true)}
              className="mt-1"
            />
            <div>
              <div className="font-semibold">ยินยอมเข้าร่วมโครงการวิจัย</div>
              <div className="mt-1 text-sm text-slate-text">
                ข้าพเจ้าได้อ่านและเข้าใจข้อมูลโครงการวิจัย ยินยอมเข้าร่วมด้วยความสมัครใจ
                และให้ระบบเก็บข้อมูลการเรียน คะแนน และประวัติกิจกรรมเพื่อการวิจัย
              </div>
            </div>
          </label>

          <label className="flex cursor-pointer items-start gap-4 rounded-2xl border border-border bg-background p-6 transition-colors hover:border-mint-primary/50">
            <Checkbox checked={mic} onCheckedChange={(v) => setMic(v === true)} className="mt-1" />
            <div className="flex-1">
              <div className="flex items-center gap-2 font-semibold">
                <Mic className="h-4 w-4 text-mint-primary" />
                อนุญาตให้ใช้ไมโครโฟน
              </div>
              <div className="mt-1 text-sm text-slate-text">
                ยินยอมให้เบราว์เซอร์เข้าถึงไมโครโฟนเพื่อทดสอบเสียงและใช้ในกิจกรรม VR Simulation
              </div>
            </div>
          </label>

          <label className="flex cursor-pointer items-start gap-4 rounded-2xl border border-border bg-background p-6 transition-colors hover:border-mint-primary/50">
            <Checkbox
              checked={audio}
              onCheckedChange={(v) => setAudio(v === true)}
              className="mt-1"
            />
            <div>
              <div className="font-semibold">ยินยอมให้บันทึกเสียงเพื่อการประเมิน</div>
              <div className="mt-1 text-sm text-slate-text">
                ยินยอมให้ระบบบันทึกเสียงพูดขณะฝึก Scenario เพื่อวิเคราะห์คุณภาพการสื่อสารด้วย
                Speech-to-Text และ NLP ไฟล์เสียงจะถูกเข้ารหัสและเก็บเพื่อการวิจัยเท่านั้น
              </div>
            </div>
          </label>
        </section>

        <button
          onClick={() => mutation.mutate()}
          disabled={!allChecked || mutation.isPending}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-deep px-8 py-4 font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
        >
          {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          บันทึกความยินยอมและดำเนินการต่อ
        </button>

        {!allChecked && (
          <p className="mt-3 text-center text-xs text-slate-text">
            กรุณาให้ความยินยอมทั้ง 3 ข้อจึงจะเริ่มโครงการวิจัยได้
          </p>
        )}
      </div>
    </LearnerShell>
  );
}
