import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, ShieldAlert } from "lucide-react";
import {
  adminGetUserActivity,
  adminGetUserSessions,
  type AdminActivityRow,
  type AdminSessionRow,
} from "@/lib/admin.functions";
import { ACTIVITY_EVENT_LABELS } from "@/types/activity.types";
import { waitForFirebaseUser } from "@/lib/firebase-auth";

export const Route = createFileRoute("/admin/$userId")({
  ssr: false,
  component: AdminUserSessionsPage,
});

const EMOTION_LABEL: Record<string, string> = {
  happy: "ยินดี",
  neutral: "เฉยๆ",
  sad: "กังวลใจ",
};

function AdminUserSessionsPage() {
  const { userId } = Route.useParams();
  // Waits for Firebase Auth's session restore before calling — see the same
  // comment in admin/index.tsx for why (a direct/refreshed navigation here
  // would otherwise send these callables with no ID token attached).
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-user-sessions", userId],
    queryFn: async () => {
      await waitForFirebaseUser();
      return adminGetUserSessions(userId);
    },
    retry: false,
  });
  const { data: activity } = useQuery({
    queryKey: ["admin-user-activity", userId],
    queryFn: async () => {
      await waitForFirebaseUser();
      return adminGetUserActivity(userId);
    },
    retry: false,
  });

  return (
    <div className="space-y-6">
      <Link
        to="/admin"
        className="inline-flex items-center gap-2 text-sm text-slate-text hover:text-slate-deep"
      >
        <ArrowLeft className="h-4 w-4" /> กลับหน้าภาพรวม
      </Link>

      <h1 className="text-2xl font-bold">ประวัติ VR Simulation ของผู้เรียน</h1>

      {isLoading && (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-mint-primary" />
        </div>
      )}

      {error && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-background p-12 text-center">
          <ShieldAlert className="h-8 w-8 text-chart-1" />
          <div className="text-lg font-bold">ไม่มีสิทธิ์เข้าถึงหน้านี้</div>
        </div>
      )}

      {activity && <ActivityTimeline events={activity} />}

      {data && data.length === 0 && (
        <div className="rounded-2xl border border-border bg-background p-12 text-center text-slate-text">
          ผู้เรียนคนนี้ยังไม่มีบันทึก VR Simulation
        </div>
      )}

      {data?.map((session) => (
        <SessionCard key={session.id} session={session} />
      ))}
    </div>
  );
}

function ActivityTimeline({ events }: { events: AdminActivityRow[] }) {
  return (
    <div className="space-y-4 rounded-2xl border border-border bg-background p-6">
      <div className="text-xs font-bold uppercase tracking-wider text-slate-text">
        ประวัติกิจกรรม
      </div>
      {events.length === 0 ? (
        <p className="text-sm text-slate-text">ยังไม่มีกิจกรรม</p>
      ) : (
        <ul className="space-y-2">
          {events.map((e) => (
            <li key={e.id} className="flex items-center gap-3 text-sm">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-mint-primary" />
              <span className="text-slate-deep">{ACTIVITY_EVENT_LABELS[e.type] ?? e.type}</span>
              {(e.moduleId || e.scenarioId) && (
                <span className="text-xs text-slate-text">{e.moduleId ?? e.scenarioId}</span>
              )}
              <span className="ml-auto shrink-0 text-xs text-slate-text">{e.createdAt}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SessionCard({ session }: { session: AdminSessionRow }) {
  return (
    <div className="space-y-4 rounded-2xl border border-border bg-background p-6">
      <div className="flex items-center justify-between">
        <div className="text-sm font-bold uppercase tracking-wider text-mint-primary">
          Scenario {session.scenarioId}
        </div>
        <div className="text-xs text-slate-text">{session.createdAt}</div>
      </div>

      {session.stage1 && (
        <StageBlock title="รอบที่ 1 · การให้ Feedback">
          <Transcript text={session.stage1.transcript} duration={session.stage1.durationSeconds} />
        </StageBlock>
      )}

      {session.stage2 && (
        <StageBlock title="การทบทวนตนเอง">
          <p className="text-sm text-slate-text">
            จุดที่ดีที่สุด: {session.stage2.bestPart || "-"}
          </p>
          <p className="text-sm text-slate-text">
            เป้าหมายส่วนตัว: {session.stage2.personalGoal || "-"}
          </p>
        </StageBlock>
      )}

      {session.stage3 && (
        <StageBlock title="ผลประเมิน AI · รอบที่ 1">
          <ScoreRow scores={session.stage3.aiScores} emotion={session.stage3.emotion} />
        </StageBlock>
      )}

      {session.stage4 && (
        <StageBlock title="รอบที่ 2 · ให้ Feedback อีกครั้ง">
          <Transcript text={session.stage4.transcript} duration={session.stage4.durationSeconds} />
          <ScoreRow scores={session.stage4.aiScores} emotion={session.stage4.emotion} />
        </StageBlock>
      )}
    </div>
  );
}

function StageBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2 border-t border-border pt-4 first:border-t-0 first:pt-0">
      <div className="text-xs font-bold uppercase tracking-wider text-slate-text">{title}</div>
      {children}
    </div>
  );
}

function Transcript({ text, duration }: { text: string; duration: number }) {
  return (
    <p className="rounded-xl bg-secondary/50 p-3 text-sm text-slate-deep">
      {text || "(ไม่มี Transcript)"} <span className="text-xs text-slate-text">· {duration}s</span>
    </p>
  );
}

function ScoreRow({
  scores,
  emotion,
}: {
  scores: {
    speechClarity: number;
    linguisticAppropriateness: number;
    balance: number;
    intentConsistency: number;
    overall: number;
  } | null;
  emotion: string | null;
}) {
  if (!scores) return <p className="text-sm text-slate-text">ยังไม่มีคะแนน</p>;
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <span className="font-bold text-slate-deep">รวม {scores.overall}</span>
      <span className="text-slate-text">
        Speech Clarity {scores.speechClarity} · Linguistic Appropriateness{" "}
        {scores.linguisticAppropriateness} · Balance {scores.balance} · Intent Consistency{" "}
        {scores.intentConsistency}
      </span>
      {emotion && (
        <span className="rounded-full bg-mint-light px-2 py-0.5 text-xs font-bold text-mint-primary">
          {EMOTION_LABEL[emotion] ?? emotion}
        </span>
      )}
    </div>
  );
}
