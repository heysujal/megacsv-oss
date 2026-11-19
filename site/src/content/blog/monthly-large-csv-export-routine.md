---
title: "The Monthly 2 GB CSV Export: A 5-Minute Routine"
heading: "The same 2 GB export every month: a 5-minute routine for finance teams"
description: "A monthly ERP or ledger export too big for Excel? A repeatable routine: open it, check it, filter to what you report on and export Excel-sized files in minutes."
date: 2026-11-01
---

Every month the same thing happens. The ERP, the bank or the billing system produces its export: a CSV of 2 GB, 10 million rows, too big for Excel. Someone has to open it, check it's complete, pull out the rows the report needs and get them into a workbook. Then do it all again next month.

"I spent way too long trying to find something that'll open an 8GB csv," one Reddit user wrote. "I have to do this on a monthly basis!" Others describe the same loop with general-ledger dumps, payment exports and "10–15 CSV files each month, ~25M rows."

The tools people reach for make each month slow. Excel cuts the file at 1,048,576 rows. Power Query works, but the query breaks when a column name or file path changes, and on a Mac there's no Data Model at all ([where Power Query fits](/blog/skip-power-query-large-csv)). Python scripts work until the person who wrote them leaves.

[MegaCSV](/app/) turns it into a short routine anyone on the team can follow, with no install, no formulas and no code.

> **Key takeaways**
> - Open the month's export in MegaCSV and the first rows appear in about a tenth of a second. On an ordinary laptop we timed a 1 GB file fully read in 1.3 seconds and a 5 GB file in 5.1.
> - Check the row count against the source system, filter to the rows you report on, and **Export → Excel** split into files that fit.
> - IDs, account codes and long numbers are written to Excel as text, so leading zeros and digits aren't lost.
> - In Chrome and Edge, reopening the same file later takes **0.1 seconds**, from the recent files list.

## The routine

Print this, or paste it into your team's process notes. It's the same every month.

### 1. Open the new export (10 seconds)

Go to [megacsv.com/app](/app/) in Chrome or Edge and drop the file on the page, or choose it from your computer. Your file is never uploaded, so it works for confidential ledgers and payroll exports too.

The first rows appear straight away. On a 2020 MacBook Air, MegaCSV read files at about 1 GB per second ([the timings](/blog/how-long-to-open-large-csv)), so a 2 GB export is fully read in seconds: we timed 1.3 seconds for 1 GB and 5.1 seconds for 5 GB.

### 2. Check it's complete (1 minute)

Before anyone builds a report on it:

- **Compare the row count** in the status bar with the record count the source system reports, or with last month's. A big drop usually means the export failed partway.
- **Go to row**, type the last row number and check the last row is complete and has the right month's dates.
- **Check the format** shown in the status bar: the delimiter, the encoding and *header row*. If any of them changed from last month, someone changed the export settings, and your formulas downstream may break.

### 3. Filter to what you report on (1–2 minutes)

Choose **Filter**, then **+ Add condition** for each rule. Every condition must match. For example:

- *posting_date* **starts with** `2026-10`: this month's entries only, if dates are written year first.
- *company_code* **is** `IN01`: one entity.
- *amount* **is a number between** 10000 and 99999999: large movements only.
- *cost_center* **is empty**: entries missing a cost center, to send back for correction.

Choose **Apply filters**. The status bar shows how many rows match, such as *412,904 of 10,233,118 rows match*.

Then choose **Save these filters** and give the set a name, such as *Month-end large movements*. Next month, open the new export and pick it from **Saved filters**: MegaCSV finds the columns by name, so the same conditions apply to the new file. Saved sets stay in your browser on that computer.

### 4. Export to Excel (1–2 minutes)

Choose **Export**, then **Excel (.xlsx)**. If more than 1,048,575 rows match, choose **Split into files of: 1,048,575 rows (fits in Excel)**, and each file opens in Excel with the header row on top.

The Excel export keeps values exactly as they were in the CSV: account numbers with leading zeros, IDs longer than 15 digits and dates are written as text, so Excel can't change them ([why this matters](/blog/excel-changes-csv-data)). If the next step is another system rather than Excel, export **CSV** instead: rows are copied byte for byte.

### 5. Coming back to it later (0.1 seconds)

Questions about the numbers always arrive a week later. In Chrome and Edge, the file is in the **Recent files** list on the MegaCSV start screen. Choose it and it opens in 0.1 seconds, even at 20 GB, because MegaCSV remembers its layout. You can search it with **Find** to answer "is this invoice in the export?" without filtering again.

Next month's export is a new file, so it's read again the first time, which takes a few seconds.

## What this replaces

| Step | Before | With MegaCSV |
| --- | --- | --- |
| Open | Excel opens the first 1,048,576 rows and drops the rest; or a Power Query refresh | All rows, first screen at once |
| Check | Hope it's complete | Row count, last row and format at a glance |
| Filter | Rebuild or refresh the query; on a Mac, no Data Model | Pick last month's saved filters |
| Into Excel | Copy and paste in chunks; leading zeros lost | One export, split to fit, values kept as text |
| Questions later | Open it all again | Reopen from Recent files in 0.1 s |

## Frequently asked questions

### How do I open a 2 GB CSV file every month?

Open it in MegaCSV in your browser. It shows the first rows immediately and reads the whole file in a few seconds. Filter to the rows you need and export them to Excel.

### My monthly export has more than 1 million rows. How do I get it into Excel?

Filter it to the rows you report on, then **Export → Excel (.xlsx)** with **1,048,575 rows (fits in Excel)**. If it's still more than that, you get several files, each with the header row.

### Can I save my filters for next month?

Yes. Choose **Save these filters** and name the set. Next month, pick it from **Saved filters** on the new file; columns are matched by name. Sets are saved in your browser, on that computer.

### Will it open faster the second time?

Yes, for the same file in Chrome or Edge: MegaCSV remembers it and reopens it from the Recent files list in about 0.1 seconds. A new month's export is a different file and is read again.

### Does it work on a Mac?

Yes. It runs in Chrome, Edge, Firefox or Safari on Mac, Windows or Linux. Power Pivot and the Data Model aren't available in Excel for Mac, so this is often the simplest way to handle big exports there.
