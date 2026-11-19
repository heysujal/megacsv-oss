// The work area: formula bar, the canvas grid (column letters, row numbers),
// and sheet tabs (all rows, plus the filtered result).
import { ArrowsDownUp, Funnel, Rows, X } from "@phosphor-icons/react";
import { useEffect, useRef } from "react";
import { attachGrid, clearSort, showTab, sinks } from "../app/controller";
import { columnLetter } from "../app/filters";
import { hasFile, useApp } from "../app/store";
import { cn } from "./ui/cn";

/** Name box and full value of the active cell. Written straight to the DOM, not into React state (rule 3). */
function FormulaBar() {
  const name = useRef<HTMLSpanElement>(null);
  const value = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    sinks.select = (c) => {
      if (!name.current || !value.current) return;
      name.current.textContent = c ? `${columnLetter(c.col)}${c.label < 0 ? "…" : c.label.toLocaleString()}` : "";
      value.current.textContent = c ? (c.value ?? "…") : "";
      value.current.title = c?.value && c.value.length > 80 ? "Double-click the cell or press Enter to see all of it" : "";
    };
    return () => {
      sinks.select = () => {};
    };
  }, []);
  return (
    <div className="grid h-8 shrink-0 grid-cols-[minmax(88px,140px)_28px_1fr] items-center bg-sheet text-[13px] shadow-[inset_0_-1px_0_var(--hairline)]">
      <span
        ref={name}
        aria-label="Selected cell"
        className="flex h-full items-center truncate px-3 font-medium tabular-nums shadow-[inset_-1px_0_0_var(--hairline)]"
      />
      <span className="text-center text-muted italic" aria-hidden="true">
        fx
      </span>
      <span ref={value} aria-label="Cell value" className="truncate px-2.5 whitespace-pre" />
    </div>
  );
}

function GridHost() {
  const ref = useRef<HTMLDivElement>(null);
  const busy = useApp((s) => s.filePhase === "reading" || s.result?.phase === "running" || (!!s.sort && !s.sort.done));
  useEffect(() => {
    if (ref.current) attachGrid(ref.current);
  }, []);
  return <main id="grid-host" ref={ref} aria-busy={busy} className="relative min-h-0 flex-1 overflow-hidden" />;
}

function SheetTabs() {
  const result = useApp((s) => s.result);
  const active = useApp((s) => s.activeTab);
  const rowCount = useApp((s) => s.rowCount);
  const complete = useApp((s) => s.filePhase === "ready");
  const sort = useApp((s) => s.sort);
  const tab = "flex h-full max-w-[60vw] min-w-0 items-center gap-1.5 rounded-b-control px-3.5 text-[13px] whitespace-nowrap transition-colors";
  const on = "bg-sheet font-medium text-ink shadow-[inset_0_-2px_0_var(--cobalt)]";
  const off = "text-muted hover:text-ink";
  return (
    <div role="group" aria-label="Sheets" className="flex h-[38px] shrink-0 items-stretch gap-1 overflow-x-auto bg-ground px-2.5 tabular-nums">
      {result && (
        <button
          type="button"
          aria-pressed={active === "result"}
          className={cn(tab, active === "result" ? on : off)}
          onClick={() => showTab("result")}
          title={result.label}
        >
          <Funnel size={14} className="shrink-0" aria-hidden="true" />
          <span className="truncate">{result.label}</span>
          <span className="shrink-0">· {result.total.toLocaleString()} rows</span>
        </button>
      )}
      {sort && (
        <span className={cn(tab, "pr-1.5", active === "sorted" ? on : off)}>
          <button
            id="sorted-tab"
            type="button"
            aria-pressed={active === "sorted"}
            disabled={!sort.done}
            onClick={() => showTab("sorted")}
            className="flex h-full min-w-0 items-center gap-1.5 disabled:cursor-progress"
            title={`Sorted by ${sort.label}`}
          >
            <ArrowsDownUp size={14} className="shrink-0" aria-hidden="true" />
            <span className="truncate">
              {sort.label} {sort.descending ? "Z→A" : "A→Z"}
            </span>
            <span className="shrink-0">· {sort.done ? `${sort.rows.toLocaleString()} rows` : `sorting ${(sort.progress * 100).toFixed(0)}%`}</span>
          </button>
          <button
            type="button"
            aria-label="Remove sort"
            title="Remove sort"
            onClick={clearSort}
            className="ml-1 grid size-6 place-items-center rounded-token text-muted hover:bg-tone-1 hover:text-ink"
          >
            <X size={12} />
          </button>
        </span>
      )}
      <button type="button" aria-pressed={active === "all"} className={cn(tab, active === "all" ? on : off)} onClick={() => showTab("all")}>
        <Rows size={14} className="shrink-0" aria-hidden="true" />
        All rows · {rowCount.toLocaleString()}
        {complete ? "" : "…"}
      </button>
    </div>
  );
}

export function Workspace() {
  const fileOpen = useApp(hasFile);
  return (
    <div
      className="mx-0 flex min-h-0 flex-1 flex-col overflow-hidden bg-sheet shadow-[0_0_0_1px_var(--hairline)] sm:mx-2 sm:rounded-t-panel"
      hidden={!fileOpen}
    >
      <FormulaBar />
      <GridHost />
      <SheetTabs />
    </div>
  );
}
