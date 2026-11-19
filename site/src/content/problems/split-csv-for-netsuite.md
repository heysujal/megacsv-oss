---
title: "Split a CSV for NetSuite imports (25,000 rows)"
heading: "Split a big CSV into 25,000-row files for NetSuite"
description: "NetSuite's CSV import takes 25,000 records or 50 MB per job. MegaCSV splits any CSV into 25,000-row files with the header on each, values unchanged."
checked: 2026-11-02
date: 2026-11-02
draft: false
faq:
  - q: "What are NetSuite's limits?"
    a: "25,000 records or 50 MB per CSV import job, whichever comes first (Oracle NetSuite help, checked November 1, 2026). Very wide rows can hit 50 MB first; choose a smaller row count if so."
  - q: "Can I set my own row count?"
    a: "Yes: choose “A number I choose…” and type it."
  - q: "Are values changed?"
    a: "No. Each part is a byte-for-byte copy of the original rows."
related: ["split-csv-for-salesforce", "split-csv-for-hubspot", "split-large-csv", "csv-leading-zeros-excel", "blog/csv-import-limits"]
---

NetSuite imports at most 25,000 records (or 50 MB) per CSV job. Open the file in [MegaCSV](/app/), choose **Export → CSV → Split into files of 25,000 rows (NetSuite import)**, and you get import-ready parts, each with the header row.

## Why you need to split

NetSuite's Import Assistant rejects files over its per-job limits, and preparing parts in Excel can change IDs, zeros and dates.

## Split it with MegaCSV

1. Drop the CSV on [MegaCSV](/app/).
2. Optional: **Filter** to the records you need.
3. **Export → CSV**, *Split into files of* **25,000 rows (NetSuite import)**. If rows are wide, choose *A number I choose…* and a smaller count so each part stays under 50 MB.

## Other ways to split

- **SuiteScript or SuiteCloud tools** for recurring loads.
- **Command line** `split -l 25000`, then add the header to each part.
