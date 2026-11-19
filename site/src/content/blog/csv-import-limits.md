---
title: "CSV Import Limits: Salesforce, HubSpot, NetSuite, Shopify"
heading: "CSV import limits for Salesforce, HubSpot, NetSuite and Shopify, and how to split a file to fit"
description: "Row and size limits for CSV imports into Salesforce, HubSpot, NetSuite, Shopify and Google Sheets, checked November 2026, and how to split a big CSV to fit."
date: 2026-11-01
---

Moving data into a new system usually means one big CSV and an import screen that refuses it. Salesforce's Data Import Wizard takes 50,000 records at a time. NetSuite takes 25,000. Shopify rejects product files over 15 MB. The usual advice, "split the file", is easy to say and surprisingly easy to get wrong.

[MegaCSV](/app/) opens the big file, whatever its size, and splits it into import-sized CSV files with the header row on every file and every value kept exactly as it was. This post lists the current limits for the common platforms, then shows how to split safely.

> **Key takeaways**
> - Salesforce Data Import Wizard: **50,000 records** per import. NetSuite Import Assistant: **25,000 records or 50 MB** per import job. HubSpot paid plans: **1,048,576 rows or 512 MB** per file. Shopify products: **15 MB** per file.
> - Every split file needs the header row, or the import can't map the columns.
> - Don't split or re-save the file in Excel: it drops leading zeros and changes long IDs and dates.
> - MegaCSV has presets for Salesforce (50,000 rows) and NetSuite (25,000 rows), plus any row count you choose.

## CSV import limits by platform

Checked on each platform's official help pages on November 1, 2026. Limits change, so follow the link to confirm before a big migration.

| Platform | Limit per import | Source |
| --- | --- | --- |
| Salesforce, Data Import Wizard | 50,000 records at a time. For 50,000 to 150 million records Salesforce points to Data Loader | [Trailhead: Import Data](https://trailhead.salesforce.com/content/learn/modules/lex_implementation_data_management/lex_implementation_data_import) |
| NetSuite, Import Assistant | 25,000 records or 50 MB per import job; files in a multi-file upload count together | [NetSuite: General CSV File Conventions](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_N453326.html) |
| HubSpot (Starter, Professional, Enterprise, Smart CRM) | 1,048,576 rows and 512 MB per file; 10 million rows and 500 imports a day; fewer than 1,000 columns | [HubSpot: Set up your import file](https://knowledge.hubspot.com/import-and-export/set-up-your-import-file) |
| HubSpot (free tools) | 20 MB per file; 500,000 rows and 50 imports a day | Same page |
| Shopify, product CSV | 15 MB per file | [Shopify Help: Importing products](https://help.shopify.com/en/manual/products/import-export/import-products) |
| Google Sheets | 20 million cells or 100 MB per spreadsheet | [Google Drive file limits](https://support.google.com/docs/answer/37603) |

Mailchimp's import help page doesn't list a file size or row limit; the limit that matters there is your plan's contact count.

## Why splitting goes wrong

Splitting a CSV sounds like cutting a list into pieces. In practice four things go wrong.

**1. Only the first file has the header.** Command-line tools like `split` cut by line count, so files 2, 3 and 4 start with data, not column names. The import can't map them. As one Reddit reply warned: "only the first chunk gets the header row."

**2. A row breaks in the middle.** CSV values can contain commas and even line breaks inside quotes, such as an address or a note over two lines. A tool that cuts by line can split one record across two files, and both files fail.

**3. Excel changes the values.** The most common way people split is to open the file in Excel, copy a block of rows into a new sheet and save it as CSV. That drops leading zeros from zip codes and account numbers, cuts long IDs to 15 digits and rewrites dates. This is exactly what went wrong in one Reddit thread: a front-desk employee asked by their CFO to move an old company database into a new system needed it split "without losing leading zeros and spaces." The full list of what Excel changes is in [Excel keeps changing your CSV](/blog/excel-changes-csv-data).

**4. Excel can't open the file in the first place.** Anything over 1,048,576 rows is cut off as it opens, so splitting in Excel silently loses everything past that row ([Excel's limits](/blog/excel-limits-large-files)).

## How to split a CSV for import with MegaCSV

1. **Open the file.** Go to [megacsv.com/app](/app/) and drop in the CSV. Files of any size open in seconds, and your file is never uploaded. Check the row count in the status line so you know how many parts to expect.
2. **Filter first, if you only need some rows.** For example, *status is active* to leave out closed accounts, or *email is not empty* to skip contacts you can't import. Only the matching rows are exported.
3. **Choose Export → CSV, then a split size:**
   - **50,000 rows (Salesforce import)**
   - **25,000 rows (NetSuite import)**
   - **1,048,575 rows (fits in Excel)**, which also matches HubSpot's per-file row limit
   - **A number I choose…** for anything else
4. **Save.** In Chrome and Edge you pick a folder and the files are written straight into it. In other browsers they download together as one .zip.

Each file starts with the original header row. Rows are copied byte for byte from the original, so leading zeros, long numbers, dates, quotes and line breaks inside values all arrive exactly as they were. Rows are never broken across files.

### Splitting by file size (Shopify, NetSuite's 50 MB, HubSpot's 512 MB)

MegaCSV splits by row count, so work out the rows from the size limit:

1. Divide the file size by the row count to get the average row size. A 600 MB file with 2,000,000 rows averages 300 bytes a row.
2. Divide the limit by that: 15 MB ÷ 300 bytes ≈ 50,000 rows.
3. Leave a margin for longer rows, and choose about 80% of that number: 40,000 rows per file.

For NetSuite, use whichever limit you reach first: 25,000 records, or 50 MB divided by your row size.

### When one record spans several rows

Some formats use several rows for one record. Shopify product CSVs put each variant on its own row under the same handle, and NetSuite transaction imports can use one row per line item. Splitting by row count can put a product's variants or an order's lines in two different files. After splitting, check the last rows of each file. If a product or transaction continues into the next file, adjust the rows per file and export again.

## Frequently asked questions

### How many records can the Salesforce Data Import Wizard import?

Up to 50,000 records at a time, per Salesforce's Trailhead module. For more, split the file into parts of 50,000 rows (MegaCSV has a Salesforce preset), or use Data Loader, which Salesforce recommends for 50,000 to 150 million records.

### What is the NetSuite CSV import limit?

25,000 records or 50 MB per import job, and all files in a multi-file upload count together. Split the CSV into parts of 25,000 rows or fewer, smaller if your rows are long, and import them as separate jobs.

### What is HubSpot's import file size limit?

On paid plans and Smart CRM, 512 MB and 1,048,576 rows per file, up to 10 million rows a day. On free tools, 20 MB per file and 500,000 rows a day. Files must have fewer than 1,000 columns.

### What's the maximum file size for a Shopify product CSV?

15 MB. Shopify suggests splitting a larger file into several smaller ones and uploading each. Keep all rows for a product together in one file.

### How do I split a CSV into multiple files with the header on each?

Open the file in MegaCSV, choose Export → CSV and pick a split size. Every file gets the original header row, and the rows are copied exactly as they were.
