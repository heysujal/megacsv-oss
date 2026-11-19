# Blog topics: how many strong posts the research supports

Nov 1, 2026 · Built from [reddit.md](reddit.md), [youtube.md](youtube.md), the raw data in `research-data/`, and a second YouTube pass (30 new searches, 399 videos, 3,261 comment threads; `scripts/research/youtube_fetch_blog.py` → `research-data/youtube-blog.json`)

## Answer

**10 strong blog posts can be written now**, and **8 more once the features they depend on ship**. That counts only topics that pass all four tests below, after removing the topics that belong on problem pages instead.

The draft "Blog plan" in reddit.md lists 15 posts, but **9 of the 15 are problem pages**: 7 target the same searches as problem pages already planned in reference.md ("What people struggle with"), and 2 (blank sheet, pandas "expected fields") are single-error topics that should be new problem pages. Of the other 6, two become posts 3 and 4 below, two wait for features, one is a file-type page, and one is dropped. Publishing a blog post and a problem page for the same search would put two of our pages in competition for it. Those topics stay problem pages; the blog covers what a short problem page can't: hubs, comparisons, measurements, stories and routines.

## The four tests

1. **MegaCSV solves it today** (blog rule in reference.md). Built today: open any size, find, filter (contains, equals, starts with, empty, not empty, number between), go to row, export CSV or Excel split at 1,048,575 / 50,000 (Salesforce) / 25,000 (NetSuite) / custom with the header on every file, comma/semicolon/tab/pipe, UTF-8 and Windows-1252, instant reopen on Chrome and Edge. Excel export writes leading zeros, numbers over 15 digits and dates as text, so Excel can't change them. **Not built:** column picker, paste-a-list filter, combine files, .gz/.zip, UTF-16, bad-row check, group-by, dedupe, sample.
2. **Real evidence:** quotes, a story to open with, and search or view demand.
3. **Not a problem page:** problem pages answer one exact error message or symptom. A blog post covers a topic that needs a hub, a comparison, measurements, a story or a routine.
4. **Fits the messaging rules** (reference.md): no engine details; privacy only as "your file is never uploaded".

## Where the traffic is

- **Large-file searches are small.** Keyword Planner puts "csv too big for excel" and "open csv with more than 1 million rows" at 10–100 searches a month each, falling about 90% a year as AI assistants answer them. Posts on these topics earn AI citations and high-value users, not volume.
- **"Excel changed my CSV" is big.** Measured in YouTube views on the top on-topic videos (Nov 1, 2026):

| Problem | Top on-topic videos (views) |
| --- | --- |
| Long numbers turn into scientific notation or lose their last digits | 1,166,596 · 541,937 · 481,943 · 372,578 |
| Leading zeros removed | 321,538 · 198,960 · 198,898 · 67,084 |
| Dates changed on open | 54,019 · 41,218 (general date-format videos reach 1M) |
| "There isn't enough memory to complete this action" | 386,057 · 81,262 · 75,147 |
| Excel's filter list stops at 10,000 items | 75,958 |
| CSV everything in one column | 1.4M (first pass) |

These hit people with small files too, and MegaCSV fixes them by showing raw values and exporting them as text. This cluster is the blog's best traffic opportunity.

- **No demand signal** on YouTube for Stripe, Shopify, HubSpot, Mailchimp, Screaming Frog or Google Analytics exports (top relevant videos at 300 to 12,000 views). YouTube is a weak signal for these, so treat them as unproven rather than dead; they fold into post 6.

## Write now (10)

**Status (Nov 1, 2026):** all 10 are written in `site/src/content/blog/`. Published: 1 excel-changes-csv-data, 2 excel-limits-large-files, 3 skip-power-query-large-csv, 4 how-long-to-open-large-csv, 5 csv-import-limits, 6 look-before-you-load-vendor-csv, 7 search-every-row-large-csv, 8 monthly-large-csv-export-routine, 9 data-logger-csv-too-big-for-excel. Draft: 10 csv-too-big-for-chatgpt, until ChatGPT's limit is confirmed on OpenAI's live help page. Review notes in [../pending-review.md](../pending-review.md); decisions in [../decision.md](../decision.md).

Ranked by evidence times traffic. Each opens with one real story from the research, anonymized.

| # | Working title | Target searches | Opening story / proof | Links to problem pages |
| --- | --- | --- | --- | --- |
| 1 | **Excel keeps changing your CSV: zeros, long numbers, dates, columns, characters, and how to open it unchanged** | excel removes leading zeros csv, excel changes last digits to 0, excel changes dates csv, csv one column | "In Notepad the number is 123456789898 and when I open this into excel 123456789800"; zeros "gone again" after re-saving | #11, #12, #13, #14 |
| 2 | **Every Excel limit that breaks a big file**: 1,048,576 rows (10 lakh), 65,536 in .xls mode, 16,384 columns, 10,000 items in the filter list, 15 digits, memory | excel row limit, excel 1048576 rows limit, excel filter 10000 limit, more than 10 lakh rows | 105,000-row file that still got "too large for the grid" (.xls mode); "Data filter me 10000 limit lagi hai" | #1, #2, #4, #5 |
| 3 | **Skip Power Query: from a huge CSV to filtered rows in Excel, no Data Model** | power query large csv, export data model to csv, power query csv row limit workaround | ~32 YouTube comments asking how to get rows back out; "1,357,599 rows loaded, 815,889 errors"; "Transform data is not showing"; Office 2016; no Data Model on Mac | #1, #5, #7 |
| 4 | **We timed it: seconds until you see a 1, 5, 10 and 20 GB CSV in Excel, Power Query, Google Sheets, Notepad++ and MegaCSV** | how to open 2gb / 5gb / 10gb / 20gb csv | Our own runs on the reference laptop (reddit.md, "Speed"). Link-bait for r/excel and Hacker News | #3, #6, #9 |
| 5 | **Moving data into a new system: import limits by platform, a header on every file, zeros kept** | split csv for import, salesforce import 50000, netsuite csv import limit, hubspot import limit | Front-desk employee given a database migration by the CFO, who uploaded it to a random online splitter | #15, #16 |
| 6 | **Look before you load: check a vendor CSV dump before you write the pipeline** | inspect large csv, view first rows of huge csv, csv header check | 75 GB × 17 files, 400 columns, dirty data; a first attempt that would have taken 8 days | #10 |
| 7 | **Sometimes you just need to see it: searching every row of a multi-GB export** (audit, debugging, checking an import) | search large csv file, find value in huge csv | "Distrustful users… I do 100% expect at least one user to use ctrl-f"; record 20,343,876 "and the previous"; the 46-upvote "humans can't read that" reply | #3, #18 |
| 8 | **The same 2 GB export every month: a 5-minute routine for finance teams** | monthly report large csv excel, gl export too large for excel | ERP 2 GB / 10M rows monthly; "I have to do this on a monthly basis"; reopen in about a second | #1, #5 |
| 9 | **Your test data isn't lost, it's just bigger than Excel** (machine logs, lab and sensor exports) | data logger csv too big for excel, open large log csv | Test press that wrote 2.5 GB instead of 40 MB; "run another cycle at great expense (and embarrassment)" | #5, #9 |
| 10 | **File too big for ChatGPT? Cut it down to the rows you need first** | analyze large csv with chatgpt, chatgpt file too large | 1.19M-view "Tricked ChatGPT into analyzing MASSIVE datasets"; filter, export a small file, then ask the AI | #6 |

Notes:

- **Post 4** needs the timed runs first (tasks.md, "Measure the figures marked *").
- **Post 5** needs each platform's current limit checked on its official help page before publishing (Salesforce Data Import Wizard, NetSuite, HubSpot, Shopify, Mailchimp, QuickBooks).
- **Post 10** needs ChatGPT's current file limits checked on OpenAI's live help page. Sell speed: filter in seconds, hand over a small file; privacy only as "your file is never uploaded".
- **Posts 8 and 9** have the thinnest evidence (one story or thread each). Write them after 1–7.
- **Lakh wording** ("1,000,000 rows (10 lakh)") belongs in posts 2 and 3; about 118 of 3,384 first-pass comments were Hindi or Hinglish.

## Write after the feature ships (8)

Order for each (owner, Nov 1, 2026): build the feature, ship it, then write the post as a draft (`draft: true`), then publish it.

| Post | Needs | Evidence |
| --- | --- | --- |
| Keep only the columns you need from a huge CSV | Column picker (tasks.md §2) | 4 of 228 columns; "don't need 85%"; 38 of 400; YouTube "only a few particular columns" |
| VLOOKUP a list of IDs against millions of rows | "Is one of…" pasted-list filter (tasks.md §2) | 400 IDs vs 8M rows; ~100 IDs vs 10M monthly; no XLOOKUP on Office 2016 |
| Combine a year of monthly CSVs into one file (e.g. coursework and capstone datasets) | Combine files (not on the roadmap) | ~72 YouTube comments; "merge CSV" 97k views; "10–15 csv files each month ~25M rows" |
| Put 5 million rows in one Excel workbook, one sheet per million | Sheet-per-million export | Asked in those words on YouTube (3.5M rows "next rows create new tabs") |
| Find the rows that break your import (wrong column count) | Bad-row check | pandas "Expected 11 fields in line 12747725, saw 12"; "alphabetical characters in number fields" |
| A pivot table on 10 million rows without the Data Model | Group-by (Phase 3) | "117 million records into the data model"; 800k rows breaking pivots |
| Keep only the latest row per customer or ID | Dedupe (Phase 3) | 200 GB "only the one with the last time stamp" |
| Open a .csv.gz or zipped CSV without unzipping | .gz/.zip support | Problem page #17 plus PQ "how to import from zip files?" |

## Problem pages, not blog posts

These came up as blog ideas but each one answers a single message or symptom. Build them as problem pages using the template in reference.md.

- **Already in reference.md's table:** too large for the grid (#1), file not loaded completely (#2), more than 1 million rows / 10 lakh (#5), Mac (#7), Notepad and editors (#9), pandas MemoryError (#10), split (#16), Google Sheets limit (#6), not enough memory (#4).
- **Add to the table (new from the research):**
  - Excel opens a big CSV **blank**, no error.
  - "Too large for the grid" on a **~105,000-row** file (.xls compatibility mode, 65,536 rows).
  - Excel's **filter list shows only 10,000 items** ("not all items showing"). MegaCSV filters every row.
  - **Long numbers lose their last digits** (16-digit card numbers, long order IDs). Split out from #13: it is the single most-viewed problem in the data (1.17M views) and a different search from leading zeros.
  - **Notepad++ "file too big"**.
  - **pandas "Expected N fields, saw M"** (go to that row).
- **File-type pages (/open/…):** the NPPES NPI file (5+ GB, CMS), then other named public datasets.

## Dropped

- ~~**"Is it safe to upload your CSV to an online splitter?"**~~ Back on the list: it was dropped under the first Nov 1 messaging rule, which the owner reversed the same day (privacy claims allowed). Next post to write after the feature posts' features ship, or sooner.
- **Tally, SAP, bank statements, Power BI exports:** big YouTube demand, but the files are small, PDFs, or locked inside another product. MegaCSV doesn't solve them.
- **"How to increase Excel row limit":** the search returns row-height videos. Ambiguous intent; covered inside post 2.
- **Standalone Stripe / Shopify / HubSpot / Mailchimp / Screaming Frog posts:** no demand signal; folded into post 5 or kept for file-type pages if Search Console shows demand later.

## Out of date in the earlier research

reddit.md ("How to showcase the app", homepage proof lines) and youtube.md ("Privacy angle for the AI crowd", "Wi-Fi off") recommend privacy lines such as "nothing leaves your computer". The current messaging rule in reference.md allows privacy claims but, while Clarity runs unmasked, only the narrower "your file is never uploaded".
