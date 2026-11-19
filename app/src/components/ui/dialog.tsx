// A modal on the native <dialog> element: focus trap, Esc and the top layer come
// from the browser. Full screen on phones (style.css).
import { type ReactNode, useEffect, useRef } from "react";
import { X } from "@phosphor-icons/react";
import { cn } from "./cn";

interface Props {
  id: string;
  /** The dialog's stage, as `data-state`, for tests and browser agents. */
  state?: string;
  open: boolean;
  title: ReactNode;
  titleId?: string;
  onClose: () => void;
  /** Esc: return false to keep the dialog open (e.g. to cancel a running export instead). */
  onCancel?: () => boolean;
  wide?: boolean;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function Dialog({ id, state, open, title, titleId = `${id}-title`, onClose, onCancel, wide, children, footer, className }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      id={id}
      data-state={state}
      aria-labelledby={titleId}
      className={cn("app-dialog flex-col", wide ? "w-[min(760px,calc(100vw-32px))]" : "w-[min(520px,calc(100vw-32px))]", open && "flex", className)}
      onCancel={(e) => {
        if (onCancel && !onCancel()) {
          e.preventDefault();
          return;
        }
        e.preventDefault();
        onClose();
      }}
      onClose={() => open && onClose()}
    >
      <header className="flex items-center gap-3 px-6 pt-5 pb-3">
        <h2 id={titleId} className="min-w-0 flex-1 truncate text-[20px] font-medium tracking-[-0.015em]">
          {title}
        </h2>
        <button
          type="button"
          aria-label="Close"
          className="-mr-2 grid size-9 place-items-center rounded-control text-muted transition-colors hover:bg-tone-1 hover:text-ink"
          onClick={() => (onCancel ? onCancel() && onClose() : onClose())}
        >
          <X size={18} />
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-2">{children}</div>
      {footer && <footer className="flex flex-wrap items-center gap-2 px-6 pt-3 pb-5">{footer}</footer>}
    </dialog>
  );
}
