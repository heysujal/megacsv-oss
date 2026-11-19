// Streams a file through decompression and text conversion into private
// storage (OPFS), writing with a sync access handle for speed.

import { CONVERT_DIR, type ConvertMessage, type ConvertPlan } from "./protocol";

const post = (m: ConvertMessage) => (self as unknown as Worker).postMessage(m);
let cancelled = false;

class NoSpace extends Error {}

/** Byte stream of the file, counting how much input has been read. */
function input(file: File, plan: ConvertPlan, onRead: (n: number) => void): ReadableStream<Uint8Array> {
  const src = plan.source;
  const blob = src.kind === "zip" ? file.slice(src.start, src.end) : file;
  const counted = blob.stream().pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, ctl) {
        onRead(chunk.length);
        ctl.enqueue(chunk);
      },
    }),
  );
  if (src.kind === "gzip") return counted.pipeThrough(new DecompressionStream("gzip") as unknown as TransformStream<Uint8Array, Uint8Array>);
  if (src.kind === "zip" && src.method === 8) {
    return counted.pipeThrough(new DecompressionStream("deflate-raw") as unknown as TransformStream<Uint8Array, Uint8Array>);
  }
  if (src.kind === "zip" && src.method !== 0) throw new Error("This zip uses a compression method the browser can't unpack. Unzip it first.");
  return counted;
}

/** UTF-16 text to UTF-8 bytes. */
function utf16ToUtf8(label: string): TransformStream<Uint8Array, Uint8Array> {
  const dec = new TextDecoder(label);
  const enc = new TextEncoder();
  let first = true;
  return new TransformStream({
    transform(chunk, ctl) {
      let text = dec.decode(chunk, { stream: true });
      if (first && text.charCodeAt(0) === 0xfeff) text = text.slice(1);
      first = false;
      if (text) ctl.enqueue(enc.encode(text));
    },
    flush(ctl) {
      const text = dec.decode();
      if (text) ctl.enqueue(enc.encode(text));
    },
  });
}

/** Every CR becomes LF (the file has no LF line endings at all). */
function crToLf(): TransformStream<Uint8Array, Uint8Array> {
  return new TransformStream({
    transform(chunk, ctl) {
      const out = chunk.slice();
      for (let i = 0; i < out.length; i++) if (out[i] === 0x0d) out[i] = 0x0a;
      ctl.enqueue(out);
    },
  });
}

async function run(file: File, plan: ConvertPlan): Promise<void> {
  const root = await navigator.storage.getDirectory();
  // Keep at most one converted copy, so big files don't pile up on disk.
  await root.removeEntry(CONVERT_DIR, { recursive: true }).catch(() => {});
  const dir = await root.getDirectoryHandle(CONVERT_DIR, { create: true });
  const handle = await dir.getFileHandle(plan.outName, { create: true });
  const access = await handle.createSyncAccessHandle();
  let inBytes = 0;
  let outBytes = 0;
  let last = 0;
  const totalIn = plan.source.kind === "zip" ? plan.source.end - plan.source.start : file.size;
  try {
    access.truncate(0);
    let stream = input(file, plan, (n) => (inBytes += n));
    if (plan.utf16) stream = stream.pipeThrough(utf16ToUtf8(plan.utf16));
    if (plan.crToLf) stream = stream.pipeThrough(crToLf());
    const reader = stream.getReader();
    for (;;) {
      if (cancelled) {
        await reader.cancel();
        throw new Error("cancelled");
      }
      const { done, value } = await reader.read();
      if (done) break;
      // A full disk (or a private window's small in-memory storage) shows up as a short write.
      if (access.write(value, { at: outBytes }) !== value.length) throw new NoSpace();
      outBytes += value.length;
      const now = performance.now();
      if (now - last > 150) {
        last = now;
        post({ kind: "progress", inBytes, totalIn, outBytes });
      }
    }
    access.flush();
  } finally {
    access.close();
  }
  post({ kind: "done", dir: CONVERT_DIR, name: plan.outName, outBytes });
}

self.onmessage = (e: MessageEvent<{ kind: "start"; file: File; plan: ConvertPlan } | { kind: "cancel" }>) => {
  if (e.data.kind === "cancel") {
    cancelled = true;
    return;
  }
  run(e.data.file, e.data.plan).catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    post({
      kind: "error",
      message:
        err instanceof NoSpace || (err instanceof DOMException && err.name === "QuotaExceededError")
          ? "There isn't enough room to unpack this file in the browser. In a private or incognito window the browser allows much less; try a normal window, free some disk space, or unzip it yourself and open the CSV."
          : message,
    });
  });
};
