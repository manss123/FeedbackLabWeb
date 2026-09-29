import { doc, getDocFromServer, setDoc, serverTimestamp } from "firebase/firestore";
import { getDb, getFirebaseAuth } from "@/lib/firebase";
import { getUsageContext } from "@/lib/usage-context";
import type { ActivityPayload } from "@/types/activity.types";

// One key per event avoids cross-tab read/modify/write races. Retries reuse IDs.
const PREFIX = "feedbacklab.activity.v2.";
interface QueuedEvent {
  id: string;
  userId: string;
  data: Record<string, unknown>;
}
const memory = new Map<string, QueuedEvent>();
let flushing = false;
let storageFailed = false;
let writeFailed = false;
let errorCode: string | null = null;
let failureUid: string | null = null;
let retryAt = 0;
let failures = 0;
let scheduled: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();
export function subscribeActivitySync(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
function notify() {
  for (const listener of listeners) listener();
}
function queued(uid: string) {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(PREFIX)) continue;
      try {
        const item = JSON.parse(localStorage.getItem(key) || "null") as QueuedEvent | null;
        if (item?.userId === uid && item.id && item.data) memory.set(item.id, item);
      } catch {
        /* retain malformed records for inspection */
      }
    }
  } catch {
    storageFailed = true;
  }
  return [...memory.values()].filter((e) => e.userId === uid);
}
export function activitySyncStatus() {
  const uid = getFirebaseAuth().currentUser?.uid;
  const items = uid ? queued(uid) : [];
  const oldest = Math.min(
    ...items.map((item) => Date.parse(String(item.data.occurredAt))).filter(Number.isFinite),
  );
  return {
    pending: items.length,
    storageFailed,
    writeFailed: uid === failureUid && writeFailed,
    errorCode: uid === failureUid ? errorCode : null,
    oldestPendingMs: Number.isFinite(oldest) ? Math.max(0, Date.now() - oldest) : 0,
  };
}
export async function flushActivity(force = false): Promise<void> {
  if (flushing || !navigator.onLine) return;
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) return;
  if (!force && failureUid === uid && Date.now() < retryAt) return;
  clearTimeout(scheduled);
  scheduled = undefined;
  flushing = true;
  try {
    // Drain events added while a previous write was in flight too.
    while (getFirebaseAuth().currentUser?.uid === uid) {
      const item = queued(uid)[0];
      if (!item) break;
      if (getFirebaseAuth().currentUser?.uid !== uid) break;
      const ref = doc(getDb(), "activity_log", item.id);
      try {
        try {
          await setDoc(ref, { ...item.data, userId: uid, createdAt: serverTimestamp() });
        } catch (error) {
          // Immutable rules reject retries after an acknowledged/lost response.
          let acknowledged = false;
          try {
            const saved = await getDocFromServer(ref);
            acknowledged =
              saved.exists() && saved.data().userId === uid && saved.data().eventId === item.id;
          } catch {
            /* Keep the original write failure, not the fallback read error. */
          }
          if (!acknowledged) throw error;
        }
        let removed = true;
        try {
          localStorage.removeItem(PREFIX + item.id);
        } catch {
          storageFailed = true;
          removed = false;
        }
        memory.delete(item.id);
        writeFailed = false;
        failureUid = null;
        errorCode = null;
        failures = 0;
        retryAt = 0;
        notify();
        if (!removed) break; // Avoid re-reading and resending an undeletable storage key forever.
      } catch (error) {
        writeFailed = true;
        failureUid = uid;
        errorCode =
          typeof (error as { code?: unknown })?.code === "string"
            ? (error as { code: string }).code
            : "unknown";
        retryAt = Date.now() + Math.min(60_000, 5000 * 2 ** Math.min(failures++, 4));
        console.warn("[activity] event retained for retry", item.id, error);
        break;
      }
    }
  } finally {
    flushing = false;
    notify();
  }
}
export async function logActivity(payload: ActivityPayload): Promise<void> {
  // Capture identity now; never attribute delayed events to the next account.
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) return;
  const id = crypto.randomUUID();
  const item: QueuedEvent = {
    id,
    userId: uid,
    data: {
      ...getUsageContext(uid),
      ...payload,
      eventId: id,
      schemaVersion: 2,
      occurredAt: new Date().toISOString(),
      clientTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  };
  memory.set(id, item);
  try {
    localStorage.setItem(PREFIX + id, JSON.stringify(item));
  } catch {
    storageFailed = true;
  }
  // Coalesce rapid route/lifecycle bursts, retaining each immutable event locally.
  notify();
  if (!scheduled)
    scheduled = setTimeout(() => {
      scheduled = undefined;
      void flushActivity();
    }, 1000);
}
