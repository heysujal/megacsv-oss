// @ts-check
import { readdirSync, readFileSync } from "node:fs";
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { queueDays } from "./queue.mjs";

const site = "https://megacsv.com";

/** Frontmatter of each Markdown file in a content folder, keyed by file name without `.md`. */
/** @param {string} folder */
function frontmatter(folder) {
  const dir = new URL(`./src/content/${folder}/`, import.meta.url);
  /** @type {Record<string, string>} */
  const out = {};
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".md")))
    out[file.replace(/\.md$/, "")] = readFileSync(new URL(file, dir), "utf8").match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
  return out;
}
const field = (/** @type {string} */ front, /** @type {string} */ name) => front.match(new RegExp(`^${name}:\\s*(\\S+)`, "m"))?.[1];

/**
 * Last-changed date of each page, keyed by its URL, for the sitemap: the latest of its publish
 * day (the publish queue's, else its own `date`) and `updated` (blog) or `checked` (other pages).
 */
function postDates() {
  const queue = queueDays();
  /** @type {Record<string, string>} */
  const dates = {};
  for (const [slug, front] of Object.entries(frontmatter("blog"))) {
    const date = [queue.get(`blog/${slug}`) ?? field(front, "date"), field(front, "updated")].filter(Boolean).sort().pop();
    if (date) dates[`${site}/blog/${slug}`] = new Date(date).toISOString();
  }
  for (const [folder, prefix] of [["problems", "/"], ["compare", "/vs/"]])
    for (const [slug, front] of Object.entries(frontmatter(folder))) {
      const key = folder === "compare" ? `vs/${slug}` : slug;
      const day = [queue.get(key) ?? field(front, "date"), field(front, "checked")].filter(Boolean).sort().pop();
      if (day) dates[`${site}${prefix}${slug}`] = new Date(day).toISOString();
    }
  return dates;
}
const lastmod = postDates();

export default defineConfig({
  site,
  trailingSlash: "never",
  build: { format: "file" },
  integrations: [
    sitemap({
      serialize(item) {
        const date = lastmod[item.url];
        return date ? { ...item, lastmod: date } : item;
      },
    }),
  ],
  vite: {
    // Stylesheets and fonts keep the same name across deploys (no hash): Clarity replays
    // load them from the live site when watched, and a renamed file would show an old
    // session unstyled. Files are served with max-age=0 + revalidation, so nothing goes stale.
    build: { sourcemap: false, rolldownOptions: { output: { assetFileNames: "_astro/[name][extname]" } } },
    // `pnpm dev` runs the app's Vite server on 5173; reach it (and the Worker's /api) through this one.
    server: {
      proxy: {
        "/app": { target: "http://localhost:5173", ws: true },
        "/api": "http://localhost:8787",
      },
    },
  },
});
