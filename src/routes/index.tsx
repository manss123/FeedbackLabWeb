import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Glasses, Loader2 } from "lucide-react";
import { FirebaseError } from "firebase/app";
import { toast } from "sonner";
import heroImage from "@/assets/hero-web-vr-lecturer.webp";
import heroBg from "@/assets/BG.webp";
import iconChat from "@/assets/icons/icon-1.webp";
import iconBarChart from "@/assets/icons/icon-2.webp";
import iconGradCap from "@/assets/icons/icon-3.webp";
import iconBook from "@/assets/icons/icon-7.webp";
import iconBulb from "@/assets/icons/icon-8.webp";
import { signInWithGoogle } from "@/lib/firebase-auth";
import { isSignedIn, setAuthFromFirebaseUser } from "@/lib/learner.functions";
import { logActivity } from "@/lib/activity";

export const Route = createFileRoute("/")({
  // isSignedIn() reads the localStorage mock — client-only, same reason
  // _authenticated/route.tsx and auth.tsx disable SSR. Without this, an
  // already-logged-in visitor's first (SSR'd) load of "/" would render the
  // full landing page before the guard ever got a chance to run.
  ssr: false,
  beforeLoad: async () => {
    if (isSignedIn()) throw redirect({ to: "/overview" });
  },
  component: Home,
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

function Home() {
  const navigate = useNavigate();
  const [signingIn, setSigningIn] = useState(false);

  const handleGoogleSignIn = async () => {
    setSigningIn(true);
    try {
      const user = await signInWithGoogle();
      setAuthFromFirebaseUser({
        id: user.uid,
        email: user.email ?? "",
        name: user.displayName,
      });
      void logActivity({ type: "signed_in" });
      toast.success("เข้าสู่ระบบสำเร็จ");
      navigate({ to: "/overview", replace: true });
    } catch (e) {
      if (e instanceof FirebaseError && e.code === "auth/popup-closed-by-user") {
        setSigningIn(false);
        return;
      }
      toast.error("เข้าสู่ระบบไม่สำเร็จ", {
        description: e instanceof Error ? e.message : String(e),
      });
      setSigningIn(false);
    }
  };

  return (
    <div
      className="flex min-h-dvh flex-col bg-background bg-cover bg-center bg-fixed bg-no-repeat font-prompt text-slate-deep"
      style={{ backgroundImage: `url(${heroBg})` }}
    >
      {/* Navigation — px is a vw-based clamp (not a breakpoint list) so the
          gutter keeps scaling smoothly past xl instead of freezing there;
          max-w-[2400px] only kicks in as a ceiling on very wide/ultrawide
          monitors. */}
      <nav className="mx-auto flex w-full max-w-[2400px] items-center justify-between px-[clamp(1.5rem,4vw,5rem)] py-[clamp(1.5rem,2.2vw,2.25rem)]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-mint-primary">
            <Glasses className="h-5 w-5 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-2xl font-bold tracking-tight">My Feedback Lab</span>
        </div>
        <button
          onClick={handleGoogleSignIn}
          disabled={signingIn}
          className="flex items-center gap-2.5 rounded-full bg-background px-6 py-3 text-sm font-bold shadow-lg transition-colors hover:bg-mint-light disabled:opacity-60"
        >
          {signingIn ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <GoogleGlyph className="h-4 w-4" />
          )}
          {signingIn ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบด้วย Google"}
        </button>
      </nav>

      {/* Hero — flex-1 fills whatever vertical space is left below the nav,
          so the fold reaches the bottom of the viewport on tall/wide screens
          instead of leaving dead space, matching the reference's full-bleed
          first impression on any device. */}
      <header
        id="home"
        className="relative mx-auto grid w-full max-w-[2400px] flex-1 items-center gap-12 px-[clamp(1.5rem,4vw,5rem)] py-[clamp(2rem,6vw,5rem)] lg:grid-cols-2 lg:gap-[clamp(3rem,6vw,7rem)]"
      >
        {/* Book + bulb float across the whole hero (not just the photo
            column) to match the reference, where they sit near the page's
            left margin and above the column gap rather than hugging the
            photo's edge. */}
        <img
          src={iconBook}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute left-[-6vw] top-[16%] z-10 hidden h-[clamp(5.5rem,9vw,11rem)] w-[clamp(5.5rem,9vw,11rem)] -rotate-6 drop-shadow-xl lg:block"
        />
        <img
          src={iconBulb}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute left-[40%] top-[4%] z-10 hidden h-[clamp(5.5rem,9vw,11rem)] w-[clamp(5.5rem,9vw,11rem)] rotate-6 drop-shadow-xl lg:block"
        />
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-mint-light px-3 py-1 text-xs font-bold uppercase tracking-wider text-mint-primary">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mint-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-mint-primary" />
            </span>
            Research-Based Learning
          </div>
          <h1 className="text-[clamp(2.75rem,5vw,5.5rem)] font-bold leading-[1.15] text-slate-deep">
            พัฒนาทักษะ <br />
            <span className="text-mint-primary">Constructive Feedback</span> ด้วยเทคโนโลยี VR
          </h1>
          <p className="max-w-xl text-[clamp(1.05rem,1.3vw,1.35rem)] leading-relaxed text-slate-text">
            ยกระดับทักษะการให้ข้อมูลย้อนกลับสำหรับอาจารย์มหาวิทยาลัย
            ผ่านระบบจำลองสถานการณ์เสมือนจริงที่วิเคราะห์ด้วย NLP และระบบการเรียนรู้เฉพาะบุคคล
          </p>
          <button
            onClick={handleGoogleSignIn}
            disabled={signingIn}
            className="inline-flex items-center justify-center gap-3 rounded-xl bg-mint-primary px-[clamp(2rem,3vw,3rem)] py-[clamp(1rem,1.6vw,1.5rem)] text-[clamp(1rem,1.2vw,1.25rem)] font-bold text-white shadow-lg transition-all hover:opacity-90 disabled:opacity-60"
          >
            {signingIn ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <GoogleGlyph className="h-5 w-5" />
            )}
            {signingIn ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบด้วย Google"}
          </button>
        </div>
        <div className="relative">
          <div className="pointer-events-none absolute -left-8 -top-8 hidden grid-cols-5 gap-1.5 opacity-50 lg:grid">
            {Array.from({ length: 15 }).map((_, i) => (
              <span key={i} className="h-1.5 w-1.5 rounded-full bg-mint-primary/50" />
            ))}
          </div>

          {/* Floating decorative icons — echo the reference's scattered
              3D-sticker badges around the photo. Each PNG already has its
              own glossy card/background baked in, so they're placed bare
              (no extra wrapper card) with a drop-shadow for lift. */}
          <img
            src={iconChat}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute -right-8 -top-8 z-10 hidden h-[clamp(3.5rem,6vw,7rem)] w-[clamp(3.5rem,6vw,7rem)] rotate-6 drop-shadow-xl lg:block"
          />
          <img
            src={iconBarChart}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute -right-12 top-1/2 z-10 hidden h-[clamp(3rem,5vw,6rem)] w-[clamp(3rem,5vw,6rem)] -translate-y-1/2 -rotate-6 drop-shadow-xl lg:block"
          />
          <img
            src={iconGradCap}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-8 -right-8 z-10 hidden h-[clamp(3.5rem,6vw,7rem)] w-[clamp(3.5rem,6vw,7rem)] rotate-3 drop-shadow-xl lg:block"
          />

          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[2rem] shadow-2xl outline outline-1 -outline-offset-1 outline-black/5">
            <img
              src={heroImage}
              alt="อาจารย์มหาวิทยาลัยกำลังใช้งานระบบ VR-web based บนแล็ปท็อป พร้อมอินเทอร์เฟซวิเคราะห์การให้ข้อมูลย้อนกลับแบบเสมือนจริง"
              width={1200}
              height={900}
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </header>
    </div>
  );
}
