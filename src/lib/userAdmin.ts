// Server-only user-profile writes via the Firebase Admin SDK. These bypass
// Firestore security rules, so they're the ONLY place `tier` is ever changed —
// keeping paid access ungrantable from the client.
import { adminDb } from "./firebaseAdmin";
import type { Tier } from "./types";

const usersDoc = (uid: string) => adminDb.collection("users").doc(uid);

/** Set a user's access tier (called from Stripe fulfilment / webhook). */
export async function adminSetTier(uid: string, tier: Tier): Promise<void> {
  await usersDoc(uid).set(
    { tier, updatedAt: Date.now() },
    { merge: true }
  );
}

/** Persist the Stripe customer/subscription ids so the webhook can map events back to a uid. */
export async function adminLinkStripe(
  uid: string,
  data: { stripeCustomerId?: string; stripeSubscriptionId?: string }
): Promise<void> {
  await usersDoc(uid).set({ ...data, updatedAt: Date.now() }, { merge: true });
}

/** Find the uid whose profile is linked to a given Stripe customer id. */
export async function adminUidForCustomer(stripeCustomerId: string): Promise<string | null> {
  const snap = await adminDb
    .collection("users")
    .where("stripeCustomerId", "==", stripeCustomerId)
    .limit(1)
    .get();
  return snap.empty ? null : snap.docs[0].id;
}
