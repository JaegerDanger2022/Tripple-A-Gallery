// Server-only rate limiter backed by Firestore, so it holds across App Hosting
// instances (an in-memory limiter wouldn't). Used to stop abuse of the
// unauthenticated password-reset endpoint and to soft-cap verification resends.
import { adminDb } from "./firebaseAdmin";

/**
 * True when the action for `key` is allowed right now; false if it already ran
 * within the last `windowMs`. Records the timestamp (transactionally) when it
 * allows, so concurrent calls can't both pass.
 */
export async function adminThrottle(key: string, windowMs: number): Promise<boolean> {
  const ref = adminDb.collection("throttle").doc(encodeURIComponent(key));
  return adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const now = Date.now();
    const last = snap.exists ? (snap.data()?.at as number | undefined) : undefined;
    if (last && now - last < windowMs) return false;
    tx.set(ref, { at: now });
    return true;
  });
}
