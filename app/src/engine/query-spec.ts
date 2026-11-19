// Builds an engine query from a QuerySpec. Runs inside workers.

import { Query } from "../wasm/megacsv_engine.js";
import type { FilterOp, QuerySpec } from "./protocol";

const OP_CODES: Record<FilterOp, number> = {
  contains: 0,
  equals: 1,
  startsWith: 2,
  isEmpty: 3,
  notEmpty: 4,
  between: 5,
  notNumber: 6,
  oneOf: 7,
};

/** Semicolon files use a decimal comma (21,5) almost everywhere they're common. */
export const usesDecimalComma = (delimiter: number) => delimiter === 0x3b;

// Windows-1252 characters in 0x80..0x9F, by byte.
const CP1252_HIGH = "€\u0081‚ƒ„…†‡ˆ‰Š‹Œ\u008DŽ\u008F\u0090‘’“”•–—˜™š›œ\u009DžŸ";

const utf8 = new TextEncoder();

/** Encodes search text the same way the file is encoded, so bytes compare equal. */
export function encodeFor(encoding: string, text: string): Uint8Array {
  if (encoding !== "windows-1252") return utf8.encode(text);
  const out = new Uint8Array(text.length);
  let n = 0;
  for (const ch of text) {
    const c = ch.codePointAt(0)!;
    const high = CP1252_HIGH.indexOf(ch);
    out[n++] = high >= 0 ? 0x80 + high : c < 0x100 ? c : 0x3f; // "?" if not representable
  }
  return out.subarray(0, n);
}

export function buildQuery(spec: QuerySpec | null, encoding: string, delimiter: number): Query {
  const q = new Query();
  q.setDecimalComma(usesDecimalComma(delimiter));
  if (!spec) return q;
  if (spec.text?.needle) q.setText(encodeFor(encoding, spec.text.needle), spec.text.matchCase);
  for (const f of spec.filters) {
    q.addFilter(f.col, OP_CODES[f.op], encodeFor(encoding, f.value), f.min ?? -Infinity, f.max ?? Infinity, false);
  }
  return q;
}
