import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { usePersistedState } from "@/hooks/use-persisted-state";
import {
  ArrowRight,
  BookOpen,
  Building2,
  Clock3,
  Landmark,
  Loader2,
  User,
  type LucideIcon,
} from "lucide-react";
import { LearnerShell } from "@/components/learner-shell";
import { getLearnerOverview, submitOnboarding } from "@/lib/learner.functions";
import { toast } from "sonner";
import { getFirebaseAuth } from "@/lib/firebase";
import { waitForFirebaseUser } from "@/lib/firebase-auth";
import { upsertUserDoc } from "@/lib/firestore";
import { logActivity } from "@/lib/activity";
import { learnerAccessKey } from "@/lib/learner-access";
import overviewBanner from "@/assets/banners/overview-banner.webp";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [{ title: "ข้อมูลพื้นฐาน — My Feedback Lab" }, { name: "robots", content: "noindex" }],
  }),
  component: OnboardingPage,
});

function OnboardingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["learner-overview"],
    queryFn: () => getLearnerOverview(),
  });

  const [form, setForm, clearFormDraft] = usePersistedState<{
    display_name: string;
    university: string;
    faculty: string;
    department: string;
    teaching_experience_years: string | number;
  }>("onboarding.form", {
    display_name: "",
    university: "",
    faculty: "",
    department: "",
    teaching_experience_years: "",
  });

  useEffect(() => {
    if (data?.profile) {
      setForm((f) => ({
        ...f,
        // only prefill empty fields — don't clobber the user's draft
        display_name: f.display_name || (data.profile?.display_name ?? ""),
        university: f.university || (data.profile?.university ?? ""),
        faculty: f.faculty || (data.profile?.faculty ?? ""),
        department: f.department || (data.profile?.department ?? ""),
        teaching_experience_years:
          f.teaching_experience_years === ""
            ? (data.profile?.teaching_experience_years ?? "")
            : f.teaching_experience_years,
      }));
    }
  }, [data, setForm]);

  const mutation = useMutation({
    mutationFn: async () => {
      const user = getFirebaseAuth().currentUser ?? (await waitForFirebaseUser());
      if (!user) throw new Error("กรุณาเข้าสู่ระบบอีกครั้ง");
      const displayName = form.display_name.trim();
      const university = form.university.trim();
      const faculty = form.faculty.trim();
      const teachingExperienceYears = Number(form.teaching_experience_years);
      if (
        !displayName ||
        !university ||
        !faculty ||
        form.teaching_experience_years === "" ||
        !Number.isFinite(teachingExperienceYears) ||
        teachingExperienceYears < 0 ||
        teachingExperienceYears > 80
      ) {
        throw new Error("กรุณากรอกข้อมูลพื้นฐานให้ครบถ้วน");
      }
      await upsertUserDoc(user.uid, {
        profile: {
          displayName,
          email: user.email ?? "",
          avatarUrl: user.photoURL,
          university,
          faculty,
          department: form.department.trim() || null,
          teachingExperienceYears,
        },
      });
      await queryClient.invalidateQueries({ queryKey: learnerAccessKey(user.uid) });
      const result = await submitOnboarding({
        data: {
          display_name: displayName,
          university,
          faculty,
          department: form.department.trim() || null,
          teaching_experience_years: teachingExperienceYears,
        },
      });
      void logActivity({ type: "onboarding_completed" });
      return result;
    },
    onSuccess: () => {
      toast.success("บันทึกข้อมูลเรียบร้อย");
      clearFormDraft();
      queryClient.invalidateQueries({ queryKey: ["learner-overview"] });
      navigate({ to: "/overview" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const inputClass =
    "min-h-14 w-full min-w-0 rounded-r-xl bg-transparent px-3 py-3 text-base text-slate-deep outline-none placeholder:text-slate-text/65 sm:px-4";

  return (
    <LearnerShell
      wide
      displayName={data?.profile?.display_name}
      avatarUrl={data?.profile?.avatar_url}
    >
      <div className="w-full">
        <header className="relative isolate overflow-hidden pb-12">
          <img
            src={overviewBanner}
            alt=""
            aria-hidden="true"
            className="setup-banner-art pointer-events-none absolute right-0 top-0 -z-20 h-full w-auto max-w-none object-contain object-right"
          />
          <div
            aria-hidden="true"
            className="setup-banner-wash pointer-events-none absolute inset-0 -z-10 bg-gradient-to-r from-background/95 via-background/90 to-background/50 lg:via-background/50 lg:to-transparent"
          />
          <div className="app-content-container py-6 sm:py-8">
            <div className="space-y-3 lg:w-[65%]">
              <p className="inline-flex items-center gap-2 rounded-full bg-mint-light px-4 py-2 text-sm font-bold text-monitor-teal">
                <User className="size-4" aria-hidden="true" /> STEP 2 OF 3
              </p>
              <h1 className="text-2xl font-bold leading-snug text-slate-deep sm:text-3xl">
                ข้อมูลพื้นฐานผู้เข้าร่วมวิจัย
              </h1>
              <p className="text-base leading-relaxed text-slate-text sm:text-lg">
                ข้อมูลนี้จะใช้เพื่อวิเคราะห์ผลการวิจัยและปรับเส้นทางการเรียนรู้ให้เหมาะกับคุณ
              </p>
            </div>
          </div>
        </header>

        <div className="app-content-container relative z-[1] -mt-10 pb-8">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!mutation.isPending) mutation.mutate();
            }}
            className="consent-panel space-y-5 rounded-3xl border border-border bg-background p-4 sm:space-y-6 sm:p-6 lg:p-8"
            aria-labelledby="onboarding-form-title"
          >
            <div className="flex items-start gap-3 sm:items-center sm:gap-5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-mint-light text-monitor-teal sm:size-12">
                <User className="size-6" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2 id="onboarding-form-title" className="text-lg font-bold sm:text-xl">
                  ข้อมูลของคุณ
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-slate-text">
                  กรุณากรอกช่องที่มีเครื่องหมาย * ให้ครบถ้วน
                </p>
              </div>
            </div>

            <fieldset disabled={mutation.isPending} className="min-w-0 space-y-5">
              <legend className="sr-only">
                ข้อมูลพื้นฐาน ช่องที่มีเครื่องหมายดอกจันจำเป็นต้องกรอก
              </legend>
              <div className="grid gap-5 md:grid-cols-2">
                <Field
                  id="display-name"
                  label="ชื่อ-นามสกุลที่ต้องการให้แสดง"
                  icon={User}
                  required
                  hint="สามารถใช้นามแฝงได้"
                >
                  <input
                    id="display-name"
                    name="display_name"
                    autoComplete="nickname"
                    aria-describedby="display-name-hint"
                    required
                    value={form.display_name}
                    onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                    className={inputClass}
                    placeholder="เช่น อาจารย์ทดลองใช้งาน"
                  />
                </Field>

                <Field id="university" label="มหาวิทยาลัย" icon={Building2} required>
                  <input
                    id="university"
                    name="university"
                    autoComplete="organization"
                    required
                    value={form.university}
                    onChange={(e) => setForm({ ...form, university: e.target.value })}
                    className={inputClass}
                    placeholder="มหาวิทยาลัยมหิดล"
                  />
                </Field>
              </div>

              <div className="grid gap-5 md:grid-cols-2 min-[1440px]:grid-cols-3">
                <Field id="faculty" label="คณะ/สำนักวิชา" icon={Landmark} required>
                  <input
                    id="faculty"
                    name="faculty"
                    required
                    value={form.faculty}
                    onChange={(e) => setForm({ ...form, faculty: e.target.value })}
                    className={inputClass}
                    placeholder="เช่น คณะครุศาสตร์"
                  />
                </Field>
                <Field id="department" label="สาขาวิชา (ถ้ามี)" icon={BookOpen}>
                  <input
                    id="department"
                    name="department"
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                    className={inputClass}
                    placeholder="เช่น หลักสูตรและการสอน"
                  />
                </Field>
                <Field
                  id="teaching-years"
                  label="ประสบการณ์การสอน (ปี)"
                  icon={Clock3}
                  required
                  hint="ระบุ 0–80 ปี"
                >
                  <input
                    id="teaching-years"
                    name="teaching_experience_years"
                    aria-describedby="teaching-years-hint"
                    type="number"
                    inputMode="numeric"
                    required
                    min={0}
                    max={80}
                    value={form.teaching_experience_years}
                    onChange={(e) =>
                      setForm({ ...form, teaching_experience_years: e.target.value })
                    }
                    className={inputClass}
                    placeholder="เช่น 5"
                  />
                </Field>
              </div>
            </fieldset>

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
              disabled={mutation.isPending}
              className="flex min-h-14 w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-mint-primary to-monitor-teal px-4 py-4 text-base font-bold text-white shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-monitor-teal disabled:cursor-not-allowed disabled:opacity-50 sm:text-lg"
            >
              {mutation.isPending ? (
                <Loader2 className="size-5 shrink-0 animate-spin" aria-hidden="true" />
              ) : null}
              <span>{mutation.isPending ? "กำลังบันทึกข้อมูล…" : "บันทึกและเข้าสู่แดชบอร์ด"}</span>
              {!mutation.isPending && <ArrowRight className="size-6 shrink-0" aria-hidden="true" />}
            </button>
          </form>
        </div>
      </div>
    </LearnerShell>
  );
}

function Field({
  id,
  label,
  icon: Icon,
  hint,
  required = false,
  children,
}: {
  id: string;
  label: string;
  icon: LucideIcon;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-2 block text-base font-bold text-slate-deep sm:text-lg">
        {label}
        {required && (
          <span aria-hidden="true" className="ml-2 text-destructive">
            *
          </span>
        )}
      </label>
      <div className="flex min-w-0 items-stretch overflow-hidden rounded-xl border border-border bg-background transition-colors focus-within:border-mint-primary focus-within:ring-2 focus-within:ring-mint-primary/20">
        <span
          aria-hidden="true"
          className="flex w-11 shrink-0 items-center justify-center border-r border-border text-slate-text sm:w-14"
        >
          <Icon className="size-5 sm:size-6" />
        </span>
        {children}
      </div>
      {hint && (
        <p id={id + "-hint"} className="mt-2 text-sm leading-relaxed text-slate-text">
          {hint}
        </p>
      )}
    </div>
  );
}
