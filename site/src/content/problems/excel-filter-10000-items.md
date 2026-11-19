---
title: "Excel filter list stops at 10,000 items: filter anyway"
heading: "Excel's filter list doesn't show all items (10,000 limit)"
description: "Excel's AutoFilter list shows at most 10,000 unique values. In MegaCSV you type or paste the values you want, and the filter checks every row of the file."
error: "Not all items showing"
where: "Microsoft Excel, at the bottom of the filter list"
checked: 2026-11-02
date: 2026-11-02
draft: false
faq:
  - q: "Are the missing values gone?"
    a: "No, they're still in the sheet; the dropdown just can't list them. You can still use Text Filters → Contains in Excel."
  - q: "How do I see which values a column has in MegaCSV?"
    a: "Summarize → group by that column. It lists every value with its row count (up to 1,000,000 values), and selecting one filters to it."
  - q: "Can I filter on a list of values?"
    a: "Yes: “is one of” takes a pasted list, one per line."
related: ["filter-large-csv-without-excel", "vlookup-large-csv", "pivot-table-large-csv", "blog/search-every-row-large-csv", "blog/vlookup-list-of-ids-large-csv"]
---

Excel's filter dropdown lists at most 10,000 unique values, so the one you need may simply not be there. In [MegaCSV](/app/) you type the value (or paste a list) instead of picking it, and the filter checks every row of the file.

## Why it happens

The AutoFilter checklist is capped at 10,000 items ([Excel specifications and limits](https://support.microsoft.com/en-us/office/excel-specifications-and-limits-1672b34d-7043-467e-8e27-269d656771c3)). Columns like customer, invoice or SKU easily have more.

## Filter with MegaCSV

1. Drop the file on [MegaCSV](/app/).
2. **Filter** → column → **is** (or **contains**, **starts with**, **is one of**) → type or paste the value.
3. To browse what's in a column, use **Summarize** and group by it: every value with its count. Select one to filter to it.

## In Excel

- Use the search box in the filter dropdown, or *Text Filters → Contains…*, which aren't limited to the 10,000 listed items.
