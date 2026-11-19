// Saves each file's row table in the browser's private storage, so opening
// the same file again skips the full read. A saved table is used only when
// the file's name, size, modified time and first/last 64 KB all match.

import type { WorkerPool } from "./pool";

const DIR = "row-tables";
const FORMAT = 1;
const MAX_TOTAL_BYTES = 500e6;
const EDGE = 64 << 10;

async function sha256Hex(data: BufferSource): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", data));
  return Array.from(digest, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function cacheName(file: File, quote: number): Promise<string> {
  const id = `${FORMAT}|${file.name}|${file.size}|${file.lastModified}|${quote}`;
  return (await sha256Hex(new TextEncoder().encode(id))).slice(0, 32);
}

/** Hash of the file's first and last 64 KB. */
async function fingerprint(file: File): Promise<string> {
  const head = file.slice(0, EDGE);
  const tail = file.slice(Math.max(EDGE, file.size - EDGE));
  return sha256Hex(await new Blob([head, tail]).arrayBuffer());
}

async function cacheDir(): Promise<FileSystemDirectoryHandle> {
  const root = await navigator.storage.getDirectory();
  return root.getDirectoryHandle(DIR, { create: true });
}

/** The saved row table for `file`, or null. Never throws. */
export async function loadRowTable(file: File, quote: number): Promise<Uint8Array | null> {
  try {
    const dir = await cacheDir();
    const handle = await dir.getFileHandle(await cacheName(file, quote));
    const buf = new Uint8Array(await (await handle.getFile()).arrayBuffer());
    const metaLen = new DataView(buf.buffer).getUint32(0, true);
    const meta = JSON.parse(new TextDecoder().decode(buf.subarray(4, 4 + metaLen))) as { fingerprint: string };
    if (meta.fingerprint !== (await fingerprint(file))) return null;
    return buf.subarray(4 + metaLen);
  } catch {
    return null;
  }
}

/** Saves the row table, then trims old ones. Failures are ignored: it's only a cache. */
export async function saveRowTable(file: File, quote: number, table: Uint8Array, pool: WorkerPool): Promise<void> {
  try {
    const meta = new TextEncoder().encode(JSON.stringify({ fingerprint: await fingerprint(file), name: file.name }));
    const bytes = new Uint8Array(4 + meta.length + table.length);
    new DataView(bytes.buffer).setUint32(0, meta.length, true);
    bytes.set(meta, 4);
    bytes.set(table, 4 + meta.length);
    await pool.save({ dir: DIR, name: await cacheName(file, quote), bytes });
    await navigator.storage.persist?.();
    await evict();
  } catch (err) {
    console.warn("Couldn't remember this file for next time", err);
  }
}

/** Keeps the newest tables within MAX_TOTAL_BYTES. */
async function evict(): Promise<void> {
  const dir = await cacheDir();
  const entries: { name: string; size: number; time: number }[] = [];
  for await (const [name, handle] of dir.entries()) {
    if (handle.kind !== "file") continue;
    const f = await (handle as FileSystemFileHandle).getFile();
    entries.push({ name, size: f.size, time: f.lastModified });
  }
  entries.sort((a, b) => b.time - a.time);
  let total = 0;
  for (const e of entries) {
    total += e.size;
    if (total > MAX_TOTAL_BYTES) await dir.removeEntry(e.name);
  }
}
