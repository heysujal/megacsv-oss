// Sort: by one column, smallest to largest (A to Z) or the other way. Sorts what
// the active sheet shows (the filter's rows, or all rows); the result opens as its own sheet tab.
import { useEffect, useState } from "react";
import { applySort, clearSort, closeDialog } from "../../app/controller";
import { useApp } from "../../app/store";
import { Button } from "../ui/button";
import { Dialog } from "../ui/dialog";
import { Field, Select } from "../ui/field";

export function SortDialog() {
  const open = useApp((s) => s.dialog?.kind === "sort");
  const columns = useApp((s) => s.columns);
  const sort = useApp((s) => s.sort);
  const tab = useApp((s) => s.activeTab);
  const result = useApp((s) => s.result);
  const rowCount = useApp((s) => s.rowCount);
  const [col, setCol] = useState("0");
  const [order, setOrder] = useState("asc");

  useEffect(() => {
    if (!open) return;
    if (sort) {
      setCol(String(sort.col));
      setOrder(sort.descending ? "desc" : "asc");
    }
  }, [open, sort]);

  const filtered = tab !== "all" && !!result;
  const what = filtered ? `the ${result.total.toLocaleString()} matching rows` : `all ${rowCount.toLocaleString()} rows`;

  return (
    <Dialog
      id="sort-dialog"
      open={open}
      onClose={closeDialog}
      title="Sort"
      footer={
        <>
          {sort && (
            <Button
              id="sort-clear"
              variant="quiet"
              onClick={() => {
                clearSort();
                closeDialog();
              }}
            >
              Remove sort
            </Button>
          )}
          <span className="flex-1" />
          <Button onClick={closeDialog}>Cancel</Button>
          <Button
            id="sort-go"
            variant="primary"
            onClick={() => {
              applySort(Number(col), order === "desc");
              closeDialog();
            }}
          >
            Sort
          </Button>
        </>
      }
    >
      <p className="mb-4 text-[14px] text-muted">Sorts {what}. The sorted rows open as their own sheet tab; the file isn't changed.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Sort by">
          <Select id="sort-col" value={col} onChange={(e) => setCol(e.target.value)} className="font-normal">
            {columns.map((name, i) => (
              <option key={i} value={i}>
                {name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Order">
          <Select id="sort-order" value={order} onChange={(e) => setOrder(e.target.value)} className="font-normal">
            <option value="asc">Smallest to largest (A to Z)</option>
            <option value="desc">Largest to smallest (Z to A)</option>
          </Select>
        </Field>
      </div>
      <p className="mt-4 text-[13px] text-muted">Numbers come first, then text (ignoring capitals); empty cells always go last. Rows with the same value keep their file order.</p>
    </Dialog>
  );
}
