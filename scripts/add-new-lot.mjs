// Create ONE new artwork lot: upload a public display image, create the
// Firestore doc (mirroring the existing convention: price 0, category
// "Painting", appended order), and upload the same file privately as the
// digital-download hi-res, setting hiResPath.
//
// Usage:
//   node scripts/add-new-lot.mjs <LOT_ID> "<path-to-image>"
// Example:
//   node scripts/add-new-lot.mjs TA22 "C:\\path\\TA22.png"
//
// Idempotency: refuses to run if the lot id already exists.

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join, extname, basename } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const LOT_ID = process.argv[2];
const IMG_PATH = process.argv[3];
if (!LOT_ID || !IMG_PATH) {
  console.error('Usage: node scripts/add-new-lot.mjs <LOT_ID> "<path-to-image>"');
  process.exit(1);
}

const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, "../tripple-a-gallery-firebase-adminsdk-fbsvc-d638c10ac2.json"), "utf8")
);
initializeApp({ credential: cert(serviceAccount), storageBucket: "tripple-a-gallery.firebasestorage.app" });
const db = getFirestore();
const bucket = getStorage().bucket();

const CONTENT_TYPES = { ".jpg":"image/jpeg",".jpeg":"image/jpeg",".png":"image/png",".webp":"image/webp" };
const ext = extname(IMG_PATH).toLowerCase();
const contentType = CONTENT_TYPES[ext] || "application/octet-stream";

const docRef = db.collection("artworks").doc(LOT_ID);
if ((await docRef.get()).exists) {
  console.error(`✗ Lot "${LOT_ID}" already exists — aborting to avoid overwrite.`);
  process.exit(1);
}

// next order = max(order)+1
const all = await db.collection("artworks").get();
let maxOrder = -1;
all.forEach((d) => { const o = d.data().order; if (typeof o === "number" && o > maxOrder) maxOrder = o; });
const order = maxOrder + 1;

const buffer = readFileSync(IMG_PATH);

// 1) public display image → artworks/{LOT_ID}.png
const publicPath = `artworks/${LOT_ID}${ext}`;
await bucket.file(publicPath).save(buffer, {
  contentType,
  metadata: { cacheControl: "public, max-age=31536000" },
  resumable: false,
  predefinedAcl: "publicRead",
});
const imageUrl = `https://storage.googleapis.com/${bucket.name}/${publicPath.split("/").map(encodeURIComponent).join("/")}`;

// 2) private hi-res → hires/{LOT_ID}/{ts}-{safeName}
const safeName = (basename(IMG_PATH)).replace(/[^\w.\-]+/g, "_");
const hiResPath = `hires/${encodeURIComponent(LOT_ID)}/${Date.now()}-${safeName}`;
await bucket.file(hiResPath).save(buffer, { contentType, resumable: false });

// 3) Firestore doc (mirrors existing convention)
await docRef.set({
  lotNumber: LOT_ID,
  imageUrl,
  hiResPath,
  order,
  price: 0,
  category: "Painting",
  color: "#ccbbaa",
  accent: "#555544",
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

console.log(`✓ Created lot ${LOT_ID}`);
console.log(`  imageUrl  : ${imageUrl}`);
console.log(`  hiResPath : ${hiResPath}`);
console.log(`  order     : ${order}`);
console.log(`\nSet price/category/medium/title at /aaa-ops-92x4k1/artworks`);
process.exit(0);
