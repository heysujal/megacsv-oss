# YouTube research: what people search for and struggle with

Oct 31, 2026 · Data from the YouTube Data API

## Summary

People with CSV files too big for Excel are being taught one answer on YouTube: **Power Query plus Excel's Data Model**. It works for some, and the comments show where it fails: it's confusing, it breaks on older Excel and on Mac, and above all **it gives no easy way to get the data back out**. The most common follow-up questions are "how do I export these rows to CSV" and "how do I split this into new sheets automatically". MegaCSV's export and auto-split answer those directly.

There is **no dedicated tool** in the large-file results, and the focused videos get modest views (12k–173k). That makes YouTube both evidence of the pain and an open distribution channel: a few short videos that solve these exact searches with MegaCSV would face little competition.

## Method

- **25 searches** written the way our users would phrase them, such as "open csv with more than 1 million rows", "data set too large for the excel grid", "split csv for salesforce import" and "pandas read large csv memory error".
- **Up to 15 videos per search:** 257 unique videos, with views, likes and comment counts.
- **Top 200 comments by relevance** on the 4 most-viewed videos per search: 70 videos, **3,127 comments plus 1,576 replies**.
- **Close reading of the 17 videos actually about large files or row limits** (899 comments). The rest of the results were off-topic.
- Scripts are in `scripts/research/`. Raw data goes in `research-data/` (gitignored; it contains commenters' names, so it is never published). Quotes below are anonymous and lightly trimmed.

**Limits:** YouTube's search ranking mixes in popular but unrelated Excel videos ("print on one page", "compress PDF"), so per-search view totals overstate demand. Comments come from people who watched a tutorial, so they lean toward people who were helped. Keyword counts are rough, and every quote below was read in context.

## What the search results tell us

| Search | Best on-topic video | Views |
|---|---|---|
| excel more than 1 million rows | 10 Million Rows of data Analyzed using Excel's Data Model | 172,768 |
| how to handle millions of rows in excel | How to handle more than million rows in Excel (Chandoo) | 105,764 |
| open large csv file | MySQL: importing large CSV files with LOAD DATA | 114,991 |
| excel 1048576 rows limit | excel power query: how to upload more than 10 lakh rows | 74,326 |
| pandas read large csv memory error | Handle Large Datasets in Pandas (codebasics) | 74,017 |
| open large csv file | Big Data 1: How to Open a Too-Large Data File in Excel | 33,865 |
| excel 1048576 rows limit | How to Get Past Excel Row Limit | 19,015 |
| duckdb large csv | Exporting CSV files to Parquet (Learn Data with Mark) | 16,217 |

- **Every on-topic answer is a workaround:** Power Query, Data Model, MySQL, pandas. None is a tool for simply opening, filtering and exporting.
- **Off-topic videos dominate several searches.** "how to open 10gb csv file" returns file-compression videos. People searching this way find nothing useful, which is a gap a MegaCSV video could fill.
- **AI is pulling attention:** "How I Tricked ChatGPT into Analyzing MASSIVE Datasets" has **1.19M views**. It came up for "analyze large csv file without coding".
- **Commonly searched problems that MegaCSV already handles** (huge view counts, but on small files): leading zeros dropped (1.4M views), CSV opening in one column (1.4M), splitting text into columns.

## What people struggle with

### 1. Getting data back out of Power Query and the Data Model
The most frequent unmet need on the large-file videos (~32 comments ask about exporting or saving to CSV):
> "How do you export the 10 million records to a csv file?"
> "How to convert this data model in CSV or this combined data into CSV"
> "Now if i want to remove some data or replace some data from +2 M rows using data model. How to save the modified data to csv after this change?"
> "I want to manipulate the data (columns) and save it in CSV. Please help"

**MegaCSV:** filter, then export to CSV or Excel. Already built.

### 2. Splitting across sheets when the limit is hit
> "For 3.5 million records I want as soon as it reaches that limit the next rows create new tabs and moves there and so on."
> "How to load data in new sheets if row exceeds excel rows."
> "Currently I'm breaking my CSV file up with a macro to make it manageable in Excel."
> "Does it work if a sheet has multiple tabs with more than 1 million rows or should I split data between different files?"

**MegaCSV:** export already splits at Excel's limit into **separate files**. **New idea:** offer "one workbook, one sheet per million rows", since people ask for tabs specifically.

### 3. Power Query is the official answer, and it's hard
> "Transform data is not showing for me. Any ideas why?"
> "Tried to follow the process but when leaving the query editor I have an error message … creating more rows than the spreadsheet can contain."
> "It says 1,357,599 rows loaded, 815,889 errors."
> "I have a .CSV file with 52 lakh rows, I am unable to filter through query editor, please help"
> "Data filter me 10000 limit lagi hai" *(Excel's filter list stops at 10,000 items)*
> "it does not work... waste of time watching this video"
> "didn't work with me, I'm using Office 2016"

**MegaCSV:** no menus to learn; filters work on all rows. This is the core message: *"Skip Power Query."*

### 4. Excel freezing, "Not responding"
> "I struggled for two days and everything I tried end with not responding."
> "I have files so large that they respond slowly and then eventually crash."

### 5. Code-based workarounds fail for non-coders
- **MySQL:** ~20 comments are setup errors ("Error Code 1290 … secure-file-priv"), plus imports that "take several hours" or never finish ("6 million rows … about 4 GB … it lasts forever").
- **pandas:** "Unable to allocate 51 GB of memory"; "If 900 KB file is huge then what about 2.9 GB file?"

These are people who don't code being pushed to code. They're our core user.

### 6. Privacy pushback on the AI route
On the 1.19M-view ChatGPT video, 15 comments raise privacy:
> "But isn't exposing your company data to ChatGPT a big issue?"
> "Why would someone load company data into ChatGPT?"
> "GOOD but there is data privacy issue here."

**MegaCSV:** "Nothing leaves your computer" answers this directly.

### 7. Smaller but specific asks
- **Only some columns:** "1.2 million rows and ~300 columns. I want to extract only a few particular columns." Export doesn't offer column selection yet.
- **Lookups against big data:** "Could you search or look up against those numbers? A large VLOOKUP." This is the planned join feature.
- **Combining many files:** "200 csv files with over 30 million rows combined"; a "merge CSV files" trick has 97k views, and "merge Excel files" shorts reach 700k. Merging comes up in ~72 comments. Not in our plan yet.
- **Mac:** "HOW DO WE DO IT ON A MAC!?" (Power Query is limited on Mac.)
- **Hardware worries:** "How much RAM does your PC have? I have 32 GB and I'm wondering if that is enough." Our planned "your computer can handle about X" message fits.

### Sizes people mention
Mostly **1–20 million rows** (32 mentions) and **0.1–5 GB** (19), with a tail of 20–100 GB and 100M+ rows. That matches our targets: most users are in the low GBs, where MegaCSV is instant.

## Who's asking
- **India is a large share:** about 100 comments in Hindi or Hinglish, and searches use **"lakh"** ("10 lakh rows", "52 lakh rows").
- **Accountants and finance** show up repeatedly: general ledger exports, "as an accountant I go into details", sales data.
- **Students and analysts** learning SQL and pandas, often for a course case study (for example the Google Analytics certificate).

## What this means for MegaCSV

**Product, in order of evidence:**
1. **Export is the hero feature.** Lead with "filter, then export to Excel or CSV." Already built.
2. **Add "one workbook, one sheet per 1,048,576 rows"** as an export option. Requested in those exact words.
3. **Add column selection to export** ("export only these columns").
4. **Plan "combine many CSV files into one"**, a strong and frequent ask that isn't in the roadmap.
5. **Join / lookup** (already Phase 5) has real demand.
6. **Device message** ("your computer can comfortably handle about X GB") answers the RAM worries.

**Marketing:**
- **Make short YouTube videos for searches with weak answers:** "excel more than 1 million rows", "excel 1048576 rows limit", "how to open 10gb csv file", "data set too large for the excel grid". Show the file opening, a filter and an Excel export in under 60 seconds, with Wi-Fi off.
- **Position against Power Query by name:** "No Power Query, no Data Model, no code."
- **Indian-language keywords:** add problem pages for "10 lakh rows" and "more than 10 lakh rows in Excel", and consider Hindi/Hinglish video titles.
- **Privacy angle for the AI crowd:** "Analyze huge files without uploading them to ChatGPT."
