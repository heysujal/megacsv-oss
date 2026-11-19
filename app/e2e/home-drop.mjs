// A real file dropped on the homepage opens in the app without a second click.
// Needs Google Chrome and a saved profile: private sessions keep the file's permission
// across pages, so they can't show the failure. Run against a build served at one origin.
//
//   node e2e/home-drop.mjs http://localhost:4410/ ABSOLUTE_CSV_PATH

import { chromium } from "playwright";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [url, file] = process.argv.slice(2);
const dir = mkdtempSync(join(tmpdir(), "megacsv-home-drop-"));
const context = await chromium.launchPersistentContext(dir, { channel: "chrome", headless: false, viewport: { width: 1200, height: 800 } });
const page = context.pages()[0] ?? (await context.newPage());
const problems = [];
page.on("pageerror", (e) => problems.push(e.message));

try {
  // Twice, because the second drop finds the file already in the recent list.
  for (const round of [1, 2]) {
    await page.goto(url, { waitUntil: "load" });
    const cdp = await context.newCDPSession(page);
    const data = { items: [], files: [file], dragOperationsMask: 1 };
    for (const type of ["dragEnter", "dragOver", "drop"]) await cdp.send("Input.dispatchDragEvent", { type, x: 500, y: 400, data });
    await page.waitForURL(/\/app\//, { timeout: 15_000 });
    await page
      .waitForSelector('#status[data-file="ready"]', { state: "attached", timeout: 15_000 })
      .catch(() => problems.push(`drop ${round} didn't open the file`));
    console.log(`drop ${round}: ${await page.$eval("#status", (e) => `${e.dataset.file} | ${e.textContent}`)}`);
  }
} finally {
  await context.close();
  rmSync(dir, { recursive: true, force: true });
}

if (problems.length) {
  console.log("FAIL\n  " + problems.join("\n  "));
  process.exit(1);
}
console.log("dropped files open straight away");
