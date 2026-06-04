// Tiered access logic — pure functions, no Firestore/React imports so they're
// easy to reason about and test. See `UserProfile` in types.ts for the model.
//
// DESIGN DECISION — tier 0/1 sets are FROZEN; new works are tier-2-only.
// A user's tier0Works (5) and tier1Works (10) are drawn once at first sign-in
// (see assignWorks) and NEVER change afterwards — no reshuffle, no top-up.
// Works added to the catalogue later are therefore invisible to tier 0/1 users
// (old or new); the ONLY way to see anything beyond your original selection is
// to reach tier 2 (full catalogue, always live). This is intentional: newer
// works are an upgrade incentive, not a bug. The under-fill case (catalogue
// smaller than 5/15 at signup) is ignored on purpose — the live catalogue is
// well above those counts. If you ever want a "new works free for everyone for
// a week" promotion, that needs new logic; it is not supported here.
import type { Tier, UserProfile } from "./types";

// How many works each tier unlocks beyond the previous one.
export const TIER_BASE_COUNT = 5;    // tier 0
export const TIER1_EXTRA_COUNT = 10; // tier 1 adds this many on top of the base

export const TIER_LABELS: Record<Tier, string> = {
  0: "Tier 0 · 5 works",
  1: "Tier 1 · 15 works",
  2: "Tier 2 · full collection",
};

// Fisher–Yates shuffle on a copy — does not mutate the input.
function shuffle<T>(arr: readonly T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Pick the base (5) and tier-1 extra (10) random work ids for a brand-new user.
 * The two sets are disjoint. If the catalogue is smaller than 5/15, each set
 * just gets as many as exist (an upgrade later still works once more are added,
 * but existing users are not retro-assigned — that's intentional).
 */
export function assignWorks(allArtworkIds: readonly string[]): {
  tier0Works: string[];
  tier1Works: string[];
} {
  const shuffled = shuffle(allArtworkIds);
  return {
    tier0Works: shuffled.slice(0, TIER_BASE_COUNT),
    tier1Works: shuffled.slice(TIER_BASE_COUNT, TIER_BASE_COUNT + TIER1_EXTRA_COUNT),
  };
}

/**
 * The set of artwork ids a profile can currently view, given the live catalogue.
 * - No profile (signed-out) → nothing unlocked.
 * - Tier 0 → tier0Works.
 * - Tier 1 → tier0Works ∪ tier1Works.
 * - Tier 2 → every id in the catalogue.
 */
export function unlockedIds(
  profile: UserProfile | null,
  allArtworkIds: readonly string[]
): Set<string> {
  if (!profile) return new Set();
  if (profile.tier >= 2) return new Set(allArtworkIds);
  const ids = new Set(profile.tier0Works);
  if (profile.tier >= 1) profile.tier1Works.forEach((id) => ids.add(id));
  return ids;
}

export function isUnlocked(
  profile: UserProfile | null,
  artworkId: string,
  allArtworkIds: readonly string[]
): boolean {
  return unlockedIds(profile, allArtworkIds).has(artworkId);
}
