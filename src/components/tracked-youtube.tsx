import { useEffect, useRef, useState } from "react";
import { deferredEffect } from "@/lib/deferred-effect";
import { loadYouTubeApi, type YouTubePlayer } from "@/lib/youtube-api";
import { videoSlice } from "@/lib/video-clock";
import { measuredSeconds } from "@/lib/usage-clock";
import { logActivity } from "@/lib/activity";
import { getFirebaseAuth } from "@/lib/firebase";

export function TrackedYouTube({
  videoId,
  moduleId,
  runId,
  isTest = false,
  onEnded,
}: {
  videoId: string;
  moduleId: string;
  runId: string;
  isTest?: boolean;
  onEnded: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const endedCallback = useRef(onEnded);
  useEffect(() => {
    endedCallback.current = onEnded;
  }, [onEnded]);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(
    () =>
      deferredEffect(() => {
        const element = host.current;
        const uid = getFirebaseAuth().currentUser?.uid;
        if (!element || !uid) return;
        let disposed = false;
        let player: YouTubePlayer | undefined;
        let readyTimeout: number | undefined;
        let ready = false;
        let suspended = false;
        let state = -1;
        let inViewport = false;
        let visible = false;
        let previous = performance.now();
        let intervalStart = new Date().toISOString();
        let totals = { playing: 0, visible: 0, unobserved: 0 };
        const videoVisitId = crypto.randomUUID();
        const sample = () => {
          const now = performance.now();
          const slice = videoSlice(previous, now, ready && !suspended && state === 1, visible);
          for (const key of ["playing", "visible", "unobserved"] as const)
            totals[key] += slice[key];
          previous = now;
        };
        const record = (reason: string, errorCode?: number) => {
          if (disposed || getFirebaseAuth().currentUser?.uid !== uid) return;
          sample();
          const end = new Date().toISOString();
          void logActivity({
            type: "video_observation",
            moduleId,
            runId,
            stepId: "engage",
            path: window.location.pathname,
            videoId,
            videoVisitId,
            videoIsTest: isTest,
            reason,
            videoPlayerState: state,
            intervalStartClient: intervalStart,
            endedAtClient: end,
            videoPlaybackSeconds: measuredSeconds(totals.playing),
            videoVisiblePlaybackSeconds: measuredSeconds(totals.visible),
            videoUnobservedSeconds: measuredSeconds(totals.unobserved),
            ...(ready && player
              ? {
                  videoPositionSeconds: player.getCurrentTime(),
                  videoPlaybackRate: player.getPlaybackRate(),
                }
              : {}),
            ...(errorCode !== undefined ? { videoErrorCode: errorCode } : {}),
            visible,
          });
          totals = { playing: 0, visible: 0, unobserved: 0 };
          intervalStart = end;
        };
        const visibility = () => {
          sample();
          const fullscreen = document.fullscreenElement;
          visible =
            document.visibilityState === "visible" &&
            (inViewport ||
              Boolean(fullscreen && (fullscreen === element || element.contains(fullscreen))));
          // Update the clock locally; visibility is not a separate durable event.
        };
        const observer = new IntersectionObserver(
          ([entry]) => {
            sample();
            inViewport = entry.isIntersecting && entry.intersectionRatio >= 0.5;
            visibility();
          },
          { threshold: [0, 0.5, 1] },
        );
        observer.observe(element);
        const hide = () => {
          record("pagehide");
          suspended = true;
        };
        const signout = () => {
          record("signed_out");
          suspended = true;
        };
        const show = () => {
          previous = performance.now();
          intervalStart = new Date().toISOString();
          suspended = false;
          state = ready && player ? player.getPlayerState() : -1;
          visibility();
        };
        document.addEventListener("visibilitychange", visibility);
        document.addEventListener("fullscreenchange", visibility);
        window.addEventListener("pagehide", hide);
        window.addEventListener("pageshow", show);
        window.addEventListener("feedbacklab:signout", signout);
        let ticks = 0;
        const timer = window.setInterval(() => {
          if (suspended) return;
          sample();
          if (++ticks % 60 === 0 && ready && (totals.playing > 0 || totals.unobserved > 0))
            record("heartbeat");
        }, 1000);
        const mount = document.createElement("div");
        element.appendChild(mount);
        void loadYouTubeApi()
          .then((api) => {
            if (disposed) return;
            player = new api.Player(mount, {
              videoId,
              width: "100%",
              height: "100%",
              playerVars: { origin: window.location.origin, playsinline: 1, controls: 1, fs: 1 },
              events: {
                onReady: (event) => {
                  if (disposed) return;
                  clearTimeout(readyTimeout);
                  player = event.target;
                  sample();
                  ready = true;
                  state = player.getPlayerState();
                  player.getIframe().title = "วิดีโอบทเรียน";
                  record("ready");
                },
                onStateChange: (event) => {
                  if (disposed || state === event.data) return;
                  sample();
                  state = event.data;
                  // Buffering/cued transitions affect measurement, but need no extra row.
                  if ([0, 1, 2].includes(state)) record("state_changed");
                  if (state === 0) endedCallback.current();
                },
                onPlaybackRateChange: () => sample(),
                onError: (event) => {
                  if (disposed) return;
                  clearTimeout(readyTimeout);
                  sample();
                  state = -1;
                  record("player_error", event.data);
                  setError(true);
                },
              },
            });
            readyTimeout = window.setTimeout(() => {
              if (!disposed && !ready) {
                record("player_ready_timeout");
                setError(true);
              }
            }, 20_000);
          })
          .catch(() => {
            if (!disposed) {
              record("api_load_error");
              setError(true);
            }
          });
        return () => {
          record("unmounted");
          disposed = true;
          clearTimeout(readyTimeout);
          clearInterval(timer);
          observer.disconnect();
          document.removeEventListener("visibilitychange", visibility);
          document.removeEventListener("fullscreenchange", visibility);
          window.removeEventListener("pagehide", hide);
          window.removeEventListener("pageshow", show);
          window.removeEventListener("feedbacklab:signout", signout);
          player?.destroy();
          element.replaceChildren();
        };
      }),
    [videoId, moduleId, runId, isTest, attempt],
  );
  return (
    <div className="mb-4">
      <div
        ref={host}
        className="aspect-video min-h-[200px] overflow-hidden rounded-2xl bg-slate-deep"
      />
      {error && (
        <div role="alert" className="mt-2 text-sm">
          โหลดวิดีโอไม่สำเร็จ กรุณาลองอีกครั้ง
          <button
            className="ml-2 underline"
            onClick={() => {
              setError(false);
              setAttempt((value) => value + 1);
            }}
          >
            ลองใหม่
          </button>
        </div>
      )}
    </div>
  );
}
