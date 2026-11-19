// Export worker: reads the file in order, keeps the rows that match, and
// writes CSV (original bytes) or .xlsx, split into parts of a set size.

import init, { Query, firstRowEnd } from "../wasm/megacsv_engine.js";
import { buildQuery } from "../engine/query-spec";
import { XlsxPart } from "./xlsx-part";
import { partSinks, type Sink } from "./sinks";
import type { ExportJob, ExportMessage } from "./protocol";

const WINDOW = 8 << 20;
const MAX_ROW = 64 << 20;
const MAX_HEADER = 16 << 20;
const PROGRESS_EVERY_MS = 200;
/** Most distinct values duplicates can be removed for (memory). */
const MAX_KEYS = 20_000_000;

let cancelled = false;

const post = (m: ExportMessage) => (self as unknown as Worker).postMessage(m);

function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
  if (a.length === 0) return b;
  const out = new Uint8Array(a.length + b.length);
  out.set(a);
  out.set(b, a.length);
  return out;
}

/** The header row's original bytes, ending with a line break. */
async function readHeader(job: ExportJob): Promise<Uint8Array | null> {
  for (let size = 1 << 20; size <= MAX_HEADER; size *= 4) {
    const end = Math.min(job.file.size, job.dataStart + size);
    const buf = new Uint8Array(await job.file.slice(job.dataStart, end).arrayBuffer());
    const rowEnd = firstRowEnd(buf, job.quote, end === job.file.size);
    if (rowEnd >= 0) {
      const header = buf.slice(0, rowEnd);
      if (header.at(-1) === 0x0a) return header;
      return concat(header, new TextEncoder().encode(job.lineEnding));
    }
  }
  return null;
}

/**
 * Sorted exports read rows from all over the file. Each batch takes as many rows
 * as fit in BATCH_BYTES (at most BATCH_ROWS), reads them in file order, and
 * merges reads less than GAP apart, so a batch becomes a few long reads instead
 * of one read per row.
 */
const BATCH_ROWS = 1 << 20;
const BATCH_BYTES = 64 << 20;
const GAP = 256 << 10;
const MAX_READ = 16 << 20;

/**
 * The rows of a sorted sheet in its order, a batch at a time. Each batch is the
 * rows' original bytes joined together (a row without a line break gets one),
 * so it reads like any other piece of the file.
 */
async function* sortedBatches(job: ExportJob, lineEnding: Uint8Array, from = 0): AsyncGenerator<{ buf: Uint8Array; rows: number }> {
  const order = job.order!;
  let first = from;
  while (first < order.rows && !cancelled) {
    const recAll = new Float64Array(await order.file.slice(first * 24, Math.min(order.rows, first + BATCH_ROWS) * 24).arrayBuffer());
    // As many rows as fit in BATCH_BYTES.
    let n = 0;
    let bytes = 0;
    while (n < recAll.length / 3 && (n === 0 || bytes + recAll[n * 3 + 2] - recAll[n * 3 + 1] <= BATCH_BYTES)) {
      bytes += recAll[n * 3 + 2] - recAll[n * 3 + 1];
      n++;
    }
    const rec = recAll.subarray(0, n * 3);
    const idx = Array.from({ length: n }, (_, i) => i).sort((a, b) => rec[a * 3 + 1] - rec[b * 3 + 1]);
    const pieces: Uint8Array[] = new Array(n);
    for (let g = 0; g < n && !cancelled; ) {
      const start = rec[idx[g] * 3 + 1];
      let end = rec[idx[g] * 3 + 2];
      let h = g + 1;
      while (h < n && rec[idx[h] * 3 + 1] - end < GAP && rec[idx[h] * 3 + 2] - start <= MAX_READ) {
        end = Math.max(end, rec[idx[h] * 3 + 2]);
        h++;
      }
      const buf = new Uint8Array(await job.file.slice(start, end).arrayBuffer());
      // Copies, so the (possibly much larger) read buffer can go.
      for (let k = g; k < h; k++) {
        const i = idx[k];
        pieces[i] = buf.slice(rec[i * 3 + 1] - start, rec[i * 3 + 2] - start);
      }
      g = h;
    }
    let size = 0;
    for (const p of pieces) size += p.length + (p.at(-1) === 0x0a ? 0 : lineEnding.length);
    const out = new Uint8Array(size);
    let off = 0;
    for (const p of pieces) {
      out.set(p, off);
      off += p.length;
      if (p.at(-1) !== 0x0a) {
        out.set(lineEnding, off);
        off += lineEnding.length;
      }
    }
    first += n;
    yield { buf: out, rows: n };
  }
}

interface Part {
  write(bytes: Uint8Array): Promise<void>;
  finish(): Promise<void>;
}

function csvPart(sink: Sink): Part {
  return { write: (b) => sink.write(b), finish: () => sink.close() };
}

async function run(job: ExportJob): Promise<void> {
  await init();
  const xlsx = job.format === "xlsx";
  const latin1 = job.encoding === "windows-1252";
  const lineEnding = new TextEncoder().encode(job.lineEnding);
  const q = buildQuery(job.spec, job.encoding, job.delimiter);
  const columns = job.columns ? new Uint32Array(job.columns) : new Uint32Array(0);
  q.setColumns(columns);
  q.setEvery(job.every);
  if (job.dedupe) q.setDedupe(job.dedupe.key, job.dedupe.keepLast, MAX_KEYS);

  let header = job.hasHeader ? await readHeader(job) : null;
  let headerXml: Uint8Array | null = null;
  if (header && (xlsx || job.columns)) {
    // The header row, cut to the chosen columns and/or as spreadsheet XML.
    const all = new Query();
    all.setColumns(columns);
    const out = all.extract(header, 0, 0, true, job.delimiter, job.quote, xlsx, 1, 1, lineEnding, latin1);
    if (xlsx) headerXml = out.bytes;
    else header = out.bytes;
    out.free();
    all.free();
  }
  const firstDataRow = header ? 2 : 1;

  const ext = xlsx ? "xlsx" : "csv";
  const sinks = await partSinks(job.target, job.parts, `${job.baseName}.zip`);
  const partName = (i: number) =>
    job.parts > 1 ? `${job.baseName}-part-${String(i + 1).padStart(String(job.parts).length, "0")}.${ext}` : `${job.baseName}.${ext}`;

  let part: Part | null = null;
  let partCount = 0;
  let rowsInPart = 0;
  let rowsOut = 0;
  let bytesDone = 0;
  let lastProgress = 0;
  // A selection: rows the sheet shows before it are skipped, and the export stops after it.
  let toSkip = job.window?.skip ?? 0;
  const take = job.window?.take ?? Infinity;
  const full = () => rowsOut >= take;

  const startPart = async () => {
    const sink = await sinks.open(partName(partCount++));
    if (xlsx) {
      part = new XlsxPart(sink, headerXml);
    } else {
      part = csvPart(sink);
      if (header) await part.write(header);
    }
    rowsInPart = 0;
  };

  /** Fills parts from `buf` until it runs out of complete rows; returns the next row number and the rest. */
  const fill = async (buf: Uint8Array, row: number, atEnd: boolean): Promise<{ row: number; rest: Uint8Array }> => {
    while (toSkip > 0 && buf.length > 0) {
      const out = q.extract(buf, row, job.minRow, atEnd, job.delimiter, job.quote, false, toSkip, firstDataRow, lineEnding, latin1);
      const skipped = out.rowsOut;
      row += out.rowsSeen;
      buf = buf.subarray(out.consumed);
      out.free();
      toSkip -= skipped;
      if (toSkip > 0) return { row, rest: buf };
    }
    for (;;) {
      const room = Math.min(job.rowsPerPart - rowsInPart, take - rowsOut);
      if (room <= 0) break;
      const out = q.extract(buf, row, job.minRow, atEnd, job.delimiter, job.quote, xlsx, room, firstDataRow + rowsInPart, lineEnding, latin1);
      const written = out.rowsOut;
      const bytes = out.bytes;
      if (out.tooManyKeys) {
        out.free();
        throw new Error(`There are more than ${MAX_KEYS.toLocaleString()} different values, too many to remove duplicates in the browser.`);
      }
      row += out.rowsSeen;
      buf = buf.subarray(out.consumed);
      out.free();
      if (written > 0) {
        if (!part) await startPart();
        await part!.write(bytes);
        rowsInPart += written;
        rowsOut += written;
      }
      if (rowsInPart < job.rowsPerPart || full()) break;
      await part!.finish();
      part = null;
      rowsInPart = 0;
      if (buf.length === 0) break;
    }
    return { row, rest: buf };
  };
  const progress = (totalWork: number) => {
    const now = performance.now();
    if (now - lastProgress > PROGRESS_EVERY_MS) {
      lastProgress = now;
      post({ kind: "progress", bytesDone, totalBytes: totalWork, rowsOut });
    }
  };

  // Keep-latest needs a first pass: where does each value last appear?
  const passes = job.dedupe?.keepLast ? 2 : 1;
  const totalWork = (job.order ? job.order.rows : job.totalBytes) * passes;
  try {
    const u = job.units;
    // A selection on an unfiltered sheet starts at its first row instead of reading up to it:
    // sorted sheets at that place in the order, others at the part of the file holding it.
    let firstUnit = 0;
    let fromRecord = 0;
    if (job.window && !job.spec && job.order) {
      fromRecord = toSkip;
      toSkip = 0;
    } else if (job.window && !job.spec) {
      const target = job.minRow + toSkip;
      while (firstUnit + 3 < u.length && u[firstUnit + 5] <= target) firstUnit += 3;
      toSkip = target - Math.max(u[firstUnit + 2], job.minRow);
      bytesDone = u[firstUnit] - (u[0] ?? 0);
    }
    if (job.order) {
      // A sorted sheet: rows in its order, numbered by position (so keep-latest means last in that order).
      if (passes === 2) {
        let seq = job.minRow;
        for await (const b of sortedBatches(job, lineEnding)) {
          const [seen] = q.noteLast(b.buf, seq, job.minRow, true, job.delimiter, job.quote);
          seq += seen;
          bytesDone += b.rows;
          progress(totalWork);
        }
      }
      let seq = job.minRow + fromRecord;
      for await (const b of sortedBatches(job, lineEnding, fromRecord)) {
        seq = (await fill(b.buf, seq, true)).row;
        bytesDone += b.rows;
        progress(totalWork);
        if (full()) break;
      }
    }
    if (passes === 2 && !job.order) {
      for (let i = 0; i < u.length && !cancelled; i += 3) {
        const [start, end] = [u[i], u[i + 1]];
        let row = u[i + 2];
        let pos = start;
        let carry: Uint8Array = new Uint8Array(0);
        while (pos < end && !cancelled) {
          const windowEnd = Math.min(pos + WINDOW, end);
          const buf = concat(carry, new Uint8Array(await job.file.slice(pos, windowEnd).arrayBuffer()));
          const [seen, consumed] = q.noteLast(buf, row, job.minRow, windowEnd === end, job.delimiter, job.quote);
          row += seen;
          carry = buf.subarray(consumed);
          bytesDone += windowEnd - pos;
          pos = windowEnd;
          const now = performance.now();
          if (now - lastProgress > PROGRESS_EVERY_MS) {
            lastProgress = now;
            post({ kind: "progress", bytesDone, totalBytes: totalWork, rowsOut });
          }
        }
      }
    }
    for (let i = firstUnit; i < u.length && !cancelled && !job.order && !full(); i += 3) {
      const [start, end] = [u[i], u[i + 1]];
      let row = u[i + 2];
      let pos = start;
      let carry: Uint8Array = new Uint8Array(0);
      while (pos < end && !cancelled && !full()) {
        const windowEnd = Math.min(pos + WINDOW, end);
        const buf: Uint8Array = concat(carry, new Uint8Array(await job.file.slice(pos, windowEnd).arrayBuffer()));
        const filled = await fill(buf, row, windowEnd === end);
        row = filled.row;
        bytesDone += windowEnd - pos;
        carry = filled.rest;
        pos = windowEnd;
        if (carry.length > MAX_ROW) throw new Error("A row in this file is too long to export.");
        const now = performance.now();
        if (now - lastProgress > PROGRESS_EVERY_MS) {
          lastProgress = now;
          post({ kind: "progress", bytesDone, totalBytes: totalWork, rowsOut });
        }
      }
    }
    if (cancelled) {
      await sinks.abort();
      post({ kind: "cancelled" });
      return;
    }
    // No matching rows still produces one file with the header.
    if (!part && partCount === 0) await startPart();
    if (part) await (part as Part).finish();
    const download = await sinks.finish();
    post({ kind: "done", rowsOut, parts: Math.max(partCount, 1), download });
  } catch (err) {
    await sinks.abort();
    post({ kind: "error", message: err instanceof Error ? err.message : String(err) });
  } finally {
    q.free();
  }
}

self.onmessage = (e: MessageEvent<{ kind: "start"; job: ExportJob } | { kind: "cancel" }>) => {
  if (e.data.kind === "cancel") cancelled = true;
  else void run(e.data.job);
};
