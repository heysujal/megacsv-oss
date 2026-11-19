import { ArrowDown, ArrowUp, MagnifyingGlass, X } from "@phosphor-icons/react";
import { useEffect, useRef } from "react";
import { applyFind, closeFind, jumpMatch } from "../app/controller";
import { set, useApp } from "../app/store";
import { track } from "../analytics";
import { Check } from "./ui/field";

const iconBtn = "grid size-8 place-items-center rounded-control text-ink transition-colors hover:bg-tone-1";

export function FindBar() {
  const open = useApp((s) => s.findOpen);
  const text = useApp((s) => s.findText);
  const matchCase = useApp((s) => s.matchCase);
  const only = useApp((s) => s.onlyMatching);
  const count = useApp((s) => s.findCount);
  const phase = useApp((s) => s.findPhase);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const focus = () =>
      requestAnimationFrame(() => {
        if (document.activeElement !== input.current) input.current?.select();
        input.current?.focus();
      });
    window.addEventListener("megacsv-focus-find", focus);
    return () => window.removeEventListener("megacsv-focus-find", focus);
  }, []);

  // Ticking a box re-runs the search when there's text.
  const toggle = (patch: { matchCase?: boolean; onlyMatching?: boolean }) => {
    set(patch);
    if (useApp.getState().findText) applyFind();
  };

  return (
    <div id="findbar" className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 px-3 pb-2" hidden={!open}>
      <label className="flex h-9 min-w-0 flex-[1_1_260px] items-center gap-2 rounded-control bg-sheet px-2.5 shadow-[0_0_0_1px_var(--hairline)] focus-within:shadow-[0_0_0_2px_var(--cobalt)] sm:max-w-[420px]">
        <MagnifyingGlass size={18} aria-hidden="true" />
        <input
          id="find-input"
          name="find"
          ref={input}
          type="search"
          placeholder="Find in the whole file"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
          aria-label="Find in the whole file"
          value={text}
          onChange={(e) => set({ findText: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (!applyFind()) void jumpMatch(e.shiftKey ? -1 : 1);
            } else if (e.key === "Escape") {
              e.preventDefault();
              closeFind();
            }
          }}
          className="h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none focus-visible:outline-none [&::-webkit-search-cancel-button]:hidden"
        />
      </label>
      <Check id="find-case" type="checkbox" checked={matchCase} onChange={(e) => toggle({ matchCase: e.target.checked })}>
        Match case
      </Check>
      <Check id="find-only" type="checkbox" checked={only} onChange={(e) => toggle({ onlyMatching: e.target.checked })}>
        Show only matching rows
      </Check>
      <span id="find-count" className="text-[14px] text-cobalt tabular-nums" aria-live="polite" data-state={phase}>
        {count}
      </span>
      <span className="flex flex-1 justify-end gap-1">
        <button id="find-prev" type="button" className={iconBtn} title="Previous match (Shift+Enter)" aria-label="Previous match" onClick={() => applyFind() || void jumpMatch(-1)}>
          <ArrowUp size={18} />
        </button>
        <button id="find-next" type="button" className={iconBtn} title="Next match (Enter)" aria-label="Next match" onClick={() => applyFind() || void jumpMatch(1)}>
          <ArrowDown size={18} />
        </button>
        <button
          id="find-close"
          type="button"
          className={iconBtn}
          title="Close (Esc)"
          aria-label="Close find"
          onClick={() => {
            track("find_close");
            closeFind();
          }}
        >
          <X size={18} />
        </button>
      </span>
    </div>
  );
}
