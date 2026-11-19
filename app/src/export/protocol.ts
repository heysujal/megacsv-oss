import type { QuerySpec } from "../engine/protocol";
import type { ExportTarget } from "./sinks";

export interface ExportJob {
  file: File;
  /** Row-aligned ranges `[start, end, firstFileRow, ...]` covering the file. */
  units: Float64Array;
  totalBytes: number;
  /** Rows to keep; null keeps every row. */
  spec: QuerySpec | null;
  /** Columns to write, in this order; null writes all. */
  columns: number[] | null;
  /** Keep one matching row in this many (1 keeps all). */
  every: number;
  /** Duplicates to drop: -2 identical rows, else a column; null keeps all. */
  dedupe: { key: number; keepLast: boolean } | null;
  /** Rows before this (the header) are never exported as data. */
  minRow: number;
  hasHeader: boolean;
  dataStart: number;
  format: "csv" | "xlsx";
  rowsPerPart: number;
  /** Expected number of parts; decides single file vs zip when downloading. */
  parts: number;
  baseName: string;
  delimiter: number;
  quote: number;
  encoding: string;
  lineEnding: string;
  target: ExportTarget;
  /** Write rows in this order instead of file order: (file row, start, next) as f64 per row. */
  order: { file: File; rows: number } | null;
  /** Only some of the rows the sheet shows (a selection): skip this many, then write at most `take`. */
  window: { skip: number; take: number } | null;
}

export type ExportMessage =
  | { kind: "progress"; bytesDone: number; totalBytes: number; rowsOut: number }
  | { kind: "done"; rowsOut: number; parts: number; download: string | null }
  | { kind: "cancelled" }
  | { kind: "error"; message: string };
