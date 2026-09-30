import { Loader2 } from "lucide-react";
import { useRouter } from "@tanstack/react-router";

export function LearnerAccessPending() {
  return (
    <div
      className="app-page-background flex min-h-screen items-center justify-center gap-3 bg-background text-slate-text"
      role="status"
    >
      <Loader2 className="h-6 w-6 animate-spin text-mint-primary" />
      กำลังตรวจสอบข้อมูลผู้เข้าร่วม...
    </div>
  );
}

export function LearnerAccessError() {
  const router = useRouter();
  return (
    <div className="app-page-background flex min-h-screen items-center justify-center bg-background p-6">
      <div className="space-y-4 text-center" role="alert">
        <p className="text-slate-deep">ไม่สามารถตรวจสอบข้อมูลผู้เข้าร่วมได้ กรุณาลองอีกครั้ง</p>
        <button
          onClick={() => void router.invalidate()}
          className="rounded-xl bg-primary px-6 py-3 font-medium text-primary-foreground"
        >
          ลองอีกครั้ง
        </button>
      </div>
    </div>
  );
}
