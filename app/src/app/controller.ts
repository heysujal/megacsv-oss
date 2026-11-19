// The app's behaviour: opening files, find, filters, go to row, sheet tabs and
// the status line. Holds the engine objects (session, query runs, grid) and
// writes only display state to the store. Ported from the pre-React main.ts;
// every analytics event is kept (docs/tasks.md §3).

import init from "../wasm/megacsv_engine.js";
import { countBucket, fileParams, since, startAnalytics, tag, track } from "../analytics";
import { WorkerPool } from "../engine/pool";
import type { FilterSpec, QuerySpec } from "../engine/protocol";
import { QueryRun, setKeepLimit } from "../engine/query-run";
import { ResultView, type RowView } from "../engine/result-view";
import { SortRun, SortedView, cleanOldSorts, type SortSpec } from "../engine/sort-view";
import { FileSession, type IndexProgress, Unsupported } from "../engine/session";
import { usesDecimalComma } from "../engine/query-spec";
import { Grid, type GridEvents } from "../grid/grid";
import { forgetFile, listRecent, reopen, rememberFile, type RecentFile } from "../recent";
import { type ConvertRun, convert } from "../convert/convert";
import { planConversion } from "../convert/plan";
import { makeSampleFile } from "../sample";
import {
  type Condition,
  type SavedFilters,
  columnNames,
  deleteFilterSet,
  describeFilters,
  fromSaved,
  newCondition,
  saveFilterSet,
  savedFilterSets,
  specsOf,
  toSaved,
} from "./filters";
import { formatBytes, plural } from "./format";
import { type SheetTab, get, set } from "./store";

startAnalytics(__APP_VERSION__);
const appStart = performance.now();
const ready = init().then(() => track("app_ready", { seconds: since(appStart) }));
export const pool = new WorkerPool();

let grid: Grid | null = null;
let session: FileSession | null = null;
let lastProgress: IndexProgress | null = null;
/** Bumped by every open: an open that finds a newer number has been replaced and stops. */
let openSeq = 0;
let conversion: ConvertRun | null = null;
/** An export is writing: opening another file waits, so it can't be lost by a stray drop. */
let exportRunning = false;
/** Filtered view, if filters or "only matching rows" are on. */
let view: ResultView | null = null;
let viewRun: QueryRun | null = null;
/** Rows matching the find text (and filters), for next/previous. */
let findRun: QueryRun | null = null;
let filters: FilterSpec[] = [];
const find = { needle: "", matchCase: false, onlyMatching: false };
/** Find settings the current findRun was started with. */
let findApplied = "";
let findPos = -1;
/** The search that should move the selection to its first match, once it has one. */
let jumpOn: QueryRun | null = null;
let flash = "";
/** Name of the saved set that produced the current filters, for the sheet tab. */
let savedName = "";
let fileOpenedAt = 0;
/** The sorted sheet: its settings (kept while filters change) and the current run. */
let sortSpec: SortSpec | null = null;
let sortRun: SortRun | null = null;
/** When each find or filter run started, until it reports finishing. */
const runStarts = new Map<QueryRun, { kind: "find" | "filter"; t0: number }>();

const DELIMITER_NAMES: Record<number, string> = { 44: "comma", 59: "semicolon", 9: "tab", 124: "pipe" };

// ---- outside hooks: the formula bar and cell viewer read cells straight from the grid ----

type CellInfo = Parameters<NonNullable<GridEvents["onSelect"]>>[0];
type InspectInfo = Parameters<NonNullable<GridEvents["onInspect"]>>[0];
export const sinks: { select: (c: CellInfo) => void; inspect: (c: InspectInfo) => void } = {
  select: () => {},
  inspect: () => {},
};

export function attachGrid(host: HTMLElement): void {
  if (grid) return;
  grid = new Grid(host);
  grid.events = {
    onInspect: (info) => {
      track("cell_inspect", { length_bucket: info.value.length > 1000 ? "over 1000" : info.value.length > 100 ? "100-1000" : "under 100" });
      sinks.inspect(info);
    },
    onMessage: (text) => {
      flash = text;
      updateStatus();
    },
    onSelect: (c) => sinks.select(c),
  };
  if (session) grid.setSource(currentView());
}

function showNotice(text: string, action?: { label: string; run: () => void }): void {
  set({ notice: { text, action } });
}

export function dismissNotice(): void {
  set({ notice: null });
}

/** What the active sheet tab shows. Every feature that acts on "the current rows" starts here. */
type Sheet =
  | { kind: "all"; view: FileSession }
  | { kind: "result"; view: ResultView; run: QueryRun }
  | { kind: "sorted"; view: SortedView; sort: SortRun };

function activeSheet(): Sheet | null {
  if (!session) return null;
  const tab = get().activeTab;
  if (tab === "sorted" && sortRun?.view) return { kind: "sorted", view: sortRun.view, sort: sortRun };
  if (tab === "result" && view) return { kind: "result", view, run: view.run };
  return { kind: "all", view: session };
}

function currentView(): RowView | null {
  return activeSheet()?.view ?? null;
}

/** The one way to change the sheet on screen, so the tab and the grid's rows always agree. */
function showSheet(tab: SheetTab): void {
  set({ activeTab: tab });
  grid?.setSource(currentView(), true);
}

/** Spec of a sort's rows; null when it sorts every row. */
function sortRows(run: SortRun): QuerySpec | null {
  return run.spec.filters.length || run.spec.text ? run.spec : null;
}

// ---- opening files ----

type OpenSource = "picker" | "file_input" | "drop" | "recent" | "quotes_as_text" | "sample" | "home";

export async function openFile(file: File, source: OpenSource, handle: FileSystemFileHandle | null = null, quoteAsText = false): Promise<void> {
  if (exportRunning) {
    showNotice(`${file.name} wasn't opened because an export is running. Open it again when the export has finished, or cancel the export.`);
    return;
  }
  const seq = ++openSeq;
  const replaced = () => seq !== openSeq;
  const t0 = performance.now();
  // Not "source": GA4 reads an event parameter called source as the visit's traffic source.
  const fp = { ...fileParams(file), opened_with: source };
  track("file_open_start", fp);
  tag("file_size", fp.size_bucket);
  tag("file_mb", fp.file_mb);
  await ready;
  if (replaced()) return;
  conversion?.cancel();
  conversion = null;
  clearQueries();
  stopSort(true);
  session?.dispose();
  session = null;
  lastProgress = null;
  filters = [];
  savedName = "";
  find.needle = "";
  find.onlyMatching = false;
  findApplied = "";
  flash = "";
  grid?.setSource(null);
  set({
    filePhase: "opening",
    dialog: null,
    notice: null,
    fileName: file.name,
    fileInfo: `${file.name} · ${formatBytes(file.size)}`,
    fileSize: file.size,
    rowCount: 0,
    status: "Opening…",
    format: "",
    progress: null,
    conditions: [],
    appliedKey: "[]",
    appliedCount: 0,
    filterOpen: false,
    saveFormOpen: false,
    findOpen: false,
    findText: "",
    onlyMatching: false,
    findCount: "",
    findPhase: "idle",
    result: null,
    sort: null,
    activeTab: "all",
  });
  sinks.select(null);

  let s: FileSession;
  try {
    // Compressed, UTF-16 and old-Mac files are unpacked to a plain copy first (at most twice:
    // a zip can hold a UTF-16 file).
    let toOpen = file;
    for (let step = 0; step < 2; step++) {
      const plan = await planConversion(toOpen);
      if (replaced()) return;
      if (!plan) break;
      const c0 = performance.now();
      track("convert_start", { ...fp, kind: plan.plan.source.kind, utf16: !!plan.plan.utf16, cr: plan.plan.crToLf });
      set({ status: `${plan.label}…`, progress: 0 });
      conversion = convert(toOpen, plan.plan, (frac, out) => {
        if (!replaced()) set({ progress: frac, status: `${plan.label}… ${(frac * 100).toFixed(0)}% · ${formatBytes(out)} so far` });
      });
      toOpen = await conversion.done;
      if (replaced()) return;
      conversion = null;
      track("convert_done", { kind: plan.plan.source.kind, out_mb: Math.round(toOpen.size / 1e6), seconds: since(c0) });
      set({ fileInfo: `${file.name} → ${toOpen.name} · ${formatBytes(toOpen.size)}`, fileSize: toOpen.size });
    }
    s = await FileSession.open(toOpen, pool, quoteAsText);
  } catch (err) {
    if (replaced()) return;
    set({ filePhase: "failed", status: "Couldn't open this file", progress: null, fileName: "", fileInfo: "" });
    track("file_open_failed", { ...fp, reason: (err instanceof Error ? err.message : String(err)).slice(0, 100) });
    showNotice(err instanceof Unsupported ? err.message : `Something went wrong: ${String(err)}`);
    return;
  }
  if (replaced()) {
    s.dispose();
    return;
  }
  session = s;
  fileOpenedAt = performance.now();
  const f = s.format;
  set({
    filePhase: "reading",
    format: [
      DELIMITER_NAMES[f.delimiter] ? `${cap(DELIMITER_NAMES[f.delimiter])} separated` : "Custom delimiter",
      f.encoding === "windows-1252" ? "Windows text" : "UTF-8",
      f.hasHeader ? "header row" : "no header",
      quoteAsText ? "quotes as text" : "",
    ]
      .filter(Boolean)
      .join(" · "),
  });

  const opened = {
    ...fp,
    delimiter: DELIMITER_NAMES[f.delimiter] ?? "custom",
    encoding: f.encoding,
    has_header: f.hasHeader,
    from_cache: s.fromCache,
  };
  track("file_ready", { ...opened, seconds: since(t0) });
  let reported = false;

  s.onChange = () => grid?.invalidate();
  s.onProgress = (p) => {
    if (s !== session) return;
    lastProgress = p;
    if (p.complete && !reported) {
      reported = true;
      const secs = since(t0);
      track("file_open", {
        ...opened,
        rows: s.rowCount,
        columns: s.columnCount,
        rows_bucket: countBucket(s.rowCount),
        seconds: secs,
        mb_per_second: secs > 0 ? Math.round(file.size / 1e6 / secs) : 0,
      });
      tag("rows", countBucket(s.rowCount));
    }
    if (p.complete) setColumns(s);
    updateStatus();
    if (p.complete && p.endsInsideQuotes && s.quote !== 0) {
      track("unbalanced_quotes", fp);
      showNotice("Some quote marks in this file look unbalanced, so rows may be merged together.", {
        label: "Treat quotes as normal text",
        run: () => void openFile(s.file, "quotes_as_text", handle, true),
      });
    }
  };
  setColumns(s);
  grid?.setSource(s);
  s.startIndexing();
  if (handle) void rememberFile(handle, file).then(renderRecent);
}

function setColumns(s: FileSession): void {
  set({ columns: columnNames(s.header, s.columnCount), decimalComma: usesDecimalComma(s.format.delimiter) });
}

const cap = (w: string) => w[0].toUpperCase() + w.slice(1);

type OpenPickerWindow = Window & { showOpenFilePicker?: () => Promise<FileSystemFileHandle[]> };

/** The Open button: the system picker where it can remember the file (Chrome, Edge), else a file input. */
export async function openPicker(input: HTMLInputElement | null): Promise<void> {
  track("open_click");
  const w = window as OpenPickerWindow;
  if (!w.showOpenFilePicker) {
    input?.click();
    return;
  }
  try {
    const [handle] = await w.showOpenFilePicker();
    void openFile(await handle.getFile(), "picker", handle);
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") track("open_cancel");
    else console.error(err);
  }
}

export function openSample(): void {
  void openFile(makeSampleFile(), "sample");
}

// ---- recent files (Chrome and Edge) ----

export async function renderRecent(): Promise<void> {
  if (!("showOpenFilePicker" in window)) return;
  const recent = await listRecent();
  tag("recent_files", recent.length);
  set({ recent });
}

export async function openRecent(r: RecentFile): Promise<void> {
  // Chrome asks again in each browser session, in words that sound alarming; say why first.
  const file = await reopen(r, () =>
    showNotice(`Your browser will ask to let MegaCSV read ${r.name} again, so it can reopen it from your recent files. The file is read in your browser and isn't uploaded.`),
  ).catch(() => null);
  if (file === "denied") {
    track("recent_denied");
    showNotice(`MegaCSV can't reopen ${r.name} without your permission. Choose Open to pick the file instead.`);
    return;
  }
  if (file) {
    dismissNotice();
    void openFile(file, "recent", r.handle);
    return;
  }
  track("recent_missing");
  showNotice(`Couldn't open ${r.name}. It may have been moved or deleted.`);
}

/**
 * /app/?open=<id>: a file chosen or dropped on the homepage (Chrome, Edge). The homepage
 * saves its handle with the recent files; open it here without asking for a second click.
 */
async function openFromHome(id: string): Promise<void> {
  history.replaceState(null, "", location.pathname);
  const r = (await listRecent()).find((x) => x.id === id);
  if (!r) return;
  const h = r.handle as FileSystemFileHandle & { queryPermission?(o: { mode: "read" }): Promise<PermissionState> };
  const perm = await h.queryPermission?.({ mode: "read" }).catch(() => "prompt" as const);
  if (perm === "granted") {
    const file = await h.getFile().catch(() => null);
    if (file) {
      void openFile(file, "home", h);
      return;
    }
  }
  // Chrome dropped the permission on the way here; asking again needs a click on this page.
  track("home_open_needs_click");
  showNotice(`Open ${r.name}?`, { label: "Open", run: () => void openRecent(r) });
}

export function removeRecent(r: RecentFile): void {
  track("recent_remove");
  void forgetFile(r.id).then(renderRecent);
}

// ---- find and filters ----

function clearQueries(): void {
  runStarts.clear();
  findRun?.cancel();
  viewRun?.cancel();
  view?.dispose();
  findRun = viewRun = view = null;
  findPos = -1;
  jumpOn = null;
}

/** Same query? Runs are reused when their spec hasn't changed. */
function sameSpec(run: QueryRun | null, spec: QuerySpec | null): boolean {
  return !!run && !!spec && JSON.stringify(run.spec) === JSON.stringify(spec);
}

/**
 * Brings find and filter queries in line with the current settings. Only a
 * query whose settings changed is restarted; replaced ones are cancelled.
 */
function rebuildQueries(): void {
  flash = "";
  const s = session;
  if (!s) return;
  const text = find.needle ? { needle: find.needle, matchCase: find.matchCase } : undefined;
  findApplied = JSON.stringify(find);
  // Same key order in both specs, so "only matching rows" can share one run.
  const findSpec: QuerySpec | null = text ? { text, filters } : null;
  const viewSpec: QuerySpec | null =
    filters.length > 0 || (find.onlyMatching && text) ? { text: find.onlyMatching ? text : undefined, filters } : null;

  const nextFind = sameSpec(findRun, findSpec) ? findRun : findSpec ? new QueryRun(s, pool, findSpec) : null;
  const nextView = sameSpec(viewRun, viewSpec)
    ? viewRun
    : sameSpec(nextFind, viewSpec)
      ? nextFind
      : viewSpec
        ? new QueryRun(s, pool, viewSpec)
        : null;

  for (const old of [findRun, viewRun]) {
    if (old && old !== nextFind && old !== nextView) old.cancel();
  }
  if (nextFind !== findRun) findPos = -1;
  if (nextView !== viewRun) {
    view?.dispose();
    view = nextView ? new ResultView(s, nextView, () => grid?.invalidate()) : null;
    // A new result opens in its own sheet tab; a sort follows the new rows.
    showSheet(view ? "result" : "all");
    if (sortSpec) startSort(nextView);
  }
  findRun = nextFind;
  viewRun = nextView;
  grid?.setHighlight(text ? { text: text.needle, matchCase: text.matchCase } : null);
  for (const run of new Set([findRun, viewRun])) {
    if (!run) continue;
    if (!runStarts.has(run)) {
      const kind = run === findRun ? "find" : "filter";
      runStarts.set(run, { kind, t0: performance.now() });
      if (kind === "filter") trackFilter(run);
      else track("find", findParams());
    }
    run.onUpdate = () => onRunUpdate(run);
    run.start();
  }
  set({ appliedCount: filters.length });
  updateFindCount();
  updateStatus();
}

function findParams(): Record<string, string | number | boolean> {
  return { match_case: find.matchCase, only_matching: find.onlyMatching, text_length: find.needle.length, with_filters: filters.length };
}

function trackFilter(run: QueryRun): void {
  const spec = run.spec;
  track("filter_apply", {
    conditions: spec.filters.length,
    ops: [...new Set(spec.filters.map((f) => f.op))].join(",").slice(0, 100),
    with_find: !!spec.text,
    file_bytes: session?.file.size ?? 0,
  });
}

/** Reports a find or filter run once it finishes, stops or fails. */
function reportRun(run: QueryRun): void {
  const started = runStarts.get(run);
  if (!started || !(run.complete || run.error)) return;
  runStarts.delete(run);
  track(`${started.kind}_done`, {
    matches: run.total,
    matches_bucket: countBucket(run.total),
    seconds: since(started.t0),
    failed: !!run.error,
    capped: run.capped,
    file_bytes: session?.file.size ?? 0,
  });
}

function onRunUpdate(run: QueryRun): void {
  reportRun(run);
  if (run === viewRun) view?.refresh();
  if (run === jumpOn && run.available > 0) {
    jumpOn = null;
    void jumpMatch(1, true);
  }
  grid?.invalidate();
  updateFindCount();
  updateStatus();
}

export function openFind(): void {
  if (!session) return;
  track("find_open");
  set({ findOpen: true });
  // The field is focused by the find bar once it's on screen.
  window.dispatchEvent(new Event("megacsv-focus-find"));
}

export function closeFind(): void {
  const hadFind = find.needle !== "" || find.onlyMatching;
  find.needle = "";
  find.onlyMatching = false;
  set({ findOpen: false, findText: "", onlyMatching: false });
  if (hadFind) rebuildQueries();
  else updateFindCount();
}

/** Applies find settings if they changed; returns true if a new search started. */
export function applyFind(): boolean {
  const st = get();
  find.needle = st.findText;
  find.matchCase = st.matchCase;
  find.onlyMatching = st.onlyMatching;
  if (JSON.stringify(find) === findApplied) return false;
  rebuildQueries();
  jumpOn = find.needle !== "" ? findRun : null;
  return true;
}

/** Moves the selection to the next or previous matching row, wrapping around. */
export async function jumpMatch(dir: 1 | -1, fromTop = false): Promise<void> {
  const run = findRun;
  const v = currentView();
  if (!run || !v || !grid || run.available === 0) return;
  track("find_jump", { direction: dir > 0 ? "next" : "previous" });
  const cur = fromTop ? null : grid.currentRow;
  try {
    if (v instanceof SortedView) {
      // A sorted sheet: step through its own order to the next row that matches.
      const idx = await v.nextMatch(cur, dir, (fileRow) => run.has(fileRow));
      if (idx === null || v !== currentView()) return;
      findPos = await run.indexOfFileRow(await v.fileRowAt(idx));
      grid.goToRow(idx);
    } else {
      let k: number;
      if (cur === null) {
        k = dir > 0 ? 0 : run.available - 1;
      } else {
        const fileRow = await v.fileRowAt(cur);
        k = dir > 0 ? await run.indexOfFileRow(fileRow + 1) : (await run.indexOfFileRow(fileRow)) - 1;
        if (k >= run.available) k = 0;
        if (k < 0) k = run.available - 1;
      }
      const idx = await v.findFileRow(await run.fileRow(k));
      if (v !== currentView()) return;
      findPos = k;
      if (idx < v.rowCount) grid.goToRow(idx);
    }
  } catch (err) {
    setFlash(err instanceof Error ? err.message : String(err));
  }
  window.dispatchEvent(new Event("megacsv-focus-find"));
  updateFindCount();
}

function updateFindCount(): void {
  const run = findRun;
  let text = "";
  if (run && session) {
    if (run.error) text = run.error;
    else if (!run.complete) text = `Searching… ${(run.progress * 100).toFixed(0)}% · ${plural(run.total, "row")} found`;
    else if (run.total === 0) text = "No matches";
    else {
      const pos = findPos >= 0 ? `${(findPos + 1).toLocaleString()} of ` : "";
      text = `${pos}${plural(run.total, "matching row")}`;
    }
  }
  set({ findCount: text, findPhase: run?.phase ?? "idle" });
}

// Filter sentence: editing conditions, applying them, saved sets.

export function toggleFilters(): void {
  const st = get();
  const visible = st.filterOpen || st.appliedCount > 0;
  if (visible && st.appliedCount > 0 && !st.filterOpen) {
    set({ filterOpen: true });
    return;
  }
  track(visible ? "filter_close" : "filter_open");
  if (visible) set({ filterOpen: false });
  else {
    set({ filterOpen: true, conditions: st.conditions.length ? st.conditions : [newCondition()] });
  }
}

export function addCondition(): void {
  track("filter_add_condition");
  set({ filterOpen: true, conditions: [...get().conditions, newCondition()] });
}

export function updateCondition(id: number, patch: Partial<Condition>): void {
  set({ conditions: get().conditions.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
}

export function removeCondition(id: number): void {
  set({ conditions: get().conditions.filter((c) => c.id !== id) });
  applyFilters();
}

export function currentSpecs(): FilterSpec[] {
  const st = get();
  return specsOf(st.conditions, st.decimalComma);
}

export function applyFilters(): void {
  const specs = currentSpecs();
  const key = JSON.stringify(specs);
  if (key !== get().appliedKey) savedName = "";
  set({ appliedKey: key });
  filters = specs;
  rebuildQueries();
}

export function clearFilters(): void {
  track("filter_clear");
  savedName = "";
  set({ conditions: [], saveFormOpen: false });
  applyFilters();
}

export function refreshSaved(): void {
  set({ saved: savedFilterSets() });
}

export function applySavedSet(name: string): void {
  const s = savedFilterSets().find((x) => x.name === name);
  if (!s) return;
  loadSet(s);
  savedName = s.name;
  updateStatus();
}

function loadSet(s: SavedFilters): string[] {
  const st = get();
  const { conditions, missing } = fromSaved(s, st.columns, st.decimalComma);
  set({ conditions, filterOpen: true });
  applyFilters();
  track("saved_filter_use", { conditions: s.conditions.length, missing: missing.length });
  if (missing.length) {
    flash = `This file has no column called ${missing.map((m) => `“${m}”`).join(", ")}; those conditions were left out`;
    updateStatus();
  }
  return missing;
}

export function startSave(): boolean {
  if (currentSpecs().length === 0) {
    flash = "Add a condition before saving";
    updateStatus();
    return false;
  }
  set({ saveFormOpen: true });
  return true;
}

export function saveCurrent(name: string): void {
  const n = name.trim();
  if (!n) return;
  const specs = currentSpecs();
  saveFilterSet(toSaved(n, specs, get().columns));
  track("saved_filter_save", { conditions: specs.length });
  set({ saveFormOpen: false });
  savedName = n;
  refreshSaved();
  flash = `Saved “${n}”. Pick it from Saved filters next time, on this file or a new one with the same columns`;
  updateStatus();
}

export function deleteSaved(name: string): void {
  deleteFilterSet(name);
  refreshSaved();
}

/** Summarize: a group was picked; show its rows (column `col` is `value`). */
export function filterToGroup(col: number, value: string): void {
  const st = get();
  const conditions = [...st.conditions.filter((c) => specsOf([c], st.decimalComma).length > 0)];
  const c = newCondition(col);
  if (value === "") c.op = "isEmpty";
  else {
    c.op = "equals";
    c.value = value;
  }
  set({ conditions: [...conditions, c], filterOpen: true });
  applyFilters();
}

// ---- sorting ----

export function openSort(): void {
  if (!session) return;
  track("sort_open");
  if (!session.isComplete) return setFlash("Sort is available once the file has been read");
  set({ dialog: { kind: "sort" } });
}

/** Sorts the rows of the current filter (or all rows) by one column; the result opens as its own sheet tab. */
export function applySort(col: number, descending: boolean): void {
  if (!session?.isComplete) return;
  sortSpec = { col, descending };
  // Sort what the active tab shows: every row, the filter's rows, or the rows already sorted.
  const sheet = activeSheet();
  startSort(sheet?.kind === "result" || (sheet?.kind === "sorted" && sortRows(sheet.sort)) ? viewRun : null);
}

function startSort(rows: QueryRun | null): void {
  const s = session;
  if (!s || !sortSpec) return;
  stopSort(false);
  const spec: QuerySpec = rows?.spec ?? { filters: [] };
  const expected = rows?.complete ? rows.total : s.rowCount;
  const run = new SortRun(s, pool, spec, sortSpec, expected);
  sortRun = run;
  const name = get().columns[sortSpec.col] ?? `Column ${sortSpec.col + 1}`;
  const t0 = performance.now();
  track("sort_start", { descending: sortSpec.descending, filtered: !!rows, file_bytes: s.file.size });
  set({ sort: { col: sortSpec.col, descending: sortSpec.descending, label: name, progress: 0, done: false, rows: 0 } });
  run.onUpdate = () => {
    if (run !== sortRun) return;
    if (run.error) {
      track("sort_failed", { reason: run.error.slice(0, 100) });
      const message = run.error;
      stopSort(true);
      setFlash(`Couldn't sort: ${message}`);
      return;
    }
    const st = get().sort;
    if (!st) return;
    if (run.complete && !st.done) {
      track("sort_done", { rows: run.rows, seconds: since(t0) });
      set({ sort: { ...st, progress: 1, done: true, rows: run.rows } });
      showSheet("sorted");
    } else if (!run.complete) set({ sort: { ...st, progress: run.progress, rows: run.rows } });
    updateStatus();
  };
  void run.start();
  updateStatus();
}

/** Ends the sort; `forget` also drops the setting, so filters won't re-sort. */
function stopSort(forget: boolean): void {
  if (sortRun) void sortRun.dispose();
  sortRun = null;
  if (forget) {
    sortSpec = null;
    if (get().sort) set({ sort: null });
  }
  // Its rows are gone: leave the sheet now, even if a new sort is about to replace it.
  if (get().activeTab === "sorted") showSheet(view ? "result" : "all");
}

export function clearSort(): void {
  track("sort_clear");
  stopSort(true);
  updateStatus();
}

// ---- sheet tabs ----

export function showTab(tab: SheetTab): void {
  if (tab === get().activeTab || (tab === "result" && !view) || (tab === "sorted" && !sortRun?.view)) return;
  track("sheet_tab", { tab });
  showSheet(tab);
  updateStatus();
}

// ---- go to row ----

export async function goToRow(raw: string): Promise<void> {
  const v = currentView();
  const n = Number(raw.replace(/[,\s_]/g, ""));
  if (!session || !v || !grid || !Number.isInteger(n) || n < 1) return;
  track("go_to_row", { beyond_end: n > session.rowCount, filtered: v !== session });
  if (n > session.rowCount) {
    flash = session.isComplete ? `This file has ${plural(session.rowCount, "row")}` : `Row ${n.toLocaleString()} isn't read yet. Try again in a moment`;
    updateStatus();
    return;
  }
  const fileRow = n - 1 + session.headerRows;
  const g = grid;
  const what = v instanceof SortedView ? "sorted" : "filtered";
  try {
    const idx = await v.findFileRow(fileRow);
    if (v !== currentView()) return;
    if (idx >= v.rowCount) {
      flash = `Row ${n.toLocaleString()} isn't in the ${what} rows`;
      updateStatus();
      return;
    }
    flash = (await v.fileRowAt(idx)) === fileRow ? "" : `Row ${n.toLocaleString()} isn't in the filtered rows; showing the next one that is`;
    updateStatus();
    g.goToRow(idx);
  } catch (err) {
    setFlash(err instanceof Error ? err.message : String(err));
  }
}

export function focusGrid(): void {
  (document.querySelector("#grid-host canvas") as HTMLElement | null)?.focus();
}

// ---- status line ----

function updateStatus(): void {
  const s = session;
  const p = lastProgress;
  if (!s || !p) return;
  const pct = p.totalBytes ? (100 * p.indexedBytes) / p.totalBytes : 100;
  const st = get();
  const findText = find.onlyMatching ? find.needle : undefined;
  const result = viewRun
    ? {
        label: savedName || describeFilters(viewRun.spec.filters, st.columns, viewRun.spec.text ? findText : undefined),
        total: viewRun.total,
        phase: viewRun.phase,
      }
    : null;
  const base = { rowCount: s.rowCount, filePhase: p.complete ? ("ready" as const) : ("reading" as const), result };

  if (!p.complete) {
    if (viewRun && !viewRun.error) {
      // Filtering keeps pace with reading; show both.
      set({ ...base, progress: pct / 100, status: `Reading the file… ${pct.toFixed(0)}% · ${plural(viewRun.total, "matching row")} so far` });
      return;
    }
    const speed = p.totalBytes > 50e6 ? ` · reading at ${formatBytes(p.bytesPerSecond)}/s` : "";
    set({ ...base, progress: pct / 100, status: `Reading the file… ${pct.toFixed(0)}% · ${plural(p.rowsSoFar, "row")} so far${speed}` });
    return;
  }

  let text: string;
  const sheet = activeSheet();
  const ss = st.sort;
  if (sheet?.kind === "sorted" && ss) {
    const how = ss.descending ? "largest to smallest (Z to A)" : "smallest to largest (A to Z)";
    text = `${plural(sheet.sort.rows, "row")} sorted by ${ss.label}, ${how}`;
  } else if (sheet?.kind === "result") {
    const run = sheet.run;
    if (run.error) text = `Filtering stopped: ${run.error}`;
    else if (!run.complete) text = `Filtering… ${(run.progress * 100).toFixed(0)}% · ${plural(run.total, "matching row")} so far`;
    else text = `${run.total.toLocaleString()} of ${plural(s.rowCount, "row")} match`;
  } else {
    const speed = p.totalBytes > 50e6 && !p.fromCache ? ` · read at ${formatBytes(p.bytesPerSecond)}/s` : "";
    const cached = p.fromCache ? " · opened instantly (remembered from last time)" : "";
    text = `${plural(s.rowCount, "row")} · ${plural(s.columnCount, "column")}${speed}${cached}`;
  }
  const sorting = sortRun?.phase === "running" ? sortRun : null;
  if (sorting && !flash) text = `Sorting… ${(sorting.progress * 100).toFixed(0)}% · ${text}`;
  set({ ...base, progress: sorting ? sorting.progress : viewRun?.phase === "running" ? viewRun.progress : null, status: flash ? `${flash} · ${text}` : text });
}

export function setFlash(message: string): void {
  flash = message;
  updateStatus();
}

// ---- Summarize, Export, Feedback ----

/** Why a tool can't work on the active sheet yet, in words for the status line; null if it can. */
function notReadyReason(tool: string, s: FileSession, run: QueryRun | null): string | null {
  if (!s.isComplete) return `${tool} is available once the file has been read`;
  if (run?.phase === "failed") return `${tool} isn't available because filtering stopped. Change the filter to try again`;
  if (run && !run.complete) return `${tool} is available once filtering finishes`;
  return null;
}

export function openSummary(): void {
  const s = session;
  const sheet = activeSheet();
  if (!s || !sheet) return;
  const run = sheet.kind === "result" ? sheet.run : null;
  const sorted = sheet.kind === "sorted" ? sheet.sort : null;
  track("summary_open", { filtered: !!run, file_bytes: s.file.size });
  const reason = notReadyReason("Summarize", s, run);
  if (reason) return setFlash(reason);
  const spec = sorted ? sortRows(sorted) : (run?.spec ?? null);
  const n = sorted ? sorted.rows : run ? run.total : s.rowCount;
  set({ dialog: { kind: "summary", req: { session: s, spec, what: spec ? `the ${plural(n, "matching row")}` : `all ${plural(n, "row")}` } } });
}

export function openExport(): void {
  const s = session;
  const sheet = activeSheet();
  if (!s || !sheet) return;
  const run = sheet.kind === "result" ? sheet.run : null;
  track("export_open", { ready: s.isComplete && (!run || run.complete), filtered: !!run, file_bytes: s.file.size });
  const reason = notReadyReason("Export", s, run);
  if (reason) return setFlash(reason);
  const base = s.file.name.replace(/\.[^.]+$/, "") || "export";
  const selection = grid?.selection() ?? null;
  if (sheet.kind === "sorted") {
    const sorted = sheet.sort;
    const spec = sortRows(sorted);
    set({
      dialog: {
        kind: "export",
        req: {
          session: s,
          spec,
          expectedRows: sorted.rows,
          what: `${spec ? "the" : "all"} ${plural(sorted.rows, spec ? "matching row" : "row")}, sorted`,
          baseName: `${base}-sorted`,
          order: { file: sheet.view.orderFile, rows: sorted.rows },
          selection,
        },
      },
    });
    return;
  }
  set({
    dialog: {
      kind: "export",
      req: {
        session: s,
        spec: run?.spec ?? null,
        expectedRows: run ? run.total : s.rowCount,
        what: run ? `the ${plural(run.total, "matching row")}` : `all ${plural(s.rowCount, "row")}`,
        baseName: run ? `${base}-filtered` : base,
        selection,
      },
    },
  });
}

export function openFeedback(): void {
  track("feedback_open");
  set({ dialog: { kind: "feedback" } });
}

export function closeDialog(): void {
  set({ dialog: null });
}

/** The Export dialog says when it starts and stops writing. */
export function setExportRunning(running: boolean): void {
  exportRunning = running;
}

export function openFileSize(): number | null {
  return session?.file.size ?? null;
}

// ---- page-wide wiring ----

let dragDepth = 0;

export function startPage(): void {
  const params = new URLSearchParams(location.search);
  // Tests: a small in-memory budget for filtered rows exercises the search-again path.
  if (params.has("keep")) setKeepLimit(Number(params.get("keep")));
  // The sample file straight away for /app/?sample (the website's link).
  if (params.has("sample")) openSample();
  const fromHome = params.get("open");
  if (fromHome) void openFromHome(fromHome);

  // Accept drops anywhere on the page.
  window.addEventListener("dragenter", (e) => {
    e.preventDefault();
    dragDepth++;
    set({ dragging: true });
  });
  window.addEventListener("dragleave", () => {
    if (--dragDepth > 0) return;
    set({ dragging: false });
  });
  window.addEventListener("dragover", (e) => e.preventDefault());
  window.addEventListener("drop", async (e) => {
    e.preventDefault();
    dragDepth = 0;
    set({ dragging: false });
    const item = e.dataTransfer?.items[0] as (DataTransferItem & { getAsFileSystemHandle?: () => Promise<FileSystemHandle | null> }) | undefined;
    // Must be requested before any await, while the drop data is still readable.
    const handlePromise = item?.getAsFileSystemHandle?.() ?? Promise.resolve(null);
    const file = e.dataTransfer?.files[0];
    if (!file) return;
    const handle = await handlePromise.catch(() => null);
    void openFile(file, "drop", handle?.kind === "file" ? (handle as FileSystemFileHandle) : null);
  });

  window.addEventListener("keydown", (e) => {
    const mod = e.metaKey || e.ctrlKey;
    if (!mod || !session) return;
    if (e.key === "f") {
      e.preventDefault();
      track("shortcut", { key: "find" });
      openFind();
    } else if (e.key === "g") {
      e.preventDefault();
      track("shortcut", { key: "go_to_row" });
      const goto = document.getElementById("goto-row") as HTMLInputElement | null;
      if (goto && goto.offsetParent) {
        goto.focus();
        goto.select();
      } else set({ gotoOpen: true });
    }
  });

  // Sorted rows live in private storage: free them when the page goes, and clear old leftovers.
  void cleanOldSorts();
  window.addEventListener("pagehide", () => stopSort(true));
  // How long a file stayed open, sent when the page is closed or hidden.
  window.addEventListener("pagehide", () => {
    if (session && fileOpenedAt)
      track("file_session_end", { minutes: Math.round((performance.now() - fileOpenedAt) / 6000) / 10, file_bytes: session.file.size });
  });

  refreshSaved();
  void renderRecent();
}
