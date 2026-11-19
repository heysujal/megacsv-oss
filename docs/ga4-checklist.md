# GA4 setup checklist for megacsv.com

For the owner, or Claude in Chrome acting for the owner, in a browser signed in to the Google account that owns the property. Work top to bottom. Each step says where to click, what to type, and how to check it worked. Nothing here changes the website's code.

**The property**
- Google Analytics account: "Sujal Gupta" (accounts/167034490)
- Property: **megacsv.com**, property ID **561768854**
- Web data stream measurement ID: **G-5R3TTC770R**
- Search Console property: **sc-domain:megacsv.com**
- Microsoft Clarity project ID: **z6gjzdh6wf**

**Rules for every step**
- Open https://analytics.google.com, then check the property picker at the top left says **megacsv.com**. If it shows another property (for example increasepdf.com or class10papers), switch to megacsv.com first.
- "Admin" is the gear icon at the bottom left.
- Parameter and event names must be typed **exactly** as written here: lower case, underscores, no spaces. A typo creates a dimension that never fills.
- If an item already exists with the same parameter name, skip it; don't create a duplicate.
- New dimensions and metrics only collect data from the moment they're created; older events won't fill in.

---

## 1. Keep data for 14 months (do this first)

GA4 deletes detailed event data after 2 months by default, which breaks month-over-month reports.

- [ ] Admin → **Data collection and modification** → **Data retention**.
- [ ] Set **Event data retention** to **14 months**.
- [ ] Turn **Reset user data on new activity** on.
- [ ] Click **Save**.
- **Check:** reopen the page; it shows 14 months.

## 2. Register custom dimensions (event-scoped)

- [ ] Admin → **Data display** → **Custom definitions** → tab **Custom dimensions** → **Create custom dimension**.
- [ ] For each row below, fill in:
  - **Dimension name**: the name column.
  - **Scope**: **Event**.
  - **Description**: the description column.
  - **Event parameter**: the parameter column, exactly. If the dropdown doesn't list it, type it in.
- [ ] Click **Save**, then repeat for the next row.

| # | Dimension name | Event parameter | Description |
| --- | --- | --- | --- |
| 1 | File size band | `size_bucket` | Size band of the opened file |
| 2 | File extension | `extension` | Extension of the opened file (csv, txt, gz…) |
| 3 | How the file was opened | `opened_with` | picker, file input, drop, recent, sample, home (picked or dropped on the homepage), quotes as text. Was `source` until Nov 7, 2026, which GA4 mistook for the traffic source |
| 4 | Delimiter | `delimiter` | comma, semicolon, tab, pipe |
| 5 | Encoding | `encoding` | utf-8 or windows-1252 |
| 6 | Has header row | `has_header` | Whether the first row is a header |
| 7 | Reopened from memory | `from_cache` | File reopened instantly from the saved layout |
| 8 | Row count band | `rows_bucket` | Band of the file's row count |
| 9 | Export format | `format` | csv or xlsx |
| 10 | Export split | `split` | none, custom, or rows per file |
| 11 | Filtered export | `filtered` | Whether the export used find or filters |
| 12 | Save method | `save_method` | file, dir or download |
| 13 | Exported columns | `columns` | all, or how many columns were chosen |
| 14 | Every Nth row | `every_nth` | 1 = every row |
| 15 | Duplicates removed | `dedupe` | none, rows, column_first, column_last |
| 16 | Filter operators | `ops` | Filter conditions used, e.g. equals,oneOf |
| 17 | Filter with find | `with_find` | Filter combined with find text |
| 18 | Feedback kind | `kind` | problem, idea, other (also used by convert events: gzip, zip, plain) |
| 19 | Open failure reason | `reason` | Why a file couldn't be opened |
| 20 | Button | `button` | Which site button sent the visitor to the app |
| 21 | Page | `page` | Site page an event came from |
| 22 | FAQ question | `question` | Number of the FAQ question opened |
| 23 | Web vital | `metric` | LCP, INP, CLS, FCP, TTFB |
| 24 | Web vital rating | `rating` | good, needs-improvement, poor |
| 25 | App version | `app_version` | MegaCSV app version |
| 26 | Device memory (GB) | `memory_gb` | navigator.deviceMemory |
| 27 | CPU cores | `cpu_cores` | navigator.hardwareConcurrency |
| 28 | Colour scheme | `color_scheme` | light or dark |
| 29 | Grouped summary | `grouped` | Summarize with a group-by column |
| 30 | Summary with totals | `with_value` | Summarize with a number column |

- **Check:** the Custom dimensions tab lists 30 rows (plus any that existed before), each with scope "Event".

## 3. Register custom metrics (numbers)

- [ ] Same page, tab **Custom metrics** → **Create custom metric**.
- [ ] For each row below, fill in the name, **Scope: Event**, the description, the event parameter (exactly) and the **Unit of measurement** shown.
- [ ] Click **Save**, then repeat for the next row.

| # | Metric name | Event parameter | Unit | Description |
| --- | --- | --- | --- | --- |
| 1 | File size (MB) | `file_mb` | Standard | Size of the opened file in MB |
| 2 | Seconds taken | `seconds` | Seconds | Time to open, find, filter, export or summarize |
| 3 | Read speed (MB/s) | `mb_per_second` | Standard | Speed of reading the whole file |
| 4 | Rows | `rows` | Standard | Rows in the file or written by an export |
| 5 | Rows per second | `rows_per_second` | Standard | Export speed |
| 6 | Export files | `files` | Standard | Files written by one export |
| 7 | Filter conditions | `conditions` | Standard | Number of filter conditions |
| 8 | Minutes with a file open | `minutes` | Minutes | Time a file stayed open |
| 9 | Summary groups | `groups` | Standard | Groups in a summary |
| 10 | Web vital value | `value` | Standard | LCP/INP/FCP/TTFB in ms, CLS × 1000 |

- **Check:** the Custom metrics tab lists these 10.

## 4. Mark key events

- [ ] Admin → **Data display** → **Events**. Turn on the star or toggle in the **Mark as key event** column for:
  - [ ] `cta_click`: a site visitor went to the app.
  - [ ] `file_open`: someone opened and fully read a file (the product being used).
  - [ ] `export_done`: someone got rows back out.
- [ ] If an event isn't in the list yet (it appears only after it has happened at least once): Admin → **Data display** → **Key events** → **New key event**, type the exact event name, then **Save**.
- [ ] Leave `purchase` as it is; the site never sends it.
- **Check:** Admin → Key events lists `cta_click`, `file_open` and `export_done`.

## 5. Link Search Console

- [ ] Admin → **Product links** → **Search Console links** → **Link**.
- [ ] **Choose accounts** → tick **sc-domain:megacsv.com** → **Confirm** → **Next**.
- [ ] Select the web stream (**megacsv.com**, G-5R3TTC770R) → **Next** → **Submit**.
- **Check:** the link shows "Link created". Search queries appear in Reports → Search Console after a day or two (if that collection isn't visible, click **Library** at the bottom of Reports and publish the Search Console collection).

## 6. Check enhanced measurement is on

- [ ] Admin → **Data collection and modification** → **Data streams** → **megacsv.com**.
- [ ] Under **Enhanced measurement**, the toggle is on and includes Page views, Scrolls, Outbound clicks, Site search and File downloads. Leave "Form interactions" off (it would duplicate the app's own events).

## 7. Mark your own visits as internal (optional, recommended)

So your own testing doesn't count as real use.

- [ ] Find your public IP address: search Google for "what is my ip".
- [ ] Admin → **Data streams** → megacsv.com → **Configure tag settings** → **Show more** → **Define internal traffic** → **Create**.
- [ ] Rule name **Owner**, traffic_type value **internal**, match type **IP address equals**, value: your IP → **Create**.
- [ ] Admin → **Data collection and modification** → **Data filters** → the **Internal Traffic** filter → set it to **Active** → **Save**. (Use "Testing" first if you want to check it before it starts dropping data.)

## 8. Connect Clarity to Google Analytics

- [ ] Open https://clarity.microsoft.com → project **megacsv** (ID z6gjzdh6wf) → **Settings** → **Setup**.
- [ ] Under **Google Analytics integration** → **Get started** → sign in with the same Google account → choose property **megacsv.com** → **Save**.
- **Check:** the integration shows as connected. Clarity then adds a "Clarity Playback URL" to GA sessions.

## 9. Build the funnel exploration (after a few days of data)

- [ ] Reports menu → **Explore** → **Funnel exploration**.
- [ ] Steps:
  1. `page_view` where Page path starts with `/blog/`
  2. `cta_click`
  3. `file_open`
  4. `export_done`
- [ ] Breakdown: **Landing page + query string**.
- [ ] Name it "Blog to export" and save.

## Done when

- [ ] Retention shows 14 months.
- [ ] 30 custom dimensions and 10 custom metrics exist.
- [ ] `cta_click`, `file_open` and `export_done` are key events.
- [ ] Search Console and Clarity are linked.
- [ ] Tell Claude it's done, so docs/tasks.md §3 can be ticked off.
