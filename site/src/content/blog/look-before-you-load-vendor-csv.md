---
title: "Check a Huge Vendor CSV Before You Build the Pipeline"
heading: "Look before you load: check a huge vendor CSV before you write the pipeline"
description: "A vendor sent a 75 GB CSV dump. Check its delimiter, encoding, header, row count, columns and dirty values in minutes, before you spend days loading it."
date: 2026-11-01
---

A vendor sends a data dump: one CSV, or seventeen of them, each bigger than your laptop's memory. Before anyone writes a line of pipeline code, someone has to answer basic questions. What's the delimiter? Is there a header row? How many columns, and which ones do we need? Are the dates really dates? Is the last row complete?

One data engineer on Reddit described exactly this: a **75 GB CSV with about 400 columns and roughly 2 billion rows**, "just one of 17 files that need to be ingested." They needed 38 of the 400 columns, and the data was dirty: "alphabetical characters in number fields, special characters in date fields." Their first attempt at loading it would have taken eight days.

Most of that pain is discovered *during* the load, one failed run at a time. [MegaCSV](/app/) lets you find it first: open the file in your browser, see the first rows instantly and check the whole thing before you build anything.

> **Key takeaways**
> - Open the dump in MegaCSV and the first rows appear in about a tenth of a second, whatever the size. In our tests the whole file was read at roughly 1 GB per second on an ordinary laptop.
> - The status bar tells you the **delimiter, encoding and whether there's a header row**, plus the exact **row and column count**.
> - **Go to row** jumps to the middle or the last row, so you can check the end of the file isn't cut off.
> - **Find** and **Filter** search every row for the dirty values that would break your load, and **Export** gives you a small sample file to write your code against.

## Why checking first saves days

A load that fails at row 1.2 billion has already cost you hours. Common surprises in vendor dumps:

- **The wrong delimiter.** "CSV" files arrive separated by semicolons, tabs or pipes.
- **The wrong encoding.** A file exported from an older Windows system is often Windows-1252, not UTF-8, so names with accents break.
- **No header, or a header that doesn't match the spec** you were sent.
- **Duplicated rows** from outer-joined tables, which make the row count far bigger than expected.
- **Text in number columns** ("N/A", "n.a.", "-") and odd date formats.
- **A truncated last row**, because the export or the transfer stopped early.

The usual tools struggle to show you any of this. Excel stops at 1,048,576 rows ([every Excel limit](/blog/excel-limits-large-files)). Text editors freeze or refuse multi-gigabyte files. `head` shows the first lines, but not the middle or the end of a file with quoted line breaks, and not a count of how many rows have a bad value.

## How to check a vendor CSV with MegaCSV

### 1. Open it

Go to [megacsv.com/app](/app/) and drop the file on the page. It works in Chrome, Edge, Firefox and Safari; for very large files, Chrome or Edge is best. Your file is never uploaded, and nothing is installed.

The first rows appear straight away while MegaCSV reads the rest. You can scroll, search and filter before the read finishes.

### 2. Read the status bar

At the bottom of the screen MegaCSV shows what it found:

- **Rows and columns**, for example *1,982,445,120 rows · 412 columns*. Compare them with what the vendor promised. A row count far above the expected number of records is the first sign of duplication.
- **Delimiter**: comma, semicolon, tab or pipe, detected from the file.
- **Encoding**: *UTF-8* or *Windows text*. If accented names look wrong, the vendor's export used a different encoding from the one in their spec.
- **Header row** or **no header**.

Write these down for the loader's configuration.

### 3. Look at the start, the middle and the end

Type a row number into **Go to row** and press Enter. Check:

- **Row 1 and the first screen**: the header and the shape of the data.
- **A row in the middle**, such as row 1,000,000,000: is it still the same layout, or does the export change format partway through?
- **The last row**: is it complete, or cut off? A truncated last row means the file you received isn't the whole export.

If your loader reports an error "on line 12,747,725", go straight to that row and look at it and the rows around it.

### 4. Search every row for dirty values

Open **Find** and type a value you suspect, such as `N/A`. MegaCSV searches the whole file and shows how many rows match. Tick **Show only matching rows** to see them all together.

Then use **Filter** for column-level checks:

- *customer_id* **is empty**: rows missing their key.
- *amount* **is a number between** 0 and 1000000: compare the count with the total, and the difference is rows with text, blanks or out-of-range values in that column.
- *order_date* **starts with** `20`: a quick test of whether dates use the format you expect. Rows that fail it need a closer look.

The counts tell you how much cleaning the load will need.

### 5. Export a sample to build against

Filter to a representative slice (for example, one month of *order_date*, or a few customers), then choose **Export → CSV**. You get a small file with the same header and rows copied byte for byte from the original: the same quotes, delimiters and odd values as the full dump. Write and test the pipeline on that, then run it once on the real thing.

If business users need to see some of the data, **Export → Excel (.xlsx)** writes values like IDs with leading zeros and long numbers as text, so Excel doesn't change them ([what Excel changes and why](/blog/excel-changes-csv-data)).

## Doing the same checks in code

If you'd rather stay in a terminal, these get you part of the way:

- `head -n 5 file.csv` shows the first lines (not the first *rows*, if values contain line breaks).
- `wc -l file.csv` counts lines, which is only the row count if no value contains a line break. On a 75 GB file it takes a while.
- `tail -n 5 file.csv` shows whether the end of the file is complete.
- DuckDB or Python can sniff and query the file, once you know enough about it to write the query.

These are fine for the first look. MegaCSV is faster when you need to scroll, jump around, search everything and see counts without writing code for each question.

## Frequently asked questions

### How do I open a 75 GB CSV file?

Open it in MegaCSV in Chrome or Edge. It doesn't load the whole file into memory, so the file can be much bigger than your RAM: the first rows appear straight away and you can scroll, search and filter while the rest is read. We've timed files up to 20 GB ([the results](/blog/how-long-to-open-large-csv)); bigger files work the same way and take longer to read in full. Excel shows only the first 1,048,576 rows, and most text editors refuse files that size.

### How can I tell a CSV's delimiter and encoding?

Open it in MegaCSV and read the status bar: it shows the delimiter (comma, semicolon, tab or pipe), the encoding (UTF-8 or Windows text) and whether the first row is a header.

### How do I check if a big CSV file is complete?

Use **Go to row** to jump to the last row and check it isn't cut off, and compare the row count in the status bar with the number of records the sender expected.

### How do I find rows with bad values in a huge CSV?

Use **Find** to search every row for a value like `N/A`, with **Show only matching rows** ticked, or a **Filter** such as *is empty* or *is a number between* on one column. MegaCSV shows how many rows match, and you can export them to a separate file.
