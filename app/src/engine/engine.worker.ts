// Engine worker: scans chunks for the index, runs queries over row ranges,
// and parses rows for the grid. Each worker owns one WASM instance.

import init, { SortKeys, Summary, parseRows, scanChunk } from "../wasm/megacsv_engine.js";
import type {
  Envelope,
  QueryRequest,
  QueryResult,
  Reply,
  RowsAtRequest,
  RowsRequest,
  RowsResult,
  SaveRequest,
  ScanRequest,
  SortRunRequest,
  SortRunResult,
  SummaryRequest,
  SummaryResult,
} from "./protocol";
import { buildQuery } from "./query-spec";
import { storageDir } from "./storage";

const MAX_READ = 16 << 20;
const FIRST_READ = 1 << 20;
const QUERY_WINDOW = 8 << 20;
/** A row longer than this can't be searched. */
const MAX_ROW = 64 << 20;
const MAX_CELL_CHARS = 1000;
/** rowsAt reads nearby rows together when the gap between them is small. */
const COALESCE_GAP = 64 << 10;
const NO_SPACE = "The browser ran out of space for sorting. A private window has very little; use a normal window, or filter first to sort fewer rows.";

const ready = init();
const decoders = new Map<string, TextDecoder>();

function decoder(label: string): TextDecoder {
  let d = decoders.get(label);
  if (!d) {
    d = new TextDecoder(label);
    decoders.set(label, d);
  }
  return d;
}

async function read(file: File, start: number, end: number): Promise<Uint8Array> {
  return new Uint8Array(await file.slice(start, end).arrayBuffer());
}

function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
  if (a.length === 0) return b;
  const out = new Uint8Array(a.length + b.length);
  out.set(a);
  out.set(b, a.length);
  return out;
}

/** Decodes parsed rows to display strings, truncating long cells. */
function decodeRows(buf: Uint8Array, delimiter: number, quote: number, skip: number, maxRows: number, atEof: boolean, dec: TextDecoder, out: string[][]) {
  const parsed = parseRows(buf, delimiter, quote, skip, maxRows, atEof);
  const data = parsed.data;
  const ends = parsed.fieldEnds;
  const counts = parsed.rowFieldCounts;
  const result = { rowsSkipped: parsed.rowsSkipped, consumed: parsed.consumed };
  parsed.free();
  let f = 0;
  let fieldStart = 0;
  for (const n of counts) {
    const row = new Array<string>(n);
    for (let i = 0; i < n; i++) {
      const fieldEnd = ends[f++];
      // Decode at most ~4 bytes per displayed character.
      const stop = Math.min(fieldEnd, fieldStart + MAX_CELL_CHARS * 4);
      let text = dec.decode(data.subarray(fieldStart, stop));
      if (stop < fieldEnd || text.length > MAX_CELL_CHARS) text = text.slice(0, MAX_CELL_CHARS) + "…";
      row[i] = text;
      fieldStart = fieldEnd;
    }
    out.push(row);
  }
  return result;
}

async function scan(req: ScanRequest): Promise<Float64Array> {
  return scanChunk(await read(req.file, req.start, req.end), req.start, req.quote);
}

async function rows(req: RowsRequest): Promise<RowsResult> {
  const out: string[][] = [];
  const dec = decoder(req.encoding);
  const size = req.file.size;
  let pos = req.start;
  let skip = req.skip;
  let window = FIRST_READ;

  while (out.length < req.maxRows && pos < size) {
    const end = Math.min(pos + window, size);
    const atEof = end === size;
    const buf = await read(req.file, pos, end);
    const r = decodeRows(buf, req.delimiter, req.quote, skip, req.maxRows - out.length, atEof, dec, out);
    skip -= r.rowsSkipped;
    if (atEof) break;
    if (r.consumed === 0) {
      // A single row is bigger than the window.
      if (window >= MAX_READ) break;
      window = Math.min(window * 4, MAX_READ);
    } else {
      pos += r.consumed;
    }
  }
  return { rows: out };
}

async function rowsAt(req: RowsAtRequest): Promise<RowsResult> {
  const out: string[][] = [];
  const dec = decoder(req.encoding);
  const s = req.spans;
  let i = 0;
  while (i < s.length) {
    // Group rows that sit close together into one read.
    const groupStart = s[i];
    let groupEnd = Math.min(s[i + 1], groupStart + MAX_READ);
    let j = i + 2;
    // Only rows that come later in the file join a group; spans may be in any order.
    while (j < s.length && s[j] >= groupEnd && s[j] - groupEnd < COALESCE_GAP && s[j + 1] - groupStart <= MAX_READ) {
      groupEnd = s[j + 1];
      j += 2;
    }
    const buf = await read(req.file, groupStart, groupEnd);
    for (let k = i; k < j; k += 2) {
      const row = buf.subarray(s[k] - groupStart, Math.min(s[k + 1], groupEnd) - groupStart);
      const before = out.length;
      decodeRows(row, req.delimiter, req.quote, 0, 1, true, dec, out);
      if (out.length === before) out.push([]);
    }
    i = j;
  }
  return { rows: out };
}

async function query(req: QueryRequest): Promise<QueryResult> {
  const q = buildQuery(req.spec, req.encoding, req.delimiter);
  const parts: Float64Array[] = [];
  let count = 0;
  let limit = req.limit;
  let pos = req.start;
  let base = req.start;
  let row = req.firstRow;
  let carry: Uint8Array = new Uint8Array(0);
  try {
    while (pos < req.end) {
      const windowEnd = Math.min(pos + QUERY_WINDOW, req.end);
      const buf = concat(carry, await read(req.file, pos, windowEnd));
      // Ranges end at a row boundary, so the last window holds only whole rows.
      const atEnd = windowEnd === req.end;
      const out = q.run(buf, base, row, req.minRow, atEnd, req.delimiter, req.quote, limit);
      const m = out.matches;
      parts.push(m);
      count += out.count;
      limit = Math.max(0, limit - m.length / 3);
      row += out.rowsSeen;
      base += out.consumed;
      carry = buf.subarray(out.consumed);
      out.free();
      pos = windowEnd;
      if (carry.length > MAX_ROW) throw new Error("A row in this file is too long to search.");
    }
  } finally {
    q.free();
  }
  const total = parts.reduce((n, p) => n + p.length, 0);
  const matches = new Float64Array(total);
  let off = 0;
  for (const p of parts) {
    matches.set(p, off);
    off += p.length;
  }
  return { matches, count };
}

async function summary(req: SummaryRequest): Promise<SummaryResult> {
  const q = buildQuery(req.spec, req.encoding, req.delimiter);
  const s = new Summary(req.group, req.value, req.delimiter === 0x3b, req.maxGroups);
  let pos = req.start;
  let row = req.firstRow;
  let carry: Uint8Array = new Uint8Array(0);
  try {
    while (pos < req.end) {
      const windowEnd = Math.min(pos + QUERY_WINDOW, req.end);
      const buf = concat(carry, await read(req.file, pos, windowEnd));
      const [seen, consumed] = s.add(q, buf, row, req.minRow, windowEnd === req.end, req.delimiter, req.quote);
      row += seen;
      carry = buf.subarray(consumed);
      pos = windowEnd;
      if (carry.length > MAX_ROW) throw new Error("A row in this file is too long to summarize.");
    }
    const out = s.finish();
    const bytes = out.keys;
    const ends = out.keyEnds;
    const stats = out.stats;
    out.free();
    const dec = decoder(req.encoding);
    const keys: string[] = [];
    let start = 0;
    for (const end of ends) {
      keys.push(dec.decode(bytes.subarray(start, end)));
      start = end;
    }
    return { keys, stats: new Float64Array(stats) };
  } finally {
    s.free();
    q.free();
  }
}

async function save(req: SaveRequest): Promise<void> {
  const root = await navigator.storage.getDirectory();
  const dir = await root.getDirectoryHandle(req.dir, { create: true });
  const handle = await dir.getFileHandle(req.name, { create: true });
  const access = await handle.createSyncAccessHandle();
  try {
    access.truncate(0);
    access.write(req.bytes, { at: 0 });
    access.flush();
  } finally {
    access.close();
  }
}

async function sortRun(req: SortRunRequest): Promise<SortRunResult> {
  const q = buildQuery(req.spec, req.encoding, req.delimiter);
  const s = new SortKeys(req.col, req.descending, req.delimiter === 0x3b, req.maxText);
  let pos = req.start;
  let base = req.start;
  let row = req.firstRow;
  let carry: Uint8Array = new Uint8Array(0);
  try {
    while (pos < req.end) {
      const windowEnd = Math.min(pos + QUERY_WINDOW, req.end);
      const buf = concat(carry, await read(req.file, pos, windowEnd));
      const [seen, consumed] = s.add(q, buf, base, row, req.minRow, windowEnd === req.end, req.delimiter, req.quote);
      row += seen;
      base += consumed;
      carry = buf.subarray(consumed);
      pos = windowEnd;
      if (carry.length > MAX_ROW) throw new Error("A row in this file is too long to sort.");
    }
    const rows = s.count();
    const bytes = s.finish();
    const handle = await (await storageDir(req.dir, true)).getFileHandle(req.name, { create: true });
    const access = await handle.createSyncAccessHandle();
    try {
      access.truncate(0);
      if (access.write(bytes, { at: 0 }) !== bytes.length) throw new Error(NO_SPACE);
      access.flush();
    } finally {
      access.close();
    }
    return { rows, bytes: bytes.length };
  } finally {
    s.free();
    q.free();
  }
}

const post = (reply: Reply, transfer: Transferable[] = []) =>
  (self as unknown as Worker).postMessage(reply, transfer);

self.onmessage = async (e: MessageEvent<Envelope>) => {
  const { id, req } = e.data;
  try {
    await ready;
    switch (req.kind) {
      case "scan": {
        const result = await scan(req);
        post({ id, ok: true, result }, [result.buffer]);
        break;
      }
      case "query": {
        const result = await query(req);
        post({ id, ok: true, result }, [result.matches.buffer]);
        break;
      }
      case "summary": {
        const result = await summary(req);
        post({ id, ok: true, result }, [result.stats.buffer]);
        break;
      }
      case "rows":
        post({ id, ok: true, result: await rows(req) });
        break;
      case "rowsAt":
        post({ id, ok: true, result: await rowsAt(req) });
        break;
      case "save":
        await save(req);
        post({ id, ok: true, result: null });
        break;
      case "sortRun":
        post({ id, ok: true, result: await sortRun(req) });
        break;
    }
  } catch (err) {
    post({ id, ok: false, error: err instanceof Error ? err.message : String(err) });
  }
};
