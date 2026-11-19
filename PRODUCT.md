# Product

<!-- impeccable:product-schema 1 -->  

## Platform

web

## Users

Non-programmers who were handed a CSV file too big for Excel. Primary: business analysts and operations (marketing, sales, supply-chain, HR ops) and finance, accounting and audit. Secondary: SEO and digital marketers, e-commerce sellers. Excel is their main tool; they just hit its limit or watched it freeze. Many hold confidential data they may not upload, and many work on company laptops where installing software is blocked.

Personas: Priya, a finance analyst who needs one vendor's rows for one quarter from a 6 GB monthly export, in Excel, by end of day, and has never written SQL. Marcus, an SEO consultant with a 3 GB crawl export who needs status-code counts and a list of 404s for a client.

Developers are a distribution channel, not the core user.

## Product Purpose

A free web app that opens CSV files too big for Excel, up to tens of gigabytes, entirely on the user's own computer. Users look at the data, find rows, filter, and export just the rows (or columns) they need back into Excel. Success: the user gets a smaller, correct piece of their file into Excel without uploading, installing or learning anything.

One-liner: Open CSV files too big for Excel. Find what you need. Get it back into Excel. Free, no signup.

## Positioning

The only tool that combines all four: nothing to set up (no signup, no install), opens files of any size fast, plain-language find and filter with no formulas or code, and a one-click path back to Excel with automatic splitting at Excel's 1,048,576-row limit. Free, no signup, no install.

## Operating Context

The file arrives from a system or colleague (CRM, ERP, ad platform, payment processor, crawler). The user drags it into a browser tab, usually Chrome or Edge on a work laptop, often mid-deadline. Typical session: open, scroll to check it's the right file, find a value, filter by one or two columns, export to Excel. Recent files reopen instantly on Chrome and Edge.

## Capabilities and Constraints

Built: open any size CSV/TSV, delimiter detection, canvas grid with row numbers and sticky header, go to row, whole-file find with next/previous, per-column filters (contains, equals, starts with, is empty, number range), filtered CSV export (byte-exact) and Excel export auto-split into Excel-sized parts, split presets (Excel, Salesforce 50k, NetSuite 25k), recent files with instant reopen, "Report a problem".

Planned next: column picker, paste-a-list filter, copy cells, column resize, cell inspector, offline/installable. Later: column summary, group-by, remove duplicates, sort, join two files, .gz/.zip/.xlsx input.

Constraints: the grid is canvas, never DOM rows. Values are shown raw, never auto-converted. No network requests from the app except its own files and user-submitted feedback; no third-party scripts in the app. Desktop browsers only; mobile is not a target.

Terminology (user-facing): rows, columns, find, filter, export, split. Never "WASM", "SIMD", "index", "parse" or other implementation words.

## Brand Commitments

Name: MegaCSV, used identically everywhere. No logo, brand color or font committed yet. Voice: plain language for Excel users, honest about limits, calm. No ads, pop-ups or signup prompts. No privacy claims (see docs/reference.md, messaging rule).

## Evidence on Hand

- Native benchmark: 5 GB file, 48.3M rows, ~2.3 GB/s scan (tools/bench/results.jsonl). In-browser speed not yet measured.
- User research quotes: docs/research/reddit.md and docs/research/ (YouTube).
- No testimonials, customers, press, logos or screenshots exist. Do not fabricate them. Speed and size figures on mockups are placeholders until measured in the browser.

## Product Principles

1. Excel is the destination: every result has an obvious path back to Excel.
2. Show the raw truth: values exactly as in the file, true row counts, nothing silently dropped.
3. Never freeze, never surprise: progress, time estimates and cancel on every long action; honest limits up front.
4. Sell results: speed, size, simplicity, the way back to Excel.
5. Familiar first: it should feel like a spreadsheet to someone who lives in Excel.
