// Files that are unpacked or converted before opening: .gz, .zip, UTF-16,
// old Mac line endings. Each must open with the same rows as the plain file.
//
//   node e2e/convert.mjs http://localhost:5173/app/ PLAIN_CSV FILE...

import { chromium } from "playwright";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [url, plain, ...files] = process.argv.slice(2);
// A normal (persistent) profile: private profiles keep browser storage in memory with a small limit.
const profile = mkdtempSync(join(tmpdir(), "megacsv-e2e-"));
const browser = await chromium.launchPersistentContext(profile);
const page = await browser.newPage();
const problems = [];
page.on("pageerror", (e) => problems.push(`page error: ${e.message}`));
await page.goto(url);

async function open(file) {
  await page.setInputFiles("#picker", file);
  await page.waitForFunction(
    () => {
      const t = document.querySelector("#status")?.textContent ?? "";
      return (/ rows? · [0-9,]+ columns?/.test(t) && !/Reading/.test(t)) || /Couldn't/.test(t);
    },
    null,
    { timeout: 120_000 },
  );
  const status = (await page.textContent("#status")).split(" · ").slice(0, 2).join(" · ");
  await page.click("#find-btn");
  await page.fill("#find-input", "okafor");
  await page.press("#find-input", "Enter");
  await page.waitForFunction(() => /matching rows?$|No matches/.test(document.querySelector("#find-count")?.textContent ?? ""));
  const find = await page.textContent("#find-count");
  await page.click("#find-close");
  return { status, find, info: await page.textContent("#file-info") };
}

const want = await open(plain);
console.log("plain:", JSON.stringify(want));
for (const f of files) {
  const got = await open(f);
  const ok = got.status === want.status && got.find === want.find;
  if (!ok) process.exitCode = 1;
  console.log(`${ok ? "ok  " : "FAIL"} ${f}: ${JSON.stringify(got)}`);
}
console.log(problems.length ? problems.join("\n") : "no page errors");
await browser.close();
rmSync(profile, { recursive: true, force: true });
