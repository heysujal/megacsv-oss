// One open file: detects its format, indexes it in the worker pool (or loads
// a saved row table) and serves rows to the grid from a small block cache.

import { Index, sniff } from "../wasm/megacsv_engine.js";
import type { GridSource } from "../grid/grid";
import { loadRowTable, saveRowTable } from "./index-cache";
import { Cancelled, type WorkerPool } from "./pool";
import { BlockCache } from "./blocks";
import { looksBinary, notCsvReason } from "./file-kind";

const CHUNK = 8 << 20;
const SNIFF_BYTES = 1 << 20;
/** Files smaller than this aren't worth remembering. */
const REMEMBER_MIN_BYTES = 16 << 20;

export interface FileFormat {
  encoding: string;
  delimiter: number;
  lineEndings: string;
  hasHeader: boolean;
  dataStart: number;
}

export interface IndexProgress {
  indexedBytes: number;
  totalBytes: number;
  rowsSoFar: number;
  complete: boolean;
  bytesPerSecond: number;
  endsInsideQuotes: boolean;
  fromCache: boolean;
}

/** Why a file can't be opened yet, in words a user understands. */
export class Unsupported extends Error {}

export class FileSession implements GridSource {
  readonly file: File;
  readonly format: FileFormat;
  /** Quote byte, or 0 in "treat quotes as normal text" mode. */
  readonly quote: number;
  readonly fromCache: boolean;
  readonly pool: WorkerPool;
  header: string[] = [];
  onChange: () => void = () => {};
  onProgress: (p: IndexProgress) => void = () => {};

  private index: Index;
  private blocks: BlockCache;
  private disposed = false;
  private startedAt = 0;
  private completeWaiters: (() => void)[] = [];
  private readListeners = new Set<() => void>();

  private constructor(file: File, format: FileFormat, quote: number, pool: WorkerPool, index: Index | null) {
    this.file = file;
    this.format = format;
    this.quote = quote;
    this.pool = pool;
    this.fromCache = index !== null;
    this.index = index ?? new Index(format.dataStart, file.size);
    this.blocks = new BlockCache((first, count) => this.loadRows(first, count), () => this.onChange());
  }

  static async open(file: File, pool: WorkerPool, quoteAsText = false): Promise<FileSession> {
    const head = new Uint8Array(await file.slice(0, SNIFF_BYTES).arrayBuffer());
    const notCsv = notCsvReason(head, file.name);
    if (notCsv) throw new Unsupported(notCsv);
    const s = sniff(head, file.size <= SNIFF_BYTES);
    const format: FileFormat = {
      encoding: s.encoding,
      delimiter: s.delimiter,
      lineEndings: s.lineEndings,
      hasHeader: s.hasHeader,
      dataStart: s.dataStart,
    };
    s.free();
    if (format.encoding.startsWith("utf-16")) {
      throw new Unsupported("This file is saved as UTF-16 text. Support for that is coming soon. For now, re-save it as UTF-8 CSV.");
    }
    if (looksBinary(head)) {
      throw new Unsupported("This doesn't look like a CSV file. It seems to contain binary data rather than text.");
    }
    if (format.lineEndings === "cr") {
      throw new Unsupported("This file uses old Mac line endings. Support for that is coming soon.");
    }
    const quote = quoteAsText ? 0 : 0x22;
    const saved = file.size >= REMEMBER_MIN_BYTES ? await loadRowTable(file, quote) : null;
    const index = saved ? Index.fromBytes(saved) : undefined;
    const session = new FileSession(file, format, quote, pool, index ?? null);
    if (format.hasHeader) {
      const first = await pool.rows(session.rowsRequest(format.dataStart, 0, 1), session);
      session.header = first.rows[0] ?? [];
    }
    return session;
  }

  /** Starts reading the whole file. Rows become available as it advances. */
  startIndexing(): void {
    this.startedAt = performance.now();
    if (this.index.isComplete()) {
      this.reportProgress();
      return;
    }
    for (let start = 0; start < this.file.size; start += CHUNK) {
      const end = Math.min(start + CHUNK, this.file.size);
      this.pool.scan({ file: this.file, start, end, quote: this.quote }, this).then(
        (flat) => {
          if (this.disposed) return;
          this.index.pushChunk(flat);
          this.reportProgress();
          if (this.index.isComplete() && this.file.size >= REMEMBER_MIN_BYTES) {
            void saveRowTable(this.file, this.quote, this.index.toBytes(), this.pool);
          }
        },
        (err) => {
          if (!(err instanceof Cancelled)) console.error(err);
        },
      );
    }
  }

  dispose(): void {
    this.disposed = true;
    this.pool.cancel(this);
    this.index.free();
    this.completeWaiters = [];
    this.readListeners.clear();
  }

  get headerRows(): number {
    return this.format.hasHeader ? 1 : 0;
  }

  /** Data rows (excluding the header) that can be shown right now. */
  get rowCount(): number {
    const rows = this.index.rowCount() - this.headerRows;
    // Before the first chunk lands, show what the first block holds.
    return Math.max(rows, this.index.isComplete() ? 0 : this.blocks.loadedRowsInFirstBlock());
  }

  /** Final row count extrapolated from rows per byte so far. */
  get estimatedRowCount(): number {
    const rows = this.rowCount;
    const done = this.index.indexedBytes();
    if (this.index.isComplete() || done === 0) return rows;
    return Math.round((rows * this.file.size) / done);
  }

  get labelMax(): number {
    return this.estimatedRowCount;
  }

  get isComplete(): boolean {
    return this.index.isComplete();
  }

  /** Resolves once the whole file has been read. */
  whenComplete(): Promise<void> {
    if (this.index.isComplete()) return Promise.resolve();
    return new Promise((resolve) => this.completeWaiters.push(resolve));
  }

  /** Row-aligned ranges of about `bytes`: `[start, end, firstFileRow, ...]`. */
  units(bytes: number): Float64Array {
    return this.index.units(bytes);
  }

  /** Like `units`, from the end of an earlier range, over the part read so far. */
  unitsFrom(from: number, bytes: number): Float64Array {
    return this.disposed ? new Float64Array(0) : this.index.unitsFrom(from, bytes);
  }

  /** Calls `fn` each time more of the file has been read. Returns an unsubscribe function. */
  onRead(fn: () => void): () => void {
    this.readListeners.add(fn);
    return () => this.readListeners.delete(fn);
  }

  get columnCount(): number {
    return Math.max(this.header.length, this.blocks.maxColumns());
  }

  fileRowOf(row: number): number {
    return row + this.headerRows;
  }

  indexOfFileRow(fileRow: number): number {
    return Math.max(0, fileRow - this.headerRows);
  }

  async fileRowAt(row: number): Promise<number> {
    return this.fileRowOf(row);
  }

  async findFileRow(fileRow: number): Promise<number> {
    return this.indexOfFileRow(fileRow);
  }

  getRow(row: number): string[] | undefined {
    return this.blocks.get(row);
  }

  prefetch(first: number, last: number): void {
    this.blocks.prefetch(first, last, this.rowCount);
  }

  rowsRequest(start: number, skip: number, maxRows: number) {
    return {
      file: this.file,
      start,
      skip,
      maxRows,
      delimiter: this.format.delimiter,
      quote: this.quote,
      encoding: this.format.encoding,
    };
  }

  private async loadRows(first: number, count: number): Promise<string[][]> {
    if (this.disposed) throw new Cancelled();
    const fileRow = first + this.headerRows;
    const [offset, at] = this.index.locate(fileRow);
    const { rows } = await this.pool.rows(this.rowsRequest(offset, fileRow - at, count), this);
    return rows;
  }

  private reportProgress(): void {
    const indexedBytes = this.index.indexedBytes();
    const secs = Math.max((performance.now() - this.startedAt) / 1000, 1e-3);
    const complete = this.index.isComplete();
    this.onProgress({
      indexedBytes,
      totalBytes: this.file.size,
      rowsSoFar: this.rowCount,
      complete,
      bytesPerSecond: indexedBytes / secs,
      endsInsideQuotes: this.index.endsInsideQuotes(),
      fromCache: this.fromCache,
    });
    if (complete) {
      for (const resolve of this.completeWaiters.splice(0)) resolve();
    }
    for (const fn of this.readListeners) fn();
    this.onChange();
  }
}
