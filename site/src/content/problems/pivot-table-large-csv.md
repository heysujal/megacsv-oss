---
title: "Pivot table on millions of rows, without the Data Model"
heading: "Totals and counts by group on a CSV with millions of rows"
description: "Excel pivot tables stop at the sheet's row limit unless you use the Data Model. MegaCSV's Summarize counts and totals any column by group, on every row."
checked: 2026-11-02
date: 2026-11-02
draft: false
faq:
  - q: "What does Summarize calculate?"
    a: "For each value of the group column: the number of rows, and for a number column, how many cells are empty or numbers, the total, average, smallest and largest."
  - q: "Can I summarize only some rows?"
    a: "Yes. It works on the sheet you're on, so apply filters first to summarize just those rows."
  - q: "Can I group by two columns?"
    a: "Not yet; Summarize groups by one column. Filter on the second column to break it down further."
  - q: "How many groups can it handle?"
    a: "Up to 1,000,000 groups; any beyond that are counted together as “Other values”. You can download all groups as a CSV."
related: ["vlookup-large-csv", "filter-large-csv-without-excel", "open-large-csv-mac", "blog/monthly-large-csv-export-routine"]
---

A normal pivot table only sees the 1,048,576 rows on a sheet, and the Data Model that gets past it isn't available on Mac. In [MegaCSV](/app/), click **Summarize**, pick a column to group by and a column to total, and you get the row count, total, average, smallest and largest for each group, across every row of the file.

## Why pivot tables run out

Pivot tables read from a sheet or from the Data Model. A sheet has a row limit; the Data Model needs Power Pivot, which is Windows-only, and takes setup and memory.

## Summarize with MegaCSV

1. Drop the CSV on [MegaCSV](/app/) and wait for the status line to show all rows read.
2. Optional: **Filter** to the rows you care about, for example one quarter.
3. **Summarize** → *Group rows by* (for example *country*) → *Totals of* (for example *amount*) → **Summarize**.
4. Sort by most rows, name, largest total or average. Select a group to see its rows, or **Download as CSV** to take the table to Excel.

## Other ways to do it

- **Power Pivot / Data Model** in Excel for Windows.
- **DuckDB or Python**: `GROUP BY` or `groupby().agg()`.
