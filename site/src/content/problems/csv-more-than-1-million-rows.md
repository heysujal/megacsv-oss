---
title: "Open a CSV with more than 1 million rows (10 lakh)"
heading: "How to open a CSV with more than 1 million rows"
description: "Excel stops at 1,048,576 rows (about 10.5 lakh) and silently drops the rest. MegaCSV opens every row, in your browser, and exports Excel-sized parts."
checked: 2026-11-02
date: 2026-11-02
draft: false
faq:
  - q: "Does Excel warn me when rows are missing?"
    a: "Not always. Sometimes it shows “too large for the Excel grid”, but often the sheet simply ends at row 1,048,576. Compare the row count with the source to be sure."
  - q: "How many rows can MegaCSV open?"
    a: "There's no row limit. We've tested 192 million rows (20 GB). The practical limit is your computer."
  - q: "Can I get all the rows into Excel?"
    a: "As several files: MegaCSV's Excel export splits at 1,048,575 rows per file, with the header on each."
  - q: "Do I need Power Query?"
    a: "No. MegaCSV opens the file directly, with no formulas or setup."
related: ["excel-data-set-too-large-for-grid", "split-large-csv", "open-large-csv-mac", "blog/excel-limits-large-files"]
---

Excel can't show more than 1,048,576 rows on a sheet (about 10.5 lakh), and anything past that is left out, often without a warning. To see every row, open the file in [MegaCSV](/app/): it has no row limit and runs in your browser.

## Why rows go missing

The row limit is part of Excel's file format. A CSV can be any length, so a file with 3 million rows loses 2 million of them when Excel opens it. If you then save, those rows are gone from that copy.

## Fix it with MegaCSV

1. Drop the file on [MegaCSV](/app/). Rows appear while the rest is read; the status line shows the true count, for example "3,204,118 rows · 14 columns".
2. Use **Go to row** to jump anywhere, **Find** to search all rows, and **Filter** to narrow them down.
3. **Export**: as CSV (an exact copy of the matching rows) or as Excel, split into files that each fit in a sheet.

## Other ways to fix it

- **Power Query + Data Model** (Excel for Windows) for pivot tables on all rows.
- **Split the CSV** into parts of 1,048,575 rows.
- **A database or Python** if you'll query it every day.
