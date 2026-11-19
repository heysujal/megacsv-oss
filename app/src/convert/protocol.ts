// Turning a compressed or UTF-16 or CR-only file into a plain UTF-8 CSV copy
// in the browser's private storage, which MegaCSV then opens.

export interface ConvertPlan {
  /** Decompression of the whole file or of one zip entry. */
  source: { kind: "plain" } | { kind: "gzip" } | { kind: "zip"; start: number; end: number; method: number };
  /** Text encoding to turn into UTF-8, if not UTF-8 already. */
  utf16?: "utf-16le" | "utf-16be";
  /** Old Mac line endings (CR only) become LF. */
  crToLf: boolean;
  /** Name for the converted copy, e.g. orders.csv for orders.csv.gz. */
  outName: string;
  /** Rough size of the output, for the progress bar; 0 if unknown. */
  expectedBytes: number;
}

export type ConvertMessage =
  | { kind: "progress"; inBytes: number; totalIn: number; outBytes: number }
  | { kind: "done"; dir: string; name: string; outBytes: number }
  | { kind: "error"; message: string };

/** Folder in private storage for converted copies; emptied before each conversion. */
export const CONVERT_DIR = "converted";
