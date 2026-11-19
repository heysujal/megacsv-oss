// Homepage copy. Speed figures are our own runs (see TESTED_ON); re-measure when the engine changes.

/** The app, served at /app/ next to the site (see scripts/combine-dist.mjs). */
export const APP_URL = "/app/";
export const SAMPLE_URL = "/app/?sample";

export const FAQ: [question: string, answer: string][] = [
  ["How do I open a CSV file that's too big for Excel?",
    "Open it in MegaCSV. Choose the file and every row appears in seconds, with no row limit. Find or filter the rows you need, then export them back to Excel."],
  ["What is the maximum number of rows in Excel?",
    "1,048,576 rows per sheet (about 10.5 lakh), and 16,384 columns. Anything past that is cut off when Excel opens a CSV. MegaCSV has no row limit and splits exports so each part fits in one Excel sheet."],
  ["Why does Excel say “This data set is too large for the Excel grid”?",
    "The file has more rows than one sheet can hold, so Excel loads only the first 1,048,576 and drops the rest. Open the whole file in MegaCSV, filter it down, and export a part that fits."],
  ["Can I open a large CSV file on a Mac?",
    "Yes. MegaCSV runs in Safari, Chrome, Edge or Firefox on a Mac. You don't need Power Pivot or the Data Model, which Excel for Mac doesn't have."],
  ["Will it change my data?",
    "No. Values show exactly as they are in the file: leading zeros, long account numbers and dates stay as written. Excel exports keep IDs and long numbers as text."],
  ["How do I split a large CSV into smaller files?",
    "Open the file, choose Export, and pick a size: 1,048,575 rows to fit Excel, 50,000 for Salesforce imports, 25,000 for NetSuite, or your own number. Every part gets the header row."],
  ["Which browser works best?",
    "Chrome. It saves exports straight to a folder you pick and remembers the files you've opened. Edge works the same way. Safari and Firefox open, filter and export files too; for files over 5 GB, use Chrome."],
  ["Do I need to install anything or sign up?",
    "No. It works in your browser, so there's nothing to install and no account to create. That also means no IT ticket on a work laptop."],
  ["How big a file can it open?",
    "Files of tens of gigabytes and hundreds of millions of rows. The practical limit depends on your computer; MegaCSV tells you if a file is larger than it can handle comfortably."],
  ["Is MegaCSV free?",
    "Yes. Opening, finding, filtering and exporting are free, with no row limit and no trial period."],
];

/** Error messages MegaCSV gets you past; each links to its problem page once that page is live. */
export const PROBLEMS: [app: string, message: string, page: string][] = [
  ["Excel", "This data set is too large for the Excel grid.", "excel-data-set-too-large-for-grid"],
  ["Excel", "File not loaded completely.", "excel-file-not-loaded-completely"],
  ["Excel for Mac", "No Power Pivot or Data Model, so no way past 1,048,576 rows.", "open-large-csv-mac"],
  ["Google Sheets", "This action would increase the number of cells above the limit of 10,000,000 cells.", "google-sheets-csv-too-large"],
  ["LibreOffice Calc", "The maximum number of rows per sheet was exceeded.", "libreoffice-maximum-rows-exceeded"],
  ["Notepad++", "File is too big to be opened by Notepad++.", "notepad-plus-plus-file-too-big"],
  ["pandas", "MemoryError: Unable to allocate 51.0 GiB for an array.", "pandas-memoryerror-large-csv"],
];

export const TESTED_ON = "MacBook Air (M1, 8 GB RAM), Chrome, November 2026";

/** Seconds until you can see the data, for a 5 GB CSV of 48,273,484 rows. */
export const RACE: [who: string, seconds: number, label: string][] = [
  ["MegaCSV", 0.1, "0.1 s to the first rows"],
  ["MegaCSV, every row", 5.1, "5.1 s to read all 48 million rows"],
  ["Cloud tools", 2000, "33 min just to upload 5 GB at 20 Mbps"],
];

/** Our measured figures, each next to what people use today. [what, MegaCSV, the usual way] */
export const SIDE_BY_SIDE: [what: string, us: string, them: string][] = [
  ["Rows you can see in a 5\u00a0GB file", "All 48,273,484", "Excel: the first 1,048,576"],
  ["Reading speed", "About 1\u00a0GB a second", "Uploading to a cloud tool at 20\u00a0Mbps: 2.5\u00a0MB a second"],
  ["Opening the same file again", "0.1\u00a0s", "Excel reads the whole file again, every time"],
  ["Largest file tested", "20\u00a0GB, 192\u00a0million rows", "Google Sheets: 20\u00a0million cells in total"],
];

export const COMPARE = {
  tools: ["MegaCSV", "Excel", "Google Sheets", "Power Query"],
  rows: [
    ["Rows", "No limit", "1,048,576", "About 666,000 at 30 columns", "No limit, but a preview only"],
    ["Works on Mac", "Yes", "Yes", "Yes", "Partly; no Data Model"],
    ["Filter without formulas", "Yes, pick a column and a condition", "Up to the row limit", "Up to the cell limit", "Menus and steps"],
    ["Back to Excel", "One click, split to fit", "—", "Download", "Load to sheet, row limit applies"],
    ["Price", "Free", "Microsoft 365", "Free", "Included in Excel for Windows"],
  ],
};

/** Anonymous, lightly trimmed quotes from docs/research (Reddit and YouTube comments). */
export const VOICES: [quote: string, who: string, answer: string][] = [
  ["Excel… just dumps the rest of the data.", "A researcher with 1.4 GB of environmental data", "MegaCSV opens every row and shows the true count."],
  ["Can I use an external program? No. That's my main issue.", "An analyst on Excel 2013", "Nothing to install. It runs in the browser you already have."],
  ["HOW DO WE DO IT ON A MAC", "A student told to use the Data Model", "Works in Safari, Chrome, Edge and Firefox on a Mac."],
  ["I don't need probably 85% of it.", "Someone opening a 5.29 GB public health file", "Filter to the rows you need and export just those."],
  ["How do you export the 10 million records to a csv file?", "A comment under a Power Query tutorial", "Export to CSV or Excel in one step, split to fit if needed."],
  ["I have to do this on a monthly basis!", "An analyst with a monthly 10-million-row export", "Files you've opened before open again instantly."],
];

export const WHO: [who: string, files: string][] = [
  ["Finance and audit", "General ledger dumps, bank and payment exports, monthly ERP extracts."],
  ["IT and migrations", "Old database exports headed for a new system."],
  ["Research and students", "Lab and survey data, public datasets, dissertation files, on Windows or Mac."],
  ["Marketing and e-commerce", "Orders, ad reports, crawls and Search Console exports."],
];

export const FACTS: [label: string, value: string][] = [
  ["Largest file tested", "20 GB, 192 million rows"],
  ["Row limit", "None"],
  ["Signup or install", "None"],
  ["Works best in", "Chrome"],
  ["Works on", "Windows, Mac, Linux, ChromeOS"],
  ["Price", "Free"],
];
