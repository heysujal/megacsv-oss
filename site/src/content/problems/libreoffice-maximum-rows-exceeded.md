---
title: "LibreOffice “maximum number of rows per sheet was exceeded”"
heading: "LibreOffice: the maximum number of rows per sheet was exceeded"
description: "LibreOffice Calc can't load a CSV past its row limit. Open the whole file in MegaCSV, filter it, and export parts that fit in Calc or Excel."
error: "The data could not be loaded completely because the maximum number of rows per sheet was exceeded."
where: "LibreOffice Calc"
checked: 2026-11-02
date: 2026-11-02
draft: false
faq:
  - q: "How many rows does LibreOffice Calc hold?"
    a: "1,048,576 rows per sheet by default, the same as Excel; very old versions stopped at 65,536. An optional “very large spreadsheets” setting allows 16 million rows, but it's slow on big files and not on by default."
  - q: "Are the rows past the limit lost?"
    a: "They're still in your CSV file. Calc just didn't load them. Don't save over the original."
  - q: "Does MegaCSV work on Linux?"
    a: "Yes, in Chrome, Edge or Firefox."
related: ["excel-data-set-too-large-for-grid", "csv-more-than-1-million-rows", "split-large-csv", "blog/data-logger-csv-too-big-for-excel"]
---

LibreOffice Calc loaded rows until it hit its sheet limit and left the rest out. Open the CSV in [MegaCSV](/app/) instead to see every row, then export the rows you need in parts small enough for Calc or Excel.

## Why it happens

Like Excel, a Calc sheet has a fixed number of rows. A CSV longer than that can't fit, so Calc loads what it can and shows this message. Saving the sheet keeps only the loaded part.

## Fix it with MegaCSV

1. Drop the CSV on [MegaCSV](/app/) in Chrome, Edge or Firefox.
2. **Filter** or **Find** across all rows.
3. **Export as CSV or Excel**, split into files of up to 1,048,575 rows, each with the header row.

## Other ways to fix it

- **Split the CSV** on the command line (`split -l 1000000 file.csv part_`, then add the header back to each part).
- **LibreOffice Base** or another database for querying.
