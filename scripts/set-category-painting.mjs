/**
 * set-category-painting.mjs
 * Sets category = "Painting" on every artwork doc that currently lacks a category.
 * Run: node scripts/set-category-painting.mjs
 * Requires: gcloud auth login (ADC)
 */

import { execSync } from "child_process";

const PROJECT_ID = "tripple-a-gallery";
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

function token() {
  return execSync("gcloud auth print-access-token").toString().trim();
}

async function firestoreRequest(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token()}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`${method} ${path} → ${res.status}: ${txt}`);
  }
  return res.json();
}

// List all artworks
const data = await firestoreRequest("GET", "/artworks?pageSize=200");
const docs = data.documents ?? [];
console.log(`Found ${docs.length} artwork docs`);

let updated = 0;
let skipped = 0;

for (const doc of docs) {
  const name = doc.name; // full resource name
  const id = name.split("/").pop();
  const existing = doc.fields?.category?.stringValue ?? "";

  if (existing && existing !== "") {
    console.log(`  skip ${id} (already: "${existing}")`);
    skipped++;
    continue;
  }

  // PATCH with updateMask to only touch category field
  await firestoreRequest(
    "PATCH",
    `/artworks/${id}?updateMask.fieldPaths=category`,
    {
      fields: {
        category: { stringValue: "Painting" },
      },
    }
  );
  console.log(`  ✓ ${id} → Painting`);
  updated++;
}

console.log(`\nDone. Updated: ${updated}, Skipped (had category): ${skipped}`);
