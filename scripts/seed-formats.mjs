/**
 * seed-formats.mjs
 * Seeds the built-in formats into Firestore so they are manageable from admin.
 * Run: node scripts/seed-formats.mjs
 * Requires: gcloud auth login (ADC)
 */

import { execSync } from "child_process";

const PROJECT_ID = "tripple-a-gallery";
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

function token() {
  return execSync("gcloud auth print-access-token").toString().trim();
}

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${await res.text()}`);
  return res.json();
}

// Check if formats already exist
const existing = await req("GET", "/formats?pageSize=10");
if ((existing.documents ?? []).length > 0) {
  console.log("Formats already seeded — nothing to do.");
  process.exit(0);
}

const formats = [
  {
    name: "Print, small",
    description: "A4 · open edition · giclée",
    priceMode: "percent",
    fixedPrice: 0,
    percentBase: 0.06,
    percentAdd: 80,
    order: 0,
    enabled: true,
  },
  {
    name: "Print, standard",
    description: "Standard size · giclée on Hahnemühle",
    priceMode: "percent",
    fixedPrice: 0,
    percentBase: 0.15,
    percentAdd: 140,
    order: 1,
    enabled: true,
  },
  {
    name: "Original",
    description: "1 of 1 · signed verso",
    priceMode: "fixed",
    fixedPrice: 0,   // 0 = uses artwork price; handled on frontend
    percentBase: 1,
    percentAdd: 0,
    order: 2,
    enabled: true,
  },
];

for (const f of formats) {
  const body = {
    fields: {
      name:        { stringValue: f.name },
      description: { stringValue: f.description },
      priceMode:   { stringValue: f.priceMode },
      fixedPrice:  { integerValue: String(f.fixedPrice) },
      percentBase: { doubleValue: f.percentBase },
      percentAdd:  { integerValue: String(f.percentAdd) },
      order:       { integerValue: String(f.order) },
      enabled:     { booleanValue: f.enabled },
    },
  };
  await req("POST", "/formats", body);
  console.log(`  ✓ ${f.name}`);
}

console.log("\nDone — formats seeded. Visit /admin/formats to manage them.");
