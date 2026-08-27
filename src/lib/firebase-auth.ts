import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";

export type { User as FirebaseUser };

// In dev this hits the Auth Emulator (see firebase.ts) — the emulator shows
// its own fake account-chooser instead of a real Google consent screen, so no
// real OAuth client needs to be configured for local testing. In production
// this requires Google enabled as a sign-in provider in the Firebase console.
export async function signInWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(getFirebaseAuth(), provider);
  return result.user;
}

export async function signOutOfFirebase(): Promise<void> {
  await signOut(getFirebaseAuth());
}

// One-shot read of the current session (e.g. Firebase restoring a persisted
// login on page load) — resolves once, after the SDK's first auth-state event.
export function waitForFirebaseUser(): Promise<User | null> {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(getFirebaseAuth(), (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

export function onFirebaseAuthChanged(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(getFirebaseAuth(), callback);
}
