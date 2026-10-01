import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import logo from "@/assets/Logo.webp";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [{ title: "แผงควบคุมผู้ดูแล — My Feedback Lab" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminLayout,
});

// Deliberately its own minimal shell, not LearnerShell — different audience
// (researchers, not lecturers), no lecturer nav items belong here. Access
// itself is authorized entirely by the Cloud Function calls each child page
// makes (see src/lib/admin.functions.ts) — there is no separate route guard.
function AdminLayout() {
  return (
    <div className="app-page-background min-h-screen bg-monitor-canvas font-prompt text-foreground">
      <header className="border-b border-border bg-background py-4">
        <div className="app-content-container flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/admin"
            className="flex min-h-11 items-center gap-2.5 rounded-md focus-visible:outline-2 focus-visible:outline-primary"
          >
            <img src={logo} alt="" className="h-8 w-8 rounded-md" />
            <span>
              <span className="block font-bold tracking-tight">
                <span className="text-mint-primary">My</span>{" "}
                <span className="text-slate-deep">Feedback Lab</span>
              </span>
              <span className="block text-xs text-slate-text">ระบบอาจารย์และผู้วิจัย</span>
            </span>
          </Link>
          <Link
            to="/"
            className="inline-flex min-h-11 items-center rounded-md text-sm font-medium text-slate-text underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-primary"
          >
            กลับหน้าแรก
          </Link>
        </div>
      </header>
      <main className="app-content-container py-6">
        <Outlet />
      </main>
    </div>
  );
}
