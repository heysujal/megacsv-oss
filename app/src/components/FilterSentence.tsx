// Filters written as a sentence: "Show rows where [country] [is] [IN] and …".
// Each blank is a token: a native select or box styled as cobalt-on-tone text.
import { Plus, X } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import {
  addCondition,
  applyFilters,
  applySavedSet,
  clearFilters,
  currentSpecs,
  removeCondition,
  saveCurrent,
  startSave,
  updateCondition,
} from "../app/controller";
import { type Condition, NEEDS_TEXT, OPS, splitValues } from "../app/filters";
import { EXCEL_DATA_ROWS } from "../export/export";
import type { FilterOp } from "../engine/protocol";
import { set, useApp } from "../app/store";
import { Button } from "./ui/button";
import { cn } from "./ui/cn";

export function FilterSentence() {
  const open = useApp((s) => s.filterOpen);
  const conditions = useApp((s) => s.conditions);
  const appliedKey = useApp((s) => s.appliedKey);
  const appliedCount = useApp((s) => s.appliedCount);
  const decimalComma = useApp((s) => s.decimalComma);
  const saved = useApp((s) => s.saved);
  const saveFormOpen = useApp((s) => s.saveFormOpen);
  const visible = open || appliedCount > 0;
  // Recomputed on every edit; cheap (a handful of conditions).
  const pending = JSON.stringify(currentSpecs()) !== appliedKey;
  void decimalComma;

  return (
    <section id="filters" aria-label="Filters" className="shrink-0 px-3 pb-2 text-[15px]" hidden={!visible}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
        <div id="filter-rows" className="contents">
          {conditions.length === 0 && <span className="text-muted">Show every row.</span>}
          {conditions.map((c, i) => (
            <ConditionRow key={c.id} c={c} first={i === 0} />
          ))}
        </div>
        <button
          id="filter-add"
          type="button"
          onClick={addCondition}
          className="inline-flex h-[30px] items-center gap-1 rounded-token px-1.5 text-muted transition-colors hover:bg-tone-1 hover:text-ink"
        >
          <Plus size={14} aria-hidden="true" />
          {conditions.length ? "and…" : "Add a condition"}
        </button>
        <Button id="filter-apply" size="sm" variant={pending ? "primary" : "secondary"} onClick={applyFilters}>
          Apply filters
        </Button>
        <span id="filter-pending" className="text-[13px] text-warning" hidden={!pending}>
          Not applied yet
        </span>
        <MatchCount />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <SavedSelect saved={saved} />
        <Button id="filter-save" size="sm" variant="quiet" onClick={startSave}>
          Save these filters
        </Button>
        <Button id="filter-clear" size="sm" variant="quiet" onClick={clearFilters}>
          Clear all
        </Button>
      </div>
      {saveFormOpen && <SaveForm />}
    </section>
  );
}

function ConditionRow({ c, first }: { c: Condition; first: boolean }) {
  const columns = useApp((s) => s.columns);
  const decimalComma = useApp((s) => s.decimalComma);
  const valueRef = useRef<HTMLInputElement>(null);
  const n = c.op === "oneOf" ? splitValues(c.list).length : 0;
  const onEnter = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      applyFilters();
    }
  };
  // A new condition starts with the cursor in its value box.
  useEffect(() => valueRef.current?.focus(), []);

  return (
    <div className="filter-row inline-flex max-w-full flex-wrap items-center gap-x-1.5 gap-y-1.5">
      <span>{first ? "Show rows where" : "and"}</span>
      <select className="token col" aria-label="Column" value={c.col} onChange={(e) => updateCondition(c.id, { col: Number(e.target.value) })}>
        {columns.map((name, i) => (
          <option key={i} value={i}>
            {name}
          </option>
        ))}
      </select>
      <select className="token op" aria-label="Condition" value={c.op} onChange={(e) => updateCondition(c.id, { op: e.target.value as FilterOp })}>
        {OPS.map(([op, label]) => (
          <option key={op} value={op}>
            {label}
          </option>
        ))}
      </select>
      {NEEDS_TEXT.has(c.op) && (
        <input
          ref={valueRef}
          className="token w-[16ch] min-w-0"
          type="text"
          placeholder="Value"
          aria-label="Value"
          autoComplete="off"
          spellCheck={false}
          value={c.value}
          onChange={(e) => updateCondition(c.id, { value: e.target.value })}
          onKeyDown={onEnter}
        />
      )}
      {c.op === "oneOf" && (
        <>
          <textarea
            className="token values max-h-28 min-h-[30px] w-[22ch] resize-none py-1 leading-snug"
            rows={1}
            placeholder="Paste values, one per line…"
            aria-label="Values, one per line"
            spellCheck={false}
            value={c.list}
            onChange={(e) => updateCondition(c.id, { list: e.target.value })}
          />
          <span className="text-[13px] text-muted tabular-nums" aria-live="polite">
            {n ? `${n.toLocaleString()} ${n === 1 ? "value" : "values"}` : ""}
          </span>
        </>
      )}
      {c.op === "between" && (
        <>
          <input
            className="token w-[11ch]"
            type="text"
            inputMode="decimal"
            placeholder={decimalComma ? "From (e.g. 21,5)" : "From"}
            aria-label="From"
            autoComplete="off"
            value={c.min}
            onChange={(e) => updateCondition(c.id, { min: e.target.value })}
            onKeyDown={onEnter}
          />
          <span>and</span>
          <input
            className="token w-[11ch]"
            type="text"
            inputMode="decimal"
            placeholder={decimalComma ? "To (e.g. 99,5)" : "To"}
            aria-label="To"
            autoComplete="off"
            value={c.max}
            onChange={(e) => updateCondition(c.id, { max: e.target.value })}
            onKeyDown={onEnter}
          />
        </>
      )}
      <button
        type="button"
        title="Remove condition"
        aria-label="Remove condition"
        onClick={() => removeCondition(c.id)}
        className="grid size-7 place-items-center rounded-token text-muted transition-colors hover:bg-tone-1 hover:text-ink"
      >
        <X size={14} />
      </button>
    </div>
  );
}

function MatchCount() {
  const result = useApp((s) => s.result);
  const rowCount = useApp((s) => s.rowCount);
  if (!result) return null;
  const sheets = Math.ceil(result.total / EXCEL_DATA_ROWS);
  const fit = result.phase !== "done" ? "so far" : result.total === 0 ? "" : sheets <= 1 ? "fits in one Excel sheet" : `${sheets.toLocaleString()} Excel sheets`;
  return (
    <span className="ml-auto text-[14px] text-muted tabular-nums">
      <b className="font-semibold text-ink">{result.total.toLocaleString()}</b> of {rowCount.toLocaleString()} rows
      {fit && ` · ${fit}`}
    </span>
  );
}

function SavedSelect({ saved }: { saved: { name: string; conditions: unknown[] }[] }) {
  return (
    <select
      id="filter-saved"
      aria-label="Saved filters"
      className={cn("select h-8 rounded-control bg-sheet pl-3 text-[14px] shadow-[0_0_0_1px_var(--hairline)]", saved.length === 0 && "text-muted")}
      disabled={saved.length === 0}
      value=""
      onChange={(e) => {
        const name = e.target.value;
        if (name === "__manage") set({ dialog: { kind: "saved" } });
        else if (name) applySavedSet(name);
      }}
    >
      <option value="">{saved.length ? "Saved filters…" : "No saved filters yet"}</option>
      {saved.map((s) => (
        <option key={s.name} value={s.name}>
          {`${s.name} (${s.conditions.length})`}
        </option>
      ))}
      {saved.length > 0 && <option value="__manage">Manage saved filters…</option>}
    </select>
  );
}

function SaveForm() {
  const [name, setName] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return (
    <form
      id="filter-save-form"
      className="mt-2 flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        saveCurrent(name);
      }}
    >
      <label htmlFor="filter-save-name" className="text-[14px] font-medium">
        Name
      </label>
      <input
        id="filter-save-name"
        ref={ref}
        type="text"
        name="filter-set-name"
        autoComplete="off"
        placeholder="e.g. Monthly large payments…"
        maxLength={80}
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="h-8 w-[260px] max-w-full rounded-control bg-sheet px-2.5 text-[14px] shadow-[0_0_0_1px_var(--hairline)] outline-none focus-visible:shadow-[0_0_0_2px_var(--cobalt)] focus-visible:outline-none placeholder:text-muted"
      />
      <Button type="submit" size="sm" variant="primary">
        Save
      </Button>
      <Button id="filter-save-cancel" size="sm" variant="quiet" onClick={() => set({ saveFormOpen: false })}>
        Cancel
      </Button>
    </form>
  );
}
