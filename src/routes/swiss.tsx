import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Stethoscope,
  BookOpenText,
  Glasses,
  Award,
  Heart,
  MessageSquare,
  Sparkles,
  Target,
  ArrowUpRight,
  ArrowRight,
} from "lucide-react";
import heroImage from "@/assets/hero-web-vr-lecturer.jpg";

export const Route = createFileRoute("/swiss")({
  component: SwissHome,
  head: () => ({
    meta: [
      { title: "My Feedback Lab — Swiss Edition" },
      {
        name: "description",
        content:
          "หน้าโฮมเพจธีม Swiss Structural สำหรับ My Feedback Lab — ระบบพัฒนาทักษะ Constructive Feedback ด้วยเทคโนโลยี VR",
      },
    ],
  }),
});

const components = [
  {
    n: "01",
    title: "Diagnostic Test",
    thai: "แบบวัดทักษะพื้นฐาน",
    icon: Stethoscope,
    desc: "วิเคราะห์จุดแข็งและสิ่งที่ควรพัฒนาเป็นรายบุคคลก่อนเริ่มหลักสูตร",
  },
  {
    n: "02",
    title: "Cognitive Modules",
    thai: "องค์ความรู้เชิงลึก",
    icon: BookOpenText,
    desc: "เรียนรู้ทฤษฎีการสื่อสารและ Constructive Feedback ผ่านสื่อปฏิสัมพันธ์",
  },
  {
    n: "03",
    title: "VR Simulation",
    thai: "จำลองสถานการณ์เสมือน",
    icon: Glasses,
    desc: "ฝึกปฏิบัติกับนักศึกษา AI พร้อมการวิเคราะห์เสียงและท่าทางแบบเรียลไทม์",
  },
  {
    n: "04",
    title: "Certification",
    thai: "ทดสอบและรับรอง",
    icon: Award,
    desc: "แบบทดสอบหลังเรียนเพื่อรับใบประกาศนียบัตรรับรองวิทยฐานะ",
  },
];

const dimensions = [
  { code: "E", title: "Empathy", thai: "ความเข้าอกเข้าใจ", icon: Heart, pct: "96" },
  { code: "C", title: "Clarity", thai: "ความชัดเจน", icon: MessageSquare, pct: "94" },
  { code: "M", title: "Motivation", thai: "การสร้างแรงจูงใจ", icon: Sparkles, pct: "91" },
  { code: "A", title: "Actionability", thai: "นำไปปฏิบัติได้", icon: Target, pct: "93" },
];

function SwissHome() {
  return (
    <div className="min-h-screen bg-white font-prompt text-black">
      {/* Top ticker */}
      <div className="border-b border-black bg-black text-white">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-2 text-[11px] font-medium uppercase tracking-[0.2em]">
          <span>Research Edition · 2024</span>
          <span className="hidden sm:inline">Desktop VR × NLP × Personalized Learning</span>
          <span>TH / EN</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="border-b border-black">
        <div className="mx-auto grid max-w-[1400px] grid-cols-12 items-center px-6 py-5">
          <div className="col-span-6 flex items-center gap-3 md:col-span-3">
            <div className="flex h-9 w-9 items-center justify-center bg-black text-white">
              <span className="text-sm font-black">FL</span>
            </div>
            <div className="leading-tight">
              <div className="text-sm font-black uppercase tracking-widest">FeedbackLab</div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-neutral-500">VR / Swiss Ed.</div>
            </div>
          </div>
          <div className="col-span-6 hidden justify-center gap-8 text-[13px] font-medium uppercase tracking-widest md:flex">
            <a href="#program">Program</a>
            <a href="#analysis">Analysis</a>
            <a href="#research">Research</a>
            <a href="#contact">Contact</a>
          </div>
          <div className="col-span-6 flex justify-end md:col-span-3">
            <Link
              to="/"
              className="inline-flex items-center gap-1 border border-black px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-black hover:text-white"
            >
              Mint Edition <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="border-b border-black">
        <div className="mx-auto grid max-w-[1400px] grid-cols-12 gap-0">
          {/* Left index */}
          <aside className="col-span-12 border-b border-black px-6 py-6 md:col-span-2 md:border-b-0 md:border-r md:py-10">
            <div className="text-[11px] font-medium uppercase tracking-[0.3em] text-neutral-500">
              Issue
            </div>
            <div className="mt-1 text-3xl font-black">№ 01</div>
            <div className="mt-8 space-y-3 text-[11px] uppercase tracking-[0.2em] text-neutral-600">
              <div className="flex justify-between border-b border-black pb-1">
                <span>Field</span><span className="text-black">Edu VR</span>
              </div>
              <div className="flex justify-between border-b border-black pb-1">
                <span>Audience</span><span className="text-black">Faculty</span>
              </div>
              <div className="flex justify-between border-b border-black pb-1">
                <span>Method</span><span className="text-black">NLP + VR</span>
              </div>
            </div>
          </aside>

          {/* Headline */}
          <div className="col-span-12 border-b border-black px-6 py-10 md:col-span-7 md:border-b-0 md:border-r md:py-16">
            <div className="mb-6 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.3em]">
              <span className="inline-block h-2 w-2 bg-[#e63946]" />
              Research-Based Learning Platform
            </div>
            <h1 className="text-[clamp(3rem,7vw,6.5rem)] font-black uppercase leading-[0.92] tracking-tight">
              Construct<span className="text-[#e63946]">.</span>
              <br />
              Feed<span className="italic font-serif font-normal">back</span>
              <br />
              in VR<span className="text-[#e63946]">_</span>
            </h1>
            <p className="mt-8 max-w-xl text-base leading-relaxed text-neutral-700">
              พัฒนาทักษะการให้ข้อมูลย้อนกลับเชิงสร้างสรรค์ของอาจารย์มหาวิทยาลัย ผ่านห้องเรียนเสมือนจริง
              ที่วัดผลด้วยการวิเคราะห์เสียง ภาษา และการแสดงออก แบบเรียลไทม์
            </p>
            <div className="mt-10 flex flex-wrap gap-0">
              <button className="group inline-flex items-center gap-3 bg-black px-7 py-4 text-sm font-bold uppercase tracking-widest text-white">
                Start with Google
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
              <button className="inline-flex items-center gap-3 border border-l-0 border-black px-7 py-4 text-sm font-bold uppercase tracking-widest hover:bg-black hover:text-white">
                Watch demo
              </button>
            </div>
          </div>

          {/* Image column */}
          <div className="col-span-12 md:col-span-3">
            <div className="relative h-full min-h-[280px] overflow-hidden bg-neutral-100">
              <img
                src={heroImage}
                alt="อาจารย์กำลังใช้งานระบบ VR-web based บนแล็ปท็อป พร้อมอินเทอร์เฟซวิเคราะห์การให้ข้อมูลย้อนกลับแบบเสมือนจริง"
                className="h-full w-full object-cover grayscale"
              />
              <div className="absolute inset-0 mix-blend-multiply" style={{ background: "linear-gradient(180deg,transparent 60%,#e63946 100%)" }} />
              <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between text-white">
                <div className="text-[10px] uppercase tracking-[0.3em]">Plate 01 / VR-Web</div>
                <div className="text-2xl font-black">98.4%</div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div className="border-t border-black">
          <div className="mx-auto grid max-w-[1400px] grid-cols-2 md:grid-cols-4">
            {[
              { k: "AI Accuracy", v: "98.4%" },
              { k: "Faculty Trained", v: "1,240+" },
              { k: "Feedback Loops", v: "36,800" },
              { k: "Universities", v: "12" },
            ].map((s, i) => (
              <div
                key={s.k}
                className={`px-6 py-6 ${i !== 3 ? "md:border-r border-black" : ""} ${i < 2 ? "border-b md:border-b-0" : ""}`}
              >
                <div className="text-[11px] font-medium uppercase tracking-[0.3em] text-neutral-500">
                  {s.k}
                </div>
                <div className="mt-2 text-4xl font-black tracking-tight">{s.v}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Program / 4 components */}
      <section id="program" className="border-b border-black">
        <div className="mx-auto max-w-[1400px] px-6 py-16">
          <div className="mb-12 grid grid-cols-12 gap-6">
            <div className="col-span-12 md:col-span-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#e63946]">
                Section A
              </div>
              <h2 className="mt-3 text-4xl font-black uppercase leading-none">
                The<br />Program
              </h2>
            </div>
            <p className="col-span-12 max-w-2xl self-end text-base leading-relaxed text-neutral-700 md:col-span-8">
              โครงสร้างหลักสูตรออกแบบตามหลักจิตวิทยาการเรียนรู้และการวัดผลเชิงพฤติกรรม
              แบ่งเป็น 4 ส่วนที่เชื่อมโยงกันแบบวงจร ตั้งแต่การวินิจฉัยจนถึงการรับรอง
            </p>
          </div>

          <div className="grid grid-cols-1 border-t border-black md:grid-cols-4">
            {components.map(({ n, title, thai, icon: Icon, desc }, i) => (
              <div
                key={n}
                className={`group relative flex flex-col justify-between border-black p-6 md:min-h-[340px] ${
                  i !== 3 ? "md:border-r" : ""
                } ${i !== components.length - 1 ? "border-b md:border-b-0" : ""}`}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <span className="text-6xl font-black leading-none tracking-tight">{n}</span>
                    <Icon className="h-6 w-6" strokeWidth={1.75} />
                  </div>
                  <h3 className="mt-8 text-xl font-black uppercase">{title}</h3>
                  <div className="mt-1 text-sm text-neutral-500">{thai}</div>
                  <p className="mt-4 text-sm leading-relaxed text-neutral-700">{desc}</p>
                </div>
                <div className="mt-8 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.3em]">
                  <span className="inline-block h-px w-8 bg-black transition-all group-hover:w-16 group-hover:bg-[#e63946]" />
                  Read More
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Analysis / 4 dimensions */}
      <section id="analysis" className="border-b border-black bg-neutral-50">
        <div className="mx-auto grid max-w-[1400px] grid-cols-12 gap-6 px-6 py-16">
          <div className="col-span-12 md:col-span-5">
            <div className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#e63946]">
              Section B
            </div>
            <h2 className="mt-3 text-4xl font-black uppercase leading-none">
              Four<br />Dimensions<br />of Feedback
            </h2>
            <p className="mt-8 max-w-md text-base leading-relaxed text-neutral-700">
              ระบบวิเคราะห์คำพูดของอาจารย์ผ่านโมเดล NLP และประเมินผลการให้ Feedback
              ในสี่มิติที่ผ่านการรับรองทางวิชาการ
            </p>
            <div className="mt-8 inline-flex items-center gap-3 border border-black bg-white px-4 py-3 text-xs font-bold uppercase tracking-widest">
              <span className="inline-block h-2 w-2 rounded-full bg-[#e63946]" />
              Live Speech / NLP Analysis
            </div>
          </div>

          <div className="col-span-12 md:col-span-7">
            <div className="grid grid-cols-2 border border-black bg-white">
              {dimensions.map(({ code, title, thai, icon: Icon, pct }, i) => (
                <div
                  key={code}
                  className={`p-6 ${i % 2 === 0 ? "border-r border-black" : ""} ${
                    i < 2 ? "border-b border-black" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex h-10 w-10 items-center justify-center bg-black text-lg font-black text-white">
                      {code}
                    </span>
                    <Icon className="h-5 w-5 text-[#e63946]" strokeWidth={1.75} />
                  </div>
                  <h3 className="mt-6 text-lg font-black uppercase">{title}</h3>
                  <div className="text-xs text-neutral-500">{thai}</div>
                  <div className="mt-6 flex items-end justify-between">
                    <div className="text-4xl font-black tracking-tight">{pct}<span className="text-[#e63946]">%</span></div>
                    <div className="text-[10px] uppercase tracking-[0.3em] text-neutral-500">
                      Median<br />Score
                    </div>
                  </div>
                  <div className="mt-4 h-1 w-full bg-neutral-100">
                    <div className="h-full bg-black" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Research / editorial row */}
      <section id="research" className="border-b border-black">
        <div className="mx-auto grid max-w-[1400px] grid-cols-12 gap-0 px-6 py-16">
          <div className="col-span-12 md:col-span-4 md:pr-8">
            <div className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#e63946]">
              Section C
            </div>
            <h2 className="mt-3 text-4xl font-black uppercase leading-none">Grounded<br />in Research</h2>
          </div>
          <div className="col-span-12 mt-8 grid grid-cols-1 gap-0 border-t border-black md:col-span-8 md:mt-0 md:grid-cols-3 md:border-t-0">
            {[
              { t: "Personalized Path", d: "เส้นทางการเรียนรู้เฉพาะบุคคลตามผล Diagnostic" },
              { t: "Gamification", d: "ระบบสะสมแต้ม เหรียญ และเลเวลเพื่อสร้างแรงจูงใจ" },
              { t: "Dashboard", d: "แดชบอร์ดติดตามพัฒนาการรายบุคคลและกลุ่ม" },
            ].map((c, i) => (
              <div
                key={c.t}
                className={`border-black p-6 md:min-h-[220px] ${i !== 2 ? "md:border-r" : ""} ${i !== 2 ? "border-b md:border-b-0" : ""}`}
              >
                <div className="text-2xl font-black">0{i + 1}</div>
                <h3 className="mt-4 text-lg font-black uppercase">{c.t}</h3>
                <p className="mt-3 text-sm leading-relaxed text-neutral-700">{c.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="contact" className="border-b border-black bg-black text-white">
        <div className="mx-auto grid max-w-[1400px] grid-cols-12 items-center gap-6 px-6 py-20">
          <div className="col-span-12 md:col-span-8">
            <div className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#e63946]">
              Enroll
            </div>
            <h2 className="mt-3 text-[clamp(2.5rem,5vw,4.5rem)] font-black uppercase leading-[0.95]">
              Ready to teach<br />
              with <span className="text-[#e63946]">precision</span>?
            </h2>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-white/70">
              เข้าร่วมโครงการวิจัยพัฒนาทักษะ Constructive Feedback ร่วมกับอาจารย์จากมหาวิทยาลัยชั้นนำทั่วประเทศ
            </p>
          </div>
          <div className="col-span-12 md:col-span-4">
            <button className="flex w-full items-center justify-between border border-white bg-white px-6 py-5 text-left text-black transition-colors hover:bg-[#e63946] hover:text-white">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-neutral-500">
                  Sign in with
                </div>
                <div className="text-xl font-black uppercase">Google Account</div>
              </div>
              <ArrowRight className="h-6 w-6" />
            </button>
            <div className="mt-4 text-[11px] uppercase tracking-[0.2em] text-white/50">
              Free for research participants
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer>
        <div className="mx-auto grid max-w-[1400px] grid-cols-12 gap-6 px-6 py-10 text-[11px] uppercase tracking-[0.2em] text-neutral-500">
          <div className="col-span-6 md:col-span-3">© 2024 My Feedback Lab</div>
          <div className="col-span-6 md:col-span-3">Research Project · TH</div>
          <div className="col-span-6 md:col-span-3">Version 01 · Swiss Edition</div>
          <div className="col-span-6 md:col-span-3 md:text-right">
            <Link to="/" className="hover:text-black">
              → View Mint Edition
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
