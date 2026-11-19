---
title: "Excel “File not loaded completely”: get every row back"
heading: "Excel says “File not loaded completely”"
description: "Excel shows “File not loaded completely” when a CSV has more rows than a sheet holds. Your rows aren't lost. Open them all in MegaCSV and export what you need."
error: "File not loaded completely."
where: "Microsoft Excel"
checked: 2026-11-02
date: 2026-11-02
draft: false
faq:
  - q: "Where did the missing rows go?"
    a: "Nowhere yet: they're still in the CSV file on your computer. Excel only skipped them. Don't save over the original from Excel."
  - q: "Which versions show this message?"
    a: "Older Excel versions show “File not loaded completely”; newer ones say the data set is too large for the Excel grid. Both mean the file passed the sheet's row limit."
  - q: "How big a file can MegaCSV open?"
    a: "We've tested files up to 20 GB and 192 million rows. There's no row limit; the practical limit is your computer."
related: ["excel-data-set-too-large-for-grid", "csv-more-than-1-million-rows", "excel-opens-csv-blank", "blog/skip-power-query-large-csv"]
---

Excel shows this when a CSV has more rows than one sheet can hold (1,048,576, or 65,536 in old .xls mode), so it stopped partway. Your rows are still in the file: open it in [MegaCSV](/app/) to see all of them, then export the rows you need in Excel-sized parts.

## Why it happens

Excel has a fixed grid. When a file is longer than the grid, older versions load what fits and show "File not loaded completely"; newer versions show "This data set is too large for the Excel grid". Either way the sheet you're looking at is cut off, and saving it makes the cut permanent in that copy.

## Fix it with MegaCSV

1. Drop the file on [MegaCSV](/app/). Rows show up at once, and the status line counts every row as the file is read.
2. Use **Find** to search the whole file, or **Filter** to keep the rows you need.
3. **Export** to Excel. Results bigger than one sheet are split into files of 1,048,575 rows, each with the header.

## Other ways to fix it

- **Power Query** in Excel for Windows can load the file into the Data Model for pivot tables, without showing all rows.
- **Split the CSV** into pieces under the limit and open them one at a time.
- **Python or a database** for repeated analysis.
