---
title: "Split a CSV for Salesforce imports (50,000 rows)"
heading: "Split a big CSV into 50,000-row files for Salesforce"
description: "Salesforce's Data Import Wizard takes 50,000 records at a time. MegaCSV splits any CSV into 50,000-row files, header on each, values unchanged."
checked: 2026-11-02
date: 2026-11-02
draft: false
faq:
  - q: "Does each file get the header row?"
    a: "Yes. Every part starts with the original header, so Salesforce can map the fields in each one."
  - q: "Will leading zeros and IDs survive?"
    a: "Yes. A CSV split copies each row byte for byte; nothing is converted."
  - q: "What about Data Loader?"
    a: "Data Loader handles up to 5 million records, but works best in smaller batches too. You can split to any row count you choose."
  - q: "Can I split only some of the rows?"
    a: "Yes. Filter first (for example, only one region), then export; the split applies to the matching rows."
related: ["split-csv-for-netsuite", "split-csv-for-hubspot", "split-large-csv", "csv-leading-zeros-excel", "blog/csv-import-limits"]
---

Salesforce's Data Import Wizard imports up to 50,000 records at a time, so a bigger file has to be split. In [MegaCSV](/app/), open the file, choose **Export → CSV → Split into files of 50,000 rows (Salesforce import)**, and you get import-ready files, each with the header row and every value exactly as it was.

## Why you need to split

Salesforce [limits the Data Import Wizard](https://help.salesforce.com/s/articleView?id=sf.import_with_data_import_wizard.htm) to 50,000 records per import. Splitting in Excel risks losing leading zeros, reformatting dates and cutting off rows past 1,048,576.

## Split it with MegaCSV

1. Drop the CSV on [MegaCSV](/app/).
2. Optional: **Filter** to the records you're importing, and drop columns you don't need under **Columns**.
3. **Export → CSV**, and under *Split into files of* choose **50,000 rows (Salesforce import)**. The parts come as one .zip file; in Chrome and Edge you can choose separate files in a folder instead.

## Other ways to split

- **Data Loader** for larger imports, with its own batch size.
- **Command line**: `split -l 50000` on Mac or Linux, then add the header to each part.
