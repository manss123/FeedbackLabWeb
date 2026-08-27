import { useCallback, useEffect, useRef, useState } from "react";

export interface AudioRecorderResult {
  blob: Blob;
  url: string;
  durationSeconds: number;
}

export type AudioRecorderStatus =
  "idle" | "requesting-permission" | "recording" | "stopped" | "error";

// Ported from FeedbacksSystemPrototype/src/audio.ts's VAD (voice-activity detection):
// adaptive noise-floor threshold = mean + K_SIGMA * stddev of background RMS,
// warmed up via Welford's online variance, then adapted via EWMA during silence.
const NOISE_WARMUP_MS = 1200;
const K_SIGMA = 3.0;
const NOISE_ADAPT_ALPHA = 0.02;
const LEVELS_SIZE = 24; // matches the Waveform component's bar count

interface VadState {
  noiseMean: number;
  noiseM2: number;
  noiseCount: number;
  noiseStart: number;
  emaRms: number | null;
  speaking: boolean;
}

function freshVadState(): VadState {
  return { noiseMean: 0, noiseM2: 0, noiseCount: 0, noiseStart: 0, emaRms: null, speaking: false };
}

const isSupported =
  typeof navigator !== "undefined" &&
  !!navigator.mediaDevices?.getUserMedia &&
  typeof MediaRecorder !== "undefined" &&
  typeof AudioContext !== "undefined";

export function useAudioRecorder({ maxSeconds }: { maxSeconds: number }) {
  const [status, setStatus] = useState<AudioRecorderStatus>("idle");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [hasDetectedSpeech, setHasDetectedSpeech] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<AudioRecorderResult | null>(null);

  // Read imperatively by the Waveform component's own render loop — kept out of
  // React state so amplitude updates (~20/sec) don't trigger re-renders here.
  const levelsRef = useRef<number[]>(Array(LEVELS_SIZE).fill(0));
  const levelsIdxRef = useRef(0);
  const elapsedRef = useRef(0);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const procRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const tickRef = useRef<number | null>(null);
  const vadRef = useRef<VadState>(freshVadState());

  const cleanupGraph = useCallback(() => {
    if (tickRef.current) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
    try {
      procRef.current?.disconnect();
    } catch {
      /* already disconnected */
    }
    try {
      gainRef.current?.disconnect();
    } catch {
      /* already disconnected */
    }
    try {
      sourceRef.current?.disconnect();
    } catch {
      /* already disconnected */
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      audioCtxRef.current.close().catch(() => {});
    }
    audioCtxRef.current = null;
    procRef.current = null;
    sourceRef.current = null;
    gainRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => cleanupGraph, [cleanupGraph]);

  const stop = useCallback((): Promise<AudioRecorderResult | null> => {
    return new Promise((resolve) => {
      const recorder = recorderRef.current;
      const durationSeconds = elapsedRef.current;

      const finish = () => {
        cleanupGraph();
        setStatus("stopped");
        if (chunksRef.current.length === 0) {
          setLastResult(null);
          resolve(null);
          return;
        }
        const blob = new Blob(chunksRef.current, {
          type: chunksRef.current[0]?.type || "audio/webm",
        });
        const url = URL.createObjectURL(blob);
        const result = { blob, url, durationSeconds };
        setLastResult(result);
        resolve(result);
      };

      if (recorder && recorder.state !== "inactive") {
        recorder.onstop = finish;
        recorder.stop();
      } else {
        finish();
      }
    });
  }, [cleanupGraph]);

  const processFrame = useCallback((frame: Float32Array, nowMs: number) => {
    const v = vadRef.current;
    if (!v.noiseStart) v.noiseStart = nowMs;

    let sumSq = 0;
    for (let i = 0; i < frame.length; i++) sumSq += frame[i] * frame[i];
    const rms = Math.sqrt(sumSq / frame.length);
    v.emaRms = v.emaRms == null ? rms : 0.3 * rms + 0.7 * v.emaRms;

    const warmingUp = nowMs - v.noiseStart < NOISE_WARMUP_MS;
    if (warmingUp) {
      v.noiseCount++;
      const d = v.emaRms - v.noiseMean;
      v.noiseMean += d / v.noiseCount;
      v.noiseM2 += d * (v.emaRms - v.noiseMean);
    }
    const noiseStd = Math.sqrt(v.noiseCount > 1 ? v.noiseM2 / (v.noiseCount - 1) : 0);
    const threshold = v.noiseMean + K_SIGMA * noiseStd + 0.005;
    const isVoice = v.emaRms > threshold;

    if (!warmingUp && !isVoice) {
      const d = v.emaRms - v.noiseMean;
      v.noiseMean += NOISE_ADAPT_ALPHA * d;
      const varInc = Math.max(1e-9, d * d);
      v.noiseM2 = (1 - NOISE_ADAPT_ALPHA) * (v.noiseM2 + NOISE_ADAPT_ALPHA * varInc);
    }

    let peak = 0;
    for (let i = 0; i < frame.length; i++) {
      const a = Math.abs(frame[i]);
      if (a > peak) peak = a;
    }
    levelsRef.current[levelsIdxRef.current % LEVELS_SIZE] = Math.min(1, peak * 4);
    levelsIdxRef.current++;

    if (isVoice !== v.speaking) {
      v.speaking = isVoice;
      setIsSpeaking(isVoice);
      if (isVoice) setHasDetectedSpeech(true);
    }
  }, []);

  const start = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setStatus("error");
      setPermissionError("เบราว์เซอร์นี้ไม่รองรับการบันทึกเสียง");
      return false;
    }
    setStatus("requesting-permission");
    setPermissionError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;

      vadRef.current = freshVadState();
      levelsRef.current = Array(LEVELS_SIZE).fill(0);
      levelsIdxRef.current = 0;
      elapsedRef.current = 0;
      chunksRef.current = [];
      setLastResult(null);
      setIsSpeaking(false);
      setHasDetectedSpeech(false);
      setElapsedSeconds(0);

      const ac = new AudioContext();
      const source = ac.createMediaStreamSource(stream);
      const proc = ac.createScriptProcessor(2048, 1, 1);
      // ScriptProcessorNode only keeps firing onaudioprocess while it's
      // connected to a destination — route through a silent gain node
      // instead of straight to ac.destination, otherwise this plays the
      // user's live mic input back out through their speakers, which both
      // creates audible feedback and confuses SpeechRecognition's own
      // independent echo cancellation into hearing near-silence.
      const silentGain = ac.createGain();
      silentGain.gain.value = 0;
      source.connect(proc);
      proc.connect(silentGain);
      silentGain.connect(ac.destination);
      audioCtxRef.current = ac;
      sourceRef.current = source;
      procRef.current = proc;
      gainRef.current = silentGain;
      proc.onaudioprocess = (ev) => {
        processFrame(ev.inputBuffer.getChannelData(0), performance.now());
      };

      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : undefined;
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorderRef.current = recorder;
      recorder.start();

      tickRef.current = window.setInterval(() => {
        setElapsedSeconds((s) => {
          const next = s + 1;
          elapsedRef.current = next;
          if (next >= maxSeconds) {
            stop();
            return maxSeconds;
          }
          return next;
        });
      }, 1000);

      setStatus("recording");
      return true;
    } catch {
      cleanupGraph();
      setStatus("error");
      setPermissionError(
        "ไม่สามารถเข้าถึงไมโครโฟนได้ กรุณาอนุญาตในเบราว์เซอร์ หรือพิมพ์ Feedback ด้วยตนเอง",
      );
      return false;
    }
  }, [maxSeconds, cleanupGraph, processFrame, stop]);

  return {
    status,
    isSupported,
    isSpeaking,
    hasDetectedSpeech,
    elapsedSeconds,
    permissionError,
    lastResult,
    levelsRef,
    start,
    stop,
  };
}
