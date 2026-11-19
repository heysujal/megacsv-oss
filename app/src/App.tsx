import { useEffect, useRef } from "react";
import { openFile, startPage } from "./app/controller";
import { AppBar } from "./components/AppBar";
import { DropVeil, NoticeBar, StartScreen, StatusLine } from "./components/Chrome";
import { FilterSentence } from "./components/FilterSentence";
import { FindBar } from "./components/FindBar";
import { Tools } from "./components/Tools";
import { Workspace } from "./components/Workspace";
import { CellDialog } from "./components/dialogs/CellDialog";
import { ExportDialog } from "./components/dialogs/ExportDialog";
import { FeedbackDialog } from "./components/dialogs/FeedbackDialog";
import { SavedDialog } from "./components/dialogs/SavedDialog";
import { SortDialog } from "./components/dialogs/SortDialog";
import { SummaryDialog } from "./components/dialogs/SummaryDialog";

export function App() {
  const picker = useRef<HTMLInputElement>(null);
  const getPicker = () => picker.current;
  useEffect(() => startPage(), []);
  // A native listener rather than React's onChange: it also hears "change" events that don't
  // bubble, as scripts and browser agents send when they set the file (e2e/huge.mjs does).
  useEffect(() => {
    const input = picker.current;
    if (!input) return;
    const onChange = () => {
      const file = input.files?.[0];
      if (file) void openFile(file, "file_input");
      input.value = "";
    };
    input.addEventListener("change", onChange);
    return () => input.removeEventListener("change", onChange);
  }, []);

  return (
    <div className="flex h-full flex-col pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)]">
      <input
        id="picker"
        ref={picker}
        type="file"
        accept=".csv,.tsv,.txt,.gz,.zip,text/csv"
        hidden
      />
      <AppBar />
      <Tools picker={getPicker} />
      <FindBar />
      <FilterSentence />
      <NoticeBar />
      <StartScreen picker={getPicker} />
      <Workspace />
      <StatusLine />
      <DropVeil />
      <ExportDialog />
      <SummaryDialog />
      <FeedbackDialog />
      <CellDialog />
      <SavedDialog />
      <SortDialog />
    </div>
  );
}
