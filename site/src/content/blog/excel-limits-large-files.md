---
title: "Excel Limits: Rows, Columns, Digits and Filters Explained"
heading: "Every Excel limit that breaks a big file (and what to do about each)"
description: "Excel stops at 1,048,576 rows, 16,384 columns, 15 digits and 10,000 filter items. What each limit looks like when you hit it, and how to work past it."
date: 2026-11-01
---

Excel's limits only matter on the day a file hits one. Then you get an error with no explanation, rows that quietly disappear, or a filter list that stops partway through. Most people never find out which limit they hit.

This post lists every Excel limit that big CSV files run into, with Microsoft's numbers, what each one looks like on screen, and how to get past it. For most of them the answer is the same: open the file in [MegaCSV](/app/), which has no row limit, and send only the rows you need back to Excel.

> **Key takeaways**
> - An Excel sheet holds **1,048,576 rows by 16,384 columns** (about 10.5 lakh rows). Older .xls files hold only **65,536 rows**.
> - Excel stores numbers to **15 digits** and shows at most **10,000 items** in a filter list. Neither limit gives a clear warning.
> - If Excel says a file is too large for the grid, **don't save it**: the rows it didn't load are lost when you do.
> - MegaCSV opens files of any size (tested to 20 GB and 192 million rows) and exports the rows you need as Excel files split to fit.

## Excel's limits at a glance

All figures are from Microsoft's [Excel specifications and limits](https://support.microsoft.com/en-us/office/excel-specifications-and-limits-1672b34d-7043-467e-8e27-269d656771c3), except the .xls row limit, which is from Microsoft's page on [data sets too large for the Excel grid](https://support.microsoft.com/en-us/office/what-to-do-if-a-data-set-is-too-large-for-the-excel-grid-976e6a34-9756-48f4-828c-ca80b3d0e15c).

| Limit | Number | What you see when you hit it |
| --- | --- | --- |
| Rows per sheet (.xlsx) | 1,048,576 | "This data set is too large for the Excel grid", or rows just stop |
| Rows per sheet (.xls) | 65,536 | The same message on a file of only ~100,000 rows |
| Columns per sheet | 16,384 (A to XFD) | Columns after XFD are dropped |
| Number precision | 15 digits | Long numbers end in 0s; nothing warns you |
| Characters per cell | 32,767 | Long text is cut off |
| Items in a filter list | 10,000 | Values missing from the filter checkbox list |
| Memory, 32-bit Excel | 2 GB shared by Excel and everything it opens | "Not enough memory" or "Not Responding" |

## 1,048,576 rows: the limit everyone hits

An Excel sheet has exactly 1,048,576 rows. That's about 10.5 lakh, so a "10 lakh row" file just fits and a 15 lakh file doesn't. A CSV has no row limit at all; exports from databases, finance systems and websites routinely run to tens of millions of rows.

When a CSV has more rows than the sheet, Excel loads the first 1,048,576 and shows:

> "This data set is too large for the Excel grid. If you save this workbook, you'll lose data that wasn't loaded."

Older versions say "File not loaded completely" instead. Microsoft's own advice is to **not save the file**, because saving over the original deletes every row Excel didn't load. As one researcher with 1.4 GB of environmental data put it: "Excel… just dumps the rest of the data."

**What to do:** open the CSV in [MegaCSV](/app/) instead. It opens every row and shows the real count, for example "48,273,484 rows" for a 5 GB file, with the first rows on screen in about a tenth of a second. Then:

- **To work with all of it in Excel:** Export → Excel. MegaCSV splits the export into files of 1,048,575 rows plus the header, so each one fits a sheet.
- **To work with part of it:** filter first (for example "country is IN"), then export just the matching rows. A filtered result often fits in one Excel file.

## 65,536 rows: "too large" on a small file

If Excel says your file is too large for the grid and it has only about 100,000 rows, the workbook is in the old .xls format. Each .xls sheet holds 65,536 rows. Excel shows "[Compatibility Mode]" in the title bar when this happens.

**What to do:** save the workbook as .xlsx (File → Save As → Excel Workbook) and open the CSV again, or open the CSV in MegaCSV and export to Excel, which always writes .xlsx.

## 16,384 columns

Wide files are rarer, but survey exports, sensor logs and some vendor dumps have thousands of columns. Excel keeps the first 16,384 (column XFD) and drops the rest. MegaCSV shows every column; use Find to search across all of them.

## 15 digits: the silent one

Excel stores numbers with 15 significant digits. A 16-digit card number or a 19-digit order reference is changed as it opens: everything after the 15th digit becomes 0. There's no error, and formatting the cell afterwards won't bring the digits back.

**What to do:** keep long numbers as text. MegaCSV shows them exactly as written, and its Excel export writes any number longer than 15 digits as text, so Excel keeps every digit. The full story, with leading zeros and dates, is in [Excel keeps changing your CSV](/blog/excel-changes-csv-data).

## 10,000 items in a filter list

Excel's filter drop-down shows at most 10,000 different values. If a column has more (customer names, invoice numbers, SKUs), the rest simply aren't in the list, so you can't tick the one you want. Excel says "Not all items showing" at the bottom of the list, which is easy to miss.

> "Data filter me 10000 limit lagi hai." *(The data filter has a 10,000 limit.)*

**What to do:** in MegaCSV you don't pick from a list; you type the condition. "customer contains Okafor" or "invoice is 4471932" checks every row in the file, whether that's 10 thousand or 100 million.

## 32,767 characters in a cell

Rarely a problem, except for exports with long notes, descriptions or JSON in one column. Excel cuts the text at 32,767 characters. MegaCSV keeps the full value; export to CSV to keep the row exactly as it was.

## Memory: "Not Responding" and "not enough memory"

32-bit Excel shares 2 GB of memory between itself, the workbook and add-ins. Even 64-bit Excel, with no hard limit, slows to "Not Responding" on large files, because it loads every cell into memory and works out a type and format for each one.

> "I struggled for two days and everything I tried ended with Not Responding."

MegaCSV reads the file in pieces instead of loading it all at once, so a 20 GB file opens on an 8 GB laptop. Our timings on a 2020 MacBook Air are in [how long it takes to open a 1, 5 or 20 GB CSV](/blog/how-long-to-open-large-csv).

## Isn't there a setting to raise the row limit?

No. The row and column counts are fixed in the file format. Searches for "increase Excel row limit" mostly turn up row-height tips. The real options are:

1. **Use a tool without the limit** to view, search and filter the whole file, then bring a smaller piece into Excel. This is what [MegaCSV](/app/) is for.
2. **Power Query and the Data Model.** Excel for Windows can load more rows into its Data Model and summarize them with PivotTables. You still can't see or edit those rows in a sheet, and it isn't available in Excel for Mac. See [skip Power Query](/blog/skip-power-query-large-csv) for where it works and where it doesn't.
3. **Split the CSV** into pieces of under 1,048,576 rows. MegaCSV's Excel export does this for you, with the header row on every piece.

## Google Sheets has limits too

Google Sheets allows up to 20 million cells, or 100 MB, per spreadsheet ([Google Drive file limits](https://support.google.com/docs/answer/37603)). At 30 columns that's about 666,000 rows, fewer than Excel. The fix is the same: open the big file in MegaCSV, filter to what you need, and export a CSV small enough to import.

## Frequently asked questions

### What is the maximum number of rows in Excel?

1,048,576 rows per sheet in .xlsx files (Excel 2007 and later), and 65,536 in old .xls files. A workbook can have several sheets, but each sheet has the same limit.

### Is 10 lakh rows too many for Excel?

10 lakh is 1,000,000, which fits under Excel's 1,048,576-row limit with about 48,000 rows to spare. 11 lakh or more won't fit on one sheet. MegaCSV opens the whole file and can export it as several Excel files that each fit.

### What happens to rows past 1,048,576?

Excel doesn't load them. They're still in the CSV file, unless you save over it from Excel, in which case they're deleted. Close without saving and open the file in MegaCSV.

### Why is my Excel filter not showing all items?

The filter list shows at most 10,000 different values. Values past that aren't listed, even though the rows are still there. Type the value into a filter condition instead, in Excel's Text Filters or in MegaCSV, which checks every row.

### Can Excel open a 5 GB CSV?

It can open the file, but it loads only the first 1,048,576 rows, often slowly. MegaCSV opened a 5 GB, 48-million-row CSV in about a tenth of a second on an 8 GB laptop and read every row in 5.1 seconds.
