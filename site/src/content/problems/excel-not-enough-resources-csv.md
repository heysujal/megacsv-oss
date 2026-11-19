---
title: "Excel “cannot complete this task with available resources”"
heading: "Excel cannot complete this task with available resources"
description: "Excel runs out of memory on big CSV files. MegaCSV opens them in your browser using a few hundred MB, whatever the file size, and exports what you need."
error: "Excel cannot complete this task with available resources. Choose less data or close other applications."
where: "Microsoft Excel"
checked: 2026-11-02
date: 2026-11-02
draft: false
faq:
  - q: "Will more RAM fix it?"
    a: "Sometimes, for files just over what Excel could handle. It won't help with files past 1,048,576 rows, because the sheet itself stops there."
  - q: "Is 64-bit Excel better?"
    a: "Yes. 32-bit Excel is limited to about 2 GB of memory for itself and everything it opens. 64-bit Excel can use much more, but still has the row limit."
  - q: "How much memory does MegaCSV use?"
    a: "It reads the file in slices of at most 16 MB and keeps only a small map of where rows start, so a 20 GB file doesn't need 20 GB of memory."
related: ["excel-not-responding-large-csv", "excel-data-set-too-large-for-grid", "csv-more-than-1-million-rows", "blog/excel-limits-large-files"]
---

Excel ran out of memory while loading or working on your data. For a big CSV, open it in [MegaCSV](/app/) instead: it reads the file in small slices, so memory use stays low even for files of tens of gigabytes.

## Why it happens

Excel keeps the whole sheet, its formatting and any formulas in memory. 32-bit Excel can use about 2 GB in total; 64-bit Excel can use more, but a multi-gigabyte CSV still overwhelms it, and Excel shows this message (or "There isn't enough memory to complete this action") instead of finishing. Wording varies a little between versions.

## Fix it with MegaCSV

1. Drop the CSV on [MegaCSV](/app/). Nothing is uploaded; the file is read on your computer.
2. **Filter** to the rows you need, or pick only the columns you need under **Export → Columns**.
3. **Export** to Excel. The smaller file opens in Excel without running out of memory.

## Other ways to fix it

- **Close other apps** and browser tabs, then try again.
- **Install 64-bit Excel** if your organisation allows it.
- **Load into the Data Model** with Power Query (Windows) instead of a sheet.
