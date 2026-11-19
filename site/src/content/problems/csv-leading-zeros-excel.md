---
title: "Excel removes leading zeros from CSV: keep them"
heading: "Excel drops leading zeros and turns long numbers into 1.23E+11"
description: "Excel converts CSV values as it opens them, dropping leading zeros and shortening long numbers. MegaCSV shows raw values and keeps them in exports."
checked: 2026-11-02
date: 2026-11-02
draft: false
faq:
  - q: "Does MegaCSV ever change a value?"
    a: "No. It displays exactly what's in the file, and CSV exports copy rows byte for byte."
  - q: "Will the zeros survive an Excel export?"
    a: "Yes. MegaCSV's Excel export writes IDs, codes and long numbers as text, so Excel shows 00123 and full 16-digit numbers."
  - q: "Why are my 16-digit numbers ending in 0?"
    a: "Excel stores numbers to 15 significant digits, so the 16th digit and beyond become 0. Keep such values as text."
related: ["excel-long-numbers-last-digits-zero", "excel-changes-csv-dates", "split-csv-for-salesforce", "blog/excel-changes-csv-data"]
---

Excel turns anything that looks like a number into a number when it opens a CSV, so `00123` becomes `123` and `123456789012` becomes `1.23E+11`. [MegaCSV](/app/) never converts values: it shows exactly what's in the file, and keeps IDs as text when it exports to Excel.

## Why it happens

A CSV has no types; it's all text. Excel guesses a type for each value on open. Postal codes, phone numbers, account numbers and product codes lose their leading zeros, and long numbers are shown in scientific notation or rounded to 15 digits. Saving the CSV from Excel writes the changed values back.

## Fix it with MegaCSV

1. Drop the file on [MegaCSV](/app/). Values appear as written: `00123` stays `00123`.
2. **Filter** or **Find** as needed.
3. **Export**: as CSV (an exact copy of the rows) or as Excel, where codes and long numbers are written as text.

## Fix it in Excel

- *Data → From Text/CSV → Transform Data*, then set those columns to *Text* before loading.
- Or, in Excel 365, turn off *File → Options → Data → Automatic Data Conversion* options for leading zeros and long numbers.
