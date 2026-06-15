// Server-only user-profile writes via the Firebase Admin SDK. These bypass
// Firestore security rules, so they're the ONLY place `tier` is ever changed —
// keeping paid access ungrantable from the client.
import { adminDb } from "./firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import type { Tier } from "./types";

const usersDoc = (uid: string) => adminDb.collection("users").doc(uid);

/**
 * Claim the one-time signup welcome email for a user. Returns true only for the
 * first caller (transactional), so React re-renders / retries can't resend.
 * Uses a dedicated `mailFlags` collection so it never races with client-side
 * profile creation (ensureUserProfile) writing the same user doc.
 */
export async function adminClaimWelcomeEmail(uid: string): Promise<boolean> {
  const ref = adminDb.collection("mailFlags").doc(uid);
  return adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists && snap.data()?.welcome) return false;
    tx.set(ref, { welcome: true, welcomeAt: FieldValue.serverTimestamp() }, { merge: true });
    return true;
  });
}

/**
 * Detect a membership change that hasn't been emailed yet. Compares the user's
 * current `tier` to `notifiedTier`; if they differ, advances `notifiedTier` to
 * match (in a transaction) and returns the transition + email so the caller can
 * send exactly one membership email. Returns null when already up to date — so
 * it's safe to call from every tier-changing path (confirm redirect + webhook)
 * without ever double-sending.
 */
export async function adminNotifyTierChange(
  uid: string
): Promise<{ from: Tier; to: Tier; email: string } | null> {
  const ref = usersDoc(uid);
  return adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return null;
    const data = snap.data() ?? {};
    const to = (data.tier ?? 0) as Tier;
    const from = (data.notifiedTier ?? 0) as Tier;
    if (from === to) return null;
    tx.update(ref, { notifiedTier: to });
    return { from, to, email: (data.email ?? "") as string };
  });
}

/** Set a user's access tier (called from Stripe fulfilment / webhook). */
export async function adminSetTier(uid: string, tier: Tier): Promise<void> {
  await usersDoc(uid).set(
    { tier, updatedAt: Date.now() },
    { merge: true }
  );
}

/**
 * True when an admin has locked this user's tier. While locked, Stripe
 * fulfilment must NOT change the tier — the manually-set tier always wins.
 * Missing doc / missing flag → not locked.
 */
export async function adminIsTierLocked(uid: string): Promise<boolean> {
  const snap = await usersDoc(uid).get();
  return snap.exists ? snap.data()?.adminTierLock === true : false;
}

/** Persist the Stripe customer/subscription ids so the webhook can map events back to a uid. */
export async function adminLinkStripe(
  uid: string,
  data: { stripeCustomerId?: string; stripeSubscriptionId?: string }
): Promise<void> {
  await usersDoc(uid).set({ ...data, updatedAt: Date.now() }, { merge: true });
}

/** The Stripe customer id linked to a user, or null if they've never subscribed. */
export async function adminStripeCustomerId(uid: string): Promise<string | null> {
  const snap = await usersDoc(uid).get();
  return snap.exists ? (snap.data()?.stripeCustomerId ?? null) : null;
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
