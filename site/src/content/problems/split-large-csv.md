---
title: "Split a large CSV into smaller files (header on each)"
heading: "How to split a large CSV into smaller files"
description: "Split a CSV of any size into parts of a chosen row count, each with the header row, in your browser. Excel-sized, Salesforce and NetSuite presets."
checked: 2026-11-02
date: 2026-11-02
draft: false
faq:
  - q: "Is my file uploaded to split it?"
    a: "No. Many online splitters upload your file; MegaCSV splits it in your browser, on your computer."
  - q: "Can I split into Excel files instead of CSVs?"
    a: "Yes. Choose Excel (.xlsx); parts default to 1,048,575 rows so each fits in one sheet."
  - q: "Can I split only part of the file?"
    a: "Yes. Filter first; the split applies to the matching rows. You can also keep only some columns or every Nth row."
  - q: "How do the parts download?"
    a: "Together as one .zip file, which can go straight into Downloads. In Chrome and Edge you can choose separate files in a folder instead."
related: ["split-csv-for-salesforce", "split-csv-for-netsuite", "csv-more-than-1-million-rows", "vs/hugecsv", "blog/csv-import-limits"]
---

To split a big CSV, open it in [MegaCSV](/app/), click **Export**, and choose how many rows each file should have: 1,048,575 (fits in Excel), 50,000 (Salesforce), 25,000 (NetSuite) or any number. Every part gets the header row and an exact copy of the original rows, and nothing is uploaded.

## Split it with MegaCSV

1. Drop the CSV on [MegaCSV](/app/).
2. Optional: **Filter** to the rows you want, choose columns under **Columns**, or **remove duplicates**.
3. **Export**, pick CSV or Excel, and set *Split into files of*. The dialog tells you how many files you'll get before you start.

## Other ways to split

- **Command line**: `split -l 1000000 big.csv part_` on Mac or Linux (add the header to each part yourself), or a PowerShell script on Windows.
- **Python**: `pandas.read_csv(..., chunksize=…)` and write each chunk.
- **Online splitters**: check whether they upload your file before using them for anything confidential.
