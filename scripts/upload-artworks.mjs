/**
 * upload-artworks.mjs
 *
 * Uploads every PNG from the source folder to Firebase Storage,
 * then creates (or updates) a Firestore document for each lot.
 *
 * Usage:
 *   node scripts/upload-artworks.mjs
 *
 * Requires .env.local to be populated with Firebase credentials.
 */

import { readFileSync, readdirSync } from "fs";
import { join, basename, extname } from "path";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "../.env.local") });

// ── Firebase Admin init ───────────────────────────────────────────────────────
// Uses the same env vars as the client SDK — Admin SDK accepts the same project.
// We authenticate via Application Default Credentials (firebase CLI login) or
// a service account key if ADC is not available.

const firebaseConfig = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
};

if (!getApps().length) {
  try {
    // Try ADC first (works when logged in via `firebase login`)
    initializeApp({ ...firebaseConfig, credential: (await import("firebase-admin/app")).applicationDefault() });
  } catch {
    console.error("❌  No Application Default Credentials found.");
    console.error("   Run: firebase login --reauth   then retry.");
    process.exit(1);
  }
}

const db = getFirestore();
const bucket = getStorage().bucket();

// ── Source folder ─────────────────────────────────────────────────────────────
const SOURCE_DIR = "G:/My Drive/Tripple-A-Gallery";

const files = readdirSync(SOURCE_DIR)
  .filter((f) => extname(f).toLowerCase() === ".png")
  .sort((a, b) => {
    // Natural sort so AAA1 < AAA2 < AAA10
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
  });

console.log(`\nFound ${files.length} images in ${SOURCE_DIR}\n`);

// ── Derive lot number from filename ───────────────────────────────────────────
function toLotNumber(filename) {
  return basename(filename, extname(filename)); // strip extension
}

// ── Assign display order deterministically ────────────────────────────────────
// AAA series first, then TA series, then Tripple A series
function seriesGroup(lotNumber) {
  if (lotNumber.startsWith("AAA")) return 0;
  if (lotNumber.startsWith("TA")) return 1;
  return 2; // "Tripple A ..."
}

function numericPart(lotNumber) {
  const match = lotNumber.match(/(\d+)$/);
  return match ? parseInt(match[1], 10) : 0;
}

const sorted = [...files].sort((a, b) => {
  const la = toLotNumber(a), lb = toLotNumber(b);
  const ga = seriesGroup(la), gb = seriesGroup(lb);
  if (ga !== gb) return ga - gb;
  return numericPart(la) - numericPart(lb);
});

// ── Upload + seed ─────────────────────────────────────────────────────────────
let order = 0;
for (const filename of sorted) {
  const lotNumber = toLotNumber(filename);
  const localPath = join(SOURCE_DIR, filename);
  const storagePath = `artworks/${filename}`;

  process.stdout.write(`[${String(order + 1).padStart(2, "0")}/${files.length}] ${lotNumber} — uploading… `);

  // Upload to Storage
  await bucket.upload(localPath, {
    destination: storagePath,
    metadata: { contentType: "image/png", cacheControl: "public, max-age=31536000" },
    // Make publicly readable
    predefinedAcl: "publicRead",
  });

  const imageUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath.split("/").map(encodeURIComponent).join("/")}`;

  // Upsert Firestore doc — use lotNumber as the document ID
  const docRef = db.collection("artworks").doc(lotNumber);
  const existing = await docRef.get();

  if (existing.exists) {
    // Only update imageUrl and order — don't overwrite price/category etc if already set
    await docRef.update({ imageUrl, order, updatedAt: new Date() });
    console.log("updated (preserved existing fields)");
  } else {
    await docRef.set({
      lotNumber,
      imageUrl,
      order,
      price: 0,           // set via admin
      category: "",       // set via admin
      color: "#ccbbaa",
      accent: "#555544",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log("created");
  }

  order++;
}

console.log(`\n✓ Done — ${files.length} artworks uploaded and seeded in Firestore.\n`);
console.log("Next steps:");
console.log("  1. Go to /aaa-ops-92x4k1/artworks to set prices, categories, and medium for each lot.");
console.log("  2. Deploy Firestore + Storage rules:  firebase deploy --only firestore:rules,storage\n");
