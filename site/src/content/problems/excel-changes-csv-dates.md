---
title: "Excel changes dates in your CSV: stop it"
heading: "Excel changes or reformats the dates in your CSV"
description: "Excel reinterprets dates when it opens a CSV, flipping days and months or turning codes into dates. MegaCSV shows the raw values, unchanged."
checked: 2026-11-02
date: 2026-11-02
draft: false
faq:
  - q: "Why did 03/04 become 4 March?"
    a: "Excel reads dates using your computer's regional format. A file written in month/day order is read as day/month, or the other way round."
  - q: "Why did my product code turn into a date?"
    a: "Values like 1-2 or MAR1 look like dates to Excel, so it converts them. The original text is lost if you save."
  - q: "Does MegaCSV format dates?"
    a: "No. It shows the text in the file exactly. Filters compare that text, so “starts with 2026-07” finds every July 2026 date in ISO format."
related: ["csv-leading-zeros-excel", "excel-long-numbers-last-digits-zero", "csv-opens-in-one-column", "blog/excel-changes-csv-data"]
---

Excel reads anything that looks like a date as a date, using your computer's regional settings, so days and months swap and codes like `1-2` turn into `2-Jan`. [MegaCSV](/app/) shows every value exactly as it's written in the file, so nothing is reinterpreted.

## Why it happens

CSV files store dates as plain text in whatever format the system that wrote them used. Excel converts them on open. If the file's format differs from your regional setting, it gets them wrong, and saving the CSV writes the wrong dates back.

## Fix it with MegaCSV

1. Drop the file on [MegaCSV](/app/) and check the dates are exactly as exported.
2. Filter by text, for example *Show rows where posted_date starts with 2026-07*.
3. **Export as CSV** to pass the rows on unchanged.

## Fix it in Excel

- *Data → From Text/CSV → Transform Data*, set the date column to *Text* (or *Date* with the right locale) before loading.
- Never save over the original CSV from Excel.
