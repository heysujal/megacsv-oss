// Manage saved filter sets: see what each one does, delete the ones no longer needed.
import { Trash } from "@phosphor-icons/react";
import { useState } from "react";
import { closeDialog, deleteSaved } from "../../app/controller";
import { OPS } from "../../app/filters";
import { useApp } from "../../app/store";
import { Button } from "../ui/button";
import { Dialog } from "../ui/dialog";

const OP_NAME = Object.fromEntries(OPS) as Record<string, string>;

export function SavedDialog() {
  const open = useApp((s) => s.dialog?.kind === "saved");
  const saved = useApp((s) => s.saved);
  // Deleting takes a second click on the same row.
  const [confirm, setConfirm] = useState("");
  return (
    <Dialog
      id="saved-dialog"
      open={open}
      onClose={closeDialog}
      title="Saved filters"
      footer={
        <>
          <span className="flex-1 text-[13px] text-muted">Kept in this browser only.</span>
          <Button variant="primary" onClick={closeDialog}>
            Done
          </Button>
        </>
      }
    >
      {saved.length === 0 ? (
        <p className="py-6 text-center text-muted">No saved filters.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-hairline">
          {saved.map((s) => (
            <li key={s.name} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{s.name}</p>
                <p className="truncate text-[13px] text-muted">
                  {s.conditions.map((c) => `${c.column || "a column"} ${OP_NAME[c.op] ?? c.op}${c.op === "oneOf" ? ` ${c.value.split("\n").length} values` : c.value ? ` ${c.value}` : ""}`).join(" and ")}
                </p>
              </div>
              {confirm === s.name ? (
                <>
                  <Button variant="quiet" size="sm" onClick={() => setConfirm("")}>
                    Keep
                  </Button>
                  <Button variant="primary" size="sm" aria-label={`Delete ${s.name} for good`} onClick={() => (deleteSaved(s.name), setConfirm(""))}>
                    Delete for good
                  </Button>
                </>
              ) : (
                <Button variant="quiet" size="sm" aria-label={`Delete ${s.name}`} onClick={() => setConfirm(s.name)}>
                  <Trash size={16} aria-hidden="true" />
                  Delete
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  );
}
