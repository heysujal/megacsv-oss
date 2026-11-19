// Filter conditions as typed in the filter sentence, and saved filter sets.

import type { FilterOp, FilterSpec } from "../engine/protocol";

export const OPS: [FilterOp, string][] = [
  ["contains", "contains"],
  ["equals", "is"],
  ["oneOf", "is one of"],
  ["startsWith", "starts with"],
  ["isEmpty", "is empty"],
  ["notEmpty", "is not empty"],
  ["between", "is a number between"],
  ["notNumber", "is not a number"],
];

export const NEEDS_TEXT = new Set<FilterOp>(["contains", "equals", "startsWith"]);

/** One condition as typed: every box keeps its text, even when the condition doesn't use it. */
export interface Condition {
  id: number;
  col: number;
  op: FilterOp;
  value: string;
  list: string;
  min: string;
  max: string;
}

let nextId = 1;
export function newCondition(col = 0): Condition {
  return { id: nextId++, col, op: "contains", value: "", list: "", min: "", max: "" };
}

/** Complete conditions only; half-filled ones are ignored. */
export function specsOf(conditions: Condition[], decimalComma: boolean): FilterSpec[] {
  const out: FilterSpec[] = [];
  for (const r of conditions) {
    const { op, col } = r;
    if (NEEDS_TEXT.has(op)) {
      if (r.value === "") continue;
      out.push({ col, op, value: r.value });
    } else if (op === "oneOf") {
      const values = splitValues(r.list);
      if (values.length === 0) continue;
      out.push({ col, op, value: values.join("\n") });
    } else if (op === "between") {
      const min = parseNumber(r.min, decimalComma);
      const max = parseNumber(r.max, decimalComma);
      if (min === null && max === null) continue;
      out.push({ col, op, value: "", min: min ?? -Infinity, max: max ?? Infinity });
    } else {
      out.push({ col, op, value: "" });
    }
  }
  return out;
}

/** Saved filter sets, by name, kept in this browser (localStorage). */
const SAVED_KEY = "megacsv-saved-filters";

/** A condition as saved: columns by name, so a set works on next month's file too. */
export interface SavedCondition {
  column: string;
  col: number;
  op: FilterOp;
  value: string;
  min?: number | null;
  max?: number | null;
}

export interface SavedFilters {
  name: string;
  conditions: SavedCondition[];
}

export function toSaved(name: string, specs: FilterSpec[], columns: string[]): SavedFilters {
  return {
    name,
    conditions: specs.map((f) => ({
      column: columns[f.col] ?? "",
      col: f.col,
      op: f.op,
      value: f.value,
      min: Number.isFinite(f.min) ? f.min : null,
      max: Number.isFinite(f.max) ? f.max : null,
    })),
  };
}

/**
 * Conditions for a saved set on this file. Columns are found by name, then by
 * position. Also returns the names of columns this file lacks.
 */
export function fromSaved(saved: SavedFilters, columns: string[], decimalComma: boolean): { conditions: Condition[]; missing: string[] } {
  const conditions: Condition[] = [];
  const missing: string[] = [];
  const show = (n: number | null | undefined) => (n == null ? "" : decimalComma ? String(n).replace(".", ",") : String(n));
  for (const c of saved.conditions) {
    let col = columns.indexOf(c.column);
    if (col < 0) {
      if (c.col >= columns.length) {
        missing.push(c.column);
        continue;
      }
      col = c.col;
    }
    conditions.push({
      ...newCondition(col),
      op: c.op,
      value: c.op === "oneOf" ? "" : c.value,
      list: c.op === "oneOf" ? c.value : "",
      min: show(c.min),
      max: show(c.max),
    });
  }
  return { conditions, missing };
}

export function savedFilterSets(): SavedFilters[] {
  try {
    const v = JSON.parse(localStorage.getItem(SAVED_KEY) ?? "[]") as unknown;
    return Array.isArray(v) ? (v as SavedFilters[]) : [];
  } catch {
    return [];
  }
}

export function saveFilterSet(set: SavedFilters): void {
  const all = savedFilterSets().filter((s) => s.name !== set.name);
  all.unshift(set);
  localStorage.setItem(SAVED_KEY, JSON.stringify(all));
}

export function deleteFilterSet(name: string): void {
  localStorage.setItem(SAVED_KEY, JSON.stringify(savedFilterSets().filter((s) => s.name !== name)));
}

/**
 * Pasted values: one per line, or per cell when copied from a spreadsheet
 * row (tabs). A single line of comma-separated values is split on commas.
 */
export function splitValues(text: string): string[] {
  let parts = text.split(/\r?\n|\t/);
  if (parts.filter((p) => p.trim()).length === 1 && text.includes(",")) parts = text.split(",");
  return [...new Set(parts.map((p) => p.trim()).filter(Boolean))];
}

/** A number typed in a From/To box: `1,234.5`, or `1.234,5` and `21,5` in decimal-comma files. */
export function parseNumber(s: string, decimalComma = false): number | null {
  let t = s.trim().replace(/\s/g, "");
  if (t === "") return null;
  t = decimalComma ? t.replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".") : t.replace(/,/g, "");
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function columnLetter(i: number): string {
  let s = "";
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

/** Column names for menus: the header, or "Column C" where it's blank. */
export function columnNames(header: string[], count: number): string[] {
  return Array.from({ length: Math.max(count, header.length) }, (_, i) => (header[i]?.trim() ? header[i] : `Column ${columnLetter(i)}`));
}

/** A short name for a filtered result's sheet tab, e.g. "country is IN +1". */
export function describeFilters(specs: FilterSpec[], columns: string[], findText: string | undefined): string {
  const opName = Object.fromEntries(OPS) as Record<FilterOp, string>;
  const parts: string[] = [];
  if (findText) parts.push(`“${clip(findText, 18)}”`);
  for (const f of specs) {
    const col = clip(columns[f.col] ?? columnLetter(f.col), 16);
    if (f.op === "oneOf") parts.push(`${col} is one of ${f.value.split("\n").length.toLocaleString()}`);
    else if (f.op === "between") parts.push(`${col} ${fmtRange(f.min, f.max)}`);
    else if (NEEDS_TEXT.has(f.op)) parts.push(`${col} ${opName[f.op]} ${clip(f.value, 14)}`);
    else parts.push(`${col} ${opName[f.op]}`);
  }
  if (parts.length === 0) return "Filtered";
  return parts.length === 1 ? parts[0] : `${parts[0]} +${parts.length - 1}`;
}

function fmtRange(min: number | undefined, max: number | undefined): string {
  const lo = Number.isFinite(min) ? min!.toLocaleString() : null;
  const hi = Number.isFinite(max) ? max!.toLocaleString() : null;
  if (lo && hi) return `${lo}–${hi}`;
  return lo ? `≥ ${lo}` : `≤ ${hi}`;
}

function clip(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}
