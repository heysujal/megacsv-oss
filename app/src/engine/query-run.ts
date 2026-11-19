// Runs one query (find text and/or filters) over the whole file in the worker
// pool and keeps its matching rows in file order, with no limit on how many.
//
// The file is searched in units of about 8 MB. For every unit the run keeps the
// number of matches. The matches themselves (row number, start, next: 24 bytes
// each) are kept in memory up to a budget of KEEP rows; beyond that a unit keeps
// only its count, and its matches are found again when they're needed (the rows
// on screen, go to row, next match). That takes one unit's search, a few
// milliseconds, and keeps memory flat however many rows match.

import type { QuerySpec } from "./protocol";
import { Cancelled, type WorkerPool } from "./pool";
import { type RunPhase, RunState } from "./run-state";
import type { FileSession } from "./session";

const UNIT_BYTES = 8 << 20;
/** Matches kept in memory while searching (24 bytes each, so 120 MB at most). */
let KEEP = 5_000_000;
/** Matches of units searched again on demand, kept for reuse (24 bytes each). */
const CACHE_ROWS = 2_000_000;

/** For tests: a small budget exercises the search-again path on small files (`?keep=` in the URL). */
export function setKeepLimit(n: number): void {
  KEEP = Math.max(0, Math.floor(n));
}

export class QueryRun {
  onUpdate: () => void = () => {};
  private state = new RunState();

  /** Flat `[start, end, firstRow, ...]`; grows while the file is being read. */
  private units: number[] = [];
  /** Matches per unit, once searched; -1 until then. */
  private counts: number[] = [];
  /** Matches of units kept from the first search: flat `[fileRow, start, next, ...]`. */
  private kept: (Float64Array | undefined)[] = [];
  private keptRows = 0;
  /** Matches of units searched again, most recently used last. */
  private cache = new Map<number, Float64Array>();
  private cacheRows = 0;
  private loading = new Map<number, Promise<Float64Array>>();
  /** End offset of the last unit taken from the index. */
  private coveredUntil = 0;
  private nextUnit = 0;
  private inflight = 0;
  private unitsDone = 0;
  private bytesDone = 0;
  private counted = 0;
  /** Units completed in order from the start; only these are visible. */
  private prefixUnits = 0;
  /** Visible rows before each prefix unit. */
  private prefixCum: number[] = [0];
  /** True once every unit of the fully read file is known. */
  private allUnitsKnown = false;
  private unsubscribe: () => void = () => {};

  constructor(
    readonly session: FileSession,
    private pool: WorkerPool,
    readonly spec: QuerySpec,
  ) {}

  /** Starts on the part of the file read so far, and keeps up as reading continues. */
  start(): void {
    if (!this.state.begin()) return;
    this.coveredUntil = this.session.format.dataStart;
    this.unsubscribe = this.session.onRead(() => this.takeUnits());
    this.takeUnits();
  }

  cancel(): void {
    this.state.cancel();
    this.stopWork();
  }

  get phase(): RunPhase {
    return this.state.phase;
  }

  get error(): string | null {
    return this.state.error;
  }

  /** Matching rows visible so far, in file order. */
  get available(): number {
    return this.prefixCum[this.prefixUnits];
  }

  /** All matching rows found so far. */
  get total(): number {
    return this.counted;
  }

  get complete(): boolean {
    return this.state.phase === "done";
  }

  /** Share of the whole file searched so far. */
  get progress(): number {
    if (this.complete) return 1;
    const total = this.session.file.size - this.session.format.dataStart;
    return total > 0 ? this.bytesDone / total : 0;
  }

  /** Kept for analytics; the view has no limit any more. */
  get capped(): boolean {
    return false;
  }

  /** File row of match `i` if its unit is in memory; otherwise starts loading it and returns undefined. */
  fileRowNow(i: number): number | undefined {
    const [u, k] = this.locate(i);
    const m = this.matchesNow(u);
    if (m) return m[k * 3];
    void this.load(u, true).catch(() => {});
    return undefined;
  }

  /** `[fileRow, start, next, ...]` for matches `first` to `first + n - 1` (visible ones only). */
  async records(first: number, n: number, urgent = true): Promise<Float64Array> {
    const end = Math.min(first + n, this.available);
    const out = new Float64Array(Math.max(0, end - first) * 3);
    let i = first;
    while (i < end) {
      const [u, k] = this.locate(i);
      const m = await this.load(u, urgent);
      const take = Math.min(end - i, m.length / 3 - k);
      out.set(m.subarray(k * 3, (k + take) * 3), (i - first) * 3);
      i += take;
    }
    return out;
  }

  async fileRow(i: number): Promise<number> {
    return (await this.records(i, 1))[0];
  }

  /** Index of the first visible match at or after `fileRow` (may equal `available`). */
  async indexOfFileRow(fileRow: number): Promise<number> {
    // The unit holding that file row: the last prefix unit starting at or before it.
    let lo = 0;
    let hi = this.prefixUnits - 1;
    if (hi < 0) return 0;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (this.units[mid * 3 + 2] <= fileRow) lo = mid;
      else hi = mid - 1;
    }
    const m = await this.load(lo, true);
    let a = 0;
    let b = m.length / 3;
    while (a < b) {
      const mid = (a + b) >> 1;
      if (m[mid * 3] < fileRow) a = mid + 1;
      else b = mid;
    }
    return this.prefixCum[lo] + a;
  }

  /** Whether `fileRow` is one of the matches (visible ones only). */
  async has(fileRow: number): Promise<boolean> {
    const i = await this.indexOfFileRow(fileRow);
    return i < this.available && (await this.fileRow(i)) === fileRow;
  }

  /** Unit and position within it of visible match `i`. */
  private locate(i: number): [number, number] {
    // Last prefix unit whose cumulative start is <= i; units with no matches never are, for i < available.
    let lo = 0;
    let hi = this.prefixUnits - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (this.prefixCum[mid] <= i) lo = mid;
      else hi = mid - 1;
    }
    return [lo, i - this.prefixCum[lo]];
  }

  private matchesNow(u: number): Float64Array | undefined {
    const kept = this.kept[u];
    if (kept) return kept;
    const c = this.cache.get(u);
    if (c) {
      this.cache.delete(u);
      this.cache.set(u, c);
    }
    return c;
  }

  /** A unit's matches, from memory or by searching it again. */
  private load(u: number, urgent: boolean): Promise<Float64Array> {
    const now = this.matchesNow(u);
    if (now) return Promise.resolve(now);
    let p = this.loading.get(u);
    if (!p) {
      p = this.search(u, Number.MAX_SAFE_INTEGER, urgent).then(
        (res) => {
          this.loading.delete(u);
          if (res.count !== this.counts[u]) throw new Error("The file changed while it was open.");
          this.cache.set(u, res.matches);
          this.cacheRows += res.count;
          for (const [old, m] of this.cache) {
            if (this.cacheRows <= CACHE_ROWS || old === u) break;
            this.cache.delete(old);
            this.cacheRows -= m.length / 3;
          }
          this.onUpdate();
          return res.matches;
        },
        (err) => {
          this.loading.delete(u);
          throw err;
        },
      );
      this.loading.set(u, p);
    }
    return p;
  }

  private search(u: number, limit: number, urgent: boolean) {
    const f = this.session.format;
    return this.pool.query(
      {
        file: this.session.file,
        start: this.units[u * 3],
        end: this.units[u * 3 + 1],
        firstRow: this.units[u * 3 + 2],
        minRow: this.session.headerRows,
        spec: this.spec,
        limit,
        delimiter: f.delimiter,
        quote: this.session.quote,
        encoding: f.encoding,
      },
      this,
      urgent,
    );
  }

  /** Takes newly read ranges from the index and queues them. */
  private takeUnits(): void {
    if (!this.state.active || this.allUnitsKnown) return;
    const more = this.session.unitsFrom(this.coveredUntil, UNIT_BYTES);
    for (let i = 0; i < more.length; i += 3) {
      this.units.push(more[i], more[i + 1], more[i + 2]);
      this.counts.push(-1);
      this.kept.push(undefined);
      this.coveredUntil = more[i + 1];
    }
    if (this.session.isComplete) {
      this.allUnitsKnown = true;
      this.unsubscribe();
    }
    this.pump();
    this.finishIfDone();
    if (more.length > 0 || this.complete) this.onUpdate();
  }

  /** Keeps a few units in flight. */
  private pump(): void {
    const n = this.counts.length;
    while (this.state.active && this.nextUnit < n && this.inflight < this.pool.size * 2) {
      const u = this.nextUnit++;
      this.inflight++;
      this.search(u, Math.max(0, KEEP - this.keptRows), false).then(
        (res) => this.onUnit(u, res.matches, res.count),
        (err) => {
          if (err instanceof Cancelled || !this.state.active) return;
          this.state.fail(err instanceof Error ? err.message : String(err));
          this.stopWork();
          this.onUpdate();
        },
      );
    }
  }

  private onUnit(u: number, matches: Float64Array, count: number): void {
    if (!this.state.active) return;
    this.inflight--;
    this.unitsDone++;
    this.counted += count;
    this.counts[u] = count;
    this.bytesDone += this.units[u * 3 + 1] - this.units[u * 3];
    // Keep the unit only if it's complete and fits the budget; otherwise just its count.
    if (matches.length / 3 === count && this.keptRows + count <= KEEP) {
      this.kept[u] = matches;
      this.keptRows += count;
    }
    while (this.prefixUnits < this.counts.length && this.counts[this.prefixUnits] >= 0) {
      this.prefixCum.push(this.available + this.counts[this.prefixUnits]);
      this.prefixUnits++;
    }
    this.pump();
    this.finishIfDone();
    this.onUpdate();
  }

  private finishIfDone(): void {
    if (this.allUnitsKnown && this.unitsDone === this.counts.length) this.state.finish();
  }

  private stopWork(): void {
    this.unsubscribe();
    this.pool.cancel(this);
  }
}
