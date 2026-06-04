// One-off backfill: create a users/{uid} profile for every existing Firebase
// Auth user that doesn't already have one. New users get the same treatment the
// app gives on first sign-in — tier 0 with a random 5 (tier0Works) + 10
// (tier1Works) drawn from the live catalogue.
//
// Idempotent: users who already have a profile are skipped, so it's safe to
// re-run. Tier is NEVER raised here — only tier-0 profiles are created.
//
// Run:  node scripts/backfill-user-profiles.mjs
// Add:  --dry-run   to preview without writing.
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DRY_RUN = process.argv.includes("--dry-run");

const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, "../tripple-a-gallery-firebase-adminsdk-fbsvc-d638c10ac2.json"), "utf8")
);

initializeApp({ credential: cert(serviceAccount) });

const auth = getAuth();
const db = getFirestore();

// ── Keep in lockstep with src/lib/tier.ts ────────────────────────────────────
const TIER_BASE_COUNT = 5;
const TIER1_EXTRA_COUNT = 10;

function shuffle(arr) {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function assignWorks(allIds) {
  const shuffled = shuffle(allIds);
  return {
    tier0Works: shuffled.slice(0, TIER_BASE_COUNT),
    tier1Works: shuffled.slice(TIER_BASE_COUNT, TIER_BASE_COUNT + TIER1_EXTRA_COUNT),
  };
}

// Iterate every Auth user (paginated 1000 at a time).
async function* allAuthUsers() {
  let pageToken;
  do {
    const res = await auth.listUsers(1000, pageToken);
    for (const u of res.users) yield u;
    pageToken = res.pageToken;
  } while (pageToken);
}

async function run() {
  console.log(DRY_RUN ? "DRY RUN — no writes will be made.\n" : "");

  // 1) Live catalogue ids to draw from.
  const artSnap = await db.collection("artworks").get();
  const allIds = artSnap.docs.map((d) => d.id);
  if (allIds.length === 0) {
    console.error("No artworks found in Firestore — aborting (nothing to assign).");
    process.exit(1);
  }
  console.log(`Catalogue: ${allIds.length} works.\n`);

  let created = 0;
  let skipped = 0;
  let total = 0;

  for await (const user of allAuthUsers()) {
    total++;
    const ref = db.collection("users").doc(user.uid);
    const existing = await ref.get();
    if (existing.exists) {
      skipped++;
      continue;
    }

    const { tier0Works, tier1Works } = assignWorks(allIds);
    const now = Date.now();
    const profile = {
      email: user.email ?? "",
      tier: 0,
      tier0Works,
      tier1Works,
      createdAt: now,
      updatedAt: now,
    };

    if (DRY_RUN) {
      console.log(`WOULD CREATE  ${user.uid}  ${user.email ?? "(no email)"}  → 5+10 works`);
    } else {
      await ref.set(profile);
      console.log(`CREATED       ${user.uid}  ${user.email ?? "(no email)"}`);
    }
    created++;
  }

  console.log(`\nDone. ${total} auth users · ${created} ${DRY_RUN ? "to create" : "created"} · ${skipped} already had a profile.`);
  process.exit(0);
}

run().catch((e) => {
  console.error("Backfill failed:", e);
  process.exit(1);
});
