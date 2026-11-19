---
title: "pandas “Expected N fields in line X, saw M”: find the row"
heading: "pandas: Error tokenizing data. Expected N fields in line X, saw M"
description: "One row in your CSV has more fields than the header. Open the file in MegaCSV, go straight to that line, and see what's wrong with it."
error: "ParserError: Error tokenizing data. C error: Expected 11 fields in line 12747725, saw 12"
where: "Python, pandas.read_csv"
checked: 2026-11-02
date: 2026-11-02
draft: false
faq:
  - q: "Is line X the same as the row number in MegaCSV?"
    a: "pandas counts lines from 1 including the header, so line 12,747,725 is data row 12,747,724 in MegaCSV (which numbers data rows from 1). If quoted fields contain line breaks, pandas' line count can drift; look a few rows around it."
  - q: "What usually causes it?"
    a: "An unquoted comma inside a value, a stray quote, or a broken export that merged two lines."
  - q: "Can I skip bad lines in pandas?"
    a: "Yes: read_csv(..., on_bad_lines=\"skip\") or \"warn\", but you'll lose those rows; better to see them first."
related: ["pandas-memoryerror-large-csv", "notepad-plus-plus-file-too-big", "csv-opens-in-one-column", "blog/look-before-you-load-vendor-csv"]
---

pandas found a row with more fields than the header, usually because a value contains an unquoted comma or a stray quote. Open the file in [MegaCSV](/app/), type the line number (minus one, for the header) into **Go to row**, and look at that row directly.

## Why it happens

`read_csv` expects every line to have as many fields as the first. One malformed line, often millions of rows in, stops the whole read. Opening the file to find that line usually fails too, because it's too big for Excel or an editor.

## Find it with MegaCSV

1. Drop the CSV on [MegaCSV](/app/).
2. Press Ctrl/Cmd+G, type the row (pandas' line number minus one), and press Enter.
3. The row is selected; a value spilling into an extra column at the right end shows the problem. Double-click a cell to see its full text.
4. Use **Find** to look for the same pattern elsewhere.

## Fix it in pandas

- `on_bad_lines="warn"` to list every bad line, then decide.
- `quotechar`, `escapechar` or `sep` if the file uses a different convention.
- `engine="python"` gives clearer errors on odd files.
