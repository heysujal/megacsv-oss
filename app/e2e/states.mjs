// The app's state changes: what happens when things overlap (two opens, a drop over a
// dialog, a new sort over an old one) and the states it reports to tests and agents.
// Each check runs on a fresh page. Fails on page errors.
//
//   node e2e/states.mjs http://localhost:5173/app/ SMALL_CSV SLOW_GZ [BIG_CSV]

import { chromium } from "playwright";

const [url, small, slowGz, big] = process.argv.slice(2);
const browser = await chromium.launch();
const context = await browser.newContext({ acceptDownloads: true });
await context.addInitScript(() => {
  for (const k of ["showSaveFilePicker", "showDirectoryPicker", "showOpenFilePicker"]) {
    if (k in window) Object.defineProperty(window, k, { value: undefined });
  }
});

const failures = [];

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

async function check(name, fn) {
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  try {
    await page.goto(url);
    await fn(page);
    assert(errors.length === 0, `page errors: ${errors.join("; ")}`);
    console.log(`ok    ${name}`);
  } catch (e) {
    failures.push(name);
    console.log(`FAIL  ${name}\n      ${e.message.split("\n")[0]}`);
  }
  await page.close();
}

const text = async (page, sel) => ((await page.textContent(sel)) ?? "").trim();
const waitStatus = (page, re, timeout = 60_000) =>
  page.waitForFunction((src) => new RegExp(src).test(document.querySelector("#status")?.textContent ?? ""), re.source, { timeout });

async function open(page, file) {
  await page.setInputFiles("#picker", file);
  await waitStatus(page, / rows? · [0-9,]+ columns?/);
}

async function filter(page, col, value) {
  if (await page.isHidden("#filters")) await page.click("#filter-btn");
  await page.locator(".filter-row select.col").first().selectOption({ label: col });
  await page.locator(".filter-row select.op").first().selectOption("equals");
  await page.locator('.filter-row input[placeholder="Value"]').first().fill(value);
  await page.click("#filter-apply");
  await waitStatus(page, / match$/);
}

async function sort(page, col) {
  await page.click("#sort-btn");
  await page.selectOption("#sort-col", { label: col });
  await page.click("#sort-go");
  await waitStatus(page, /sorted by/);
}

const allRowsTab = (page) => page.locator('button[aria-pressed]:has-text("All rows")');

function drop(page, name, body) {
  return page.evaluate(
    ([n, b]) => {
      const dt = new DataTransfer();
      dt.items.add(new File([b], n, { type: "text/csv" }));
      window.dispatchEvent(new DragEvent("drop", { dataTransfer: dt, bubbles: true, cancelable: true }));
    },
    [name, body],
  );
}

await check("Summarize still works when opened a second time", async (page) => {
  await open(page, small);
  await page.click("#summary-btn");
  await page.click("#summary-go");
  await page.waitForSelector("#summary-results:not([hidden])");
  await page.click("#summary-close");
  await page.click("#summary-btn");
  assert(await page.isEnabled("#summary-go"), "the Summarize button is disabled on the second opening");
  assert(await page.isVisible("#summary-results"), "the finished results are gone on the second opening");
});

await check("Of two files opened at once, the later one stays open", async (page) => {
  await page.setInputFiles("#picker", slowGz);
  await page.setInputFiles("#picker", small);
  await page.waitForTimeout(4000);
  const info = await text(page, "#file-info");
  assert(info.startsWith("small.csv"), `file shown is ${JSON.stringify(info)}`);
  assert((await text(page, "#status")).includes("1,978 rows"), `status is ${JSON.stringify(await text(page, "#status"))}`);
});

await check("A new sort leaves the old sorted sheet while it works", async (page) => {
  await open(page, small);
  await sort(page, "total");
  await page.evaluate(() => {
    window.__seen = { running: false, stale: false };
    new MutationObserver(() => {
      const tab = document.querySelector("#sorted-tab");
      if (!tab?.disabled) return;
      window.__seen.running = true;
      if (tab.getAttribute("aria-pressed") === "true") window.__seen.stale = true;
    }).observe(document.body, { subtree: true, attributes: true, childList: true });
  });
  await page.click("#sort-btn");
  await page.selectOption("#sort-col", { label: "country" });
  await page.click("#sort-go");
  await page.waitForFunction(() => window.__seen.running && !document.querySelector("#sorted-tab")?.disabled);
  const seen = await page.evaluate(() => window.__seen);
  assert(!seen.stale, "the sorted tab stayed selected while its rows were being replaced");
});

await check("Sorting from a sorted sheet keeps that sheet's rows", async (page) => {
  await open(page, small);
  await filter(page, "country", "in");
  await allRowsTab(page).click();
  await sort(page, "total");
  await page.waitForFunction(() => /^1,978 rows sorted/.test(document.querySelector("#status")?.textContent ?? ""));
  await page.click("#sort-btn");
  await page.selectOption("#sort-col", { label: "country" });
  await page.click("#sort-go");
  await page.waitForFunction(() => !document.querySelector("#sorted-tab")?.disabled && /sorted by country/.test(document.querySelector("#status")?.textContent ?? ""));
  const status = await text(page, "#status");
  assert(status.startsWith("1,978 rows sorted"), `status is ${JSON.stringify(status)}`);
});

await check("Removing a sort from the All rows tab stays on All rows", async (page) => {
  await open(page, small);
  await filter(page, "country", "in");
  await allRowsTab(page).click();
  await sort(page, "total");
  await allRowsTab(page).click();
  await page.click('button[aria-label="Remove sort"]');
  assert((await allRowsTab(page).getAttribute("aria-pressed")) === "true", "moved away from All rows");
});

await check("Dropping a file over the Export dialog closes it and opens the file", async (page) => {
  await open(page, small);
  await page.click("#export-btn");
  await page.waitForSelector("#export-dialog[open]");
  await drop(page, "dropped.csv", "a,b\n1,2\n");
  await page.waitForFunction(() => document.querySelector("#file-info")?.textContent?.startsWith("dropped.csv"));
  await page.waitForFunction(() => !document.querySelector("#export-dialog")?.open, null, { timeout: 2000 });
});

await check("Feedback's closing timer leaves the next dialog alone", async (page) => {
  await page.route("**/api/feedback", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
  await open(page, small);
  await page.click('button:has-text("Feedback")');
  await page.fill("#feedback-message", "hello");
  await page.fill("#feedback-email", "a@example.com");
  await page.click("#feedback-send");
  await page.waitForFunction(() => /Thanks/.test(document.querySelector("#feedback-status")?.textContent ?? ""));
  await page.click("#feedback-cancel");
  await page.click("#summary-btn");
  await page.waitForTimeout(1900);
  assert(await page.locator("#summary-dialog[open]").count(), "Summarize was closed by Feedback's timer");
});

await check("Find only jumps for the search it was asked for", async (page) => {
  await page.setInputFiles("#picker", { name: "jump.csv", mimeType: "text/csv", buffer: Buffer.from("a,b\nx,1\ny,2\nz,needle\n") });
  await waitStatus(page, / rows? · [0-9,]+ columns?/);
  await filter(page, "a", "x");
  await page.keyboard.press("Control+f");
  await page.fill("#find-input", "needle");
  await page.press("#find-input", "Enter");
  await page.waitForFunction(() => /No matches/.test(document.querySelector("#find-count")?.textContent ?? ""));
  const before = await text(page, '[aria-label="Selected cell"]');
  await page.click("#filter-clear");
  await page.waitForFunction(() => /matching row/.test(document.querySelector("#find-count")?.textContent ?? ""));
  await page.waitForTimeout(200);
  const after = await text(page, '[aria-label="Selected cell"]');
  assert(after === before, `selection moved from ${JSON.stringify(before)} to ${JSON.stringify(after)}`);
});

await check("The status line reports each state as attributes", async (page) => {
  const state = () => page.$eval("#status", (e) => ({ ...e.dataset }));
  assert((await state()).file === "none", `before opening: ${JSON.stringify(await state())}`);
  await open(page, small);
  await page.waitForSelector('#status[data-file="ready"][data-sheet="all"][data-filter="none"][data-sort="none"]', { state: "attached" });
  await filter(page, "country", "in");
  await page.waitForSelector('#status[data-sheet="result"][data-filter="done"]', { state: "attached" });
  await sort(page, "total");
  await page.waitForSelector('#status[data-sheet="sorted"][data-sort="done"]', { state: "attached" });
  await page.setInputFiles("#picker", { name: "x.bin", mimeType: "application/octet-stream", buffer: Buffer.from([0, 1, 2, 0, 0, 0, 9, 0]) });
  await page.waitForSelector('#status[data-file="failed"]', { state: "attached" });
});

await check("The grid says when its rows are still arriving", async (page) => {
  await open(page, small);
  await page.waitForSelector('#grid-host[aria-busy="false"]', { state: "attached" });
});

await check("The Export dialog reports its stage", async (page) => {
  await open(page, small);
  await page.click("#export-btn");
  await page.waitForSelector('#export-dialog[data-state="options"]');
  await page.check('input[name="format"][value="csv"]');
  const [download] = await Promise.all([page.waitForEvent("download"), page.click("#export-go")]);
  await download.cancel();
  await page.waitForSelector('#export-dialog[data-state="done"]');
});

if (big) {
  await check("A file dropped during an export waits for the export", async (page) => {
    await page.setInputFiles("#picker", big);
    await waitStatus(page, / rows? · [0-9,]+ columns?/, 300_000);
    await page.click("#export-btn");
    await page.check('input[name="format"][value="csv"]');
    await page.click("#export-go");
    await page.waitForSelector("#export-progress:not([hidden])");
    const info = await text(page, "#file-info");
    await drop(page, "dropped.csv", "a,b\n1,2\n");
    await page.waitForTimeout(800);
    assert((await text(page, "#file-info")) === info, "the open file changed during the export");
    assert(await page.locator("#export-dialog[open]").count(), "the export dialog closed");
    assert(/export/i.test(await text(page, "#notice")), "no message said why the file didn't open");
    await page.click("#export-cancel");
    await page.waitForFunction(() => !document.querySelector("#export-dialog")?.open, null, { timeout: 60_000 });
  });
}

await browser.close();
if (failures.length) {
  console.log(`\n${failures.length} failed`);
  process.exit(1);
}
console.log("\nall state checks passed");
