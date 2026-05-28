import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import sharp from "sharp";
import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCE_DIR = join(__dirname, "watermark-source");
const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, "../tripple-a-gallery-firebase-adminsdk-fbsvc-d638c10ac2.json"), "utf8")
);

initializeApp({
  credential: cert(serviceAccount),
  storageBucket: "tripple-a-gallery.firebasestorage.app",
});

const db = getFirestore();
const bucket = getStorage().bucket();

const WATERMARK_TEXT = "Ama Antwiwaa Amponsah";
const PREVIEW_ONLY = process.argv[2] !== "--all";

function buildWatermarkSvg(w, h) {
  const fontSize = Math.max(13, Math.round(w * 0.016));
  const spacingX = Math.round(fontSize * 18);
  const spacingY = Math.round(fontSize * 6);
  const angle = -30;
  const cx = Math.round(w / 2);
  const cy = Math.round(h / 2);

  let texts = "";
  for (let row = -4; row <= 8; row++) {
    for (let col = -3; col <= 5; col++) {
      texts += `<text x="${col * spacingX}" y="${row * spacingY}">${WATERMARK_TEXT}</text>`;
    }
  }

  return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <style>
      text {
        font-family: Arial, sans-serif;
        font-size: ${fontSize}px;
        font-weight: normal;
        fill: white;
        fill-opacity: 0.18;
      }
    </style>
    <g transform="rotate(${angle}, ${cx}, ${cy})">
      ${texts}
    </g>
  </svg>`;
}

async function applyWatermark(localPath, storagePath) {
  const buffer = readFileSync(localPath);
  const img = sharp(buffer);
  const { width, height } = await img.metadata();

  const watermarkSvg = Buffer.from(buildWatermarkSvg(width, height));

  const output = await img
    .composite([{ input: watermarkSvg, top: 0, left: 0 }])
    .webp({ quality: 88 })
    .toBuffer();

  const wmPath = storagePath.replace(/\.[^.]+$/, "_wm3.webp");
  const file = bucket.file(wmPath);
  await file.save(output, { contentType: "image/webp", public: true });
  await file.makePublic();

  return `https://storage.googleapis.com/${bucket.name}/${wmPath}`;
}

async function run() {
  const snap = await db.collection("artworks").orderBy("order", "asc").get();
  if (snap.empty) { console.log("No artworks found."); return; }

  const docs = snap.docs;
  const targets = PREVIEW_ONLY ? [docs[0]] : docs;

  for (const docSnap of targets) {
    const data = docSnap.data();
    const id = docSnap.id;

    // Find local source file (try .png, .jpg, .jpeg, .webp)
    const exts = [".png", ".jpg", ".jpeg", ".webp"];
    const localPath = exts.map(e => join(SOURCE_DIR, `${id}${e}`)).find(existsSync);

    if (!localPath) {
      console.log(`Skipping ${id} — no local file found in watermark-source/`);
      continue;
    }

    const storagePath = `artworks/${id}.webp`;
    console.log(`Processing: "${data.title || id}" from ${localPath}`);

    const newUrl = await applyWatermark(localPath, storagePath);
    await db.collection("artworks").doc(id).update({ imageUrl: newUrl });
    console.log(`  Done → ${newUrl}`);

    if (PREVIEW_ONLY) {
      console.log("\nPreview complete. Run with --all to process all artworks.");
      break;
    }
  }
}

run().catch(console.error);
