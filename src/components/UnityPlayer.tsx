import { useEffect, useRef, useState } from "react";
import { Smile, Meh, Frown, Mic, Volume2, VolumeX } from "lucide-react";
import { useUnityBridge } from "@/hooks/useUnityBridge";
import type { Emotion } from "@/types/unity.types";

const BUILD_URL = import.meta.env.VITE_UNITY_BUILD_URL as string | undefined;
// Safety net for the iframe's own document never loading at all (bad URL,
// 404, network down) — NOT for waiting on a bridge handshake. A stock/
// unmodified Unity WebGL export (no custom postMessage code added on the
// Unity/C# side) never sends UNITY_READY, so gating visibility on the bridge
// would hide a perfectly working build forever. The iframe's native onLoad
// (fires once the tiny index.html document itself loads — seconds, regardless
// of how long Unity's own asset download/parse takes afterward) is what
// actually reveals it; the bridge stays a best-effort, independent channel
// for OnSessionInit/OnEmotionalFeedback that silently no-ops until a Unity
// build actually implements it.
const IFRAME_LOAD_TIMEOUT_MS = 10000;

interface UnityPlayerScenario {
  id: string;
  studentName: string;
  studentAvatar: string;
  courseContext: string;
  activity: string;
  studentLineFirst: string;
  studentLineRetry: string;
}

interface UnityPlayerProps {
  scenario: UnityPlayerScenario;
  userId: string;
  isRetry: boolean;
  presented: boolean;
  onPresent: () => void;
  emotion: Emotion | null;
  /** True while the teacher is actively recording feedback — shows a badge over the scene. */
  isRecording?: boolean;
  /** Fires once when Unity signals UNITY_READY (or immediately in fallback mode, since there's nothing to load). */
  onUnityReady?: () => void;
  /** Forwarded from the bridge's AUDIO_RECORDED event (Unity's own mic-capture fallback path). */
  onAudioRecorded?: (blobUrl: string, duration: number) => void;
  /** Forwarded from the bridge's STAGE_CHANGED event. */
  onStageChanged?: (stage: number) => void;
}

export function UnityPlayer({
  scenario,
  userId,
  isRetry,
  presented,
  onPresent,
  emotion,
  isRecording = false,
  onUnityReady,
  onAudioRecorded,
  onStageChanged,
}: UnityPlayerProps) {
  const [loadPhase, setLoadPhase] = useState<"loading-iframe" | "ready" | "failed">(
    BUILD_URL ? "loading-iframe" : "failed",
  );
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const sentSessionInitRef = useRef(false);
  const firedOnUnityReadyRef = useRef(false);
  const timeoutRef = useRef<number | null>(null);

  const targetOrigin = BUILD_URL ? new URL(BUILD_URL, window.location.href).origin : null;

  // Unity's default WebGL export template hardcodes the canvas to a fixed
  // 960x600 box (see public/unity-build/index.html/TemplateData/style.css) —
  // hand-editing those files works until the next Unity re-export silently
  // overwrites them back to stock. Injecting the fix from here instead means
  // it survives every re-export with zero manual re-patching. `!important`
  // beats Unity's own inline `canvas.style.width = "960px"` (set by its
  // loader script, which runs before this) per normal CSS cascade rules.
  // Same-origin only (unity-build/ is served from our own app) — silently
  // no-ops for a cross-origin BUILD_URL, which just keeps Unity's native size.
  const injectResponsiveStyles = () => {
    try {
      const doc = iframeRef.current?.contentDocument;
      if (!doc || doc.getElementById("__flvr_unity_responsive")) return;
      const style = doc.createElement("style");
      style.id = "__flvr_unity_responsive";
      style.textContent = `
        html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; }
        #unity-container { position: absolute; inset: 0; width: 100%; height: 100%; }
        #unity-canvas { width: 100% !important; height: 100% !important; display: block; }
      `;
      doc.head.appendChild(style);
    } catch {
      // Cross-origin build — nothing we can do from here; Unity keeps its own sizing.
    }
  };

  // Reveals the iframe / unblocks the parent's own "unityReady" gate. Called
  // from the iframe's native onLoad (always fires) and, redundantly but
  // harmlessly, from a real bridge's UNITY_READY (won't fire on a build with
  // no bridge code, which is fine — onLoad already got us here).
  const markReady = () => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    injectResponsiveStyles();
    setLoadPhase("ready");
    if (!firedOnUnityReadyRef.current) {
      firedOnUnityReadyRef.current = true;
      onUnityReady?.();
    }
  };

  const { isUnityReady, send } = useUnityBridge({
    iframeRef,
    targetOrigin,
    enabled: !!BUILD_URL,
    onReady: markReady,
    onStageChanged,
    onAudioRecorded,
  });

  // No build configured — the fallback scene renders immediately, so there's
  // nothing to "wait" for; still fire onUnityReady once so parent state
  // (e.g. a loading gate) doesn't stay stuck false forever.
  useEffect(() => {
    if (BUILD_URL || firedOnUnityReadyRef.current) return;
    firedOnUnityReadyRef.current = true;
    onUnityReady?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!BUILD_URL || loadPhase !== "loading-iframe") return;
    timeoutRef.current = window.setTimeout(() => setLoadPhase("failed"), IFRAME_LOAD_TIMEOUT_MS);
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, [loadPhase]);

  useEffect(() => {
    if (loadPhase === "ready" && isUnityReady && !sentSessionInitRef.current) {
      sentSessionInitRef.current = true;
      send({ command: "OnSessionInit", payload: { scenarioId: scenario.id, userId } });
    }
  }, [loadPhase, isUnityReady, send, scenario.id, userId]);

  useEffect(() => {
    if (emotion === null) return;
    send({ command: "OnEmotionalFeedback", payload: { emotion } });
  }, [emotion, send]);

  // Mute toggle — lets the teacher skip listening to the NPC's presentation
  // audio and go straight to speaking into the mic (useful for quick
  // testing). Sent to Unity via AudioListener.volume (see WebGLBridge.cs);
  // no-op in fallback mode since it has no real audio to mute.
  const [muted, setMuted] = useState(false);
  useEffect(() => {
    send({ command: "OnMuteToggle", payload: { muted } });
  }, [muted, send]);

  // Round 2 (Stage 4) — nothing previously told a real Unity build to have
  // the student speak again before the teacher gives feedback a second time
  // (OnRetryRequestedCommand existed in the protocol but was never actually
  // sent). `presented` here is the parent's presented2 flag, flipped true
  // the moment the teacher clicks "▶ เล่นการนำเสนอ" in Stage1PresentGate for
  // the retry round — that's the exact moment to ask Unity to speak
  // studentLineRetry via ScenarioManager.ReloadForRetry (see WebGLBridge.cs).
  // Reset the guard whenever `presented` goes back to false so a teacher who
  // retries Round 2 again (Stage4Compare's "ฝึกอีกครั้ง") gets a fresh trigger.
  const sentRetryRef = useRef(false);
  useEffect(() => {
    if (!presented) {
      sentRetryRef.current = false;
      return;
    }
    if (isRetry && !sentRetryRef.current) {
      sentRetryRef.current = true;
      send({
        command: "OnRetryRequested",
        payload: { scenarioId: scenario.id, retryLine: scenario.studentLineRetry },
      });
    }
  }, [isRetry, presented, send, scenario.id, scenario.studentLineRetry]);

  if (BUILD_URL && loadPhase !== "failed") {
    return (
      <div className="relative h-full w-full overflow-hidden rounded-3xl bg-slate-deep">
        <iframe
          ref={iframeRef}
          src={BUILD_URL}
          title="VR Classroom"
          className="absolute inset-0 h-full w-full border-0"
          onLoad={markReady}
        />
        {loadPhase !== "ready" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-deep text-white">
            <div className="mb-3 text-xs uppercase tracking-widest text-white/60">
              กำลังโหลดฉาก VR...
            </div>
            <div className="h-2 w-64 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-1/3 animate-pulse rounded-full bg-mint-primary" />
            </div>
          </div>
        )}
        {loadPhase === "ready" && isRecording && <RecordingBadge />}
        {loadPhase === "ready" && <MuteButton muted={muted} onToggle={() => setMuted((m) => !m)} />}
      </div>
    );
  }

  return (
    <UnityFallbackScene
      scenario={scenario}
      line={isRetry ? scenario.studentLineRetry : scenario.studentLineFirst}
      presented={presented}
      onPresent={onPresent}
      emotion={emotion}
      failedToLoad={BUILD_URL != null && loadPhase === "failed"}
      isRecording={isRecording}
    />
  );
}

/** Global mute toggle — top-left so it never collides with RecordingBadge/emotion badge on the right. */
function MuteButton({ muted, onToggle }: { muted: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      title={muted ? "เปิดเสียง" : "ปิดเสียง (ข้ามการฟัง ไปพูดไมค์เทสได้เลย)"}
      className={`absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-full shadow-md ring-2 ring-white transition ${
        muted ? "bg-chart-1/90 text-white" : "bg-white/90 text-slate-deep hover:bg-white"
      }`}
    >
      {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
    </button>
  );
}

function RecordingBadge() {
  return (
    <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-red-500/90 px-3 py-1.5 text-xs font-bold text-white shadow-md">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/70" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
      </span>
      <Mic className="h-3.5 w-3.5" />
      กำลังบันทึกเสียง
    </div>
  );
}

const EMOTION_BADGE: Record<Emotion, { icon: typeof Smile; className: string; label: string }> = {
  happy: { icon: Smile, className: "bg-mint-light text-mint-primary", label: "ยินดี" },
  neutral: { icon: Meh, className: "bg-secondary text-slate-text", label: "เฉยๆ" },
  sad: { icon: Frown, className: "bg-chart-1/15 text-chart-1", label: "กังวลใจ" },
};

// The persistent classroom scene rendered when no real Unity build is
// configured (VITE_UNITY_BUILD_URL unset) or a configured build failed to
// hand-shake in time. This is today's VRClassroomMock, relocated verbatim
// with its presented/onPresent/subtitle-sequencing behavior unchanged, plus
// a small emotion badge fed by the same `emotion` state that (when a real
// build IS present) also drives the OnEmotionalFeedback bridge send above —
// one source of truth, two consumers, so they can never disagree.
function UnityFallbackScene({
  scenario,
  line,
  presented,
  onPresent,
  emotion,
  failedToLoad,
  isRecording,
}: {
  scenario: UnityPlayerScenario;
  line: string;
  presented: boolean;
  onPresent: () => void;
  emotion: Emotion | null;
  failedToLoad: boolean;
  isRecording: boolean;
}) {
  const [subtitle, setSubtitle] = useState<string>("");
  const [phase, setPhase] = useState<"idle" | "presenting" | "asking">("idle");

  useEffect(() => {
    if (!presented) return;
    setPhase("presenting");
    const lines = [
      `สวัสดีค่ะอาจารย์ วันนี้หนูจะนำเสนอเรื่อง ${scenario.activity}`,
      `หัวข้อของหนูเกี่ยวกับ ${scenario.courseContext}`,
      "หนูขออนุญาตเริ่มจากภาพรวมของงานก่อนนะคะ",
      "…ขอบคุณที่รับฟังค่ะ",
    ];
    let i = 0;
    setSubtitle(lines[0]);
    const iv = window.setInterval(() => {
      i += 1;
      if (i < lines.length) {
        setSubtitle(lines[i]);
      } else {
        window.clearInterval(iv);
        setPhase("asking");
        setSubtitle(line);
      }
    }, 1800);
    return () => window.clearInterval(iv);
  }, [presented, line, scenario.activity, scenario.courseContext]);

  const badge = emotion ? EMOTION_BADGE[emotion] : null;
  const BadgeIcon = badge?.icon;

  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-3xl"
      style={{
        background: "linear-gradient(180deg,#e0f2fe 0%,#f8fafc 55%,#e2e8f0 100%)",
      }}
    >
      {/* Window frames — evoke classroom */}
      <div className="absolute inset-0 opacity-60">
        <div className="absolute inset-y-6 left-6 right-6 grid grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="border-l border-slate-300 first:border-l-0" />
          ))}
          <div className="col-span-6 border-t border-slate-300" />
        </div>
      </div>

      {/* Avatar */}
      <div className="absolute inset-x-0 bottom-0 top-8 flex items-end justify-center">
        <div
          className="relative h-[70%] w-40 rounded-t-full shadow-xl"
          style={{ background: scenario.studentAvatar }}
        >
          <div className="mx-auto mt-6 h-16 w-16 rounded-full bg-white/40" />
          <div className="mx-auto mt-2 h-2 w-24 rounded-full bg-white/30" />
          {badge && BadgeIcon && (
            <div
              className={`absolute -right-2 -top-2 flex h-9 w-9 items-center justify-center rounded-full shadow-md ring-2 ring-white ${badge.className}`}
              title={badge.label}
            >
              <BadgeIcon className="h-5 w-5" />
            </div>
          )}
        </div>
      </div>

      {isRecording && <RecordingBadge />}

      {/* Speech bubble above */}
      {phase === "asking" && (
        <div className="absolute left-1/2 top-6 -translate-x-1/2 rounded-2xl bg-white/90 px-4 py-2 text-sm font-medium text-slate-deep shadow-md">
          {line}
        </div>
      )}

      {/* Name tag */}
      <div className="absolute bottom-14 left-4 rounded-md bg-white/85 px-2 py-1 text-xs font-bold text-slate-deep shadow">
        {scenario.studentName.toUpperCase()}
      </div>

      {/* Subtitle bar */}
      {presented && (
        <div className="absolute bottom-4 left-4 right-4 rounded-lg bg-white/90 px-3 py-2 text-sm text-slate-deep shadow">
          {subtitle}
        </div>
      )}

      {/* Top status bar */}
      <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/30 to-transparent px-3 py-1.5 text-[10px] font-medium uppercase tracking-widest text-white">
        <span>◉ VR Classroom · WebGL{failedToLoad ? " · โหมดจำลอง" : ""}</span>
        <span>{phase === "asking" ? "รอ Feedback" : "กำลังนำเสนอ"}</span>
      </div>

      {!presented && (
        <button
          onClick={onPresent}
          className="absolute inset-0 flex items-center justify-center bg-black/30 text-white opacity-0 transition hover:opacity-100"
        >
          <span className="rounded-full bg-white/90 px-6 py-3 text-sm font-bold text-slate-deep">
            คลิกเพื่อเริ่ม
          </span>
        </button>
      )}
    </div>
  );
}
