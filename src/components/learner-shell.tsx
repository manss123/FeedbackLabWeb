import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Glasses,
  LayoutDashboard,
  ClipboardCheck,
  BookOpenText,
  Headset,
  ClipboardList,
  MessageSquare,
  Award,
  LogOut,
  User,
  ShieldCheck,
  Menu,
} from "lucide-react";
import type { ReactNode } from "react";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "./ui/sheet";
import { resetMockData } from "@/lib/learner.functions";
import { signOutOfFirebase, waitForFirebaseUser } from "@/lib/firebase-auth";
import { adminCheckAccess } from "@/lib/admin.functions";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const navItems = [
  { to: "/overview", label: "ภาพรวม", icon: LayoutDashboard },
  { to: "/diagnostic", label: "แบบทดสอบก่อนเรียน", icon: ClipboardCheck },
  { to: "/modules", label: "บทเรียน", icon: BookOpenText },
  { to: "/vr-simulation", label: "VR Simulation", icon: Headset },
  { to: "/posttest", label: "แบบทดสอบหลังเรียน", icon: ClipboardList },
  { to: "/survey", label: "แบบสำรวจ", icon: MessageSquare },
  { to: "/dashboard", label: "แดชบอร์ด", icon: Award },
] as const;

interface Props {
  children: ReactNode;
  displayName?: string | null;
  avatarUrl?: string | null;
  /** Opt out of the shared centered content column and fill exactly one
   * viewport instead (h-dvh, not min-h-dvh — hard-capped, not just a floor)
   * — for immersive, video-like content (e.g. the VR simulation runner)
   * rather than dashboard/form pages. The page itself never scrolls or
   * grows with content; a tall-content child must handle its own internal
   * scrolling (see vr-simulation.tsx's OverlayPanel). */
  fullBleed?: boolean;
  /** Wider, scrollable layout for visual overview pages. */
  wide?: boolean;
}

export function LearnerShell({
  children,
  displayName,
  avatarUrl,
  fullBleed = false,
  wide = false,
}: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Quiet, best-effort check — adminCheckAccess never rejects (unlike the
  // admin-only endpoints), so a non-admin just gets `false` back and the nav
  // item stays hidden; no error toast, no loading flash for the common case.
  const { data: isAdmin } = useQuery({
    queryKey: ["admin-check-access"],
    queryFn: async () => {
      await waitForFirebaseUser();
      return adminCheckAccess();
    },
    retry: false,
  });

  const handleSignOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    resetMockData();
    await signOutOfFirebase().catch(() => {});
    navigate({ to: "/", replace: true });
  };

  return (
    <div className="app-page-background min-h-screen bg-secondary font-prompt text-slate-deep">
      <aside className="fixed left-0 top-0 hidden h-dvh w-64 flex-col overflow-y-auto border-r border-border bg-background p-5 xl:flex">
        <Link to="/overview" className="mb-8 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-mint-primary">
            <Glasses className="h-5 w-5 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-lg font-bold tracking-tight">My Feedback Lab</span>
        </Link>

        <nav className="flex flex-1 flex-col gap-1">
          {navItems.map(({ to, label, icon: Icon }) => {
            const active = pathname === to || pathname.startsWith(to + "/");
            return (
              <Link
                key={to}
                to={to as string}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-mint-light text-mint-primary"
                    : "text-slate-text hover:bg-secondary hover:text-slate-deep"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-2 border-t border-border pt-4">
          <div className="flex items-center gap-3 px-2 py-2">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-mint-light">
                <User className="h-4 w-4 text-mint-primary" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{displayName ?? "Learner"}</div>
              <div className="text-xs text-slate-text">อาจารย์ผู้เรียน</div>
            </div>
          </div>
          {isAdmin && (
            <Link
              to="/admin"
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-text transition-colors hover:bg-secondary hover:text-slate-deep"
            >
              <ShieldCheck className="h-4 w-4" />
              แผงควบคุมผู้ดูแล
            </Link>
          )}
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-text transition-colors hover:bg-secondary hover:text-slate-deep"
          >
            <LogOut className="h-4 w-4" />
            ออกจากระบบ
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-2 border-b border-border bg-background px-4 xl:hidden">
        <Link to="/overview" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-mint-primary">
            <Glasses className="h-4 w-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-sm font-bold">My Feedback Lab</span>
        </Link>
        <Sheet>
          <SheetTrigger asChild>
            <button
              type="button"
              aria-label="เปิดเมนูนำทาง"
              className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-border"
            >
              <Menu />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[min(90vw,22rem)] overflow-y-auto font-prompt">
            <SheetHeader>
              <SheetTitle>My Feedback Lab</SheetTitle>
              <SheetDescription>เลือกหน้าที่ต้องการใช้งาน</SheetDescription>
            </SheetHeader>
            <nav aria-label="เมนูหลัก" className="mt-6 space-y-1">
              {navItems.map(({ to, label, icon: Icon }) => (
                <SheetClose asChild key={to}>
                  <Link
                    to={to}
                    aria-current={pathname === to ? "page" : undefined}
                    className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-3 text-sm ${pathname === to ? "bg-mint-light font-semibold text-monitor-teal" : "text-slate-text hover:bg-secondary"}`}
                  >
                    <Icon className="size-5 shrink-0" />
                    {label}
                  </Link>
                </SheetClose>
              ))}
              {isAdmin && (
                <SheetClose asChild>
                  <Link
                    to="/admin"
                    className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-3 text-sm"
                  >
                    <ShieldCheck className="size-5 shrink-0" />
                    แผงควบคุมผู้ดูแล
                  </Link>
                </SheetClose>
              )}
            </nav>
            <p className="mt-6 break-words border-t border-border pt-4 text-sm font-semibold">
              {displayName ?? "อาจารย์ผู้เรียน"}
            </p>
            <SheetClose asChild>
              <button
                onClick={handleSignOut}
                className="mt-3 flex min-h-11 items-center gap-3 text-sm text-slate-text"
              >
                <LogOut className="size-5" />
                ออกจากระบบ
              </button>
            </SheetClose>
          </SheetContent>
        </Sheet>
      </header>

      <main className="min-w-0 xl:ml-64">
        <div
          className={
            fullBleed
              ? "app-content-container flex h-[calc(100dvh-4rem)] min-w-0 flex-col overflow-hidden py-4 xl:h-dvh xl:py-6"
              : wide
                ? "w-full pb-8"
                : "app-content-container py-6"
          }
        >
          {children}
        </div>
      </main>
    </div>
  );
}
