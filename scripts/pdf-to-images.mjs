/**
 * pdf-to-images.mjs
 * Uses Puppeteer to render each page of the PDF at high resolution.
 * Outputs: public/profile/slide-01.png ... slide-08.png
 *
 * Usage: node scripts/pdf-to-images.mjs
 */
import { mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import puppeteer from "puppeteer";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PDF_PATH = join("G:/My Drive/Tripple-A-Gallery/TRIPLE A PROFILE.pdf");
const PDF_URL = pathToFileURL(PDF_PATH).href;
const OUT_DIR = join(__dirname, "../public/profile");

mkdirSync(OUT_DIR, { recursive: true });

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();

// Load the PDF in Chrome's built-in PDF viewer
await page.goto(PDF_URL, { waitUntil: "networkidle0", timeout: 30000 });
await new Promise(r => setTimeout(r, 2000)); // let PDF viewer fully render

// Ask Chrome how many pages the PDF has via the viewer's DOM
// Chrome's PDF viewer renders one page at a time — we navigate by URL fragment
// Strategy: screenshot the viewer at #page=N with a fixed viewport
const NUM_PAGES = 8;
const WIDTH = 1600;
const HEIGHT = 900;

await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 2 });

for (let i = 1; i <= NUM_PAGES; i++) {
  await page.goto(`${PDF_URL}#page=${i}`, { waitUntil: "networkidle0", timeout: 15000 });
  await new Promise(r => setTimeout(r, 1500));

  const outPath = join(OUT_DIR, `slide-${String(i).padStart(2, "0")}.png`);
  await page.screenshot({ path: outPath, fullPage: false });
  console.log(`  ✓ page ${i} → public/profile/slide-${String(i).padStart(2, "0")}.png`);
}

await browser.close();
console.log("\nDone. Images are in public/profile/");
