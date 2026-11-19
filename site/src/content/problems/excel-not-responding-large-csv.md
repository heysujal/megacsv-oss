---
title: "Excel “Not Responding” when opening a big CSV"
heading: "Excel freezes or shows “Not Responding” on a big CSV"
description: "Excel freezes on large CSVs because it loads everything into memory first. Open the file in MegaCSV instead: first rows in a tenth of a second, any size."
error: "Microsoft Excel (Not Responding)"
where: "Microsoft Excel title bar"
checked: 2026-11-02
date: 2026-11-02
draft: false
faq:
  - q: "Should I wait or force Excel to quit?"
    a: "If the file is over a few hundred MB or over a million rows, waiting rarely helps: Excel will stop at 1,048,576 rows anyway. Close it and open the file in MegaCSV."
  - q: "Why is MegaCSV fast on the same computer?"
    a: "It reads the file in slices and only turns the rows on screen into cells, instead of loading and formatting every row first. Memory use stays roughly the same whatever the file size."
  - q: "Does it work on a work laptop with no installs allowed?"
    a: "Yes. It runs in Chrome, Edge, Firefox or Safari with nothing to install, and the file is never uploaded."
related: ["excel-not-enough-resources-csv", "excel-data-set-too-large-for-grid", "open-large-csv-without-excel", "blog/how-long-to-open-large-csv"]
---

Excel tries to read, convert and lay out every row before it shows anything, so a big CSV can freeze it for minutes or for good. Open the file in [MegaCSV](/app/) instead: it shows the first rows in about a tenth of a second and reads the rest in the background, whatever the size.

## Why it happens

When Excel opens a CSV it converts every value (numbers, dates, text), builds the sheet in memory and recalculates. A file of several gigabytes needs more memory and time than most laptops give it, and the window stops responding while it works. Even when it finishes, it shows only the first 1,048,576 rows.

## Fix it with MegaCSV

1. Close Excel (don't save if it opened the file partly).
2. Drop the CSV on [MegaCSV](/app/). On a MacBook Air, a 5 GB file shows its first rows in 0.1 s and is read to the last row in 5.1 s.
3. Scroll, **Find**, **Filter**, then **Export** the rows you need back to Excel.

## Other ways to fix it

- **Close other programs** and use 64-bit Excel, which can use more memory. This helps with files near the limit, not with files far past it.
- **Power Query** (Windows): load as a connection only, so Excel doesn't build a sheet.
- **Split the file** first so each part opens on its own.
