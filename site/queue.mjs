// @ts-check
// The publish queue (publish-queue.txt): pages listed there go live in that order,
// `per day` of them each day from `start`, in India time. Read by the site build
// (src/lib/live.ts, astro.config.mjs) and by scripts/render-og.mjs.
//
//   node site/queue.mjs     prints each queued page's day

import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const QUEUE = new URL("./publish-queue.txt", import.meta.url);
const CONTENT = new URL("./src/content/", import.meta.url);
const DAY_MS = 86_400_000;

/** Today in India as YYYY-MM-DD (the owner's day). */
export const todayInIndia = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

/** The Markdown file behind a queue line: `slug` is a problem page, `vs/slug` a comparison, `blog/slug` a post. */
function fileOf(/** @type {string} */ page) {
  if (page.startsWith("blog/")) return new URL(`blog/${page.slice(5)}.md`, CONTENT);
  if (page.startsWith("vs/")) return new URL(`compare/${page.slice(3)}.md`, CONTENT);
  return new URL(`problems/${page}.md`, CONTENT);
}

/**
 * The day each queued page goes live (YYYY-MM-DD), keyed by its queue line, from the queue's
 * text. Throws on a malformed queue, so a mistake fails the build instead of publishing nothing.
 * @param {string} text
 * @returns {Map<string, string>}
 */
export function scheduleFrom(text) {
  /** @type {Map<string, string>} */
  const days = new Map();
  let start = "";
  let perDay = 0;
  /** @type {string[]} */
  const pages = [];
  for (const raw of text.split("\n")) {
    const line = raw.replace(/#.*/, "").trim();
    if (!line) continue;
    const setting = line.match(/^(start|per day):\s*(.+)$/);
    if (setting) {
      if (setting[1] === "start") start = setting[2];
      else perDay = Number(setting[2]);
      continue;
    }
    if (pages.includes(line)) throw new Error(`publish-queue.txt: "${line}" is listed twice`);
    pages.push(line);
  }
  if (!pages.length) return days;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) throw new Error('publish-queue.txt: needs a line like "start: 2026-11-20"');
  if (!(Number.isInteger(perDay) && perDay >= 1)) throw new Error('publish-queue.txt: needs a line like "per day: 2"');
  const first = Date.parse(`${start}T00:00:00Z`);
  pages.forEach((page, i) => days.set(page, new Date(first + Math.floor(i / perDay) * DAY_MS).toISOString().slice(0, 10)));
  return days;
}

/**
 * The queue read from disk, for scripts and the Astro config (the site's pages import its
 * text instead: a bundled page can't find files next to this one). Also checks every line
 * names a page.
 * @returns {Map<string, string>}
 */
export function queueDays() {
  if (!existsSync(QUEUE)) return new Map();
  const days = scheduleFrom(readFileSync(QUEUE, "utf8"));
  for (const page of days.keys())
    if (!existsSync(fileOf(page))) throw new Error(`publish-queue.txt: no page called "${page}" (${fileURLToPath(fileOf(page))})`);
  return days;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const today = todayInIndia();
  const days = queueDays();
  if (!days.size) console.log("The publish queue is empty.");
  for (const [page, day] of days) console.log(`${day}  ${day <= today ? "live   " : "waiting"}  ${page}`);
}
