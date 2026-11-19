---
title: "Split a CSV for HubSpot imports"
heading: "Split a big CSV for a HubSpot import"
description: "HubSpot imports take up to 1,048,576 rows and 512 MB per file on paid plans (20 MB on free tools). MegaCSV splits big CSVs into parts that fit."
checked: 2026-11-02
date: 2026-11-02
draft: false
faq:
  - q: "What are HubSpot's import limits?"
    a: "Up to 1,048,576 rows and 512 MB per file on paid plans, and 20 MB on free tools (HubSpot knowledge base, checked November 1, 2026). Daily import limits also apply."
  - q: "MegaCSV splits by rows; how do I stay under a size limit?"
    a: "Divide the file size by the limit to get the number of parts, then divide the row count by that. For example, a 2 GB file with 10 million rows needs at least 4 parts of 512 MB, so 2,500,000 rows or fewer each, or more parts for safety."
  - q: "Do parts keep the header?"
    a: "Yes, every part starts with the header row."
related: ["split-csv-for-salesforce", "split-csv-for-netsuite", "split-large-csv", "csv-leading-zeros-excel", "blog/csv-import-limits"]
---

HubSpot accepts up to 1,048,576 rows and 512 MB per import file on paid plans, and only 20 MB on free tools. Open the file in [MegaCSV](/app/), choose **Export → CSV** and a row count per file that keeps each part under the limit; every part gets the header row.

## Why you need to split

Contact and deal exports from other systems easily pass HubSpot's per-file limits, and editing them in Excel risks changed phone numbers and dates.

## Split it with MegaCSV

1. Drop the CSV on [MegaCSV](/app/). The status line shows the row count; the file size is next to the name.
2. Work out a row count that keeps each part under the size limit (see the questions below).
3. **Export → CSV**, *Split into files of* **A number I choose…**, and type it.

## Other ways to split

- **HubSpot's own import** of several files in turn.
- **Command line** `split -l`, then add the header to each part.
