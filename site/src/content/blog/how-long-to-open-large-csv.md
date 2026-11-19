---
title: "How Long Does It Take to Open a Huge CSV? We Timed It"
heading: "How long does it take to open a 1, 5 or 20 GB CSV? We timed it"
description: "Real timings on an 8 GB 2020 MacBook Air: opening, searching, filtering and exporting 1, 5 and 20 GB CSV files, and what other tools can do at those sizes."
date: 2026-11-01
---

People with big CSV files ask the same question before they try anything: *how long will this take, and will my laptop cope?* Reddit threads are full of guesses. "Excel thinks for ninety seconds." "Power Query runs out of memory." "Do I need 32 GB of RAM?"

So we timed it. We opened 1 GB, 5 GB and 20 GB CSV files in [MegaCSV](/app/) on an ordinary laptop, a 2020 MacBook Air with 8 GB of memory, and measured every step: first rows on screen, reading every row, searching, filtering, exporting and reopening.

> **Key takeaways**
> - On an 8 GB MacBook Air, the first rows of every file appeared in **0.1 seconds or less**, including the 20 GB, 192-million-row file.
> - MegaCSV read the files at about **1 GB per second**: 5.1 seconds for 5 GB, 20.2 seconds for 20 GB.
> - Opening the same file again took **0.1 seconds**, whatever its size.
> - Excel would show **2% of the 5 GB file** (its first 1,048,576 rows) and Google Sheets can't take any of these files whole. By our rough estimate from published tests, Power Query needs several minutes to load every row of the 5 GB file.

## The results

| Step | 1 GB | 5 GB | 20 GB |
| --- | --- | --- | --- |
| First rows on screen | under 0.1 s | 0.1 s | under 0.1 s |
| Every row read | 1.3 s | 5.1 s | 20.2 s |
| Find a word | 2.1 s | 5.4 s | 24.0 s |
| Filter | 1.6 s | 8.9 s | 43.0 s |
| Export the filtered rows | 4.2 s | 19.3 s | 82.9 s |
| Open it again later | 0.1 s | 0.1 s | 0.1 s |

**Machine:** MacBook Air (M1, 2020), 8 GB memory, built-in SSD, Chrome, November 2026. Nothing else special: no external drive, no extra memory, no settings changed.

## What we tested, exactly

### The files

Three CSV files of made-up order data, 12 columns each (order ID, date, customer name, email, country, product, quantity, unit price, total, currency, status, notes), about 110 bytes per row:

| File | Size | Rows |
| --- | --- | --- |
| 1 GB | 1,073,741,883 bytes | 9,732,075 |
| 5 GB | 5,368,709,233 bytes | 48,273,484 |
| 20 GB | 21,474,836,488 bytes | 191,964,560 |

### The steps

- **First rows on screen:** from choosing the file to seeing a full screen of rows you can scroll.
- **Every row read:** until the row count is final. You can scroll, search and filter while this runs.
- **Find a word:** searching every row for a customer surname. It appeared in 1,850,296 rows of the 1 GB file and 36,480,568 rows of the 20 GB file.
- **Filter:** keeping rows where *country is IN*. That matched 971,018 rows (1 GB), 4,826,850 (5 GB) and 19,193,683 (20 GB).
- **Export the filtered rows:** writing all the matching rows to a new CSV file and downloading it.
- **Open it again later:** reopening the same file from the recent files list in Chrome or Edge.

## What the numbers mean

**You see your data immediately, whatever the size.** MegaCSV shows the start of the file while it reads the rest, so the first screen of a 20 GB file appears as fast as a 1 GB one. You don't wait for the whole file before you can scroll.

**Reading speed is about 1 GB per second.** 826 MB/s on the 1 GB file, then 1,053 and 1,063 MB/s on the larger ones. That's close to how fast this laptop's drive can read, which means the drive, not MegaCSV, sets the pace. A faster desktop SSD will be quicker; an old spinning hard drive will be slower.

**8 GB of memory is enough for a 20 GB file.** MegaCSV doesn't load the whole file into memory, so the file can be much bigger than the laptop's RAM. That answers one of the most common worries we read: "I have 32 GB and I'm wondering if that is enough." For viewing and filtering a CSV, it's more than enough. So is 8.

**Filtering and exporting scale with the number of matches.** A filter that keeps 10% of a 20 GB file means writing 19 million rows, which takes about a minute and a half. A filter that keeps a few thousand rows finishes much sooner. When a filter matches more than 5 million rows, MegaCSV shows the first 5 million on screen and the export still includes all of them.

**Reopening is instant.** The second time you open the same file in Chrome or Edge, MegaCSV remembers its layout and skips the full read: 0.1 seconds for 20 GB. Useful if you get the same export every month.

## What other tools can do with these files

We timed MegaCSV ourselves. The Excel and Power Query rows below are **rough estimates, not our measurements**. We worked them out from published tests:

- **Excel:** in a [2020 test](https://mjtsai.com/blog/2020/04/02/opening-large-csv-files-in-numbers-10-0/), Excel for Mac opened a 34 MB CSV in 5 seconds. Excel stops at row 1,048,576, which is about 116 MB of these files, so it reads that much and drops the rest. Reddit users describe big files taking longer: "Excel thinks for ninety seconds."
- **Power Query:** in [Andrew Moss's 2021 test](https://andrewmoss.me/how-fast-is-fast-data-load-in-power-query/), loading into the Data Model took roughly half a minute per million rows on a small Windows virtual machine (2 cores, 4 GB). On a [Chandoo forum thread](https://chandoo.org/forum/threads/power-query-performance-29-million-row-csv.55024/), a user loaded over 100 million rows in 15 minutes on an i7 laptop with 32 GB.

Your times will depend on your Excel version, your laptop and your file.

| Tool | 1 GB file (9.7M rows) | 5 GB file (48M rows) | 20 GB file (192M rows) |
| --- | --- | --- | --- |
| Excel, double-click (estimate) | About 15–90 s, then only the first 1,048,576 rows (11%) | Same, 2% of the rows | Same, 0.5% of the rows |
| Power Query into the Data Model, Windows only (estimate) | About 1.5–5 min | About 7–25 min | About 30–90 min, if your laptop has the memory |
| Google Sheets | Too big (100 MB / 20 million cells per spreadsheet) | Too big | Too big |
| Cloud CSV tools | About 7 min to upload at 20 Mbps, before you see a row | About 33 min to upload | About 2 h 13 min to upload |
| MegaCSV (measured) | First rows under 0.1 s; every row read in 1.3 s | First rows 0.1 s; every row in 5.1 s | First rows under 0.1 s; every row in 20.2 s |

The limits are from Microsoft's [Excel specifications](https://support.microsoft.com/en-us/office/excel-specifications-and-limits-1672b34d-7043-467e-8e27-269d656771c3) and Google's [Drive file limits](https://support.google.com/docs/answer/37603). Upload times are arithmetic: 20 megabits per second is 2.5 megabytes per second, a typical home or office upload speed.

Excel's 1,048,576 rows are about 116 MB of these files. Everything after that is left out, and Excel warns that saving the workbook will lose it ([what to do about each Excel limit](/blog/excel-limits-large-files)). Power Query can load more rows into Excel's Data Model on Windows, but it's a different job, building summaries rather than looking at rows ([where Power Query fits](/blog/skip-power-query-large-csv)).

## Try it on your own file

Your numbers will depend on your drive and your file, so the quickest test is your own:

1. Go to [megacsv.com/app](/app/) in Chrome or Edge (Firefox and Safari work too; reopening instantly needs Chrome or Edge).
2. Drop in your CSV. Note how quickly the first rows appear and how long the row count takes to finish.
3. Try **Find** with a value you know is in the file, then a **Filter**, then **Export**.

It's free, there's no signup, and your file is never uploaded.

## Frequently asked questions

### How long does it take to open a 10 GB CSV?

On a 2020 MacBook Air with 8 GB of memory, MegaCSV shows the first rows in about a tenth of a second and reads all of a file at roughly 1 GB per second, so a 10 GB file is fully read in about 10 seconds. You can scroll and search while it reads.

### How much RAM do I need to open a large CSV?

For MegaCSV, very little: it doesn't load the whole file into memory. We opened, filtered and exported a 20 GB file on a laptop with 8 GB. Excel and Python's pandas load everything into memory, which is why they struggle with files close to or bigger than your RAM.

### Why is the export slower than the filter?

The export writes every matching row to a new file. Exporting 19 million rows means writing about 2 GB, which takes longer than reading. Smaller filters export in seconds.

### Will it be faster on Windows?

The speed mostly depends on your drive. A modern laptop or desktop with an SSD, on Windows or Mac, should be similar or faster. Files on a USB stick, a network drive or an old hard drive will read more slowly.
