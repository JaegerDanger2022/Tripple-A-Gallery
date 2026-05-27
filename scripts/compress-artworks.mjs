/**
 * compress-artworks.mjs
 * - Reads original PNGs from G:/My Drive/Tripple-A-Gallery
 * - Compresses to WebP (quality 82, max 1800px wide)
 * - Uploads compressed WebP to Firebase Storage (artworks/<lot>.webp)
 * - Deletes the old PNG from Storage
 * - Updates imageUrl in Firestore to the new WebP URL
 */

import { readFileSync, readdirSync, mkdirSync, writeFileSync, unlinkSync } from "fs";
import { join, basename, extname, dirname } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";
import sharp from "sharp";
import { initializeApp, getApps, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "../.env.local") });

if (!getApps().length) {
  initializeApp({
    credential: applicationDefault(),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

const db = getFirestore();
const bucket = getStorage().bucket();

const SOURCE_DIR = "G:/My Drive/Tripple-A-Gallery";
const TMP_DIR = join(__dirname, "../.tmp-webp");
mkdirSync(TMP_DIR, { recursive: true });

const files = readdirSync(SOURCE_DIR)
  .filter((f) => extname(f).toLowerCase() === ".png")
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));

console.log(`\nCompressing and re-uploading ${files.length} images…\n`);

let totalBefore = 0;
let totalAfter = 0;

for (const filename of files) {
  const lotNumber = basename(filename, ".png");
  const srcPath = join(SOURCE_DIR, filename);
  const webpName = `${lotNumber}.webp`;
  const tmpPath = join(TMP_DIR, webpName);
  const storageDest = `artworks/${webpName}`;
  const oldStoragePath = `artworks/${filename}`;

  const srcBuf = readFileSync(srcPath);
  totalBefore += srcBuf.length;

  // Compress: resize to max 1800px wide, WebP quality 82
  const compressed = await sharp(srcBuf)
    .resize({ width: 1800, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();

  totalAfter += compressed.length;
  writeFileSync(tmpPath, compressed);

  const before = (srcBuf.length / 1024).toFixed(0);
  const after = (compressed.length / 1024).toFixed(0);
  process.stdout.write(`  ${lotNumber.padEnd(16)} ${before}KB → ${after}KB  `);

  // Upload compressed WebP
  await bucket.upload(tmpPath, {
    destination: storageDest,
    metadata: { contentType: "image/webp", cacheControl: "public, max-age=31536000" },
    predefinedAcl: "publicRead",
  });

  const imageUrl = `https://storage.googleapis.com/${bucket.name}/${storageDest.split("/").map(encodeURIComponent).join("/")}`;

  // Delete old PNG from Storage
  try {
    await bucket.file(oldStoragePath).delete();
    process.stdout.write("deleted old PNG  ");
  } catch {
    process.stdout.write("(no old PNG)     ");
  }

  // Update Firestore imageUrl
  const docRef = db.collection("artworks").doc(lotNumber);
  const doc = await docRef.get();
  if (doc.exists) {
    await docRef.update({ imageUrl, updatedAt: new Date() });
    console.log("Firestore updated");
  } else {
    console.log("(no Firestore doc — skipped)");
  }

  // Clean up tmp file
  unlinkSync(tmpPath);
}

// Clean up tmp dir
try { readdirSync(TMP_DIR).length === 0 && (await import("fs")).default.rmdirSync(TMP_DIR); } catch {}

const savedMB = ((totalBefore - totalAfter) / 1024 / 1024).toFixed(1);
const pct = (((totalBefore - totalAfter) / totalBefore) * 100).toFixed(0);
console.log(`\n✓ Done. Saved ${savedMB} MB (${pct}% reduction)\n`);
