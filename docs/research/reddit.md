# Reddit, Google AI and blog research: what people with big CSV files need

Oct 31, 2026 · Data from `redditdata.txt` (33 Reddit threads, Google AI Mode answers, a few Stack Overflow pages and two competitor blog posts)

## Summary

The same story repeats in every thread: someone gets a CSV they didn't make, Excel cuts it off or freezes, and the replies tell them to learn Power Query, Access, SQL or Python. The person asking usually just wants to **look at the file, find some rows or columns, and get a smaller piece back into Excel**. Many can't install software, can't upload the data, or are on a Mac where Excel's official workaround doesn't exist.

What this means for MegaCSV:

1. **"Pick the columns I need" is the most common request we don't support yet.** Three separate threads ask for it (4 of 228 columns; 15% of a 5 GB file; 38 of 400 columns).
2. **"Look up my list in the big file" comes second.** A 400-row list against 8 million rows; about 100 IDs against 10 million rows every month; IDs against a 200 GB file. A "paste a list of values" filter answers it.
3. **The official answer (Power Query plus Data Model) fails the people asking.** It isn't available on Mac, it's an add-in on Excel 2013, its preview hides most values, it runs out of memory, and it can't easily send the rows back out. This is our main argument, and we can make it with real quotes.
4. **No install and no upload are must-haves, not nice-to-haves.** "Can I use an external program? **No. That's my main issue.**" One user who doesn't use computers much uploaded a company's whole database to a random online splitter because nothing else worked.
5. **Excel's error messages are what people search for**, and some symptoms have no message at all: the sheet opens blank, rows are cut off silently, or the "too large" error appears for only 105,000 rows. Each one gets its own page.
6. **Old Reddit threads are a live channel.** Toolmakers still reply to 3–5-year-old threads, and Google AI Mode cites those same threads. Answering them helpfully puts us in front of both readers and AI answers.

## Method and limits

- **Sources:** 33 Reddit threads (r/excel ×12, r/learnpython ×9, r/dataengineering ×4, and one each from r/SQL, r/data, r/Python, r/rstats, r/csharp, r/rust, r/Backend, r/developersIndia), about 1,200 comments in total. Also two Google AI Mode answers, three Stack Overflow questions, and two competitor guides (mygems "How to open a large CSV file that Excel won't open (2026 guide)" and an older "What to do if your CSV is too large to open").
- Every quote below was read in context. Quotes are anonymous and lightly trimmed.
- **Limits:** threads were picked by search, so they lean toward people who failed first. Votes favor technical answers (r/excel's top reply is nearly always "Power Query"). Google AI's keyword and error lists are **its suggestions, not search data**; the error table marks which messages we actually saw people quote.
- The raw file (`research-data/redditdata.txt`, gitignored like the YouTube data) contains usernames, so it is never published.

## Who these people are

The people asking are rarely data professionals. In their own words:

| Who | File | What they needed |
| --- | --- | --- |
| Front-desk employee given a task by the CFO: "I don't do computer stuff well… I can take this right back to our CFO and look like an idiot or I can find a way" | Whole export of an old company database, millions of rows | Split it to import into a new system **without losing leading zeros and spaces**. Ended up uploading it to an online splitter. |
| Undergraduate writing a dissertation on a **Mac**; their supervisor told them to use Excel | 1.06 GB, 10M rows | Open it and add a formula. Power Pivot isn't on Mac: "I had to use a non-apple laptop to create a data model." |
| Analyst on **Excel 2013 with no external programs allowed** | 997 MB, 1.8M rows, 228 columns | Keep 4 columns (A, GG, GM, GZ) and drop the rest |
| Someone checking a data transfer | 8M rows, delivered by the BI team | Look up 400 IDs and return a value. "I won't be able to share the file here." Office 2016 has no XLOOKUP. |
| Researcher with university data on a USB stick | 1.4 GB environmental data | "Excel… just dumps the rest of the data." |
| Engineer whose test press produced 2.5 GB instead of the usual 40 MB | Thermal-cycle data | Rescue the data; otherwise "run another cycle at great expense (and embarrassment)" |
| Healthcare: the public NPPES NPI file from CMS | 5.29 GB | "I really don't need probably 85% of [it]"; has 4 GB RAM; Notepad++ refuses the file |
| ERP and audit staff | 2 GB / 10M rows monthly | "Distrustful users prefer to see sorted but unfiltered data so they can spot suspicious movements… I do 100% expect at least one user to use ctrl-f" |
| Python user checking their own scripts | 100k–1M+ rows | Opens output in Excel "to filter… on 'Blank' values to see what my merges aren't picking up"; Excel gets laggy |
| Data engineer receiving a vendor dump | 75 GB × 17 files, 400 columns, ~2B rows, dirty data | Keep 38 columns, clean, load. Their first attempt would have taken 8 days. |

Two things to take from this table:

- **Our persona list is missing the "accidental owner":** front-desk staff, students and engineers. They are the least technical people asking and the ones most grateful for a simple answer.
- **The dismissive reply is part of the problem.** "Opening 20gb csv makes no sense, humans can't read that amount of information" (46 upvotes). Auditors, debuggers and people checking an import all need to *look*. Our message can take their side: "Sometimes you just need to see it."

## What they want to do, ranked by evidence

| # | Job | Evidence | MegaCSV today |
| --- | --- | --- | --- |
| 1 | **Get a smaller piece back into Excel** (filter, then export) | Nearly every r/excel thread; "If this eventually has to be Excel, you will need to split the file into 1 million row chunks" | **Built** (filter + CSV/XLSX export, split at the Excel limit) |
| 2 | **Keep only some columns** | 4 of 228; "don't need 85%"; 38 of 400; Google AI: "delete columns from huge csv file without opening" | **Missing.** Top new feature |
| 3 | **Split for import into another system**, header on every part | Front-desk user; Salesforce/NetSuite presets; PowerShell and VBS split scripts posted (17+ votes) | **Built** (presets, header repeated) |
| 4 | **Look up a list of IDs** in the big file | 400 vs 8M rows; ~100 IDs vs 10M monthly; ID file vs 200 GB | **Missing.** Add "is one of… (paste a list)" |
| 5 | **Find a value I don't know yet** (browse what's in a column) | "Specific value that you don't know yet? — Second. :/"; PQ preview "won't show all the data"; Excel's filter list stops at 10,000 items | Partly. Column value list with counts (Phase 3 profile) answers it |
| 6 | **Just look / search everything** | 20 GB "shows nothing"; auditors' ctrl-F; "see that record or the previous" | **Built** (open, scroll, find, go to row) |
| 7 | **Keep values exactly as they are** (leading zeros, long numbers, spaces) | "lose trailing zero's, spaces"; "EXCEL: STOP F***ING WITH MY DATA"; phone and account numbers | **Built** (raw display; XLSX keeps IDs and long numbers as text). Market it. |
| 8 | **Summarize** (pivot or group-by) | "117 million records into the data model… shocked how efficient"; "summarise it into something less granular" | Phase 3 |
| 9 | **Find bad rows** (wrong column count, junk in number fields) | pandas "Expected 11 fields in line 12747725, saw 12"; "alphabetical characters in number fields"; "garbage info on the first 10 rows" | **Missing.** Strong for developers |
| 10 | **Combine many files** / compare two | "10–15 csv files each month ~25M rows"; "hundreds of parts"; 50 GB compare | Phase 5 (compare); combine not planned |
| 11 | **Keep only the latest row per ID**, sort, sample | 200 GB "only the one with the last time stamp"; 300 GB sort; "randomized sample of maybe 10%" | Partly planned (dedupe, sort); sample not planned |

## Why today's answers fail them

Use these in blog posts and comparison pages. Each one is a real reply from the threads, not our opinion.

- **Power Query + Data Model** (the top answer in r/excel, in about 157 comment lines):
  - Not on Mac: "PowerPivot and PowerBI desktop are not available on a mac." "Mac Excel hasn't implemented the data model."
  - Only an add-in on 2010/2013; locked-down PCs can't add it.
  - "It won't show all the data on the preview." "Click load more rows."
  - "Power query runs out of memory." "I tried using Power Query, but it kept getting stuck and the process failed."
  - "The processing time for 10 million rows will be slow, very slow."
  - "You can build a pivot table off the query but you cannot export it to a new text file."
  - It scares beginners: "Now don't panic :) it might be scary." "I don't know what Powerquery is."
- **MS Access:** 2 GB file limit, 255 columns maximum, and "couldn't even import the csv file."
- **Notepad++:** "explicitly stated the file is too large" (fails at 1.3 GB for one user).
- **Python / R / SQL:** "I have no idea how to write, read, or run Python." "The OP's a beginner." Even pandas fails above RAM size: "a 9 Gb csv may not be able to fit in someone's RAM."
- **Online splitters:** "Just be cautious if the data is sensitive since you are uploading to a third party site."
- **Shell tools (awk, split):** fast, but "make sure the content doesn't contain the separator" and "only the first chunk gets the header row." A splitter that understands quotes "may be difficult to find." **Ours does, so this is a selling point for developers.**
- **ChatGPT:** r/excel removes "lazy just use AI" replies. Privacy concerns also show up in the YouTube research.

## Exact error messages and symptoms (for SEO pages)

"Seen" means we saw a person quote it in this data. "Suggested" means it came from Google AI or memory: **check the wording in the real app before publishing**, as the reference doc already requires.

| Message or symptom | App | Status | Proposed page |
| --- | --- | --- | --- |
| "This data set is too large for the Excel grid. If you save this workbook, you'll lose data that wasn't loaded." | Excel | Seen (verbatim) | /excel-data-set-too-large-for-grid |
| "File not loaded completely" | Excel | Seen (Stack Overflow, blog) | /excel-file-not-loaded-completely |
| Excel says "too large" for a file of only ~105,000 rows | Excel in compatibility mode (.xls, 65,536 rows) | Seen | **New:** /excel-too-large-for-grid-small-file |
| Excel opens a big CSV and **shows nothing / all cells empty**, with no error | Excel | Seen (20 GB r/SQL; 2 GB Stack Overflow) | **New:** /excel-opens-csv-blank |
| Rows cut off at 1,048,576; saving then deletes them for good | Excel | Seen ("Excel… just dumps the rest") | /csv-more-than-1-million-rows |
| "Not responding" / freezes while opening | Excel | Seen | /excel-not-responding-large-csv |
| "Excel cannot complete this task with available resources. Choose less data or close other applications." | Excel | Suggested | /excel-not-enough-resources-csv |
| "There isn't enough memory to complete this action…" | Excel | Suggested | merge with the page above |
| "Possible Data Loss: Some features might be lost if you save this workbook in the CSV (Comma delimited) format." | Excel | Suggested | /excel-csv-possible-data-loss |
| Leading zeros dropped; long numbers become 1.23E+11; dates flipped | Excel | Seen | /csv-leading-zeros-excel, /excel-changes-csv-dates |
| Everything in one column; wrong delimiter; UTF-8 not picked | Excel | Seen | /csv-opens-in-one-column, /csv-garbled-characters |
| Power Query: "1,357,599 rows loaded, 815,889 errors"; "creating more rows than the spreadsheet can contain"; runs out of memory | Excel Power Query | Seen (YouTube + Reddit) | **New:** /power-query-large-csv-errors |
| Power Pivot / Data Model missing on Mac | Excel for Mac | Seen | /open-large-csv-mac (lead with this) |
| "The data could not be loaded completely because the maximum number of rows per sheet was exceeded." | LibreOffice Calc | Suggested | /libreoffice-maximum-rows-exceeded |
| "File is too big to be opened by Notepad++" | Notepad++ | Seen (paraphrased) | **New:** /notepad-plus-plus-file-too-big |
| This action would increase the number of cells above the limit of 10,000,000 cells | Google Sheets | Suggested | /google-sheets-csv-too-large |
| `MemoryError: Unable to allocate … GiB for an array with shape …` | pandas | Seen ("Unable to allocate 51 GB") | /pandas-memoryerror-large-csv |
| `Error tokenizing data. C error: Expected 11 fields in line 12747725, saw 12` | pandas | Seen (verbatim) | **New:** /pandas-expected-fields-saw (jump straight to that row) |
| `System.IO.IOException: Not enough memory resources are available to process this command.` | .NET | Seen (verbatim) | Low priority |
| Access: 2 GB limit; won't import more than 255 columns | Access | Seen | Use inside the "vs Access" page |
| Upload fails or times out ("Request Entity Too Large (413)") | Cloud tools | Suggested | Use inside the "vs cloud tools" pages |

**New pages not in the reference doc:** blank-sheet symptom, too-large-on-a-small-file (.xls mode), Power Query errors, Notepad++ too big, and pandas "expected fields".

## Search phrases to target

From Google AI Mode plus the way people actually titled their posts. These are guesses at wording, not measured volumes; the measured volumes are in the reference doc's Keyword Planner table.

- **Size in the query:** "how to open 2gb csv", "open 5gb csv file windows", "how to open 10gb csv file", "open 20gb csv file", "open 100 million row csv", "how to open multi million row csv". Post titles always include the size, so make one page per common size (2, 5, 10, 20 GB) with a real timing on each.
- **"Without":** "without excel", "without coding", "without loading into ram", "without opening it" (filter), "without crashing". This matches our audience exactly.
- **Tasks:** "filter large csv file", "split large csv file into smaller files", "delete columns from huge csv", "view first 100 rows of a 10gb csv", "extract random sample from massive csv", "convert large csv to xlsx without excel", "vlookup large csv".
- **Workaround names:** "power query csv row limit workaround", "excel 1048576 row limit bypass", "how to increase excel row limit".
- **Named public files:** "NPPES NPI file open", plus campaign-finance data, Kaggle and government data. These are file-type pages.
- **India:** "10 lakh rows", "52 lakh rows" (from the YouTube research). Write "1,000,000 rows (10 lakh)" on the row-limit pages.

## Speed: what we can claim against competitors

We should publish only comparisons we win and can prove. Every number must be **our own timed run** on a stated machine and date. Reddit anecdotes describe the pain; they aren't benchmarks.

**Our numbers today** (dev machine, `logs/features.log` and `logs/huge.log`; re-run on the reference 8 GB laptop before publishing):

| Task | File | Time |
| --- | --- | --- |
| Open and show rows, count everything | 1 GB, 9,732,075 rows | **0.86 s** |
| Reopen the same file | 1 GB | **0.06 s** |
| Find a word in every row | 1 GB | 1.1 s |
| Filter (country is IN) | 1 GB | 1.1 s (971,018 matches) |
| Export filtered rows to CSV | 971,018 rows | 3.9 s |
| Export filtered rows to Excel | 218,630 rows | 5.6 s |
| Read speed at scale | 120 GB, 1.1 billion rows (in-memory test file) | 2.4 GB/s sustained |

The 120 GB run reads from memory, not disk. For a real disk, claim "about as fast as your drive can read."

**Comparisons we win, and how to show each:**

| Against | What to measure | What the research says |
| --- | --- | --- |
| Excel (open) | Time to see rows + rows kept, on a 2 GB file | "Thinks for ninety seconds"; drops everything past row 1,048,576; sometimes shows nothing |
| Power Query + Data Model | Time from clicking the file to getting a filtered result into Excel, counting clicks | "Slow, very slow"; out of memory; preview hides values |
| Google Sheets | Largest file it accepts | 10M cells is about 330k rows at 30 columns |
| Notepad++ / VS Code | Can it open a 5 GB file at all | Refuses around 2 GB |
| Access | Can it open 5 GB / 300 columns | 2 GB and 255-column caps |
| Cloud tools (Gigasheet, Row Zero, online viewers) | **Upload time** before any work starts | Simple arithmetic: 5 GB at 20 Mbps upload ≈ 33 minutes before row 1, and the data leaves your computer |
| HugeCSV | Open time on the same file and machine | Their own figure is ~309 MB/s; we read at roughly 2 GB/s and up |
| Simple web viewers | Largest file before the tab crashes | ~1–2M rows |

**What not to claim:** don't say we beat DuckDB, Polars or R `data.table` on raw speed unless we test it. Developers will check. For them, the honest win is **time to first answer**: no install, no code, rows on screen in under a second. A chart titled "Seconds until you see your data" (MegaCSV 1, Excel 90+, Power Query minutes, cloud tools 30+ minutes of upload) wins every comparison honestly.

## Features by audience

### Already built: say it louder

| Feature | The quote it answers |
| --- | --- |
| Opens every row; shows the real row count | "Excel… just dumps the rest of the data" |
| Raw values; XLSX keeps zeros and long numbers as text | "lose trailing zero's, spaces"; "STOP F***ING WITH MY DATA" |
| Split at 1,048,575 / 50k / 25k with the header on every part | "Only the first chunk gets the header row"; PowerShell and VBS scripts in replies |
| Splitting that handles quotes and line breaks inside cells | "If you have newlines, escaped or quoted… may be difficult to find" |
| No install, no upload, works offline | "Can I use an external program? No."; "cautious if the data is sensitive" |
| Works on Mac | "HOW DO WE DO IT ON A MAC" / no Data Model on Mac |
| Go to row number | "Problem loading record number 20,343,876 and you need to see… the previous" |
| Instant reopen | "I have to do this on a monthly basis!" |

### New features, ranked

1. **Choose columns** when exporting (and a "hide columns" view). Three threads and the YouTube research. Small to build.
2. **"Is one of…" filter with a pasted list** (paste a column from Excel). Answers the lookup threads without a full join.
3. **Value list with counts** for a column, so people can filter by a value they haven't found yet. This is part of the Phase 3 column profile; ship it early.
4. **"Rows that don't fit" check:** list rows with too many or too few columns, and jump to any of them. A differentiator for developers and anyone importing into a database.
5. **Export the first N rows / a random sample.** Tiny to build. Useful for "send a sample to IT" and for developers preparing test data.
6. **One workbook with a sheet per million rows** (also requested on YouTube).
7. **Keep the latest row per ID** as a dedupe option (Phase 3).
8. **Combine many CSV files with the same columns** (YouTube + "10–15 csv files each month").
9. Later: **Parquet export** (developers converting to load into databases); **refresh a file that's still growing** (one request, low priority).

### By subreddit

| Community | Who | Build or stress | Post or page angle |
| --- | --- | --- | --- |
| **r/excel** | Excel users, finance, admin, students; many on old Office or Mac | Choose columns, pasted-list filter, value list, sheet per million, zeros kept | "No Power Query, no Data Model, works on Mac." r/excel bans lazy AI answers and limits self-promotion: answer the question fully, say you built it, link once. |
| **r/dataengineering** | Engineers handed vendor dumps | Choose columns, rows-that-don't-fit check, quote-safe split, sample, Parquet export later | "Look before you load: inspect a 75 GB vendor file in seconds before writing the pipeline." |
| **r/learnpython, r/Python, r/rstats** | Learners, students, analysts | Go to row from an error message, empty-cell filter, small export for pandas | "Got `Expected 11 fields… saw 12`? See that row in one click." "Check your merge's blank rows without Excel lag." |
| **r/SQL, r/data** | People told to "import it into a database" | Open + inspect structure + bad rows before import | "See what's in it before you import it." |
| **r/csharp, r/rust, r/Backend, r/developersIndia** | Developers building their own readers | Nothing to build; they're a distribution channel | Results only (no engine details, per our rules) |

### By field

| Field | Typical files | What to show |
| --- | --- | --- |
| Finance, accounting, audit | ERP/GL dumps, monthly 2 GB exports | Search everything, sorted unfiltered view, monthly reopen, privacy |
| IT, migration, admin | Old database dumps for a new system | Split for import, zeros and spaces kept, no install |
| Healthcare and public data | CMS NPI file (5+ GB), government data | File-type pages: "Open the NPPES NPI file" with column picking |
| Research and students | Lab, environmental, dissertation data, Kaggle | Mac support, free, plain steps |
| Engineering / test equipment | Machine logs that suddenly grow 50× | "Your data isn't lost, it's just bigger than Excel" |
| Journalism / public records | Campaign finance, court records | Private, search everything |

## Blog plan

Every post follows the template already in the reference doc: the exact message as the title, why it happens with the number, the drop zone, fair alternatives, FAQ. Open each post with **one real story** from this research (anonymized).

| # | Title (draft) | Target search | Story to open with |
| --- | --- | --- | --- |
| 1 | "This data set is too large for the Excel grid": what it means and how to open the whole file | exact message | 105k-row report that still got the error (.xls mode) |
| 2 | Excel "File not loaded completely": your rows aren't lost (yet) | exact message | The 2M-row file that lost everything past row 1,048,576 after saving |
| 3 | Excel opens your big CSV blank? Here's why | "excel opens csv blank / shows nothing" | 20 GB file: "it shows nothing! no error" |
| 4 | How to open a CSV with more than 1 million rows (10 lakh) without Power Query | "more than 1 million rows" | Dissertation student |
| 5 | Open a large CSV on a Mac when Power Pivot isn't there | "open large csv mac" | "I had to use a non-apple laptop" |
| 6 | How to keep only the columns you need from a huge CSV | "delete columns from huge csv" | 4 of 228 columns on Excel 2013, no installs allowed |
| 7 | VLOOKUP against a file with millions of rows | "vlookup large csv" | 400 IDs vs 8 million rows |
| 8 | Split a huge CSV for import without losing leading zeros | "split large csv", "csv leading zeros" | Front-desk task from the CFO |
| 9 | Power Query errors on large CSV files (and a simpler way) | PQ error wording | "1,357,599 rows loaded, 815,889 errors" |
| 10 | How long does it take to open a 2 / 5 / 10 / 20 GB CSV? We timed every tool | size searches | Our benchmark chart |
| 11 | Notepad++ says the file is too big: open it anyway | Notepad++ message | 1.3 GB refusal |
| 12 | pandas "Expected N fields, saw M": find the broken row in seconds | pandas error | 65M-row semicolon file |
| 13 | pandas MemoryError on a big CSV: chunking, Polars, DuckDB, or just look at it | pandas MemoryError | "Unable to allocate 51 GB" |
| 14 | Is it safe to upload your CSV to an online splitter? | "split csv online" | Someone who uploaded a whole company database |
| 15 | How to open the NPPES NPI file (and other giant public datasets) | file name | CMS file, 4 GB laptop |

Posts 10 and 14 are also good link-bait for r/excel and Hacker News.

## How to showcase the app

- **Demo video (60 s), scripted from the research:** drop a 5 GB file with Wi-Fi off → rows in under a second → "find" an ID → filter → pick 4 columns → export to Excel → open in Excel showing a leading zero kept. Each step answers a quote above.
- **Homepage proof lines:** "Opened 9.7 million rows in 0.9 seconds." "Nothing to install. Works on locked-down work laptops and Macs." "Your file never leaves your computer: turn off Wi-Fi and try."
- **Side-by-side clip:** Excel's "too large for the grid" dialog next to MegaCSV showing the true row count.
- **Reddit:** answer the old threads in this data where it truly answers the question. Competitors (csvtitan, superintendent, TextQuery, GS-Base) already do this years later, and Google AI Mode cites these threads. Say you built it, solve the problem in the reply itself, link once.
- **Get listed:** the "Largeish data wrangling" tools gist linked in the 2 GB r/excel thread, plus AlternativeTo next to Delimit, EmEditor, CSView and Easy Data Transform.
- **Competing guide:** the mygems 2026 guide is the page we're up against. It recommends DuckDB (terminal and SQL) first and Power Query second, and offers non-coders nothing on desktop. Our pages fill exactly that gap.

## Tools people recommended

From approximate counts of comment lines in the threads; these are rough. In r/excel: **Power Query and the Data Model** dominate, then **Access**, Python, Power BI and Notepad++. In developer subreddits: **DuckDB** (and DuckDB → Parquet), Polars, SQLite, pandas in chunks, GNU tools (split, awk, sort), Spark. Others mentioned:

- **Desktop viewers/editors:** EmEditor, UltraEdit, Sublime Text, glogg, V File Viewer, CSView, Delimit ($49, Windows only, trial key by email), GS-Base/GS-Calc, Easy Data Transform, Tad, Coco Alemana, TextQuery, Superintendent (SQL), csvTitan, fastcsv, CSVed, a sketchy "Cloudviewer.exe" on MediaFire.
- **Visual pipeline tools:** KNIME, Alteryx, OpenRefine, Tableau Prep, Apache Hop.
- **Cloud:** Row Zero (one mention), Acho Studio, BigQuery. Gigasheet was not mentioned once.
- **Command line:** csvkit, xan, qsv, VisiData, Datasette, clickhouse-local.

What it means: the space is crowded with tools for people who code or install, and nearly empty for "open in a browser, no code". No single tool is the accepted answer in any thread.

## Suggested updates to the reference doc

- Add the **"accidental owner"** persona (front-desk staff, student, engineer) next to Priya and Marcus.
- Add **choose columns**, **pasted-list filter**, **rows-that-don't-fit check** and **first N / sample export** to "What we offer", and move the **column value list** earlier.
- Add the five new problem pages listed above to the struggles table.
- Add an **NPPES NPI** file-type page.
- Add a rule for speed comparisons: own measurements only, and lead with "seconds until you see your data".
