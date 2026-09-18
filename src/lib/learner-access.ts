import type { QueryClient } from "@tanstack/react-query";
import { getFirebaseAuth } from "@/lib/firebase";
import { waitForFirebaseUser } from "@/lib/firebase-auth";
import { getUserDoc, type UserDoc } from "@/lib/firestore";
import {
  loadAuth,
  resetMockData,
  setAuthFromFirebaseUser,
  syncLearnerSetup,
} from "@/lib/learner.functions";

export const learnerAccessKey = (uid: string) => ["learner-access", uid] as const;

export function getLearnerEntryRoute(doc: UserDoc | null) {
  const consent = doc?.consent;
  if (
    !consent?.researchConsent ||
    !consent.microphonePermission ||
    !consent.audioRecordingConsent
  ) {
    return "/consent" as const;
  }
  const profile = doc?.profile;
  if (
    !profile?.displayName?.trim() ||
    !profile.faculty?.trim() ||
    typeof profile.teachingExperienceYears !== "number" ||
    !Number.isFinite(profile.teachingExperienceYears) ||
    profile.teachingExperienceYears < 0
  ) {
    return "/onboarding" as const;
  }
  return "/dashboard" as const;
}

// Called before route components mount, both at login and on direct visits.
// A failed read must surface as an error, never as an uncompleted form.
export async function loadLearnerAccess(queryClient: QueryClient) {
  const user = await waitForFirebaseUser();
  if (!user) {
    resetMockData();
    queryClient.removeQueries({ queryKey: ["learner-overview"] });
    queryClient.removeQueries({ queryKey: ["learner-access"] });
    return null;
  }

  const userDoc = await queryClient.fetchQuery({
    queryKey: learnerAccessKey(user.uid),
    queryFn: () => getUserDoc(user.uid),
    staleTime: 30_000,
    retry: false,
  });
  if (getFirebaseAuth().currentUser?.uid !== user.uid) {
    throw new Error("บัญชีผู้ใช้เปลี่ยนระหว่างโหลดข้อมูล กรุณาลองอีกครั้ง");
  }

  await queryClient.cancelQueries({ queryKey: ["learner-overview"] });
  if (loadAuth()?.id !== user.uid) {
    queryClient.removeQueries({ queryKey: ["admin-check-access"] });
  }
  setAuthFromFirebaseUser({ id: user.uid, email: user.email ?? "", name: user.displayName });
  const destination = getLearnerEntryRoute(userDoc);
  const overview = syncLearnerSetup(userDoc, destination);
  queryClient.setQueryData(["learner-overview"], overview);
  return { user, destination };
}
