// Grid source for a filtered view: row i is the i-th matching row of a query.

import type { GridSource } from "../grid/grid";
import { BlockCache } from "./blocks";
import type { QueryRun } from "./query-run";
import type { FileSession } from "./session";

/** A grid source whose rows map to rows of the file (all rows, a filter, a sort). */
export interface RowView extends GridSource {
  /** File row (0-based, header included) of view row `row`. */
  fileRowAt(row: number): Promise<number>;
  /** First view row whose file row is `fileRow` or later in this view's order, or `rowCount`. */
  findFileRow(fileRow: number): Promise<number>;
}

export class ResultView implements RowView {
  private blocks: BlockCache;

  constructor(
    private session: FileSession,
    readonly run: QueryRun,
    onChange: () => void,
  ) {
    this.blocks = new BlockCache((first, count) => this.loadRows(first, count), onChange);
  }

  get rowCount(): number {
    return this.run.available;
  }

  get header(): string[] {
    return this.session.header;
  }

  get columnCount(): number {
    return Math.max(this.session.columnCount, this.blocks.maxColumns());
  }

  /** Gutter shows each row's number in the file, so it must fit the largest. */
  get labelMax(): number {
    return this.session.labelMax;
  }

  /** The row's number in the file; -1 while its unit is being searched again. */
  rowLabel(row: number): number {
    const fileRow = this.run.fileRowNow(row);
    return fileRow === undefined ? -1 : fileRow - this.session.headerRows + 1;
  }

  fileRowAt(row: number): Promise<number> {
    return this.run.fileRow(row);
  }

  findFileRow(fileRow: number): Promise<number> {
    return this.run.indexOfFileRow(fileRow);
  }

  getRow(row: number): string[] | undefined {
    return this.blocks.get(row);
  }

  prefetch(first: number, last: number): void {
    this.blocks.prefetch(first, last, this.rowCount);
  }

  /** Call when the query has found more rows. */
  refresh(): void {
    this.blocks.dropPartial();
  }

  dispose(): void {
    this.session.pool.cancel(this);
  }

  private async loadRows(first: number, count: number): Promise<string[][]> {
    const recs = await this.run.records(first, count);
    const n = recs.length / 3;
    const spans = new Float64Array(n * 2);
    for (let i = 0; i < n; i++) {
      spans[i * 2] = recs[i * 3 + 1];
      spans[i * 2 + 1] = recs[i * 3 + 2];
    }
    const f = this.session.format;
    const { rows } = await this.session.pool.rowsAt(
      { file: this.session.file, spans, delimiter: f.delimiter, quote: this.session.quote, encoding: f.encoding },
      this,
    );
    return rows;
  }
}
