// Decides whether a file must be converted before opening, and how.

import { sniff } from "../wasm/megacsv_engine.js";
import { Unsupported } from "../engine/session";
import type { ConvertPlan } from "./protocol";
import { dataOffset, pickEntry, zipEntries } from "./zip";

const HEAD = 64 << 10;

const startsWith = (head: Uint8Array, sig: number[]) => sig.every((b, i) => head[i] === b);

export interface Plan {
  plan: ConvertPlan;
  /** Shown while converting, e.g. "Unzipping orders.csv (1 of 3 files in the zip)". */
  label: string;
}

/** Null if the file can be opened as it is. Throws with a plain message if it can't be converted. */
export async function planConversion(file: File): Promise<Plan | null> {
  const head = new Uint8Array(await file.slice(0, HEAD).arrayBuffer());
  const base = file.name.replace(/\.(gz|gzip)$/i, "");
  if (startsWith(head, [0x1f, 0x8b])) {
    // The last 4 bytes hold the unpacked size modulo 4 GB: a hint only.
    const t = new DataView(await file.slice(file.size - 4).arrayBuffer());
    const hint = file.size >= 4 ? t.getUint32(0, true) : 0;
    return {
      plan: { source: { kind: "gzip" }, crToLf: false, outName: /\.(csv|tsv|txt)$/i.test(base) ? base : `${base}.csv`, expectedBytes: hint > file.size ? hint : 0 },
      label: `Unpacking ${file.name}`,
    };
  }
  if (startsWith(head, [0x50, 0x4b, 0x03, 0x04]) && /\.zip$/i.test(file.name)) {
    const entries = await zipEntries(file).catch((err: unknown) => {
      throw new Unsupported(err instanceof Error ? err.message : String(err));
    });
    const entry = pickEntry(entries);
    if (!entry) throw new Unsupported("This zip file is empty.");
    const start = await dataOffset(file, entry);
    const name = entry.name.split("/").pop() || "unzipped.csv";
    const of = entries.length > 1 ? ` (the largest of ${entries.length} files in the zip)` : "";
    return {
      plan: { source: { kind: "zip", start, end: start + entry.compressedSize, method: entry.method }, crToLf: false, outName: name, expectedBytes: entry.size },
      label: `Unzipping ${name}${of}`,
    };
  }
  const s = sniff(head, file.size <= HEAD);
  const encoding = s.encoding;
  const lineEndings = s.lineEndings;
  s.free();
  const utf16 = encoding === "utf-16le" || encoding === "utf-16be" ? encoding : undefined;
  if (!utf16 && lineEndings !== "cr") return null;
  return {
    plan: { source: { kind: "plain" }, utf16, crToLf: !utf16 && lineEndings === "cr", outName: file.name, expectedBytes: utf16 ? Math.round(file.size / 2) : file.size },
    label: utf16 ? `Converting ${file.name} from UTF-16 text` : `Converting old Mac line endings in ${file.name}`,
  };
}
