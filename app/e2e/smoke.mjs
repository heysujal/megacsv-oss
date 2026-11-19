// Opens files in the running dev server with headless Chromium, waits for
// indexing, jumps to a row, and saves screenshots. Fails on page errors or on
// any request that leaves the app's own origin.
//
//   node e2e/smoke.mjs http://localhost:5173 FILE [FILE...]

import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { basename } from "node:path";

const [url, ...files] = process.argv.slice(2);
const outDir = new URL("../../logs/screens/", import.meta.url).pathname;
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const problems = [];
page.on("pageerror", (e) => problems.push(`page error: ${e.message}`));
page.on("console", (m) => m.type() === "error" && problems.push(`console: ${m.text()}`));
page.on("request", (r) => {
  if (!r.url().startsWith(new URL(url).origin + "/") && !r.url().startsWith("blob:") && !r.url().startsWith("data:")) {
    problems.push(`outside request: ${r.url()}`);
  }
});

await page.goto(url);
for (const file of files) {
  const name = basename(file);
  const t0 = Date.now();
  await page.setInputFiles("#picker", file);
  await page.waitForFunction(() => document.querySelector("#status")?.textContent !== "Opening…");
  const firstStatus = await page.textContent("#status");
  const tFirst = Date.now() - t0;
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${outDir}${name}-first.png` });
  await page
    .waitForFunction(
      () => / rows? · [0-9,]+ columns?|Couldn.t open/.test(document.querySelector("#status")?.textContent ?? ""),
      null,
      { timeout: Number(process.env.SMOKE_TIMEOUT ?? 600_000) },
    )
    .catch(async (e) => {
      throw new Error(`${name}: status stuck at ${JSON.stringify(await page.textContent("#status"))}`, { cause: e });
    });
  const tDone = Date.now() - t0;
  const finalStatus = await page.textContent("#status");
  const fmt = await page.textContent("#format");
  const note = (await page.isVisible("#notice")) ? await page.textContent("#notice") : "";
  const rows = Number((finalStatus.match(/^([\d,]+) rows?/)?.[1] ?? "0").replace(/,/g, ""));
  if (rows > 2) {
    const target = Math.floor(rows * 0.73);
    await page.fill("#goto-row", String(target));
    await page.press("#goto-row", "Enter");
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${outDir}${name}-goto.png` });
  }
  console.log(
    `${name}\n  first status after ${tFirst} ms: ${firstStatus}\n  done after ${tDone} ms: ${finalStatus}\n  format: ${fmt}${note ? `\n  notice: ${note}` : ""}`,
  );
}
await browser.close();
if (problems.length) {
  console.log("PROBLEMS:\n  " + problems.join("\n  "));
  process.exit(1);
}
console.log("no page errors, no outside requests");
