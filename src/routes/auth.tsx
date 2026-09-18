import { createFileRoute, useNavigate, Link, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Glasses, Loader2 } from "lucide-react";
import { loadLearnerAccess } from "@/lib/learner-access";
import { LearnerAccessError, LearnerAccessPending } from "@/components/learner-access-state";
import { signInWithGoogle } from "@/lib/firebase-auth";
import { logActivity } from "@/lib/activity";
import { toast } from "sonner";
import { FirebaseError } from "firebase/app";

export const Route = createFileRoute("/auth")({
  ssr: false,
  beforeLoad: async ({ context }) => {
    const access = await loadLearnerAccess(context.queryClient);
    if (access) throw redirect({ to: access.destination, replace: true });
  },
  pendingComponent: LearnerAccessPending,
  pendingMs: 0,
  errorComponent: LearnerAccessError,
  head: () => ({
    meta: [
      { title: "เข้าสู่ระบบ — My Feedback Lab" },
      {
        name: "description",
        content: "เข้าสู่ระบบด้วย Google เพื่อใช้งานระบบพัฒนาทักษะ Constructive Feedback",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function GoogleGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.99.66-2.25 1.06-3.72 1.06-2.86 0-5.28-1.93-6.15-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.85 14.11A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.35-2.11V7.05H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.95l3.67-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.2 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.67 2.84C6.72 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}

function AuthPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  const handleGoogle = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      const access = await loadLearnerAccess(queryClient);
      if (!access) throw new Error("ไม่พบการเข้าสู่ระบบ กรุณาลองอีกครั้ง");
      void logActivity({ type: "signed_in" });
      toast.success("เข้าสู่ระบบสำเร็จ");
      await navigate({ to: access.destination, replace: true });
    } catch (e) {
      if (e instanceof FirebaseError && e.code === "auth/popup-closed-by-user") {
        setLoading(false);
        return;
      }
      toast.error("เข้าสู่ระบบไม่สำเร็จ", {
        description: e instanceof Error ? e.message : String(e),
      });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background font-prompt text-slate-deep">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-8 py-6">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-mint-primary">
            <Glasses className="h-5 w-5 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-xl font-bold tracking-tight">My Feedback Lab</span>
        </Link>
      </nav>

      <main className="mx-auto flex max-w-md flex-col gap-8 px-8 py-16">
        <div className="space-y-3 text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full bg-mint-light px-3 py-1 text-xs font-bold uppercase tracking-wider text-mint-primary">
            UI Prototype
          </div>
          <h1 className="text-3xl font-bold">ยินดีต้อนรับ</h1>
          <p className="text-slate-text">
            เข้าสู่ระบบด้วยบัญชี Google —
            ข้อมูลความก้าวหน้าในการเรียนยังบันทึกเฉพาะในเบราว์เซอร์ของคุณเท่านั้น
          </p>
        </div>

        <div className="space-y-4 rounded-2xl border border-border bg-background p-8 shadow-sm">
          <button
            onClick={handleGoogle}
            disabled={loading}
            className="flex w-full items-center justify-center gap-3 rounded-xl border-2 border-border bg-background px-6 py-4 font-bold text-slate-deep transition-all hover:border-mint-primary hover:bg-mint-light disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <GoogleGlyph className="h-5 w-5" />
            )}
            {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบด้วย Google"}
          </button>
        </div>

        <div className="text-center">
          <Link to="/" className="text-sm font-medium text-slate-text hover:text-slate-deep">
            ← กลับหน้าแรก
          </Link>
        </div>
      </main>
    </div>
  );
}
