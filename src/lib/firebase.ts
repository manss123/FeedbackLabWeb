import {
  initializeApp,
  getApps,
  getApp,
  type FirebaseApp,
  type FirebaseOptions,
} from "firebase/app";
import { getFirestore, connectFirestoreEmulator, type Firestore } from "firebase/firestore";
import { getAuth, connectAuthEmulator, type Auth } from "firebase/auth";
import { getStorage, connectStorageEmulator, type FirebaseStorage } from "firebase/storage";
import { getFunctions, connectFunctionsEmulator, type Functions } from "firebase/functions";

function readConfig(): FirebaseOptions {
  const config: FirebaseOptions = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };

  if (!config.apiKey || !config.projectId) {
    throw new Error(
      "Missing Firebase environment variables — set VITE_FIREBASE_API_KEY / VITE_FIREBASE_PROJECT_ID (and the other VITE_FIREBASE_* vars) in .env before using Firebase.",
    );
  }
  return config;
}

let _app: FirebaseApp | undefined;

// Lazily initialized so importing this module is safe even before Firebase
// env vars are configured — the app (and any config error) is only created
// once something actually calls one of the getters below.
export function getFirebaseApp(): FirebaseApp {
  if (!_app) _app = getApps().length ? getApp() : initializeApp(readConfig());
  return _app;
}

// Explicit opt-in switch (set VITE_USE_EMULATOR=true in .env, or pass it at
// build/deploy time) rather than tying this to dev-vs-prod — lets the same
// build target either the local emulators (ports match firebase.json; see
// `npm run emu`) or the real Firebase project on demand. connect*Emulator
// must be called exactly once, immediately after each instance is created,
// before anything else touches it — both guaranteed by the lazy-getter
// pattern below.
const USE_EMULATORS = import.meta.env.VITE_USE_EMULATOR === "true";

let _db: Firestore | undefined;
export function getDb(): Firestore {
  if (!_db) {
    _db = getFirestore(getFirebaseApp());
    if (USE_EMULATORS) connectFirestoreEmulator(_db, "127.0.0.1", 8085);
  }
  return _db;
}

let _auth: Auth | undefined;
export function getFirebaseAuth(): Auth {
  if (!_auth) {
    _auth = getAuth(getFirebaseApp());
    if (USE_EMULATORS)
      connectAuthEmulator(_auth, "http://127.0.0.1:9099", { disableWarnings: true });
  }
  return _auth;
}

let _storage: FirebaseStorage | undefined;
export function getFirebaseStorage(): FirebaseStorage {
  if (!_storage) {
    _storage = getStorage(getFirebaseApp());
    if (USE_EMULATORS) connectStorageEmulator(_storage, "127.0.0.1", 9199);
  }
  return _storage;
}

// Calls into the deployed Cloud Functions codebase — see functions/src/index.ts.
let _functions: Functions | undefined;
export function getFirebaseFunctions(): Functions {
  if (!_functions) {
    _functions = getFunctions(getFirebaseApp());
    if (USE_EMULATORS) connectFunctionsEmulator(_functions, "127.0.0.1", 5001);
  }
  return _functions;
}
