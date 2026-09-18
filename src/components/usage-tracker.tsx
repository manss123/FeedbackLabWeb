import { deferredEffect } from "@/lib/deferred-effect";
import { measuredSeconds } from "@/lib/usage-clock";
import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { getFirebaseAuth } from "@/lib/firebase";
import { onFirebaseAuthChanged } from "@/lib/firebase-auth";
import { activitySyncStatus, flushActivity, logActivity } from "@/lib/activity";
import {
  clearUsageContext,
  getUsageContext,
  sampleUsage,
  updateUsageState,
  usageState,
} from "@/lib/usage-context";

export function UsageTracker() {
  const path = useRouterState({ select: (state) => state.location.pathname });
  const [uid, setUid] = useState<string | null>(null);
  const [status, setStatus] = useState({ pending: 0, storageFailed: false, writeFailed: false });
  useEffect(
    () =>
      onFirebaseAuthChanged((user) => {
        if (user) {
          const context = getUsageContext(user.uid);
          void user
            .getIdTokenResult()
            .then((token) => {
              context.authTime = token.authTime;
            })
            .catch(() => {});
          setUid(user.uid);
          void flushActivity();
        } else {
          setUid(null);
          clearUsageContext();
        }
      }),
    [],
  );
  useEffect(
    () =>
      deferredEffect(() => {
        if (!uid || getFirebaseAuth().currentUser?.uid !== uid) return;
        getUsageContext(uid);
        let snapshot = sampleUsage();
        let intervalStart = new Date().toISOString();
        let lastIdle = usageState().idle;
        let ended = false;
        let intervalPath = window.location.pathname;
        const heartbeat = () => {
          if (getFirebaseAuth().currentUser?.uid !== uid) return;
          const now = sampleUsage();
          void logActivity({
            type: "web_heartbeat",
            path: intervalPath,
            intervalStartClient: intervalStart,
            elapsedSeconds: measuredSeconds(now.mono - snapshot.mono),
            visibleSeconds: measuredSeconds(now.visible - snapshot.visible),
            activeSeconds: measuredSeconds(now.active - snapshot.active),
            unobservedSeconds: measuredSeconds(now.unobserved - snapshot.unobserved),
            ...usageState(),
          });
          snapshot = now;
          intervalStart = new Date().toISOString();
          intervalPath = window.location.pathname;
        };
        const input = () => {
          updateUsageState(true);
          if (lastIdle) {
            lastIdle = false;
            void logActivity({ type: "idle_changed", idle: false });
          }
        };
        const visibility = () => {
          heartbeat();
          updateUsageState();
          void logActivity({ type: "visibility_changed", ...usageState() });
        };
        const focus = () => {
          heartbeat();
          updateUsageState();
          void logActivity({ type: "focus_changed", ...usageState() });
        };
        const end = () => {
          if (ended) return;
          ended = true;
          heartbeat();
          void logActivity({ type: "web_session_ended", reason: "pagehide" });
        };
        const resume = (e: PageTransitionEvent) => {
          if (!e.persisted) return;
          ended = false;
          updateUsageState();
          snapshot = sampleUsage();
          intervalStart = new Date().toISOString();
          void logActivity({ type: "web_session_started", reason: "bfcache_resume" });
        };
        void logActivity({ type: "web_session_started", reason: "authenticated_document" });
        const timer = window.setInterval(() => {
          if (!ended) {
            heartbeat();
            const idle = usageState().idle;
            if (idle !== lastIdle) {
              lastIdle = idle;
              void logActivity({ type: "idle_changed", idle });
            }
          }
          void flushActivity();
          setStatus(activitySyncStatus());
        }, 30_000);
        const online = () => void flushActivity();
        for (const event of ["pointerdown", "keydown", "scroll", "touchstart"])
          window.addEventListener(event, input, { passive: true });
        document.addEventListener("visibilitychange", visibility);
        window.addEventListener("focus", focus);
        window.addEventListener("blur", focus);
        window.addEventListener("pagehide", end);
        window.addEventListener("pageshow", resume);
        window.addEventListener("online", online);
        window.addEventListener("feedbacklab:route", heartbeat);
        window.addEventListener("feedbacklab:signout", heartbeat);
        return () => {
          window.clearInterval(timer);
          for (const event of ["pointerdown", "keydown", "scroll", "touchstart"])
            window.removeEventListener(event, input);
          document.removeEventListener("visibilitychange", visibility);
          window.removeEventListener("focus", focus);
          window.removeEventListener("blur", focus);
          window.removeEventListener("pagehide", end);
          window.removeEventListener("pageshow", resume);
          window.removeEventListener("online", online);
          window.removeEventListener("feedbacklab:route", heartbeat);
          window.removeEventListener("feedbacklab:signout", heartbeat);
        };
      }),
    [uid],
  );
  useEffect(
    () =>
      deferredEffect(() => {
        if (!uid || getFirebaseAuth().currentUser?.uid !== uid) return;
        window.dispatchEvent(new Event("feedbacklab:route"));
        let start = sampleUsage();
        let startedAt = new Date().toISOString();
        let pageVisitId = crypto.randomUUID();
        let closed = false;
        const enter = () =>
          void logActivity({ type: "page_entered", path, pageVisitId, startedAtClient: startedAt });
        const leave = (reason: string) => {
          if (closed || getFirebaseAuth().currentUser?.uid !== uid) return;
          closed = true;
          const end = sampleUsage();
          void logActivity({
            type: "page_left",
            path,
            pageVisitId,
            reason,
            startedAtClient: startedAt,
            endedAtClient: new Date().toISOString(),
            elapsedSeconds: measuredSeconds(end.mono - start.mono),
            visibleSeconds: measuredSeconds(end.visible - start.visible),
            activeSeconds: measuredSeconds(end.active - start.active),
            unobservedSeconds: measuredSeconds(end.unobserved - start.unobserved),
          });
        };
        const hide = () => leave("pagehide");
        const signOut = () => leave("signed_out");
        const resume = (event: PageTransitionEvent) => {
          if (!event.persisted) return;
          start = sampleUsage();
          startedAt = new Date().toISOString();
          pageVisitId = crypto.randomUUID();
          closed = false;
          enter();
        };
        enter();
        window.addEventListener("pagehide", hide);
        window.addEventListener("pageshow", resume);
        window.addEventListener("feedbacklab:signout", signOut);
        return () => {
          leave("route_changed_or_unmounted");
          window.removeEventListener("pagehide", hide);
          window.removeEventListener("pageshow", resume);
          window.removeEventListener("feedbacklab:signout", signOut);
        };
      }),
    [path, uid],
  );
  if (!uid || (!status.storageFailed && !status.writeFailed && status.pending < 3)) return null;
  return (
    <div
      role="status"
      className="fixed bottom-2 left-2 z-50 max-w-sm rounded-xl border bg-background p-3 text-xs shadow"
    >
      ประวัติการใช้งานรอส่ง {status.pending} รายการ ระบบจะลองส่งใหม่เมื่อเชื่อมต่อได้
      {status.storageFailed && " · เก็บข้อมูลรอส่งในเครื่องไม่ได้ กรุณาอย่าเพิ่งปิดหน้า"}
      <button
        className="ml-2 underline"
        onClick={() => {
          void flushActivity().then(() => setStatus(activitySyncStatus()));
        }}
      >
        ลองส่งอีกครั้ง
      </button>
    </div>
  );
}
