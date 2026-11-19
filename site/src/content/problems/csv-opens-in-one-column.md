---
title: "CSV opens in one column in Excel: why and how to fix"
heading: "Your CSV opens with everything in one column"
description: "Excel uses your region's list separator, so semicolon or tab files land in one column. MegaCSV detects the delimiter itself and shows proper columns."
checked: 2026-11-02
date: 2026-11-02
draft: false
faq:
  - q: "Which delimiters does MegaCSV detect?"
    a: "Comma, semicolon, tab and pipe. The status line shows which one it found, for example “Semicolon separated · UTF-8”."
  - q: "What about numbers with decimal commas, like 21,5?"
    a: "In semicolon files, the number filter reads decimal commas (21,5 and 1.234,5). Values are always shown exactly as written."
  - q: "Will exports keep the semicolons?"
    a: "Yes. CSV exports copy rows byte for byte, with the file's own delimiter."
related: ["csv-garbled-characters", "csv-leading-zeros-excel", "excel-changes-csv-dates", "blog/look-before-you-load-vendor-csv"]
---

Excel splits a CSV on your computer's list separator (a comma in some regions, a semicolon in others), so a file that uses a different one ends up in a single column. [MegaCSV](/app/) detects the delimiter from the file itself (comma, semicolon, tab or pipe) and shows proper columns straight away.

## Why it happens

"CSV" files don't all use commas. European systems often write semicolons, because the comma is their decimal mark; many exports use tabs or pipes. Excel's double-click open uses the regional setting rather than looking at the file.

## Fix it with MegaCSV

1. Drop the file on [MegaCSV](/app/). The columns appear with their names, and the status line says which delimiter was found.
2. **Filter**, **Find** or **Summarize** as usual.
3. **Export to Excel**: the .xlsx file has proper columns no matter which delimiter the CSV used.

## Fix it in Excel

- *Data → From Text/CSV*, then choose the delimiter in the preview.
- Or *Data → Text to Columns* on the single column, choosing *Delimited* and the right character.
- Or add a first line `sep=;` to the file, which Excel reads as the delimiter.
