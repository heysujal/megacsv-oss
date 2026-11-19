---
title: "“Data set is too large for the Excel grid”: what to do"
heading: "This data set is too large for the Excel grid"
description: "Excel stops at 1,048,576 rows and drops the rest. Don't save the file. Open every row in MegaCSV, filter it, and export parts that fit in Excel."
error: "This data set is too large for the Excel grid. If you save this workbook, you'll lose data that wasn't loaded."
where: "Microsoft Excel"
checked: 2026-11-02
date: 2026-11-02
draft: false
faq:
  - q: "Did I lose my data?"
    a: "Not yet. The rows Excel couldn't show are still in your CSV file. They're lost only if you save over the original from Excel, so close it without saving."
  - q: "How many rows can Excel hold?"
    a: "1,048,576 rows and 16,384 columns per sheet in .xlsx files. Older .xls files stop at 65,536 rows."
  - q: "Can MegaCSV put the whole file into Excel?"
    a: "It can export it as several Excel files of up to 1,048,575 rows each, every one with the header row. Usually it's quicker to filter first and export only the rows you need."
  - q: "Is my file uploaded?"
    a: "No. MegaCSV reads the file in your browser, on your computer. Your file is never uploaded."
related: ["excel-file-not-loaded-completely", "csv-more-than-1-million-rows", "excel-too-large-for-grid-small-file", "blog/excel-limits-large-files", "blog/skip-power-query-large-csv"]
---

Your file has more rows than one Excel sheet can hold, so Excel loaded the first 1,048,576 and left the rest out. **Close it without saving**, then open the file in [MegaCSV](/app/), which shows every row and lets you export the part you need as Excel files that fit.

## Why it happens

An Excel sheet holds at most 1,048,576 rows (Microsoft's [specifications and limits](https://support.microsoft.com/en-us/office/excel-specifications-and-limits-1672b34d-7043-467e-8e27-269d656771c3)). A CSV has no limit, so exports from databases, banks, ad platforms and loggers pass it easily. Excel loads what fits and warns you. If you save, the rest is gone from that copy for good.

## Fix it with MegaCSV

1. Open [MegaCSV](/app/) and drop your CSV on the page. The first rows appear in a fraction of a second while the rest is read; a 5 GB file with 48 million rows is fully read in about 5 seconds on a MacBook Air.
2. Find what you need: type in **Find** to search every row, or add a filter such as *Show rows where country is IN*.
3. Click **Export**, choose **Excel (.xlsx)**, and keep **1,048,575 rows (fits in Excel)**. Bigger results become several files, each with the header row.

The status line shows the true row count, so you can check nothing is missing.

## Other ways to fix it

- **Power Query and the Data Model** (Excel for Windows): *Data → From Text/CSV → Load To → Only Create Connection*, ticking *Add this data to the Data Model*. You can then build pivot tables on all rows, but you still can't see more than 1,048,576 of them on a sheet, and it isn't available in Excel for Mac.
- **Split the file** into pieces under the limit with a script or a splitter, then open each piece. Check that the splitter doesn't upload your file.
- **A database or Python** if you'll query the data often.
