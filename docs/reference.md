# MegaCSV — Product & Technical Reference

Oct 27, 2026 · @Sujal

## Summary

MegaCSV is a free web app that opens CSV files too big for Excel, up to tens of gigabytes, entirely on the user's own computer. Users can search, filter and summarize the data, then export just the rows they need back into Excel. Nothing is ever uploaded.

**One-liner:** Open CSV files too big for Excel. Find what you need. Get it back into Excel. Free, no signup.

**Name:** MegaCSV (megacsv.com). Chosen over GigaCSV (too close to Gigasheet and Gigagrid CSV Pro), CsvBig (too close to an existing product called BigCSV) and JumboCSV (bought as a backup domain that redirects). The GitHub name "megacsv" is an unused organization, so use megacsv-app for any GitHub presence. Before launch: trademark search (USPTO, WIPO, IP India) and claim the X and Reddit handles.

**Strategy in one paragraph:** Rank for the large, stable generic searches ("csv viewer", "online csv viewer"). Win those visitors by being the only no-signup viewer that also handles huge files fast. Keep them with features nobody offers locally: no-code filters, group-by, column summaries, and one-click export to Excel. Market it in plain language to Excel users, not to developers. Build a paid desktop version later.

**Key decisions**

| Area | Decision |
| --- | --- |
| Platform | Web app first (no install, no signup). Desktop Pro app later with Tauri. |
| Processing | 100% local in the browser. No server ever sees user data. |
| Engine | Rust compiled to WebAssembly with SIMD, run in Web Workers. |
| Data grid | Hand-built canvas grid in plain TypeScript, no framework. |
| UI panels | React 19 + Tailwind CSS v4 + shadcn/ui, as Astro islands. |
| Site and SEO pages | Astro, static output, zero JavaScript on content pages. |
| Hosting | Cloudflare Workers static assets (free). Domain via Cloudflare Registrar. |
| Running cost | About $11 per year (the domain). Hosting is free at any traffic level. |
| Builder | Claude Code writes the code; this document is its reference. |
| Business model | Free web app for traffic and reputation; Pro desktop app and possibly Pro features later. |

## Why we're building this

Every business system exports CSV, and the files keep growing, but the tools most people use stop at about one million rows. People who are not programmers have no good, private way to open a 2–20 GB file.

**The limits people hit**

| Tool | Limit |
| --- | --- |
| Microsoft Excel | 1,048,576 rows. Often freezes much earlier, around 500,000 rows or 50–100 MB. Rows beyond the limit are silently dropped. |
| Google Sheets | 100 MB import limit and 10 million cells per spreadsheet. |
| Apple Numbers | 1 million rows and 1,000 columns. |
| Salesforce import | 50,000 rows and 100 MB. |
| NetSuite import | 25,000 rows or 50 MB. |
| HubSpot import | 1,048,576 rows and 512 MB. |

**Why today's answers fail these users**

- **Code (Python, SQL, DuckDB, command line):** works, but most of these users can't code.
- **Cloud tools (Gigasheet, Row Zero):** need a signup and an upload. Many users are not allowed to send company or client data to a third party.
- **Desktop apps (Tad, Modern CSV, EmEditor):** need an install, which locked-down work laptops often block.
- **Simple online viewers:** load the whole file into memory and freeze around 1–2 million rows.
- **The one fast local web tool (HugeCSV):** strong engineering, but written for developers, missing Excel export and analysis, and has no organic traffic.
- **Excel Power Query:** can technically load big files, but it's buried, confusing, and doesn't let you browse the data like a sheet.

**Why now**

- Browsers can now do this well: WebAssembly with SIMD, Web Workers, the File API for reading slices of a file, OPFS (private on-disk storage) and the File System Access API (write straight to disk).
- Static hosting is free, so a tool that runs on the user's machine costs nothing to serve at any scale.
- AI coding makes the build fast. It also makes copies cheap, so speed to market and marketing matter more than the technology itself.

## Research and market evidence

Generic "CSV viewer" search demand is real and stable (roughly 20,000–60,000 searches a month worldwide). Searches specifically about large files are small (roughly 1,000–3,000 a month) and falling. Large-file users are few but valuable, and the best local tool in the space gets almost no traffic because nobody markets it.

### Google Keyword Planner (global, October 2026)

Keyword Planner groups close variants and shows them the same number, so rows with identical bids are one search, not separate ones. Do not add them up.

| Keyword | Monthly searches | 3-month / YoY change | Top-of-page bid (INR) |
| --- | --- | --- | --- |
| csv viewer | 10k–100k | 0% / 0% | ₹1.52–₹167.64 |
| online csv viewer | 10k–100k | 0% / 0% | ₹5.61–₹285.69 |
| csv view online | 10k–100k | 0% / 0% | ₹5.61–₹285.69 |
| online csv opener | 10k–100k | 0% / 0% | ₹5.61–₹285.69 |
| csv file viewer | 1k–10k | 0% / 0% | ₹1.58–₹119.63 |
| csv file reader | 1k–10k | 0% / 0% | ₹1.67–₹247.68 |
| csv file opener online | 1k–10k | 0% / 0% | ₹3.57–₹189.25 |
| online csv file open | 1k–10k | 0% / 0% | ₹3.57–₹189.25 |
| large csv viewer | 100–1k | −99% / −90% | ₹174.39–₹2,116.33 |
| open large csv file | 100–1k | −90% / −90% | — |
| open huge csv file | 100–1k | −90% / −90% | — |
| csv opener | 100–1k | +900% / +900% | ₹7.70–₹437.38 |
| csv visualizer online | 100–1k | +900% / 0% | ₹130.07–₹394.01 |
| csv viewer free, free csv file viewer, best csv viewer, csv viewer windows, csv viewer and editor, csv file viewer online | 100–1k each | 0% / 0% | various |
| csv too big for excel, open csv with more than 1 million rows, open large csv file mac, open large csv in excel, open big csv file online, software to open large csv files (and similar) | 10–100 each | mostly 0% | — |

**What the data means**

- **The generic head terms are the traffic channel.** The large-file terms alone could bring at most a few hundred visitors a month even at #1.
- **"large csv viewer" has the highest bid on the list** (up to ₹2,116). Advertisers such as Gigasheet and Row Zero pay that because large-file users convert to paid plans. Small audience, high value.
- **The −90% drop on the main large-file terms** most likely means AI assistants now answer "how do I open a huge CSV" directly. Our content must be written so AI assistants cite and recommend the tool, not only for Google.

### Traffic of existing sites

- **csv-viewer-online.github.io** says on its own page that it gets about 50,000 visitors a month, ranks #2 on Google for "CSV Viewer", and sells an ad slot for $19 a month. Demand is real; ad value per visitor is low.
- **HugeCSV (hugecsv.com):** 0 organic traffic and $0 traffic value in Ahrefs (October 2026), despite the best engineering in the space. It has never been marketed on Reddit or Hacker News. Lesson: distribution, not technology, is the gap.
- **largecsvviewer.com:** no significant traffic observed.

### Reddit evidence of pain

People repeatedly ask how to open multi-GB CSVs. The answers point to SQLite, Python, Power Query and file splitters. No single tool is the accepted answer.

| Thread | Size of file | Engagement |
| --- | --- | --- |
| [r/SQL: How to open a 20GB CSV file?](https://www.reddit.com/r/SQL/comments/1ej6rex/how_to_open_a_20gb_csv_file/) | 20 GB, \~100M rows | 140+ comments |
| [r/excel: Excel file far too large to even open](https://www.reddit.com/r/excel/comments/1sx6dqy/excel_file_far_too_large_to_even_open/) | — | 50+ comments, about 6 months old |
| [r/excel: Large csv file (1.06GB) with 10 million rows](https://www.reddit.com/r/excel/comments/lbta5a/large_csv_file_106gb_with_10_million_rows_of_data/) | 1.06 GB, 10M rows | 50+ comments |
| [r/excel: How to open large CSV file (2GB)](https://www.reddit.com/r/excel/comments/17s4t5a/how_to_open_large_csv_file_2gb/) | 2 GB | 50+ upvotes |
| [r/excel: How to open a 20GB large CSV file in Excel?](https://www.reddit.com/r/excel/comments/1ehf8v0/how_to_open_a_20gb_large_csv_file_in_excel/) | 20 GB | 20+ comments |
| [r/data: How do I open a 2.7 million row, 8.8gb CSV file?](https://www.reddit.com/r/data/comments/p27jyl/how_do_i_open_a_27_million_row_88gb_csv_file/) | 8.8 GB | 20+ comments |
| [r/excel: Accessing a large CSV too large for Excel](https://www.reddit.com/r/excel/comments/n6vbto/accessing_a_large_csv_file_thats_too_large_for/) | — | 10+ comments |
| [r/learnpython: Read a huge CSV file](https://www.reddit.com/r/learnpython/comments/17mjyl1/read_a_huge_csv_file/) | 750 MB | 10+ comments |

Notice what the 1.06 GB poster wanted: to edit the data with a formula, "which is why I need excel." Many of these users want the data back in Excel, not a new tool. That is why export to Excel is central to the product.

### Other signals from builders

- A builder of a DuckDB-based CSV toolkit (howtocsv / iLoveCSV) reports that client-side processing hits real limits around 500 MB–1 GB with their approach. Our streaming design avoids this.
- An indie builder bought csvtools.com at auction for $380 and built about 100 free CSV tools. The keyword space is contested by many small sites.
- One open-source local CSV viewer (csv-viewer-local) states it was written by Claude Code in an automated pipeline. Copies are cheap; execution and marketing are the moat.

### Conclusion of research

Build it, but not as "another large CSV viewer." Build a fast, private, plain-language CSV tool that ranks for generic terms, proves itself on huge files, and adds local analysis plus an Excel bridge that no competitor offers together.

## Target audience

The core user is a non-programmer who received a CSV file bigger than Excel can handle, often containing data they are not allowed to upload. Developers are not the core user; they are the distribution channel.

The product and its messaging are generic: for anyone who needs to open a CSV file. The segments below only decide which content pages and communities come first, not who the product is for.

| Priority | Segment | Typical files | What they need |
| --- | --- | --- | --- |
| 1 (primary) | Business analysts and operations (marketing ops, sales ops, supply chain, HR ops) | CRM, ERP, ad-platform and database exports, 1–20 GB | Look at the data, find rows, filter, get a subset into Excel |
| 1 (primary) | Finance, accounting and audit | General ledger dumps, transaction logs, bank and payment exports (Stripe, PayPal, payment gateways) | Same as above, plus strict privacy: often barred from uploading data |
| 2 (secondary) | SEO and digital marketers | Site crawls (Screaming Frog, Sitebulb), Ahrefs/Semrush exports, Search Console data | Filter, group, summarize millions of rows; used to paying for tools |
| 2 (secondary) | E-commerce sellers and marketplace operators | Product catalogs, Amazon and Shopify reports, inventory feeds, order histories | Open, search, fix, split for re-import |
| 3 | Researchers and students | Government open data, census, Kaggle, survey and scientific data (e.g. bioinformatics) | Explore and profile; rarely pay |
| 3 | Journalists and investigators | Leaked datasets, FOIA releases, court and campaign-finance records | Search across huge files privately; very vocal when a tool helps |
| 3 | IT, security and support | Log exports, SIEM dumps, user lists from admin consoles | Quick look and search without writing a query |
| Distribution | Developers and data engineers | Anything | Have workarounds (DuckDB, pandas, VisiData), but share good tools on Hacker News, GitHub and social media |

**What the core users have in common**

- The file was handed to them by a system or a colleague; they didn't choose the format or size.
- Excel is their main tool, and they just hit its limit or watched it freeze.
- They want to look, search, filter, and get a smaller piece back into Excel. They rarely want to analyze 50 million rows.
- Many work with confidential data (client data, personal data, financial records) and can't use cloud tools.
- Many use company laptops where installing software is blocked.

**Two personas to design for**

- **Priya, finance analyst:** receives a 6 GB transaction export each month. Needs all rows for one vendor and one quarter, in Excel, by end of day. Not allowed to upload client data. Never wrote SQL.
- **Marcus, SEO consultant:** has a 3 GB crawl export with 12 million URLs. Wants counts of status codes per site section and a list of all 404s to send a client. Pays for several SEO tools already.

**Primary message:** Open CSV files too big for Excel. Free, no signup. Export just the rows you need back to Excel.

## What people struggle with (one page per problem)

Each error message or pain point below gets its own landing page with the MegaCSV drop zone built into the page, so the visitor can solve the problem without leaving it. Error wording below is from memory and research; **verify the exact wording in the real application before publishing each page**, because people search the exact message.

| # | Error or struggle | Where it appears | Page URL (proposed) | How MegaCSV solves it |
| --- | --- | --- | --- | --- |
| 1 | "This data set is too large for the Excel grid. If you save this workbook, you'll lose data that wasn't loaded." | Excel | /excel-data-set-too-large-for-grid | Open the full file; filter; export Excel-sized parts |
| 2 | "File not loaded completely" | Excel (older versions) | /excel-file-not-loaded-completely | Same as above |
| 3 | Excel shows "Not Responding" or freezes when opening a big CSV | Excel | /excel-not-responding-large-csv | Opens instantly; first rows in under 100 ms |
| 4 | "Excel cannot complete this task with available resources" | Excel | /excel-not-enough-resources-csv | Uses \~200–500 MB of memory regardless of file size |
| 5 | Rows beyond 1,048,576 silently missing | Excel | /csv-more-than-1-million-rows | Shows the true row count; nothing dropped |
| 6 | File too large to import / 20 million cell limit (Google raised it from 10 million; check the current error wording) | Google Sheets | /google-sheets-csv-too-large | Open locally; export a subset that fits Sheets |
| 7 | Numbers can't open more than 1 million rows | Apple Numbers (Mac) | /open-large-csv-mac | Works in any Mac browser; Chrome recommended for huge files |
| 8 | "The data could not be loaded completely because the maximum number of rows per sheet was exceeded." | LibreOffice Calc | /libreoffice-maximum-rows-exceeded | Same as #1 |
| 9 | Notepad or text editor freezes on a multi-GB file | Windows Notepad, TextEdit, other editors | /open-large-csv-without-excel | Table view, not raw text; instant |
| 10 | `MemoryError` when loading a CSV | Python pandas | /pandas-memoryerror-large-csv | Show the chunking fix honestly, plus "just look at it here" |
| 11 | All data shows in one column | Excel with semicolon or tab files | /csv-opens-in-one-column | Delimiter auto-detection (comma, semicolon, tab, pipe) |
| 12 | Strange characters (Ã©, ï»¿, question marks) | Excel and others | /csv-garbled-characters | Encoding detection (UTF-8, UTF-16, Windows-1252) |
| 13 | Leading zeros removed; long numbers turned into scientific notation | Excel | /csv-leading-zeros-excel | Shows raw values; export keeps them as text |
| 14 | Dates changed or reformatted on open | Excel | /excel-changes-csv-dates | Shows raw values; nothing auto-converted |
| 15 | Import limits (checked on official help pages Nov 1, 2026): Salesforce Data Import Wizard 50,000 records, NetSuite 25,000 records or 50 MB per job, HubSpot 1,048,576 rows or 512 MB per file (paid; 20 MB on free tools), Shopify product CSV 15 MB | CRM and SaaS imports | /split-csv-for-salesforce, /split-csv-for-netsuite, /split-csv-for-hubspot | Split into import-sized parts, each with the header |
| 16 | Need to split a big CSV into smaller files | Anywhere | /split-large-csv | Split by row count, size or Excel limit |
| 17 | Can't open .csv.gz or a zipped CSV | Excel and most viewers | /open-csv-gz | Decompress locally, then open |
| 18 | Excel crashes when filtering or sorting a big file | Excel | /filter-large-csv-without-excel | Whole-file filters in seconds |
| 19 | Need a VLOOKUP between two huge files | Excel | /vlookup-large-csv | Join two files locally (later phase) |
| 20 | Need a pivot table on millions of rows | Excel | /pivot-table-large-csv | No-code group-by locally (later phase) |
| 21 | Excel opens a big CSV and shows nothing (all cells empty, no error) | Excel | /excel-opens-csv-blank | Opens every row; shows the true count |
| 22 | "Too large for the Excel grid" on a file of only ~100,000 rows (.xls / compatibility mode, 65,536 rows per sheet) | Excel | /excel-too-large-for-grid-small-file | Explain .xls vs .xlsx; open the file here; export .xlsx |
| 23 | Filter list stops at 10,000 items ("not all items showing") | Excel | /excel-filter-10000-items | Filters check every row; type the value instead of picking it |
| 24 | Long numbers lose their last digits (16-digit card numbers, long order IDs become ...000) | Excel (15-digit precision) | /excel-long-numbers-last-digits-zero | Shows raw values; Excel export writes them as text |
| 25 | "File is too big to be opened by Notepad++" | Notepad++ | /notepad-plus-plus-file-too-big | Table view of any size; find and go to row |
| 26 | `Error tokenizing data. C error: Expected N fields in line X, saw M` | Python pandas | /pandas-expected-fields-saw | Go to row X and see the broken row |

**Page template for every problem page**

1. The exact error message as the title and first line, so searchers know they're in the right place.
2. Why it happens, in two or three sentences (the specific limit, with the number).
3. The MegaCSV drop zone, right there on the page: "Drop your file here to open it now."
4. Other honest fixes (Power Query, splitting, Python), briefly. Being fair builds trust and helps AI assistants cite the page.
5. A short FAQ with 3–5 real questions.
6. Links to related problem pages and to the main tool.

## Existing alternatives and their flaws

No existing tool serves the Excel user with a huge, private file from start to finish. Each one fails on at least one of: privacy, scale, ease of use, access, analysis, getting back to Excel, or being findable.

### Closest competitors

**[HugeCSV](https://hugecsv.com/)** (also called "Fast CSV Viewer") — the most capable local web tool today.

- Strengths: fully local and offline; WebAssembly parser written in C (a module under 4 KB) across web workers; tested with a 21 GB, 100-million-row file; about 309 MB/s parsing on a 100 MB test; sort, substring or regex filter; split into N files; streamed export to JSON, YAML and a SQLite .sql dump; SQL via SQLite-in-WASM up to about 1 GB; a test-file generator; sister site Fast JSON Viewer (40 GB).
- Flaws:
  - Three names for one product (hugecsv.com, "Fast CSV Viewer", "Huge CSV"), which confuses users and search engines.
  - Amateur SEO: relative canonical tag (`./`), a meta-keywords list, a keyword-stuffed title, only about four content pages.
  - Repetitive, keyword-stuffed copy ("your data never leaves your browser" repeated many times).
  - Written for developers: headlines about RFC 4180, C, clang flags and parsing hypotheses. No message for Excel users.
  - Visible "v0.1.367", no screenshots, no demo video, no social proof.
  - Export of filtered rows to CSV or XLSX is not listed; only JSON, YAML, SQL dump and whole-file split.
  - Splitting outside Chromium triggers one download per part.
  - Only comma, semicolon and tab delimiters listed; no pipe, no Windows-1252 or UTF-16 detection, no .gz or .zip.
  - One substring or regex filter at a time; no AND/OR across columns, number ranges or dates.
  - No group-by, pivot, column summaries, deduplication, or joining two files. SQL only up to about 1 GB.
  - Vague limits ("depends on your device's available memory").
  - No mention of caching the index for instant reopen.
  - Parser checks one byte at a time; their own write-up says SIMD is not used in the CSV core.
  - Zero organic traffic in Ahrefs; never launched on Reddit or Hacker News.

**[Large CSV Viewer](https://largecsvviewer.com/)**

- Strengths: no signup; many SEO landing pages; sort, filter, regex search, inline editing, export to CSV, JSON, Excel; split, merge, compare tools.
- Flaws: says "files never stored" but its own FAQ states the file is processed on their server with DuckDB, so it is not truly local. Shows Google AdSense ads. Testimonials are anonymous one-liners ("— Data engineer"). Server costs mean limits are likely later. Not usable for data that can't be uploaded.

### Cloud spreadsheets

| Tool | Strengths | Flaws |
| --- | --- | --- |
| [Gigasheet](https://www.gigasheet.com/) | Up to 1 billion rows; no-code grouping, aggregation, filters, cross-file lookups; data enrichment | Signup required; file is uploaded; exporting large data sets is paid; ruled out for confidential data |
| [Row Zero](https://rowzero.com/) | Free plan opens files up to 5 GB and tens of millions of rows; full spreadsheet features | Signup and cloud upload; free plan limited to one workbook; same privacy problem |
| Google Sheets | Familiar, free | 100 MB import and 10 million cell limits |

### Simple online viewers

| Tool | Flaws |
| --- | --- |
| ConvertCSV Editor & Viewer | Handled 100k rows in a test but became unresponsive past 2 million rows |
| CodeShack CSV viewer, Elysia Tools, freetools-style sites, many Chrome and Firefox extensions | Load the whole file into memory; vague "handles large files" claims; some admit slowing beyond \~100 MB |
| [NanoCell CSV](https://nanocell-csv.com/) | Free, open-source editor and PWA (since 2021, 258 GitHub stars), ranks on mobile. Edits small files well, with cleanup rules, a command list and offline use, but files over 10 MB open read-only as a sample of about 64 rows; no whole-file find, filter or export (reviewed Nov 2, 2026; what to take from it: [next-features.md](next-features.md)) |
| [csv-viewer-online.github.io](https://csv-viewer-online.github.io/) | #2 for "CSV Viewer", \~50k visits/month (self-reported); sorting, search and editing happen in memory, so multi-GB files are out of reach |
| [Convertico CSV File Viewer](https://convertico.com/csv-file-viewer/) | Good approach (slices plus row index, encodings, stats, Excel export) but aimed at hundreds of MB; one tool among many on a general utility site |

### DuckDB-based browser tools

| Tool | Flaws |
| --- | --- |
| [Gridwell](https://github.com/ben-gy/gridwell), [Datakit](https://datakit.page), Sekuel playground | SQL-first, unusable for non-coders; heavy engine download (several MB) |
| howtocsv / iLoveCSV | 50+ tools, but the builder admits client-side limits around 500 MB–1 GB; some operations not local |

### Desktop and editor tools

| Tool | Flaws |
| --- | --- |
| [Tad](https://tadviewer.com/) / Tads | Free and capable (DuckDB inside) but a \~50 MB Electron install; blocked on locked-down laptops |
| [CSView 2](https://apps.apple.com/us/app/csview-2/id1540184805) | Mac only, paid ($1.99), read-only |
| [Alyetama/csvViewer](https://github.com/Alyetama/csvViewer) | Mac only, unsigned (macOS blocks it on first launch) |
| Modern CSV, EmEditor | Paid installs (from general knowledge; verify current pricing before comparison pages) |
| VisiData | Terminal-based; developers only |
| [Gigagrid CSV Pro](https://marketplace.visualstudio.com/items?itemName=PutraAdiJaya.gigagrid-csv), [Quick CSV Viewer](https://marketplace.visualstudio.com/items?itemName=jsh9.quick-csv-viewer) | Only for people already in VS Code |
| Excel Power Query | Hidden in menus; data loads into a model you can't browse like a sheet |
| Python, SQLite, command line | Requires coding |

### Open-source building blocks (not products)

- [large-csv-reader](https://github.com/spnfury/large-csv-reader): JS library; 4 MB slices, sparse index every 1,000th row, search, slice, split. Index not saved between sessions.
- [Lov](https://github.com/Bishops-exe/lov): Rust/WASM viewer for large JSON, YAML, TOML, CSV, in a tree view.
- [wasm-csv-parser](https://github.com/TheMagiche/wasm-csv-parser): Papa Parse-compatible parser with a Rust/WASM scanner.
- [csv-viewer-local](https://github.com/turhe123/csv-viewer-local): open source, local, written by Claude Code from a spec.

### The gaps nobody fills together

1. **Privacy:** cloud tools upload your data.
2. **Scale:** simple viewers crash.
3. **Ease of use:** fast tools speak SQL, regex or WASM.
4. **Access:** desktop tools need installs IT may block.
5. **Analysis:** no local tool offers no-code group-by and summaries.
6. **Back to Excel:** almost nobody makes "filtered rows → Excel-ready file" one click.
7. **Findability:** the best local tools have no marketing.

## Our edge and positioning

We win by combining what competitors offer separately: local privacy, huge-file speed, plain-language analysis, and a one-click path back to Excel, then marketing it properly. The technology alone is not a moat; it can be copied.

**Our edges, strongest first**

1. **Excel bridge.** Filter or summarize, then export CSV or XLSX automatically split at Excel's 1,048,576-row limit. No competitor makes this the main job.
2. **Local no-code analysis.** Group-by, column summaries, multi-condition filters, deduplicate, join two files. Gigasheet charges for this and requires an upload; nobody does it locally.
3. **Nothing to set up.** No signup, no install, no waiting for an upload; works offline once loaded. Beats Large CSV Viewer and the cloud tools on time to first row.
4. **Speed at scale.** SIMD indexing in Rust/WASM, aiming for 3–5× HugeCSV's scan speed and limited by disk speed on most machines.
5. **Instant reopen.** Cached index, so reopening the same 20 GB file is ready in about a second. No competitor mentions this.
6. **Real-world files.** Pipe delimiters, Windows-1252 and UTF-16, .gz and .zip, junk lines above the header.
7. **Plain language and trust.** One name, no jargon, honest limits ("your computer can handle about X"), a demo video, real screenshots.
8. **Distribution.** Problem pages for every error message, honest comparison pages, and active launches on Reddit and Hacker News.
9. **Near-zero cost.** About $11 a year to run at any scale, so the free tier can stay generous forever.

**What we don't compete on**

- Editing cells in huge files (CSV rows vary in length, so every edit rewrites the file). Maybe later in the desktop app.
- Collaboration, sharing and cloud storage (Gigasheet and Row Zero territory; not our focus).
- Full spreadsheet formulas.
- Mobile.

**Messaging pillars**

- "Too big for Excel? Open it here."
- "Free. No signup. Open it in seconds."

**Messaging rule (owner decision, Nov 1, 2026, revised the same day):** privacy claims are allowed. Lead with speed, size, simplicity and the path back to Excel; privacy supports them. Use the line **"your file is never uploaded"**, which is always true. Don't use broader lines such as "nothing leaves your computer", "fully private" or "no tracking" while production builds run Microsoft Clarity without masking: recordings can include what's on screen (file and column names, typed find and filter text). See docs/decision.md. Don't advertise what analytics collect, except where the law requires it (the privacy policy page).

**Blog rule (owner decision, Nov 1, 2026):** every blog post presents MegaCSV as the solution to the problem it discusses. Name the problem in the reader's words, then show how MegaCSV solves it, with a link to the tool (or the tool on the page). Other fixes (Power Query, Python, splitting) may follow briefly, after MegaCSV, never instead of it. A topic MegaCSV can't solve isn't a blog post.
- "Get just the rows you need back into Excel."
- "Summaries and filters without formulas or code."
- "Free. No signup. No install."

Never mention WebAssembly, SIMD, RFC 4180 or any implementation detail anywhere public. Talk only about results: file size, speed, privacy, what the user can do.

**Open source (owner decision, Nov 19, 2026; replaces the earlier closed-source decision)**

- The code is public on GitHub. The edge is shipping fast and building the brand, not hiding the code.
- Marketing copy still talks about results, not methods (the rule above).
- Production builds: minified JavaScript, no source maps published, WASM stripped of names and debug info (`wasm-opt` with `--strip-debug` and `--strip-producers`).
- Honest limit: anything that runs in a browser can be downloaded and inspected by a determined person. Minified JS and compiled WASM make copying slow and costly, not impossible. The real protection is shipping faster and building the brand.

## What we offer

The full product covers six jobs: open, view, find, analyze, export and trust. The Phase column says when each feature ships (see the roadmap below).

| Area | Feature | What the user gets | Phase |
| --- | --- | --- | --- |
| Open | Drag and drop or file picker | Any size CSV/TSV; first rows on screen in under 100 ms | 1 |
| Open | Auto-detect delimiter | Comma, semicolon, tab, pipe; manual override | 1 (pipe in 4) |
| Open | Header detection | First row as header, with a toggle; "header is on row N" option | 1 / 4 |
| Open | Recent files and instant reopen | Cached index; reopen a 20 GB file in about a second (Chrome and Edge) | 1 |
| Open | Approximate navigation during indexing | Jump anywhere while the file is still being indexed, labelled "≈ row X" | 1 |
| View | Smooth virtual grid | 60 fps scrolling at any file size; sticky header; row numbers | 1 |
| View | Column tools | Resize, auto-fit, hide, reorder, pin | 1 / 5 |
| View | Go to row | Jump straight to any row number | 1 |
| View | Copy | Select cells or rows and copy to clipboard as tab-separated text (pastes into Excel) | 1 |
| View | Cell inspector | Show a long cell's full content | 1 |
| Find | Whole-file search | Streaming results, progress bar, cancel, jump to next or previous match | 2 |
| Find | Simple filters | Per column: contains, equals, starts with, is empty, number range | 2 |
| Find | Filter builder | AND/OR across columns; date ranges; regex for advanced users | 3 |
| Analyze | Column profile | Type, empty count, min/max, approximate unique count, top values | 3 |
| Analyze | Group-by (no-code pivot) | Count, sum, average, min, max by one or more columns | 3 |
| Analyze | Sort | Sort result sets up to about 10–30M rows; full-file sort later | 3 / 5 |
| Analyze | Deduplicate | Find and remove duplicate rows, whole row or by key columns | 3 |
| Analyze | Join two files | VLOOKUP-style lookup between two big files | 5 |
| Analyze | Compare two files | Rows added, removed, changed | 5 |
| Analyze | SQL (optional, advanced) | DuckDB-WASM loaded only when used | 5 |
| Export | Filtered CSV | Byte-exact rows streamed to disk | 2 |
| Export | Excel (XLSX) | Auto-split at 1,048,576 rows into sheets or files | 2 |
| Export | Split file | By number of parts, rows per part, size, or presets (Excel, Salesforce 50k, NetSuite 25k, HubSpot) | 2 |
| Export | Group-by results | Export summary tables to CSV or XLSX | 3 |
| Export | Other formats | JSON, JSONL, Parquet | 4 / 5 |
| Formats | Encodings | UTF-8, UTF-8 with BOM, UTF-16, Windows-1252 | 1 / 4 |
| Formats | Compressed input | .csv.gz and .zip | 4 |
| Formats | Other inputs | JSONL, Parquet (via DuckDB) | 5 |
| Trust | Offline mode | Works with no network once loaded | 1 |
| Trust | Device capability check | "Your computer can handle files up to about X GB comfortably" | 2 |
| Trust | Analytics | Google Analytics and Microsoft Clarity (relaxed mode, no masking), production builds only (owner decision 2026-11-01) | 1 |
| Convenience | Installable app (PWA) | Install from the browser; appears in the OS "Open with" menu (Chrome/Edge desktop) | 1 |
| Convenience | Saved views per file | Remembers filters, hidden columns and widths for a file | 5 |
| Pro | Desktop app (Tauri) | 100 GB+, full-file sort, all CPU cores, file associations | 6 |

## Roadmap: phases and sprints

The MVP (Phases 0–2) takes about 7 one-week sprints and ends with a public launch. Later phases are ordered by user value, and each phase only starts once the previous one meets its exit criteria. Sprint lengths assume Claude Code writes the code and you review, test and direct.

### Phase 0 — Foundations (Sprint 0, 1 week)

Goal: a repository where every later change can be tested and measured.

- Monorepo with `/engine` (Rust), `/app` (TypeScript), `/site` (Astro); pnpm workspaces.
- `CLAUDE.md` with the engineering rules from this document.
- Test-file generator: 1 GB, 5 GB and 20 GB files, plus small "nasty" files (quotes, embedded newlines, CRLF, BOM, empty fields, very long cells, very wide rows, non-ASCII text, malformed quotes).
- Benchmark harness: indexing throughput (MB/s), time to first rows, search time; results saved per commit.
- Rust crate skeleton with proptest comparing row and field counts against the `csv` crate.
- CI on GitHub Actions: Rust tests, TypeScript tests, build, deploy preview to Cloudflare.
- Domain bought, DNS on Cloudflare, placeholder page live.

Exit: generator and benchmark run; CI is green; placeholder deployed.

### Phase 1 — Core viewer (Sprints 1–3)

**Sprint 1 — Correct indexing engine**

- Scalar (byte-by-byte) indexer in Rust first, for correctness.
- Chunking across workers; quote-state stitching between chunks.
- Sparse checkpoints (one every 1,024 rows); row count; max width per column.
- Delimiter detection (comma, semicolon, tab); UTF-8 and BOM handling.
- Exit: row and field counts match the `csv` crate on all fuzz and nasty files.

**Sprint 2 — Canvas grid**

- Canvas grid with high-DPI support, sticky header, row numbers.
- Virtual scrollbar mapping position to row number (no browser height cap).
- Viewport loading: find checkpoint, read about 1 MB, parse visible rows with `csv-core`; LRU cache; prefetch in scroll direction.
- Column resize and auto-fit; cell selection and copy; keyboard navigation; go to row; cell inspector.
- Exit: 60 fps scroll on a 20 GB file; first rows in under 100 ms; jump to any indexed row in under 50 ms.

**Sprint 3 — Speed and reopen**

- SIMD structural scanner (see Technical architecture); keep the scalar path as reference and fallback.
- Index cache in OPFS; recent files via file handles in IndexedDB (Chromium).
- Approximate navigation during indexing.
- PWA: offline service worker; manifest with file handler.
- Exit: at least 2× HugeCSV's throughput on the same machine and file; reopen a cached 20 GB file in about 1 second; fully offline after first load.

### Phase 2 — MVP complete and launch (Sprints 4–6)

**Sprint 4 — Find**

- Whole-file search: streaming results, progress, cancel, next and previous match.
- Simple per-column filters: contains, equals, starts with, is empty, number range.
- Filtered view in the grid with its own row count.
- Exit: search on a 5 GB file returns first matches in under 1 second and completes in under 5 seconds on an NVMe laptop.

**Sprint 5 — Export (the Excel bridge)**

- Filtered CSV export, byte-exact, streamed to disk.
- XLSX export, auto-split at 1,048,576 rows into sheets or files.
- Split file: by parts, rows, size, and presets (Excel, Salesforce 50k, NetSuite 25k, HubSpot).
- Chrome/Edge: write directly to disk. Firefox/Safari: write to OPFS, then download one file.
- Device capability check message.
- Exit: export 5 million filtered rows from a 20 GB file without memory growth; XLSX opens cleanly in Excel.

**Sprint 6 — Site and launch**

- Landing page with demo video and plain-language copy.
- First 10 problem pages (error messages #1–8, #11, #16 from the struggles table).
- First 3 comparison pages: vs Excel, vs Gigasheet, vs HugeCSV.
- "Speed" page: benchmark results, with no implementation details.
- Cookie-free analytics; the in-app Feedback button (see Feedback and issue tracking).
- AI discovery basics: `robots.txt` open to AI crawlers, `/llms.txt`, Markdown page copies, the `/facts` page and structured data (see AI discovery).
- Launch: Show HN, r/excel, r/dataengineering, relevant answers on old Reddit threads.

**MVP exit criteria (what "done" means)**

- [ ] Opens and scrolls a 20 GB CSV smoothly in Chrome on an 8 GB RAM laptop
- [ ] Correct on all nasty test files (row counts and fields match the reference)
- [ ] Search, simple filters, filtered CSV and XLSX export, split
- [ ] Works offline; no request ever contains user data (checked by an automated test)
- [ ] Landing page, 10 problem pages, 3 comparison pages live
- [ ] Launched on Hacker News and Reddit

### Phase 3 — Local analysis (Sprints 7–9)

- Sprint 7: column profile (type, empties, min/max, approximate unique count, top values).
- Sprint 8: group-by with count, sum, average, min, max; results table; export results.
- Sprint 9: filter builder (AND/OR, dates, regex); deduplicate; sort result sets up to about 10–30M rows.
- Exit: a group-by over a 5 GB file finishes in under 10 seconds on an NVMe laptop; profile runs in a single pass.

### Phase 4 — Real-world files (Sprints 10–11)

- Sprint 10: pipe and custom delimiters; UTF-16; Windows-1252 fallback; "header on row N"; skip junk lines.
- Sprint 11: .csv.gz via `DecompressionStream`; .zip via `fflate`; decompressed to OPFS first, with a disk-space warning; JSON/JSONL export.
- Exit: opens a messy real-world export pack (collected from users) without manual fixes.

### Phase 5 — Power features (Sprints 12–14)

- Join two files (VLOOKUP-style) and compare two files.
- Optional SQL via DuckDB-WASM, loaded only on demand from a CDN (it exceeds Cloudflare's 25 MiB per-file limit).
- Full-file sort via an external merge sort in OPFS.
- Saved views per file; column hide, reorder, pin.
- Parquet and JSONL input via DuckDB.

### Phase 6 — Pro and desktop (Sprint 15 onward)

- Tauri desktop app reusing the Rust engine and the web UI: memory-mapped files, all CPU cores, 100 GB+, full-file sort, OS file associations.
- Code signing: Apple Developer Program ($99/year) and a Windows code-signing certificate.
- Pricing, license keys and auto-updates.
- Decide which web features, if any, become Pro.

### Ongoing from Sprint 6

- Monthly AI-visibility check: ask the main assistants the fixed question set and record whether MegaCSV is mentioned.
- 2–3 new SEO pages per week (problem, comparison, file-type pages).
- Answer relevant Reddit and forum questions weekly.
- Fix issues reported by users first; collect real messy files (with permission) for tests.

## Technical architecture and decisions

The file is never loaded into memory. A Rust/WASM engine running in Web Workers scans it once in parallel to build a tiny row index, then reads only the slices it needs for the screen, a search, a summary or an export. The browser's memory use stays around 200–500 MB regardless of file size.

### Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Site, SEO pages, blog | Astro (static output), MDX content collections, `@astrojs/sitemap` | Zero JavaScript on content pages; fast; easy for Claude Code |
| App shell and panels | React 19 as an Astro island (`client:only="react"`) | Most reliable for AI-written code; biggest ecosystem; panels update rarely, so speed is not a concern |
| Styling and components | Tailwind CSS v4, shadcn/ui (Radix), Phosphor icons (`@phosphor-icons/react`, Regular weight) | Accessible dialogs, menus and popovers; Phosphor's rounded, calm line matches the whale and avoids the default shadcn look |
| App state | Zustand | Engine can read and update it without React |
| Worker messaging | Comlink, with `Comlink.transfer` for buffers | Call worker functions as async functions; no copying of large buffers |
| Data grid | Hand-built Canvas 2D grid in plain TypeScript | Full control of scrolling, the custom scrollbar and paint performance |
| Engine | Rust → WebAssembly, `wasm-bindgen`, `wasm-opt` (Binaryen) | Speed, predictable performance, SIMD; reusable later in the Tauri desktop app |
| Rust crates | `csv-core` (row parsing), `memchr` (byte and substring search), `hashbrown` (group-by), `xxhash-rust` (row hashes), `fast-float` (number parsing) | Proven, no-std-friendly, fast |
| Compression | Browser `DecompressionStream` for gzip; `fflate` for zip and for writing XLSX | Native where possible; tiny library otherwise |
| Optional SQL (Phase 5) | DuckDB-WASM, loaded on demand from jsDelivr | Too big to bundle (over Cloudflare's 25 MiB per-file limit) |
| Hosting | Cloudflare Workers static assets; Cloudflare Registrar; Google Analytics and Microsoft Clarity; Email Routing | Static asset requests are free and unlimited; about $11/year total |
| Tooling | pnpm, TypeScript strict mode, Biome (lint and format), Clippy and rustfmt, GitHub Actions, Wrangler | One fast toolchain; strict types catch AI mistakes |
| Testing | cargo test, proptest, cargo-fuzz, Vitest, Playwright (Chromium, Firefox, WebKit), benchmark harness | Correctness and speed guarded on every change |

### Repository layout

- `/engine` — Rust crate: structural scanner, indexer, row parser, search, filters, profile, group-by, sort, export writers. Compiled to WASM.
- `/app` — TypeScript: canvas grid, worker pool, engine bindings, Zustand store, React panels.
- `/site` — Astro: landing page, problem pages, comparison pages, file-type pages, blog, and the app page that mounts `/app`.
- `/tools` — test-file generator and benchmark scripts.
- `/docs` — this reference exported as Markdown; `CLAUDE.md` at the repository root.

### Data flow when a user opens a file

1. User drops a file. The main thread keeps the `File` object; nothing is read yet.
2. Read the first 1 MB: detect encoding, delimiter and header; parse and paint the first rows (target under 100 ms).
3. Check the index cache in OPFS. If found and the file matches, load it; the file is fully ready (about 1 second for 20 GB).
4. Otherwise split the file into 8 MB chunks and hand them to the worker pool. Each worker reads its own slices with `file.slice(start, end).arrayBuffer()` and scans them in WASM.
5. Workers return small per-chunk results. The main thread stitches them in order into the global index and updates the grid and progress bar as indexing advances.
6. The grid asks the engine for the rows on screen. The engine finds the nearest checkpoint, reads about 1 MB, parses the rows and returns them.
7. When indexing finishes, save the index to OPFS for instant reopen.

### Structural scanner (the speed core)

This follows the simdjson and simdcsv approach. HugeCSV checks one byte at a time; we classify 64 bytes per step.

1. Load 64 bytes as four 16-byte WASM SIMD vectors.
2. Compare each against the quote character, the delimiter and the newline byte with `i8x16.eq`, then `i8x16.bitmask`. Combine into three 64-bit masks: Q (quotes), D (delimiters), N (newlines).
3. Compute which bytes are inside quotes with a prefix XOR of Q, using shifts: x ^= x << 1, then << 2, << 4, << 8, << 16, << 32. XOR the result with the carried-in state (all ones if the previous block ended inside quotes). WASM has no carry-less multiply, so the shift sequence replaces it.
4. Doubled quotes inside a quoted field toggle out and back in, so the parity model stays correct for RFC 4180.
5. Row ends = N AND NOT inside. Count them with popcount. Only visit individual bits (trailing-zero loop) when a checkpoint is due.
6. Carriage returns are ignored structurally (CRLF ends a row at the newline) and stripped when fields are parsed. Files with bare carriage-return line endings are detected from the sample and handled by a separate mode.

**Parallel chunks without guessing.** A chunk can start inside a quoted field. The "inside quotes" mask for the other starting state is simply the inverted mask, so one pass records results for both starting states at almost no extra cost: row ends N AND NOT inside, and N AND inside. Each chunk also reports the parity of its quote count. After the pass, every chunk's real starting state is known exactly from the running parity of all earlier chunks, and the stitcher keeps the matching result. No re-scan is needed.

**Malformed quotes.** Real files sometimes contain stray quotes that break the parity model. Detect the symptoms (a giant field, far fewer rows than the sample predicts) and offer a "treat quotes as normal text" mode that re-indexes on newlines only.

**Chunk results.** Row count for each starting state, quote parity, and local checkpoints: (byte offset, local row number) for every 1,024th row end. Global row numbers come from a prefix sum of chunk row counts. Checkpoints don't need to fall on exact global multiples; binary search works with uneven spacing.

**Worker pool.** max(1, min(hardwareConcurrency − 1, 8)) workers. Each owns one WASM instance and reuses a fixed input buffer in WASM memory (copy each slice in with `Uint8Array.set`). No SharedArrayBuffer or WASM threads, so no COOP/COEP headers are needed. Revisit only if profiling shows coordination overhead matters.

**Fallback.** Feature-detect WASM SIMD (Chrome 91+, Firefox 89+, Safari 16.4+) and ship a scalar build for older browsers. The scalar indexer is also the reference implementation in tests.

### Index format and cache

- Two typed arrays: byte offsets and row numbers (`Float64Array`), one entry per \~1,024 rows. 100 million rows ≈ 1.6 MB; 1 billion rows ≈ 16 MB.
- Metadata: engine version, file name, size, lastModified, xxh3 hash of the first and last 64 KB, delimiter, encoding, header row, row count, column count, sampled column widths.
- One binary file per index in OPFS, valid only when all metadata matches. Evict least-recently-used indexes beyond 500 MB total. Call `navigator.storage.persist()` so the browser keeps them.
- Recent files (Chrome and Edge): store the `FileSystemFileHandle` in IndexedDB; on reopen, request permission and use the cached index.
- Column widths come from a sample (first 10,000 rows plus rows near checkpoints) and are refined as the user scrolls, so the index pass stays minimal.

### Viewport and rendering

- Viewport request: binary-search the checkpoint at or before the target row; read about 1 MB forward; parse with `csv-core` in WASM; return field boundaries into a byte buffer. Decode only visible cells in JavaScript with `TextDecoder`, using the detected encoding.
- LRU cache of parsed blocks keyed by checkpoint; prefetch one block in the scroll direction.
- Canvas 2D at `devicePixelRatio`; fixed row height (about 28 px); column x positions as a prefix sum; draw only visible rows and columns; sticky header and row-number gutter.
- Paint only when something changes, inside `requestAnimationFrame`. Cache text measurements; truncate with an ellipsis; never draw more than about 1,000 characters of one cell.
- **Virtual scrollbar:** a custom scrollbar maps thumb position to a row number, avoiding the browser's element height cap (about 33 million pixels in Chrome, less in Firefox). Wheel and trackpad movement is converted to row movement.
- During indexing, positions beyond the indexed part use an approximate jump: seek to a byte position, find the next row start, label it "≈ row X".
- Accessibility: keyboard navigation, visible focus, and a hidden DOM mirror of the visible cells for screen readers.
- Only if profiling demands it later: move painting to an `OffscreenCanvas` in a worker.

### Search and filters

- Plain search: `memchr::memmem::Finder` (SIMD) across chunks in parallel. ASCII case-insensitive search uses a rare-byte prefilter on both cases plus verification; full Unicode case-insensitive search uses a slower path.
- Each match is mapped to its row start using the same structural masks; chunk starting states are already known from the index.
- Column filters parse each candidate row's fields and evaluate a compiled rule tree in Rust: conditions (contains, equals, starts with, empty, number range, date range, regex) joined by AND/OR. Numbers parsed with `fast-float`; dates tried in a small set of formats, ISO first.
- Results are a `Float64Array` of row start offsets (8 bytes per match). Above about 50 million matches, spill to OPFS. The grid shows a result set through the same viewport interface as the full file.
- Results stream to the UI with progress and cancel.

### Analysis

- **Column profile (one pass, constant memory):** count, empty count, type votes (integer, decimal, date, boolean, text), numeric and text min/max, max length, approximate unique count with HyperLogLog (precision 14, about 16 KB per column), top 20 values with the Space-Saving algorithm. Up to about 200 columns at a time.
- **Group-by:** each worker builds a `hashbrown` map from key bytes to aggregates (count; sum with Kahan summation; min; max; average = sum ÷ count). Maps are merged at the end. Default cap of 5 million groups, with a clear warning.
- **Sort (Phase 3):** for result sets up to about 10–30 million rows, extract the key column into a typed array, radix-sort numbers (bit-flip trick for doubles), use pattern-defeating quicksort for text, then reorder the list of row offsets. Stable.
- **Full-file sort (Phase 5):** external merge sort. Sort runs that fit in memory, write them to OPFS, then k-way merge.
- **Deduplicate:** 128-bit xxh3 hash per row (or per key columns) in a hash set. For very large files, partition hashes into OPFS buckets by prefix and dedupe each bucket.
- **Join (Phase 5):** hash map from the smaller file's key to row offset; stream the larger file and write joined rows.

### Export

- **CSV:** copy matching rows' original bytes plus the header (byte-exact, original quoting kept). Write in 8 MB buffered batches.
- **XLSX:** stream sheet XML with inline strings, zipped with `fflate`'s streaming deflate. Split at 1,048,575 data rows plus the header per sheet or file. Write a value as a number only when safe (no leading zeros, at most 15 significant digits); otherwise as text, which keeps IDs and leading zeros intact.
- **Where output goes:** Chrome and Edge stream straight to disk with `showSaveFilePicker` (and `showDirectoryPicker` for splits). Firefox and Safari write to OPFS with a sync access handle inside a worker, then download that one file. Multi-part splits are zipped into a single download, which fixes HugeCSV's one-download-per-part flaw.

### Input formats

- Encoding detection on the first 64 KB: BOM, UTF-16 byte patterns, UTF-8 validity; fallback to Windows-1252. UTF-16 files are transcoded to UTF-8 in OPFS before indexing (Phase 4).
- Delimiter detection: score comma, semicolon, tab and pipe by how consistent the field count is across the first \~100 rows, counting only delimiters outside quotes.
- Compressed files (Phase 4): `.gz` is piped through `DecompressionStream('gzip')` into OPFS; `.zip` uses `fflate`'s streaming unzip. The decompressed file is then indexed like any other. Warn about the disk space needed.

### Offline, install and privacy

- A service worker caches the app shell and WASM with versioned caches; the app works with no network after the first visit.
- Web app manifest with `file_handlers` for .csv and .tsv plus the Launch Queue API, so the installed app appears in the OS "Open with" menu (Chrome and Edge desktop).
- **File contents are processed on the device.** App code makes no network requests except loading its own static files, sending feedback the user submits, and analytics (Google Analytics events, Microsoft Clarity recordings; see docs/tasks.md for the event list).
- Analytics (owner decision 2026-11-01): Google Analytics (G-5R3TTC770R) and Microsoft Clarity (z6gjzdh6wf, relaxed mode, no masking), injected into production builds only by `app/vite.config.ts`. Clarity records page text, including file names and typed find and filter text.
- Content Security Policy: `default-src 'self'`; `script-src 'self' 'wasm-unsafe-eval'` plus the Google Analytics and Clarity scripts; `connect-src 'self'` plus their endpoints. No other third-party scripts in the app.
- An automated Playwright test opens a file with network logging on and fails if any request goes outside the allowlist.

### Browser support

| Browser | Support |
| --- | --- |
| Chrome, Edge (desktop) | Full: direct-to-disk export, recent files, OS file handlers. Recommended for files over 5–10 GB. |
| Firefox (desktop) | Full viewing, search and analysis; export via OPFS then download; no recent files or file handlers |
| Safari 17+ (Mac) | Supported; export via OPFS then download; test very large files carefully |
| Mobile browsers | Not a target; small files only |

### Build settings

- Rust release profile: `opt-level = 3`, `lto = "fat"`, `codegen-units = 1`, `panic = "abort"`.
- `RUSTFLAGS="-C target-feature=+simd128"` for the SIMD build; a second build without it as the fallback.
- `wasm-bindgen --target web`, then `wasm-opt -O3 --enable-simd`.
- Size budgets: WASM under 150 KB gzipped; app JavaScript under 250 KB gzipped (React included); content pages 0 KB JavaScript.

### Testing strategy

- **Property tests (proptest):** random CSVs with quotes, doubled quotes, embedded delimiters and newlines, CRLF, empty fields and Unicode; compare rows and fields with the `csv` crate.
- **Differential tests:** SIMD scanner vs scalar scanner on every test file and at many chunk sizes, including chunk boundaries inside quoted fields.
- **Fuzzing (cargo-fuzz):** the engine must never crash or hang on any input.
- **Vitest:** grid math, scrollbar mapping, store logic, worker protocol.
- **Playwright:** open, scroll, search, filter and export in Chromium, Firefox and WebKit, plus the no-network test.
- **Benchmarks:** indexing MB/s, time to first rows, search, export on the 1/5/20 GB files. CI fails on a regression over 10%.

## Performance targets and known limits

Viewing stays smooth at any file size; anything that must read the whole file (search, filter, group-by, export) takes time in proportion to file size and disk speed. All figures below are targets to confirm with the benchmark harness, measured on a mid-range laptop with an NVMe SSD and 8 GB RAM.

**Targets that don't depend on file size**

| Metric | Target |
| --- | --- |
| First rows on screen | Under 100 ms |
| Scrolling | 60 fps |
| Jump to any indexed row | Under 50 ms |
| Reopen a cached file (any size) | About 1 second |
| Memory use | About 200–500 MB |
| Index size | About 16 bytes per 1,024 rows (1.6 MB for 100M rows) |
| Indexing throughput | At least 2× HugeCSV's \~309 MB/s on the same machine; aim for 1 GB/s or more, disk-limited |

**Full-scan operations (search, filter, profile, group-by, export) by file size, at about 1–2 GB/s**

| File size | Time | How it feels |
| --- | --- | --- |
| Up to 1–2 GB | Under 1–2 seconds | Instant |
| 5 GB | About 3–5 seconds | Fast |
| 20 GB | About 10–20 seconds | Acceptable with streaming results |
| 50 GB | About 25–50 seconds | Works; show progress |
| 100 GB | About 1–2 minutes | Works, not smooth; desktop app recommended |

A SATA SSD is about 2–3× slower; a hard drive or network drive about 10× slower.

**Known limits (state them honestly in the product)**

- Full-file sort: in-browser sort of result sets up to about 10–20M rows on 8 GB RAM, about 30M on 16 GB. Full-file sort on bigger data comes in Phase 5 (disk-based) or the desktop app.
- Group-by: smooth up to a few million groups; tens of millions can run out of memory. Warn and cap.
- Deduplicate on 100M+ unique rows needs the disk-partition approach.
- Compressed input needs free disk space for the decompressed copy.
- Safari is the most limited browser; recommend Chrome or Edge for files over 5–10 GB.
- Files on network drives or cloud-sync placeholders (OneDrive, Google Drive) read slowly; suggest copying locally first.
- Editing cells is not supported (CSV rows vary in length, so any edit rewrites the file).
- Mobile is not supported for large files.
- Claims on the website ("tested with X GB") must only be made after actually testing that size.

**Comparison with competitors**

| Tool | Scale | Speed | Local |
| --- | --- | --- | --- |
| MegaCSV (target) | Any size; tested target 50–100 GB | Disk-limited, ≥2× HugeCSV | Yes |
| HugeCSV | Tested 21 GB, 100M rows | \~309 MB/s on a 100 MB test | Yes |
| Row Zero (free) | Up to 5 GB | Cloud | No |
| Gigasheet | Up to 1 billion rows | Cloud | No |
| Simple web viewers | \~1–2M rows | In-memory | Mostly yes |

## Engineering rules for Claude Code

These rules go into `CLAUDE.md` at the repository root. They protect the three things that make the product work: never loading the whole file, never blocking the main thread, and never sending user data anywhere.

**Architecture**

1. Never read a whole file into memory. Always read slices with `file.slice()`; maximum single read 16 MB.
2. All heavy work runs in Web Workers. The main thread only handles input, state and painting.
3. Never put row data in React state or Zustand. Panels send commands to the engine; the engine tells the grid to repaint.
4. The grid is canvas, never React components or DOM rows.
5. The engine API is the only way to reach the data. The grid, panels and exports all go through it.
6. No network requests from app code, ever, except loading the app's own static files and user-submitted feedback, which never contains file data. No new third-party scripts without an explicit decision (decided so far: Google Analytics and Microsoft Clarity).
7. Keep the scalar indexer as the reference. Every SIMD change must pass differential tests against it.

**Correctness**

8. Any change to parsing, indexing, search or export needs passing property tests and differential tests before merging.
9. Add a test file for every real-world bug (with permission or a synthetic copy) so it never comes back.
10. Exports must be byte-exact for CSV: rows copied from the original, never re-serialized.
11. Never auto-convert values when displaying. Show raw text; conversion only happens on explicit export choices.

**Performance**

12. Run the benchmark harness on engine changes; a regression over 10% blocks the change.
13. Don't allocate per row in hot loops; reuse buffers.
14. Keep the size budgets: WASM under 150 KB gzipped, app JS under 250 KB gzipped, content pages 0 KB JS.
15. Paint only in `requestAnimationFrame` and only when something changed.

**Code style**

16. TypeScript strict mode; no `any` except at well-commented boundaries. Rust with Clippy clean, no `unsafe` outside the SIMD module, and every `unsafe` block commented.
17. Small modules with typed interfaces between engine, worker, store and UI.
18. Write tests and benchmarks first for engine work, then the implementation.
19. User-facing text follows the UX and copy principles below: plain language, no jargon.
20. When unsure about a product decision, check this document; if it isn't covered, ask instead of guessing.

## UX and copy principles

Write and design for Priya the finance analyst, not for a developer: plain words, obvious next steps, honest limits.

- **Plain language.** Say "rows", "columns", "find", "filter", "summary", "export to Excel". Never "RFC 4180", "WASM", "SIMD" or "index" in the main UI.
- **Show progress, never freeze.** Every long operation has a progress bar, a time estimate after a few seconds, and a cancel button. Results appear as they're found.
- **Instant first impression.** The first rows appear immediately after the drop; indexing continues quietly with a small progress indicator.
- **Honest limits.** Before a heavy action on a huge file, say what to expect ("This scans 18 GB; about 15 seconds"). The device check says what the user's computer can handle comfortably.
- **No privacy claims.** See the messaging rule under "Our edge and positioning".
- **Excel is the destination.** Every result view has an obvious "Export to Excel" button. Warn before exceeding Excel's row limit and offer automatic splitting.
- **Show the raw truth.** Display values exactly as in the file; leading zeros and dates stay untouched.
- **Keyboard friendly.** Common shortcuts: Ctrl/Cmd+F to find, Ctrl/Cmd+G to go to row, Ctrl/Cmd+C to copy, arrow keys to move.
- **One name everywhere.** MegaCSV in the title, header, app name and metadata (HugeCSV uses three names; don't).
- **Errors that help.** Every error says what happened and what to do next, in one or two sentences.
- **Calm visual design.** A clean grid that looks like a spreadsheet, light and dark themes, no ads, no pop-ups, no signup prompts.

## Feedback and issue tracking

Ask for feedback with one tap at a few meaningful moments, never while the user is working, and collect everything in one private inbox reviewed weekly. Feedback never contains file names, column names or file contents.

**When to ask**

| Moment | What we ask | What we learn |
| --- | --- | --- |
| After the first successful export | "Did you get what you needed?" Yes / No, plus an optional comment | Whether the core job works |
| After a long operation finishes (over 10 seconds) | "Was that fast enough?" Yes / No | How speed feels on real machines |
| After an error or an unsupported file | "Tell us what happened" with the error code pre-filled, plus optional source system (e.g. "Stripe export") | Bugs and missing file types |
| When the user cancels a long operation | "What were you trying to do?" | Missing features and confusing flows |
| Third visit that opens a file | "What's one thing we should add?" | Suggestions from engaged users |
| Always | One "Feedback" button in the toolbar (something's wrong, an idea, something else) | Everything else |

**Rules for prompts**

- At most one prompt per session; none in the first 30 seconds; never during a running scan or export.
- Prompts are small and dismissable and never block the grid.
- Dismissing means no prompt for 14 days (remembered in browser storage).

**What a submission contains**

- The user's message, a category (bug, complaint, suggestion, file-type request, praise), the yes/no answer and which moment triggered it.
- App version, browser and operating system, a file-size bucket (e.g. "1–5 GB") and an error code if any.
- Optional email address for a reply.
- The user sees exactly what will be sent before sending. Never file names, column names, values or file contents.

**How it's collected (fits the existing stack)**

- A Cloudflare Worker at `/api/feedback` on the same domain, storing submissions in Cloudflare D1. The Workers free plan allows 100,000 requests a day, far more than needed.
- Spam protection with Cloudflare Turnstile and rate limiting.
- New submissions post to a private Discord or Slack channel through a webhook, so nothing is missed.
- Because the endpoint is same-origin, the Content Security Policy needs no new domains. The no-network test allows this one request only after an explicit submit.

**How it's tracked**

- Weekly triage: tag, merge duplicates, set a status (new, planned, in progress, done, won't do).
- Public changelog page; email users who left an address when their issue is fixed.
- Later: a public suggestion board with voting (for example GitHub Discussions).
- Most-requested items feed the roadmap; real problem files (shared with permission) become test cases.

**When it ships:** the toolbar Feedback button is built; each message is stored in the D1 database `megacsv-feedback` (owner's choice, Nov 1, 2026: emailing hi@megacsv.com directly needs paid Email Sending). Read it in the Cloudflare dashboard (D1) or with Wrangler; there is no notification of new messages. The email field is required (owner, Nov 1, 2026) so every message can be answered; screenshots can't be attached, so the form points people to hi@megacsv.com (Email Routing forwards it to the owner's inbox). Moment-based prompts in Sprint 7.

## SEO and content plan

SEO comes after the core product works. The homepage targets the generic "csv viewer" terms; every other page targets one specific problem, comparison or file type and has the tool built into it. Content must also be written so AI assistants cite and recommend MegaCSV, since big-file searches are shifting to AI answers.

### Site structure

| Section | URL pattern | Count at launch | Target count |
| --- | --- | --- | --- |
| Homepage = the tool | / | 1 | 1 |
| Problem / error pages | /excel-data-set-too-large-for-grid etc. | 10 | 20+ |
| Comparison pages ("X vs Y") | /vs/gigasheet, /vs/hugecsv | 3 | 12+ |
| Alternatives pages | /alternatives/gigasheet | 0 | 8+ |
| Job pages | /split-large-csv, /filter-large-csv, /csv-to-excel | 2 | 10+ |
| File-type pages | /open/stripe-export, /open/screaming-frog-crawl | 0 | 15+ |
| Speed (results only) | /speed | 1 | 1 |
| Blog / guides | /blog/... | 0 | ongoing |

### Keyword targets

- **Homepage:** csv viewer, online csv viewer, csv view online, online csv opener, csv file viewer, csv file reader, free csv viewer, csv viewer online free.
- **Large-file pages:** open large csv file, large csv viewer, open huge csv file, csv too big for excel, open csv with more than 1 million rows, open large csv file mac, open big csv file online, software to open large csv files.
- **Job pages:** split csv, filter large csv, csv to excel, csv viewer and editor, csv visualizer online.

### Problem pages

One page per entry in the "What people struggle with" table, using its page template: the exact error message as the title, why it happens with the specific limit, the drop zone on the page, other honest fixes, a short FAQ, and related links.

### Comparison pages

Planned: vs Excel, vs Google Sheets, vs Gigasheet, vs Row Zero, vs HugeCSV, vs Large CSV Viewer, vs Tad, vs Modern CSV, vs EmEditor, vs ConvertCSV, vs Power Query, vs Python/pandas.

Template for each:

1. One-paragraph verdict: who should use which.
2. Comparison table: price, signup, upload or local, max file size, speed, filters, group-by, Excel export, offline, platforms.
3. Where the competitor is better (be honest; this builds trust and keeps the page credible to AI assistants).
4. Where MegaCSV is better.
5. Drop zone to try MegaCSV on the user's own file.
6. "Last checked" date. Re-verify competitor facts every quarter.

Rules: facts only, with sources and dates; no misleading use of competitor names or logos; never claim something about a competitor that isn't on their own site or verified by testing.

### Alternatives pages

"Gigasheet alternative (no upload)", "Row Zero alternative", "Excel alternative for large CSV files", "HugeCSV alternative", "Power Query alternative", "EmEditor alternative for Mac", and similar. Each lists several options fairly, with MegaCSV first and why.

### File-type pages

Pages for common big exports: Stripe, PayPal, Shopify orders, Amazon seller reports, Google Ads, Meta Ads, Google Search Console, Screaming Frog, Ahrefs, Semrush, Salesforce, HubSpot, NetSuite, bank statements, server logs, government open data. Each explains typical size and columns and links to the relevant job (filter, group-by, split for re-import).

### Technical SEO rules (avoid HugeCSV's mistakes)

- One brand name everywhere: title tags, header, app name, Open Graph tags.
- Absolute canonical URLs on every page; never a relative canonical.
- No meta-keywords tag; no keyword-stuffed titles. Titles under 60 characters, written for people.
- Structured data: `SoftwareApplication` on the homepage; `FAQPage` where there's an FAQ; `HowTo` on step-by-step problem pages.
- Sitemap and robots.txt; fast pages (content pages ship 0 KB JavaScript; the tool loads only where embedded).
- Real screenshots and a short demo video on the homepage and key pages.
- Internal links: every problem page links to the tool, related problems and one comparison page.

### AI discovery: assistants and agents are customers too

More people now ask ChatGPT, Claude, Gemini, Perplexity or Google's AI answers "how do I open a 5 GB CSV?" instead of clicking search results, and AI agents increasingly do the work for them. Treat both as first-class audiences from the first page we publish.

**Be found and cited by AI assistants**

- **Readable without JavaScript.** AI crawlers mostly don't run scripts. Every content page is static HTML (Astro), and the homepage carries its key facts as text, not only inside the app.
- **Let AI crawlers in.** `robots.txt` allows search and assistant crawlers: Googlebot, Bingbot, OAI-SearchBot, ChatGPT-User, GPTBot, ClaudeBot, Claude-User, Claude-SearchBot, PerplexityBot, Perplexity-User, Google-Extended, Applebot-Extended. Submit the sitemap to Google Search Console and Bing Webmaster Tools (several assistants search through Bing), and ping IndexNow when pages change.
- **`/llms.txt` and Markdown copies.** Publish `/llms.txt` (what MegaCSV is, key facts, limits and links to the important pages) and `/llms-full.txt`, plus a Markdown version of every content page at the same URL with `.md` added.
- **One fact sheet.** A `/facts` page with short, quotable, dated facts: what it does, file sizes tested, speed (only measured numbers), price (free), browsers, and honest limits. Every other description (site, GitHub, Product Hunt, directories) uses the same wording, so assistants learn one consistent description.
- **Answer first.** Problem pages open with the exact error and a two-sentence answer before anything else; comparison pages lead with a verdict and a table. Facts have numbers and a "last checked" date.
- **Structured data.** `SoftwareApplication` (with a free `Offer`), `Organization` with the whale logo, `FAQPage` and `HowTo` where they fit.
- **Be where assistants learn.** Helpful answers in Reddit and forum threads, listings on AlternativeTo, Product Hunt and relevant "awesome" lists on GitHub, and a clear Wikipedia-style description we can point editors to. Assistants cite these sources heavily.
- **Publish results, not methods.** Benchmarks (file size, time, machine, date) go on the Speed page; marketing copy doesn't explain how the engine works (the code is public for anyone who wants that).

**Work well for AI agents using the product**

- **Agents in the browser** (agents that click through websites for a person) can't read a canvas. The grid keeps a hidden but accessible copy of the visible rows (an ARIA grid), which also serves screen-reader users. Every control has a plain text label, the filter sentence is made of real form fields, and status text ("12,408 of 48,273,485 rows match") is real text on the page.
- **Agents on the computer** (Claude Code, Cursor, Codex and similar) hit giant CSVs too, and can't open them in a browser. A later product to evaluate: a `megacsv` command-line tool and MCP server built on the same Rust engine, so an agent can count rows, find, filter and export subsets of a huge file locally. It is also a distribution channel: agents recommend tools they can use. Ship it as a compiled binary (the code stays private).
- **Instructions for agents.** `/llms.txt` includes a short "how to help someone open a large CSV with MegaCSV" section, so an assistant can walk a user through it correctly.

**Measure it**

- Count visits referred by chatgpt.com, perplexity.ai, claude.ai, gemini.google.com and copilot.microsoft.com (page-view analytics only).
- Once a month, ask the main assistants a fixed set of questions ("how do I open a CSV too big for Excel?", "best free large CSV viewer", "open CSV without uploading") and record whether MegaCSV is mentioned and how it's described.

### Cadence

At launch: homepage, 10 problem pages, 3 comparison pages, 2 job pages, Speed page. After launch: 2–3 new pages per week, prioritized by search volume and by questions real users ask.

## Launch and distribution

HugeCSV proves that a great tool nobody hears about gets zero traffic, so launching is part of the product, not an afterthought. Lead with community launches for early users and backlinks; SEO compounds behind them.

**Before launch**

- [ ] MVP exit criteria met (see Roadmap)
- [ ] 60-second demo video: drop a 20 GB file, scroll, search, filter, export to Excel
- [ ] Homepage, 10 problem pages, 3 comparison pages, Speed page with benchmark results
- [ ] Feedback channel (email address and a short form) and a public changelog
- [ ] Tested on Windows and Mac, Chrome, Edge, Firefox and Safari, on an 8 GB RAM laptop

**Launch sequence**

1. **Show HN** (Hacker News): title focused on the result ("Open a 20 GB CSV in your browser"); link to the homepage and demo video; share results, not implementation; be in the comments all day and keep technical answers high-level.
2. **Reddit:** r/excel (with the moderators' rules in mind), r/dataengineering, r/datasets, r/SEO, r/bigseo, r/accounting, r/sysadmin. Share as a helpful tool, not an ad; answer every question.
3. **Old Reddit threads:** reply helpfully to the threads in the Research section where it genuinely answers the question.
4. **Product Hunt** a week or two after HN, with the demo video.
5. **Directories:** AlternativeTo (as an alternative to Gigasheet, Row Zero, Tad, Modern CSV, HugeCSV), Awesome lists on GitHub, data tool directories.
6. **Communities for secondary audiences:** SEO communities (crawl exports), e-commerce seller forums, journalism data groups.

**Code is open source (decided Nov 19, 2026)**

The code is public, which helps trust: anyone can check that files never leave the browser. Lead with results anyway: the demo video, measured speed and honest limits.

## Metrics, monetization, risks and open questions

Success in the first six months means real users returning with real files, not revenue. Monetization comes after a loyal audience exists.

**Metrics (page-view analytics only; no file data collected)**

- Weekly visitors and returning visitors.
- Files opened per week, with file size, rows and opening speed (the `file_open` event).
- Organic traffic per page type (Search Console).
- Rankings for the homepage keywords and top problem pages.
- Feedback volume and the most requested features.

**Monetization options (later, in order of fit)**

1. **Pro desktop app (Tauri):** one-time or yearly price; 100 GB+, full-file sort, all CPU cores, file associations. Clean line: web is free, desktop is Pro.
2. **Pro web features:** for example saved views, joins and compare, unlimited group-by size. Only if it doesn't weaken the free tool's reputation.
3. **Team or business licences** for companies that need a vetted, local tool.
4. **Sponsorship or donations** (GitHub Sponsors, Buy Me a Coffee).
5. Avoid ads in the app: low value (the #2 "CSV Viewer" site sells its ad slot for $19 a month) and they damage trust.

**Risks and mitigations**

| Risk | Mitigation |
| --- | --- |
| The tech is easy to copy (AI-built clones exist) | Win on product, plain language and distribution; ship fast; build a brand and backlinks early |
| Search demand for big-file terms is small and falling | Target generic "csv viewer" terms on the homepage; write content AI assistants cite |
| HugeCSV or another competitor fixes its marketing | Our edges (Excel bridge, analysis, instant reopen) are product features, not marketing |
| Quote-parsing bugs on messy files | Property tests, differential tests, fuzzing, and the "quotes as text" fallback mode |
| Safari or Firefox limitations | OPFS fallback paths; recommend Chrome/Edge for very large files |
| Name associated with MEGA (a cloud storage service) or confused with similar tools | Trademark search before launch; distinct logo and colors; jumbocsv.com held as a backup |
| Revenue never materializes | Keep costs near zero; treat the web app as a traffic and reputation asset; the desktop Pro app is the revenue test |

**Open questions**

- Decided: the name is MegaCSV (megacsv.com); jumbocsv.com is kept as a backup that redirects.
- How to show speed convincingly (benchmarks, demo video) without revealing how it works?
- Count anonymous "file opened" events, or page views only?
- Decided: React is the choice for the app shell, within the planned bundle budget; no Preact fallback.
- Decided: MegaCSV stays generic, for anyone with a CSV file. Launch first where the most users are: Excel users, analysts and finance teams (r/excel, accounting and finance communities), then SEO and other groups. Segments decide which content pages come first, not who the product is for.

## Sources and references

Keyword volumes come from Google Keyword Planner (global) and HugeCSV's traffic from Ahrefs, both run by the product owner in October 2026. Error-message wording in the struggles table is from memory and must be verified before publishing.

**Competitors and products**

- [HugeCSV](https://hugecsv.com/) and its [WASM parser write-up](https://hugecsv.com/learning-parser-wasm.html)
- [Large CSV Viewer](https://largecsvviewer.com/)
- [Gigasheet — online CSV viewer options](https://gigasheet.com/post/online-csv-viewer) and [open large CSV](https://www.gigasheet.com/post/open-large-csv-file)
- [Row Zero — open big Excel file](https://rowzero.com/blog/open-big-excel-file), [CSV row limits](https://rowzero.io/blog/csv-row-limit), [open big CSV](https://rowzero.com/blog/open-big-csv)
- [CSV Viewer & Editor Online (csv-viewer-online.github.io)](https://csv-viewer-online.github.io/)
- [Convertico CSV File Viewer](https://convertico.com/csv-file-viewer/)
- [CodeShack CSV viewer](https://codeshack.io/csv-viewer/)
- [Gridwell](https://github.com/ben-gy/gridwell)
- [Datakit (r/SQL post)](https://redlib.hackliberty.org/r/SQL/s/H1IECcFJOE)
- [howtocsv / iLoveCSV on Indie Hackers](https://www.indiehackers.com/post/97fe0f852f)
- [CSV Tools on Indie Hackers](https://www.indiehackers.com/product/csv-tools)
- [Tad](https://tadviewer.com/), [Tads](https://github.com/brettmcc/tads), [ghacks review of Tad](https://www.ghacks.net/?p=133848)
- [CSView 2 (Mac App Store)](https://apps.apple.com/us/app/csview-2/id1540184805)
- [Alyetama/csvViewer](https://github.com/Alyetama/csvViewer)
- [Gigagrid CSV Pro](https://marketplace.visualstudio.com/items?itemName=PutraAdiJaya.gigagrid-csv), [Quick CSV Viewer](https://marketplace.visualstudio.com/items?itemName=jsh9.quick-csv-viewer)
- [wildandfreetools — Excel crashing on large CSV](https://wildandfreetools.com/blog/open-large-csv-file/)
- [SplitForge — open a 10 GB CSV](https://splitforge.app/blog/how-to-open-large-csv-file)

**Open-source code worth studying (respect licenses; borrow ideas, don't copy wholesale)**

- simdcsv (Geoff Langdale) and simdjson: the SIMD quote-mask technique
- `csv-core` and `csv` crates (BurntSushi): use directly; `csv` is the test reference
- `memchr` crate: SIMD byte and substring search
- [large-csv-reader](https://github.com/spnfury/large-csv-reader): sparse index in JavaScript
- [Lov](https://github.com/Bishops-exe/lov): Rust/WASM plus worker bridge
- [wasm-csv-parser](https://github.com/TheMagiche/wasm-csv-parser): Rust/WASM CSV scanner
- [csv-viewer-local](https://github.com/turhe123/csv-viewer-local): local viewer reference
- Glide Data Grid: canvas grid ideas
- fflate: streaming zip and gzip

**Platform and pricing**

- [Cloudflare Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/) (static asset requests free and unlimited)
- [Cloudflare Workers limits](https://developers.cloudflare.com/workers/platform/limits) (25 MiB per static file)
- [Cloudflare .com pricing (CostGoat)](https://costgoat.com/pricing/cloudflare-domains): about $10.46/year, rising to about $11.17
- [DuckDB-WASM docs](https://duckdb.org/docs/stable/clients/wasm/instantiation)

**Reddit threads:** see the table in Research and market evidence.
