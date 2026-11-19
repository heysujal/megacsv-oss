// Messages between the main thread and engine workers.

export type FilterOp =
  | "contains"
  | "equals"
  | "startsWith"
  | "isEmpty"
  | "notEmpty"
  | "between"
  | "notNumber"
  /** `value` holds the values, one per line. */
  | "oneOf";

export interface FilterSpec {
  col: number;
  op: FilterOp;
  value: string;
  min?: number;
  max?: number;
}

/** Rows must contain `text` (anywhere) and pass every filter. Empty matches all rows. */
export interface QuerySpec {
  text?: { needle: string; matchCase: boolean };
  filters: FilterSpec[];
}

interface FileFormatFields {
  delimiter: number;
  /** Quote byte, or 0 to treat quotes as normal text. */
  quote: number;
  encoding: string;
}

export interface ScanRequest {
  kind: "scan";
  file: File;
  start: number;
  end: number;
  quote: number;
}

export interface RowsRequest extends FileFormatFields {
  kind: "rows";
  file: File;
  /** Byte offset of a row start (a checkpoint). */
  start: number;
  skip: number;
  maxRows: number;
}

/** Rows at known byte ranges (a page of a filtered view). */
export interface RowsAtRequest extends FileFormatFields {
  kind: "rowsAt";
  file: File;
  /** `[start, next, start, next, ...]`, ascending. */
  spans: Float64Array;
}

/** Matching rows in one row-aligned range of the file. */
export interface QueryRequest extends FileFormatFields {
  kind: "query";
  file: File;
  start: number;
  end: number;
  firstRow: number;
  /** Rows before this (the header) never match. */
  minRow: number;
  spec: QuerySpec;
  /** Store at most this many matches; all are counted. */
  limit: number;
}

/** Group-by totals for the matching rows of one row-aligned range. */
export interface SummaryRequest extends FileFormatFields {
  kind: "summary";
  file: File;
  start: number;
  end: number;
  firstRow: number;
  minRow: number;
  /** Rows to include; null includes all. */
  spec: QuerySpec | null;
  /** Column to group by, or -1 for one group. */
  group: number;
  /** Column to total, or -1 to count rows only. */
  value: number;
  maxGroups: number;
}

/** Group keys as text, and six numbers per group: rows, empty, numbers, sum, min, max. The last group is "other". */
export interface SummaryResult {
  keys: string[];
  stats: Float64Array;
}

/** Writes a file in the browser's private storage. */
export interface SaveRequest {
  kind: "save";
  dir: string;
  name: string;
  bytes: Uint8Array;
}

/**
 * Sort keys for the matching rows of one row-aligned range, written as one
 * sorted run to `dir/name` in the browser's private storage (format: engine/src/sort.rs).
 */
export interface SortRunRequest extends FileFormatFields {
  kind: "sortRun";
  file: File;
  start: number;
  end: number;
  firstRow: number;
  minRow: number;
  spec: QuerySpec;
  col: number;
  descending: boolean;
  /** Text keys are compared on this many bytes; longer values tie and keep file order. */
  maxText: number;
  /** Path in private storage, "a/b". */
  dir: string;
  name: string;
}

export interface SortRunResult {
  rows: number;
  bytes: number;
}

export type Request = ScanRequest | RowsRequest | RowsAtRequest | QueryRequest | SummaryRequest | SaveRequest | SortRunRequest;

export interface RowsResult {
  rows: string[][];
}

export interface QueryResult {
  /** `[fileRow, start, next, ...]` per stored match. */
  matches: Float64Array;
  count: number;
}

export type Envelope = { id: number; req: Request };
export type Reply = { id: number; ok: true; result: unknown } | { id: number; ok: false; error: string };
