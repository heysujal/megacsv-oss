---
title: "“Too large for the Excel grid” on a small file? (.xls)"
heading: "Excel says “too large for the Excel grid” for only 100,000 rows"
description: "Excel in compatibility mode (.xls) holds only 65,536 rows. Save as .xlsx, or open the CSV in MegaCSV and export an .xlsx that fits."
error: "This data set is too large for the Excel grid. If you save this workbook, you'll lose data that wasn't loaded."
where: "Microsoft Excel, in compatibility mode"
checked: 2026-11-02
date: 2026-11-02
draft: false
faq:
  - q: "How do I know I'm in compatibility mode?"
    a: "The title bar says “Compatibility Mode”, or the workbook ends in .xls. Those sheets stop at 65,536 rows and 256 columns."
  - q: "Will saving as .xlsx fix it?"
    a: "For files under 1,048,576 rows, yes: create a new .xlsx workbook and import the CSV into it. Bigger files need MegaCSV or splitting."
  - q: "What does MegaCSV export?"
    a: "Modern .xlsx files, up to 1,048,575 rows each."
related: ["excel-data-set-too-large-for-grid", "csv-more-than-1-million-rows", "excel-file-not-loaded-completely", "blog/excel-limits-large-files"]
---

If Excel says your data is too large with only about 100,000 rows, it's working in the old .xls format (compatibility mode), which holds just 65,536 rows. Import the CSV into a new .xlsx workbook, or open it in [MegaCSV](/app/) and export a modern .xlsx file.

## Why it happens

The .xls format from Excel 97–2003 stops at 65,536 rows and 256 columns. If you open the CSV from an .xls workbook, a template, or an Excel set to save in the old format, those limits apply even in new versions.

## Fix it with MegaCSV

1. Drop the CSV on [MegaCSV](/app/).
2. **Export → Excel (.xlsx)**. Files up to 1,048,575 rows come out as one modern workbook.

## Fix it in Excel

- Create a new blank workbook (File → New), save it as .xlsx, then *Data → From Text/CSV*.
- Check *File → Options → Save → Save files in this format* is set to *Excel Workbook (*.xlsx)*.
