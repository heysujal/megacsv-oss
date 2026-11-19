// Recognizes files that aren't CSV text, so we can say what they are instead
// of showing their raw bytes as rows.

function startsWith(head: Uint8Array, sig: number[]): boolean {
  return sig.every((b, i) => head[i] === b);
}

/** Why this file can't be opened as CSV, in plain words, or null if it looks like text. */
export function notCsvReason(head: Uint8Array, name: string): string | null {
  const ext = name.toLowerCase().split(".").pop() ?? "";
  if (startsWith(head, [0x50, 0x4b, 0x03, 0x04]) || startsWith(head, [0x50, 0x4b, 0x05, 0x06])) {
    // Excel's parts live under "xl/", whatever the file is called.
    const names = new TextDecoder("latin1").decode(head.subarray(0, 64 << 10));
    if (ext === "xlsx" || ext === "xlsm" || names.includes("xl/workbook") || names.includes("xl/worksheets")) {
      return "This is an Excel workbook, not a CSV file. Open it in Excel or Google Sheets.";
    }
    if (ext === "zip") {
      return "This zip file couldn't be unpacked. Unzip it first, then open the CSV file inside.";
    }
    return "This is a compressed package (like a zip or Office file), not a CSV file.";
  }
  if (startsWith(head, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) {
    return "This is an older Excel or Office file (.xls), not a CSV file. Open it in Excel or Google Sheets.";
  }
  if (startsWith(head, [0x1f, 0x8b])) {
    return "This file is compressed (.gz) and couldn't be unpacked. Unzip it first, then open the CSV file inside.";
  }
  if (startsWith(head, [0x50, 0x41, 0x52, 0x31])) {
    return "This is a Parquet file, not a CSV file. Parquet support is planned.";
  }
  if (startsWith(head, [0x25, 0x50, 0x44, 0x46])) return "This is a PDF, not a CSV file.";
  if (startsWith(head, [0x89, 0x50, 0x4e, 0x47]) || startsWith(head, [0xff, 0xd8, 0xff])) {
    return "This is an image, not a CSV file.";
  }
  return null;
}

/**
 * True if the sample looks like binary data rather than text: zero bytes or
 * many control characters. Only meaningful for 8-bit text (not UTF-16).
 */
export function looksBinary(head: Uint8Array): boolean {
  const n = Math.min(head.length, 64 << 10);
  if (n === 0) return false;
  let control = 0;
  for (let i = 0; i < n; i++) {
    const b = head[i];
    if (b === 0) return true;
    // Tab, newline, form feed and carriage return are normal in text.
    if (b < 0x20 && b !== 0x09 && b !== 0x0a && b !== 0x0c && b !== 0x0d) control++;
  }
  return control / n > 0.05;
}
