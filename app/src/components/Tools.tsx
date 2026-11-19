// The tool row: labelled icon buttons, Export pinned right. On narrow screens the
// labels go, and Summarize, Go to row and the rest move into a "More" menu.
import * as Menu from "@radix-ui/react-dropdown-menu";
import { ArrowLineDown, ArrowsDownUp, ChartBarHorizontal, ChatCircleText, CircleHalf, Cookie, DotsThree, DownloadSimple, FolderOpen, Funnel } from "@phosphor-icons/react";
import { type ComponentProps, type ReactNode, useEffect, useRef, useState } from "react";
import { focusGrid, goToRow, openExport, openFeedback, openPicker, openSort, openSummary, toggleFilters } from "../app/controller";
import { hasFile, set, useApp } from "../app/store";
import { toggleTheme } from "./AppBar";
import { cn } from "./ui/cn";

function Tool({ icon, label, active, className, ...props }: ComponentProps<"button"> & { icon: ReactNode; label: ReactNode; active?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "flex min-w-[44px] shrink-0 flex-col items-center justify-center gap-1 rounded-control px-2.5 py-1.5 text-[12px] leading-none font-medium text-ink transition-[background-color,transform] duration-[120ms] ease-out-quint select-none hover:bg-tone-1 active:scale-[0.96] md:min-w-[68px] md:px-3",
        active && "bg-tone-1 text-cobalt",
        className,
      )}
      {...props}
    >
      {icon}
      <span className="hidden md:block">{label}</span>
    </button>
  );
}

export function Tools({ picker }: { picker: () => HTMLInputElement | null }) {
  const fileOpen = useApp(hasFile);
  const appliedCount = useApp((s) => s.appliedCount);
  const gotoOpen = useApp((s) => s.gotoOpen);
  const sorted = useApp((s) => !!s.sort);
  const [goto, setGoto] = useState("");
  const narrowGoto = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (gotoOpen) narrowGoto.current?.focus();
  }, [gotoOpen]);
  // A new file starts with an empty box.
  const fileInfo = useApp((s) => s.fileInfo);
  useEffect(() => setGoto(""), [fileInfo]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    void goToRow(goto);
  };

  return (
    <>
      <div id="tools" className="flex shrink-0 items-stretch gap-0.5 px-2 pt-0.5 pb-2" hidden={!fileOpen}>
        <Tool id="open-btn" icon={<FolderOpen size={20} />} label="Open" aria-label="Open a file" onClick={() => void openPicker(picker())} />
        <Tool
          id="filter-btn"
          icon={<Funnel size={20} weight={appliedCount ? "fill" : "regular"} />}
          label={appliedCount ? `Filter (${appliedCount})` : "Filter"}
          aria-label={appliedCount ? `Filter, ${appliedCount} applied` : "Filter"}
          active={appliedCount > 0}
          onClick={toggleFilters}
        />
        <Tool
          id="sort-btn"
          icon={<ArrowsDownUp size={20} weight={sorted ? "bold" : "regular"} />}
          label="Sort"
          aria-label={sorted ? "Sort (on)" : "Sort"}
          active={sorted}
          onClick={openSort}
        />
        <Tool id="summary-btn" className="hidden sm:flex" icon={<ChartBarHorizontal size={20} />} label="Summarize" aria-label="Summarize" onClick={openSummary} />
        <span className="mx-2 my-1.5 hidden w-px bg-hairline sm:block" aria-hidden="true" />
        <form id="goto" className="hidden items-center gap-2 self-center sm:flex" onSubmit={submit}>
          <label htmlFor="goto-row" className="flex items-center gap-1.5 text-[12px] font-medium whitespace-nowrap">
            <ArrowLineDown size={18} aria-hidden="true" />
            Go to row
          </label>
          <input
            id="goto-row"
            name="goto-row"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="e.g. 5000000"
            value={goto}
            onChange={(e) => setGoto(e.target.value)}
            className="h-8 w-[120px] rounded-control bg-sheet px-2.5 text-[14px] tabular-nums shadow-[0_0_0_1px_var(--hairline)] outline-none focus-visible:shadow-[0_0_0_2px_var(--cobalt)] focus-visible:outline-none placeholder:text-muted"
          />
        </form>
        <span className="flex-1" />
        <Menu.Root>
          <Menu.Trigger asChild>
            <button
              type="button"
              aria-label="More"
              className="flex min-w-[44px] items-center justify-center rounded-control text-ink transition-colors hover:bg-tone-1 sm:hidden"
            >
              <DotsThree size={24} weight="bold" />
            </button>
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Content
              align="end"
              sideOffset={6}
              className="z-50 min-w-[220px] rounded-panel bg-sheet p-1.5 text-[15px] text-ink shadow-float data-[state=open]:animate-[fade-in_150ms]"
            >
              <MenuItem icon={<ChartBarHorizontal size={18} />} onSelect={openSummary}>
                Summarize
              </MenuItem>
              <MenuItem icon={<ArrowLineDown size={18} />} onSelect={() => set({ gotoOpen: true })}>
                Go to row
              </MenuItem>
              <Menu.Separator className="mx-2 my-1 h-px bg-hairline" />
              <MenuItem icon={<ChatCircleText size={18} />} onSelect={openFeedback}>
                Feedback
              </MenuItem>
              <MenuItem icon={<CircleHalf size={18} />} onSelect={toggleTheme}>
                Light or dark
              </MenuItem>
              <MenuItem icon={<Cookie size={18} />} onSelect={() => (window as { megacsvConsent?: { open(): void } }).megacsvConsent?.open() ?? location.assign("/privacy#cookies")}>
                Cookie settings
              </MenuItem>
            </Menu.Content>
          </Menu.Portal>
        </Menu.Root>
        <button
          id="export-btn"
          type="button"
          onClick={openExport}
          className="flex shrink-0 items-center justify-center gap-2 rounded-control bg-cobalt px-4 text-[14px] font-medium text-on-cobalt transition-[transform,background-color] duration-[160ms] ease-out-quint select-none hover:bg-[color-mix(in_oklab,var(--cobalt)_90%,var(--ink))] active:scale-[0.96] md:flex-col md:gap-1 md:text-[12px] md:leading-none"
        >
          <DownloadSimple size={20} />
          <span>Export</span>
        </button>
      </div>
      {fileOpen && gotoOpen && (
        <form
          className="flex items-center gap-2 px-3 pb-2 sm:hidden"
          onSubmit={(e) => {
            e.preventDefault();
            void goToRow(narrowGoto.current?.value ?? "");
            set({ gotoOpen: false });
            focusGrid();
          }}
        >
          <label htmlFor="goto-row-narrow" className="text-[14px] font-medium whitespace-nowrap">
            Go to row
          </label>
          <input
            id="goto-row-narrow"
            name="goto-row"
            ref={narrowGoto}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="e.g. 5000000"
            enterKeyHint="go"
            className="h-9 min-w-0 flex-1 rounded-control bg-sheet px-3 text-[15px] tabular-nums shadow-[0_0_0_1px_var(--hairline)] outline-none focus-visible:shadow-[0_0_0_2px_var(--cobalt)] focus-visible:outline-none"
          />
          <button type="submit" className="h-9 rounded-control bg-tone-2 px-3 text-[14px] font-medium">
            Go
          </button>
          <button type="button" className="h-9 rounded-control px-2 text-[14px] text-muted" onClick={() => set({ gotoOpen: false })}>
            Cancel
          </button>
        </form>
      )}
    </>
  );
}

function MenuItem({ icon, children, onSelect }: { icon: ReactNode; children: ReactNode; onSelect: () => void }) {
  return (
    <Menu.Item
      onSelect={onSelect}
      className="flex h-10 cursor-pointer items-center gap-3 rounded-control px-3 outline-none select-none data-[highlighted]:bg-tone-1"
    >
      <span className="text-muted">{icon}</span>
      {children}
    </Menu.Item>
  );
}
