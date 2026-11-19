# MegaCSV

Free web app that opens CSV files too big for Excel, entirely in the browser. Product and technical reference: [docs/reference.md](docs/reference.md). Decisions taken without the owner, with reasons: [docs/decision.md](docs/decision.md). When a product decision isn't covered there, ask instead of guessing. To-do list: [docs/tasks.md](docs/tasks.md). Search Console indexing requests, with what is left to send: [docs/indexing.md](docs/indexing.md).

## Layout

- `engine/` Rust crate, compiled to WASM: chunk scanner (`scan.rs`), index stitcher and row-table save/load (`index.rs`), row parser for display (`parse.rs`), row/field splitting (`rows.rs`), find/filter/export matching (`query.rs`), spreadsheet XML (`xlsx.rs`), format sniffing (`sniff.rs`), browser bindings (`wasm.rs`).
- `app/` Vite + TypeScript, served at `/app/` (`base` in `app/vite.config.ts`):
  - `src/engine/`: worker pool (priorities: grid rows, then queries, then scans), file session, saved row tables for instant reopen (`index-cache.ts`), query runs and the filtered view (`query-run.ts`, `result-view.ts`).
  - `src/export/`: export worker (CSV byte-exact, XLSX via fflate), output sinks (save picker on Chrome/Edge; private storage then download elsewhere).
  - React 19 + Tailwind v4 + Zustand UI (Quiet Office, DESIGN.md): `src/app/controller.ts` behaviour (open, find, filters, sheet tabs, status), `src/app/store.ts` display state only, `src/app/filters.ts` filter sentence and saved sets; `src/components/` app bar, tools, find bar, filter sentence, workspace (formula bar, grid, sheet tabs), dialogs; `src/components/ui/` shared controls (native `<dialog>` and `<select>`, styled).
  - `src/grid/` canvas grid (column letters, row numbers, touch scrolling); `src/recent.ts` recent files (Chrome/Edge).
  - `src/wasm/` is generated; never edit it.
- `site/` Astro 7 site (static, near-zero JS; needs Node 22.23+, installed: Node 26 via Homebrew): homepage in `src/pages/index.astro`, its copy in `src/data/home.ts`, shared head/nav/footer in `src/layouts/Base.astro`. Blog posts present MegaCSV as the solution (docs/reference.md, "Blog rule"). Pages listed in `publish-queue.txt` go live in order, a few a day (`node site/queue.mjs` shows the schedule); when a page is live is decided in `src/lib/live.ts`.
- `worker/` Cloudflare Worker: serves `dist/` (site at `/`, app at `/app/`) and handles `POST /api/feedback` (the Feedback button: problems, ideas, other), stored in the D1 database `megacsv-feedback` (table `feedback`, schema in `worker/migrations/`; not emailed, since emailing hi@megacsv.com needs paid Email Sending). Read it with `cd worker && npx wrangler d1 execute megacsv-feedback --remote --command "SELECT * FROM feedback ORDER BY id DESC"`; `pnpm dev:api` uses a local copy.
- `scripts/research/` YouTube research scripts (key from `.env`; raw data goes in `research-data/`, gitignored: it holds commenters' names, so it never goes in this public repo). Findings in `docs/research/`.
- `tools/gen-csv` test-file generator; `tools/bench` native indexing benchmark (results append to `tools/bench/results.jsonl`).
- `testdata/` generated large files (gitignored). `engine/tests/fixtures/` small edge-case files (committed; regenerate with `pnpm gen --nasty engine/tests/fixtures`).

## Commands

- `pnpm dev` build WASM, then serve the website at http://localhost:4321 with the app at http://localhost:4321/app/ (the app's own Vite server runs on 5173, fixed port, under `/app/`)
- `pnpm build` WASM, app, site, then `dist/` (site at `/`, app at `/app/`) for the Worker
- `pnpm dev:api` build everything and run the Worker at http://localhost:8787; `pnpm dev` proxies `/api` to it
- `pnpm run deploy` build and deploy the Worker (Wrangler must be logged in). Pushing to `main` also deploys (Cloudflare Workers Builds)
- `node scripts/indexnow.mjs [URL…]` tell Bing and other IndexNow engines about pages now (no URLs: every page in the live sitemap). Not needed after a deploy: each morning the Worker's cron sends every page whose HTML changed (fingerprints in `dist/indexnow.json` from `scripts/combine-dist.mjs`, last sent ones in D1 table `indexnow`); the key file is `site/public/<key>.txt`
- `node scripts/render-og.mjs` re-render the social-share cards: `site/public/og.png` from `design/og/og.html`, and one per published blog post in `site/public/og/blog/` from `design/og/post.html` (run after adding a post or changing its title)
- `pnpm test` all Rust tests (property tests against the `csv` crate, fixtures)
- `pnpm gen --size 5G --out testdata/5gb.csv` make a large test file
- `pnpm bench testdata/5gb.csv`
- `cd app && npx tsc --noEmit -p .` type-check
- `cd app && node e2e/smoke.mjs http://localhost:5173/app/ FILE...` drive the running app in headless Chromium; fails on page errors or any request leaving the origin
- `cd app && node e2e/features.mjs http://localhost:5173/app/ OUT_DIR SMALL_CSV [BIG_CSV]` find, filters, export (download path) and instant reopen; check exported files against `grep`/`awk`/Python
- `cd app && node e2e/grid.mjs http://localhost:5173/app/ SMALL_CSV` range copy, cell inspector, column resize, hidden accessible table
- `cd app && node e2e/huge.mjs http://localhost:5173/app/ GB` scale test with an in-memory "virtual" file of GB gigabytes
- `cd app && node e2e/states.mjs http://localhost:5173/app/ SMALL_CSV SLOW_GZ [BIG_CSV]` overlapping actions (two opens, drops over dialogs, a new sort over an old one) and the reported states; SLOW_GZ must take seconds to unpack (`testdata/convert/1gb.csv.gz`)
- `cd app && node e2e/home-drop.mjs http://localhost:PORT/ ABSOLUTE_CSV` real file dropped on the homepage opens without a second click; needs Google Chrome and a build served at one origin (`dist/`)

Long-running commands: pipe through `tee logs/<name>.log` so the user can watch with `tail -f logs/*.log`.

## Rules

Architecture
1. Never read a whole file into memory. Read slices with `file.slice()`; at most 16 MB per read.
2. Heavy work runs in Web Workers. The main thread handles input, state and painting.
3. Row data never goes into UI framework state. The grid pulls rows from the session.
4. The grid is canvas, never DOM rows. The one exception: a hidden, accessible copy of only the rows on screen, for screen readers and AI agents.
5. No network requests from app code, except the app's own static files and user-submitted feedback that never contains file data. No third-party scripts without an explicit decision (decided: Google Analytics and Microsoft Clarity, production builds only, via `app/vite.config.ts` and `site/src/layouts/Base.astro`).
6. The scanner and the row parser share one quote model (a quote byte always toggles state), so indexed row numbers and parsed rows always agree, even on malformed files. Keep it that way.
7. `scan_chunk_naive` is the reference; any change to the fast scanner (including future SIMD) must pass the differential property test.

Correctness
8. Changes to scanning, indexing, parsing or export need passing property and fixture tests.
9. Every real-world bug gets a fixture file so it never comes back.
10. CSV exports are byte-exact copies of original rows, never re-serialized. With chosen columns (the column picker), each field is copied byte for byte, quotes included, and joined with the file's own delimiter and the row's own line ending.
11. Display raw values; never auto-convert.

Performance
12. Run the benchmark on engine changes; a regression over 10% blocks the change.
13. No per-row allocation in hot loops.
14. Budgets: WASM under 150 KB gzipped, app JS under 250 KB gzipped.
15. Paint only in `requestAnimationFrame`, only when something changed.

Style
16. TypeScript strict; no `any`. Rust Clippy-clean; no `unsafe` outside a future SIMD module, and every `unsafe` block commented.
17. User-facing text is plain language for Excel users: rows, columns, find, filter, export. Never "WASM", "SIMD", "index" or "parse" in the UI.
18. The repository is public (owner decision, Nov 19, 2026). Never commit secrets, `.env`, raw research data or other people's personal data. Production builds still ship without source maps.

State
19. One value per state: a discriminated union or phase, with booleans left for independent facts. Background jobs hold a `RunState` (`app/src/engine/run-state.ts`); end states are final, so read `phase`. The sheet on screen comes from `activeSheet()` and changes through `showSheet()` (`controller.ts`). An async step that outlives a user action re-checks that it is still current after each `await` (`openSeq`, `jumpOn`).
20. Tests and agents wait on reported state: `#status[data-file|data-sheet|data-filter|data-sort]`, `#find-count[data-state]`, `dialog[data-state]`, `#grid-host[aria-busy]`.
