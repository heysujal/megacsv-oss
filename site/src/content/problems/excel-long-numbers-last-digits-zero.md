---
title: "Excel changes long numbers' last digits to 0: fix it"
heading: "Excel turns the last digits of long numbers into zeros"
description: "Excel keeps only 15 digits, so 16-digit card numbers and long IDs end in 000. MegaCSV shows the full value and exports it to Excel as text."
checked: 2026-11-02
date: 2026-11-02
draft: false
faq:
  - q: "Can I get the digits back in Excel?"
    a: "Not from a saved file: Excel stored the rounded number. Go back to the original CSV."
  - q: "Does MegaCSV keep all digits?"
    a: "Yes. It shows the text in the file and its Excel export writes long numbers as text, so every digit is kept."
  - q: "Which values are affected?"
    a: "Anything over 15 digits that looks like a number: card and account numbers, IMEIs, long order or tracking IDs."
related: ["csv-leading-zeros-excel", "excel-changes-csv-dates", "split-csv-for-salesforce", "blog/excel-changes-csv-data"]
---

Excel stores numbers with 15 significant digits, so a 16-digit value like `4111111111111111` becomes `4111111111111110`, and longer IDs lose more. [MegaCSV](/app/) shows every value exactly as written and exports long numbers to Excel as text, so no digit is lost.

## Why it happens

Excel converts number-like text to floating-point numbers, which hold 15 digits ([Excel specifications and limits](https://support.microsoft.com/en-us/office/excel-specifications-and-limits-1672b34d-7043-467e-8e27-269d656771c3)). There's no warning. Save the file and the original digits are gone.

## Fix it with MegaCSV

1. Drop the CSV on [MegaCSV](/app/); the full numbers are shown.
2. **Filter** or **Find** as needed (Find matches the exact digits).
3. **Export** to Excel (long numbers written as text) or CSV (byte-for-byte copy).

## Fix it in Excel

- *Data → From Text/CSV → Transform Data*, set the column to *Text* before loading.
