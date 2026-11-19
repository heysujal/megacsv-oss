---
title: "Data Logger CSV Too Big for Excel? Your Data Isn't Lost"
heading: "Your test data isn't lost, it's just bigger than Excel: opening huge logger and sensor CSVs"
description: "A data logger or test rig wrote a CSV too big for Excel? Open every row, find the test window you need and export it to Excel, without rerunning the test."
date: 2026-11-01
---

The test ran overnight. The press, the logger or the rig saved its CSV as usual, except this time the file is 2.5 GB instead of 40 MB, and Excel won't show you most of it.

That's what happened to one engineering team on Reddit: "Bloody press decided to make a 2.5GB CSV file instead of the usual 40MB one and we would have lost all our thermal cycle data and had to run another cycle at great expense (and embarrassment)."

The data isn't lost. It's all in the file; Excel just can't open more than 1,048,576 rows of it. [MegaCSV](/app/) opens every row in your browser, lets you find the part of the test you need and exports it in pieces Excel can chart.

> **Key takeaways**
> - High sample rates fill Excel quickly: 1,000 samples a second is **3.6 million rows an hour**, so a 20-minute run already passes Excel's 1,048,576-row limit.
> - MegaCSV opens the whole file, shows the first rows instantly and the true row count, and doesn't need more memory than an ordinary laptop has.
> - Filter by time (*timestamp* **starts with** `2026-10-14 13:`) or by value (*temp_c* **is a number between** 180 and 400) to get the part of the test you need.
> - **Export → Excel** writes the rows you kept, split into files of 1,048,575 rows if needed. **Keep: every Nth row** thins a high-rate run so the chart stays responsive.

## Why logger files outgrow Excel

Excel's limit is 1,048,576 rows ([every Excel limit](/blog/excel-limits-large-files)). Logged data reaches it fast, because the row count is samples per second × seconds:

| Sample rate | Rows per hour | Hours until Excel's limit |
| --- | --- | --- |
| 1 per second | 3,600 | about 291 hours (12 days) |
| 10 per second | 36,000 | about 29 hours |
| 100 per second | 360,000 | about 2.9 hours |
| 1,000 per second | 3,600,000 | about 17 minutes |

Then there are the surprises that turn a 40 MB file into a 2.5 GB one: a sample rate left at a debug setting, a run that didn't stop, extra channels switched on, or a firmware update that logs more columns.

When the file is too big, Excel opens the first 1,048,576 rows and warns that the rest wasn't loaded. For a test that heats up slowly, those first rows may be the warm-up, and the part you need is the part Excel left out.

## How to open a huge logger CSV and get the part you need

### 1. Open the file

Go to [megacsv.com/app](/app/) and drop the CSV on the page, or choose it from the USB stick or shared drive. Your file is never uploaded. The first rows appear straight away, and the status bar shows the true row count when the whole file has been read. Check it against what you expect: sample rate × run time.

Many loggers write a few lines of settings (device name, channels, units) before the column headers. If the first rows look like that, they're the logger's preamble, and the real column names are a few rows down. The filter's column list takes its names from the first row, so in that case pick columns by their position.

Loggers set to a European locale often write semicolons between values and commas as decimal points. MegaCSV detects the semicolons and shows *semicolon* in the status bar. Values like `21,5` are shown exactly as written, and in semicolon files the *is a number between* filter reads them as numbers, so *temp_c* **is a number between** `180` and `400` works on `180,25`.

### 2. Look at the whole run

Scroll, or type a row number into **Go to row**, to jump through the test: the start, the end and the middle. To find a moment by its time, use **Find** with part of the timestamp (`13:42:`) or an event the logger writes, like `ALARM` or `STAGE 3`.

### 3. Filter to the window or event you need

Choose **Filter**, then **+ Add condition**:

- **A time window:** *timestamp* **starts with** `2026-10-14 13:` keeps one hour, if timestamps are written year first.
- **A threshold:** *temp_c* **is a number between** 180 and 400 keeps the hot part of a thermal cycle.
- **A stage or status:** *stage* **is** `3`, or *status* **contains** `fault`.

Add more conditions and every one must match. Choose **Apply filters** and the status bar shows how many rows matched.

### 4. Export to Excel and chart it

Choose **Export**, then **Excel (.xlsx)**. If more than 1,048,575 rows matched, the export is split into several files of 1,048,575 rows, each with the header row. Excel slows down with a million-point line chart. Three ways to keep a chart responsive:

- **Narrow the time window** with a filter, for the detail of one event.
- **Thin out the samples:** set **Keep** to *Every 100th row* (or your own number) for the shape of the whole run. At 1,000 samples a second, that's 36,000 rows an hour instead of 3.6 million.
- **Keep only the channels you need:** set **Columns** to *Only the ones I choose…* and tick the timestamp plus the channels you're charting.

If the next step is Python, MATLAB or the vendor's own software, export **CSV** instead: the rows are copied exactly as they were in the original file.

## Before the next test

- **Check the sample rate and channel list** before a long run. The table above tells you whether the file will fit in Excel.
- **Split long runs into several files** if your logger allows it, for example one per hour or per stage.
- **Keep the original CSV.** However you analyse it, the raw file is the record of the test.

## Frequently asked questions

### Excel only shows part of my data logger file. Is the rest lost?

No. Excel stops at 1,048,576 rows, but the file still holds every row. Open it in MegaCSV to see all of it and export the part you need.

### How do I open a CSV with millions of rows from a sensor or test rig?

Open it in MegaCSV in your browser. It shows the first rows immediately, reads the rest at about 1 GB per second on a typical laptop, and lets you filter by time or value before exporting to Excel.

### How do I get one time range out of a big log file?

Use a filter such as *timestamp* **starts with** `2026-10-14 13:` for one hour, then **Export**. For a range that doesn't line up with an hour or a day, add a few conditions, or export a slightly wider window and trim it in Excel.

### Can I reduce the number of rows, for example keep every 10th sample?

Yes. In **Export**, set **Keep** to *Every 10th row*, *Every 100th row* or your own number. MegaCSV keeps the first row, then one in every N, so 1,000 samples a second becomes 10 a second at *Every 100th row*: a file Excel can chart. It works with filters too, so you can thin out just one stage of the test.

### My logger file uses semicolons and decimal commas. Will it open?

Yes. MegaCSV detects semicolon-separated files and shows every value exactly as written, including decimal commas. In those files the *is a number between* filter reads `21,5` and `1.234,5` as numbers, and *is not a number* finds cells like `n/a` or `ERR`.
