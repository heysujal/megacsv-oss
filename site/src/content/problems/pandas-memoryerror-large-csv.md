---
title: "pandas MemoryError on a large CSV: fixes that work"
heading: "pandas MemoryError when reading a large CSV"
description: "pandas loads the whole CSV into memory. Read it in chunks, pick columns and dtypes, or, when you just need to look, filter and export, open it in MegaCSV."
error: "MemoryError: Unable to allocate 51.0 GiB for an array with shape (…) and data type object"
where: "Python, pandas.read_csv"
checked: 2026-11-02
date: 2026-11-02
draft: false
faq:
  - q: "What's the quickest code fix?"
    a: "Read only the columns you need with usecols=, give numeric columns a dtype, and process the file with chunksize= instead of loading it all at once."
  - q: "When is MegaCSV the better tool?"
    a: "When you need to look at the data, check a few rows, filter to a subset or hand someone an Excel file. It opens the file in seconds without writing code."
  - q: "Does MegaCSV change my data?"
    a: "No. It shows raw values and CSV exports copy rows byte for byte."
related: ["pandas-expected-fields-saw", "split-large-csv", "filter-large-csv-without-excel", "blog/keep-only-some-columns-large-csv"]
---

`read_csv` builds the whole table in memory, and text columns take far more room than the file on disk, so a big CSV runs out of memory. Read it in chunks with only the columns you need, or, if you only need to look at it, filter it and export a subset, open it in [MegaCSV](/app/), which reads the file in slices in your browser.

## Why it happens

pandas stores every value of an `object` (text) column as a separate Python string. A 5 GB CSV can need 20–50 GB of memory as a DataFrame. The error appears when the allocation fails.

## Fix it in code

```python
import pandas as pd

cols = ["order_id", "country", "total"]
parts = []
for chunk in pd.read_csv("big.csv", usecols=cols, dtype={"country": "category"}, chunksize=1_000_000):
    parts.append(chunk[chunk["country"] == "IN"])
result = pd.concat(parts)
```

Other options: `engine="pyarrow"`, Polars' `scan_csv`, or DuckDB (`SELECT … FROM 'big.csv'`), which stream instead of loading everything.

## Or skip the code with MegaCSV

1. Drop the file on [MegaCSV](/app/).
2. **Filter** (for example *country is IN* and *total is a number between 100 and 500*), and pick columns under **Export → Columns**.
3. **Export as CSV** and load the much smaller file into pandas.
