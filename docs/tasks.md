# MegaCSV: tasks to be done

Nov 1, 2026 · Product facts and rules live in [reference.md](reference.md); what was built and decided on Nov 1 (deploy, feedback email, speed figures, blog topics) in [notes-2026-11-01.md](notes-2026-11-01.md); design rules in [DESIGN.md](../DESIGN.md). Tick items off as they ship. Items marked **Waiting on owner** need input before work starts.

Every new or changed screen is checked with the `web-design-guidelines` skill (Vercel's Web Interface Guidelines) before it's called done.

## 0. Next up (listed Nov 2, 2026)

Do these first, in this order.

- [ ] **Blog fact-check and refresh.** The 12 posts weren't re-checked after Nov 1. Check every fact against its source (the ChatGPT 50 MB limit was never confirmed on OpenAI's page). Update for today's app: sorting exists, several parts save as one .zip (`csv-import-limits.md` line 54 still says Chrome and Edge save into a folder), and "Split into files of" is under "More options" in Export. Add links to the matching fix pages and to /fixes; no post links to them yet.
- [ ] **Homepage Google Sheets line.** `PROBLEMS` in `site/src/data/home.ts` quotes "…limit of 10,000,000 cells"; Google's help page says 20 million (doubled in Apr 2026; the old number still shows in the message on some accounts). Adjust the wording around it.
- [ ] **Fix pages ↔ blog posts.** Each fix page links to the blog post that goes deeper on the same topic, and back.

**Sorting (reported by owner, Nov 10, 2026)**
- [ ] **Sorted rows only appear after a click.** When a sort finishes, the grid stays blank or out of date until you click somewhere. Likely cause, from reading the code (not yet tested): the sorted view's rows arrive through `run.onUpdate` in `startSort` (`app/src/app/controller.ts`), which never calls `grid?.invalidate()`, unlike the file and filter views.
- [ ] **Sorting takes long.** Find where the time goes (sorting slices or merging them) and speed it up.
- [ ] **Loading bar at the top, and thicker.** It's at the top of the status line at the bottom of the app, 2px tall (`#progress` in `app/src/components/Chrome.tsx`). Move it to the top of the app and make it a little thicker.

**Waiting on owner**
- [x] Comparison pages (`vs/excel`, `vs/gigasheet`, `vs/hugecsv`, `vs/tabmega`): published Nov 7, 2026 (owner).
- [ ] Microsoft Clarity's terms: check they allow recording what's on screen in people's files, now that masking is off (decision.md #35).
- [ ] GA4 setup and the Clarity–GA link (section 3).

**Publish queue:** the nightly rebuild is off while the queue is empty (`worker/wrangler.jsonc`). Turn it on before adding pages to `site/publish-queue.txt`.

## 1. App redesign (done Nov 1, 2026; decision.md #26)

React 19, Tailwind v4, shadcn-style components (restyled to Quiet Office), Zustand and Phosphor icons (Regular). Hanken Grotesk self-hosted (`@fontsource-variable`). The canvas grid stays, restyled. Animation with CSS only.

- [x] App bar, tool row, formula bar, column letters, status line and sheet tabs from `design/explorations/09-quiet-office.html`.
- [x] Find, filters, Summarize, export, feedback, recent files, saved filters, column picker and cell viewer ported with the same behaviour and the same analytics events.
- [x] Filters written as a sentence ("Show rows where [country] [is] [IN] and …"), 15px.
- [x] Phones and tablets: labels drop below 860px; below 640px Summarize, Go to row, Feedback, theme and Cookie settings move into a "More" menu; dialogs go full-screen; the grid scrolls by touch (drag, flick, tap to select, double-tap to open a cell); 16px fields so phones don't zoom.
- [x] Light and dark themes, both designed; the switch is shared with the website (`megacsv-theme`).
- [x] e2e `smoke`, `features`, `grid`, `convert`, `huge` pass (grid.mjs click positions updated for the taller header). App JS: 158 KB gzipped main + 17 KB workers (owner: don't hold the redesign to 250 KB yet).
- [x] `web-design-guidelines` review: fixes applied (decision.md #26 lists what was left and why).
- [x] Owner look-over on a real phone (owner, Nov 2, 2026).

## 2. App features (after the redesign)

- [x] Column picker (export only some columns): Export → Columns → "Only the ones I choose…". Rule 10 reworded in CLAUDE.md (fields byte-exact, joined with the file's delimiter); decision.md #13.
- [x] "Is one of…" filter: paste a list of values (one per line, tabs from a copied spreadsheet row, or one line of commas).
- [x] "Is not a number" filter (text in a number column).
- [x] Decimal commas (`21,5`, `1.234,5`) in the number filter for semicolon files.
- [x] Export keeps every Nth row (Export → Keep).
- [x] Saved filter sets, by column name, in this browser (Filter → Save these filters / Saved filters).
- [x] **Open .csv.gz, .zip, UTF-16 and old-Mac (CR) files** (Phase 4): unpacked or converted to a plain UTF-8 copy in private storage (one at a time), then opened. Zip: the largest CSV inside, Zip64 supported. 1 GB .gz opens with every row. e2e/convert.mjs.
- [x] **Remove duplicates** on export (Phase 3): identical rows, or one row per value of a column, keeping the first or the latest (a second pass). Up to 20,000,000 distinct values (64-bit hashes; decision.md #21).
- [x] **Summarize** (Phase 3 group-by and column profile): rows per value of a column, with empty cells, numbers, total, average, smallest and largest of another; works on the current filter; select a group to filter to it; download as CSV. Up to 1,000,000 groups (the rest counted as "Other values"). 1 GB grouped in 1.4 s (dev build, M1 Air).
- [x] Copy cells: click, shift-click, drag or shift+arrows selects a range; Ctrl/Cmd+C copies it as tab-separated text that pastes into Excel (up to 1,000,000 cells).
- [x] Column resize (drag a header border) and auto-fit (double-click it).
- [x] Cell inspector: double-click a cell or press Enter for its full value, length and line count, with Copy.
- [x] Hidden accessible copy of the rows on screen (CLAUDE.md rule 4): an ARIA table refreshed when scrolling stops.
- [x] No row limit on filtered views (decision.md #27): 30,950,000 matches on a 5 GB file tested.
- [x] Sort by any column at any size, as its own sheet tab; exports keep the order (decision.md #28).
- [x] Exports of several files save as one .zip by default (decision.md #29).

## 2b. Next features (from the NanoCell review, Nov 2, 2026)

Full specs and UX in [next-features.md](next-features.md). For later; in priority order.

- [ ] **Install as an app, work offline, open from "Open with"** (service worker, `file_handlers`, `launchQueue`; one "Install MegaCSV" item in More).
- [ ] **Check:** a new tool that lists problems in every column (N/A and NULL, stray spaces, leading zeros, long numbers, mixed date formats, text in number columns, duplicate rows, bad column names), each with "Show these rows". Read-only.
- [ ] **More export and copy formats:** TSV, JSON lines, JSON in Export; right-click menu with Copy as Markdown or JSON, Find this value, Filter to this value.
- [ ] **Keyboard shortcuts** the Excel way (Ctrl+O, Ctrl+Shift+L, Ctrl+S → Export, Ctrl/Shift+Space) and a shortcuts list on `?`.
- [ ] **Change how columns are split:** the delimiter in the status line becomes a menu (comma, semicolon, tab, pipe, other).
- [ ] **Waiting on owner:** Clean up on export (bends rule 10: byte-exact unless a box is ticked).
- [ ] **Waiting on owner:** Edit cells at any size, saved as a full copy (reference.md says editing isn't supported).
- [ ] **Waiting on owner:** comparison page "MegaCSV vs NanoCell".

## 3. Analytics

Live in production builds: Google Analytics (G-5R3TTC770R) and Microsoft Clarity (z6gjzdh6wf, relaxed; cell contents hidden in code), added by `app/vite.config.ts` and `site/src/layouts/Base.astro`. Events are sent by `app/src/analytics.ts` (the `track()` and `tag()` helpers). Loaded by `site/public/consent.js`, which asks visitors in Europe first (decision.md #24).

- [x] Events below, including exact file size (`file_bytes`, `file_mb`, `size_bucket`), plus Clarity tags (`file_size`, `file_mb`, `rows`, `memory_gb`, `cpu_cores`, `app_version`, `recent_files`) to filter recordings.
- [ ] Carry every event over in the redesign.

- [x] **Cloudflare Web Analytics.** Set up with automatic install (site tag `36a6db64…`); Cloudflare adds its beacon to every page and the app for real browsers, before the consent banner (it's cookieless). Named in the privacy policy (Nov 2, 2026).
| Event | Details sent |
| --- | --- |
| `device` (once per visit) | app version, memory, CPU cores, screen, pixel ratio, language, installed app, save/folder picker support, touch, light or dark |
| `app_ready` | seconds to load the engine |
| `web_vital` | TTFB, FCP, LCP, INP, CLS with rating |
| `open_click`, `open_cancel` | — |
| `file_open_start` | file size (bytes, MB, band), extension, how it was opened (picker, file input, drop, recent, quotes as text) |
| `file_ready` | first rows on screen: size, delimiter, encoding, header, reopened instantly, seconds |
| `file_open` | whole file read: size, rows, columns, seconds, MB per second |
| `file_open_failed` | size, reason |
| `unbalanced_quotes` | size |
| `file_session_end` | minutes the file was open, size |
| `find_open`, `find_close`, `find`, `find_done`, `find_jump` | match case, only matching, text length, matches, seconds, direction |
| `filter_open`, `filter_close`, `filter_add_condition`, `filter_apply`, `filter_done`, `filter_clear` | conditions, operators, matches, seconds, size |
| `go_to_row` | beyond the end, inside a filter |
| `shortcut` | find or go to row |
| `export_open`, `export_start`, `export_done`, `export_cancel`, `export_fail`, `export_save_cancel`, `export_save_dialog_failed` | format, split, rows, files, filtered, save method, size, seconds, rows per second |
| `recent_remove`, `recent_missing` | — |
| `feedback_open`, `feedback_sent`, `feedback_failed` | kind, with email, length, offline |
| `app_error` | message and where (uncaught errors and rejected promises) |
| Site: `cta_click` (nav, hero, blog-end…), `faq_open` | page, button, question number |
| Site, later: `try_on_page`, `language_switch` | page |

Clarity tags on site pages: `page_type` (home, blog, blog_post) and `post` (the post's slug), to filter recordings of blog readers. GA4's enhanced measurement already records page views, 90% scroll, outbound link clicks and site search, so the site doesn't send those itself.

### Analytics to-do (Nov 1, 2026)

**Waiting on owner** (needs the GA4 or Clarity dashboard). Claude Code may now call the Analytics Admin API (`.claude/settings.local.json`), but Composio's Google Analytics connection is read-only (`ACCESS_TOKEN_SCOPE_INSUFFICIENT`), so the writes still fail; reconnect it in Composio with edit access, or follow `docs/ga4-checklist.md`:
- [ ] **Register custom dimensions** in GA4 (Admin → Data display → Custom definitions → Create, scope *Event*). Until they exist, event details can't be used in reports. Parameter names: `size_bucket`, `file_mb`, `extension`, `delimiter`, `encoding`, `format`, `filtered`, `kind`, `where`, `button`, `page`, `question`, `opened_with` (was `source`), `has_header`, `from_cache`, `rows`, `seconds`. GA4 allows 50 event-scoped dimensions on the free tier.
- [x] **Key events** (checked through the API, Nov 7, 2026): `cta_click`, `file_open`, `file_ready`, plus the default `purchase`.
- Optional: star `export_done` under Admin → Events → Recent events once the first real export arrives. Only worth it for Google Ads or conversion rates in GA's standard reports; the event is recorded either way. (GA4 here has no "New key event" button; skipped by the owner, Nov 7, 2026.)
- [x] Custom dimension `opened_with` ("Opened with") created and the old `source` one archived (Nov 7, 2026). Event data retention is 14 months.
- [ ] **Internal traffic filter.** The owner's IP is in the "Define internal traffic" rule, but the Internal Traffic data filter is still off (owner's choice for now), so the owner's own visits still count.
- [ ] **Link Search Console to GA4** (Admin → Product links → Search Console links), so blog search queries show next to engagement.
- [ ] **Clarity: Google Analytics integration** (Clarity → Settings → Setup → Google Analytics), so recordings link to GA sessions.
- [x] **Clarity masking decision**: everything is recorded, and the privacy policy and cookie banner say replays can show file data on screen (owner, Nov 2, 2026; decision.md #35).

**Code (Claude):**
- [x] `faq_open` and Clarity `page_type` / `post` tags on site pages.
- [ ] Events for features as they ship: `columns_pick` (count kept), `filter_apply` operator values for new operators (`oneOf`, `notNumber`), `export_done` with `every_nth` and `columns`, `saved_filter_use`.
- [ ] A GA4 *Exploration* to build once dimensions exist: blog post (landing page) → `cta_click` → `file_open` → `export_done`, to see which posts bring people who use the app.
- [ ] Monthly AI-visibility check (reference.md, "Measure it"): sessions with source chatgpt.com, perplexity.ai, claude.ai, gemini.google.com, copilot.microsoft.com.

Don't put file names, column names or cell values in event details: Google Analytics' terms forbid personal data in events, and file names often contain it. Clarity recordings already show those on screen.

## 4. Deploy

- [x] Add the megacsv.com custom domain to `worker/wrangler.jsonc` (`routes` with `custom_domain: true`), plus www.
- [x] `pnpm build`, then `cd worker && npx wrangler deploy` (deployed Nov 1, 2026).
- [x] Feedback goes to the D1 database `megacsv-feedback` instead of email (no `FEEDBACK_TO` secret needed).
- [x] Table created in the remote database (`npx wrangler d1 migrations apply megacsv-feedback --remote`, Nov 1, 2026).
- [x] `pnpm run deploy` so the live Worker stores feedback (Nov 1, 2026).
- [ ] Send a test from the Feedback button on the live site.
- [x] Sitemap submitted to Google Search Console (Nov 1, 2026).
- [x] Cloudflare Workers Builds deploys every push to `main` (owner, Nov 1, 2026): build `pnpm run build` (installs Rust on CI), deploy `cd worker && npx wrangler deploy`. `pnpm run deploy` still works from a Mac.
- [x] Bing Webmaster Tools: imported from Google Search Console (owner, Nov 2, 2026).

## 5. Website (Astro, in `site/`)

Static HTML, 0 KB JavaScript on content pages; the tool loads only where it's embedded. Mobile responsive at every width from 320 px up.

### Landing page
- [x] Six layout variants in `design/landing/` (open `design/landing/index.html`).
- [x] Owner picked parts of several (Nov 1, 2026); built in `site/src/pages/index.astro`, copy in `site/src/data/home.ts`. Header: "Open CSV files too big for Excel." Centered layout.
- [x] Speed figures measured on a MacBook Air (M1, 8 GB RAM) in Chrome, Nov 1, 2026 (1, 5 and 20 GB files from `pnpm gen`); Excel and Power Query bars dropped (no Excel on that machine; Power Query is Windows-only). Re-measure when the engine changes.
- [x] App served at `/app/` next to the site; `pnpm build` merges both into `dist/` for the Worker.
- [x] One click instead of two in Chrome and Edge (Nov 7, 2026): "Open a CSV file" on the homepage shows the file picker there, and a file dropped anywhere on the page (or on the dashed drop area around the buttons) opens too. The file handle goes to the app through the recent-files store and `/app/?open=<id>` (`site/src/scripts/home-open.ts`, `openFromHome` in `app/src/app/controller.ts`). If Chrome drops the permission on the way, the app shows "Open <file>?" with one button. Safari and Firefox can't pass a file between pages: their button still goes to `/app/`, and a drop there says to drop it again on the next page. Full fix for them: the app as an island on the homepage, after the redesign.
- [x] Clarity follow-ups (Nov 7, 2026): the app picture is a link to the sample file (most-clicked thing on the page, a dead click before); a proof line under the headline ("48 million rows on screen in 0.1 s · Your file is never uploaded"); Analytics and Clarity load only on megacsv.com, so local production builds stop showing up as visits.
- [x] "Try a sample file" button (`app/src/sample.ts`, `/app/?sample`). Generate the sample inside the browser (realistic rows, a few varied blocks repeated up to about 2 GB, the way `app/e2e/huge.mjs` builds its virtual file): nothing stored or downloaded, no third-party request (rule 5), and it shows the real speed. Opened by `/app?sample`, labelled "Sample file (made up data)". Not third-party public links: rule 5 forbids them, most block cross-site downloads, and a multi-GB download hides our speed.
- [x] Softened for now (Nov 1, 2026): page no longer claims sheet tabs, a formula bar or filters written as a sentence, since the current app has none of them. See Future scope.
- [x] Link "Other messages it gets you past" items to their problem pages as each page ships (automatic: `PROBLEMS` in `site/src/data/home.ts` names each page).
- [x] Open Graph image: `site/public/og.png`, from `design/og/og.html` (`node scripts/render-og.mjs`).
- [x] Footer links (About, Facts, Blog, Contact, Privacy, Terms).

### Blog
- [ ] Every post presents MegaCSV as the solution to the problem it discusses (owner rule, reference.md "Blog rule").

Topics from the research (docs/research/reddit.md "Blog plan", docs/research/youtube.md). Each opens with a real, anonymous story from the research. Every title targets words people actually searched or wrote.

**Ready now (MegaCSV solves it today):**
- [ ] "This data set is too large for the Excel grid": what it means and how to open the whole file
- [ ] Excel "File not loaded completely": your rows aren't lost (yet)
- [ ] Excel opens your big CSV blank, with no error? Here's why
- [ ] Excel "Not responding" when opening a big CSV
- [ ] How to open a CSV with more than 1 million rows (10 lakh) without Power Query
- [ ] Open a large CSV on a Mac when Power Pivot and the Data Model aren't there
- [ ] How to export 10 million rows to CSV (the most-asked question under Power Query tutorials)
- [ ] Power Query errors on large CSV files ("rows loaded, errors", "more rows than the spreadsheet can contain") and a simpler way
- [ ] Split a huge CSV for Salesforce (50,000) or NetSuite (25,000) imports without losing leading zeros
- [ ] Split a CSV into Excel-sized parts automatically (1,048,575 rows each, header on every part)
- [ ] Leading zeros gone, long numbers shown as 1.23E+11, dates changed: keep CSV values exactly as written
- [ ] Excel's filter list stops at 10,000 items: filter a big file by any value
- [ ] Google Sheets' 20 million cell limit: open bigger CSVs
- [ ] Notepad++ says the file is too big: open it anyway
- [ ] pandas "Expected N fields, saw M": go straight to the broken row
- [ ] pandas MemoryError on a big CSV: when you just need to look, filter and export
- [ ] How long does it take to open a 1, 5 or 20 GB CSV? We timed it (our measured numbers only)
- [ ] How to open the NPPES NPI file and other giant public datasets

**Wait for the feature before writing (the rule says MegaCSV must solve it):**
- [ ] Keep only the columns you need from a huge CSV (column picker)
- [ ] Look up a list of IDs in a file with millions of rows, the "big VLOOKUP" ("is one of" pasted-list filter)
- [ ] Combine many CSV files into one (not planned yet; asked about in ~72 YouTube comments)
- [ ] Pivot table or totals on millions of rows (Phase 3 group-by)

**Back on the list:** "Is it safe to upload your CSV to an online splitter?" It was dropped under the old no-privacy rule; privacy claims are allowed again (docs/decision.md). Write it with the "your file is never uploaded" line.

### On-page SEO, built from the research
Use [research/reddit.md](research/reddit.md), [research/youtube.md](research/youtube.md) and the raw data in `research-data/` (`redditdata.txt`, `youtube.json`). Fetch more with `scripts/research/youtube_fetch.py` (YouTube API key in `.env`) when a page needs fresh search terms.

- [ ] Title (under 60 characters), meta description, one H1, logical H2/H3, absolute canonical, Open Graph and Twitter tags on every page.
- [ ] Each page targets one keyword group from reference.md ("Keyword targets"), worded the way people wrote it in the research (e.g. "Excel cuts off my rows", "10 lakh rows", "open CSV on Mac without Power Query").
- [x] Problem pages titled with the exact Excel error people quote (research/reddit.md error table), answer in the first two sentences: all 26 from reference.md written as drafts (28 pages: imports split into Salesforce, NetSuite and HubSpot), plus comparison pages vs Excel, Gigasheet, HugeCSV and Tabmega. Problem pages all published Nov 2, 2026; comparison pages kept as drafts (decision.md #33). Future pages go out through `site/publish-queue.txt` (decision.md #34).
- [ ] Real quotes from the research (anonymous, lightly trimmed) where they make the point better than our copy.
- [ ] Structured data: `SoftwareApplication` with a free `Offer`, `Organization` with the whale logo, `FAQPage`, `HowTo`, `BreadcrumbList`.
- [ ] Internal links: every page links to the tool, two related problems and one comparison.
- [ ] Image alt text, width and height set, modern formats, lazy loading below the fold.
- [x] `/llms.txt`, `/llms-full.txt` and a `.md` copy of every blog post (reference.md, "AI discovery"). Live problem and comparison pages are listed automatically.

### Pages
- [x] Privacy policy (`/privacy`). The one place analytics are named: Google Analytics' and Clarity's own terms require the site's privacy policy to say they're used. Plain, short, linked only from the footer.
- [x] Terms and conditions (`/terms`). **Owner to review** the legal wording (pending-review.md).
- [x] About us (`/about`). Also `/facts` (reference.md, "AI discovery").
- [x] Contact us (`/contact`): email plus how to use the Feedback button in the app.
- [x] 404 page: plain message and popular pages; served by the Worker (`not_found_handling`). Drop zone comes with the homepage island.
- [ ] 500 page: plain message, link home, Feedback link. Served by the Worker on errors.
- [x] `robots.txt`: allow all, including the AI crawlers listed in reference.md; point to the sitemap.
- [x] `sitemap.xml` (Astro sitemap integration, `lastmod` on posts), submitted to Search Console Nov 1, 2026. `hreflang` alternates once languages ship.

### FAQ section
- [ ] Questions come from the research (what people actually ask); the landing variants carry a first set.
- [ ] Mark up with JSON-LD `FAQPage` structured data, one `Question` with an `acceptedAnswer` per item, text identical to what's on the page. Each answer starts with a one-sentence direct answer.

## 6. Future scope: homepage lines to restore after the redesign

Restored Nov 1, 2026 with the redesign (`site/src/pages/index.astro`), except date filters:

- [x] Sheet tabs: "Each result opens as its own sheet tab", and "All rows" one click away.
- [x] Formula bar with the full value of the selected cell: "rows, columns, a formula bar, sheet tabs" in "When Excel says no".
- [x] Filters written as one sentence ("Show rows where vendor contains Acme and…"): restore "Ask for the rows in plain words" and the "Say what you're looking for" step.
- [ ] Filter by date range (e.g. "posted_date is in Q3 2026") if it gets built.
- [x] The app preview picture already shows the formula bar and sheet tabs; until then it's a picture of the coming design.

## 6b. Future scope: launch listings

- [ ] **Product Hunt launch.** One launch day, prepared ahead: tagline, gallery images from the app, a short clip of a 5 GB file opening, a first comment from the maker. Pick a Tuesday–Thursday; line up people to try it that day.
- [ ] **AlternativeTo listing**, set as an alternative to Excel, EmEditor, Modern CSV, Gigasheet and HugeCSV, with the same screenshots.
- [ ] Then free-tools lists for finance and data people (found while doing the two above).

## 7. Future scope: other languages

Documented only; not building yet. Follow Astro's i18n recipe (https://docs.astro.build/en/recipes/i18n/): English at `/`, other languages under `/es/`, `/pt-br/` and so on. Translate keyword targets per language from that language's own search data, not word for word.

- [ ] `hreflang` link tags on every page for every language, plus `x-default` pointing to English, and matching alternates in `sitemap.xml`.
- [ ] Language switcher; `<html lang>` set per page.
- [ ] The app's own text translated with the same language list.

**Languages, in order.** Our research searched in English only, so it under-counts other languages. In 3,384 YouTube comments the non-English signal was Hindi or Hinglish (about 118), then Portuguese (5) and Indonesian (3). The rest of the list follows Excel's largest non-English markets.

| Priority | Language | Why |
| --- | --- | --- |
| 1 | Español (`es`) | Large Excel market across Spain and Latin America |
| 1 | Português, Brazil (`pt-br`) | Large Excel market; seen in the comments |
| 1 | Deutsch (`de`) | Large business and finance audience; strict privacy culture fits "nothing uploaded" |
| 1 | Français (`fr`) | Large business market; same privacy fit |
| 1 | 日本語 (`ja`) | Large Excel user base |
| 2 | हिन्दी (`hi`) | India is the biggest non-English group in our data. Most Indian searches are in English with Indian units ("10 lakh rows"), so start with English pages using lakh wording; add Hindi after checking search volume |
| 2 | Bahasa Indonesia (`id`) | Seen in the comments; growing office market |
| 2 | Italiano (`it`) | Mid-size Excel market |
| 3 | 한국어 (`ko`) | Mid-size market; local office suites (Hancom) compete with Excel |

Check every language against Keyword Planner volumes for "csv viewer" and "abrir csv grande"-style terms before building it.

## Parked (not blocking)

