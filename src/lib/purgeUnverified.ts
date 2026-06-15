// Server-only: delete unverified Firebase Auth accounts (and their Firestore
// leftovers). Used by /api/admin/purge-unverified for both one-shot cleanups and
// scheduled runs. Never touches verified users or admins.
import { adminAuth, adminDb } from "./firebaseAdmin";

export interface PurgeResult {
  scanned: number;
  deleted: number;
}

/**
 * Delete unverified accounts older than `maxAgeHours` (0 = all unverified,
 * regardless of age). For each: removes the Auth user plus any `users/{uid}`
 * profile and `mailFlags/{uid}` doc. Skips verified users and admins.
 */
export async function purgeUnverifiedUsers(maxAgeHours: number): Promise<PurgeResult> {
  const cutoff = Date.now() - maxAgeHours * 60 * 60 * 1000;

  // Never delete an admin, even if somehow unverified.
  const adminSnap = await adminDb.collection("admins").get();
  const adminUids = new Set(adminSnap.docs.map((d) => d.id));

  let scanned = 0;
  let deleted = 0;
  let pageToken: string | undefined;
  do {
    const res = await adminAuth.listUsers(1000, pageToken);
    for (const u of res.users) {
      scanned++;
      if (u.emailVerified) continue;
      if (adminUids.has(u.uid)) continue;
      // Give recent signups time to verify before reaping them.
      const created = Date.parse(u.metadata.creationTime);
      if (Number.isFinite(created) && created > cutoff) continue;

      await adminAuth.deleteUser(u.uid);
      await adminDb.collection("users").doc(u.uid).delete().catch(() => {});
      await adminDb.collection("mailFlags").doc(u.uid).delete().catch(() => {});
      deleted++;
    }
    pageToken = res.pageToken;
  } while (pageToken);

  return { scanned, deleted };
}
