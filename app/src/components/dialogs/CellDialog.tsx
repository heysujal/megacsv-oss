// The cell viewer: full value of one cell, with its length and line count.
// The value is written to the textarea directly, never into React state (rule 3).
import { useEffect, useRef, useState } from "react";
import { sinks } from "../../app/controller";
import { Button } from "../ui/button";
import { Dialog } from "../ui/dialog";

export function CellDialog() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("Cell");
  const [where, setWhere] = useState("");
  const [meta, setMeta] = useState("");
  const [copied, setCopied] = useState(false);
  const value = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    sinks.inspect = ({ label, header, value: v }) => {
      setTitle(header);
      setWhere(`Row ${label.toLocaleString()}`);
      const lines = v.split("\n").length;
      setMeta(`${v.length.toLocaleString()} characters${lines > 1 ? ` · ${lines.toLocaleString()} lines` : ""}`);
      setCopied(false);
      if (value.current) {
        value.current.value = v;
        value.current.scrollTop = 0;
      }
      setOpen(true);
    };
    return () => {
      sinks.inspect = () => {};
    };
  }, []);

  const close = () => {
    setOpen(false);
    (document.querySelector("#grid-host canvas") as HTMLElement | null)?.focus();
  };

  return (
    <Dialog
      id="cell-dialog"
      titleId="cell-title"
      open={open}
      onClose={close}
      wide
      title={title}
      footer={
        <>
          <span id="cell-meta" className="flex-1 text-[13px] text-muted tabular-nums">
            {meta}
          </span>
          <Button
            id="cell-copy"
            onClick={() =>
              void navigator.clipboard.writeText(value.current?.value ?? "").then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              })
            }
          >
            {copied ? "Copied" : "Copy value"}
          </Button>
          <Button id="cell-close" variant="primary" onClick={close}>
            Close
          </Button>
        </>
      }
    >
      <p id="cell-where" className="mb-2 text-[13px] text-muted tabular-nums">
        {where}
      </p>
      <textarea
        id="cell-value"
        ref={value}
        rows={10}
        readOnly
        spellCheck={false}
        aria-labelledby="cell-title"
        className="block min-h-40 w-full resize-y rounded-control bg-ground p-3 text-[14px] leading-normal outline-none focus-visible:shadow-[0_0_0_2px_var(--cobalt)] focus-visible:outline-none"
      />
    </Dialog>
  );
}
