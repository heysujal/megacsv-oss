// Merges the website (site/dist) and the app (app/dist, served at /app/) into dist/ for the Worker,
// then writes dist/indexnow.json: a fingerprint of each page in the sitemap. The Worker's morning
// cron sends IndexNow the pages whose fingerprint changed since it last sent them (worker/src/index.ts).
import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

const root = new URL("../", import.meta.url);
const dist = new URL("dist/", root);
rmSync(dist, { recursive: true, force: true });
cpSync(new URL("site/dist", root), dist, { recursive: true });
cpSync(new URL("app/dist", root), new URL("app", dist), { recursive: true });

const sitemap = readFileSync(new URL("sitemap-0.xml", dist), "utf8");
const pages = {};
for (const [, url] of sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)) {
  const path = new URL(url).pathname;
  const file = new URL(path === "/" ? "index.html" : `${path.slice(1)}.html`, dist);
  if (!existsSync(file)) throw new Error(`indexnow.json: no file for ${url}`);
  pages[url] = createHash("sha256").update(readFileSync(file)).digest("hex").slice(0, 16);
}
writeFileSync(new URL("indexnow.json", dist), JSON.stringify(pages, null, 1));
console.log(`dist/ ready: site at /, app at /app/; ${Object.keys(pages).length} pages fingerprinted for IndexNow`);
