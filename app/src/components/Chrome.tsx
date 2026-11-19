// Status line, notices, the start screen (drop, open, sample, recent files) and the drop veil.
import { FileCsv, FolderOpen, LockSimple, Sparkle, X } from "@phosphor-icons/react";
import { dismissNotice, openPicker, openRecent, openSample, removeRecent } from "../app/controller";
import { formatBytes } from "../app/format";
import { hasFile, useApp } from "../app/store";
import { Button } from "./ui/button";

export function StatusLine() {
  const status = useApp((s) => s.status);
  const format = useApp((s) => s.format);
  const progress = useApp((s) => s.progress);
  const filePhase = useApp((s) => s.filePhase);
  const activeTab = useApp((s) => s.activeTab);
  const filter = useApp((s) => s.result?.phase ?? "none");
  const sort = useApp((s) => (s.sort ? (s.sort.done ? "done" : "running") : "none"));
  return (
    <footer className="relative flex min-h-8 shrink-0 flex-wrap items-center gap-x-5 gap-y-0.5 px-4 pt-1.5 pb-[max(6px,env(safe-area-inset-bottom))] text-[12px] font-medium text-muted tabular-nums">
      <div id="progress" className="absolute inset-x-0 top-0 h-[2px] overflow-hidden" hidden={progress === null} aria-hidden="true">
        <div id="progress-fill" className="h-full bg-cobalt transition-[width] duration-200 ease-out" style={{ width: `${((progress ?? 0) * 100).toFixed(1)}%` }} />
      </div>
      <span id="status" role="status" className="min-w-0" data-file={filePhase} data-sheet={activeTab} data-filter={filter} data-sort={sort}>
        {status}
      </span>
      <span id="format">{format}</span>
      <span className="flex-1" />
      <span className="hidden items-center gap-1.5 sm:flex">
        <LockSimple size={13} aria-hidden="true" />
        Your file is never uploaded
      </span>
    </footer>
  );
}

export function NoticeBar() {
  const notice = useApp((s) => s.notice);
  return (
    <div
      id="notice"
      role="alert"
      className="mx-2 mb-2 flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 rounded-panel bg-tone-1 px-4 py-2.5 text-[14px] sm:mx-3"
      hidden={!notice}
    >
      <span className="min-w-0 flex-1">{notice?.text}</span>
      {notice?.action && (
        <Button size="sm" variant="secondary" onClick={notice.action.run}>
          {notice.action.label}
        </Button>
      )}
      <button type="button" aria-label="Dismiss" className="grid size-7 place-items-center rounded-token text-muted hover:bg-tone-2 hover:text-ink" onClick={dismissNotice}>
        <X size={14} />
      </button>
    </div>
  );
}

export function StartScreen({ picker }: { picker: () => HTMLInputElement | null }) {
  const fileOpen = useApp(hasFile);
  const recent = useApp((s) => s.recent);
  const opening = useApp((s) => s.filePhase === "opening");
  if (fileOpen) return null;
  return (
    <div id="drop" className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-6 pt-[12vh] pb-10 text-center">
      <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width={56} height={56} className="mb-6" />
      <h1 className="max-w-[16ch] text-[clamp(32px,4.4vw,52px)] leading-[1.04] font-medium tracking-[-0.035em] text-balance">
        {opening ? "Opening your file…" : "Open a CSV file of any size"}
      </h1>
      <p className="mt-4 max-w-[46ch] text-[17px] leading-[1.55] text-muted text-pretty">
        Drop it anywhere on this page, or choose it. Even files Excel can't open. Your file is never uploaded.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-2.5">
        <Button variant="primary" onClick={() => void openPicker(picker())} disabled={opening}>
          <FolderOpen size={18} />
          Open a CSV file
        </Button>
        <Button id="sample-btn" variant="secondary" onClick={openSample} disabled={opening}>
          <Sparkle size={18} />
          Try a sample file
        </Button>
      </div>
      <p className="mt-3 text-[13px] text-muted">CSV, TSV, TXT, also .gz and .zip</p>
      <div id="recent" className="mt-14 w-full max-w-[520px] text-left" hidden={recent.length === 0}>
        <h2 className="mb-2 px-3 text-[12px] font-medium text-muted">Recent files</h2>
        <ul id="recent-list" className="flex flex-col">
          {recent.map((r) => (
            <li key={r.id} className="group flex items-center rounded-control transition-colors hover:bg-tone-1">
              <button type="button" className="open flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left" onClick={() => void openRecent(r)}>
                <FileCsv size={20} className="shrink-0 text-muted" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate">{r.name}</span>
                <span className="shrink-0 text-[13px] text-muted tabular-nums">{formatBytes(r.size)}</span>
              </button>
              <button
                type="button"
                title="Remove from recent files"
                aria-label={`Remove ${r.name} from recent files`}
                className="mr-1.5 grid size-8 place-items-center rounded-control text-muted opacity-60 transition-opacity group-hover:opacity-100 hover:bg-tone-2 hover:text-ink focus-visible:opacity-100"
                onClick={() => removeRecent(r)}
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function DropVeil() {
  const dragging = useApp((s) => s.dragging);
  if (!dragging) return null;
  return (
    <div className="pointer-events-none fixed inset-2 z-40 grid place-items-center rounded-window bg-[color-mix(in_oklab,var(--ground)_85%,transparent)] shadow-[inset_0_0_0_2px_var(--cobalt)] animate-[fade-in_120ms]">
      <p className="text-[22px] font-medium text-cobalt">Drop to open</p>
    </div>
  );
}
