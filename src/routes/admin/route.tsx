import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { Glasses } from "lucide-react";

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
    <div className="min-h-screen bg-secondary font-prompt text-slate-deep">
      <header className="border-b border-border bg-background px-8 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link to="/admin" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-mint-primary">
              <Glasses className="h-4 w-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-bold tracking-tight">My Feedback Lab · แผงควบคุมผู้ดูแล</span>
          </Link>
          <Link to="/" className="text-sm font-medium text-slate-text hover:text-slate-deep">
            กลับหน้าแรก
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
