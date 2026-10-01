import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePersistedState } from "@/hooks/use-persisted-state";
import {
  ArrowRight,
  AudioWaveform,
  Info,
  Loader2,
  ShieldCheck,
  Mic,
  FileText,
  Users,
} from "lucide-react";
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
import pdpaBanner from "@/assets/banners/pdpa-banner.webp";
import pdpaDocsArt from "@/assets/contents/pdpa/props-1.webp";

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
  const choices = [
    {
      id: "research",
      checked: research,
      change: setResearch,
      icon: Users,
      tone: "bg-mint-light text-monitor-teal",
      title: "ยินยอมเข้าร่วมโครงการวิจัย",
      description:
        "ข้าพเจ้าได้อ่านและเข้าใจข้อมูลโครงการวิจัย ยินยอมเข้าร่วมด้วยความสมัครใจ และให้ระบบเก็บข้อมูลการเรียน คะแนน และประวัติกิจกรรมเพื่อการวิจัย",
    },
    {
      id: "microphone",
      checked: mic,
      change: setMic,
      icon: Mic,
      tone: "bg-monitor-blue/10 text-monitor-blue",
      title: "อนุญาตให้ใช้ไมโครโฟน",
      description:
        "ยินยอมให้เบราว์เซอร์เข้าถึงไมโครโฟนเพื่อทดสอบเสียงและใช้ในกิจกรรม VR Simulation เมื่อกดดำเนินการต่อ เบราว์เซอร์จะขอสิทธิ์ใช้ไมโครโฟน",
    },
    {
      id: "audio",
      checked: audio,
      change: setAudio,
      icon: AudioWaveform,
      tone: "bg-monitor-amber/10 text-monitor-amber",
      title: "ยินยอมให้บันทึกเสียงเพื่อฟังทบทวน",
      description:
        "ยินยอมให้บันทึกเสียงพูดขณะฝึก Scenario ชั่วคราวในอุปกรณ์ เพื่อฟังและทบทวนการให้ Feedback ของตนเอง ระบบไม่อัปโหลดไฟล์เสียงไปเก็บบนเซิร์ฟเวอร์ ส่วนข้อความถอดเสียงและผลประเมินจะใช้ประกอบการเรียนรู้และการวิจัย",
    },
  ];

  return (
    <LearnerShell
      wide
      displayName={data?.profile?.display_name}
      avatarUrl={data?.profile?.avatar_url}
    >
      <div className="w-full">
        <header className="relative isolate overflow-hidden pb-12">
          <img
            src={pdpaBanner}
            alt=""
            aria-hidden="true"
            className="setup-banner-art pointer-events-none absolute inset-0 -z-20 h-full w-full object-cover object-right"
          />
          <div
            aria-hidden="true"
            className="setup-banner-wash pointer-events-none absolute inset-0 -z-10 bg-gradient-to-r from-background/95 via-background/80 to-background/40 lg:via-background/40 lg:to-transparent"
          />
          <div className="app-content-container py-7 sm:py-10 lg:py-12">
            <div className="space-y-4 lg:w-[75%]">
              <p className="inline-flex items-center gap-2 rounded-full bg-mint-light px-4 py-2 text-sm font-bold text-monitor-teal">
                <ShieldCheck className="size-4" aria-hidden="true" /> STEP 1 OF 3
              </p>
              <h1 className="text-2xl font-bold leading-snug text-slate-deep sm:text-3xl">
                หนังสือแสดงความยินยอมเข้าร่วมโครงการวิจัย
              </h1>
              <p className="text-base leading-relaxed text-slate-text sm:text-lg">
                กรุณาอ่านและให้ความยินยอมทุกข้อก่อนเริ่มกิจกรรมการวิจัย
              </p>
            </div>
          </div>
        </header>

        <div className="app-content-container relative z-[1] -mt-10 pb-8">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (allChecked && !mutation.isPending) mutation.mutate();
            }}
            className="consent-panel space-y-6 rounded-3xl border border-border bg-background p-4 sm:space-y-8 sm:p-6 lg:p-8"
          >
            <section
              aria-labelledby="research-info-title"
              className="grid items-center gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,0.8fr)]"
            >
              <div className="min-w-0">
                <div className="mb-4 flex items-center gap-3 sm:gap-5">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-mint-light text-monitor-teal sm:size-16">
                    <FileText className="size-7 sm:size-8" aria-hidden="true" />
                  </span>
                  <h2 id="research-info-title" className="text-xl font-bold sm:text-2xl">
                    ข้อมูลโครงการวิจัย
                  </h2>
                </div>
                <div className="space-y-4 text-base leading-relaxed text-slate-text">
                  <p>
                    โครงการวิจัยนี้พัฒนาระบบ{" "}
                    <strong className="font-semibold text-slate-deep">
                      Personalized VR Gamified Learning System
                    </strong>{" "}
                    เพื่อส่งเสริมความสามารถในการให้ข้อเสนอแนะเชิงสร้างสรรค์ (Constructive Feedback)
                    ของอาจารย์มหาวิทยาลัย
                  </p>
                  <p>
                    ระบบจะเก็บข้อมูลการเรียนรู้ ผลการทดสอบ ข้อความถอดเสียง ผลการฝึก Scenario
                    และคำตอบแบบสอบถาม เพื่อการวิเคราะห์เชิงวิชาการ
                    ข้อมูลจะถูกเก็บเป็นความลับและใช้เฉพาะเพื่อการวิจัย
                    โดยไฟล์เสียงสำหรับฟังทบทวนจะเก็บชั่วคราวในอุปกรณ์และไม่อัปโหลดไปเก็บบนเซิร์ฟเวอร์
                  </p>
                  <p>ผู้เข้าร่วมมีสิทธิ์ถอนตัวจากการวิจัยเมื่อใดก็ได้โดยไม่มีผลกระทบใด ๆ</p>
                </div>
              </div>
              <img
                src={pdpaDocsArt}
                alt=""
                aria-hidden="true"
                className="pointer-events-none hidden w-full max-w-sm justify-self-end object-contain lg:block"
              />
            </section>

            <fieldset disabled={mutation.isPending} className="min-w-0 space-y-3 sm:space-y-4">
              <legend className="sr-only">ความยินยอมเข้าร่วมโครงการวิจัยทั้ง 3 ข้อ</legend>
              {choices.map(({ id, checked, change, icon: Icon, tone, title, description }) => (
                <label
                  key={id}
                  htmlFor={"consent-" + id}
                  className={
                    "consent-choice grid cursor-pointer items-center gap-3 rounded-2xl border p-4 transition-colors focus-within:ring-2 focus-within:ring-mint-primary/50 sm:gap-5 sm:p-5 " +
                    (checked
                      ? "border-mint-primary/60 bg-mint-primary/5"
                      : "border-border bg-background hover:border-mint-primary/50") +
                    (mutation.isPending ? " cursor-wait opacity-70" : "")
                  }
                >
                  <Checkbox
                    id={"consent-" + id}
                    checked={checked}
                    onCheckedChange={(v) => change(v === true)}
                    aria-labelledby={id + "-title"}
                    aria-describedby={id + "-description"}
                    className="consent-choice-check size-6 rounded-md border-control-border shadow-none data-[state=checked]:border-mint-primary data-[state=checked]:bg-mint-primary data-[state=checked]:text-white"
                  />
                  <span
                    aria-hidden="true"
                    className={
                      "consent-choice-icon flex size-11 shrink-0 items-center justify-center rounded-full sm:size-16 lg:size-20 " +
                      tone
                    }
                  >
                    <Icon className="size-6 sm:size-8" />
                  </span>
                  <span
                    id={id + "-title"}
                    className="consent-choice-title min-w-0 text-base font-bold sm:text-lg"
                  >
                    {title}
                  </span>
                  <span
                    id={id + "-description"}
                    className="consent-choice-description min-w-0 text-sm leading-relaxed text-slate-text sm:text-base"
                  >
                    {description}
                  </span>
                </label>
              ))}
            </fieldset>

            <div className="space-y-3">
              {mutation.isError && (
                <p
                  role="alert"
                  className="rounded-xl border border-destructive/30 p-3 text-sm text-destructive"
                >
                  {mutation.error.message}
                </p>
              )}
              <button
                type="submit"
                disabled={!allChecked || mutation.isPending}
                aria-describedby="consent-submit-help"
                className="flex min-h-14 w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-mint-primary to-monitor-teal px-4 py-4 text-base font-bold text-white shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-monitor-teal disabled:cursor-not-allowed disabled:opacity-50 sm:text-lg"
              >
                {mutation.isPending ? (
                  <Loader2 className="size-5 shrink-0 animate-spin" aria-hidden="true" />
                ) : null}
                <span>
                  {mutation.isPending
                    ? "กำลังบันทึกความยินยอม…"
                    : "บันทึกความยินยอมและดำเนินการต่อ"}
                </span>
                {!mutation.isPending && (
                  <ArrowRight className="size-6 shrink-0" aria-hidden="true" />
                )}
              </button>
              <p
                id="consent-submit-help"
                className="flex items-start justify-center gap-2 text-center text-sm text-slate-text"
              >
                <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>
                  {allChecked
                    ? "เลือกครบทั้ง 3 ข้อแล้ว สามารถบันทึกความยินยอมเพื่อดำเนินการต่อได้"
                    : "กรุณาให้ความยินยอมทั้ง 3 ข้อจึงจะเริ่มโครงการวิจัยได้"}
                </span>
              </p>
            </div>
          </form>
        </div>
      </div>
    </LearnerShell>
  );
}
