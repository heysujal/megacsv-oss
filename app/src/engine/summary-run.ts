// Runs a group-by summary over the whole (fully read) file in the worker pool
// and merges the parts as they arrive.

import type { QuerySpec } from "./protocol";
import { Cancelled, type WorkerPool } from "./pool";
import { type RunPhase, RunState } from "./run-state";
import type { FileSession } from "./session";

const UNIT_BYTES = 8 << 20;
/** Most distinct groups kept; the rest are counted together as "other". */
export const MAX_GROUPS = 1_000_000;

export interface Group {
  key: string;
  rows: number;
  empty: number;
  numbers: number;
  sum: number;
  min: number;
  max: number;
}

export interface SummarySpec {
  group: number;
  value: number;
  spec: QuerySpec | null;
}

export class SummaryRun {
  onUpdate: () => void = () => {};
  readonly groups = new Map<string, Group>();
  readonly other: Group = emptyGroup("");
  private unitsTotal = 0;
  private unitsDone = 0;
  private state = new RunState();
  readonly started = performance.now();

  constructor(
    readonly session: FileSession,
    private pool: WorkerPool,
    readonly what: SummarySpec,
  ) {}

  get progress(): number {
    return this.unitsTotal ? this.unitsDone / this.unitsTotal : 0;
  }

  get complete(): boolean {
    return this.state.phase === "done";
  }

  get phase(): RunPhase {
    return this.state.phase;
  }

  get error(): string | null {
    return this.state.error;
  }

  start(): void {
    if (!this.state.begin()) return;
    const s = this.session;
    const f = s.format;
    const units = s.units(UNIT_BYTES);
    this.unitsTotal = units.length / 3;
    if (this.unitsTotal === 0) {
      this.unitsTotal = 1;
      this.unitsDone = 1;
      this.state.finish();
      this.onUpdate();
      return;
    }
    for (let i = 0; i < units.length; i += 3) {
      this.pool
        .summary(
          {
            file: s.file,
            start: units[i],
            end: units[i + 1],
            firstRow: units[i + 2],
            minRow: s.headerRows,
            spec: this.what.spec,
            group: this.what.group,
            value: this.what.value,
            maxGroups: MAX_GROUPS,
            delimiter: f.delimiter,
            quote: s.quote,
            encoding: f.encoding,
          },
          this,
        )
        .then(
          (res) => this.merge(res.keys, res.stats),
          (err) => {
            if (err instanceof Cancelled || !this.state.active) return;
            this.state.fail(err instanceof Error ? err.message : String(err));
            this.pool.cancel(this);
            this.onUpdate();
          },
        );
    }
  }

  cancel(): void {
    this.state.cancel();
    this.pool.cancel(this);
  }

  private merge(keys: string[], stats: Float64Array): void {
    if (!this.state.active) return;
    const last = keys.length - 1;
    for (let i = 0; i < keys.length; i++) {
      let g: Group;
      if (i === last) g = this.other;
      else {
        const found = this.groups.get(keys[i]);
        if (found) g = found;
        else if (this.groups.size < MAX_GROUPS) {
          g = emptyGroup(keys[i]);
          this.groups.set(keys[i], g);
        } else g = this.other;
      }
      const o = i * 6;
      g.rows += stats[o];
      g.empty += stats[o + 1];
      g.numbers += stats[o + 2];
      g.sum += stats[o + 3];
      g.min = Math.min(g.min, stats[o + 4]);
      g.max = Math.max(g.max, stats[o + 5]);
    }
    this.unitsDone++;
    if (this.unitsDone === this.unitsTotal) this.state.finish();
    this.onUpdate();
  }
}

function emptyGroup(key: string): Group {
  return { key, rows: 0, empty: 0, numbers: 0, sum: 0, min: Infinity, max: -Infinity };
}
