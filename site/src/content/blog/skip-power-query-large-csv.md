---
title: "Skip Power Query: Get Rows From a Huge CSV Into Excel"
heading: "Skip Power Query: get the rows you need from a huge CSV into Excel"
description: "Power Query and the Data Model are the usual answer for CSVs over 1 million rows. Where they break, and a 3-step way to filter a huge CSV into Excel."
date: 2026-11-01
---

Ask how to open a CSV with more than a million rows and the answer is almost always the same: "Use Power Query and load it to the Data Model." For many people that's where the trouble starts. The menus are unfamiliar, the preview shows only part of the file, it isn't fully available on a Mac, and getting the rows back out into a sheet or a new CSV is the hardest step of all.

If what you need is *some rows from a big file, in Excel*, there's a shorter path. [MegaCSV](/app/) opens the whole file in your browser, filters it in seconds and exports the matching rows as an Excel file, split to fit if needed. This post shows that path, then covers when Power Query is still the better tool.

> **Key takeaways**
> - Power Query + Data Model can *summarize* more than 1,048,576 rows, but you still can't see, edit or easily export those rows.
> - On a 5 GB, 48-million-row CSV, MegaCSV filtered every row in **8.9 seconds** and exported the 4.8 million matches in **19.3 seconds** on a 2020 MacBook Air.
> - The steps: open the file, add a filter, export to Excel. No queries, no Data Model, no code, and it works the same on Windows and Mac.
> - Keep Power Query for refreshable reports and PivotTables over all rows.

## Why Power Query is the usual answer

Excel sheets stop at 1,048,576 rows. Power Query (Data → Get Data → From Text/CSV) can read a bigger file and load it into the **Data Model**, a store inside the workbook that isn't limited by sheet size. From there you build PivotTables over all the rows. Tutorials on this get hundreds of thousands of views, and for summarizing a big file on Windows it works well.

The trouble is that most people with a huge CSV don't want a PivotTable. They want to **look at the rows**, **find some of them**, and **get those rows into a sheet or a smaller file**. That's where the comments under those tutorials pile up.

## Where it breaks: what people actually report

We read about 900 comments on the most-watched YouTube videos about Excel and big files, and 33 Reddit threads. The same problems come up again and again.

**Getting the data back out.** The most common follow-up question by far:

> "How do you export the 10 million records to a CSV file?"
>
> "Now if I want to remove or replace some data from 2M+ rows using the Data Model, how do I save the modified data to CSV?"

Rows in the Data Model can feed a PivotTable, but there's no simple "save these rows as a file" button. As one Reddit reply put it: "You can build a pivot table off the query but you cannot export it to a new text file."

**The preview shows only part of the file.** The Power Query editor previews the first rows, not the whole file:

> "The data preview has been truncated due to size limits."

That makes it hard to filter on a value you haven't seen yet, which is often the reason you opened the file in the first place.

**Errors on real-world files.** Messy exports produce errors that are hard to trace:

> "It says 1,357,599 rows loaded, 815,889 errors."
>
> "When leaving the query editor I get an error message… creating more rows than the spreadsheet can contain."

The second one happens when the result is loaded to a sheet instead of the Data Model, so the 1,048,576-row limit applies again.

**Mac and older Excel.** Power Pivot and the Data Model aren't available in Excel for Mac. A student writing a dissertation on a 10-million-row file told Reddit: "I had to use a non-Apple laptop to create a data model." On Windows, older versions make it harder still: "didn't work with me, I'm using Office 2016."

**Speed.** "The processing time for 10 million rows will be slow, very slow," one experienced user warned. Another: "it takes 5 minutes+ to load all the rows into a data model."

## The shorter way: filter, then export

Here is the same job in [MegaCSV](/app/). It runs in Chrome, Edge, Firefox or Safari on Windows, Mac or Linux. There's nothing to install, and your file is never uploaded.

### 1. Open the file

Go to [megacsv.com/app](/app/) and drop your CSV on the page. The first rows appear at once and the row count climbs as the file is read. Every row is there, not a preview, and you can scroll or jump to any row number.

### 2. Filter to the rows you need

Click **Filter**, pick a column and a condition, and type the value:

- *country* **is** IN
- *customer* **contains** Okafor
- *invoice_id* **starts with** 2026-
- *notes* **is empty** or **is not empty**
- *amount* **is a number between** 1000 **and** 5000

Add more conditions and MegaCSV keeps the rows that match all of them. The filter checks every row in the file, so values past row 1,048,576, or past the first rows in a preview, are included.

### 3. Export to Excel

Click **Export**, choose **Excel**, and save. If the matches fit in one sheet, you get one .xlsx. If not, MegaCSV writes several files of 1,048,575 rows each, with the header row on every one. Leading zeros, long ID numbers and dates are written as text, so Excel doesn't change them ([why that matters](/blog/excel-changes-csv-data)).

Need a CSV instead, say for another system? Choose **CSV**. MegaCSV copies the matching rows exactly as they were in the original file.

## How long it takes

Timed on a 2020 MacBook Air (M1, 8 GB) in Chrome, filtering on *country is IN*:

| File | Rows | Filter every row | Matching rows | Export the matches |
| --- | --- | --- | --- | --- |
| 1 GB | 9,732,075 | 1.6 s | 971,018 | 4.2 s |
| 5 GB | 48,273,484 | 8.9 s | 4,826,850 | 19.3 s |
| 20 GB | 191,964,560 | 43.0 s | 19,193,683 | 82.9 s |

The full set of timings, including opening and searching, is in [how long it takes to open a 1, 5 or 20 GB CSV](/blog/how-long-to-open-large-csv).

## When Power Query is still the right tool

Power Query is the better choice when:

- **You refresh the same report every week.** A query remembers its steps and reruns them on the new file.
- **You need a PivotTable over every row**, such as total sales by region across 50 million rows. MegaCSV doesn't summarize yet; you can filter to one region and export it, but not build a pivot over the whole file.
- **You're combining several sources**, like a CSV with a database table or a folder of monthly files.

A practical mix: use MegaCSV to look inside the file, find the columns and values you need and check for bad rows, then build the query once you know what's there.

## Frequently asked questions

### How do I open a CSV with more than 1 million rows without Power Query?

Open it in MegaCSV, which has no row limit. You'll see every row, can search and filter all of them, and can export the rows you need to Excel, split into files of 1,048,575 rows if there are more.

### How do I export data from the Data Model to CSV?

Excel has no built-in button for it; the workarounds use DAX Studio, Power Automate or VBA. If the data started as a CSV, it's simpler to skip the Data Model: filter the original CSV in MegaCSV and export the matching rows as CSV or Excel.

### Does Power Query work on a Mac?

Recent versions of Excel for Mac include Power Query, but not Power Pivot or the Data Model, so you can't load more than 1,048,576 rows into a Mac workbook. MegaCSV works the same in any Mac browser.

### Why does Power Query say the preview has been truncated?

The editor previews only part of the file to stay responsive. Filters you add still apply to the whole file when you load it, but you can't see values outside the preview while you build them. MegaCSV shows the whole file, so you can scroll or search for the value first.
