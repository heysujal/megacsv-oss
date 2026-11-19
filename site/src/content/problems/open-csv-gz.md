---
title: "Open a .csv.gz or zipped CSV without unzipping"
heading: "How to open a .csv.gz or zipped CSV file"
description: "Excel can't open .csv.gz files and most viewers can't open zipped CSVs. MegaCSV unpacks them in your browser and opens the CSV inside, at any size."
checked: 2026-11-02
date: 2026-11-02
draft: false
faq:
  - q: "Which compressed files work?"
    a: "Gzip (.gz) and zip (.zip), including large Zip64 archives. From a zip, MegaCSV opens the largest CSV inside."
  - q: "Where does the unpacked copy go?"
    a: "Into your browser's private storage on your computer, one file at a time. It's never uploaded, and clearing the site's data removes it."
  - q: "How long does a big .gz take?"
    a: "It depends on your computer; a 1 GB .gz file opened with every row in our tests. A progress bar shows how far along it is."
related: ["csv-garbled-characters", "open-large-csv-without-excel", "csv-more-than-1-million-rows", "vs/hugecsv", "blog/monthly-large-csv-export-routine"]
---

Excel can't open a `.csv.gz` file, and unpacking a big one by hand takes time and disk space. [MegaCSV](/app/) unpacks `.gz` and `.zip` files in your browser and opens the CSV inside, so you can drop the compressed file straight on the page.

## Why it's awkward

Data exports, public datasets and server logs often come gzipped to save space. Unpacking needs a separate tool, and the result can be several times larger than the download, then too big for Excel anyway.

## Open it with MegaCSV

1. Drop the `.gz` or `.zip` file on [MegaCSV](/app/). A progress bar shows the unpacking.
2. The CSV opens as soon as it's ready, with every row.
3. **Find**, **Filter** and **Export** as usual.

## Other ways to open it

- **Unpack first** with 7-Zip (Windows), Archive Utility (Mac) or `gunzip file.csv.gz`, then open the CSV.
- **Python**: `pandas.read_csv("file.csv.gz")` reads gzip directly.
