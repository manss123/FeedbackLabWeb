import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Stethoscope,
  BookOpenText,
  Glasses,
  Award,
  Heart,
  MessageSquare,
  Sparkles,
  Target,
  CheckCircle2,
  PlayCircle,
  Loader2,
} from "lucide-react";
import { FirebaseError } from "firebase/app";
import { toast } from "sonner";
import heroImage from "@/assets/hero-web-vr-lecturer.jpg";
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
    if (isSignedIn()) throw redirect({ to: "/dashboard" });
  },
  component: Home,
});

const coreComponents = [
  {
    step: "01",
    title: "Diagnostic Test",
    icon: Stethoscope,
    desc: "แบบวัดทักษะพื้นฐานเพื่อวิเคราะห์จุดแข็งและสิ่งที่ควรพัฒนาเป็นรายบุคคล",
  },
  {
    step: "02",
    title: "Cognitive Modules",
    icon: BookOpenText,
    desc: "เรียนรู้องค์ความรู้ด้านทักษะการสื่อสารผ่านสื่อปฏิสัมพันธ์และทฤษฎีล่าสุด",
  },
  {
    step: "03",
    title: "VR Simulation",
    icon: Glasses,
    desc: "ฝึกปฏิบัติในโลกเสมือนจริงกับนักศึกษา AI พร้อมระบบวิเคราะห์เสียงและท่าทาง",
  },
  {
    step: "04",
    title: "Certificate",
    icon: Award,
    desc: "ทดสอบหลังเรียนเพื่อรับใบประกาศนียบัตรรับรองวิทยฐานะและทักษะวิชาชีพ",
  },
];

const dimensions = [
  { title: "Empathy", desc: "ความเข้าอกเข้าใจนักศึกษา", icon: Heart, offset: false },
  { title: "Clarity", desc: "ความชัดเจนของข้อมูล", icon: MessageSquare, offset: true },
  { title: "Motivation", desc: "การสร้างแรงจูงใจ", icon: Sparkles, offset: false },
  { title: "Actionability", desc: "การนำไปปฏิบัติได้จริง", icon: Target, offset: true },
];

function GoogleGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.99.66-2.25 1.06-3.72 1.06-2.86 0-5.28-1.93-6.15-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.85 14.11A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.35-2.11V7.05H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.95l3.67-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.2 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.67 2.84C6.72 7.31 9.14 5.38 12 5.38z" />
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
      navigate({ to: "/dashboard", replace: true });
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
    <div className="min-h-screen bg-background font-prompt text-slate-deep">
      {/* Navigation */}
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-8 py-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-mint-primary">
            <Glasses className="h-5 w-5 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-xl font-bold tracking-tight">My Feedback Lab</span>
        </div>
        <div className="hidden gap-8 text-sm font-medium text-slate-text md:flex">
          <a href="#home" className="hover:text-slate-deep">หน้าแรก</a>
          <a href="#components" className="hover:text-slate-deep">หลักสูตร</a>
          <a href="#dimensions" className="hover:text-slate-deep">งานวิจัย</a>
          <a href="#contact" className="hover:text-slate-deep">ติดต่อเรา</a>
        </div>
        <button
          onClick={handleGoogleSignIn}
          disabled={signingIn}
          className="flex items-center gap-2 rounded-full border border-border bg-background px-5 py-2 text-sm font-semibold shadow-sm transition-colors hover:bg-mint-light disabled:opacity-60"
        >
          {signingIn ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <GoogleGlyph className="h-4 w-4" />
          )}
          {signingIn ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบด้วย Google"}
        </button>
      </nav>

      {/* Hero */}
      <header id="home" className="mx-auto grid max-w-7xl items-center gap-12 px-8 py-16 lg:grid-cols-2 lg:py-24">
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-mint-light px-3 py-1 text-xs font-bold uppercase tracking-wider text-mint-primary">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mint-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-mint-primary" />
            </span>
            Research-Based Learning
          </div>
          <h1 className="text-5xl font-bold leading-[1.15] text-slate-deep lg:text-6xl">
            พัฒนาทักษะ <br />
            <span className="text-mint-primary">Constructive Feedback</span> ด้วยเทคโนโลยี VR
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-slate-text">
            ยกระดับทักษะการให้ข้อมูลย้อนกลับสำหรับอาจารย์มหาวิทยาลัย ผ่านระบบจำลองสถานการณ์เสมือนจริงที่วิเคราะห์ด้วย NLP และระบบการเรียนรู้เฉพาะบุคคล
          </p>
          <div className="flex flex-wrap gap-4">
            <Link to="/auth" className="rounded-xl bg-slate-deep px-8 py-4 font-bold text-white transition-all hover:opacity-90">
              เริ่มต้นใช้งานฟรี
            </Link>
            <button className="inline-flex items-center gap-2 rounded-xl border-2 border-border bg-background px-8 py-4 font-bold text-slate-deep transition-all hover:border-mint-primary">
              <PlayCircle className="h-5 w-5" />
              ดูวิดีโอแนะนำ
            </button>
          </div>
        </div>
        <div className="relative">
          <div className="aspect-[4/3] w-full overflow-hidden rounded-[2rem] shadow-2xl outline outline-1 -outline-offset-1 outline-black/5">
            <img
              src={heroImage}
              alt="อาจารย์มหาวิทยาลัยกำลังใช้งานระบบ VR-web based บนแล็ปท็อป พร้อมอินเทอร์เฟซวิเคราะห์การให้ข้อมูลย้อนกลับแบบเสมือนจริง"
              width={1200}
              height={900}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="absolute -bottom-6 -left-6 rounded-2xl border border-border bg-background p-6 shadow-xl">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-mint-light">
                <Sparkles className="h-6 w-6 text-mint-primary" />
              </div>
              <div>
                <div className="text-xs font-medium text-slate-text">ความแม่นยำการวิเคราะห์</div>
                <div className="text-xl font-bold">98.4% AI Analysis</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 4 Core Components */}
      <section id="components" className="bg-secondary py-24">
        <div className="mx-auto max-w-7xl px-8">
          <div className="mb-16 space-y-4 text-center">
            <h2 className="text-3xl font-bold">4 ขั้นตอนสู่ความเป็นเลิศ</h2>
            <p className="text-slate-text">โครงสร้างหลักสูตรที่ออกแบบตามหลักจิตวิทยาการเรียนรู้</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {coreComponents.map(({ step, title, icon: Icon, desc }) => (
              <div
                key={step}
                className="group rounded-2xl border border-border bg-background p-8 transition-all hover:border-mint-primary/50"
              >
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-mint-light text-xl font-bold text-mint-primary transition-transform group-hover:scale-110">
                  <Icon className="h-6 w-6" />
                </div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-mint-primary">
                  {step}
                </div>
                <h3 className="mb-3 font-bold">{title}</h3>
                <p className="text-sm leading-relaxed text-slate-text">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dimensions */}
      <section id="dimensions" className="py-24">
        <div className="mx-auto max-w-7xl px-8">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <div className="grid grid-cols-2 gap-4">
              {dimensions.map(({ title, desc, icon: Icon, offset }) => (
                <div
                  key={title}
                  className={`space-y-3 rounded-2xl bg-secondary p-6 ${offset ? "mt-8" : ""}`}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background shadow-sm">
                    <Icon className="h-5 w-5 text-mint-primary" />
                  </div>
                  <div className="font-bold">{title}</div>
                  <div className="text-xs text-slate-text">{desc}</div>
                </div>
              ))}
            </div>
            <div className="space-y-6">
              <h2 className="text-4xl font-bold">ประเมินอย่างละเอียดด้วย 4 มิติสำคัญ</h2>
              <p className="leading-relaxed text-slate-text">
                ระบบของเราไม่ได้ประเมินแค่คำพูด แต่ยังวิเคราะห์บริบทของการสื่อสาร (Speech/NLP Analysis) เพื่อให้แน่ใจว่าการให้ Feedback ของคุณสร้างผลลัพธ์ที่ดีที่สุดต่อตัวนักศึกษา
              </p>
              <ul className="space-y-4">
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-mint-primary" />
                  <span className="font-medium">การสะสมแต้มและเหรียญรางวัล (Gamification)</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-mint-primary" />
                  <span className="font-medium">แดชบอร์ดติดตามความคืบหน้าส่วนบุคคล</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-mint-primary" />
                  <span className="font-medium">เส้นทางการเรียนรู้เฉพาะบุคคล (Personalized Path)</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="contact" className="mx-auto max-w-7xl px-8 pb-24">
        <div className="relative overflow-hidden rounded-[3rem] bg-slate-deep p-12 text-center lg:p-20">
          <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-mint-primary/10 blur-[100px]" />
          <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-mint-primary/10 blur-[100px]" />
          <div className="relative z-10 space-y-8">
            <h2 className="text-4xl font-bold text-white lg:text-5xl">
              พร้อมยกระดับการสอนของคุณหรือยัง?
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-white/70">
              เข้าร่วมงานวิจัยและพัฒนาทักษะการให้ Feedback ร่วมกับอาจารย์จากมหาวิทยาลัยชั้นนำทั่วประเทศ
            </p>
            <Link
              to="/auth"
              className="inline-flex items-center gap-4 rounded-2xl bg-background px-10 py-5 text-lg font-bold text-slate-deep shadow-xl shadow-black/20 transition-all hover:bg-mint-light"
            >
              <GoogleGlyph className="h-6 w-6" />
              เข้าสู่ระบบด้วยบัญชี Google
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-12 text-center text-sm text-slate-text">
        © 2024 My Feedback Lab Research Project. สงวนลิขสิทธิ์ทุกประการ
      </footer>
    </div>
  );
}
