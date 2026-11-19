// Canvas grid. Draws only the visible cells, and maps a custom scrollbar to
// row numbers so there is no browser height limit at any file size.

export interface GridSource {
  readonly rowCount: number;
  /** Largest row label the gutter may need to show (sizes it once, so it doesn't twitch). */
  readonly labelMax?: number;
  readonly columnCount: number;
  readonly header: string[];
  getRow(row: number): string[] | undefined;
  prefetch(first: number, last: number): void;
  /** Number shown in the gutter for `row`; defaults to `row + 1`. */
  rowLabel?(row: number): number;
}

const ROW_H = 28;
/** Column letters (A, B, C…) above the column names. */
const LETTERS_H = 22;
const NAMES_H = 28;
const HEADER_H = LETTERS_H + NAMES_H;
const BAR = 12;
const PAD = 8;
const MIN_COL = 60;
const MAX_COL = 320;
const FAMILY = '"Hanken Grotesk Variable", system-ui, sans-serif';
const FONT = `13px ${FAMILY}`;
const BOLD = `500 ${FONT}`;
const SMALL = `11px ${FAMILY}`;
/** Cells that look like plain numbers are right-aligned, as in Excel (display only). */
const NUMERIC = /^[-+]?[\d.,\s]*\d[\d.,\s]*%?$/;

interface Theme {
  bg: string;
  text: string;
  muted: string;
  grid: string;
  headerBg: string;
  namesBg: string;
  selected: string;
  accent: string;
  bar: string;
  thumb: string;
  highlight: string;
}

function readTheme(el: HTMLElement): Theme {
  const css = getComputedStyle(el);
  const v = (name: string) => css.getPropertyValue(name).trim();
  return {
    bg: v("--grid-bg"),
    text: v("--grid-text"),
    muted: v("--grid-muted"),
    grid: v("--grid-line"),
    headerBg: v("--grid-header-bg"),
    namesBg: v("--grid-names-bg"),
    selected: v("--grid-selected"),
    accent: v("--grid-accent"),
    bar: v("--grid-bar"),
    thumb: v("--grid-thumb"),
    highlight: v("--grid-highlight"),
  };
}

type Drag =
  | { axis: "y" | "x"; grabOffset: number }
  | { axis: "col"; col: number; startX: number; startW: number }
  | { axis: "cells" }
  | { axis: "pan"; x: number; y: number; top: number; scrollX: number; moved: boolean; cell: Cell | null; samples: { t: number; x: number; y: number }[] }
  | null;

type Cell = { row: number; col: number };

export interface GridEvents {
  /** Full value of a cell, for the inspector (double-click or Enter). */
  onInspect?(cell: Cell & { header: string; value: string; label: number }): void;
  /** Short messages for the status line (e.g. "Copied 12 cells"). */
  onMessage?(text: string): void;
  /** The active cell changed (for the formula bar); null when nothing is selected. */
  onSelect?(cell: (Cell & { header: string; value: string | undefined; label: number }) | null): void;
}

/** Most cells one copy takes, so a huge selection can't freeze the page. */
const COPY_MAX_CELLS = 1_000_000;
const RESIZE_GRAB = 5;

export class Grid {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private source: GridSource | null = null;
  private theme: Theme;
  private width = 0;
  private height = 0;
  /** First visible data row, fractional while wheel-scrolling. */
  private top = 0;
  private scrollX = 0;
  private colWidths: number[] = [];
  private measuredRows = 0;
  private selected: Cell | null = null;
  /** Other corner of a range selection; null for a single cell. */
  private anchor: Cell | null = null;
  /** Columns the user sized by hand; automatic sizing leaves them alone. */
  private fixedCols = new Set<number>();
  private a11y: HTMLTableElement;
  private a11yTimer = 0;
  events: GridEvents = {};
  private drag: Drag = null;
  private dirty = false;
  private textWidthCache = new Map<string, number>();
  private gutter = 48;
  private highlight: { text: string; matchCase: boolean } | null = null;
  /** Last cell reported to onSelect, so it fires only on change (or when its row loads). */
  private reported = "";
  private lastTap: { t: number; row: number; col: number } | null = null;
  private momentum = 0;

  constructor(private host: HTMLElement) {
    this.canvas = document.createElement("canvas");
    this.canvas.tabIndex = 0;
    // Touch drags scroll the grid (handled below), not the page.
    this.canvas.style.touchAction = "none";
    this.canvas.style.display = "block";
    this.canvas.setAttribute("aria-label", "Data grid. A copy of the rows on screen follows as a table.");
    host.appendChild(this.canvas);
    // Rule 4: a hidden, accessible copy of the rows on screen for screen readers and browser agents.
    this.a11y = document.createElement("table");
    this.a11y.className = "sr-only-table";
    this.a11y.setAttribute("aria-label", "Rows on screen");
    host.appendChild(this.a11y);
    this.ctx = this.canvas.getContext("2d")!;
    this.theme = readTheme(host);

    new ResizeObserver(() => this.resize()).observe(host);
    // The theme follows the system setting and the app's light/dark switch (a class on <html>).
    matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => this.refreshTheme());
    new MutationObserver(() => this.refreshTheme()).observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    // The web font may arrive after the first paint; measured widths change with it.
    void document.fonts?.ready.then(() => {
      this.textWidthCache.clear();
      this.invalidate();
    });
    this.canvas.addEventListener("wheel", (e) => this.onWheel(e), { passive: false });
    this.canvas.addEventListener("pointerdown", (e) => this.onPointerDown(e));
    this.canvas.addEventListener("pointermove", (e) => this.onPointerMove(e));
    // A drag ends on release anywhere, including outside the window, and when
    // the browser cancels the pointer or takes capture away.
    for (const type of ["pointerup", "pointercancel", "lostpointercapture"] as const) {
      this.canvas.addEventListener(type, (e) => this.endDrag(e));
    }
    window.addEventListener("pointerup", (e) => this.endDrag(e));
    window.addEventListener("blur", () => this.endDrag());
    this.canvas.addEventListener("keydown", (e) => this.onKey(e));
    this.canvas.addEventListener("dblclick", (e) => this.onDoubleClick(e));
    this.canvas.addEventListener("copy", (e) => e.preventDefault());
    this.resize();
  }

  refreshTheme(): void {
    this.theme = readTheme(this.host);
    this.invalidate();
  }

  /** `sameFile` keeps column widths, for switching between views of one file. */
  setSource(source: GridSource | null, sameFile = false): void {
    this.source = source;
    this.top = 0;
    this.selected = null;
    this.anchor = null;
    if (!sameFile) {
      this.scrollX = 0;
      this.colWidths = [];
      this.fixedCols.clear();
      this.measuredRows = 0;
      this.gutter = 48;
    }
    this.invalidate();
  }

  /** Marks occurrences of `text` in visible cells. */
  setHighlight(highlight: { text: string; matchCase: boolean } | null): void {
    this.highlight = highlight?.text ? highlight : null;
    this.invalidate();
  }

  /** The selected row, or the top visible row if nothing is selected. */
  get currentRow(): number | null {
    if (!this.source || this.source.rowCount === 0) return null;
    return this.selected?.row ?? null;
  }

  /** Call when the source has new rows or a new row count. */
  invalidate(): void {
    if (this.dirty) return;
    this.dirty = true;
    requestAnimationFrame(() => {
      this.dirty = false;
      this.draw();
    });
  }

  goToRow(row: number, col?: number): void {
    if (!this.source) return;
    const r = Math.max(0, Math.min(row, this.source.rowCount - 1));
    this.selected = { row: r, col: col ?? this.selected?.col ?? 0 };
    this.anchor = null;
    this.top = Math.max(0, r - Math.floor(this.visibleRows() / 3));
    this.clampTop();
    this.invalidate();
    this.canvas.focus();
  }

  // ---- layout ----

  private resize(): void {
    const dpr = devicePixelRatio || 1;
    this.width = this.host.clientWidth;
    this.height = this.host.clientHeight;
    this.canvas.width = Math.round(this.width * dpr);
    this.canvas.height = Math.round(this.height * dpr);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.invalidate();
  }

  private gutterWidth(): number {
    // Sized for the expected final row count in the widest digits, and only
    // ever grows, so the grid doesn't shift while the file is being read.
    const n = Math.max(1, this.source?.rowCount ?? 1, this.source?.labelMax ?? 0);
    const template = n.toLocaleString().replace(/\d/g, "8");
    this.gutter = Math.max(this.gutter, Math.ceil(this.measure(template, FONT)) + 2 * PAD);
    return this.gutter;
  }

  private bodyHeight(): number {
    return this.height - HEADER_H - BAR;
  }

  private bodyWidth(): number {
    return this.width - this.gutterWidth() - BAR;
  }

  private visibleRows(): number {
    return Math.max(1, Math.floor(this.bodyHeight() / ROW_H));
  }

  private maxTop(): number {
    return Math.max(0, (this.source?.rowCount ?? 0) - this.visibleRows());
  }

  private clampTop(): void {
    this.top = Math.max(0, Math.min(this.top, this.maxTop()));
  }

  private totalColWidth(): number {
    return this.colWidths.reduce((a, b) => a + b, 0);
  }

  private clampX(): void {
    this.scrollX = Math.max(0, Math.min(this.scrollX, this.totalColWidth() - this.bodyWidth()));
  }

  private measure(text: string, font: string): number {
    const key = font === BOLD ? `b${text}` : text;
    let w = this.textWidthCache.get(key);
    if (w === undefined) {
      this.ctx.font = font;
      w = this.ctx.measureText(text).width;
      if (this.textWidthCache.size > 20000) this.textWidthCache.clear();
      this.textWidthCache.set(key, w);
    }
    return w;
  }

  /** Column widths from the header and the first rows seen; refined as more load. */
  private updateColumnWidths(first: number, last: number): void {
    const src = this.source!;
    const n = src.columnCount;
    while (this.colWidths.length < n) {
      const i = this.colWidths.length;
      const label = src.header[i] ?? columnLetter(i);
      this.colWidths.push(clampCol(this.measure(label, BOLD) + 2 * PAD + 4));
    }
    if (this.measuredRows > 2000) return;
    for (let r = first; r <= last; r++) {
      const row = src.getRow(r);
      if (!row) continue;
      this.measuredRows++;
      for (let c = 0; c < row.length; c++) {
        if (this.fixedCols.has(c)) continue;
        const w = clampCol(this.measure(row[c].slice(0, 60), FONT) + 2 * PAD);
        if (w > this.colWidths[c]) this.colWidths[c] = w;
      }
    }
  }

  // ---- drawing ----

  private draw(): void {
    const { ctx, theme: t } = this;
    ctx.fillStyle = t.bg;
    ctx.fillRect(0, 0, this.width, this.height);
    const src = this.source;
    if (!src) {
      this.report();
      return;
    }

    this.clampTop();
    const first = Math.floor(this.top);
    const last = Math.min(src.rowCount - 1, first + this.visibleRows());
    src.prefetch(first, Math.max(first, last));
    this.updateColumnWidths(first, last);
    this.clampX();

    const gutter = this.gutterWidth();
    const bodyW = this.bodyWidth();
    const bodyH = this.bodyHeight();
    const sel = this.selected;
    const rg = this.range();

    // Visible columns.
    const cols: { c: number; x: number; w: number }[] = [];
    let x = gutter - this.scrollX;
    for (let c = 0; c < this.colWidths.length && x < gutter + bodyW; c++) {
      const w = this.colWidths[c];
      if (x + w > gutter) cols.push({ c, x, w });
      x += w;
    }

    ctx.textBaseline = "middle";

    // Body.
    ctx.save();
    ctx.beginPath();
    ctx.rect(gutter, HEADER_H, bodyW, bodyH);
    ctx.clip();
    ctx.font = FONT;
    for (let r = first; r <= last; r++) {
      const y = HEADER_H + (r - first) * ROW_H;
      const row = src.getRow(r);
      if (rg && r >= rg[0] && r <= rg[1]) {
        // The selected rows get a light tint; the selected cells a stronger one.
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = t.selected;
        ctx.fillRect(gutter, y, bodyW, ROW_H);
        ctx.globalAlpha = 1;
      }
      for (const { c, x, w } of cols) {
        if (this.isSelected(r, c)) {
          ctx.fillStyle = t.selected;
          ctx.fillRect(x, y, w, ROW_H);
        }
        const text = row?.[c];
        if (text) {
          const shown = this.fit(text, w - 2 * PAD, FONT);
          const right = NUMERIC.test(text);
          const tx = right ? x + w - PAD - this.measure(shown, FONT) : x + PAD;
          if (this.highlight) this.drawHighlights(shown, tx, y);
          ctx.fillStyle = t.text;
          ctx.fillText(shown, tx, y + ROW_H / 2);
        }
      }
      if (!row) {
        ctx.fillStyle = t.muted;
        ctx.fillText("…", gutter + PAD, y + ROW_H / 2);
      }
    }
    // Grid lines.
    ctx.strokeStyle = t.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let r = first; r <= last + 1; r++) {
      const y = Math.round(HEADER_H + (r - first) * ROW_H) + 0.5;
      ctx.moveTo(gutter, y);
      ctx.lineTo(gutter + bodyW, y);
    }
    for (const { x, w } of cols) {
      const lx = Math.round(x + w) + 0.5;
      ctx.moveTo(lx, HEADER_H);
      ctx.lineTo(lx, HEADER_H + bodyH);
    }
    ctx.stroke();
    // The active cell: a cobalt ring, as in a spreadsheet.
    if (sel && sel.row >= first && sel.row <= last) {
      const cell = cols.find((k) => k.c === sel.col);
      if (cell) {
        ctx.strokeStyle = t.accent;
        ctx.lineWidth = 2;
        ctx.strokeRect(Math.round(cell.x) + 1, HEADER_H + (sel.row - first) * ROW_H + 1, cell.w - 1, ROW_H - 1);
        ctx.lineWidth = 1;
      }
    }
    ctx.restore();

    // Header: column letters on the ground tone, names on the sheet.
    ctx.fillStyle = t.headerBg;
    ctx.fillRect(0, 0, this.width, LETTERS_H);
    ctx.fillStyle = t.namesBg;
    ctx.fillRect(0, LETTERS_H, this.width, NAMES_H);
    ctx.save();
    ctx.beginPath();
    ctx.rect(gutter, 0, bodyW, HEADER_H);
    ctx.clip();
    ctx.textAlign = "center";
    ctx.font = SMALL;
    for (const { c, x, w } of cols) {
      const inRange = rg && c >= rg[2] && c <= rg[3];
      ctx.fillStyle = inRange ? t.accent : t.muted;
      ctx.fillText(columnLetter(c), x + w / 2, LETTERS_H / 2 + 1);
    }
    ctx.textAlign = "left";
    ctx.font = BOLD;
    ctx.fillStyle = t.muted;
    for (const { c, x, w } of cols) {
      const label = src.header[c] ?? columnLetter(c);
      ctx.fillText(this.fit(label, w - 2 * PAD, BOLD), x + PAD, LETTERS_H + NAMES_H / 2);
    }
    ctx.strokeStyle = t.grid;
    ctx.beginPath();
    for (const { x, w } of cols) {
      const lx = Math.round(x + w) + 0.5;
      ctx.moveTo(lx, 0);
      ctx.lineTo(lx, HEADER_H);
    }
    ctx.stroke();
    ctx.restore();

    // Row-number gutter; the selected row's number in cobalt.
    ctx.fillStyle = t.headerBg;
    ctx.fillRect(0, LETTERS_H, gutter, this.height - LETTERS_H);
    ctx.font = FONT;
    ctx.textAlign = "right";
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, HEADER_H, gutter, bodyH);
    ctx.clip();
    for (let r = first; r <= last; r++) {
      const y = HEADER_H + (r - first) * ROW_H;
      ctx.fillStyle = rg && r >= rg[0] && r <= rg[1] ? t.accent : t.muted;
      const label = src.rowLabel?.(r) ?? r + 1;
      ctx.fillText(label < 0 ? "…" : label.toLocaleString(), gutter - PAD, y + ROW_H / 2);
    }
    ctx.restore();
    ctx.textAlign = "left";

    ctx.strokeStyle = t.grid;
    ctx.beginPath();
    ctx.moveTo(0, LETTERS_H + 0.5);
    ctx.lineTo(this.width, LETTERS_H + 0.5);
    ctx.moveTo(0, HEADER_H + 0.5);
    ctx.lineTo(this.width, HEADER_H + 0.5);
    ctx.moveTo(gutter + 0.5, 0);
    ctx.lineTo(gutter + 0.5, this.height);
    ctx.stroke();

    this.drawScrollbars();
    this.scheduleA11y(first, last, cols.map((c) => c.c));
    this.report();
  }

  /** Tells the formula bar about the active cell when it, or its loaded value, changes. */
  private report(): void {
    const src = this.source;
    const sel = this.selected;
    if (!src || !sel) {
      if (this.reported !== "") {
        this.reported = "";
        this.events.onSelect?.(null);
      }
      return;
    }
    const value = src.getRow(sel.row)?.[sel.col];
    const label = src.rowLabel?.(sel.row) ?? sel.row + 1;
    const key = `${sel.row}:${sel.col}:${value === undefined ? 0 : 1}:${label}`;
    if (key === this.reported) return;
    this.reported = key;
    this.events.onSelect?.({
      ...sel,
      value,
      label,
      header: src.header[sel.col] ?? `Column ${columnLetter(sel.col)}`,
    });
  }

  /** Rebuilds the hidden table shortly after scrolling stops. */
  private scheduleA11y(first: number, last: number, cols: number[]): void {
    clearTimeout(this.a11yTimer);
    this.a11yTimer = window.setTimeout(() => {
      const src = this.source;
      if (!src) return;
      const head = document.createElement("tr");
      head.append(cellEl("th", "Row", { scope: "col" }));
      for (const c of cols) head.append(cellEl("th", src.header[c] ?? columnLetter(c), { scope: "col", "aria-colindex": String(c + 1) }));
      const rows = [head];
      for (let r = first; r <= last; r++) {
        const row = src.getRow(r);
        if (!row) continue;
        const tr = document.createElement("tr");
        tr.setAttribute("aria-rowindex", String(r + 1));
        tr.append(cellEl("th", String(src.rowLabel?.(r) ?? r + 1), { scope: "row" }));
        for (const c of cols) tr.append(cellEl("td", row[c] ?? "", { "aria-colindex": String(c + 1) }));
        rows.push(tr);
      }
      this.a11y.setAttribute("aria-rowcount", String(src.rowCount + 1));
      this.a11y.replaceChildren(...rows);
    }, 150);
  }

  private isSelected(r: number, c: number): boolean {
    const s = this.selected;
    if (!s) return false;
    const a = this.anchor ?? s;
    return r >= Math.min(a.row, s.row) && r <= Math.max(a.row, s.row) && c >= Math.min(a.col, s.col) && c <= Math.max(a.col, s.col);
  }

  /** The selected cells, for exporting just them; null when nothing is selected. */
  selection(): { rows: [number, number]; cols: [number, number] } | null {
    const rg = this.range();
    return rg ? { rows: [rg[0], rg[1]], cols: [rg[2], rg[3]] } : null;
  }

  /** The selected block as [first row, last row, first col, last col]. */
  private range(): [number, number, number, number] | null {
    const s = this.selected;
    if (!s) return null;
    const a = this.anchor ?? s;
    return [Math.min(a.row, s.row), Math.max(a.row, s.row), Math.min(a.col, s.col), Math.max(a.col, s.col)];
  }

  /** Copies the selected cells as tab-separated text, the way Excel pastes them. */
  private async copySelection(): Promise<void> {
    const src = this.source;
    const rg = this.range();
    if (!src || !rg) return;
    let [r0, r1] = rg;
    const [, , c0, c1] = rg;
    const width = c1 - c0 + 1;
    if ((r1 - r0 + 1) * width > COPY_MAX_CELLS) {
      r1 = r0 + Math.floor(COPY_MAX_CELLS / width) - 1;
      this.events.onMessage?.(`Copying the first ${(r1 - r0 + 1).toLocaleString()} rows; use Export for more`);
    }
    // Rows off screen may not be loaded yet: ask for them and wait briefly.
    for (let tries = 0; tries < 100; tries++) {
      let missing = -1;
      for (let r = r0; r <= r1; r++) if (!src.getRow(r)) { missing = r; break; }
      if (missing < 0) break;
      src.prefetch(missing, Math.min(r1, missing + 5000));
      await new Promise((ok) => setTimeout(ok, 50));
    }
    const lines: string[] = [];
    for (let r = r0; r <= r1; r++) {
      const row = src.getRow(r) ?? [];
      const cells: string[] = [];
      for (let c = c0; c <= c1; c++) cells.push(tsvCell(row[c] ?? ""));
      lines.push(cells.join("\t"));
    }
    const n = (r1 - r0 + 1) * width;
    try {
      await navigator.clipboard.writeText(lines.join(n === 1 ? "" : "\r\n"));
      this.events.onMessage?.(n === 1 ? "Copied" : `Copied ${n.toLocaleString()} cells`);
    } catch {
      this.events.onMessage?.("Couldn't copy: the browser blocked the clipboard");
    }
  }

  /** Column whose right border is at `x` in the header, for resizing. */
  private borderAt(x: number, y: number): number | null {
    if (y > HEADER_H || x < this.gutterWidth()) return null;
    let cx = this.gutterWidth() - this.scrollX;
    for (let c = 0; c < this.colWidths.length; c++) {
      cx += this.colWidths[c];
      if (Math.abs(x - cx) <= RESIZE_GRAB) return c;
      if (cx > x + RESIZE_GRAB) break;
    }
    return null;
  }

  /** Fits a column to its header and the rows loaded on screen, up to 1,000 px. */
  autoFit(col: number): void {
    const src = this.source;
    if (!src) return;
    let w = this.measure(src.header[col] ?? columnLetter(col), BOLD) + 2 * PAD + 4;
    const first = Math.floor(this.top);
    for (let r = first; r <= first + this.visibleRows(); r++) {
      const v = src.getRow(r)?.[col];
      if (v) w = Math.max(w, this.measure(v.slice(0, 400), FONT) + 2 * PAD);
    }
    this.colWidths[col] = Math.max(40, Math.min(1000, Math.ceil(w)));
    this.fixedCols.add(col);
    this.invalidate();
  }

  private inspect(cell: Cell): void {
    const src = this.source;
    if (!src) return;
    this.events.onInspect?.({
      ...cell,
      label: src.rowLabel?.(cell.row) ?? cell.row + 1,
      header: src.header[cell.col] ?? `Column ${columnLetter(cell.col)}`,
      value: src.getRow(cell.row)?.[cell.col] ?? "",
    });
  }

  private onDoubleClick(e: MouseEvent): void {
    const border = this.borderAt(e.offsetX, e.offsetY);
    if (border !== null) {
      this.autoFit(border);
      return;
    }
    const cell = this.cellAt(e.offsetX, e.offsetY);
    if (cell) this.inspect(cell);
  }

  private drawScrollbars(): void {
    const { ctx, theme: t } = this;
    const vy = this.vThumb();
    ctx.fillStyle = t.bar;
    ctx.fillRect(this.width - BAR, HEADER_H, BAR, this.bodyHeight());
    ctx.fillRect(this.gutterWidth(), this.height - BAR, this.bodyWidth(), BAR);
    ctx.fillStyle = t.thumb;
    if (vy) roundRect(ctx, this.width - BAR + 2, vy.pos, BAR - 4, vy.size);
    const hx = this.hThumb();
    if (hx) roundRect(ctx, hx.pos, this.height - BAR + 2, hx.size, BAR - 4);
  }

  /** Vertical thumb in canvas pixels, or null if everything fits. */
  private vThumb(): { pos: number; size: number } | null {
    const max = this.maxTop();
    if (max <= 0) return null;
    const track = this.bodyHeight();
    const size = Math.max(24, track * (this.visibleRows() / (this.source!.rowCount || 1)));
    return { pos: HEADER_H + (track - size) * (this.top / max), size };
  }

  private hThumb(): { pos: number; size: number } | null {
    const total = this.totalColWidth();
    const view = this.bodyWidth();
    if (total <= view) return null;
    const size = Math.max(24, view * (view / total));
    return { pos: this.gutterWidth() + (view - size) * (this.scrollX / (total - view)), size };
  }

  private drawHighlights(shown: string, x: number, y: number): void {
    const { text, matchCase } = this.highlight!;
    const hay = matchCase ? shown : shown.toLowerCase();
    const needle = matchCase ? text : text.toLowerCase();
    let i = hay.indexOf(needle);
    if (i < 0) return;
    this.ctx.fillStyle = this.theme.highlight;
    while (i >= 0) {
      const x0 = this.ctx.measureText(shown.slice(0, i)).width;
      const w = this.ctx.measureText(shown.slice(i, i + needle.length)).width;
      this.ctx.fillRect(x + x0, y + 4, w, ROW_H - 8);
      i = hay.indexOf(needle, i + needle.length);
    }
  }

  /** Truncates with an ellipsis to fit `max` pixels. `font` must be the current ctx font. */
  private fit(text: string, max: number, font: string): string {
    if (this.measure(text, font) <= max) return text;
    let lo = 0;
    let hi = Math.min(text.length, 200);
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (this.ctx.measureText(text.slice(0, mid) + "…").width <= max) lo = mid;
      else hi = mid - 1;
    }
    return text.slice(0, lo) + "…";
  }

  // ---- input ----

  private onWheel(e: WheelEvent): void {
    if (!this.source) return;
    e.preventDefault();
    const scale = e.deltaMode === 1 ? ROW_H : e.deltaMode === 2 ? this.bodyHeight() : 1;
    let dx = e.deltaX * scale;
    let dy = e.deltaY * scale;
    if (e.shiftKey && dx === 0) [dx, dy] = [dy, 0];
    this.top += dy / ROW_H;
    this.scrollX += dx;
    this.invalidate();
  }

  private onPointerDown(e: PointerEvent): void {
    if (!this.source) return;
    const { offsetX: x, offsetY: y } = e;
    this.canvas.focus();
    cancelAnimationFrame(this.momentum);
    if (e.pointerType === "touch") {
      // A finger drags the sheet; a tap selects, a double tap opens the cell.
      this.drag = { axis: "pan", x, y, top: this.top, scrollX: this.scrollX, moved: false, cell: this.cellAt(x, y), samples: [{ t: e.timeStamp, x, y }] };
      this.canvas.setPointerCapture(e.pointerId);
      return;
    }
    if (x >= this.width - BAR && y > HEADER_H) {
      const thumb = this.vThumb();
      if (!thumb) return;
      const inThumb = y >= thumb.pos && y <= thumb.pos + thumb.size;
      this.drag = { axis: "y", grabOffset: inThumb ? y - thumb.pos : thumb.size / 2 };
      this.canvas.setPointerCapture(e.pointerId);
      this.onPointerMove(e);
      return;
    }
    if (y >= this.height - BAR && x > this.gutterWidth()) {
      const thumb = this.hThumb();
      if (!thumb) return;
      const inThumb = x >= thumb.pos && x <= thumb.pos + thumb.size;
      this.drag = { axis: "x", grabOffset: inThumb ? x - thumb.pos : thumb.size / 2 };
      this.canvas.setPointerCapture(e.pointerId);
      this.onPointerMove(e);
      return;
    }
    const border = this.borderAt(x, y);
    if (border !== null) {
      this.drag = { axis: "col", col: border, startX: x, startW: this.colWidths[border] };
      this.canvas.setPointerCapture(e.pointerId);
      return;
    }
    const cell = this.cellAt(x, y);
    if (cell) {
      if (e.shiftKey && this.selected) {
        this.anchor ??= this.selected;
      } else {
        this.anchor = null;
        this.drag = { axis: "cells" };
        this.canvas.setPointerCapture(e.pointerId);
      }
      this.selected = cell;
      this.invalidate();
    }
  }

  private endDrag(e?: PointerEvent): void {
    const d = this.drag;
    if (!d) return;
    this.drag = null;
    if (e && this.canvas.hasPointerCapture(e.pointerId)) this.canvas.releasePointerCapture(e.pointerId);
    if (d.axis === "pan" && e?.type === "pointerup") this.endPan(d, e);
  }

  private endPan(d: Extract<Drag, { axis: "pan" }>, e: PointerEvent): void {
    if (!d.moved) {
      if (!d.cell) return;
      const tap = this.lastTap;
      this.lastTap = { t: e.timeStamp, ...d.cell };
      this.selected = d.cell;
      this.anchor = null;
      this.invalidate();
      if (tap && e.timeStamp - tap.t < 350 && tap.row === d.cell.row && tap.col === d.cell.col) {
        this.lastTap = null;
        this.inspect(d.cell);
      }
      return;
    }
    // Keep gliding after a flick, slowing down.
    const a = d.samples[0];
    const b = d.samples[d.samples.length - 1];
    const dt = b.t - a.t;
    if (dt <= 0 || e.timeStamp - b.t > 100) return;
    let vx = (b.x - a.x) / dt;
    let vy = (b.y - a.y) / dt;
    let prev = performance.now();
    const step = (now: number) => {
      const ms = Math.min(50, now - prev);
      prev = now;
      this.top -= (vy * ms) / ROW_H;
      this.scrollX -= vx * ms;
      const decay = Math.pow(0.995, ms);
      vx *= decay;
      vy *= decay;
      this.invalidate();
      if (Math.abs(vx) > 0.02 || Math.abs(vy) > 0.02) this.momentum = requestAnimationFrame(step);
    };
    this.momentum = requestAnimationFrame(step);
  }

  private onPointerMove(e: PointerEvent): void {
    if (!this.drag) {
      this.canvas.style.cursor = this.borderAt(e.offsetX, e.offsetY) !== null ? "col-resize" : "";
      return;
    }
    // No button held means the release was missed: stop dragging.
    if (e.pointerType === "mouse" && (e.buttons & 1) === 0) {
      this.endDrag(e);
      return;
    }
    if (this.drag.axis === "pan") {
      const d = this.drag;
      const dx = e.offsetX - d.x;
      const dy = e.offsetY - d.y;
      if (!d.moved && Math.hypot(dx, dy) > 8) d.moved = true;
      if (d.moved) {
        this.top = d.top - dy / ROW_H;
        this.scrollX = d.scrollX - dx;
      }
      d.samples.push({ t: e.timeStamp, x: e.offsetX, y: e.offsetY });
      if (d.samples.length > 5) d.samples.shift();
    } else if (this.drag.axis === "col") {
      this.colWidths[this.drag.col] = Math.max(40, Math.min(2000, Math.round(this.drag.startW + e.offsetX - this.drag.startX)));
      this.fixedCols.add(this.drag.col);
    } else if (this.drag.axis === "cells") {
      const cell = this.cellAt(Math.max(this.gutterWidth() + 1, e.offsetX), Math.max(HEADER_H + 1, Math.min(e.offsetY, this.height - BAR - 1)));
      if (cell && this.selected && (cell.row !== this.selected.row || cell.col !== this.selected.col)) {
        this.anchor ??= this.selected;
        this.selected = cell;
        this.scrollIntoView(cell);
      }
    } else if (this.drag.axis === "y") {
      const thumb = this.vThumb();
      if (!thumb) return;
      const track = this.bodyHeight() - thumb.size;
      const frac = (e.offsetY - this.drag.grabOffset - HEADER_H) / Math.max(1, track);
      this.top = Math.round(Math.max(0, Math.min(1, frac)) * this.maxTop());
    } else {
      const thumb = this.hThumb();
      if (!thumb) return;
      const track = this.bodyWidth() - thumb.size;
      const frac = (e.offsetX - this.drag.grabOffset - this.gutterWidth()) / Math.max(1, track);
      this.scrollX = Math.max(0, Math.min(1, frac)) * (this.totalColWidth() - this.bodyWidth());
    }
    this.invalidate();
  }

  private cellAt(x: number, y: number): { row: number; col: number } | null {
    if (y < HEADER_H || x < this.gutterWidth()) return null;
    const row = Math.floor(this.top) + Math.floor((y - HEADER_H) / ROW_H);
    if (row >= (this.source?.rowCount ?? 0)) return null;
    let cx = this.gutterWidth() - this.scrollX;
    for (let c = 0; c < this.colWidths.length; c++) {
      if (x < cx + this.colWidths[c]) return { row, col: c };
      cx += this.colWidths[c];
    }
    return null;
  }

  private onKey(e: KeyboardEvent): void {
    const src = this.source;
    if (!src) return;
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key === "c" && this.selected) {
      void this.copySelection();
      e.preventDefault();
      return;
    }
    if ((e.key === "Enter" || e.key === "F2") && this.selected) {
      this.inspect(this.selected);
      e.preventDefault();
      return;
    }
    if (e.key === "Escape" && this.anchor) {
      this.anchor = null;
      this.invalidate();
      return;
    }
    const prev = this.selected ?? { row: Math.floor(this.top), col: 0 };
    const sel = { ...prev };
    const page = this.visibleRows() - 1;
    const moves: Record<string, () => void> = {
      ArrowDown: () => sel.row++,
      ArrowUp: () => sel.row--,
      ArrowRight: () => sel.col++,
      ArrowLeft: () => sel.col--,
      PageDown: () => (sel.row += page),
      PageUp: () => (sel.row -= page),
      Home: () => (mod ? (sel.row = 0) : (sel.col = 0)),
      End: () => (mod ? (sel.row = src.rowCount - 1) : (sel.col = this.colWidths.length - 1)),
    };
    const move = moves[e.key];
    if (!move) return;
    e.preventDefault();
    move();
    sel.row = Math.max(0, Math.min(sel.row, src.rowCount - 1));
    sel.col = Math.max(0, Math.min(sel.col, this.colWidths.length - 1));
    if (e.shiftKey) this.anchor ??= prev;
    else this.anchor = null;
    this.selected = sel;
    this.scrollIntoView(sel);
    this.invalidate();
  }

  private scrollIntoView({ row, col }: { row: number; col: number }): void {
    if (row < this.top) this.top = row;
    else if (row >= this.top + this.visibleRows()) this.top = row - this.visibleRows() + 1;
    let x = 0;
    for (let c = 0; c < col; c++) x += this.colWidths[c];
    const w = this.colWidths[col] ?? 0;
    if (x < this.scrollX) this.scrollX = x;
    else if (x + w > this.scrollX + this.bodyWidth()) this.scrollX = x + w - this.bodyWidth();
  }
}

/** A cell for tab-separated copying: quoted if it holds a tab, line break or quote. */
function tsvCell(v: string): string {
  return /[\t\n\r"]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

function cellEl(tag: "td" | "th", text: string, attrs: Record<string, string>): HTMLElement {
  const el = document.createElement(tag);
  el.textContent = text;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

function clampCol(w: number): number {
  return Math.max(MIN_COL, Math.min(MAX_COL, Math.ceil(w)));
}

/** Spreadsheet-style column name: A, B, ..., Z, AA, AB, ... */
function columnLetter(i: number): string {
  let s = "";
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) {
    s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  }
  return s;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, Math.min(w, h) / 2);
  ctx.fill();
}
