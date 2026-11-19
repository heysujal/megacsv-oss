// Usage events for Google Analytics and Microsoft Clarity. Their tags are only
// on the page in production builds (see vite.config.ts); elsewhere every call
// here does nothing. Never call from hot loops.

import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from "web-vitals";

export type Params = Record<string, string | number | boolean>;

type AnalyticsWindow = Window & {
  gtag?: (...args: unknown[]) => void;
  clarity?: (...args: unknown[]) => void;
};

const w = window as AnalyticsWindow;

export function track(event: string, params: Params = {}): void {
  w.gtag?.("event", event, params);
  w.clarity?.("event", event);
}

/** A Clarity tag, so recordings can be filtered by it (e.g. file size). */
export function tag(key: string, value: string | number): void {
  w.clarity?.("set", key, String(value));
}

export function sizeBucket(bytes: number): string {
  const mb = bytes / 1e6;
  if (mb < 10) return "under 10 MB";
  if (mb < 100) return "10-100 MB";
  if (mb < 1000) return "100 MB-1 GB";
  if (mb < 5000) return "1-5 GB";
  if (mb < 20000) return "5-20 GB";
  return "20 GB+";
}

export function countBucket(n: number): string {
  if (n === 0) return "0";
  if (n < 100) return "1-99";
  if (n < 10_000) return "100-9,999";
  if (n < 1_000_000) return "10,000-999,999";
  return "1,000,000+";
}

/** Size details sent with every file event. */
export function fileParams(file: File): { file_bytes: number; file_mb: number; size_bucket: string; extension: string } {
  return {
    file_bytes: file.size,
    file_mb: Math.round(file.size / 1e5) / 10,
    size_bucket: sizeBucket(file.size),
    extension: /\.([^.]+)$/.exec(file.name)?.[1]?.toLowerCase() ?? "none",
  };
}

const seconds = (ms: number) => Math.round(ms / 100) / 10;
export const since = (t0: number) => seconds(performance.now() - t0);

type Nav = Navigator & { deviceMemory?: number };

/** Device facts, errors and page-speed scores. Call once at startup. */
export function startAnalytics(appVersion: string): void {
  const nav = navigator as Nav;
  const device: Params = {
    app_version: appVersion,
    memory_gb: nav.deviceMemory ?? 0,
    cpu_cores: nav.hardwareConcurrency ?? 0,
    screen: `${screen.width}x${screen.height}`,
    pixel_ratio: window.devicePixelRatio,
    language: navigator.language,
    installed: window.matchMedia("(display-mode: standalone)").matches,
    save_picker: "showSaveFilePicker" in window,
    folder_picker: "showDirectoryPicker" in window,
    touch: navigator.maxTouchPoints > 0,
    color_scheme: window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
  };
  track("device", device);
  tag("memory_gb", device.memory_gb as number);
  tag("cpu_cores", device.cpu_cores as number);
  tag("app_version", appVersion);

  window.addEventListener("error", (e) => {
    track("app_error", { message: String(e.message).slice(0, 100), where: `${e.filename}:${e.lineno}`.slice(-100) });
  });
  window.addEventListener("unhandledrejection", (e) => {
    const r: unknown = e.reason;
    track("app_error", { message: (r instanceof Error ? r.message : String(r)).slice(0, 100), where: "promise" });
  });

  const vital = (m: Metric) =>
    track("web_vital", { metric: m.name, value: Math.round(m.name === "CLS" ? m.value * 1000 : m.value), rating: m.rating });
  onCLS(vital);
  onFCP(vital);
  onINP(vital);
  onLCP(vital);
  onTTFB(vital);
}
