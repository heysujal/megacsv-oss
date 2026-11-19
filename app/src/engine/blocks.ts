// Fixed-size blocks of display rows, loaded on demand and kept in an LRU.
// Shared by the full-file view and the filtered view.

import { Cancelled } from "./pool";

const BLOCK_ROWS = 256;
const MAX_BLOCKS = 200;

export class BlockCache {
  private blocks = new Map<number, string[][]>();
  private loading = new Set<number>();
  private widest = 0;
  /** Bumped by dropPartial, so a short block requested before it isn't kept after it. */
  private generation = 0;

  constructor(
    private load: (firstRow: number, count: number) => Promise<string[][]>,
    private onLoaded: () => void,
  ) {}

  /** A row if loaded; otherwise starts loading its block and returns undefined. */
  get(row: number): string[] | undefined {
    const b = Math.floor(row / BLOCK_ROWS);
    const block = this.blocks.get(b);
    if (block) {
      // Refresh LRU position.
      this.blocks.delete(b);
      this.blocks.set(b, block);
      return block[row - b * BLOCK_ROWS];
    }
    this.loadBlock(b);
    return undefined;
  }

  /** Loads the blocks covering `[first, last]` plus one ahead, below `limit` rows. */
  prefetch(first: number, last: number, limit: number): void {
    const lastBlock = Math.floor(last / BLOCK_ROWS) + 1;
    for (let b = Math.floor(first / BLOCK_ROWS); b <= lastBlock; b++) {
      // Block 0 is always readable, even before the row count is known.
      if (b > 0 && b * BLOCK_ROWS >= limit) break;
      if (!this.blocks.has(b)) this.loadBlock(b);
    }
  }

  /** Forgets blocks loaded before all their rows existed (a growing filtered view). */
  dropPartial(): void {
    this.generation++;
    for (const [b, rows] of this.blocks) if (rows.length < BLOCK_ROWS) this.blocks.delete(b);
  }

  loadedRowsInFirstBlock(): number {
    return this.blocks.get(0)?.length ?? 0;
  }

  maxColumns(): number {
    return this.widest;
  }

  private loadBlock(b: number): void {
    if (this.loading.has(b)) return;
    this.loading.add(b);
    const generation = this.generation;
    this.load(b * BLOCK_ROWS, BLOCK_ROWS).then(
      (rows) => {
        this.loading.delete(b);
        // More rows may exist now than when this was asked for: ask again on the next paint.
        if (generation !== this.generation && rows.length < BLOCK_ROWS) {
          this.onLoaded();
          return;
        }
        this.blocks.set(b, rows);
        for (const r of rows) this.widest = Math.max(this.widest, r.length);
        if (this.blocks.size > MAX_BLOCKS) this.blocks.delete(this.blocks.keys().next().value!);
        this.onLoaded();
      },
      (err) => {
        this.loading.delete(b);
        if (!(err instanceof Cancelled)) console.error(err);
      },
    );
  }
}
