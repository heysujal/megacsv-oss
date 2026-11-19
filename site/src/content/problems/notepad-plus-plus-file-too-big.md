---
title: "Notepad++ “File is too big to be opened”: open it anyway"
heading: "Notepad++ says the file is too big to be opened"
description: "Notepad++ can't open files past its size limit. MegaCSV opens CSVs of any size in your browser as a table, with find, go to row and export."
error: "File is too big to be opened by Notepad++"
where: "Notepad++"
checked: 2026-11-02
date: 2026-11-02
draft: false
faq:
  - q: "What's Notepad++'s limit?"
    a: "The 32-bit version stops around 2 GB, often less in practice; the 64-bit version can open larger files but slows down a lot."
  - q: "Can I search the whole file?"
    a: "Yes. MegaCSV's Find searches every row, with match case, and next and previous match."
  - q: "Can I jump to a line number?"
    a: "Yes: Go to row takes any row number (Ctrl/Cmd+G)."
related: ["open-large-csv-without-excel", "pandas-expected-fields-saw", "excel-not-responding-large-csv", "vs/hugecsv", "blog/search-every-row-large-csv"]
---

Notepad++ refuses files above its size limit, and slows to a crawl on big ones it does open. For a CSV, open it in [MegaCSV](/app/) instead: it shows the file as a table at any size, with Find across every row and Go to row.

## Why it happens

Notepad++ loads the whole file into memory to edit it. The 32-bit build is capped around 2 GB; the 64-bit build goes further but needs a lot of memory and time for multi-gigabyte files.

## Open it with MegaCSV

1. Drop the file on [MegaCSV](/app/).
2. **Find** (Ctrl/Cmd+F) searches the whole file; **Go to row** (Ctrl/Cmd+G) jumps to any row.
3. Double-click a cell to see its full value; **Export** to save the rows you need.

MegaCSV is a viewer, not an editor: it never changes your file.

## Other ways

- **64-bit Notepad++** with plenty of RAM, for files up to a few GB.
- **EmEditor** (Windows, paid) or `less` in a terminal for very large text files.
