// Summarize: rows per value of one column (group by), with the count, total,
// average, smallest and largest of a number column. Runs on the rows the
// active sheet shows.
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { since, track } from "../../analytics";
import { closeDialog, filterToGroup, pool } from "../../app/controller";
import { columnNames } from "../../app/filters";
import { fmt } from "../../app/format";
import { type ScopeRequest, useApp } from "../../app/store";
import { type Group, MAX_GROUPS, SummaryRun } from "../../engine/summary-run";
import { Button } from "../ui/button";
import { Dialog } from "../ui/dialog";
import { Field, Select } from "../ui/field";

/** Groups drawn in the table; the CSV download has all of them. */
const SHOWN = 1000;
const num = (n: number) => (Number.isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: 4 }) : "");

export function SummaryDialog() {
  const dialog = useApp((s) => s.dialog);
  const req = dialog?.kind === "summary" ? dialog.req : null;
  const last = useRef<ScopeRequest | null>(null);
  if (req) last.current = req;
  return last.current ? <SummaryForm open={!!req} req={req ?? last.current} /> : null;
}

function SummaryForm({ open, req }: { open: boolean; req: ScopeRequest }) {
  const names = useMemo(() => columnNames(req.session.header, req.session.columnCount).slice(0, req.session.columnCount), [req.session]);
  const key = names.join("\u0000");
  const [group, setGroup] = useState(names.length > 1 ? "0" : "-1");
  const [value, setValue] = useState("-1");
  const [sort, setSort] = useState("rows");
  const [run, setRun] = useState<SummaryRun | null>(null);
  const [changed, setChanged] = useState(true);
  const [, tick] = useReducer((n: number) => n + 1, 0);

  // A different file starts over.
  useEffect(() => {
    setGroup(names.length > 1 ? "0" : "-1");
    setValue("-1");
    setRun(null);
    setChanged(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useEffect(() => {
    if (open) setChanged(true);
  }, [open, req]);
  useEffect(() => {
    if (!open) run?.cancel();
  }, [open, run]);

  const start = () => {
    run?.cancel();
    const g = Number(group);
    const v = Number(value);
    const r = new SummaryRun(req.session, pool, { group: g, value: v, spec: req.spec });
    track("summary_start", { grouped: g >= 0, with_value: v >= 0, filtered: !!req.spec, file_bytes: req.session.file.size });
    r.onUpdate = () => {
      if (r.phase === "done") track("summary_done", { groups: r.groups.size, seconds: since(r.started) });
      if (r.phase === "done" || r.phase === "failed") setChanged(false);
      tick();
    };
    setRun(r);
    setChanged(false);
    r.start();
  };

  const phase = run?.phase ?? "idle";
  const done = phase === "done";
  const running = phase === "running";
  /** A run stopped by closing the dialog has only part of the rows; it shows nothing. */
  const showResults = done || phase === "failed";

  const sorted = (): Group[] => {
    if (!run) return [];
    const all = [...run.groups.values()];
    const avg = (g: Group) => (g.numbers ? g.sum / g.numbers : -Infinity);
    const by: Record<string, (a: Group, b: Group) => number> = {
      rows: (a, b) => b.rows - a.rows || a.key.localeCompare(b.key),
      key: (a, b) => a.key.localeCompare(b.key, undefined, { numeric: true }),
      sum: (a, b) => (b.numbers ? b.sum : -Infinity) - (a.numbers ? a.sum : -Infinity),
      avg: (a, b) => avg(b) - avg(a),
    };
    all.sort(by[sort] ?? by.rows);
    if (run.other.rows) all.push(run.other);
    return all;
  };

  const pick = (k: string | undefined) => {
    if (k === undefined || !run) return;
    track("summary_pick");
    closeDialog();
    filterToGroup(run.what.group, k);
  };

  /** All groups as a CSV file, in the order shown. */
  const download = () => {
    if (!done || !run) return;
    const grouped = run.what.group >= 0;
    const withValue = run.what.value >= 0;
    const q = (v: string) => (/[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    const n = (v: number) => (Number.isFinite(v) ? String(v) : "");
    const lines = [[grouped ? names[run.what.group] : "group", "rows", ...(withValue ? ["empty", "numbers", "total", "average", "smallest", "largest"] : [])].map(q).join(",")];
    for (const g of sorted()) {
      const k = !grouped ? "All rows" : g === run.other ? "Other values" : g.key;
      const cols = [q(k), String(g.rows)];
      if (withValue) cols.push(String(g.empty), String(g.numbers), g.numbers ? n(g.sum) : "", g.numbers ? n(g.sum / g.numbers) : "", g.numbers ? n(g.min) : "", g.numbers ? n(g.max) : "");
      lines.push(cols.join(","));
    }
    const base = req.session.file.name.replace(/\.[^.]+$/, "") || "summary";
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([`﻿${lines.join("\r\n")}\r\n`], { type: "text/csv" }));
    a.download = `${base}-summary.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 60_000);
    track("summary_download", { groups: run.groups.size });
  };

  return (
    <Dialog
      id="summary-dialog"
      open={open}
      onClose={closeDialog}
      wide
      state={phase}
      title="Summarize"
      footer={
        <>
          <Button id="summary-export" hidden={!done} onClick={download}>
            Download as CSV
          </Button>
          <span className="flex-1" />
          <Button id="summary-close" onClick={closeDialog}>
            Close
          </Button>
          <Button id="summary-go" variant="primary" hidden={done && !changed} disabled={running} onClick={start}>
            Summarize
          </Button>
        </>
      }
    >
      <p id="summary-scope" className="mb-4 text-[14px] text-muted">
        Summarizes {req.what}.
      </p>
      <form
        id="summary-form"
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          start();
        }}
      >
        <Field label="Group rows by">
          <Select
            id="summary-group"
            value={group}
            onChange={(e) => {
              setGroup(e.target.value);
              setChanged(true);
            }}
            className="font-normal"
          >
            <option value="-1">Nothing: one line for all rows</option>
            {names.map((n, i) => (
              <option key={i} value={i}>
                {n}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Totals of">
          <Select
            id="summary-value"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setChanged(true);
            }}
            className="font-normal"
          >
            <option value="-1">No column: count rows only</option>
            {names.map((n, i) => (
              <option key={i} value={i}>
                {n}
              </option>
            ))}
          </Select>
        </Field>
      </form>
      <div id="summary-progress" className="mt-4 h-1.5 overflow-hidden rounded-full bg-tone-1" hidden={!running}>
        <div id="summary-fill" className="h-full rounded-full bg-cobalt transition-[width] duration-200" style={{ width: `${((run?.progress ?? 0) * 100).toFixed(1)}%` }} />
      </div>
      <div id="summary-results" className="mt-5" hidden={!showResults}>
        {run && showResults && (
          <Results run={run} names={names} groups={sorted()} sort={sort} setSort={setSort} onPick={pick} />
        )}
      </div>
    </Dialog>
  );
}

function Results({
  run,
  names,
  groups,
  sort,
  setSort,
  onPick,
}: {
  run: SummaryRun;
  names: string[];
  groups: Group[];
  sort: string;
  setSort: (s: string) => void;
  onPick: (key: string | undefined) => void;
}) {
  if (run.error)
    return (
      <p id="summary-count" className="text-[14px]" aria-live="polite">
        The summary stopped: {run.error}
      </p>
    );
  const grouped = run.what.group >= 0;
  const withValue = run.what.value >= 0;
  const rows = groups.reduce((n, g) => n + g.rows, 0);
  const count = grouped
    ? `${fmt(run.groups.size)} ${run.groups.size === 1 ? "group" : "groups"} · ${fmt(rows)} rows${groups.length > SHOWN ? ` · showing the first ${fmt(SHOWN)}; the download has all` : ""}${run.other.rows ? ` · more than ${fmt(MAX_GROUPS)} groups: the rest are counted together as “Other values”` : ""}`
    : `${fmt(rows)} rows`;
  const heads = [grouped ? names[run.what.group] : "", "Rows", ...(withValue ? ["Empty", "Numbers", "Total", "Average", "Smallest", "Largest"] : [])];
  return (
    <>
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <span id="summary-count" className="flex-1 text-[13px] text-muted tabular-nums" aria-live="polite">
          {count}
        </span>
        <label className="flex items-center gap-2 text-[13px] text-muted">
          Sort by
          <Select id="summary-sort" value={sort} onChange={(e) => setSort(e.target.value)} className="h-8 text-[13px]">
            <option value="rows">Most rows</option>
            <option value="key">Name, A to Z</option>
            <option value="sum">Largest total</option>
            <option value="avg">Largest average</option>
          </Select>
        </label>
      </div>
      <div className="max-h-[46vh] overflow-auto rounded-control shadow-[0_0_0_1px_var(--hairline)]">
        <table id="summary-table" className="w-full border-collapse text-[13px] tabular-nums">
          <thead className="sticky top-0 bg-ground">
            <tr>
              {heads.map((h, i) => (
                <th key={i} scope="col" className={i === 0 ? "px-3 py-2 text-left font-medium text-muted" : "px-3 py-2 text-right font-medium text-muted"}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.slice(0, SHOWN).map((g, idx) => {
              const isOther = g === run.other;
              const label = !grouped ? "All rows" : isOther ? "Other values" : g.key === "" ? "(empty)" : g.key;
              const pickable = grouped && !isOther;
              return (
                <tr
                  key={isOther ? "\u0000other" : `${idx}:${g.key}`}
                  tabIndex={pickable ? 0 : undefined}
                  title={pickable ? `Show the rows where ${names[run.what.group]} is ${label}` : undefined}
                  onClick={() => pickable && onPick(g.key)}
                  onKeyDown={(e) => e.key === "Enter" && pickable && onPick(g.key)}
                  className={pickable ? "cursor-pointer border-t border-hairline hover:bg-tone-1 focus-visible:bg-tone-1" : "border-t border-hairline"}
                >
                  <th scope="row" className="max-w-[260px] truncate px-3 py-1.5 text-left font-normal">
                    {label}
                  </th>
                  <td className="px-3 py-1.5 text-right">{fmt(g.rows)}</td>
                  {withValue && (
                    <>
                      <td className="px-3 py-1.5 text-right">{fmt(g.empty)}</td>
                      <td className="px-3 py-1.5 text-right">{fmt(g.numbers)}</td>
                      <td className="px-3 py-1.5 text-right">{g.numbers ? num(g.sum) : ""}</td>
                      <td className="px-3 py-1.5 text-right">{g.numbers ? num(g.sum / g.numbers) : ""}</td>
                      <td className="px-3 py-1.5 text-right">{g.numbers ? num(g.min) : ""}</td>
                      <td className="px-3 py-1.5 text-right">{g.numbers ? num(g.max) : ""}</td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[13px] text-muted">{grouped ? "Select a group to show its rows in the grid." : ""}</p>
    </>
  );
}
