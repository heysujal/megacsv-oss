---
title: "Open a large CSV without Excel (when Notepad freezes)"
heading: "How to open a large CSV file without Excel"
description: "Notepad, TextEdit and most editors freeze on multi-GB CSVs. MegaCSV shows them as a table in your browser, at any size, with find, filter and export."
checked: 2026-11-02
date: 2026-11-02
draft: false
faq:
  - q: "Why does Notepad freeze?"
    a: "Most editors load the whole file into memory and lay out every line before you can scroll. A multi-gigabyte file is too much for that."
  - q: "Can I see the raw text of a row?"
    a: "Double-click a cell (or press Enter) to see its full value, including line breaks. Export as CSV writes rows byte for byte as they are in the file."
  - q: "Do I need to install anything?"
    a: "No. MegaCSV runs in your browser and your file is never uploaded."
related: ["notepad-plus-plus-file-too-big", "excel-not-responding-large-csv", "open-large-csv-mac", "blog/search-every-row-large-csv"]
---

Text editors like Notepad and TextEdit load the whole file before showing it, so a big CSV freezes them. [MegaCSV](/app/) opens the file as a table in your browser instead, reading it in slices, so you can scroll, search and filter files of any size.

## Why editors struggle

A CSV is plain text, so any editor can open a small one. But editors build the whole document in memory first, and a 5 GB file has tens of millions of lines. Even when an editor manages it, you get raw text with commas, not columns.

## Fix it with MegaCSV

1. Drop the file on [MegaCSV](/app/). Rows appear in columns, with column letters and row numbers, in a fraction of a second.
2. **Go to row** jumps anywhere; **Find** searches every row; **Filter** narrows them down.
3. **Export** the rows you need as CSV or Excel.

## Other ways to fix it

- **Large-file editors** such as EmEditor (Windows, paid) or 64-bit Notepad++ for files up to about 2 GB.
- **Command line**: `head -n 100 file.csv` (Mac/Linux) or `Get-Content file.csv -TotalCount 100` (PowerShell) to peek at the first lines.
