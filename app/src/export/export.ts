// Starts an export from the main thread: asks where to save (Chrome and
// Edge), runs the export worker, and downloads the result in other browsers.

import type { QuerySpec } from "../engine/protocol";
import type { FileSession } from "../engine/session";
import type { ExportJob, ExportMessage } from "./protocol";
import { DOWNLOAD_DIR, type ExportTarget } from "./sinks";

/** Excel's limit per sheet, minus the header row. */
export const EXCEL_DATA_ROWS = 1_048_575;
const NO_SPLIT = 2 ** 32 - 1;
const UNIT_BYTES = 8 << 20;

export interface ExportChoice {
  format: "csv" | "xlsx";
  /** Rows per output file; null means one file. */
  rowsPerPart: number | null;
  /** Expected rows, to decide one file or several. */
  expectedRows: number;
  spec: QuerySpec | null;
  /** Columns to write, in file order; null writes all. */
  columns: number[] | null;
  /** Keep one matching row in this many (1 keeps all). */
  every: number;
  /** Duplicates to drop: null keeps all; -2 identical rows; else a column, keeping its first or last row. */
  dedupe: { key: number; keepLast: boolean } | null;
  /** A sorted sheet's order: rows are written in it. */
  order?: { file: File; rows: number } | null;
  /** Only the rows of a selection: skip this many of the sheet's rows, then write `take`. */
  window?: { skip: number; take: number } | null;
}

/** Rows the export will write: every Nth row, starting with the first. */
export const rowsAfterSampling = (choice: ExportChoice) => Math.ceil(choice.expectedRows / Math.max(1, choice.every));

export function partsFor(choice: ExportChoice, hasHeader: boolean): { rowsPerPart: number; parts: number } {
  let per = choice.rowsPerPart ?? NO_SPLIT;
  if (choice.format === "xlsx") per = Math.min(per, hasHeader ? EXCEL_DATA_ROWS : EXCEL_DATA_ROWS + 1);
  return { rowsPerPart: per, parts: Math.max(1, Math.ceil(rowsAfterSampling(choice) / per)) };
}

type PickerWindow = Window & {
  showSaveFilePicker?: (o: unknown) => Promise<FileSystemFileHandle>;
  showDirectoryPicker?: (o: unknown) => Promise<FileSystemDirectoryHandle>;
};

/**
 * Asks where to save. Must be called straight from a click handler. Returns
 * null if the user closed the dialog.
 */
export async function chooseTarget(parts: number, fileName: string, format: "csv" | "xlsx", inFolder = false): Promise<ExportTarget | null> {
  const w = window as PickerWindow;
  try {
    // Several parts go into one .zip by default: Chrome won't let a site write into
    // the Downloads folder itself, only into folders inside it.
    if (parts > 1 && !inFolder && w.showSaveFilePicker) {
      const zipName = fileName.replace(/\.[^.]+$/, "") + ".zip";
      const types = [{ description: "Zip file", accept: { "application/zip": [".zip"] } }];
      return { kind: "zip", handle: await w.showSaveFilePicker({ suggestedName: zipName, types, startIn: "downloads" }) };
    }
    if (parts === 1 && w.showSaveFilePicker) {
      const types =
        format === "xlsx"
          ? [{ description: "Excel workbook", accept: { "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"] } }]
          : [{ description: "CSV file", accept: { "text/csv": [".csv"] } }];
      return { kind: "file", handle: await w.showSaveFilePicker({ suggestedName: fileName, types }) };
    }
    if (parts > 1 && w.showDirectoryPicker) {
      return { kind: "dir", handle: await w.showDirectoryPicker({ mode: "readwrite", id: "megacsv-export", startIn: "downloads" }) };
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") return null;
    throw err;
  }
  return { kind: "download" };
}

/** What was written: the saved file's name and size, when the browser can tell. */
export interface ExportResult {
  name: string | null;
  bytes: number | null;
}

export interface ExportCallbacks {
  onProgress(fraction: number, rowsOut: number): void;
  onDone(rowsOut: number, parts: number, result: ExportResult): void;
  onCancelled(): void;
  onError(message: string): void;
}

export class ExportRun {
  private worker: Worker;

  constructor(session: FileSession, choice: ExportChoice, target: ExportTarget, baseName: string, cb: ExportCallbacks) {
    const f = session.format;
    const { rowsPerPart, parts } = partsFor(choice, f.hasHeader);
    const units = session.units(UNIT_BYTES);
    const n = units.length / 3;
    const job: ExportJob = {
      file: session.file,
      units,
      totalBytes: n ? units[(n - 1) * 3 + 1] - units[0] : 0,
      spec: choice.spec,
      columns: choice.columns,
      every: choice.every,
      dedupe: choice.dedupe,
      minRow: session.headerRows,
      hasHeader: f.hasHeader,
      dataStart: f.dataStart,
      format: choice.format,
      rowsPerPart,
      parts,
      baseName,
      delimiter: f.delimiter,
      quote: session.quote,
      encoding: f.encoding,
      lineEnding: f.lineEndings === "crlf" ? "\r\n" : "\n",
      target,
      order: choice.order ?? null,
      window: choice.window ?? null,
    };
    this.worker = new Worker(new URL("./export.worker.ts", import.meta.url), { type: "module" });
    this.worker.onmessage = async (e: MessageEvent<ExportMessage>) => {
      const m = e.data;
      if (m.kind === "progress") cb.onProgress(m.totalBytes ? m.bytesDone / m.totalBytes : 1, m.rowsOut);
      else if (m.kind === "error") cb.onError(m.message);
      else if (m.kind === "cancelled") cb.onCancelled();
      else {
        const result = m.download ? await download(m.download) : await savedFile(target);
        cb.onDone(m.rowsOut, m.parts, result);
      }
      if (m.kind !== "progress") this.worker.terminate();
    };
    this.worker.postMessage({ kind: "start", job });
  }

  cancel(): void {
    this.worker.postMessage({ kind: "cancel" });
  }
}

/** Name and size of a file the user picked in the save dialog (a folder of parts has neither). */
async function savedFile(target: ExportTarget): Promise<ExportResult> {
  if (target.kind !== "file" && target.kind !== "zip") return { name: null, bytes: null };
  try {
    const f = await target.handle.getFile();
    return { name: f.name, bytes: f.size };
  } catch {
    return { name: target.handle.name, bytes: null };
  }
}

/** Hands a finished export in private storage to the browser's downloads. */
async function download(name: string): Promise<ExportResult> {
  const root = await navigator.storage.getDirectory();
  const dir = await root.getDirectoryHandle(DOWNLOAD_DIR);
  const file = await (await dir.getFileHandle(name)).getFile();
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return { name, bytes: file.size };
}
