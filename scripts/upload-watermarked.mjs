import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { readFileSync, readdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join, extname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCE_DIR = "G:\\My Drive\\Tripple-A-Gallery\\compressed\\watermarked";
const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, "../tripple-a-gallery-firebase-adminsdk-fbsvc-d638c10ac2.json"), "utf8")
);

initializeApp({
  credential: cert(serviceAccount),
  storageBucket: "tripple-a-gallery.firebasestorage.app",
});

const db = getFirestore();
const bucket = getStorage().bucket();

async function run() {
  const files = readdirSync(SOURCE_DIR);

  for (const filename of files) {
    const ext = extname(filename);
    // Strip prefix: everything up to and including the last "-" before the artwork ID
    const artworkId = filename.replace(/^watermarked-img-[\d]+-[\d]+-/, "").replace(ext, "");
    const storagePath = `artworks/${artworkId}_wm.webp`;

    console.log(`Uploading: ${filename} → ${storagePath}`);

    const buffer = readFileSync(join(SOURCE_DIR, filename));
    const file = bucket.file(storagePath);
    await file.save(buffer, { contentType: "image/png", public: true });
    await file.makePublic();

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

    // Update Firestore
    const docRef = db.collection("artworks").doc(artworkId);
    const snap = await docRef.get();
    if (!snap.exists) {
      console.log(`  WARNING: No Firestore doc found for "${artworkId}" — skipping update`);
      continue;
    }
    await docRef.update({ imageUrl: publicUrl });
    console.log(`  Done → ${publicUrl}`);
  }

  console.log("\nAll done.");
}

run().catch(console.error);
