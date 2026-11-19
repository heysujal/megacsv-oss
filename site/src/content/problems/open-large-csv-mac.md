---
title: "Open a large CSV on a Mac (no Power Pivot needed)"
heading: "How to open a large CSV file on a Mac"
description: "Numbers stops at 1 million rows and Excel for Mac has no Power Pivot. MegaCSV opens CSVs of any size in Safari or Chrome on your Mac, with nothing to install."
checked: 2026-11-02
date: 2026-11-02
draft: false
faq:
  - q: "Does MegaCSV work in Safari?"
    a: "Yes, Safari 17 and later. For files over 5–10 GB we recommend Chrome or Edge, which can also save exports straight to a folder."
  - q: "Why can't I use the Data Model on my Mac?"
    a: "Power Pivot and the Data Model are Windows-only parts of Excel. Excel for Mac can't load more than 1,048,576 rows onto a sheet."
  - q: "Is anything installed or uploaded?"
    a: "No. It's a web page; your file is read on your Mac and never uploaded."
related: ["csv-more-than-1-million-rows", "excel-data-set-too-large-for-grid", "open-large-csv-without-excel", "blog/how-long-to-open-large-csv"]
---

On a Mac, Numbers holds at most 1,000,000 rows and Excel 1,048,576, and Excel for Mac has no Power Pivot or Data Model for anything bigger. Open the file in [MegaCSV](/app/) in Safari or Chrome instead: it shows every row of any CSV, with nothing to install.

## Why it's harder on a Mac

The usual Windows answer for big files, Power Query plus the Data Model, isn't available in Excel for Mac. Numbers has its own row limit. TextEdit and most editors freeze on multi-gigabyte files. Students and analysts on a Mac are often told to "just use Excel", which can't open the file.

## Fix it with MegaCSV

1. Open [MegaCSV](/app/) in Safari or Chrome and drop your CSV on the page.
2. Scroll, **Find** and **Filter** across every row. **Summarize** counts rows and adds up a column per value, like a simple pivot table.
3. **Export** the rows you need as an Excel file or CSV, split to fit if needed.

## Other ways to fix it

- **Excel for Windows** in a virtual machine or on another computer, with Power Query.
- **Split the file** and open the parts in Numbers or Excel.
- **Python (pandas)** or **DuckDB** in Terminal if you're comfortable with code.
