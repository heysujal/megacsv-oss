---
title: "Search Every Row of a Multi-GB CSV Export"
heading: "Sometimes you just need to see it: searching every row of a multi-GB CSV export"
description: "Auditing a ledger, debugging an import or checking one record in a 20 GB CSV? Search every row and see the matches in seconds, without Excel's row limit."
date: 2026-11-01
---

Ask online how to open a 20 GB CSV and someone will tell you not to. "Opening 20gb csv makes no sense, humans can't read that amount of information," says one Reddit reply with 46 upvotes.

Nobody reads 20 GB end to end, but plenty of people need to look things up in it: an auditor checking a supplier's payments, a developer whose import failed on one record, an analyst asked "is customer 4471 in the export or not?" As someone in that same thread replied: "I do 100% expect at least one user to use ctrl-f on that. Distrustful users prefer to see sorted but unfiltered data so they can spot suspicious movements."

Another asked the question every debugger knows: "What if there is a problem loading record number 20,343,876 and you need to see if the issue is that record or the previous?"

[MegaCSV](/app/) is built for that: open the whole file in your browser, search every row, and jump to any row by number.

> **Key takeaways**
> - Excel can only search the rows it loaded: the first **1,048,576**. A match in row 2 million is never found, and Excel doesn't tell you.
> - In MegaCSV, **Find** searches every row. On an 8 GB laptop it searched a 5 GB file in **5.4 seconds** and a 20 GB file in **24 seconds**, and shows how many rows match.
> - **Show only matching rows** turns the search into a list you can scroll and export.
> - **Go to row** jumps straight to record 20,343,876, with the rows before and after it on screen.

## Why Ctrl+F fails on big files

**Excel searches what it loaded, not what's in the file.** A CSV with more rows than 1,048,576 opens with a warning and the rest left out. Find then says "We couldn't find what you were looking for" for anything past that row. In an audit, that means a missing payment can look like it was never made ([every Excel limit that breaks a big file](/blog/excel-limits-large-files)).

**Text editors freeze or refuse.** Notepad and most editors try to load the whole file. Multi-gigabyte files either take minutes, hang, or stop with an error such as Notepad++'s "File is too big to be opened by Notepad++".

**Command-line search finds lines, not records.** `grep` is fast, but it prints matching lines without the header or neighbouring rows, and a value with a line break inside quotes is split across two lines. Fine for a developer, not for someone who has to show the record to a colleague.

## How to search every row with MegaCSV

1. **Open the file.** Go to [megacsv.com/app](/app/) and drop the CSV on the page. The first rows appear straight away; the status bar shows the row count while the rest is read. Your file is never uploaded.
2. **Open Find** with the **Find** button or Ctrl+F (Cmd+F on a Mac) and type what you're looking for: an invoice number, a name, an account, an error code. MegaCSV searches every row and shows the count as it goes, for example *1,284 matching rows*.
3. **Step through the matches** with ↑ and ↓ (or Enter and Shift+Enter). Each match is shown in place, with the rows around it.
4. **Tick Show only matching rows** to see every match together, with the header row on top.
5. **Tick Match case** if capital letters matter, for example to tell `ABC` from `abc`.

Need the matches somewhere else? **Export** writes them to a CSV copied byte for byte from the original, or to an Excel file with IDs and long numbers kept as text.

### Find one record by row number

If an error message names a row ("problem loading record 20,343,876", "Expected 11 fields in line 12,747,725"), type the number into **Go to row** and press Enter. You land on that row with the previous and next rows on screen, which is usually where the real problem is: a missing quote on the row before, or a value with an extra comma.

### Narrow it down with filters

Find looks for text anywhere in the row. When you know the column, a **Filter** is more precise. Choose **Filter**, then **+ Add condition**:

- *vendor* **is** `Acme Industrial Supply`: every payment to one supplier.
- *amount* **is a number between** 9000 and 9999: payments just under a 10,000 approval limit, a classic audit check.
- *approved_by* **is empty**: transactions nobody signed off.

Add more conditions and every one must match. Choose **Apply filters**, and the status bar shows how many rows match out of the total, such as *312 of 48,273,484 rows match*.

## How fast is it?

Timed on a 2020 MacBook Air with 8 GB of memory, searching every row for a customer surname:

| File | Rows | Find |
| --- | --- | --- |
| 1 GB | 9.7 million | 2.1 s |
| 5 GB | 48.3 million | 5.4 s |
| 20 GB | 192 million | 24.0 s |

The first matches appear before the search finishes, so you can start looking straight away. Full results and method: [How long does it take to open a 1, 5 or 20 GB CSV?](/blog/how-long-to-open-large-csv)

## Frequently asked questions

### How do I search a CSV file that's too big for Excel?

Open it in MegaCSV and use **Find**. It searches every row, not just the first 1,048,576, and shows how many rows match. Tick **Show only matching rows** to list them all.

### Why can't Excel find a value I know is in my CSV?

If the file has more than 1,048,576 rows, Excel didn't load the rest, so Find can't see them. Other causes: Excel changed the value as it opened the file, for example dropping leading zeros or rounding a long number ([what Excel changes](/blog/excel-changes-csv-data)). MegaCSV shows the raw value.

### How do I go to a specific row in a large CSV file?

Type the row number into **Go to row** in MegaCSV and press Enter. It works on any row, including ones far past Excel's limit.

### Can I export only the rows that match my search?

Yes. Tick **Show only matching rows**, or apply a **Filter**, then choose **Export**. You can save the matches as CSV or Excel, and split them into files that fit in Excel if there are more than 1,048,575.

### Is it safe to search confidential files this way?

The file is opened in your browser and never uploaded, so an audit file or a customer list doesn't leave for someone else's server.
