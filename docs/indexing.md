# Search Console: indexing requests

Pages sent to Google one by one with URL Inspection → "Request indexing" in Search Console (property `megacsv.com`, a domain property), using the Claude Chrome extension. The quota is small, about 8–10 requests a day, and it resets daily. The sitemap is already submitted, so Google finds these pages anyway. Manual requests only speed that up.

Each day: start at the top of "Still to request", stop at "Quota exceeded", then move the done lines into the log below.

## IndexNow (Bing and others)

Set up Nov 7, 2026. Bing, Yandex, Seznam and Naver share IndexNow; Google doesn't use it.
- Key file: `https://megacsv.com/9cb5d86851218975478d65c1ca289c17.txt` (`site/public/`). The key is public on purpose.
- Automatic: `pnpm build` fingerprints every page in the sitemap (`dist/indexnow.json`, by `scripts/combine-dist.mjs`). Every morning at 06:00 India time the Worker compares those with the fingerprints it last sent (D1 table `indexnow`, migration `worker/migrations/0002_indexnow.sql`) and sends only the pages that changed or are new, homepage included. It runs after the deploy, so engines fetch the new version. A site-wide change (shared CSS, header) changes every page, so all of them go out once.
- By hand, rarely needed: `node scripts/indexnow.mjs` (every page) or `node scripts/indexnow.mjs https://megacsv.com/page`.
- Bing Webmaster Tools → IndexNow shows what arrived.

## Log

### Nov 7, 2026

| URL | Status |
|---|---|
| https://megacsv.com/ | already indexed |
| https://megacsv.com/fixes | already indexed |
| https://megacsv.com/excel-data-set-too-large-for-grid | already indexed |
| https://megacsv.com/csv-more-than-1-million-rows | requested |
| https://megacsv.com/excel-file-not-loaded-completely | already indexed |
| https://megacsv.com/open-large-csv-without-excel | requested |
| https://megacsv.com/open-large-csv-mac | requested |
| https://megacsv.com/split-large-csv | not done: "Quota exceeded" (not on Google yet) |
| https://megacsv.com/split-csv-for-salesforce | already indexed (inspected after the quota ran out) |

## Still to request

In this order (most-searched first). The four comparison pages went live on Nov 7, 2026 and come last.

```
https://megacsv.com/split-large-csv
https://megacsv.com/google-sheets-csv-too-large
https://megacsv.com/pandas-memoryerror-large-csv
https://megacsv.com/filter-large-csv-without-excel
https://megacsv.com/excel-not-responding-large-csv
https://megacsv.com/excel-not-enough-resources-csv
https://megacsv.com/excel-too-large-for-grid-small-file
https://megacsv.com/vlookup-large-csv
https://megacsv.com/pivot-table-large-csv
https://megacsv.com/csv-opens-in-one-column
https://megacsv.com/csv-leading-zeros-excel
https://megacsv.com/excel-long-numbers-last-digits-zero
https://megacsv.com/excel-changes-csv-dates
https://megacsv.com/csv-garbled-characters
https://megacsv.com/excel-opens-csv-blank
https://megacsv.com/excel-filter-10000-items
https://megacsv.com/libreoffice-maximum-rows-exceeded
https://megacsv.com/notepad-plus-plus-file-too-big
https://megacsv.com/pandas-expected-fields-saw
https://megacsv.com/open-csv-gz
https://megacsv.com/split-csv-for-hubspot
https://megacsv.com/split-csv-for-netsuite
https://megacsv.com/blog
https://megacsv.com/blog/excel-limits-large-files
https://megacsv.com/blog/how-long-to-open-large-csv
https://megacsv.com/blog/skip-power-query-large-csv
https://megacsv.com/blog/search-every-row-large-csv
https://megacsv.com/blog/vlookup-list-of-ids-large-csv
https://megacsv.com/blog/keep-only-some-columns-large-csv
https://megacsv.com/blog/csv-import-limits
https://megacsv.com/blog/excel-changes-csv-data
https://megacsv.com/blog/csv-too-big-for-chatgpt
https://megacsv.com/blog/data-logger-csv-too-big-for-excel
https://megacsv.com/blog/look-before-you-load-vendor-csv
https://megacsv.com/blog/monthly-large-csv-export-routine
https://megacsv.com/vs/excel
https://megacsv.com/vs/gigasheet
https://megacsv.com/vs/hugecsv
https://megacsv.com/vs/tabmega
```

## Prompt for the Chrome extension

```
Go to https://search.google.com/search-console and pick the property "megacsv.com"
(a domain property). For each URL under "Still to request" (I'll paste them), in order:

1. Paste the full URL into the "Inspect any URL" bar at the top and press Enter.
2. Wait for the result.
   - If it says "URL is on Google", skip it and note "already indexed".
   - Otherwise click "Request indexing" and wait for "Indexing requested"
     (this can take a minute or two). Then close the dialog.
3. If Search Console says "Quota exceeded", stop at once; don't inspect the next URL.

Don't change any settings, remove anything or submit sitemaps. Only inspect and
request indexing.

At the end, give me a table with: URL | already indexed / requested / not done
(quota) / error (with the message), and the URLs left over for tomorrow.
```
