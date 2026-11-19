---
title: "Excel Changing Your CSV Data? Open It Exactly as It Is"
heading: "Excel keeps changing your CSV: zeros, long numbers, dates and strange characters"
description: "Why Excel drops leading zeros, turns long numbers into 1.23E+15, changes dates and garbles characters when it opens a CSV, and how to open the file unchanged."
date: 2026-11-01
---

You open a CSV in Excel and the data is different from the file. Zip code 02134 is now 2134. A 16-digit card number ends in 0. A product code became a date. And if you save the file, those changes are written back for good.

MegaCSV opens the same CSV and shows every value exactly as it is in the file, and its Excel export keeps those values intact. This post explains the five changes Excel makes, why each one happens, and how to get your data into Excel untouched.

> **Key takeaways**
> - Excel doesn't just display a CSV, it **converts** it: text that looks like a number or a date becomes one, and the original is lost.
> - Numbers longer than **15 digits** can't be stored exactly in Excel. Microsoft lists 15 digits as Excel's number precision, so digit 16 onward becomes 0.
> - Saving the file back as CSV writes the changed values over the originals.
> - [MegaCSV](/app/) shows raw values and writes leading zeros, long numbers and dates into its Excel export as text, so Excel leaves them alone.

## The five things Excel changes when it opens a CSV

A CSV file is plain text. It has no idea what a "number" or a "date" is; it's just characters separated by commas. When Excel opens it, Excel guesses a type for every cell, and its guesses are built for typing numbers into a spreadsheet, not for keeping someone else's data intact.

| What's in the file | What Excel shows | Why |
| --- | --- | --- |
| `02134` (zip code) | `2134` | Looks like a number; numbers don't have leading zeros |
| `4111111111111111` (16 digits) | `4.11111E+15`, and the real value ends in `0` | Excel stores at most 15 significant digits |
| `1-2` or `MAR1` | `2-Jan`, `1-Mar` | Looks like a date |
| `03/04/2026` | 3 April or 4 March, depending on your region settings | Day and month order follows your computer's settings, not the file |
| `José` | `JosÃ©` | The file is UTF-8 but Excel read it with another text encoding |
| `a;b;c` | everything in column A | The file uses semicolons; Excel expected commas (or the reverse) |

### 1. Leading zeros disappear

Zip codes, employee IDs, account numbers, part numbers and phone numbers often start with 0. Excel decides they're numbers and drops the zeros. The usual tip is to type an apostrophe first, which works when you type one value, not when you open a file with 2 million of them. One commenter under a popular leading-zeros tutorial put it simply:

> "My file numbers are 8, 9 or even 11 digits long, all with one or two leading zeros, and need to be exact."

### 2. Long numbers lose their last digits

This is the most-searched version of the problem: the top YouTube videos on it have over 1.1 million and 480,000 views. Card numbers, order IDs and bank references are often 16 to 20 digits. Excel's [specifications](https://support.microsoft.com/en-us/office/excel-specifications-and-limits-1672b34d-7043-467e-8e27-269d656771c3) list number precision as **15 digits**, so anything past the 15th digit is replaced with zeros. Changing the cell format afterwards doesn't bring them back, because the digits are already gone.

> "When the number exceeds 15 digits it puts zero on the remaining digits. How to solve that?"

Shorter long numbers (12 to 15 digits) are stored correctly but *displayed* as `1.23457E+11`. That looks harmless until someone saves the file as CSV: what gets saved is the displayed text, so the real digits are lost then.

### 3. Dates change, or text becomes dates

Excel converts anything that looks like a date. That includes values that aren't dates at all, like `1-2` (a size or a range) or `MAR1`. Scientists renamed a set of human genes in 2020, MARCH1 and SEPT2 among them, largely because Excel kept turning their names into dates.

Real dates change too. A file written in the US as `03/04/2026` means March 4. Open it on a computer set to UK or Indian date order and Excel reads 3 April. Nothing warns you, and dates after the 12th of the month stay as text, so one column ends up with a mix of real dates and text.

### 4. Strange characters (Ã©, â€™, ï»¿)

Most CSV files today are saved as UTF-8 text. Excel on Windows often opens them as the older Windows encoding instead, so `é` becomes `Ã©` and a curly apostrophe becomes `â€™`. The data in the file is fine. Excel read it wrong.

### 5. Everything lands in one column

In much of Europe, CSV files use semicolons because the comma is the decimal separator. Excel decides the separator from your computer's region settings, not from the file, so a semicolon file opened on a US computer (or a comma file opened on a German one) arrives as one long column of text.

## The trap: saving the file

Every change above happens when Excel opens the file. **Saving makes it permanent.** If you press Save and keep CSV format, Excel writes what it shows: `2134` instead of `02134`, `4111111111111110` instead of the real card number, `2-Jan` instead of `1-2`.

> "After I saved that file into another CSV file, when I opened the file, those leading zeros were gone again."

If you've already saved over the only copy, the original values are gone. Go back to wherever the file came from and export it again.

## How to open a CSV without Excel changing it

[MegaCSV](/app/) is a free CSV viewer that runs in your browser. It shows every value exactly as it's written in the file. It never converts anything.

1. **Open the file.** Go to [megacsv.com/app](/app/) and drop the CSV on the page, or choose it from your computer. Your file is never uploaded, and files of any size open, including ones far past Excel's 1,048,576-row limit.
2. **Check your values.** Zip codes keep their zeros, long numbers keep every digit, dates stay as written. MegaCSV picks the separator (comma, semicolon, tab or pipe) and the text encoding (UTF-8 or Windows) from the file itself, so columns and accents come out right.
3. **Find or filter if you only need some rows.** Use **Find** to search every row, or **Filter** to keep rows where a column contains, is, or starts with a value.
4. **Export to Excel.** Choose **Export → Excel**. Values Excel would change are written into the workbook as text: anything with a leading zero, any number longer than 15 digits, and dates. When you open the .xlsx, Excel shows them exactly as they were in the CSV.

Two things to know about the Excel export:

- **Dates arrive as text, exactly as written.** That's what keeps 03/04 from flipping. If you need Excel to calculate with them, convert that one column inside Excel, where you can say which order the day and month are in.
- **Long IDs arrive as text too.** You can sort, search and look them up; you just can't add them together, which you'd never want to do with a card number anyway.

If you need a CSV back rather than a workbook, choose **Export → CSV**. MegaCSV copies the original rows byte for byte, so the zeros and digits are kept. Just don't open that new CSV in Excel and save it, or the same changes happen again.

## Other ways to stop Excel changing your data

These work too, with more steps or more limits.

- **Turn off automatic data conversion.** Recent versions of Excel in Microsoft 365 let you switch off the conversions: File → Options → Data on Windows, or Excel → Preferences → Edit on Mac. The options cover removing leading zeros, scientific notation for long numbers and converting text to dates ([Microsoft: Set automatic data conversions](https://support.microsoft.com/en-us/excel/set-automatic-data-conversions)). Older versions don't have them, the setting applies on each computer separately, and the 15-digit precision limit still applies to real numbers.
- **Import instead of opening.** Data → From Text/CSV opens Power Query, where you can set each column's type to Text before loading. It works, but you set it up for each file, and Microsoft notes the automatic conversion settings don't apply to Power Query imports.
- **Rename the file to .txt** to get the old Text Import Wizard, then mark columns as Text one by one. Slow on wide files.

All three still load the data into Excel, so they stop at 1,048,576 rows. For bigger files, see [every Excel limit that breaks a big file](/blog/excel-limits-large-files).

## Frequently asked questions

### Why does Excel remove leading zeros from my CSV?

A CSV has no column types, so Excel guesses. `00123` looks like a number, and numbers don't have leading zeros, so Excel stores 123. Open the file in MegaCSV to see the real values, then export to Excel; values with leading zeros are written as text and keep their zeros.

### Why does Excel change the last digits of my number to 0?

Excel stores numbers with at most 15 significant digits. A 16-digit card number or a 19-digit ID can't fit, so Excel replaces the extra digits with zeros as it opens the file. Formatting the cell afterwards won't recover them. The value has to come into Excel as text, which is what MegaCSV's Excel export does.

### How do I stop Excel from changing dates in a CSV?

Excel reads dates using your computer's region settings, so 03/04 can become 3 April or 4 March. MegaCSV shows dates exactly as written and exports them to Excel as text. You can then convert the column in Excel and choose the day and month order yourself.

### My CSV shows Ã© and â€™ instead of accents and apostrophes. Is the file broken?

Usually not. The file is UTF-8 and Excel read it with an older Windows encoding. MegaCSV detects the encoding from the file, so the characters show correctly, and its Excel export keeps them.

### Can I fix a CSV that Excel already saved?

Only if you still have the original. Once Excel saves the file, the zeros, digits and original date text are replaced in the file itself. Export it again from the system it came from, and open the fresh copy in MegaCSV instead.
