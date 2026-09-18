import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
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
  return { pending: uid ? queued(uid).length : 0, storageFailed, writeFailed };
}
export async function flushActivity(): Promise<void> {
  if (flushing || !navigator.onLine) return;
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) return;
  flushing = true;
  try {
    for (const item of queued(uid)) {
      if (getFirebaseAuth().currentUser?.uid !== uid) break;
      const ref = doc(getDb(), "activity_log", item.id);
      try {
        try {
          await setDoc(ref, { ...item.data, userId: uid, createdAt: serverTimestamp() });
        } catch (error) {
          // Immutable rules reject retries after an acknowledged/lost response.
          const saved = await getDoc(ref);
          if (!saved.exists() || saved.data().userId !== uid || saved.data().eventId !== item.id)
            throw error;
        }
        try {
          localStorage.removeItem(PREFIX + item.id);
        } catch {
          storageFailed = true;
        }
        memory.delete(item.id);
        writeFailed = false;
      } catch (error) {
        writeFailed = true;
        console.warn("[activity] event retained for retry", item.id, error);
        break;
      }
    }
  } finally {
    flushing = false;
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
  void flushActivity();
}
