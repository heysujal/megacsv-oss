// Renders the social-share cards (1200x630):
//   design/og/og.html   -> site/public/og.png (homepage and other pages)
//   design/og/post.html -> site/public/og/blog/<slug>.png, one per published or queued blog post
//                          (site/publish-queue.txt; other drafts are skipped), titled with the post's `title`
//   node scripts/render-og.mjs
// Re-run after adding a post or changing a post's title.
import { readdirSync, readFileSync, mkdirSync, rmSync } from "node:fs";
import { chromium } from "../app/node_modules/playwright/index.mjs";
import { queueDays } from "../site/queue.mjs";

const root = new URL("../", import.meta.url);
const blogDir = new URL("site/src/content/blog/", root);
const outDir = new URL("site/public/og/blog/", root);
mkdirSync(outDir, { recursive: true });

/** A post's `title` (without quotes) and whether it's a draft, from its front matter. */
function frontMatter(md) {
  const front = md.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
  const line = front.match(/^title:\s*(.+)$/m)?.[1] ?? "";
  return { title: line.trim().replace(/^(["'])(.*)\1$/, "$2"), draft: /^draft:\s*true\s*$/m.test(front) };
}

let browser;
try {
  browser = await chromium.launch();
} catch {
  // The project's Playwright may not match the browser installed on this machine.
  browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
}
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });

await page.goto(new URL("design/og/og.html", root).href);
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: new URL("site/public/og.png", root).pathname });
console.log("site/public/og.png");

const queued = queueDays();
for (const file of readdirSync(blogDir).filter((f) => f.endsWith(".md")).sort()) {
  const slug = file.replace(/\.md$/, "");
  const { title, draft } = frontMatter(readFileSync(new URL(file, blogDir), "utf8"));
  // A queued post gets its card now, so it's in place the day the post goes live.
  if (draft && !queued.has(`blog/${slug}`)) {
    rmSync(new URL(`${slug}.png`, outDir), { force: true });
    console.log(`skipped draft ${slug}`);
    continue;
  }
  if (!title) throw new Error(`${file}: no title in front matter`);
  const url = new URL("design/og/post.html", root);
  url.searchParams.set("title", title);
  await page.goto(url.href);
  await page.waitForSelector("body[data-ready]");
  await page.screenshot({ path: new URL(`${slug}.png`, outDir).pathname });
  console.log(`site/public/og/blog/${slug}.png  ${title}`);
}
await browser.close();
