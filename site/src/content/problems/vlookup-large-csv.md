---
title: "VLOOKUP a list of IDs in a CSV with millions of rows"
heading: "Look up a list of IDs in a huge CSV (the big VLOOKUP)"
description: "VLOOKUP can't reach rows past 1,048,576. Paste your list of IDs into MegaCSV's “is one of” filter to pull every matching row from a file of any size."
checked: 2026-11-02
date: 2026-11-02
draft: false
faq:
  - q: "How many IDs can I paste?"
    a: "There's no fixed limit; thousands are fine. Paste one per line, a row copied from a spreadsheet (tabs), or one line separated by commas."
  - q: "Is the match case-sensitive?"
    a: "No. Values are matched ignoring case and surrounding spaces, so “ab12 ” matches “AB12”."
  - q: "Can MegaCSV join two files, like XLOOKUP returning columns from another file?"
    a: "Not yet. It returns the full matching rows from the big file; you can then bring the columns you need into your small sheet with VLOOKUP, which now works because the export fits in Excel."
related: ["filter-large-csv-without-excel", "excel-filter-10000-items", "pivot-table-large-csv", "blog/vlookup-list-of-ids-large-csv"]
---

VLOOKUP can't search a file Excel can't open, so looking up a list of IDs in a CSV with millions of rows fails. In [MegaCSV](/app/), add a filter *Show rows where customer_id is one of…*, paste your list, and export every matching row as a small Excel file you can work with.

## Why VLOOKUP fails here

VLOOKUP and XLOOKUP only see rows on a sheet, and a sheet stops at 1,048,576. Power Query merges can do it on Windows, but they're slow on big files and take setup. Older Excel versions don't have XLOOKUP at all.

## Look it up with MegaCSV

1. Drop the big CSV on [MegaCSV](/app/).
2. **Filter** → choose the ID column → **is one of** → paste your IDs (from a column in Excel, one per line). The box shows how many values it found.
3. **Apply filters**. The matching rows open in their own sheet tab; **Export** them to Excel.
4. In Excel, VLOOKUP from your list into the exported rows, which now fit on a sheet.

Save the filter with **Save these filters** to run the same lookup on next month's file.

## Other ways to do it

- **Power Query merge** (Windows): load both files as connections and merge on the ID column.
- **DuckDB or SQL**: `SELECT * FROM 'big.csv' WHERE id IN (SELECT id FROM 'ids.csv')`.
