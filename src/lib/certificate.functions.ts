import { httpsCallable } from "firebase/functions";
import { getFirebaseFunctions } from "@/lib/firebase";

export interface IssuedCertificate {
  issuedAt: string;
  certificateId: string;
}

// Server-only decision (see functions/src/certificate.ts) — this just calls
// it. Safe to call speculatively/repeatedly: idempotent once issued, and
// throws failed-precondition (caught by the caller) if the learner hasn't
// actually finished every stage yet.
export async function issueCertificateCall(): Promise<IssuedCertificate> {
  const fn = httpsCallable<void, IssuedCertificate>(getFirebaseFunctions(), "issueCertificate");
  const result = await fn();
  return result.data;
}
