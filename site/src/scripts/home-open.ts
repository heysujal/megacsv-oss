// Open a file straight from the homepage, so the visitor doesn't click "Open" twice.
// Chrome and Edge only: they hand us a file handle, which is saved with the app's recent
// files (IndexedDB "megacsv", store "recent", same shape as app/src/recent.ts) and opened
// by /app/?open=<id>. Other browsers keep the plain link to /app/.
// Nothing is read here; the app reads the file. Never uploaded.

const DB = "megacsv";
const STORE = "recent";

type PickerWindow = Window & { showOpenFilePicker?: () => Promise<FileSystemFileHandle[]> };
type HandleItem = DataTransferItem & { getAsFileSystemHandle?: () => Promise<FileSystemHandle | null> };

const w = window as PickerWindow;
const canHandOff = typeof w.showOpenFilePicker === "function";

function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Has /file-keeper.js hold the handle during the move to /app/, so Chrome keeps its read permission. */
async function keepHandle(handle: FileSystemFileHandle): Promise<void> {
  await navigator.serviceWorker.register("/file-keeper.js");
  const worker = (await navigator.serviceWorker.ready).active;
  await new Promise((resolve) => {
    const { port1, port2 } = new MessageChannel();
    port1.onmessage = resolve;
    worker?.postMessage(handle, [port2]);
  });
}

async function handOff(handle: FileSystemFileHandle): Promise<void> {
  // If this fails or stalls, the app asks for one click instead.
  await Promise.race([keepHandle(handle).catch(() => {}), new Promise((resolve) => setTimeout(resolve, 1500))]);
  const file = await handle.getFile();
  const id = `${file.name}|${file.size}`;
  const tx = (await db()).transaction(STORE, "readwrite");
  tx.objectStore(STORE).put({ id, name: file.name, size: file.size, openedAt: Date.now(), handle });
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  location.href = `/app/?open=${encodeURIComponent(id)}`;
}

function report(name: string): void {
  const g = window as Window & { gtag?: (...a: unknown[]) => void; clarity?: (...a: unknown[]) => void };
  g.gtag?.("event", name, { page: location.pathname });
  g.clarity?.("event", name);
}

// "Open a CSV file" buttons: the system file picker right here.
if (canHandOff) {
  document.querySelectorAll<HTMLAnchorElement>("a[data-open]").forEach((a) =>
    a.addEventListener("click", async (e) => {
      e.preventDefault();
      try {
        const [handle] = await w.showOpenFilePicker!();
        report("home_file_chosen");
        await handOff(handle);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        location.href = a.href; // anything unexpected: the app's own Open button
      }
    }),
  );
}

// Drop a file anywhere on the page.
const veil = document.querySelector<HTMLElement>(".dropveil");
const veilText = veil?.querySelector("p");
let depth = 0;
function show(on: boolean): void {
  if (veil) veil.hidden = !on;
  document.body.classList.toggle("dragging", on);
}
const hasFiles = (e: DragEvent) => !!e.dataTransfer?.types.includes("Files");

window.addEventListener("dragenter", (e) => {
  if (!hasFiles(e)) return;
  e.preventDefault();
  if (depth++ === 0) show(true);
});
window.addEventListener("dragleave", (e) => {
  if (!hasFiles(e)) return;
  if (--depth <= 0) {
    depth = 0;
    show(false);
  }
});
window.addEventListener("dragover", (e) => {
  if (hasFiles(e)) e.preventDefault();
});
window.addEventListener("drop", async (e) => {
  if (!hasFiles(e)) return;
  e.preventDefault(); // otherwise the browser tries to show the whole file in this tab
  depth = 0;
  const item = e.dataTransfer?.items[0] as HandleItem | undefined;
  // Must be asked for before any await, while the drop data is still readable.
  const pending = canHandOff ? item?.getAsFileSystemHandle?.() : undefined;
  const handle = await pending?.catch(() => null);
  if (handle?.kind === "file") {
    report("home_file_dropped");
    if (veilText) veilText.textContent = "Opening…";
    await handOff(handle as FileSystemFileHandle).catch(() => (location.href = "/app/"));
    return;
  }
  // Safari and Firefox can't pass a dropped file on to the next page.
  if (veilText) veilText.textContent = "Your browser can't pass a file between pages. Opening MegaCSV: drop the file there again.";
  setTimeout(() => (location.href = "/app/"), 2200);
});
export {};
