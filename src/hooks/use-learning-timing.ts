import { deferredEffect } from "@/lib/deferred-effect";
import { measuredSeconds } from "@/lib/usage-clock";
import { useEffect, useRef, useState } from "react";
import { logActivity } from "@/lib/activity";
import { getFirebaseAuth } from "@/lib/firebase";
import { getUsageContext, sampleUsage } from "@/lib/usage-context";

export function useLearningTiming(
  kind: "module" | "vr" | "assessment",
  entityId: string,
  stepId: string,
  enabled = true,
) {
  const run = useRef<string | null>(null);
  const [resumeCount, setResumeCount] = useState(0);
  const current = useRef<null | { finish: (reason: string) => void; startedAt: string }>(null);
  // ID is stable for this mounted attempt, independently of repeated steps.
  const runId = () => (run.current ??= crypto.randomUUID());
  useEffect(
    () =>
      deferredEffect(() => {
        const uid = getFirebaseAuth().currentUser?.uid;
        if (!enabled || !uid) return;
        if (kind === "assessment") run.current = crypto.randomUUID();
        getUsageContext(uid);
        const start = sampleUsage();
        const startedAt = new Date().toISOString();
        const context = {
          runId: runId(),
          stepId,
          stepVisitId: crypto.randomUUID(),
          ...(kind === "module"
            ? { moduleId: entityId }
            : kind === "vr"
              ? { scenarioId: entityId, sessionId: runId() }
              : { assessmentId: entityId }),
        };
        let finished = false;
        void logActivity({
          ...context,
          type: kind === "assessment" ? "assessment_started" : "learning_step_started",
          startedAtClient: startedAt,
        });
        const finish = (reason: string) => {
          if (finished || getFirebaseAuth().currentUser?.uid !== uid) return;
          finished = true;
          const end = sampleUsage();
          void logActivity({
            ...context,
            type:
              kind === "assessment" && reason === "submitted"
                ? "assessment_finished"
                : "learning_step_ended",
            reason,
            startedAtClient: startedAt,
            endedAtClient: new Date().toISOString(),
            elapsedSeconds: measuredSeconds(end.mono - start.mono),
            visibleSeconds: measuredSeconds(end.visible - start.visible),
            activeSeconds: measuredSeconds(end.active - start.active),
            unobservedSeconds: measuredSeconds(end.unobserved - start.unobserved),
          });
        };
        current.current = { finish, startedAt };
        const hide = () => finish("pagehide");
        const signOut = () => finish("signed_out");
        const resume = (event: PageTransitionEvent) => {
          if (event.persisted) setResumeCount((count) => count + 1);
        };
        window.addEventListener("pagehide", hide);
        window.addEventListener("pageshow", resume);
        window.addEventListener("feedbacklab:signout", signOut);
        return () => {
          finish("step_changed_or_unmounted");
          window.removeEventListener("pagehide", hide);
          window.removeEventListener("pageshow", resume);
          window.removeEventListener("feedbacklab:signout", signOut);
        };
      }),
    [kind, entityId, stepId, enabled, resumeCount],
  );
  return {
    runId,
    finish: (reason = "submitted") => current.current?.finish(reason),
    startedAt: () => current.current?.startedAt ?? null,
  };
}
