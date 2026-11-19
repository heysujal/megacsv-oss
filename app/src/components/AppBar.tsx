import { CaretLeft, ChatCircleText, CircleHalf, MagnifyingGlass } from "@phosphor-icons/react";
import { openFeedback, openFind } from "../app/controller";
import { hasFile, useApp } from "../app/store";
import { Button } from "./ui/button";

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

export function toggleTheme(): void {
  const root = document.documentElement;
  const dark = root.classList.contains("dark") || (!root.classList.contains("light") && matchMedia("(prefers-color-scheme: dark)").matches);
  const next = dark ? "light" : "dark";
  root.classList.remove("light", "dark");
  root.classList.add(next);
  localStorage.setItem("megacsv-theme", next);
}

export function AppBar() {
  const fileOpen = useApp(hasFile);
  const fileInfo = useApp((s) => s.fileInfo);
  const rowCount = useApp((s) => s.rowCount);
  const complete = useApp((s) => s.filePhase === "ready");
  const cut = fileInfo.lastIndexOf(" · ");
  const name = cut > 0 ? fileInfo.slice(0, cut) : fileInfo;
  const rest = cut > 0 ? fileInfo.slice(cut) : "";

  return (
    <header className="flex h-[52px] shrink-0 items-center gap-2 px-2 sm:gap-3 sm:px-3">
      {fileInfo && <h1 className="sr-only">{fileInfo}</h1>}
      {fileInfo ? (
        <a
          href="/"
          aria-label="MegaCSV home"
          className="grid size-9 shrink-0 place-items-center rounded-control bg-tone-1 text-ink transition-colors hover:bg-tone-2"
        >
          <CaretLeft size={18} />
        </a>
      ) : (
        <a href="/" className="flex shrink-0 items-center gap-2 rounded-control px-1.5 py-1 font-semibold">
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width={26} height={26} />
          <span translate="no">MegaCSV</span>
        </a>
      )}
      <p className="flex min-w-0 flex-1 items-baseline gap-0 tabular-nums" title={fileInfo || undefined}>
        <span id="file-info" className="min-w-0 truncate" translate="no">
          <span className="font-semibold">{name}</span>
          <span className="text-muted">{rest}</span>
        </span>
        {fileOpen && rowCount > 0 && (
          <span className="hidden shrink-0 whitespace-pre text-muted md:inline">
            {" · "}
            {rowCount.toLocaleString()} rows{complete ? "" : " so far"}
          </span>
        )}
      </p>
      {fileOpen && (
        <button
          id="find-btn"
          type="button"
          onClick={openFind}
          title={`Find (${isMac ? "⌘" : "Ctrl"} F)`}
          aria-label="Find in the whole file"
          className="flex h-9 shrink-0 items-center gap-2 rounded-control bg-sheet px-2.5 text-muted shadow-[0_0_0_1px_var(--hairline)] transition-colors hover:text-ink md:w-[300px]"
        >
          <MagnifyingGlass size={18} className="text-ink" />
          <span className="hidden flex-1 text-left md:inline">Find in the whole file</span>
          <kbd className="hidden font-sans text-[12px] md:inline">{isMac ? "⌘F" : "Ctrl F"}</kbd>
        </button>
      )}
      <Button id="feedback-btn" variant="quiet" size="sm" className="hidden px-2.5 sm:inline-flex" onClick={openFeedback}>
        <ChatCircleText size={18} />
        <span className="hidden lg:inline">Feedback</span>
      </Button>
      <Button variant="quiet" size="icon" aria-label="Switch between light and dark" title="Light or dark" onClick={toggleTheme}>
        <CircleHalf size={20} />
      </Button>
    </header>
  );
}
