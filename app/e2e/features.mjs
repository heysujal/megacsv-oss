// Drives find, filters, export and instant reopen in headless Chromium.
// Exports go through the download path (the save-file pickers are hidden),
// and downloaded files are written to OUT_DIR for checking.
//
//   node e2e/features.mjs http://localhost:5173 OUT_DIR SMALL_CSV [BIG_CSV]

import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [url, outDir, small, big] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({ acceptDownloads: true });
await context.addInitScript(() => {
  for (const k of ["showSaveFilePicker", "showDirectoryPicker", "showOpenFilePicker"]) {
    try {
      delete window[k];
    } catch {}
    if (k in window) Object.defineProperty(window, k, { value: undefined });
  }
});
const page = await context.newPage();
const problems = [];
page.on("pageerror", (e) => problems.push(`page error: ${e.message}`));
page.on("console", (m) => m.type() === "error" && problems.push(`console: ${m.text()}`));
page.on("request", (r) => {
  const u = r.url();
  if (!u.startsWith(new URL(url).origin + "/") && !u.startsWith("blob:") && !u.startsWith("data:")) problems.push(`outside request: ${u}`);
});
await page.goto(url);

const text = (sel) => page.textContent(sel).then((t) => (t ?? "").trim());
const waitText = (sel, re, timeout = 600_000) =>
  page.waitForFunction(([s, src]) => new RegExp(src).test(document.querySelector(s)?.textContent ?? ""), [sel, re.source], { timeout });

async function open(file) {
  const t0 = Date.now();
  await page.setInputFiles("#picker", file);
  await waitText("#status", / rows? · [0-9,]+ columns?/);
  return { ms: Date.now() - t0, status: await text("#status") };
}

async function findText(needle, { matchCase = false, only = false } = {}) {
  if (await page.isHidden("#findbar")) await page.click("#find-btn");
  await page.setChecked("#find-case", matchCase);
  await page.setChecked("#find-only", only);
  await page.fill("#find-input", needle);
  const t0 = Date.now();
  await page.press("#find-input", "Enter");
  await waitText("#find-count", /matching rows?$|No matches|^\d[\d,]* of /);
  return { ms: Date.now() - t0, count: await text("#find-count") };
}

async function closeFind() {
  await page.click("#find-close");
}

async function setFilters(conds) {
  if (await page.isHidden("#filters")) await page.click("#filter-btn");
  await page.click("#filter-clear");
  for (let i = 0; i < conds.length; i++) {
    if (i > 0 || (await page.locator(".filter-row").count()) === 0) await page.click("#filter-add");
    const row = page.locator(".filter-row").nth(i);
    const c = conds[i];
    await row.locator("select.col").selectOption({ label: c.col });
    await row.locator("select.op").selectOption(c.op);
    if (c.value !== undefined) await row.locator('input[placeholder="Value"]').fill(c.value);
    if (c.list !== undefined) await row.locator("textarea.values").fill(c.list);
    if (c.min !== undefined) await row.locator('input[aria-label="From"]').fill(c.min);
    if (c.max !== undefined) await row.locator('input[aria-label="To"]').fill(c.max);
  }
  const t0 = Date.now();
  await page.click("#filter-apply");
  await waitText("#status", conds.length ? / match$|Showing the first/ : / [0-9,]+ columns?/);
  return { ms: Date.now() - t0, status: await text("#status") };
}

async function exportAs(format, split, name, custom, { columns, every, dupes, dupesCol, selection = false } = {}) {
  await page.click("#export-btn");
  if (await page.isVisible("#export-scope")) await page.check(`input[name="export-scope"][value="${selection ? "selection" : "sheet"}"]`);
  else if (selection) throw new Error("no selected cells to export");
  await page.check(`input[name="format"][value="${format}"]`);
  // Split, duplicates and sampling are under "More options".
  if (!(await page.$eval("#export-more", (d) => d.open))) await page.click("#export-more summary");
  await page.selectOption("#split", split);
  if (custom) await page.fill("#split-custom", custom);
  if (!selection) {
    await page.selectOption("#export-cols", columns ? "pick" : "all");
    if (columns) {
      await page.click("#col-none");
      for (const c of columns) await page.locator("#col-list label", { hasText: new RegExp(`^\\s*${c}$`) }).locator("input").check();
    }
    await page.selectOption("#export-dupes", dupes ?? "none");
    if (dupesCol) await page.selectOption("#export-dupes-col", { label: dupesCol });
    await page.selectOption("#export-every", every ? "custom" : "1");
    if (every) await page.fill("#every-custom", String(every));
  }
  const estimate = await text("#export-estimate");
  const t0 = Date.now();
  const [download] = await Promise.all([page.waitForEvent("download", { timeout: 600_000 }), page.click("#export-go")]);
  const path = join(outDir, name);
  await download.saveAs(path);
  await waitText("#status", /Downloaded/);
  // The finished screen names the file and its size; Done closes it.
  await page.waitForSelector("#export-done");
  const finished = await text("#export-done-facts");
  await page.click("#export-done-close");
  return { ms: Date.now() - t0, path, suggested: download.suggestedFilename(), status: await text("#status"), estimate, finished };
}

/** Selects a block of cells from the first data cell: `rows` down, `cols` across. */
async function selectCells(rows, cols) {
  await page.locator("#grid-host canvas").click({ position: { x: 90, y: 50 + 14 } });
  for (let i = 1; i < rows; i++) await page.keyboard.press("Shift+ArrowDown");
  for (let i = 1; i < cols; i++) await page.keyboard.press("Shift+ArrowRight");
}

const log = (label, v) => console.log(`${label}: ${JSON.stringify(v)}`);

// ---- small file with known answers ----
log("open small", await open(small));
log("find in", await findText("in"));
log("find IN match case", await findText("IN", { matchCase: true }));
log("find in, only matching", await findText("in", { only: true }));
await closeFind();
log("export one cell", (await selectCells(1, 1), await exportAs("csv", "none", "small-cell-a1.csv", undefined, { selection: true })));
log("export selection 3x2", (await selectCells(3, 2), await exportAs("csv", "none", "small-sel-3x2.csv", undefined, { selection: true })));
log("filter country is in", await setFilters([{ col: "country", op: "equals", value: "in" }]));
log("export csv filtered", await exportAs("csv", "none", "small-country-in.csv"));
log("export filtered selection 2x1", (await selectCells(2, 1), await exportAs("csv", "none", "small-in-sel-2x1.csv", undefined, { selection: true })));
log("filter total 0..100", await setFilters([{ col: "total", op: "between", min: "0", max: "100" }]));
log("filter total is not a number", await setFilters([{ col: "total", op: "notNumber" }]));
log("filter country is one of IN, US", await setFilters([{ col: "country", op: "oneOf", list: "IN\nUS" }]));
// Saved filter sets: save, clear, load back.
await page.click("#filter-save");
await page.fill("#filter-save-name", "e2e set");
await page.click('#filter-save-form button[type="submit"]');
await setFilters([]);
await page.selectOption("#filter-saved", "e2e set");
await waitText("#status", / match$/);
log("saved set loaded", { status: await text("#status") });
log("export csv one of, 2 columns, every 3rd", await exportAs("csv", "none", "small-oneof-cols-every3.csv", undefined, { columns: ["country", "total"], every: 3 }));
log("filter none", await setFilters([]));
// Summarize: rows and total of `total` per country; written to a file for checking.
await page.click("#summary-btn");
await page.selectOption("#summary-group", { label: "country" });
await page.selectOption("#summary-value", { label: "total" });
await page.click("#summary-go");
await page.waitForSelector("#summary-results:not([hidden])");
const summary = await page.$$eval("#summary-table tbody tr", (trs) => trs.map((tr) => [...tr.children].map((c) => c.textContent)));
writeFileSync(join(outDir, "summary-country-total.json"), JSON.stringify(summary));
log("summary by country", { groups: summary.length, first: summary[0], count: await text("#summary-count") });
// Selecting a group filters the grid to it.
await page.click("#summary-table tbody tr:first-child");
await waitText("#status", / match$/);
log("summary pick", { status: await text("#status") });
log("filter none", await setFilters([]));
// Sort: by total, largest first; the sorted sheet exports in its order (checked against Python by the caller).
async function sortBy(col, order) {
  await page.click("#sort-btn");
  await page.selectOption("#sort-col", { label: col });
  await page.selectOption("#sort-order", order);
  const t0 = Date.now();
  await page.click("#sort-go");
  await waitText("#status", /sorted by/);
  return { ms: Date.now() - t0, status: await text("#status") };
}
log("sort total desc", await sortBy("total", "desc"));
log("export sorted csv", await exportAs("csv", "none", "small-sorted-total-desc.csv"));
log("export sorted selection 2x3 xlsx", (await selectCells(2, 3), await exportAs("xlsx", "1048575", "small-sorted-sel-2x3.xlsx", undefined, { selection: true })));
await page.click('button[aria-label="Remove sort"]');
log("sort removed", { status: await text("#status") });
log("export xlsx all", await exportAs("xlsx", "1048575", "small-all.xlsx"));
log("export first row per country", await exportAs("csv", "none", "small-first-per-country.csv", undefined, { dupes: "first", dupesCol: "country" }));
log("export latest row per country", await exportAs("csv", "none", "small-last-per-country.csv", undefined, { dupes: "last", dupesCol: "country" }));
log("export identical rows removed", await exportAs("csv", "none", "small-unique-rows.csv", undefined, { dupes: "row" }));
log("export csv parts of 2", await exportAs("csv", "custom", "small-parts.zip", "2"));

// ---- semicolon file with decimal commas ----
const eu = join(outDir, "eu-logger.csv");
writeFileSync(eu, "time;temp_c;stage\n13:00;21,5;1\n13:01;180,25;2\n13:02;1.234,5;2\n13:03;n/a;3\n13:04;399,9;3\n");
log("open eu", await open(eu));
log("eu temp 180..400", await setFilters([{ col: "temp_c", op: "between", min: "180", max: "400" }]));
log("eu temp is not a number", await setFilters([{ col: "temp_c", op: "notNumber" }]));
await setFilters([]);

// ---- big file: speed and instant reopen ----
if (big) {
  log("open big (first)", await open(big));
  log("find okafor", await findText("okafor"));
  log("next match", (await page.click("#find-next"), await text("#find-count")));
  await closeFind();
  log("filter country is IN", await setFilters([{ col: "country", op: "equals", value: "IN" }]));
  log("export big csv", await exportAs("csv", "none", "big-country-in.csv"));
  log("filter IN and total>2000", await setFilters([
    { col: "country", op: "equals", value: "IN" },
    { col: "total", op: "between", min: "2000", max: "" },
  ]));
  log("export big xlsx", await exportAs("xlsx", "1048575", "big-in-2000.xlsx"));
  await setFilters([]);
  await page.waitForTimeout(1500); // let the row table save finish
  await page.reload();
  log("open big (second)", await open(big));
  await page.screenshot({ path: join(outDir, "big-reopened.png") });
}

await browser.close();
if (problems.length) {
  console.log("PROBLEMS:\n  " + problems.join("\n  "));
  process.exit(1);
}
console.log("no page errors, no outside requests");
