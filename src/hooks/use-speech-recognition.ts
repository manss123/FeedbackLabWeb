import { useCallback, useEffect, useRef, useState } from "react";

// The Web Speech API's SpeechRecognition isn't in lib.dom.d.ts — shape it
// locally to the handful of members this hook actually uses.
interface SpeechRecognitionResultLike {
  readonly isFinal: boolean;
  [index: number]: { transcript: string };
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionErrorEventLike {
  error: string;
}
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: SpeechRecognitionErrorEventLike) => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

// Ignore stray interim results for a short window right after a final commit,
// so a late-arriving partial doesn't flicker over text that just settled.
// Ported concept from FeedbacksSystemPrototype/src/App.vue's freezeTranscript.
const FREEZE_MS = 1200;

// Errors that mean "this will never work in this session" — stop the
// self-healing restart loop and surface a message instead of retrying
// forever in silence. Everything else (no-speech, aborted, a single
// network blip) is expected/transient and keeps auto-restarting quietly.
const FATAL_ERRORS = new Set([
  "not-allowed",
  "service-not-allowed",
  "audio-capture",
  "language-not-supported",
]);
const NETWORK_FATAL_STREAK = 2;

function friendlyError(reason: string): string {
  switch (reason) {
    case "not-allowed":
    case "service-not-allowed":
      return "เบราว์เซอร์ไม่อนุญาตให้ใช้การแปลงเสียงเป็นข้อความ กรุณาพิมพ์ Feedback ด้วยตนเอง";
    case "audio-capture":
      return "ไม่สามารถเข้าถึงไมโครโฟนสำหรับแปลงเสียงเป็นข้อความได้ กรุณาพิมพ์ Feedback ด้วยตนเอง";
    case "language-not-supported":
      return "เบราว์เซอร์นี้ไม่รองรับภาษาไทยสำหรับแปลงเสียงเป็นข้อความ กรุณาพิมพ์ Feedback ด้วยตนเอง";
    case "network":
      return "ไม่สามารถเชื่อมต่อบริการแปลงเสียงเป็นข้อความได้ (ต้องใช้อินเทอร์เน็ต) กรุณาพิมพ์ Feedback ด้วยตนเอง";
    default:
      return "การแปลงเสียงเป็นข้อความขัดข้อง กรุณาพิมพ์ Feedback ด้วยตนเอง";
  }
}

export function useSpeechRecognition({ lang = "th-TH" }: { lang?: string } = {}) {
  const Ctor = getSpeechRecognitionCtor();
  const isSupported = !!Ctor;

  const [listening, setListening] = useState(false);
  const [finalTranscript, setFinalTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const keepAliveRef = useRef(false);
  const restartTimerRef = useRef<number | null>(null);
  const frozenUntilRef = useRef(0);
  const networkErrorStreakRef = useRef(0);

  const teardown = useCallback(() => {
    keepAliveRef.current = false;
    if (restartTimerRef.current) {
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    try {
      recRef.current?.stop();
    } catch {
      /* already stopped */
    }
    recRef.current = null;
  }, []);

  useEffect(() => teardown, [teardown]);

  const start = useCallback(() => {
    if (!Ctor) return;
    teardown();
    setFinalTranscript("");
    setInterimTranscript("");
    setError(null);
    frozenUntilRef.current = 0;
    networkErrorStreakRef.current = 0;

    const rec = new Ctor();
    rec.lang = lang;
    rec.interimResults = true;
    rec.continuous = true;
    rec.maxAlternatives = 1;

    rec.onresult = (e) => {
      networkErrorStreakRef.current = 0;
      let interim = "";
      let final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        const transcript = r[0].transcript;
        if (r.isFinal) final += transcript;
        else interim += transcript;
      }
      if (final) {
        // Append rather than replace — resultIndex only reports the newest
        // delta, so replacing would drop earlier sentences in a long session.
        setFinalTranscript((prev) => (prev ? `${prev} ${final}`.trim() : final.trim()));
        setInterimTranscript("");
        frozenUntilRef.current = Date.now() + FREEZE_MS;
      } else if (interim && Date.now() >= frozenUntilRef.current) {
        setInterimTranscript(interim);
      }
    };
    rec.onend = () => {
      if (keepAliveRef.current) {
        restartTimerRef.current = window.setTimeout(() => {
          try {
            rec.start();
          } catch {
            /* already running */
          }
        }, 120);
      }
    };
    rec.onerror = (e) => {
      const reason = e?.error ?? "unknown";
      const isNetworkFatal =
        reason === "network" && ++networkErrorStreakRef.current >= NETWORK_FATAL_STREAK;

      if (FATAL_ERRORS.has(reason) || isNetworkFatal) {
        keepAliveRef.current = false;
        setListening(false);
        setError(friendlyError(reason));
        return;
      }
      // Transient (no-speech, aborted, a single network blip) — keep the
      // self-healing restart loop going quietly, same as onend above.
      if (keepAliveRef.current) {
        restartTimerRef.current = window.setTimeout(() => {
          try {
            rec.start();
          } catch {
            /* already running */
          }
        }, 250);
      }
    };

    recRef.current = rec;
    keepAliveRef.current = true;
    try {
      rec.start();
      setListening(true);
    } catch {
      // Synchronous throw (e.g. the mic is already claimed by another
      // consumer) — no browser event will ever fire for this, so surface
      // it ourselves instead of leaving `listening: true` with dead air.
      keepAliveRef.current = false;
      recRef.current = null;
      setListening(false);
      setError(friendlyError("audio-capture"));
    }
  }, [Ctor, lang, teardown]);

  const stop = useCallback(() => {
    teardown();
    setListening(false);
    setInterimTranscript("");
  }, [teardown]);

  const reset = useCallback(() => {
    setFinalTranscript("");
    setInterimTranscript("");
    setError(null);
  }, []);

  return { isSupported, listening, finalTranscript, interimTranscript, error, start, stop, reset };
}
