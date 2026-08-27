import { useCallback, useEffect, useRef, useState } from "react";
import { isUnityToReactEvent, type UnityCommand } from "@/types/unity.types";

interface UseUnityBridgeOptions {
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  /** Origin of the loaded Unity build, or null when no build is configured. */
  targetOrigin: string | null;
  /** false when no build is configured — the listener is not attached at all. */
  enabled: boolean;
  onReady?: () => void;
  onStageChanged?: (stage: number) => void;
  onAudioRecorded?: (blobUrl: string, duration: number) => void;
  onSessionComplete?: (summary: Record<string, unknown>) => void;
}

interface UseUnityBridgeResult {
  isUnityReady: boolean;
  send: (command: UnityCommand) => void;
}

export function useUnityBridge({
  iframeRef,
  targetOrigin,
  enabled,
  onReady,
  onStageChanged,
  onAudioRecorded,
  onSessionComplete,
}: UseUnityBridgeOptions): UseUnityBridgeResult {
  const [isUnityReady, setIsUnityReady] = useState(false);
  const callbacksRef = useRef({ onReady, onStageChanged, onAudioRecorded, onSessionComplete });
  callbacksRef.current = { onReady, onStageChanged, onAudioRecorded, onSessionComplete };

  useEffect(() => {
    if (!enabled) return;
    setIsUnityReady(false);

    const handler = (event: MessageEvent) => {
      if (targetOrigin && event.origin !== targetOrigin) return;
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (!isUnityToReactEvent(event.data)) return;

      const cb = callbacksRef.current;
      switch (event.data.type) {
        case "UNITY_READY":
          setIsUnityReady(true);
          cb.onReady?.();
          break;
        case "STAGE_CHANGED":
          cb.onStageChanged?.(event.data.stage);
          break;
        case "AUDIO_RECORDED":
          cb.onAudioRecorded?.(event.data.blobUrl, event.data.duration);
          break;
        case "SESSION_COMPLETE":
          cb.onSessionComplete?.(event.data.summary);
          break;
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [enabled, targetOrigin, iframeRef]);

  const send = useCallback(
    (command: UnityCommand) => {
      const win = iframeRef.current?.contentWindow;
      if (!enabled || !isUnityReady || !win) return;
      win.postMessage(command, targetOrigin ?? "*");
    },
    [enabled, isUnityReady, targetOrigin, iframeRef],
  );

  return { isUnityReady, send };
}
