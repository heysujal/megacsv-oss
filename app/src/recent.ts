// Recently opened files (Chrome and Edge, which can keep a file handle).
// Only the handle, name and size are stored; never file contents.

export interface RecentFile {
  id: string;
  name: string;
  size: number;
  openedAt: number;
  handle: FileSystemFileHandle;
}

const DB = "megacsv";
const STORE = "recent";
const KEEP = 8;

type PermissionHandle = FileSystemFileHandle & {
  queryPermission(o: { mode: "read" }): Promise<PermissionState>;
  requestPermission(o: { mode: "read" }): Promise<PermissionState>;
};

function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function listRecent(): Promise<RecentFile[]> {
  try {
    const store = (await db()).transaction(STORE).objectStore(STORE);
    const all = await new Promise<RecentFile[]>((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result as RecentFile[]);
      req.onerror = () => reject(req.error);
    });
    return all.sort((a, b) => b.openedAt - a.openedAt);
  } catch {
    return [];
  }
}

export async function rememberFile(handle: FileSystemFileHandle, file: File): Promise<void> {
  try {
    const entry: RecentFile = { id: `${file.name}|${file.size}`, name: file.name, size: file.size, openedAt: Date.now(), handle };
    const recent = (await listRecent()).filter((r) => r.id !== entry.id);
    const tx = (await db()).transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    store.put(entry);
    for (const old of recent.slice(KEEP - 1)) store.delete(old.id);
    await done(tx);
  } catch (err) {
    console.warn("Couldn't save recent file", err);
  }
}

export async function forgetFile(id: string): Promise<void> {
  const tx = (await db()).transaction(STORE, "readwrite");
  tx.objectStore(STORE).delete(id);
  await done(tx);
}

/**
 * Asks for read access again if needed (must run in a click handler), then opens the file.
 * `beforeAsk` runs just before the browser's prompt; "denied" means the person said no.
 */
export async function reopen(entry: RecentFile, beforeAsk?: () => void): Promise<File | "denied"> {
  const h = entry.handle as PermissionHandle;
  let perm = await h.queryPermission({ mode: "read" });
  if (perm !== "granted") {
    beforeAsk?.();
    perm = await h.requestPermission({ mode: "read" });
  }
  if (perm !== "granted") return "denied";
  return h.getFile();
}
