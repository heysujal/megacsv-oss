// Reads a zip file's table of contents (central directory), including Zip64,
// so we can pick the CSV inside without reading the whole archive.

export interface ZipEntry {
  name: string;
  /** 0 stored, 8 deflate. */
  method: number;
  compressedSize: number;
  size: number;
  /** Offset of the entry's local header. */
  localOffset: number;
}

const u16 = (v: DataView, o: number) => v.getUint16(o, true);
const u32 = (v: DataView, o: number) => v.getUint32(o, true);
const u64 = (v: DataView, o: number) => Number(v.getBigUint64(o, true));

async function read(file: Blob, start: number, end: number): Promise<DataView> {
  return new DataView(await file.slice(Math.max(0, start), end).arrayBuffer());
}

export async function zipEntries(file: Blob): Promise<ZipEntry[]> {
  // End of central directory: in the last 64 KB + 22 bytes.
  const tailStart = Math.max(0, file.size - (65_535 + 22));
  const tail = await read(file, tailStart, file.size);
  let eocd = -1;
  for (let i = tail.byteLength - 22; i >= 0; i--) {
    if (u32(tail, i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("This zip file looks damaged (no table of contents).");
  let count = u16(tail, eocd + 10);
  let cdSize = u32(tail, eocd + 12);
  let cdOffset = u32(tail, eocd + 16);
  // Zip64: a locator just before the end record points to the 64-bit record.
  if (eocd >= 20 && u32(tail, eocd - 20) === 0x07064b50) {
    const recOffset = u64(tail, eocd - 20 + 8);
    const rec = await read(file, recOffset, recOffset + 56);
    if (u32(rec, 0) === 0x06064b50) {
      count = u64(rec, 32);
      cdSize = u64(rec, 40);
      cdOffset = u64(rec, 48);
    }
  }
  const cd = await read(file, cdOffset, cdOffset + cdSize);
  const entries: ZipEntry[] = [];
  let p = 0;
  for (let n = 0; n < count && p + 46 <= cd.byteLength; n++) {
    if (u32(cd, p) !== 0x02014b50) break;
    const flags = u16(cd, p + 8);
    const method = u16(cd, p + 10);
    let compressedSize = u32(cd, p + 20);
    let size = u32(cd, p + 24);
    const nameLen = u16(cd, p + 28);
    const extraLen = u16(cd, p + 30);
    const commentLen = u16(cd, p + 32);
    let localOffset = u32(cd, p + 42);
    const nameBytes = new Uint8Array(cd.buffer, cd.byteOffset + p + 46, nameLen);
    const name = new TextDecoder(flags & 0x800 ? "utf-8" : "latin1").decode(nameBytes);
    // Zip64 extra field: the 64-bit values replace the ones set to 0xFFFFFFFF, in order.
    let e = p + 46 + nameLen;
    const extraEnd = e + extraLen;
    while (e + 4 <= extraEnd) {
      const id = u16(cd, e);
      const len = u16(cd, e + 2);
      if (id === 0x0001) {
        let q = e + 4;
        if (size === 0xffffffff) (size = u64(cd, q)), (q += 8);
        if (compressedSize === 0xffffffff) (compressedSize = u64(cd, q)), (q += 8);
        if (localOffset === 0xffffffff) localOffset = u64(cd, q);
      }
      e += 4 + len;
    }
    if (!name.endsWith("/")) entries.push({ name, method, compressedSize, size, localOffset });
    p = extraEnd + commentLen;
  }
  return entries;
}

/** The CSV-like entry to open: the largest .csv, .tsv or .txt, else the largest file. */
export function pickEntry(entries: ZipEntry[]): ZipEntry | null {
  const visible = entries.filter((e) => !/(^|\/)(__MACOSX|\.)/.test(e.name));
  const text = visible.filter((e) => /\.(csv|tsv|txt|tab|psv)$/i.test(e.name));
  const pool = text.length ? text : visible;
  return pool.reduce<ZipEntry | null>((best, e) => (!best || e.size > best.size ? e : best), null);
}

/** Where the entry's compressed data starts (after its local header). */
export async function dataOffset(file: Blob, entry: ZipEntry): Promise<number> {
  const h = await read(file, entry.localOffset, entry.localOffset + 30);
  if (u32(h, 0) !== 0x04034b50) throw new Error("This zip file looks damaged.");
  return entry.localOffset + 30 + u16(h, 26) + u16(h, 28);
}
