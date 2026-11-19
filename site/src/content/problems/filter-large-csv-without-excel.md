---
title: "Filter a large CSV when Excel crashes or freezes"
heading: "Filter a large CSV without Excel crashing"
description: "Excel freezes or crashes filtering big files and stops at 1,048,576 rows. MegaCSV filters every row of any CSV in seconds, in your browser."
checked: 2026-11-02
date: 2026-11-02
draft: false
faq:
  - q: "What kinds of filters are there?"
    a: "Contains, is, is one of (paste a list), starts with, is empty, is not empty, is a number between, and is not a number. Add as many as you need; a row shows when it meets all of them."
  - q: "Can MegaCSV sort?"
    a: "Yes. Sort orders the rows by one column, smallest to largest or the other way, at any file size. On a filtered sheet it sorts just the matching rows, and exports keep that order."
  - q: "How fast is it?"
    a: "Filters run on all your processor cores and start while the file is still being read, so matches appear as the file is read rather than after."
  - q: "Can I save filters for next month's file?"
    a: "Yes. Save these filters keeps them in your browser, by column name, so they work on a new file with the same columns."
related: ["excel-filter-10000-items", "csv-more-than-1-million-rows", "vlookup-large-csv", "blog/csv-too-big-for-chatgpt"]
---

Excel struggles to filter big files: it freezes, runs out of memory, or only sees the first 1,048,576 rows. [MegaCSV](/app/) filters every row of the file in your browser, in seconds, and writes the filter as a plain sentence: *Show rows where vendor contains Acme and amount is a number between 10,000 and 50,000*.

## Why Excel struggles

Excel's AutoFilter works on the rows loaded in the sheet, recalculates as it goes and shows at most 10,000 values in its list. On files near or past the row limit, that means slow filters, crashes, or results that silently miss rows.

## Filter with MegaCSV

1. Drop the file on [MegaCSV](/app/).
2. Click **Filter** and fill in the sentence: column, condition, value. Add more conditions with **and…**, then **Apply filters**.
3. The result opens in its own sheet tab with the match count, and **Export** gives you just those rows as CSV or Excel.

To put the matches in order, click **Sort** and choose a column; the sorted rows open as their own sheet tab.

## Other ways to filter

- **Power Query** (Windows) to filter while loading.
- **Command line**: `grep` or `awk` for simple text filters.
- **DuckDB or Python** for complex queries.
