/**
 * upload-videos.mjs
 * Uploads all MP4s from public/profile/ to Firebase Storage under videos/
 * Run: node scripts/upload-videos.mjs
 * Requires: gcloud auth login (ADC)
 */

import { execSync } from "child_process";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BUCKET = "tripple-a-gallery.firebasestorage.app";
const SOURCE = join(__dirname, "../public/profile");

function token() {
  return execSync("gcloud auth print-access-token").toString().trim();
}

const videos = readdirSync(SOURCE).filter((f) => f.toLowerCase().endsWith(".mp4"));
console.log(`Found ${videos.length} videos:\n`);

for (const filename of videos) {
  const localPath = join(SOURCE, filename);
  const storagePath = `videos/${filename}`;
  const uploadUrl = `https://storage.googleapis.com/upload/storage/v1/b/${BUCKET}/o?uploadType=media&name=${encodeURIComponent(storagePath)}`;

  const bytes = readFileSync(localPath);
  const mb = (bytes.length / 1024 / 1024).toFixed(1);
  process.stdout.write(`  Uploading "${filename}" (${mb} MB)… `);

  const res = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token()}`,
      "Content-Type": "video/mp4",
      "Content-Length": String(bytes.length),
    },
    body: bytes,
  });

  if (!res.ok) {
    console.error(`FAILED: ${res.status} ${await res.text()}`);
    continue;
  }

  // Make publicly readable
  const obj = await res.json();
  const aclUrl = `https://storage.googleapis.com/storage/v1/b/${BUCKET}/o/${encodeURIComponent(storagePath)}/acl`;
  const aclRes = await fetch(aclUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ entity: "allUsers", role: "READER" }),
  });

  if (!aclRes.ok) {
    // Storage bucket may use uniform access — public access set at bucket level
    console.log("uploaded (bucket-level public access)");
  } else {
    console.log("uploaded + public");
  }

  const publicUrl = `https://storage.googleapis.com/${BUCKET}/${storagePath.split("/").map(encodeURIComponent).join("/")}`;
  console.log(`    → ${publicUrl}`);
}

console.log("\nDone.");
