// Export: what (the sheet or the selected cells), format and columns up front; split,
// duplicates and sampling under "More options". Then where to save, progress, and a
// finished screen with the file's name and size.
import { useEffect, useMemo, useRef, useState } from "react";
import { type Params, since, sizeBucket, track } from "../../analytics";
import { closeDialog, setExportRunning, setFlash } from "../../app/controller";
import { columnLetter, columnNames } from "../../app/filters";
import { fmt, formatBytes, plural } from "../../app/format";
import { type ExportRequest, useApp } from "../../app/store";
import { type ExportChoice, type ExportResult, ExportRun, chooseTarget, partsFor, rowsAfterSampling } from "../../export/export";
import { Button } from "../ui/button";
import { Dialog } from "../ui/dialog";
import { Field, Input, Select } from "../ui/field";
import { cn } from "../ui/cn";

type Format = "xlsx" | "csv";

/** Rough size of the export: CSV bytes per row and column from the file itself; .xlsx files are compressed. */
const XLSX_PER_CSV_BYTE = 0.8;

interface Done {
  rows: number;
  files: number;
  seconds: number;
  result: ExportResult;
  where: "download" | "file" | "zip" | "dir";
}

/** Where the dialog is: choosing options, writing, stopped by an error, or finished. */
type Stage =
  | { phase: "options"; saveError: string }
  | { phase: "running"; run: ExportRun; fill: number; status: string }
  | { phase: "failed"; status: string }
  | { phase: "done"; done: Done };

const OPTIONS: Stage = { phase: "options", saveError: "" };

export function ExportDialog() {
  const dialog = useApp((s) => s.dialog);
  const req = dialog?.kind === "export" ? dialog.req : null;
  // Kept while closed, so the dialog keeps its choices for the same file.
  const last = useRef<ExportRequest | null>(null);
  if (req) last.current = req;
  return last.current ? <ExportForm open={!!req} req={req ?? last.current} /> : null;
}

function ExportForm({ open, req }: { open: boolean; req: ExportRequest }) {
  const names = useMemo(() => columnNames(req.session.header, req.session.columnCount).slice(0, req.session.columnCount), [req.session]);
  const key = names.join("\u0000");
  const [format, setFormat] = useState<Format>("xlsx");
  const [split, setSplit] = useState("1048575");
  const [custom, setCustom] = useState("");
  const [colsMode, setColsMode] = useState("all");
  const [picked, setPicked] = useState<boolean[]>(() => names.map(() => true));
  const [colSearch, setColSearch] = useState("");
  const [dupes, setDupes] = useState("none");
  const [dupesCol, setDupesCol] = useState("0");
  const [every, setEvery] = useState("1");
  const [everyCustom, setEveryCustom] = useState("");
  /** Several parts: one .zip file (default) or separate files in a folder. */
  const [inFolder, setInFolder] = useState(false);
  const sel = req.selection ?? null;
  const selRows = sel ? Math.max(0, Math.min(sel.rows[1], req.expectedRows - 1) - sel.rows[0] + 1) : 0;
  const selCols = sel ? sel.cols[1] - sel.cols[0] + 1 : 0;
  /** A single selected cell is usually just where the cursor is, so the sheet stays the default. */
  const defaultScope = sel && selRows > 0 && selRows * selCols > 1 ? "selection" : "sheet";
  // The choice belongs to one opening: a new request starts from its own default.
  const [scopePick, setScopePick] = useState<{ req: ExportRequest; scope: "sheet" | "selection" } | null>(null);
  const scope = scopePick?.req === req ? scopePick.scope : defaultScope;
  const setScope = (v: "sheet" | "selection") => setScopePick({ req, scope: v });
  const onSelection = scope === "selection" && !!sel && selRows > 0;
  const [more, setMore] = useState(false);
  const [stage, setStage] = useState<Stage>(OPTIONS);
  const phase = stage.phase;
  const customRef = useRef<HTMLInputElement>(null);
  const everyRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // A different file starts from the defaults.
  useEffect(() => {
    setColsMode("all");
    setColSearch("");
    setPicked(names.map(() => true));
    setDupes("none");
    setDupesCol("0");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useEffect(() => {
    // Reset while closed, so the next opening doesn't flash the last export's progress or result.
    if (!open) setStage(OPTIONS);
  }, [open]);
  useEffect(() => {
    if (phase !== "running") return;
    setExportRunning(true);
    return () => setExportRunning(false);
  }, [phase]);

  const onFormat = (f: Format) => {
    setFormat(f);
    // Excel files are always split to fit; default CSV to one file.
    if (f === "xlsx" && split === "none") setSplit("1048575");
    if (f === "csv" && split === "1048575") setSplit("none");
  };

  const columns: number[] | null = onSelection
    ? selCols === names.length
      ? null
      : Array.from({ length: selCols }, (_, k) => sel!.cols[0] + k)
    : colsMode !== "pick"
      ? null
      : picked.every(Boolean)
        ? null
        : picked.flatMap((p, i) => (p ? [i] : []));
  const everyN = onSelection ? 1 : every !== "custom" ? Number(every) : Math.floor(Number(everyCustom)) >= 1 ? Math.floor(Number(everyCustom)) : null;

  const choice: ExportChoice | null = (() => {
    let rowsPerPart: number | null = null;
    if (split === "custom") {
      const n = Math.floor(Number(custom));
      if (!(n >= 1)) return null;
      rowsPerPart = n;
    } else if (split !== "none") rowsPerPart = Number(split);
    if ((columns && columns.length === 0) || everyN === null) return null;
    const dedupe = onSelection || dupes === "none" ? null : dupes === "row" ? { key: -2, keepLast: false } : { key: Number(dupesCol), keepLast: dupes === "last" };
    const window = onSelection ? { skip: sel!.rows[0], take: selRows } : null;
    const expectedRows = window ? window.take : req.expectedRows;
    return { format, rowsPerPart, expectedRows, spec: req.spec, columns, every: everyN, dedupe, order: req.order ?? null, window };
  })();

  const multiPart = !!choice && partsFor(choice, req.session.format.hasHeader).parts > 1;
  /**
   * "One file · about 6 KB": how many files, and roughly how big. Only while open: the dialog
   * stays mounted after its file is closed, and a closed file's row count is gone.
   */
  const estimate = (() => {
    if (!choice || !open) return "";
    const { parts } = partsFor(choice, req.session.format.hasHeader);
    const f = req.session;
    const perRow = f.file.size / Math.max(1, f.rowCount + f.headerRows);
    const cols = choice.columns ? choice.columns.length : names.length;
    let bytes = rowsAfterSampling(choice) * perRow * (cols / Math.max(1, names.length));
    if (format === "xlsx") bytes *= XLSX_PER_CSV_BYTE;
    const files = parts === 1 ? "One file" : `${fmt(parts)} files${inFolder && "showSaveFilePicker" in window ? "" : " in one .zip"}`;
    const size = bytes < 1000 ? "under 1 KB" : `about ${formatBytes(bytes)}`;
    return `${files} · ${choice.dedupe ? "at most " : ""}${size}`;
  })();
  /** Non-default choices under "More options", so they're visible while it's closed. */
  const moreSummary = [
    split === "custom" ? (Number(custom) >= 1 ? `files of ${fmt(Math.floor(Number(custom)))} rows` : "files of N rows") : split !== "none" && split !== "1048575" ? `files of ${fmt(Number(split))} rows` : null,
    format === "csv" && split === "1048575" ? "files of 1,048,575 rows" : null,
    !onSelection && dupes !== "none" ? "duplicates removed" : null,
    !onSelection && every !== "1" ? "a sample of rows" : null,
  ].filter(Boolean);
  const note = (() => {
    if (stage.phase === "options" && stage.saveError) return stage.saveError;
    if (!choice) {
      return columns?.length === 0 ? "Choose at least one column." : everyN === null ? "Enter N: one row in every N is kept." : "Enter how many rows each file should have.";
    }
    const { parts } = partsFor(choice, req.session.format.hasHeader);
    const lines: string[] = [];
    if (format === "xlsx" && split === "none") lines.push("Excel holds up to 1,048,576 rows per sheet, so bigger exports are split.");
    if (choice.dedupe) lines.push(choice.dedupe.keepLast ? "Reads the file twice to find each value's latest row." : "Rows already exported once are skipped; the row count is known when it finishes.");
    if (choice.every > 1) lines.push(`About ${fmt(rowsAfterSampling(choice))} rows: the first, then one in every ${fmt(choice.every)}.`);
    if (req.order) lines.push("Rows are written in the sheet's sorted order.");
    if (parts > 1) {
      lines.push(`This will make ${fmt(parts)} files, each with the header row.`);
      if (!("showSaveFilePicker" in window)) lines.push("They'll download together as one .zip file.");
      else if (inFolder) lines.push("Chrome can't save into the Downloads folder itself: choose or create a folder inside it.");
    }
    if (format === "xlsx" && choice.expectedRows > 1_000_000) lines.push("Very large Excel files can be slow to open in Excel.");
    return lines.join(" ");
  })();

  const start = async () => {
    if (!choice) return;
    setStage(OPTIONS);
    const { parts } = partsFor(choice, req.session.format.hasHeader);
    const baseName = onSelection ? `${req.baseName}-selection` : req.baseName;
    let target;
    try {
      target = await chooseTarget(parts, `${baseName}.${choice.format}`, choice.format, inFolder);
    } catch (err) {
      setStage({ phase: "options", saveError: `Couldn't open the save dialog: ${err instanceof Error ? err.message : String(err)}` });
      track("export_save_dialog_failed", { format: choice.format });
      return;
    }
    if (!target) {
      track("export_save_cancel", { format: choice.format });
      return;
    }
    const details: Params = {
      format: choice.format,
      split: split === "none" || split === "custom" ? split : Number(split),
      rows: choice.expectedRows,
      parts,
      filtered: !!choice.spec,
      sorted: !!choice.order,
      selection: onSelection,
      columns: choice.columns ? choice.columns.length : "all",
      every_nth: choice.every,
      dedupe: choice.dedupe ? (choice.dedupe.key === -2 ? "rows" : choice.dedupe.keepLast ? "column_last" : "column_first") : "none",
      save_method: target.kind,
      file_bytes: req.session.file.size,
      size_bucket: sizeBucket(req.session.file.size),
    };
    track("export_start", details);
    const started = performance.now();
    const exportRun = new ExportRun(req.session, choice, target, baseName, {
      onProgress: (frac, rows) => {
        const secs = (performance.now() - started) / 1000;
        const left = frac > 0.02 && secs > 2 ? ` · about ${formatDuration((secs / frac) * (1 - frac))} left` : "";
        const status = `${(frac * 100).toFixed(0)}% · ${fmt(rows)} rows written${left}`;
        setStage((s) => (s.phase === "running" ? { ...s, fill: frac, status } : s));
      },
      onDone: (rows, n, result) => {
        const secs = since(started);
        track("export_done", { ...details, rows, files: n, seconds: secs, rows_per_second: secs > 0 ? Math.round(rows / secs) : 0, out_bytes: result.bytes ?? -1 });
        const where = target.kind === "download" ? "Downloaded" : "Saved";
        setFlash(`${where} ${fmt(rows)} ${rows === 1 ? "row" : "rows"} to ${n === 1 ? "1 file" : `${fmt(n)} files`}.`);
        setStage({ phase: "done", done: { rows, files: n, seconds: (performance.now() - started) / 1000, result, where: target.kind } });
      },
      onCancelled: () => {
        setStage(OPTIONS);
        track("export_cancel", { ...details, seconds: since(started) });
        closeDialog();
        setFlash("Export cancelled.");
      },
      onError: (message) => {
        track("export_fail", { ...details, message: message.slice(0, 100), seconds: since(started) });
        setStage({ phase: "failed", status: `The export stopped: ${message}` });
      },
    });
    setStage({ phase: "running", run: exportRun, fill: 0, status: "Starting…" });
  };

  /** Esc or Cancel while exporting stops the export instead of hiding it. */
  const cancel = (): boolean => {
    if (stage.phase !== "running") return true;
    stage.run.cancel();
    return false;
  };

  const q = colSearch.trim().toLowerCase();
  const shown = names.map((n, i) => ({ n, i })).filter(({ n }) => !q || n.toLowerCase().includes(q));
  const setShown = (on: boolean) => setPicked((p) => p.map((v, i) => (shown.some((s) => s.i === i) ? on : v)));
  const pickedCount = picked.filter(Boolean).length;

  const colRange = sel ? (selCols === 1 ? `column ${columnLetter(sel.cols[0])}` : `columns ${columnLetter(sel.cols[0])} to ${columnLetter(sel.cols[1])}`) : "";

  return (
    <Dialog
      id="export-dialog"
      open={open}
      onClose={closeDialog}
      onCancel={cancel}
      state={phase}
      title={phase === "done" ? "Export finished" : "Export"}
      footer={
        phase === "done" ? (
          <>
            <span className="flex-1" />
            <Button id="export-done-close" variant="primary" onClick={closeDialog}>
              Done
            </Button>
          </>
        ) : (
          <>
            <span id="export-estimate" className="flex-1 text-[14px] text-muted tabular-nums" hidden={phase !== "options"}>
              {estimate}
            </span>
            {phase !== "options" && <span className="flex-1" />}
            <Button id="export-cancel" onClick={() => cancel() && closeDialog()}>
              {phase === "failed" ? "Close" : "Cancel"}
            </Button>
            <Button id="export-go" variant="primary" onClick={() => void start()} disabled={!choice} hidden={phase !== "options"}>
              Export
            </Button>
          </>
        )
      }
    >
      {sel && selRows > 0 && phase === "options" ? (
        <fieldset id="export-scope" className="mb-4">
          <legend className="mb-2 text-[14px] font-medium">What to export</legend>
          <div className="flex flex-col gap-1.5">
            {(
              [
                ["selection", `Selected cells: ${plural(selRows, "row")} × ${plural(selCols, "column")} (${colRange})`],
                ["sheet", `${req.what.charAt(0).toUpperCase()}${req.what.slice(1)}`],
              ] as const
            ).map(([value, label]) => (
              <label key={value} className="flex cursor-pointer items-center gap-2 text-[15px] select-none">
                <input type="radio" name="export-scope" value={value} checked={scope === value} onChange={() => setScope(value)} className="size-4" />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
      ) : (
        <p id="export-what" className="mb-4 text-[15px]" hidden={phase === "done"}>
          Export {req.what}.
        </p>
      )}
      <div id="export-options" className="flex flex-col gap-4" hidden={phase !== "options"}>
        <fieldset>
          <legend className="mb-2 text-[14px] font-medium">Format</legend>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["xlsx", "Excel (.xlsx)", "Opens in Excel; split to fit its sheets"],
                ["csv", "CSV", "Exact copy of the rows, any size"],
              ] as const
            ).map(([value, label, hint]) => (
              <label
                key={value}
                className="flex cursor-pointer flex-col gap-0.5 rounded-control bg-tone-1 px-3.5 py-2.5 transition-colors select-none hover:bg-tone-2 has-[:checked]:bg-sheet has-[:checked]:shadow-[0_0_0_2px_var(--cobalt)] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-cobalt"
              >
                <span className="flex items-center gap-2 font-medium">
                  <input type="radio" name="format" value={value} checked={format === value} onChange={() => onFormat(value)} className="size-4" />
                  {label}
                </span>
                <span className="pl-6 text-[13px] text-muted">{hint}</span>
              </label>
            ))}
          </div>
        </fieldset>
        {!onSelection && (
          <>
            <Field label="Columns">
              <Select
                id="export-cols"
                value={colsMode}
                onChange={(e) => {
                  setColsMode(e.target.value);
                  if (e.target.value === "pick") requestAnimationFrame(() => searchRef.current?.focus());
                }}
                className="font-normal"
              >
                <option value="all">All columns</option>
                <option value="pick">Only the ones I choose…</option>
              </Select>
            </Field>
            <div id="col-picker" className="-mt-2 rounded-control bg-ground p-3" hidden={colsMode !== "pick"}>
              <div className="mb-2 flex flex-wrap gap-2">
                <Input
                  id="col-search"
                  ref={searchRef}
                  type="search"
                  placeholder="Find a column…"
                  autoComplete="off"
                  aria-label="Find a column"
                  value={colSearch}
                  onChange={(e) => setColSearch(e.target.value)}
                  className="h-8 flex-1 text-[14px]"
                />
                <Button id="col-all" size="sm" onClick={() => setShown(true)}>
                  Select all
                </Button>
                <Button id="col-none" size="sm" onClick={() => setShown(false)}>
                  Select none
                </Button>
              </div>
              <div id="col-list" role="group" aria-label="Columns to export" className="grid max-h-52 grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-x-3 overflow-y-auto">
                {names.map((n, i) => (
                  <label key={i} className={cn("flex cursor-pointer items-center gap-2 py-1 text-[14px] select-none")} hidden={!shown.some((s) => s.i === i)}>
                    <input type="checkbox" value={i} checked={picked[i] ?? true} onChange={(e) => setPicked((p) => p.map((v, k) => (k === i ? e.target.checked : v)))} className="size-4" /> {n}
                  </label>
                ))}
              </div>
              <p id="col-count" className="mt-2 text-[13px] text-muted tabular-nums" aria-live="polite">
                {fmt(pickedCount)} of {fmt(names.length)} columns
              </p>
            </div>
          </>
        )}
        <details id="export-more" open={more} onToggle={(e) => setMore(e.currentTarget.open)} className="group rounded-control bg-ground px-3 py-2">
          <summary className="cursor-pointer py-1 text-[14px] font-medium select-none">
            More options
            <span className="font-normal text-muted">
              {moreSummary.length ? `: ${moreSummary.join(", ")}` : onSelection ? " (split into files)" : " (split, duplicates, every Nth row)"}
            </span>
          </summary>
          <div className="flex flex-col gap-4 pt-3 pb-1">
            <Field label="Split into files of">
              <div className="flex flex-wrap gap-2">
                <Select
                  id="split"
                  value={split}
                  onChange={(e) => {
                    setSplit(e.target.value);
                    if (e.target.value === "custom") requestAnimationFrame(() => customRef.current?.focus());
                  }}
                  className="flex-1 font-normal"
                >
                  <option value="none">Don't split</option>
                  <option value="1048575">1,048,575 rows (fits in Excel)</option>
                  <option value="50000">50,000 rows (Salesforce import)</option>
                  <option value="25000">25,000 rows (NetSuite import)</option>
                  <option value="custom">A number I choose…</option>
                </Select>
                <Input
                  id="split-custom"
                  ref={customRef}
                  type="number"
                  min={1}
                  step={1}
                  placeholder="Rows per file"
                  hidden={split !== "custom"}
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  className="w-40 font-normal"
                />
              </div>
            </Field>
            {multiPart && "showSaveFilePicker" in window && (
              <Field label="Save the files as">
                <Select id="export-parts-as" value={inFolder ? "folder" : "zip"} onChange={(e) => setInFolder(e.target.value === "folder")} className="font-normal">
                  <option value="zip">One .zip file (can go straight into Downloads)</option>
                  <option value="folder">Separate files in a folder</option>
                </Select>
              </Field>
            )}
            {!onSelection && (
              <>
                <Field label="Duplicates">
                  <div className="flex flex-wrap gap-2">
                    <Select id="export-dupes" value={dupes} onChange={(e) => setDupes(e.target.value)} className="min-w-0 flex-[1_1_240px] font-normal">
                      <option value="none">Keep every row</option>
                      <option value="row">Remove identical rows</option>
                      <option value="first">One row per value of a column, the first</option>
                      <option value="last">One row per value of a column, the latest</option>
                    </Select>
                    <Select
                      id="export-dupes-col"
                      aria-label="Column whose values must be unique"
                      hidden={dupes !== "first" && dupes !== "last"}
                      value={dupesCol}
                      onChange={(e) => setDupesCol(e.target.value)}
                      className="min-w-0 flex-[1_1_160px] font-normal"
                    >
                      {names.map((n, i) => (
                        <option key={i} value={i}>
                          {n}
                        </option>
                      ))}
                    </Select>
                  </div>
                </Field>
                <Field label="Keep">
                  <div className="flex flex-wrap gap-2">
                    <Select
                      id="export-every"
                      value={every}
                      onChange={(e) => {
                        setEvery(e.target.value);
                        if (e.target.value === "custom") requestAnimationFrame(() => everyRef.current?.focus());
                      }}
                      className="flex-1 font-normal"
                    >
                      <option value="1">Every row</option>
                      <option value="10">Every 10th row</option>
                      <option value="100">Every 100th row</option>
                      <option value="1000">Every 1,000th row</option>
                      <option value="custom">Every Nth row, I choose N…</option>
                    </Select>
                    <Input
                      id="every-custom"
                      ref={everyRef}
                      type="number"
                      min={2}
                      step={1}
                      placeholder="N"
                      aria-label="Keep one row in every N"
                      hidden={every !== "custom"}
                      value={everyCustom}
                      onChange={(e) => setEveryCustom(e.target.value)}
                      className="w-28 font-normal"
                    />
                  </div>
                </Field>
              </>
            )}
          </div>
        </details>
        <p id="export-note" className="min-h-5 text-[14px] text-muted" aria-live="polite">
          {note}
        </p>
      </div>
      <div id="export-progress" className="py-2" hidden={phase !== "running" && phase !== "failed"}>
        <div className="h-1.5 overflow-hidden rounded-full bg-tone-1">
          <div id="export-fill" className="h-full rounded-full bg-cobalt transition-[width] duration-200" style={{ width: `${((stage.phase === "running" ? stage.fill : 0) * 100).toFixed(1)}%` }} />
        </div>
        <p id="export-status" className="mt-3 text-[14px] text-muted tabular-nums" aria-live="polite">
          {stage.phase === "running" || stage.phase === "failed" ? stage.status : ""}
        </p>
      </div>
      {stage.phase === "done" && <Finished done={stage.done} />}
    </Dialog>
  );
}

/** The finished screen: a check mark, what was written and where it went. */
function Finished({ done }: { done: Done }) {
  const { rows, files, seconds, result, where } = done;
  const place =
    where === "download"
      ? "It's in your browser's downloads."
      : where === "dir"
        ? "They're in the folder you chose."
        : "It's saved where you chose.";
  const facts = [result.name, plural(rows, "row"), files > 1 ? `${fmt(files)} files` : null, result.bytes !== null ? formatBytes(result.bytes) : null, `${formatDuration(seconds)}`].filter(Boolean);
  return (
    <div id="export-done" className="flex flex-col items-center gap-3 py-4 text-center" role="status">
      <svg className="export-done-mark size-14 text-cobalt" viewBox="0 0 56 56" aria-hidden="true">
        <circle cx="28" cy="28" r="26" fill="currentColor" opacity="0.12" />
        <path d="M17 29l7.5 7.5L39.5 21" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <p className="text-[18px] font-medium">{files > 1 ? `Done! Your ${fmt(files)} files are ready.` : "Done! Your file is ready."}</p>
      <p id="export-done-facts" className="text-[14px] text-muted tabular-nums">
        {facts.join(" · ")}
      </p>
      <p className="text-[14px] text-muted">{place}</p>
    </div>
  );
}

function formatDuration(secs: number): string {
  if (secs < 60) return `${Math.max(1, Math.round(secs))} s`;
  const m = Math.round(secs / 60);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`;
}
