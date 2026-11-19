// Where export bytes go. Chrome and Edge write straight to a file or folder
// the user picked; other browsers write to private browser storage first and
// then download one file (several parts are zipped together).

import { Zip, ZipPassThrough } from "fflate";

export interface Sink {
  write(bytes: Uint8Array): Promise<void>;
  close(): Promise<void>;
  abort(): Promise<void>;
}

export type ExportTarget =
  | { kind: "file"; handle: FileSystemFileHandle }
  | { kind: "dir"; handle: FileSystemDirectoryHandle }
  /** Several parts in one .zip file the user chose (it can go straight into Downloads). */
  | { kind: "zip"; handle: FileSystemFileHandle }
  | { kind: "download" };

/** Private-storage folder for exports waiting to be downloaded. */
export const DOWNLOAD_DIR = "exports";

const BUFFER_BYTES = 8 << 20;

/** Batches small writes into large ones. */
class Buffered implements Sink {
  private parts: Uint8Array[] = [];
  private size = 0;

  constructor(private inner: Sink) {}

  async write(bytes: Uint8Array): Promise<void> {
    if (bytes.length === 0) return;
    this.parts.push(bytes);
    this.size += bytes.length;
    if (this.size >= BUFFER_BYTES) await this.flush();
  }

  async close(): Promise<void> {
    await this.flush();
    await this.inner.close();
  }

  abort(): Promise<void> {
    this.parts = [];
    return this.inner.abort();
  }

  private async flush(): Promise<void> {
    if (this.size === 0) return;
    const out = new Uint8Array(this.size);
    let off = 0;
    for (const p of this.parts) {
      out.set(p, off);
      off += p.length;
    }
    this.parts = [];
    this.size = 0;
    await this.inner.write(out);
  }
}

async function writableSink(handle: FileSystemFileHandle): Promise<Sink> {
  const w = await handle.createWritable();
  return {
    write: (b) => w.write(b as Uint8Array<ArrayBuffer>),
    close: () => w.close(),
    abort: () => w.abort(),
  };
}

async function storageSink(name: string): Promise<Sink> {
  const root = await navigator.storage.getDirectory();
  const dir = await root.getDirectoryHandle(DOWNLOAD_DIR, { create: true });
  const handle = await dir.getFileHandle(name, { create: true });
  const access = await handle.createSyncAccessHandle();
  access.truncate(0);
  let at = 0;
  return {
    write: async (b) => {
      at += access.write(b, { at });
    },
    close: async () => {
      access.flush();
      access.close();
    },
    abort: async () => {
      access.close();
      await dir.removeEntry(name).catch(() => {});
    },
  };
}

/** Emits a zip into a sink, one entry at a time, stored without compression. */
class ZipSink {
  private zip = new Zip();
  private pending: Uint8Array[] = [];
  private failure: Error | null = null;

  constructor(private out: Sink) {
    this.zip.ondata = (err, chunk) => {
      if (err) this.failure = err;
      else this.pending.push(chunk);
    };
  }

  entry(name: string): Sink {
    const file = new ZipPassThrough(name);
    this.zip.add(file);
    return {
      write: async (b) => {
        file.push(b);
        await this.drain();
      },
      close: async () => {
        file.push(new Uint8Array(0), true);
        await this.drain();
      },
      abort: () => this.out.abort(),
    };
  }

  async finish(): Promise<void> {
    this.zip.end();
    await this.drain();
    await this.out.close();
  }

  private async drain(): Promise<void> {
    if (this.failure) throw this.failure;
    for (const chunk of this.pending.splice(0)) await this.out.write(chunk);
  }
}

/** Opens one sink per export part and reports where the output ended up. */
export interface PartSinks {
  open(name: string): Promise<Sink>;
  /** Name of the file to download from private storage, if any. */
  finish(): Promise<string | null>;
  abort(): Promise<void>;
}

export async function partSinks(target: ExportTarget, parts: number, zipName: string): Promise<PartSinks> {
  const opened: Sink[] = [];
  const track = (s: Sink) => (opened.push(s), s);
  const abortAll = async () => {
    for (const s of opened) await s.abort().catch(() => {});
  };

  if (target.kind === "file") {
    return {
      open: async () => track(new Buffered(await writableSink(target.handle))),
      finish: async () => null,
      abort: abortAll,
    };
  }
  if (target.kind === "zip") {
    const zip = new ZipSink(track(new Buffered(await writableSink(target.handle))));
    return {
      open: async (name) => zip.entry(name),
      finish: async () => {
        await zip.finish();
        return null;
      },
      abort: abortAll,
    };
  }
  if (target.kind === "dir") {
    return {
      open: async (name) => track(new Buffered(await writableSink(await target.handle.getFileHandle(name, { create: true })))),
      finish: async () => null,
      abort: abortAll,
    };
  }
  // Download: clear earlier exports, then write into private storage.
  const root = await navigator.storage.getDirectory();
  await root.removeEntry(DOWNLOAD_DIR, { recursive: true }).catch(() => {});
  if (parts <= 1) {
    let name: string | null = null;
    return {
      open: async (n) => {
        name = n;
        return track(new Buffered(await storageSink(n)));
      },
      finish: async () => name,
      abort: abortAll,
    };
  }
  const zip = new ZipSink(track(new Buffered(await storageSink(zipName))));
  return {
    open: async (name) => zip.entry(name),
    finish: async () => {
      await zip.finish();
      return zipName;
    },
    abort: abortAll,
  };
}
