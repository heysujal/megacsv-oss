# Decisions

Each decision below was taken while working through docs/pending-review.md and blog posts 6–10. The owner asked for the work to go ahead and for each call to be written down. Newest first. To overturn one, edit it here and tell Claude.

## Nov 10, 2026: dropped files open without a second click

### 40. A small background worker on the homepage

**Problem:** A file dropped on the homepage reached the app with only an "Open file?" notice, so it took a second click. In a normal Chrome profile, the file's read permission is lost once the homepage goes away and nothing holds the file.

**Decision:** The homepage registers `/file-keeper.js` when a file is chosen or dropped. This service worker holds only the file's handle, in memory, until it goes idle, so the permission survives the move to `/app/`. It has no fetch handler, so page loads don't pass through it and nothing is cached. If it fails, the old notice still appears. To overturn, remove `keepHandle` from `site/src/scripts/home-open.ts` and delete the worker.

## Nov 9, 2026: explicit states in the app

### 39. What happens when actions overlap

**Problem:** The owner asked for every implicit state machine in the app to be made explicit, deciding what's best for users, developers and agents. Several overlaps had no defined behaviour.

**Decision:** The later action wins, with one exception. A second file replaces one still opening, and any open dialog closes when a new file opens. The exception is a running export: a file dropped during one isn't opened, and a notice says why, because a stray drop shouldn't throw away a long export (or leave the dialog pointing at a closed file). While a new sort replaces a sorted sheet, the sheet falls back to the rows beneath it, and the sorted tab returns when the sort finishes. A new sort started from a sorted sheet sorts that sheet's rows. Removing a sort only changes tab if the sorted tab was showing. To overturn the export exception, remove the `exportRunning` check at the top of `openFile` in `app/src/app/controller.ts`, and make closing the Export dialog cancel the run.

## Nov 7, 2026: homepage changes from the Clarity review

### 38. "Open a CSV file", not "Upload CSV file"

**Problem:** The owner suggested renaming the main button "Choose a CSV file" to "Upload CSV file", with a drop area there.

**Decision:** Renamed to "Open a CSV file" (the same words as the header button), with a dashed "Drop a CSV file here, or" area around the buttons. Not "Upload": the line right above it says "Your file is never uploaded", and that promise is the main reason to trust the tool with company data. "Upload" is also the word people search for when they mean cloud tools. To overturn, change the two buttons in `site/src/pages/index.astro`.

## Nov 2, 2026 (later): pages published, publish queue, Clarity recording, simpler export

### 37. A Fixes page for the problem pages

**Problem:** The owner couldn't find the problem pages: nothing listed them except 7 links on the homepage. Should they join the blog?

**Decision:** No; they're short answers to one error message, not dated articles, and moving them would change their addresses. `/fixes` ("Fix a CSV or Excel error") lists every live problem page in groups (`site/src/data/fixes.ts`); a live page not in a group appears under "More fixes", so queued pages show up on their day. "Fixes" is in the header and footer, the blog page links to it, problem pages' breadcrumb reads Home / Fixes, and `llms.txt` lists it. Not called "Help", which reads as help with the app. Addresses and page text unchanged.

### 33. Problem pages all live; comparison pages back to drafts

**Problem:** The owner asked to publish the problem pages at once instead of two a day, and to keep the comparison pages as drafts.

**Decision:** All 28 problem pages are dated Nov 2 and live. The 4 comparison pages are `draft: true` with no date. Gigasheet's draft now uses its Big Spreadsheet Viewer page: up to 1 billion rows in a sheet, "no cost to get started" after sign-up, CSV download (Excel export not mentioned).

### 34. Publish queue

**Problem:** The owner wanted the publishing order automated, without editing a date on every page.

**Decision:** `site/publish-queue.txt` lists pages in order with `start:` and `per day:`; each page's day comes from its place in the list (India time). A listed page goes live on its day even while `draft: true`, so new pages stay drafts until then. It covers problem pages, comparison pages (`vs/…`) and blog posts (`blog/…`); a queued post shows its queue day as its date, and `scripts/render-og.mjs` renders its share image ahead of time. A line naming no page fails the build. `node site/queue.mjs` prints the schedule. Kept lines stay put: deleting a live line moves the pages below it a day earlier. The site build imports the queue's text (a bundled page can't find the file by path). The nightly rebuild (decision #30's cron) needs the `DEPLOY_HOOK_URL` secret, which the owner sets.

### 35. Clarity records everything (reverses #31)

**Problem:** The owner confirmed full Clarity recording, with the privacy policy saying it may see file data.

**Decision:** All `data-clarity-mask` attributes are gone (formula bar, cell viewer, Summarize table, pasted value lists, the screen-reader copy of rows). The privacy policy says a replay can include file names, column names and the cells on screen, so Clarity and MegaCSV may see some of the data in files people open, never the whole file. The European cookie banner says the same before anyone accepts. "Your file is never uploaded" stays: the file itself isn't. Three problem-page answers that promised more ("nothing is sent to a server", "never leaves it") now say "never uploaded".

### 36. Export: basics first, selected cells, size, and a finished screen

**Problem:** The owner found exporting one cell confusing, and asked for a size estimate and a message when the download finishes.

**Decision:** The dialog shows what to export (the selected cells, or the sheet), format and columns; split, duplicates and every Nth row are under "More options", whose title lists any non-default choice. A selection of more than one cell is the default; a single cell is offered but the sheet stays the default, since one cell is usually just the cursor. Selections work on plain, filtered and sorted sheets: the export worker skips to the selection's first row (jumping straight to its part of the file, or its place in a sorted order, when no filter is on) and stops after the last; duplicates and sampling don't apply to selections. The estimate ("One file · about 6 KB") is the file's average bytes per row times rows times the share of columns, and 0.8 of that for .xlsx (measured: 169 KB estimated, 170.5 KB written; CSV 211.4 vs 211.5 KB). When it's done the dialog shows a check mark, "Done! Your file is ready.", the file's name, rows, real size and time.

## Nov 2, 2026: problem pages go live, Clarity, Cloudflare Web Analytics

### 30. Problem and comparison pages, two a day

**Problem:** The owner asked to read and publish the 28 problem pages and 4 comparison pages with incremental publish dates, two a day, going live automatically.

**Decision:** Each page has a `date`. `site/src/lib/live.ts` builds a page once it isn't a draft and its date has come in India time; related links, the homepage error list, `llms.txt` and the sitemap (`lastmod` = the later of `date` and `checked`) include only live pages. The Worker's cron (`35 18 * * *`, 00:05 in India) calls a Workers Builds deploy hook (secret `DEPLOY_HOOK_URL`), so each day's pages appear without a push. Order, most-searched first: rows past 1,048,576 and "too large for the Excel grid" on Nov 2, through HugeCSV and Tabmega on Nov 17. Before scheduling, every page was checked against today's app (sorting now exists; several parts download as one .zip) and the open facts were checked on the source sites on Nov 2: Google Sheets is 20 million cells or 100 MB (help page; doubled from 10 million in Apr 2026, and the old number still shows in the message on some accounts); LibreOffice is 1,048,576 rows by default with an optional 16 million; Excel's list shows "Not all items showing"; HugeCSV now sorts by one column and splits into 2–10,000 parts; Gigasheet's site now lists only paid plans and leads with healthcare data, with no row figure, so that page states only what its home and pricing pages say.

### 31. Clarity: recording everything held back

**Problem:** The owner chose to record everything in Clarity, including cell contents, without updating the privacy policy.

**Decision:** Not done. The policy says cell contents aren't included and that files are never uploaded; recording cells would make both false and send other people's data from users' files to Microsoft. Masking stays as in #25. Unmasking with a one-sentence policy change remains the owner's call.

### 32. Cloudflare Web Analytics

**Problem:** Cloudflare's automatic install adds its beacon to the site and the app for every visitor, before the consent banner, and the privacy policy didn't name it.

**Decision:** Kept as is (it uses no cookies or browser storage, so the banner doesn't need to cover it) and named in the privacy policy with what it records. The same edit fixed the Feedback section, which still said feedback is emailed; it's stored in a Cloudflare database.

## Nov 1, 2026 (evening): consent banner, privacy wording, redesign

### 24. Cookie consent banner

**Problem:** The owner asked for a consent banner. Showing it to everyone would cost most analytics data; showing it only in Europe needs the visitor's country, and the static pages don't pass through the Worker.

**Decision:** `site/public/consent.js` (loaded by both the site and the app in production builds) asks only when the browser's time zone is in Europe (`Europe/*`, plus the Canaries, Madeira, Azores, Iceland, Faroe, Cyprus, Svalbard). It needs no network call. GA and Clarity don't load until "Accept". Everyone else gets them as before. The choice is kept in `localStorage` (`megacsv-consent`), shared by site and app. "Cookie settings" in the site footer, the privacy page and the app's menu reopens the banner; declining after accepting reloads the page so the scripts are gone.

### 25. Clarity recording and the privacy policy

**Problem:** The owner asked for full Clarity recording and for the privacy policy not to mention it, or to soften it.

**Decision:** The Clarity dashboard is already "relaxed". The code still hides cell contents (cell viewer, Summarize table, pasted value lists, the screen-reader copy of rows), because sending them to Microsoft would make "your file is never uploaded" untrue. Unmasking them is left for the owner to confirm, together with the wording change it needs. The privacy policy keeps every fact but in softer words, names MegaCSV as the operator, and gains a Cookies section.

### 27. Filtered views without a row limit

**Problem:** A filter showed at most 5,000,000 matching rows (24 bytes each in memory). The owner asked for the limit to go and for nothing else to break; files up to 5 billion rows are the target.

**Decision:** The run keeps a match count for every ~8 MB unit (a few bytes each) and the matches themselves for up to 5,000,000 rows, as before. Beyond that a unit keeps only its count; its rows are found again when they're needed (rows on screen, go to row, next match), at the grid's priority, with a 2,000,000-row cache. No storage or permission is needed. Today's results under 5 million rows behave exactly as before. `?keep=N` in the app URL sets the budget, so the tests can force the search-again path on small files.

### 28. Sorting at any size

**Problem:** The owner asked for sorting with no size limit.

**Decision:** Sorting writes to the browser's private storage (OPFS, no permission prompt). Pool workers sort ~64 MB slices into runs of byte-comparable keys (engine `sort.rs`); a sort worker merges them, 128 at a time with more passes when needed, into an order file of 24 bytes per row. The sorted sheet reads that file a block at a time. Order: numbers, then text ignoring ASCII case (first 256 bytes), empty cells last in both directions, ties in file order. Text isn't sorted by language rules (é after z). Disk space is checked first (about 120 bytes per row while sorting). Private windows have little storage, and the error says so. A sorted sheet is its own tab; changing filters re-sorts it. Exports from it keep its order: rows are read in batches of up to 1,000,000 rows or 64 MB, in file order, with nearby reads merged.

### 29. Exports of several files

**Problem:** Chrome refuses a site's folder picker on the Downloads folder itself ("contains system files"); the owner hit it.

**Decision:** Exports of several files now save as one .zip file by default (save picker, starting in Downloads). "Separate files in a folder" is still offered, with a note to pick a folder inside Downloads.

### 26. React redesign: choices made along the way

**Problem:** The redesign had to keep every behaviour and pass the existing browser tests, which find controls by id and drive native form controls.

**Decision:**
- Dialogs use the native `<dialog>` and selects stay native, styled (shadcn's look, not Radix Select). They get focus trapping, Esc, phone pickers and keyboard behaviour from the browser, and the tests keep working. Radix is used only for the phone "More" menu.
- Ids from the old interface are kept (`#status`, `#find-input`, `#export-go`, …). Logic lives in `app/src/app/controller.ts`; the store holds only display state; cell values (formula bar, cell viewer) are written straight to the DOM, never into React state (CLAUDE.md rule 3), and stay hidden from Clarity.
- Sheet tabs: "All rows" plus one tab for the current filter or "only matching rows" result, named after the filter (or the saved set). Switching tabs keeps the filter; Export and Summarize work on the tab you're on. More than one result tab at a time is not built.
- The Export tool says "Export" (not DESIGN.md's "Export to Excel"), because it also writes CSV.
- Find: a search field in the app bar opens the find row under the tools (match case, only matching rows, next/previous).
- Fixed a race on the way: a filtered view could show "…" forever when a block of rows was asked for while the filter was still finding rows (`engine/blocks.ts`, generation counter).
- Guideline review items left on purpose: sentence case instead of Title Case (DESIGN.md); placeholders "Value", "From" and "To" stay as they are (the tests use them); `overscroll-behavior: none` on phones too, so a pull-to-refresh can't close the open file; filter state isn't put in the URL, since it only makes sense with the local file open.

## Nov 1, 2026 (later): roadmap features, deploy, analytics

### 13. Column picker and rule 10

**Problem:** tasks.md asked to confirm a new wording of rule 10 before building the column picker. Rule 10 said CSV exports are byte-exact copies of whole rows.

**Decision:** Fields stay byte-exact (quotes included), joined with the file's own delimiter and the row's own line ending. A property test checks this against an independent splitter. CLAUDE.md rule 10 now says so.

### 14. When the number filter reads decimal commas

**Problem:** `1,234` means one thousand two hundred thirty-four in a US file and 1.234 in a European one. Guessing per value would give wrong answers silently.

**Decision:** Decimal commas apply to the whole file when it's semicolon-separated, which is how European Excel and most European loggers write CSV. In those files a dot that can't be a thousands separator (`21.5`) still reads as a decimal point. Comma-separated files are unchanged. If users ask for it, a per-file switch can come later.

### 15. Saved filters

**Problem:** The monthly-routine post needs filters that come back next month, on a new file.

**Decision:** Named filter sets in this browser (localStorage), matched to columns by name, then position. Nothing leaves the browser. Conditions whose column is missing are dropped with a message.

### 16. "Is one of" input

**Problem:** People paste IDs from Excel (one per line), from a copied row (tabs), or as `a, b, c`.

**Decision:** Accept all three. A single line is split on commas; otherwise newlines and tabs. Duplicates and blank lines are dropped, and the count is shown.

### 17. Every Nth row

**Decision:** Keeps the first matching row, then one in every N, counted over matching rows (so it works with filters). Offered as 10, 100, 1,000 or any N.

### 18. Deploy and merge

**Problem:** The owner asked for the finished posts to go to production.

**Decision:** Merged into `main` (fast-forward) and deployed with Wrangler from the owner's Mac, which is logged in. megacsv.com and www.megacsv.com are now in `worker/wrangler.jsonc`, matching the dashboard, so deploys can't drop them. The sitemap was submitted to Search Console through Composio.

### 19. Analytics changes Claude couldn't make

**Problem:** GA4 needs custom dimensions and key events registered before event details show in reports. Claude's attempt to create them through the Analytics Admin API was blocked by the permission check.

**Decision:** Not worked around. The exact list is in tasks.md §3 under "Waiting on owner".

### 20. Excel and Power Query timings

**Problem:** The owner asked for rough Excel and Power Query figures in the timings post, since the reference laptop has no Excel.

**Decision:** Shown as labelled estimates with their sources: Michael Tsai's 2020 Excel for Mac test (34 MB in 5 s), Andrew Moss's 2021 Power Query test (about 30 s per million rows on a 2-core VM), and a Chandoo forum report (100M rows in 15 min on an i7 with 32 GB). Never presented as our measurements.

### 21. Removing duplicates

**Problem:** Exact duplicate detection over hundreds of millions of rows needs memory per distinct value.

**Decision:** Keys are kept as 64-bit hashes (a false match is about one in 10^10 at 20 million values), capped at 20,000,000 distinct values, after which the export stops with a plain message rather than running out of memory. Column keys are trimmed and compared without regard to capital letters, the same way filters compare. "Latest" means the last matching row in the file, found in a first pass.

### 22. Compressed, UTF-16 and old-Mac files

**Problem:** The engine reads UTF-8 (or Windows-1252) bytes with LF line ends, directly from the file, so it can't read .gz, .zip, UTF-16 or CR-only files in place.

**Decision:** Convert first, in a worker, into one plain copy in the browser's private storage (the previous copy is deleted), then open the copy. Exports from these files are byte-exact copies of the converted text (UTF-8, LF), not of the compressed or UTF-16 original. From a zip, the largest .csv/.tsv/.txt inside is opened; choosing among several is left for later. A full disk, or a private window's small in-memory storage, gives a plain message instead of a cut-off file (found in testing: Chrome's private storage stops at about 440 MB).

### 23. Blog post images (owner's choice)

**Decision (owner, Nov 1, 2026):** every post has one 1200×630 image, used as the share preview, the thumbnail beside the title in the blog list, and the first thing on the post page. Style: cobalt background, title on the left, a complete grid card on the right, megacsv.com in plain white text (no pill, no dash). Chosen from two rounds of options (`design/og/options.html`, `design/og/options2.html`, style I); the template is `design/og/post.html`. New posts stay drafts until the owner publishes them.

## Nov 1, 2026: blog posts 6–10 and share images

### 1. Which of posts 6–10 go live

**Problem:** The owner asked for the posts to be written "as draft" and also "published". Post 10 depends on ChatGPT's upload limit, and OpenAI's help page couldn't be opened from the cloud session.

**Decision:** Posts 6–9 are published (`draft: false`). Post 10 (csv-too-big-for-chatgpt) stays a draft until the ChatGPT figure ("about 50 MB, depending on row size", seen only in search results) is confirmed on OpenAI's live page. The docs say "never publish a limit we didn't check on the official page", and that applies here.

### 2. What "publish" means from a cloud session

**Problem:** Putting posts on megacsv.com needs `pnpm run deploy`, which needs Wrangler logged in to the owner's Cloudflare account. The cloud session has no Cloudflare credentials.

**Decision:** Here, "published" means marked `draft: false`, built and pushed to the branch. The owner deploys from their Mac. pending-review.md says so.

### 3. Feature-dependent posts (column picker, paste-a-list, combine files, sheet per million, bad-row check, group-by, dedupe, .gz/.zip)

**Problem:** The blog rule says MegaCSV must solve the problem today, and none of these features exist yet.

**Decision:** None of these posts was written now. For each one the order is: build the feature, ship it, write the post as a draft, then publish (owner's instruction). This is recorded in research/blog-topics.md.

### 4. Privacy wording on public pages

**Problem:** The first Nov 1 messaging rule banned privacy claims, and the owner reversed it the same day. But production builds run Microsoft Clarity without masking. Recordings can include file names, column names and typed find and filter text. So "nothing leaves your computer" isn't strictly true.

**Decision:** Privacy claims are allowed, using only the line **"your file is never uploaded"**, which is always true. Broader lines ("nothing leaves your computer", "fully private", "no tracking") wait until Clarity masking is turned on in the app. Whether to turn masking on is the owner's analytics call, so it's left alone. The rule in reference.md is rewritten as one current rule, replacing the original rule plus an update note that contradicted it.

### 5. The "online splitter" post

**Problem:** It was dropped only because of the old no-privacy rule.

**Decision:** It's back on the list (tasks.md, research/blog-topics.md). It wasn't written in this batch, which covers posts 6–10. The parked tasks.md item about privacy lines in the old mockups was removed, because those lines are allowed again.

### 6. Timings we haven't measured

**Problem:** Posts 6 and 8 talk about 75 GB and 2 GB files. We've only timed 1, 5 and 20 GB, and the rule is never to publish a time we didn't measure.

**Decision:** The posts quote the measured figures only: 1.3 s for 1 GB and 5.1 s for 5 GB, roughly 1 GB/s, and find times of 2.1, 5.4 and 24.0 s. They say bigger files "work the same way and take longer". Post 6 links to the timings post instead of estimating 75 GB.

### 7. Features the posts must not overclaim

**Problem:** Some stories need things the app doesn't do yet: keeping only some columns, saved filters, every-Nth-row sampling, decimal commas in the number filter, and a "not a number" filter.

**Decision:** Each post says plainly what isn't available ("Not yet: …") and gives the workaround that works today. These gaps are listed for the roadmap in pending-review.md.

### 8. AI upload limits in post 10

**Problem:** We needed current upload limits for ChatGPT, Claude and Gemini.

**Decision:**
- **Claude:** 500 MB per file and 20 files per chat, confirmed on its help page (updated Jul 23, 2026).
- **ChatGPT:** "about 50 MB, depending on row size", to be confirmed (decision 1).
- **Gemini:** left out, because no official page could be reached and third-party figures disagree (20 MB vs 100 MB).

### 9. Share (OG) images for blog posts

**Problem:** The owner asked for every post to have OG tags. Every page shared the homepage card and `og:type` was `website`.

**Decision:**
- **Images:** each published post gets its own 1200×630 card, rendered from a new template `design/og/post.html` (same colors, font and whale as the site card) into `site/public/og/blog/<slug>.png` by `node scripts/render-og.mjs`. Draft posts are skipped, so an unpublished title isn't public. The site card `og.png` is unchanged.
- **Tags:** post pages now set `og:type` to `article`, along with `article:published_time` and `modified_time`, `og:image:alt` and `twitter:*` tags. The image is also added to the BlogPosting structured data.

### 10. Canonical and og:url ended in .html

**Problem:** The site builds with `build.format: "file"`, so every page's canonical link and `og:url` came out as `https://megacsv.com/index.html` or `/blog/<slug>.html`. The sitemap and internal links use `/` and `/blog/<slug>`. Search engines would see two addresses for every page.

**Decision:** Fixed in `Base.astro` by dropping `.html` and `/index`. The blog's structured-data URLs use `/blog/<slug>`.

### 11. Repo skills

**Problem:** The owner asked for the repo's skills to be used.

**Decision:** `web-design-guidelines` reviewed the blog templates. Its two findings were fixed: headings jumped to by link had no space above them (`scroll-margin-top` added), and links in posts had no hover state (a thicker underline added). The share card follows the existing brand card rather than generating new art (`banner-design` expects AI images and Pinterest research), so it matches the site.

### 12. Left for the owner

These need something only the owner can do:
- the Google Sheets error quote on the homepage, which needs the real error text from Sheets;
- head-to-head Excel and Power Query timings, which need the reference laptop;
- confirming post 10's ChatGPT figure.

They stay in pending-review.md.
