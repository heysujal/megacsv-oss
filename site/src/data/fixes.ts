// The /fixes page: problem pages grouped for browsing. Only live pages are shown
// (src/lib/live.ts); a live page missing from these groups appears under "More fixes",
// so pages from the publish queue show up on their day without editing this file.
export const FIX_GROUPS: [heading: string, pages: string[]][] = [
  [
    "Excel errors",
    [
      "excel-data-set-too-large-for-grid",
      "excel-file-not-loaded-completely",
      "csv-more-than-1-million-rows",
      "excel-not-responding-large-csv",
      "excel-not-enough-resources-csv",
      "excel-opens-csv-blank",
      "excel-too-large-for-grid-small-file",
      "excel-filter-10000-items",
    ],
  ],
  [
    "Excel changed my data",
    ["excel-long-numbers-last-digits-zero", "csv-leading-zeros-excel", "excel-changes-csv-dates", "csv-opens-in-one-column", "csv-garbled-characters"],
  ],
  [
    "Other programs",
    [
      "google-sheets-csv-too-large",
      "libreoffice-maximum-rows-exceeded",
      "notepad-plus-plus-file-too-big",
      "pandas-memoryerror-large-csv",
      "pandas-expected-fields-saw",
      "open-large-csv-mac",
      "open-large-csv-without-excel",
    ],
  ],
  ["Find, filter and summarize", ["filter-large-csv-without-excel", "vlookup-large-csv", "pivot-table-large-csv"]],
  ["Split and import", ["split-large-csv", "split-csv-for-salesforce", "split-csv-for-hubspot", "split-csv-for-netsuite", "open-csv-gz"]],
];
