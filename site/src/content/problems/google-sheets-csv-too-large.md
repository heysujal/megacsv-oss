---
title: "Google Sheets says your CSV is too large: what to do"
heading: "Google Sheets won't import a big CSV"
description: "Google Sheets caps the cells in a spreadsheet and the size of an import. Open the whole CSV in MegaCSV, filter it, and export a part that fits in Sheets."
error: "This action would increase the number of cells in the workbook above the limit of 10000000 cells."
where: "Google Sheets (the number is your spreadsheet's cell limit)"
checked: 2026-11-02
date: 2026-11-02
draft: false
faq:
  - q: "How many rows fit in Google Sheets?"
    a: "It depends on the columns: the limit is on cells, not rows. At 20 million cells, a file with 20 columns fits about 1,000,000 rows; where the older 10 million limit still applies, about 500,000."
  - q: "Do I have to upload my file to use MegaCSV?"
    a: "No. MegaCSV opens the file in your browser and never uploads it, which also helps when the data is confidential."
  - q: "Can I export just some columns to make it fit?"
    a: "Yes. Under Export → Columns, choose “Only the ones I choose…” and tick the columns you need. Fewer columns means more rows fit."
related: ["csv-more-than-1-million-rows", "split-large-csv", "excel-data-set-too-large-for-grid", "blog/keep-only-some-columns-large-csv", "blog/csv-too-big-for-chatgpt"]
---

Google Sheets limits the total number of cells in a spreadsheet, and the size of a file you can import, so a big CSV is refused or cut short. Open the file in [MegaCSV](/app/) instead, filter it down, and export a smaller CSV that fits in Sheets.

## Why it happens

Sheets counts cells (rows times columns) across the whole spreadsheet, empty ones included, and stops at a fixed limit: 20 million cells or 100 MB, according to [Google's help page](https://support.google.com/drive/answer/37603). Google doubled it from 10 million in 2026, and the message still shows the old number on some accounts. A 2 GB CSV is far past both.

## Fix it with MegaCSV

1. Drop the CSV on [MegaCSV](/app/). It opens locally, at any size.
2. **Filter** to the rows you need and, under **Export → Columns**, keep only the columns you need.
3. **Export as CSV** and import that into Google Sheets. The status line shows how many rows matched, so you can check it will fit.

## Other ways to fix it

- **Split the file** into several smaller CSVs and import them into separate spreadsheets.
- **BigQuery** or **Connected Sheets** if your organisation has Google Workspace Enterprise and the data can go to Google Cloud.
