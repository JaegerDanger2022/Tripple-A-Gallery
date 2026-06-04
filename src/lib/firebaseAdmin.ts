// Server-only Firebase Admin SDK.
// On Firebase-hosted Next.js (web frameworks) the SSR runtime provides
// Application Default Credentials, so no service-account key file is needed.
// For local dev, set GOOGLE_APPLICATION_CREDENTIALS to a service-account JSON
// (or run `firebase emulators`/`gcloud auth application-default login`).
import { getApps, initializeApp, applicationDefault, cert, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

function buildApp(): App {
  if (getApps().length) return getApps()[0]!;

  const projectId =
    process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const storageBucket =
    process.env.FIREBASE_STORAGE_BUCKET ?? process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

  // Prefer an explicit service-account JSON if provided (handy for local dev),
  // otherwise fall back to Application Default Credentials.
  const saJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  const credential = saJson ? cert(JSON.parse(saJson)) : applicationDefault();

  return initializeApp({ credential, projectId, storageBucket });
}

const app = buildApp();

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);
export const adminStorage = getStorage(app);
