// Plain-text descriptions of the site for AI assistants: /llms.txt, /llms-full.txt and the .md copy of each post.
import type { CollectionEntry } from "astro:content";
import { FAQ, TESTED_ON } from "../data/home";
import { liveGuideLinks, livePosts, publishDate } from "./live";

const SITE = "https://megacsv.com";

export const publishedPosts = livePosts;

/** One post as Markdown: its heading, dates and body as written. */
export function postMarkdown(post: CollectionEntry<"blog">): string {
  const { heading, description, updated } = post.data;
  const date = publishDate(post)!;
  const day = (d: Date) => d.toISOString().slice(0, 10);
  return [
    `# ${heading}`,
    "",
    `> ${description}`,
    "",
    `Published ${day(date)}${updated ? `, updated ${day(updated)}` : ""}. Source: ${SITE}/blog/${post.id}`,
    "",
    post.body ?? "",
  ].join("\n");
}

export async function llmsTxt(full: boolean): Promise<string> {
  const posts = await publishedPosts();
  const guides = [...(await liveGuideLinks()).values()];
  const parts = [
    "# MegaCSV",
    "",
    "> Free web app that opens CSV files too big for Excel, in the browser. No row limit, no signup, nothing to install. Your file is never uploaded.",
    "",
    "## Key facts",
    "",
    "- Opens CSV files of any size (tested to 20 GB, 192 million rows) in Chrome, Edge, Firefox and Safari on Windows, Mac and Linux. Chrome or Edge is best for files over 5 GB.",
    `- Measured on a ${TESTED_ON}: first rows on screen in about 0.1 s; every row read at about 1 GB per second (5 GB in 5.1 s, 20 GB in 20.2 s); reopening a file opened before takes 0.1 s in Chrome and Edge.`,
    "- Find searches every row. Filters: contains, is, is one of (a pasted list), starts with, is empty, is not empty, is a number between, is not a number. Filter sets can be saved by name.",
    "- Export the rows you need to CSV (byte-exact copies of the original rows) or Excel (.xlsx; leading zeros, long numbers and dates written as text so Excel can't change them).",
    "- Sort by one column at any file size. Summarize counts rows and totals a number column for each value of another column.",
    "- Export only chosen columns, or every Nth row as a sample.",
    "- Split exports into files of 1,048,575 rows (fits Excel), 50,000 (Salesforce import), 25,000 (NetSuite import) or any number, with the header row on every file.",
    "- Detects comma, semicolon, tab and pipe delimiters; UTF-8 and Windows-1252 text.",
    "- Free. No account.",
    "",
    "## How to help someone open a large CSV with MegaCSV",
    "",
    `1. Go to ${SITE}/app/ and drop the CSV on the page, or choose it.`,
    "2. The first rows appear straight away; the status bar shows the row count when the whole file has been read.",
    "3. Use Find to search every row, or Filter to keep rows matching conditions (all conditions must match).",
    "4. Choose Export, pick Excel or CSV, and a split size if more than 1,048,575 rows match.",
    "",
    "## Pages",
    "",
    `- [Home](${SITE}/): what it does, speed, comparison with Excel, Google Sheets and Power Query, FAQ`,
    `- [The app](${SITE}/app/)`,
    `- [Facts](${SITE}/facts): short, dated facts, measured speed and current limits`,
    `- [About](${SITE}/about), [Contact](${SITE}/contact), [Privacy policy](${SITE}/privacy), [Terms](${SITE}/terms)`,
    `- [Fixes](${SITE}/fixes): every error message, one page each`,
    `- [Blog](${SITE}/blog)`,
    ...posts.map((p) => `- [${p.data.heading}](${SITE}/blog/${p.id}.md): ${p.data.description}`),
    ...(guides.length ? ["", "## Error messages and comparisons", "", ...guides.map((g) => `- [${g.heading}](${SITE}${g.href}): ${g.description}`)] : []),
    "",
    "## Frequently asked questions",
    "",
    ...FAQ.flatMap(([q, a]) => [`### ${q}`, "", a, ""]),
  ];
  if (full) parts.push("## Blog posts in full", "", ...posts.map((p) => postMarkdown(p) + "\n\n---\n"));
  return parts.join("\n");
}
