---
title: "VLOOKUP a List of IDs Against Millions of Rows"
heading: "The big VLOOKUP: find a list of IDs in a CSV with millions of rows"
description: "Need the rows for 400 IDs from a CSV too big for Excel? Paste the list into one filter and export the matching rows, with no VLOOKUP, XLOOKUP or Power Query."
date: 2026-11-01
---

You have a short list and a huge file. 400 customer IDs from an email, and an 8-million-row export from the BI team. You need the rows for those 400, and Excel won't open the file.

That's the situation one Reddit user described: checking a data transfer, with "400 IDs" to look up in an 8-million-row file they couldn't share, on Office 2016, which has no XLOOKUP. Others describe the same thing every month: "~100 IDs vs 10M rows", or an ID file to check against a 200 GB dump.

The usual answers are a VLOOKUP (the file must fit in Excel first), Power Query merges (Windows only, and a query to build), or a Python script. [MegaCSV](/app/) has a filter for it: paste the list, and it keeps every row whose value is in the list.

> **Key takeaways**
> - In MegaCSV, choose **Filter**, pick the ID column and **is one of**, then paste your list: one value per line, a copied Excel column, or `a, b, c` on one line.
> - Every row of the file is checked, not just the first 1,048,576, and the status bar shows how many match.
> - Export the matches to Excel or CSV. IDs with leading zeros and long numbers are kept exactly as written.
> - Matching ignores capital letters and spaces at the ends of values.

## Why VLOOKUP fails here

- **The big file has to fit first.** VLOOKUP and XLOOKUP only see rows Excel loaded, so an ID in row 2 million is reported as `#N/A` ([every Excel limit](/blog/excel-limits-large-files)).
- **IDs get changed on the way in.** Excel drops leading zeros (`00412` becomes `412`) and rounds numbers over 15 digits, so IDs stop matching even when the row is there ([what Excel changes](/blog/excel-changes-csv-data)).
- **It's slow.** Tens of thousands of lookups across a million rows can keep Excel busy for minutes.

## How to look up a list of IDs with MegaCSV

1. **Open the big file.** Go to [megacsv.com/app](/app/) and drop the CSV on the page. The first rows appear straight away; the row count finishes in seconds.
2. **Copy your list.** From Excel, select the column of IDs and copy. From an email, copy the lines.
3. **Filter.** Choose **Filter**, pick the ID column (for example *customer_id*), choose **is one of**, and paste into the box. MegaCSV shows how many distinct values it read, such as *400 values*; blank lines and duplicates are dropped.
4. **Apply.** Choose **Apply filters**. The status bar shows the result, such as *1,284 of 8,012,550 rows match*: more rows than IDs means some IDs appear more than once.
5. **Export.** Choose **Export**, then **Excel (.xlsx)** or **CSV**. Use **Columns** to keep only the fields you need.

To find which of your IDs are *missing*, export the matches with just the ID column and compare that short file with your list in Excel, where both now fit easily.

## Frequently asked questions

### How do I VLOOKUP against a file with more than 1 million rows?

Open the big file in MegaCSV, filter the key column with **is one of** and paste your lookup values. Export the matching rows to Excel, where the result is small enough for a normal VLOOKUP if you still need one.

### How many values can I paste?

Thousands are fine. The list is checked against every row as the file is read, so a longer list doesn't make the filter noticeably slower.

### Does it match exactly?

It matches the whole value, ignoring capital letters and spaces at either end. `IN-00412` matches `in-00412`, but not `IN-0041` or `IN-00412-B`. For partial matches, use **contains**.

### Can I combine it with other conditions?

Yes. Add more conditions, such as *status* **is** `paid`; every condition must match.
