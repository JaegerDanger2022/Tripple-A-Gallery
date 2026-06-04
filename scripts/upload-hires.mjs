// Upload hi-res digital-download originals to PRIVATE Storage and set
// `hiResPath` on each matching artwork in Firestore.
//
// Filenames must equal the artwork/lot ID (minus extension), e.g.
//   AAA1.jpg, TA4.png, "Tripple A 1.jpg"
//
// The files are uploaded privately (NOT made public). Buyers only ever receive
// them through the gated /api/download route, which mints a short-lived signed
// URL after verifying the purchase. Storage path layout matches that route and
// `uploadHiResImage` in src/lib/firestore.ts:  hires/{encodedArtworkId}/{file}
//
// Usage:
//   node scripts/upload-hires.mjs                 (uses SOURCE_DIR below)
//   node scripts/upload-hires.mjs "D:\\path\\to\\hires"   (overrides SOURCE_DIR)

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { readFileSync, readdirSync, statSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join, extname, basename } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Config ───────────────────────────────────────────────────────────────────
// Paste your hi-res directory path here, or pass it as the first CLI argument.
const SOURCE_DIR = process.argv[2] || "PASTE_HIRES_DIR_HERE";

const serviceAccount = JSON.parse(
  readFileSync(
    join(__dirname, "../tripple-a-gallery-firebase-adminsdk-fbsvc-d638c10ac2.json"),
    "utf8"
  )
);

initializeApp({
  credential: cert(serviceAccount),
  storageBucket: "tripple-a-gallery.firebasestorage.app",
});

const db = getFirestore();
const bucket = getStorage().bucket();

const CONTENT_TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".tif": "image/tiff",
  ".tiff": "image/tiff",
  ".gif": "image/gif",
};

async function run() {
  if (SOURCE_DIR === "PASTE_HIRES_DIR_HERE") {
    console.error("✗ No source directory. Pass it as an argument:\n  node scripts/upload-hires.mjs \"C:\\\\path\\\\to\\\\hires\"");
    process.exit(1);
  }

  const entries = readdirSync(SOURCE_DIR).filter((f) => {
    const ext = extname(f).toLowerCase();
    return ext in CONTENT_TYPES && statSync(join(SOURCE_DIR, f)).isFile();
  });

  if (entries.length === 0) {
    console.error(`✗ No image files found in ${SOURCE_DIR}`);
    process.exit(1);
  }

  console.log(`Found ${entries.length} hi-res file(s) in ${SOURCE_DIR}\n`);

  let uploaded = 0;
  let skipped = 0;

  for (const filename of entries) {
    const ext = extname(filename);
    const artworkId = basename(filename, ext); // filename === artwork ID

    // Confirm the artwork exists before uploading anything for it.
    const docRef = db.collection("artworks").doc(artworkId);
    const snap = await docRef.get();
    if (!snap.exists) {
      console.log(`  SKIP  "${filename}" — no artwork doc for id "${artworkId}"`);
      skipped++;
      continue;
    }

    // Mirror runtime path: hires/{encodedArtworkId}/{timestamp}-{safeName}
    const safeName = filename.replace(/[^\w.\-]+/g, "_");
    const storagePath = `hires/${encodeURIComponent(artworkId)}/${Date.now()}-${safeName}`;

    const buffer = readFileSync(join(SOURCE_DIR, filename));
    const file = bucket.file(storagePath);
    // PRIVATE upload — no makePublic(). Served only via signed URLs.
    await file.save(buffer, {
      contentType: CONTENT_TYPES[ext.toLowerCase()] || "application/octet-stream",
      resumable: false,
    });

    await docRef.update({ hiResPath: storagePath, updatedAt: Date.now() });
    console.log(`  OK    "${filename}" → ${storagePath}`);
    uploaded++;
  }

  console.log(`\nDone. Uploaded ${uploaded}, skipped ${skipped}.`);
  if (skipped > 0) {
    console.log("Skipped files had no matching artwork doc — check the filename equals the lot/artwork ID exactly.");
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
