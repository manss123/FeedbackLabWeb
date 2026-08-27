import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { Loader2, User } from "lucide-react";
import { LearnerShell } from "@/components/learner-shell";
import {
  getLearnerOverview,
  markOnboardingCompletedLocally,
  submitOnboarding,
} from "@/lib/learner.functions";
import { toast } from "sonner";
import { getFirebaseAuth } from "@/lib/firebase";
import { waitForFirebaseUser } from "@/lib/firebase-auth";
import { getUserDoc, upsertUserDoc } from "@/lib/firestore";
import { logActivity } from "@/lib/activity";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "ข้อมูลพื้นฐาน — My Feedback Lab" },
      { name: "robots", content: "noindex" },
    ],
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

  useEffect(() => {
    if (data?.state && !data.state.consent_completed) {
      navigate({ to: "/consent", replace: true });
    } else if (data?.state?.onboarding_completed) {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [data, navigate]);

  // Same cross-device staleness guard as consent.tsx: the mock above is
  // per-browser, so a user who already submitted onboarding elsewhere would
  // otherwise sit through the form again here. Sync the mock (not just
  // navigate) or dashboard.tsx's own onboarding_completed check — mock-only —
  // immediately bounces them back to /onboarding in an infinite loop.
  const { data: userDoc } = useQuery({
    queryKey: ["onboarding-page-user-doc"],
    queryFn: async () => {
      const uid = getFirebaseAuth().currentUser?.uid ?? (await waitForFirebaseUser())?.uid;
      return uid ? getUserDoc(uid) : null;
    },
  });

  useEffect(() => {
    if (userDoc?.profile) {
      markOnboardingCompletedLocally();
      queryClient.invalidateQueries({ queryKey: ["learner-overview"] });
      navigate({ to: "/dashboard", replace: true });
    }
  }, [userDoc, navigate, queryClient]);

  const [form, setForm, clearFormDraft] = usePersistedState<{
    display_name: string;
    faculty: string;
    department: string;
    teaching_experience_years: string | number;
  }>("onboarding.form", {
    display_name: "",
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
        faculty: f.faculty || (data.profile?.faculty ?? ""),
        department: f.department || (data.profile?.department ?? ""),
        teaching_experience_years:
          f.teaching_experience_years || (data.profile?.teaching_experience_years ?? ""),
      }));
    }
  }, [data, setForm]);

  const mutation = useMutation({
    mutationFn: async () => {
      const result = await submitOnboarding({
        data: {
          display_name: form.display_name.trim(),
          faculty: form.faculty.trim(),
          department: form.department.trim() || null,
          teaching_experience_years: Number(form.teaching_experience_years) || 0,
        },
      });

      // Best-effort real persistence of the form content itself — session/
      // progress state (onboarding_completed, current_stage, points) stays
      // in the localStorage mock above; this never blocks navigation.
      const uid = getFirebaseAuth().currentUser?.uid ?? (await waitForFirebaseUser())?.uid;
      if (uid) {
        const authUser = getFirebaseAuth().currentUser;
        try {
          await upsertUserDoc(uid, {
            profile: {
              displayName: form.display_name.trim(),
              email: authUser?.email ?? "",
              avatarUrl: authUser?.photoURL ?? null,
              faculty: form.faculty.trim(),
              department: form.department.trim() || null,
              teachingExperienceYears: Number(form.teaching_experience_years) || 0,
            },
          });
          void logActivity({ type: "onboarding_completed" });
        } catch (e) {
          console.warn("Firestore profile write failed", e);
        }
      }

      return result;
    },
    onSuccess: () => {
      toast.success("บันทึกข้อมูลเรียบร้อย");
      clearFormDraft();
      queryClient.invalidateQueries({ queryKey: ["learner-overview"] });
      navigate({ to: "/dashboard" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <LearnerShell displayName={data?.profile?.display_name} avatarUrl={data?.profile?.avatar_url}>
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-mint-light px-3 py-1 text-xs font-bold uppercase tracking-wider text-mint-primary">
            <User className="h-3 w-3" />
            Step 2 of 3
          </div>
          <h1 className="text-3xl font-bold">ข้อมูลพื้นฐานผู้เข้าร่วมวิจัย</h1>
          <p className="text-slate-text">
            ข้อมูลนี้จะใช้เพื่อวิเคราะห์ผลการวิจัยและปรับเส้นทางการเรียนรู้ให้เหมาะกับคุณ
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          className="space-y-6 rounded-2xl border border-border bg-background p-8"
        >
          <Field label="ชื่อ-นามสกุลที่ต้องการให้แสดง">
            <input
              required
              value={form.display_name}
              onChange={(e) => setForm({ ...form, display_name: e.target.value })}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-mint-primary"
              placeholder="เช่น ผศ.ดร. ชื่อ นามสกุล"
            />
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="คณะ/สำนักวิชา">
              <input
                required
                value={form.faculty}
                onChange={(e) => setForm({ ...form, faculty: e.target.value })}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-mint-primary"
                placeholder="เช่น คณะครุศาสตร์"
              />
            </Field>
            <Field label="สาขาวิชา (ถ้ามี)">
              <input
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-mint-primary"
                placeholder="เช่น หลักสูตรและการสอน"
              />
            </Field>
          </div>

          <Field label="ประสบการณ์การสอน (ปี)">
            <input
              type="number"
              required
              min={0}
              max={80}
              value={form.teaching_experience_years}
              onChange={(e) => setForm({ ...form, teaching_experience_years: e.target.value })}
              className="w-40 rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-mint-primary"
            />
          </Field>




          <button
            type="submit"
            disabled={mutation.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-deep px-6 py-4 font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
          >
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            บันทึกและเข้าสู่แดชบอร์ด
          </button>
        </form>
      </div>
    </LearnerShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-deep">{label}</span>
      {children}
    </label>
  );
}
