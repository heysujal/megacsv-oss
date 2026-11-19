// Runs a conversion in its own worker and returns the converted copy as a File.

import { Unsupported } from "../engine/session";
import type { ConvertMessage, ConvertPlan } from "./protocol";

export interface ConvertRun {
  done: Promise<File>;
  cancel(): void;
}

export function convert(file: File, plan: ConvertPlan, onProgress: (fraction: number, outBytes: number) => void): ConvertRun {
  const worker = new Worker(new URL("./convert.worker.ts", import.meta.url), { type: "module" });
  const done = new Promise<File>((resolve, reject) => {
    worker.onmessage = async (e: MessageEvent<ConvertMessage>) => {
      const m = e.data;
      if (m.kind === "progress") {
        onProgress(m.totalIn ? m.inBytes / m.totalIn : 0, m.outBytes);
        return;
      }
      worker.terminate();
      if (m.kind === "error") reject(new Unsupported(m.message));
      else {
        const root = await navigator.storage.getDirectory();
        const dir = await root.getDirectoryHandle(m.dir);
        resolve(await (await dir.getFileHandle(m.name)).getFile());
      }
    };
    worker.onerror = (e) => {
      worker.terminate();
      reject(new Error(e.message || "The conversion stopped."));
    };
  });
  worker.postMessage({ kind: "start", file, plan });
  return {
    done,
    cancel: () => worker.postMessage({ kind: "cancel" }),
  };
}
