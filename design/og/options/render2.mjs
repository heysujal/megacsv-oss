// Renders the five candidate styles in design/og/options.html with two real
// titles, plus a sheet showing each at full size and as a list thumbnail.
//   node design/og/options/render.mjs
import { writeFileSync } from "node:fs";
import { chromium } from "../../../app/node_modules/playwright/index.mjs";

const here = new URL("./", import.meta.url);
const titles = [
  "Search Every Row of a Multi-GB CSV Export",
  "CSV Import Limits: Salesforce, HubSpot, NetSuite, Shopify",
];
const styles = { g: "G · Live card in cobalt", h: "H · Live card + complete sheet", i: "I · Cobalt + sheet card", j: "J · Split" };
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
for (const s of Object.keys(styles)) {
  for (const [i, t] of titles.entries()) {
    const u = new URL("../options2.html", here);
    u.searchParams.set("style", s);
    u.searchParams.set("title", t);
    await page.goto(u.href);
    await page.waitForSelector("body[data-ready]");
    await page.screenshot({ path: new URL(`${s}${i + 1}.png`, here).pathname });
  }
}
// Contact sheet: each style as the share card, then two list thumbnails.
const rows = Object.entries(styles)
  .map(([s, label]) => `<section><h2>${label}</h2><div class="r"><img class="big" src="${s}1.png"><div class="list">${[1, 2]
    .map((i) => `<div class="item"><img src="${s}${i}.png"><div><b>${titles[i - 1]}</b><p>Thumbnail in the blog list (300 px wide)</p></div></div>`)
    .join("")}</div></div></section>`)
  .join("");
writeFileSync(
  new URL("sheet2.html", here),
  `<!doctype html><meta charset="utf-8"><style>
  @font-face { font-family: "Hanken"; src: url("../../../site/node_modules/@fontsource-variable/hanken-grotesk/files/hanken-grotesk-latin-wght-normal.woff2"); font-weight: 100 900; }
  body{margin:0;padding:40px;background:#e8e9e6;font-family:Hanken,system-ui;color:#17181a;width:1520px}
  h2{font-weight:600;font-size:26px;margin:0 0 14px}section{margin-bottom:44px}
  .r{display:flex;gap:28px;align-items:flex-start}.big{width:800px;border-radius:10px;box-shadow:0 0 0 1px #dcdedb}
  .list{display:flex;flex-direction:column;gap:18px;flex:1}.item{display:flex;gap:16px;background:#fff;padding:14px;border-radius:10px}
  .item img{width:300px;border-radius:6px;box-shadow:0 0 0 1px #e2e3e0}.item b{font-weight:500;font-size:18px;line-height:1.25;display:block}.item p{color:#63666b;font-size:14px;margin:8px 0 0}
  </style>${rows}`,
);
const sheet = await browser.newPage({ viewport: { width: 1600, height: 900 } });
await sheet.goto(new URL("sheet2.html", here).href);
await sheet.evaluate(() => document.fonts.ready);
await sheet.screenshot({ path: new URL("sheet2.png", here).pathname, fullPage: true });
await browser.close();
console.log("design/og/options/sheet2.png");
