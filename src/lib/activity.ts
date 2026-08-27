import { addDoc, collection, serverTimestamp, type DocumentData } from "firebase/firestore";
import { getDb, getFirebaseAuth } from "@/lib/firebase";
import { waitForFirebaseUser } from "@/lib/firebase-auth";
import { COLLECTIONS } from "@/lib/firestore";
import type { ActivityPayload } from "@/types/activity.types";

// Best-effort, fire-and-forget — same treatment as the upsertUserDoc calls
// already in consent.tsx/onboarding.tsx (try/catch + console.warn, never
// blocks the caller's own mutation success path or navigation). No
// queue/batching: milestone events are low-volume by design (see
// activity.types.ts), so a rare dropped write on a network blip is an
// acceptable audit-trail gap rather than something worth building
// offline-sync infrastructure for.
export async function logActivity(payload: ActivityPayload): Promise<void> {
  try {
    const uid = getFirebaseAuth().currentUser?.uid ?? (await waitForFirebaseUser())?.uid;
    if (!uid) return;
    await addDoc(collection(getDb(), COLLECTIONS.activity_log), {
      ...payload,
      userId: uid,
      createdAt: serverTimestamp(),
    } as DocumentData);
  } catch (e) {
    console.warn(`[activity] failed to log ${payload.type}`, e);
  }
}
