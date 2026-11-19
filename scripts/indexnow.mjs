// Tell IndexNow (Bing and the other engines that share it) about pages, right away.
//   node scripts/indexnow.mjs              every page in the live sitemap
//   node scripts/indexnow.mjs URL [URL…]   just these
// Rarely needed: each morning the Worker's cron sends every page whose HTML changed (worker/src/index.ts).
import { readFileSync } from "node:fs";

const KEY = readFileSync(new URL("../worker/src/index.ts", import.meta.url), "utf8").match(/INDEXNOW_KEY = "([0-9a-f]+)"/)[1];
const HOST = "megacsv.com";

let urls = process.argv.slice(2);
if (!urls.length) {
  const xml = await (await fetch(`https://${HOST}/sitemap-0.xml`)).text();
  urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}
const keyFile = await fetch(`https://${HOST}/${KEY}.txt`);
if (!keyFile.ok || (await keyFile.text()).trim() !== KEY) {
  console.error(`The key file https://${HOST}/${KEY}.txt isn't live yet; deploy first.`);
  process.exit(1);
}
const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList: urls }),
});
console.log(`${urls.length} pages sent: ${res.status} ${res.statusText} ${await res.text()}`.trim());
if (!res.ok) process.exit(1);
