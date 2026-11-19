// The browser's private storage (OPFS): never visible to the user, never uploaded.

/** A directory by path ("sorts/abc"), created if asked. */
export async function storageDir(path: string, create: boolean): Promise<FileSystemDirectoryHandle> {
  let dir = await navigator.storage.getDirectory();
  for (const part of path.split("/").filter(Boolean)) dir = await dir.getDirectoryHandle(part, { create });
  return dir;
}

/** Removes a directory and everything in it; quietly does nothing if it's gone. */
export async function removeDir(path: string): Promise<void> {
  const parts = path.split("/").filter(Boolean);
  const name = parts.pop();
  if (!name) return;
  try {
    const parent = await storageDir(parts.join("/"), false);
    await parent.removeEntry(name, { recursive: true });
  } catch {
    // Already gone, or still in use by a worker that's stopping; the next start cleans it up.
  }
}
