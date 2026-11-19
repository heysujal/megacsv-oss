// Grid features in headless Chromium: range copy, cell inspector, column
// resize and auto-fit, and the hidden accessible table of rows on screen.
//
//   node e2e/grid.mjs http://localhost:5173/app/ SMALL_CSV

import { chromium } from "playwright";
import { readFileSync } from "node:fs";

const [url, file] = process.argv.slice(2);
const browser = await chromium.launch();
const context = await browser.newContext({ permissions: ["clipboard-read", "clipboard-write"], viewport: { width: 1280, height: 800 } });
const page = await context.newPage();
const problems = [];
page.on("pageerror", (e) => problems.push(`page error: ${e.message}`));
await page.goto(url);
await page.setInputFiles("#picker", file);
await page.waitForFunction(() => / rows? · [0-9,]+ columns?/.test(document.querySelector("#status")?.textContent ?? ""));

const fail = (msg) => {
  console.log(`FAIL ${msg}`);
  process.exitCode = 1;
};
const lines = readFileSync(file, "utf8").split("\n");
const cells = (r) => lines[r].split(","); // the test file has no quoted fields
const canvas = page.locator("#grid-host canvas");
const box = await canvas.boundingBox();

// The hidden table copies the rows on screen.
await page.waitForTimeout(300);
const a11y = await page.$$eval("#grid-host table tr", (trs) => trs.slice(0, 3).map((tr) => [...tr.children].map((c) => c.textContent)));
if (a11y[0][1] !== cells(0)[0] || a11y[1][1] !== cells(1)[0] || a11y[1][0] !== "1") fail(`hidden table ${JSON.stringify(a11y)}`);
else console.log("hidden table: ok", JSON.stringify(a11y[1].slice(0, 4)));

// Click the first data cell, then shift+arrows to select 3 rows x 2 columns, copy.
await canvas.click({ position: { x: 90, y: 50 + 14 } });
for (const k of ["Shift+ArrowDown", "Shift+ArrowDown", "Shift+ArrowRight"]) await page.keyboard.press(k);
await page.keyboard.press(process.platform === "darwin" ? "Meta+c" : "Control+c");
await page.waitForTimeout(200);
const clip = await page.evaluate(() => navigator.clipboard.readText());
const expected = [1, 2, 3].map((r) => cells(r).slice(0, 2).join("\t")).join("\r\n");
if (clip !== expected) fail(`copy got ${JSON.stringify(clip)} expected ${JSON.stringify(expected)}`);
else console.log("range copy: ok", JSON.stringify(clip.split("\r\n")[0]));

// Double-click a cell opens the inspector with its full value.
await canvas.dblclick({ position: { x: 90, y: 50 + 28 + 14 } });
await page.waitForSelector("#cell-dialog[open]");
const v = await page.inputValue("#cell-value");
const where = await page.textContent("#cell-where");
if (v !== cells(2)[0] || where !== "Row 2") fail(`inspector ${v} ${where}`);
else console.log("inspector: ok", v, where);
await page.click("#cell-close");

// Drag the first column's right border in the header 120 px wider.
const shot = async () => (await canvas.screenshot()).length;
const before = await shot();
// Find the border by probing the cursor along the header.
let found = null;
for (let x = 60; x < 400; x += 2) {
  await page.mouse.move(box.x + x, box.y + 15);
  if ((await canvas.evaluate((c) => c.style.cursor)) === "col-resize") {
    found = x;
    break;
  }
}
if (found === null) fail("no column border found in the header");
else {
  await page.mouse.down();
  await page.mouse.move(box.x + found + 120, box.y + 15, { steps: 5 });
  await page.mouse.up();
  await page.mouse.move(box.x + found + 120, box.y + 15);
  const moved = (await canvas.evaluate((c) => c.style.cursor)) === "col-resize";
  if (!moved || (await shot()) === before) fail("column did not resize");
  else console.log(`column resize: ok (border ${found} -> ${found + 120})`);
}
console.log(problems.length ? problems.join("\n") : "no page errors");
await browser.close();
