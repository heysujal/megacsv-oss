// Sort worker: merges sorted runs from private storage into the final order.
// Runs hold records of (key, file row, start, next), sorted by key then file
// row (engine/src/sort.rs). Up to FAN_IN runs are merged at once; more take
// extra passes through intermediate runs. The output holds only (file row,
// start, next) as three f64 per row, in sorted order.

import { storageDir } from "./storage";

const FAN_IN = 128;
const READ_BUF = 256 << 10;
const WRITE_BUF = 4 << 20;
/** Bytes after the key in a record: file row, start, next. */
const TAIL = 24;
const NO_SPACE = "The browser ran out of space for sorting. A private window has very little; use a normal window, or filter first to sort fewer rows.";

export type SortWorkerIn = { kind: "merge"; dir: string; runs: string[]; rows: number };
export type SortWorkerOut =
  | { kind: "progress"; done: number; total: number }
  | { kind: "done"; name: string; rows: number }
  | { kind: "error"; message: string };

const post = (m: SortWorkerOut) => (self as unknown as Worker).postMessage(m);

class Reader {
  private buf = new Uint8Array(READ_BUF);
  private view = new DataView(this.buf.buffer);
  private start = 0;
  private end = 0;
  private filePos = 0;
  private size: number;
  /** Current record: key at [keyAt, keyAt + keyLen), tail after it. */
  keyAt = 0;
  keyLen = 0;
  done = false;

  constructor(private access: FileSystemSyncAccessHandle) {
    this.size = access.getSize();
    this.next();
  }

  get bytes(): Uint8Array {
    return this.buf;
  }

  fileRow(): number {
    return this.view.getFloat64(this.keyAt + this.keyLen, true);
  }

  /** The whole current record (with its length prefix). */
  record(): Uint8Array {
    return this.buf.subarray(this.keyAt - 2, this.keyAt + this.keyLen + TAIL);
  }

  tail(): Uint8Array {
    return this.buf.subarray(this.keyAt + this.keyLen, this.keyAt + this.keyLen + TAIL);
  }

  /** Moves to the next record. */
  next(): void {
    if (this.keyLen || this.keyAt) this.start = this.keyAt + this.keyLen + TAIL;
    if (!this.ensure(2)) {
      this.done = true;
      return;
    }
    const len = this.view.getUint16(this.start, true);
    if (!this.ensure(2 + len + TAIL)) throw new Error("A sorted part is damaged.");
    this.keyAt = this.start + 2;
    this.keyLen = len;
  }

  /** Makes sure `n` bytes from `start` are in the buffer. */
  private ensure(n: number): boolean {
    if (this.end - this.start >= n) return true;
    if (this.filePos >= this.size) return false;
    this.buf.copyWithin(0, this.start, this.end);
    this.end -= this.start;
    this.keyAt -= this.start;
    this.start = 0;
    while (this.end < n && this.filePos < this.size) {
      const got = this.access.read(this.buf.subarray(this.end), { at: this.filePos });
      if (got <= 0) break;
      this.end += got;
      this.filePos += got;
    }
    return this.end >= n;
  }
}

function less(a: Reader, b: Reader): boolean {
  const ab = a.bytes;
  const bb = b.bytes;
  const n = Math.min(a.keyLen, b.keyLen);
  for (let i = 0; i < n; i++) {
    const x = ab[a.keyAt + i];
    const y = bb[b.keyAt + i];
    if (x !== y) return x < y;
  }
  if (a.keyLen !== b.keyLen) return a.keyLen < b.keyLen;
  return a.fileRow() < b.fileRow();
}

class Writer {
  private buf = new Uint8Array(WRITE_BUF);
  private n = 0;
  private at = 0;
  constructor(private access: FileSystemSyncAccessHandle) {
    access.truncate(0);
  }
  write(bytes: Uint8Array): void {
    if (this.n + bytes.length > this.buf.length) this.flush();
    this.buf.set(bytes, this.n);
    this.n += bytes.length;
  }
  flush(): void {
    if (this.n === 0) return;
    const wrote = this.access.write(this.buf.subarray(0, this.n), { at: this.at });
    if (wrote !== this.n) throw new Error(NO_SPACE);
    this.at += this.n;
    this.n = 0;
  }
  close(): void {
    this.flush();
    this.access.flush();
    this.access.close();
  }
}

let done = 0;
let total = 0;
let lastProgress = 0;

/** Merges `names` into `out`; full records, or only tails for the final output. */
async function mergeOnce(dir: FileSystemDirectoryHandle, names: string[], out: string, tailsOnly: boolean): Promise<number> {
  const accesses: FileSystemSyncAccessHandle[] = [];
  let writer: Writer | null = null;
  try {
    for (const name of names) accesses.push(await (await dir.getFileHandle(name)).createSyncAccessHandle());
    writer = new Writer(await (await dir.getFileHandle(out, { create: true })).createSyncAccessHandle());
    // A binary heap of readers, smallest record first.
    const heap = accesses.map((a) => new Reader(a)).filter((r) => !r.done);
    const down = (i: number) => {
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < heap.length && less(heap[l], heap[m])) m = l;
        if (r < heap.length && less(heap[r], heap[m])) m = r;
        if (m === i) return;
        [heap[i], heap[m]] = [heap[m], heap[i]];
        i = m;
      }
    };
    for (let i = (heap.length >> 1) - 1; i >= 0; i--) down(i);
    let rows = 0;
    while (heap.length > 0) {
      const top = heap[0];
      writer.write(tailsOnly ? top.tail() : top.record());
      rows++;
      top.next();
      if (top.done) {
        heap[0] = heap[heap.length - 1];
        heap.pop();
      }
      if (heap.length > 0) down(0);
      if (tailsOnly && ++done % 65536 === 0) {
        const now = performance.now();
        if (now - lastProgress > 200) {
          lastProgress = now;
          post({ kind: "progress", done, total });
        }
      }
    }
    writer.close();
    writer = null;
    return rows;
  } finally {
    for (const a of accesses) a.close();
    writer?.close();
  }
}

async function merge(req: Extract<SortWorkerIn, { kind: "merge" }>): Promise<void> {
  const dir = await storageDir(req.dir, false);
  total = req.rows;
  done = 0;
  let runs = req.runs;
  let pass = 0;
  // Extra passes until the runs fit in one merge.
  while (runs.length > FAN_IN) {
    const next: string[] = [];
    for (let i = 0; i < runs.length; i += FAN_IN) {
      const group = runs.slice(i, i + FAN_IN);
      const name = `pass${pass}-${next.length}.run`;
      await mergeOnce(dir, group, name, false);
      for (const g of group) await dir.removeEntry(g);
      next.push(name);
    }
    runs = next;
    pass++;
  }
  const rows = await mergeOnce(dir, runs, "order.bin", true);
  for (const r of runs) await dir.removeEntry(r);
  post({ kind: "done", name: "order.bin", rows });
}

self.onmessage = (e: MessageEvent<SortWorkerIn>) => {
  merge(e.data).catch((err) => post({ kind: "error", message: err instanceof Error ? err.message : String(err) }));
};
