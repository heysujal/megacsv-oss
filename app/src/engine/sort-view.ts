// Sorting by one column, at any size. The rows to sort (all rows, or a filter's)
// are read in slices of about 64 MB; each slice is sorted by a pool worker and
// written to the browser's private storage as a sorted run. The sort worker then
// merges the runs into one file holding (file row, start, next) per row, in
// sorted order. The sorted view reads that file a block at a time, so memory
// stays flat whatever the number of rows; disk use is about 70 bytes per row
// while sorting and 24 bytes per row after.

import { BlockCache } from "./blocks";
import type { WorkerPool } from "./pool";
import { Cancelled } from "./pool";
import type { QuerySpec } from "./protocol";
import type { RowView } from "./result-view";
import { type RunPhase, RunState } from "./run-state";
import type { FileSession } from "./session";
import type { SortWorkerIn, SortWorkerOut } from "./sort.worker";
import { removeDir, storageDir } from "./storage";

const SLICE_BYTES = 64 << 20;
/** Text values are compared on their first 256 bytes; longer ones that tie keep file order. */
const MAX_TEXT = 256;
const ROOT = "sorts";
/** Disk needed while sorting, per row (run record, output, a spare pass). */
const BYTES_PER_ROW = 120;
const REC = 24;
const BLOCK = 256;

export interface SortSpec {
  col: number;
  descending: boolean;
}

/** Removes sorts left behind by tabs closed while sorting (older than a day). */
export async function cleanOldSorts(): Promise<void> {
  try {
    const root = await storageDir(ROOT, false);
    for await (const [name, handle] of root as unknown as AsyncIterable<[string, FileSystemHandle]>) {
      if (handle.kind !== "directory") continue;
      const created = Number(name.split("-")[0]);
      if (Date.now() - created > 24 * 3600_000) await removeDir(`${ROOT}/${name}`);
    }
  } catch {
    // No sorts yet.
  }
}

export class SortRun {
  onUpdate: () => void = () => {};
  /** Set once the sort is done. */
  view: SortedView | null = null;
  rows = 0;
  private dir = `${ROOT}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  private bytesDone = 0;
  private merged = 0;
  private state = new RunState();
  /** While running: sorting slices, then merging them. */
  private stage: "runs" | "merge" = "runs";
  private worker: Worker | null = null;

  constructor(
    readonly session: FileSession,
    private pool: WorkerPool,
    readonly spec: QuerySpec,
    readonly sort: SortSpec,
    /** Rows expected (for the disk-space check). */
    private expectedRows: number,
  ) {}

  get complete(): boolean {
    return this.state.phase === "done";
  }

  get phase(): RunPhase {
    return this.state.phase;
  }

  get error(): string | null {
    return this.state.error;
  }

  /** 0–1: reading and sorting slices is the first 60%, merging the rest. */
  get progress(): number {
    if (this.complete) return 1;
    const total = this.session.file.size - this.session.format.dataStart;
    if (this.stage === "runs") return 0.6 * (total > 0 ? this.bytesDone / total : 1);
    return 0.6 + 0.4 * (this.rows > 0 ? this.merged / this.rows : 1);
  }

  async start(): Promise<void> {
    if (!this.state.begin()) return;
    try {
      if (!navigator.storage?.getDirectory) throw new Error("Sorting needs the browser's private storage, which isn't available here (a private window?).");
      const est = await navigator.storage.estimate?.();
      const free = est?.quota !== undefined && est.usage !== undefined ? est.quota - est.usage : Infinity;
      const need = this.expectedRows * BYTES_PER_ROW;
      if (need > free)
        throw new Error(
          `Sorting ${this.expectedRows.toLocaleString()} rows needs about ${(need / 1e9).toFixed(1)} GB of free disk space for the browser, and only ${(free / 1e9).toFixed(1)} GB is available. Filter first to sort fewer rows.`,
        );
      await storageDir(this.dir, true);
      // Replaced while getting ready: the dir was made after dispose() cleaned up.
      if (!this.state.active) {
        await removeDir(this.dir);
        return;
      }
      const s = this.session;
      const f = s.format;
      const units = s.units(SLICE_BYTES);
      const jobs: Promise<void>[] = [];
      const names: string[] = [];
      for (let i = 0; i < units.length; i += 3) {
        const name = `run-${i / 3}.run`;
        names.push(name);
        jobs.push(
          this.pool
            .sortRun(
              {
                file: s.file,
                start: units[i],
                end: units[i + 1],
                firstRow: units[i + 2],
                minRow: s.headerRows,
                spec: this.spec,
                col: this.sort.col,
                descending: this.sort.descending,
                maxText: MAX_TEXT,
                dir: this.dir,
                name,
                delimiter: f.delimiter,
                quote: s.quote,
                encoding: f.encoding,
              },
              this,
            )
            .then((r) => {
              this.rows += r.rows;
              this.bytesDone += units[i + 1] - units[i];
              this.onUpdate();
            }),
        );
      }
      await Promise.all(jobs);
      if (!this.state.active) return;
      this.stage = "merge";
      this.onUpdate();
      const order = await this.merge(names);
      if (!this.state.active) return;
      this.view = new SortedView(s, order, this.rows, () => this.onUpdate());
      this.state.finish();
      this.onUpdate();
    } catch (err) {
      if (err instanceof Cancelled || !this.state.active) return;
      const quota = (err instanceof DOMException && err.name === "QuotaExceededError") || /quota/i.test(String(err));
      this.state.fail(
        quota
          ? "The browser ran out of space for sorting. A private window has very little; use a normal window, or filter first to sort fewer rows."
          : err instanceof Error
            ? err.message
            : String(err),
      );
      this.onUpdate();
      void this.dispose();
    }
  }

  private merge(runs: string[]): Promise<File> {
    return new Promise((resolve, reject) => {
      const w = new Worker(new URL("./sort.worker.ts", import.meta.url), { type: "module" });
      this.worker = w;
      w.onmessage = async (e: MessageEvent<SortWorkerOut>) => {
        const m = e.data;
        if (m.kind === "progress") {
          this.merged = m.done;
          this.onUpdate();
        } else if (m.kind === "error") {
          w.terminate();
          reject(new Error(m.message));
        } else {
          w.terminate();
          this.worker = null;
          try {
            const handle = await (await storageDir(this.dir, false)).getFileHandle(m.name);
            resolve(await handle.getFile());
          } catch (err) {
            reject(err);
          }
        }
      };
      w.onerror = (e) => reject(new Error(e.message || "The sort stopped."));
      w.postMessage({ kind: "merge", dir: this.dir, runs, rows: this.rows } satisfies SortWorkerIn);
    });
  }

  /** Stops sorting and frees the disk space. */
  async dispose(): Promise<void> {
    this.state.cancel();
    this.pool.cancel(this);
    this.worker?.terminate();
    this.worker = null;
    this.view?.dispose();
    await removeDir(this.dir);
  }
}

/** Grid source for sorted rows: row i is the i-th row in sorted order. */
export class SortedView implements RowView {
  private blocks: BlockCache;
  /** Records of loaded blocks, for row labels. */
  private recs = new Map<number, Float64Array>();

  constructor(
    private session: FileSession,
    private order: File,
    readonly rowCount: number,
    onChange: () => void,
  ) {
    this.blocks = new BlockCache((first, count) => this.loadRows(first, count), onChange);
  }

  get header(): string[] {
    return this.session.header;
  }

  get columnCount(): number {
    return Math.max(this.session.columnCount, this.blocks.maxColumns());
  }

  get labelMax(): number {
    return this.session.labelMax;
  }

  /** The row's number in the file; -1 until its block has loaded. */
  rowLabel(row: number): number {
    const r = this.recs.get(Math.floor(row / BLOCK));
    const k = (row % BLOCK) * 3;
    return r && k < r.length ? r[k] - this.session.headerRows + 1 : -1;
  }

  getRow(row: number): string[] | undefined {
    return this.blocks.get(row);
  }

  prefetch(first: number, last: number): void {
    this.blocks.prefetch(first, last, this.rowCount);
  }

  /** The sorted order file, `(file row, start, next)` as f64 per row: for exports. */
  get orderFile(): File {
    return this.order;
  }

  async records(first: number, n: number): Promise<Float64Array> {
    const end = Math.min(this.rowCount, first + n);
    if (end <= first) return new Float64Array(0);
    return new Float64Array(await this.order.slice(first * REC, end * REC).arrayBuffer());
  }

  async fileRowAt(row: number): Promise<number> {
    return (await this.records(row, 1))[0];
  }

  /** Where file row `fileRow` sits in the sorted order (a scan of the order file), or `rowCount`. */
  async findFileRow(fileRow: number): Promise<number> {
    const CHUNK = 1 << 20;
    for (let first = 0; first < this.rowCount; first += CHUNK) {
      const r = await this.records(first, CHUNK);
      for (let k = 0; k < r.length; k += 3) if (r[k] === fileRow) return first + k / 3;
    }
    return this.rowCount;
  }

  /** The next row after `from` (or the first, for null) in direction `dir` whose file row passes `test`, wrapping around. */
  async nextMatch(from: number | null, dir: 1 | -1, test: (fileRow: number) => Promise<boolean>): Promise<number | null> {
    const n = this.rowCount;
    if (n === 0) return null;
    let i = from === null ? (dir > 0 ? 0 : n - 1) : (from + dir + n) % n;
    const CHUNK = 4096;
    for (let seen = 0; seen < n; ) {
      const first = dir > 0 ? i : Math.max(0, i - CHUNK + 1);
      const r = await this.records(first, Math.min(CHUNK, dir > 0 ? n - i : i + 1));
      const count = r.length / 3;
      for (let j = 0; j < count && seen < n; j++, seen++) {
        const k = dir > 0 ? j : count - 1 - j;
        if (await test(r[k * 3])) return first + k;
      }
      i = dir > 0 ? (first + count) % n : (first - 1 + n) % n;
    }
    return null;
  }

  dispose(): void {
    this.session.pool.cancel(this);
  }

  private async loadRows(first: number, count: number): Promise<string[][]> {
    const r = await this.records(first, count);
    this.recs.set(Math.floor(first / BLOCK), r);
    if (this.recs.size > 400) this.recs.delete(this.recs.keys().next().value!);
    // Read in file order (so nearby rows share a read), then put them back in sorted order.
    const n = r.length / 3;
    const byStart = Array.from({ length: n }, (_, i) => i).sort((a, b) => r[a * 3 + 1] - r[b * 3 + 1]);
    const spans = new Float64Array(n * 2);
    byStart.forEach((i, k) => {
      spans[k * 2] = r[i * 3 + 1];
      spans[k * 2 + 1] = r[i * 3 + 2];
    });
    const f = this.session.format;
    const { rows } = await this.session.pool.rowsAt(
      { file: this.session.file, spans, delimiter: f.delimiter, quote: this.session.quote, encoding: f.encoding },
      this,
    );
    const out: string[][] = new Array(n);
    byStart.forEach((i, k) => (out[i] = rows[k]));
    return out;
  }
}
