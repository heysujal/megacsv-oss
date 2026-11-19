# Pending review

Things waiting for the owner to read and decide. Newest first. Delete an item once it's settled. Decisions already taken are in [decision.md](decision.md).

## Nov 2, 2026: problem pages live, publish queue, simpler export

**Live:** all 28 problem pages (decision.md #33). The 4 comparison pages went live on Nov 7, 2026.

**Publish queue** (decision.md #34): add page names to `site/publish-queue.txt` to publish them in order, two a day from its `start` date. The deploy hook and its secret are set up (owner, Nov 2). The nightly rebuild is off while the queue is empty; swap the two `triggers` lines in `worker/wrangler.jsonc` to turn it on.

**Next up:** tasks.md section 0.

**Clarity** records everything now, and the privacy policy says so (decision.md #35).

**Export** (decision.md #36): selected cells, basics first, size estimate, finished screen. Worth a look on your own files.

## Nov 1, 2026 (later still): row limit gone, sorting, zip exports, Clarity replays

**Merged into `main`** (owner, Nov 1): redesign, consent banner, feedback in D1, no row limit on filters, sorting at any size, exports of several files as one .zip (the Downloads error), faster sorted exports, stable stylesheet names for Clarity replays. All e2e scripts pass; sorting checked against Python on small and 1 GB files.

**Live** on megacsv.com (version e9f0e0af, deployed from the Mac; Workers Builds also succeeded). Every push to `main` now deploys automatically.

~~Cloudflare Web Analytics~~: named in the privacy policy (decision.md #32).

## Nov 1, 2026 (late night): redesign, consent banner, problem and comparison drafts

On branch `redesign-react` (committed, not pushed or deployed).

**Done:**
- App redesigned in React (Quiet Office): decision.md #26. All e2e scripts pass.
- Cookie banner for visitors in Europe; privacy policy and terms name MegaCSV; softer Clarity wording with the same facts (decision.md #24, #25).
- Homepage: sheet tabs, formula bar and "plain words" lines restored.
- 28 problem pages and 4 comparison pages written as **drafts** (`site/src/content/problems`, `site/src/content/compare`). Drafts aren't built for production; see them with `pnpm dev` at `http://localhost:4321/<slug>` and `/vs/<slug>`. To publish one, set `draft: false`.

**Please check before publishing a page:**
Items 1–3 were checked on Nov 2 (decision.md #30).

1. **Exact error wording** in the real program (people search the exact message). Marked "check the exact wording" on the page where we haven't seen it quoted: Google Sheets cell limit (also check today's limit), LibreOffice Calc, Excel's filter-list message, "cannot complete this task with available resources".
2. **Competitor facts:** Gigasheet and HugeCSV rows come from our research notes, not checked today; check gigasheet.com (pricing, row limit) and hugecsv.com. Tabmega was read on Nov 1 (no prices published on the pages read).
3. **Import limits** on the split pages: Salesforce 50,000, NetSuite 25,000 / 50 MB, HubSpot 1,048,576 rows / 512 MB (20 MB free): from reference.md, checked Nov 1.
4. **Decide:** unmask cell contents in Clarity? See the Nov 2 section (decision.md #31).
5. ~~Look over the new app on a real phone~~: done (owner, Nov 2).

## Nov 1, 2026 (night): features, pages, deploys

Live on megacsv.com: the column picker, *is one of* and *is not a number* filters, decimal commas, every Nth row, saved filter sets; the privacy, terms, about, contact, facts and 404 pages; the logger and ChatGPT posts. Decisions 13–20 in decision.md.

**Please check:**
1. ~~Privacy policy and terms~~: proofread and published (owner approved Nov 1). Still no legal entity or governing law named.
2. ~~Draft posts~~: both published (owner, Nov 1).
3. **GA4 setup** in tasks.md §3 "Waiting on owner" (custom dimensions, key events, Search Console link), and ~~Bing Webmaster Tools import~~ (done, owner, Nov 2).

## Nov 1, 2026 (evening): posts 6–10, share images per post

**Done** (reasons in [decision.md](decision.md)):
- Posts 6–9 written and published (`draft: false`): look-before-you-load-vendor-csv, search-every-row-large-csv, monthly-large-csv-export-routine, data-logger-csv-too-big-for-excel.
- Post 10, csv-too-big-for-chatgpt, written but kept as a **draft**.
- Every published post has its own share image (`site/public/og/blog/<slug>.png`, from `design/og/post.html`; re-run `node scripts/render-og.mjs` after adding a post) and article share tags.
- Fixed: every page's canonical link and `og:url` ended in `.html` (`https://megacsv.com/index.html`) in the production build.
- Stale privacy notes updated in reference.md, tasks.md and research/blog-topics.md.

**Not live yet:** nothing is deployed from here. Run `pnpm run deploy` on your Mac to put the new posts on megacsv.com.

**Decide or check:**
1. **Post 10's ChatGPT limit.** OpenAI's help page couldn't be opened from the cloud session. Search results quote it as "approximately 50MB, depending on the size of each row" for CSVs and spreadsheets. Open [the page](https://help.openai.com/en/articles/8555545-file-uploads-faq), confirm the number, then set `draft: false` in `site/src/content/blog/csv-too-big-for-chatgpt.md` and run `node scripts/render-og.mjs`. Claude's 500 MB was confirmed on its help page (updated Jul 23, 2026). Gemini's limit couldn't be confirmed, so it's left out.
2. **Gaps the posts admit**, worth considering for the roadmap: the *is a number between* filter can't read decimal commas (`21,5`), common in European logger files; filters can't be saved for next month; no "every Nth row" sampling; no "is not a number" filter for finding text in number columns.

## Nov 1, 2026 (later): first 5 blog posts written

Preview: `pnpm --dir site build && cd site && npx astro preview`, then open http://localhost:4321/blog. Posts are Markdown in `site/src/content/blog/`; edit the text there.

| Post | URL | Built on |
| --- | --- | --- |
| Excel keeps changing your CSV: zeros, long numbers, dates and strange characters | /blog/excel-changes-csv-data | YouTube comments (1.17M-view 15-digit videos), Microsoft's 15-digit limit and automatic data conversion page, the XLSX export's text rules |
| Every Excel limit that breaks a big file | /blog/excel-limits-large-files | Microsoft's Excel specifications (1,048,576 × 16,384, 15 digits, 32,767 characters, 10,000 filter items) and its "too large for the grid" page (.xls 65,536 rows) |
| Skip Power Query: get the rows you need from a huge CSV into Excel | /blog/skip-power-query-large-csv | Reddit and YouTube quotes; your M1 timings |
| How long does it take to open a 1, 5 or 20 GB CSV? We timed it | /blog/how-long-to-open-large-csv | Your M1 Air timings plus `logs/measure-*.log` (row counts, find word, filter "country is IN", CSV export) |
| CSV import limits for Salesforce, HubSpot, NetSuite and Shopify | /blog/csv-import-limits | Official help pages, checked Nov 1, 2026 (below) |

**Import limits, checked on official pages:** Salesforce Data Import Wizard 50,000 records at a time (Trailhead); NetSuite Import Assistant 25,000 records or 50 MB per job (Oracle help, "General CSV File Conventions"); HubSpot paid plans 1,048,576 rows / 512 MB per file, 10M rows and 500 imports a day, under 1,000 columns, free tools 20 MB and 500,000 rows a day (HubSpot KB, updated Sep 11, 2026); Shopify product CSV 15 MB (Shopify Help, "Importing products"). Mailchimp's page states no file limit. **Zoho** (25 MB?) couldn't be confirmed on an official page, so it was left out. QuickBooks' bank upload page returned 404.

**Other changes made:**
- `site/`: blog section (`src/content.config.ts`, `src/pages/blog/index.astro` and `[slug].astro`, styles in `global.css`, "Blog" in the nav). Each post gets BlogPosting and BreadcrumbList structured data and an "Open a CSV file" box at the end. The build script now runs `astro sync` first; without it a fresh checkout failed the type check.
- `site/src/data/home.ts`: Google Sheets is now **20 million cells**, not 10 million (Google's Drive limits page). Changed "10 million cells in total" to 20, and "About 330,000 at 30 columns" to "About 666,000".
- `docs/reference.md`: problem pages #21–26 added (blank sheet, .xls mode, 10,000 filter items, long numbers losing digits, Notepad++, pandas "expected fields"); #6 and #15 updated with the checked limits; your privacy decision recorded under the messaging rule.

**Decide:**
1. ~~Privacy wording~~ and ~~bringing back the "online splitter" post~~: decided, see decision.md.
2. **The homepage still quotes the Google Sheets error as "…limit of 10,000,000 cells".** Google raised the limit to 20 million. Check the current error wording in Sheets before changing the quote.
3. **Excel and Power Query timings.** The timings post measures MegaCSV only and states other tools' hard limits, not their speed. A head-to-head on the same Air would make it stronger. Never publish a time we didn't measure.
4. **UI wording in the posts** follows today's app ("Filter", "is", "is not empty", "Export → Excel", "50,000 rows (Salesforce import)"). Update the posts if the redesign renames anything.
5. **Links to problem pages.** None exist yet, so posts link only to each other and to /app/. Add links as problem pages ship.

**Next posts:** 6–10 are now written (see the section above).

## Nov 1, 2026: blog topic research (summary of docs/research/blog-topics.md)

The research supports **10 strong blog posts now** and **8 more once their features ship**. Each one passes four tests: MegaCSV solves it today, there's real evidence for it, it doesn't compete with a planned problem page, and it fits the messaging rules. The full list is in [research/blog-topics.md](research/blog-topics.md).

**What was done:** read both research docs and the raw Reddit and YouTube data, and checked the app code for what's actually built. Ran a second YouTube pass: 30 new searches, 399 videos and 3,261 comment threads, using about 3,100 of the 10,000 daily quota units.

**Findings:**
- **The draft 15-post plan in [research/reddit.md](research/reddit.md) mostly overlaps the problem pages.** 9 of the 15 target the same searches as problem pages already planned in [reference.md](reference.md), or should become new ones. A blog post and a problem page on the same search would compete with each other, so the blog should cover what a short page can't: hubs, comparisons, timed tests, stories and routines.
- **Most of the traffic is in "Excel changed my CSV", not "file too big".**
  - Big-file searches are 10–100 a month each and falling.
  - Videos about long numbers losing their last digits have up to 1.17M views; leading zeros, 322k; "not enough memory", 386k.
  - MegaCSV solves these today: the Excel export writes leading zeros, numbers over 15 digits and dates as text, so Excel can't change them.
- **Stripe, Shopify, HubSpot and Mailchimp show no demand on YouTube.** Folded into one post on import limits rather than separate posts.

**The top 5 to write now:**
1. Excel keeps changing your CSV: zeros, long numbers, dates, columns, strange characters
2. Every Excel limit that breaks a big file (1,048,576 rows / 10 lakh, the 10,000-item filter list, 15 digits)
3. Skip Power Query: from a huge CSV to filtered rows in Excel
4. We timed it: seconds until you see a 1–20 GB CSV, tool by tool
5. Moving data into a new system: import limits by platform

**Before writing:**
- Post 4 needs the timed runs on the reference laptop first.
- Post 5 needs each platform's import limit checked on its official help page.
- Post 10 needs ChatGPT's current file limits checked.

**Decisions asked:** all settled (privacy rule reversed, splitter post back on the list, the 6 problem pages added to reference.md as #21–26).

The new fetch script is [scripts/research/youtube_fetch_blog.py](../scripts/research/youtube_fetch_blog.py). Run it with `SSL_CERT_FILE=/etc/ssl/cert.pem`, because this Mac's Python has no certificate bundle. Raw data in `research-data/youtube-blog.json` (committed).
