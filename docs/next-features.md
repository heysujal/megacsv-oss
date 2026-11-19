# Next features (from the NanoCell review)

Nov 2, 2026 · **Planned, not started.** Specs for features to build later, taken from what [NanoCell CSV](https://github.com/CedricBonjour/nanocell-csv) (nanocell-csv.com) does better than us. Ticked off in [tasks.md](tasks.md), section 2b. Design rules: [DESIGN.md](../DESIGN.md). Every screen gets the `web-design-guidelines` check before it's called done.

## How NanoCell compares

A free, open-source CSV editor (since 2021, 258 GitHub stars, updated weekly; vanilla JS, PWA). It edits small files well. Files over 10 MB (a setting) open read-only as a sample: 8 chunks of 8 rows from across the file, so about 64 rows, and find, filter and sort only see that sample. It has no whole-file export, no Excel export, no split, no group-by and no .gz or .zip. It shows up in mobile search because its domain is five years old and linked from GitHub, not because it handles big files better.

What it does better: installs as an app and opens CSVs from the computer's "Open with" menu, works offline, has about 20 cleanup rules, exports JSON, TSV and Markdown, has a command list and about 50 shortcuts, and lets you edit cells.

## UX rules for everything below

- **No new panes, drawers or settings screens.** Everything fits into what's already there: the tool row (and its "More" menu below 640px), the Export dialog, the filter sentence, sheet tabs and the cell viewer.
- **At most one new tool button** (Check). Everything else goes into an existing dialog or menu.
- **Plain words for Excel users** (CLAUDE.md rule 17). Not "validate", "macro", "sanitize", "normalize", "command palette", "regex" or "JSON schema". Say "Check", "Clean up", "Keyboard shortcuts".
- **Quiet Office** (DESIGN.md): cobalt only on things you can click, tone steps instead of boxes, sentence case, tabular figures for counts, 15px app text, dialogs use the existing `ui/dialog.tsx`.
- **Results stay results.** A finding you can act on opens as a filter and a sheet tab, the same way filters and Summarize groups already do.
- Every new feature sends an analytics event (tasks.md section 3); no file names, column names or cell values in event details.

## 1. Install as an app, work offline, open from "Open with"

**Why.** NanoCell installs with one click, appears in the system's "Open with" menu for .csv files and works with no internet connection. We have a manifest ([app/public/site.webmanifest](../app/public/site.webmanifest)) but no service worker and no file handler, so "works offline" isn't true yet and we can't be the app people double-click CSVs into. reference.md already lists this for Phase 1.

**Build.**
- Service worker that caches the app's own files (HTML, JS, CSS, WASM, fonts, icons) on first visit and serves them offline. Only the app's own static files, nothing else (rule 5). Analytics scripts are not cached; offline, they fail silently.
- Updates: a new version installs in the background and takes over the next time the app is opened. Never reload while a file is open (the open file and filters would be lost).
- Manifest additions: `file_handlers` for the files we actually open (.csv, .tsv, .txt, .gz, .zip), `launch_handler` `{ "client_mode": "focus-existing" }`, `id`, screenshots (wide and narrow) and `categories`. Scope stays `/app/`.
- `launchQueue.setConsumer` passes the file handle to the existing `openFile(file, "launch", handle)`, so files opened this way also land in recent files.
- Check the WASM and JS budgets (rule 14) still hold with the service worker added.

**UX.**
- No install banner and no nagging. One item, "Install MegaCSV", in the More menu (and in the tool row's overflow on wide screens), shown only when the browser offers install (`beforeinstallprompt`). Once installed, it disappears.
- Offline needs no extra UI: once the app's files are cached, opening, finding, filtering and exporting work the same.
- Homepage and FAQ say "Works offline" and "Open CSV files straight from your computer's Open with menu (Chrome and Edge)" only after this ships.

**Done when.** e2e: load the app once, go offline (Playwright `context.setOffline(true)`), reload, open a file, find, filter and export all work. A manual check on Chrome and Edge for Windows and Mac: install, right-click a .csv, Open with MegaCSV, and the file opens. Smoke test still passes (no request leaving the origin). Events: `app_install` (from our button or the browser's), `file_open_start` with `source: "launch"`.

## 2. Check: find problems in every column

**Why.** NanoCell's cleanup rules are its most useful feature, but they only work on small files and they change your data. We can do the useful half on any file size without changing anything: tell people what's wrong and take them to those rows. It also explains, in plain words, the Excel problems our problem pages are about (leading zeros, long numbers, dates).

**Where.** A new tool button **Check** (Phosphor `ListChecks`, Regular), after Summarize. Below 640px it moves into the More menu with Summarize.

**How it looks.** A dialog titled "Check this file" (or "Check these rows" on a filtered sheet tab). A progress line while it reads the file ("Checking… 42%", with Cancel), then one plain sentence per finding, grouped by column, most rows first:

> **email** · 3,201 cells say N/A, NULL or similar · *Show these rows*
> **zip** · 41,220 values start with 0. Excel drops the zero when it opens a CSV; our Excel export keeps it. · *Show these rows*
> **customer_id** · 980 numbers longer than 15 digits. Excel turns their last digits into zeros; our Excel export keeps them. · *Show these rows*
> **signup_date** · dates written two ways (2026-01-05 and 05/01/2026) · *Show these rows*
> **name** · 1,112 cells start or end with spaces · *Show these rows*
> **amount** · 37 cells aren't numbers in a column of numbers · *Show these rows*
> **notes** · 220 cells have line breaks inside · *Show these rows*
> **Whole file** · 1,204 rows are exact copies of an earlier row · *Remove them when exporting*
> **Column names** · two columns are both called "id"; one column has no name

If nothing is found: "No problems found in 48,273,485 rows." Name the checks it ran, in one muted line, so "no problems" means something.

Clicking *Show these rows* adds the matching condition to the filter sentence and opens the result as a sheet tab, like a Summarize group. "Remove them when exporting" opens Export with Remove duplicates already on.

**What it checks** (one pass, on the current sheet tab's rows):
- Placeholder values: the whole trimmed cell is NULL, N/A, #N/A, NaN, None, null, undefined, nil or "-" (any case).
- Cells that only look empty: spaces, tabs, non-breaking or zero-width spaces only.
- Spaces at the start or end of a value.
- Line breaks inside a cell.
- Text in a number column: at least 90% of non-empty cells are numbers (same rules as the "is not a number" filter, decimal commas included).
- Leading zeros on values that are otherwise all digits (zip codes, phone numbers, IDs).
- Numbers longer than 15 digits.
- Dates written more than one way in one column: count date shapes (YYYY-MM-DD, DD/MM/YYYY or MM/DD/YYYY, DD.MM.YYYY, with or without time) and report when a column has two or more. Don't guess which is right.
- Rows with more or fewer fields than the header (taken from the row table if it's already known).
- Exact duplicate rows (reuses the 64-bit hashing from Remove duplicates; skip with a note above 20,000,000 distinct rows).
- Column names: duplicates, empty, or with leading or trailing spaces.

**New filter conditions** so every finding can be shown: "looks empty", "is N/A, NULL or similar", "has spaces at the edges", "has a line break", "has a leading zero", "is a long number". They also appear in the filter sentence's condition list like the existing ones.

**Engine.** One new query kind in `query.rs`, run by the worker pool at query priority, with per-column counters and no per-row allocation (rule 13). Counts only; it never changes rows. Property tests for each check, plus a fixture with every problem in it (rules 8 and 9). Aim for Summarize speed (about 1.4 s per GB).

**Events.** `check_open`, `check_done` (rows, findings count, seconds, size), `check_show_rows` (which check).

## 3. Clean up on export — Waiting on owner

**Decision needed.** This bends rule 10 (CSV exports are byte-exact copies). Proposal: exports stay byte-exact unless the person ticks a Clean up box. Rows no box touches are still copied byte for byte. If approved, reword rule 10 in CLAUDE.md and add a decision.md entry.

**Why.** It's what people want after Check finds problems, and it's the job behind "clean a CSV before importing it into a database", a NanoCell article topic we can't write about until this exists.

**Where.** The Export dialog gets one new field, **Clean up**, below Columns, for CSV and Excel. Every box starts unticked, every time (not remembered):
- Trim spaces at the start and end of values
- Empty out N/A, NULL and similar
- Empty out cells that only look empty
- Replace line breaks inside cells with a space
- Make column names safe for databases (lowercase, spaces and symbols become `_`, duplicates get `_2`, `_3`)

One muted line under it: "Changes only the exported copy. Your file isn't touched."

From Check, each finding's sentence also gets a *Fix when exporting* link that opens Export with the matching box ticked.

**Not included, on purpose:** changing dates, number formats, true/false values, letter case or accents. Those guess at meaning, and rule 11 says never auto-convert.

**Engine.** Changed fields are re-quoted only when they need it (they contain the delimiter, a quote or a line break), using the file's own delimiter and each row's own line ending. Property tests: with every box unticked, output is identical to today's; with boxes ticked, only the targeted fields change.

## 4. More export and copy formats

**Export.** The Export dialog's Format choice becomes Excel · CSV · **More formats ▾**, a small select with:
- Tab-separated (.tsv): fields copied byte for byte, joined by tabs. Fields that contain a tab are quoted.
- JSON lines (.jsonl), one object per row: the best option for developers and for very large files.
- JSON (.json), an array of objects.

Keys are the column names (duplicates get `_2`), and values are always strings, exactly as written (rule 11). Split, Keep every Nth row, Columns and Remove duplicates all work with these formats. No Markdown export: a Markdown table of millions of rows helps nobody.

**Copy.** Right-click on the grid opens a small menu (DESIGN.md menu style: sheet background, soft shadow, 8px corners):
- Copy (Ctrl+C), as today
- Copy as a Markdown table
- Copy as JSON
- Copy column name
- Find this value: opens Find with the cell's value
- Filter to this value: adds "[column] is [value]" to the filter sentence (Excel's "Filter by selected cell's value")

These use the same 1,000,000-cell limit as Copy. On touch screens, a long press opens the same menu.

**Events.** `export_done` with the new format values; `copy_as` (markdown or json); `context_filter`, `context_find`.

## 5. Keyboard shortcuts

**Why.** NanoCell has about 50 shortcuts and a searchable command list. We have Ctrl+F and Ctrl+G ([controller.ts](../app/src/app/controller.ts) keydown handler). Our users know Excel, so use Excel's shortcuts, not a developer command palette.

**Add** (Cmd on Mac):
- Ctrl+O: Open
- Ctrl+Shift+L: Filter (Excel's filter shortcut)
- Ctrl+S: Export. Stops the browser's useless "Save page"; to an Excel user, Ctrl+S means "save my rows".
- Ctrl+Space: select the column. Shift+Space: select the row (Excel).
- Escape: closes the top dialog or menu (check every dialog already does this)
- `?`: shows the shortcuts list

Ctrl+Home and Ctrl+End already go to the first and last row ([grid.ts](../app/src/grid/grid.ts)).

**Shortcuts list.** "Keyboard shortcuts" in the More menu and on `?`: a plain dialog with two columns (what it does, the keys), grouped into Move, Select and copy, Find and filter, File. Tool buttons show their shortcut in the tooltip ("Filter · Ctrl+Shift+L").

**Optional, later:** Ctrl+K "Search for a feature", a search box listing every action by name, like Excel's "Tell me what you want to do". Build it only if analytics show people can't find features.

**Events.** Extend the existing `shortcut` event with the new keys.

## 6. Change how columns are split

**Why.** NanoCell lets you pick the separator. We detect it ([controller.ts](../app/src/app/controller.ts), `DELIMITER_NAMES`), but if detection is wrong the file is stuck in one column and nothing can fix it.

**UX.** The delimiter in the status line ("Comma separated") becomes a button that opens a small menu: Comma, Semicolon, Tab, Pipe, Other… (one character). Choosing one reopens the file with that separator; the saved row table for instant reopen remembers the choice for that file.

**Done when.** e2e: open a semicolon file detected as comma, switch it, and the columns split correctly. Event: `delimiter_change` (from, to).

## 7. Edit cells — Waiting on owner

**Decision needed.** reference.md says editing isn't supported ("every edit rewrites the file"). NanoCell's core feature is editing, but only up to 10 MB. We can do it at any size if changes are kept as a short list and only applied when saving, because saving already streams the whole file (like Export).

**Proposal, if approved.**
- In the cell viewer (double-click a cell or press Enter), an **Edit** button turns the value into a text field; Enter saves, Escape cancels. "Delete row" in the right-click menu.
- Changed cells get a 2px cobalt bar on the left; the status line shows "3 changes · Save · Undo".
- **Save** writes a full copy with the changes applied: over the original file where the browser allows it (Chrome and Edge, after asking once), otherwise as a download. Every unchanged row stays byte for byte; changed rows are rebuilt with the file's delimiter, its quoting and the row's own line ending.
- Undo and redo (Ctrl+Z, Ctrl+Shift+Z) over the list of changes. Closing the page with unsaved changes asks first.
- Not included: inserting or moving columns, formulas, typing over many cells at once.

**Engine.** Changes are stored as (row number, column) → new bytes, not in UI state (rule 3). Export and Save apply them as rows stream past. Property tests: with no changes, Save output equals the file.

## 8. Website: MegaCSV vs NanoCell — Waiting on owner

A comparison page in `site/src/content/compare/nanocell.md`, in the same shape as the others (reference.md, "Comparison pages"). Honest and specific: NanoCell is better for editing small files; on files over 10 MB it shows a sample of about 64 rows, read-only, while MegaCSV shows, finds, filters and exports every row. Credit that it's free, open source and works offline. Recheck its limits on the live site before publishing. Once approved, add `vs/nanocell` to `site/publish-queue.txt`.

After item 3 ships, the blog post "Clean a CSV before importing it into a database" becomes possible (the blog rule says MegaCSV must solve it).
