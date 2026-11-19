// Scale test without disk space: builds a "virtual" file in the page by
// repeating one ~8 MB block of rows (the browser references the block, it
// doesn't copy it), opens it, and checks the row count. Also samples the
// browser's total memory while it reads.
//
//   node e2e/huge.mjs http://localhost:5173 120   # size in GB

import { chromium } from "playwright";
import { execSync } from "node:child_process";

const [url, gbArg] = process.argv.slice(2);
const gb = Number(gbArg);

/** Resident memory of the test browser (headless Chromium) processes, in MB. */
function browserRssMb() {
  const out = execSync("ps -axo rss=,comm= | grep -i headless || true").toString();
  return Math.round(out.split("\n").reduce((sum, line) => sum + (Number.parseInt(line, 10) || 0), 0) / 1024);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const problems = [];
page.on("pageerror", (e) => problems.push(e.message));
await page.goto(url);
const baseline = browserRssMb();

const info = await page.evaluate((gb) => {
  const header =
    "order_id,order_date,customer_name,email,country,product,quantity,unit_price,total,currency,status,notes\n";
  const rows = [];
  let bytes = 0;
  for (let i = 0; bytes < 8_000_000; i++) {
    const r = `${i},2026-01-${String((i % 28) + 1).padStart(2, "0")},Priya Sharma,priya${i}@example.com,IN,"Monitor 27""",3,10.50,31.50,INR,paid,"boxes, tape"\n`;
    rows.push(r);
    bytes += r.length;
  }
  const block = new Blob([rows.join("")]);
  const parts = Math.ceil((gb * 1e9) / block.size);
  const file = new File([header, ...Array.from({ length: parts }, () => block)], `virtual-${gb}gb.csv`);
  const dt = new DataTransfer();
  dt.items.add(file);
  const input = document.querySelector("#picker");
  input.files = dt.files;
  input.dispatchEvent(new Event("change"));
  return { size: file.size, expectedRows: parts * rows.length };
}, gb);

console.log(`virtual file: ${(info.size / 1e9).toFixed(1)} GB, expecting ${info.expectedRows.toLocaleString()} rows`);
const t0 = Date.now();
let peak = 0;
let status = "";
while (!/ rows? · [0-9,]+ columns?|Couldn.t open/.test(status)) {
  await page.waitForTimeout(2000);
  peak = Math.max(peak, browserRssMb());
  status = (await page.textContent("#status")) ?? "";
  if (!status.startsWith("Reading")) continue;
  process.stdout.write(`  ${((Date.now() - t0) / 1000).toFixed(0)}s  ${status}\n`);
}
const secs = (Date.now() - t0) / 1000;
const rows = Number((status.match(/^([\d,]+) rows?/)?.[1] ?? "0").replace(/,/g, ""));
console.log(`done in ${secs.toFixed(0)} s: ${status}`);
console.log(`row count ${rows === info.expectedRows ? "matches" : `MISMATCH (expected ${info.expectedRows})`}`);
console.log(`browser memory: ${baseline} MB before, ${peak} MB peak while reading`);

// Jump near the end and check rows render.
await page.fill("#goto-row", String(rows - 5));
await page.press("#goto-row", "Enter");
await page.waitForTimeout(800);
await page.screenshot({ path: new URL(`../../logs/screens/virtual-${gb}gb-end.png`, import.meta.url).pathname });
await browser.close();
if (problems.length) {
  console.log("PAGE ERRORS:\n  " + problems.join("\n  "));
  process.exit(1);
}
