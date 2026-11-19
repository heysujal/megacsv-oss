---
title: "Keep Only the Columns You Need From a Huge CSV"
heading: "Keep only the columns you need from a huge CSV, without opening it in Excel"
description: "A CSV with 228 columns when you need 4? Pick the columns in your browser and export just those, to CSV or Excel, with every value kept exactly as written."
date: 2026-11-01
---

Wide exports are the other half of the big-CSV problem. One analyst on Reddit had a 997 MB file with 1.8 million rows and **228 columns**, on Excel 2013 with no outside programs allowed, and needed four of them: A, GG, GM and GZ. A data engineer had a 75 GB vendor dump with about 400 columns and needed 38. Someone opening the public NPPES health-provider file (5.29 GB) put it plainly: "I really don't need probably 85% of it."

Cutting the columns is often all it takes to make the file fit: 4 columns out of 228 is under 2% of the width, so a file Excel can't open becomes one it opens instantly.

[MegaCSV](/app/) does it in your browser: open the file, tick the columns you want, export.

> **Key takeaways**
> - Open the CSV in MegaCSV, choose **Export**, then **Columns → Only the ones I choose…** and tick the ones you need. A search box finds a column by name among hundreds.
> - The CSV export copies each chosen value byte for byte, with the file's own delimiter, so leading zeros, long IDs, quotes and dates arrive unchanged.
> - Combine it with a filter to cut rows and columns in one export, and with **Split** if the result is still over Excel's 1,048,576 rows.
> - Your file is never uploaded, and there's nothing to install.

## Why deleting columns in Excel doesn't work for big files

The usual advice is "open it and delete the columns you don't need". That fails twice on a big file:

- **Excel can't open all the rows.** Anything past row 1,048,576 is dropped as the file opens ([every Excel limit](/blog/excel-limits-large-files)), so the trimmed file you save is missing data.
- **Excel changes the values it does open.** Leading zeros disappear, long numbers lose digits and dates are rewritten, and saving back to CSV makes the changes permanent ([what Excel changes](/blog/excel-changes-csv-data)).

Power Query can remove columns without the row limit, on Windows, but it's a query to build and you still need a way to get the result out. Command-line tools like `cut` work for simple files but break on commas inside quoted values.

## How to keep only some columns with MegaCSV

1. **Open the file.** Go to [megacsv.com/app](/app/) and drop the CSV on the page. The first rows appear straight away, whatever the size.
2. **Find the columns you need.** Scroll right through the header, or note the names from the vendor's spec.
3. **Optional: filter the rows.** Choose **Filter** to keep, for example, one country or one year. Only matching rows are exported.
4. **Choose Export.** Under **Columns**, pick **Only the ones I choose…**. Choose **Select none**, then type part of a name in **Find a column** and tick each one you need. The count shows how many you've picked, for example *4 of 228 columns*.
5. **Pick the format.** **CSV** copies each chosen field exactly as it was written. **Excel (.xlsx)** writes IDs, leading zeros and long numbers as text so Excel can't change them.
6. **Export.** The header row is cut to the same columns.

Columns are written in the order they appear in the file.

## Frequently asked questions

### How do I delete columns from a CSV that's too big to open?

Open it in MegaCSV, choose **Export → Columns → Only the ones I choose…**, tick the columns to keep and export. The original file isn't changed; you get a new file with just those columns.

### Will removing columns change my data?

No. In a CSV export, each value you keep is copied byte for byte, including quotes, and joined with the file's own delimiter.

### Can I keep columns and filter rows at the same time?

Yes. Apply a filter first, then choose the columns in the export dialog. The export contains only matching rows and only the chosen columns.

### Can I reorder the columns?

Not in MegaCSV: columns keep the order they have in the file. Reorder them in Excel after the export, when the file is small enough to open.
