---
title: "CSV shows Ã©, ï»¿ or ? characters: fix the encoding"
heading: "Strange characters in your CSV (Ã©, ï»¿, question marks)"
description: "Garbled characters mean the CSV was read with the wrong encoding. MegaCSV detects UTF-8, Windows-1252 and UTF-16 and shows the text correctly."
checked: 2026-11-02
date: 2026-11-02
draft: false
faq:
  - q: "What does ï»¿ at the start of the first column mean?"
    a: "It's a UTF-8 byte order mark read as Windows text. MegaCSV recognizes it and doesn't show it as part of the first column name."
  - q: "Which encodings does MegaCSV handle?"
    a: "UTF-8 (with or without a byte order mark), Windows-1252, and UTF-16, which it converts to UTF-8 in your browser first."
  - q: "Will the Excel export show accents correctly?"
    a: "Yes. Excel files store text as Unicode, so accented letters and other scripts come through."
related: ["csv-opens-in-one-column", "open-csv-gz", "csv-leading-zeros-excel", "blog/excel-changes-csv-data"]
---

Characters like `Ã©` instead of `é`, `ï»¿` at the start, or `?` in place of letters mean the file was read with the wrong text encoding. [MegaCSV](/app/) detects the encoding (UTF-8, Windows-1252 or UTF-16) and shows the text as it was meant to be.

## Why it happens

The same bytes mean different letters in different encodings. A UTF-8 `é` is two bytes; read as Windows-1252 they show as `Ã©`. Excel often guesses Windows text for UTF-8 files without a byte order mark, and UTF-16 files can look empty or full of gaps.

## Fix it with MegaCSV

1. Drop the file on [MegaCSV](/app/). The status line shows the encoding it found, for example "UTF-8" or "Windows text".
2. Check the text looks right, then **Filter** or **Find** as needed.
3. **Export to Excel** for a file that opens correctly in Excel, or as CSV.

## Fix it in Excel

- *Data → From Text/CSV*, then set *File Origin* to *65001: Unicode (UTF-8)*.
- Or re-save the CSV as "UTF-8 with BOM" in a text editor, which Excel then reads correctly on double-click.
