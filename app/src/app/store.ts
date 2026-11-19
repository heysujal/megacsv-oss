// UI state for the app shell. Only what the interface shows: names, counts,
// status text and the filter boxes. Row data never goes here (CLAUDE.md rule 3);
// the grid pulls rows from the file session itself.

import { create } from "zustand";
import type { QuerySpec } from "../engine/protocol";
import type { RunPhase } from "../engine/run-state";
import type { FileSession } from "../engine/session";
import type { RecentFile } from "../recent";
import type { Condition, SavedFilters } from "./filters";

export interface ScopeRequest {
  session: FileSession;
  spec: QuerySpec | null;
  /** "all 48,273,484 rows" or "the 12,345 matching rows". */
  what: string;
}

export interface ExportRequest extends ScopeRequest {
  expectedRows: number;
  baseName: string;
  /** A sorted sheet: rows are written in this order. */
  order?: { file: File; rows: number } | null;
  /** The cells selected in the grid when Export was opened: sheet rows and columns, first and last. */
  selection?: { rows: [number, number]; cols: [number, number] } | null;
}

export type Dialog =
  | null
  | { kind: "export"; req: ExportRequest }
  | { kind: "summary"; req: ScopeRequest }
  | { kind: "feedback" }
  | { kind: "saved" }
  | { kind: "sort" };

export interface Notice {
  text: string;
  action?: { label: string; run: () => void };
}

/** The open file: none yet, being opened, on screen while the rest is read, fully read, or couldn't be opened. */
export type FilePhase = "none" | "opening" | "reading" | "ready" | "failed";

export type SheetTab = "all" | "result" | "sorted";

export interface AppState {
  filePhase: FilePhase;
  fileName: string;
  /** Exactly what #file-info shows: "name · 1.2 GB" (or "a.gz → a.csv · 3 GB"). */
  fileInfo: string;
  fileSize: number;
  rowCount: number;
  status: string;
  format: string;
  /** 0–1 while reading, converting or filtering; null when idle. */
  progress: number | null;
  notice: Notice | null;
  recent: RecentFile[];
  dragging: boolean;

  findOpen: boolean;
  findText: string;
  matchCase: boolean;
  onlyMatching: boolean;
  findCount: string;
  /** The search behind findCount; "idle" when there is none. */
  findPhase: RunPhase;

  filterOpen: boolean;
  conditions: Condition[];
  /** JSON of the conditions last applied, to show "Not applied yet". */
  appliedKey: string;
  appliedCount: number;
  columns: string[];
  decimalComma: boolean;
  saveFormOpen: boolean;
  saved: SavedFilters[];

  /** The filtered result's sheet tab, if there is one. */
  result: { label: string; total: number; phase: RunPhase } | null;
  /** The sorted sheet tab, if a sort is on: by which column, how far along. */
  sort: { col: number; descending: boolean; label: string; progress: number; done: boolean; rows: number } | null;
  activeTab: SheetTab;

  dialog: Dialog;
  /** Phones: the tool row's overflow menu shows "Go to row" in its own line. */
  gotoOpen: boolean;
}

export const useApp = create<AppState>()(() => ({
  filePhase: "none",
  fileName: "",
  fileInfo: "",
  fileSize: 0,
  rowCount: 0,
  status: "No file open",
  format: "",
  progress: null,
  notice: null,
  recent: [],
  dragging: false,

  findOpen: false,
  findText: "",
  matchCase: false,
  onlyMatching: false,
  findCount: "",
  findPhase: "idle",

  filterOpen: false,
  conditions: [],
  appliedKey: "[]",
  appliedCount: 0,
  columns: [],
  decimalComma: false,
  saveFormOpen: false,
  saved: [],

  result: null,
  sort: null,
  activeTab: "all",

  dialog: null,
  gotoOpen: false,
}));

export const set = useApp.setState;
export const get = useApp.getState;

/** Whether a file is on screen, even if it is still being read. */
export const hasFile = (s: AppState): boolean => s.filePhase === "reading" || s.filePhase === "ready";
