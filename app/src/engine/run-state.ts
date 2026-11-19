// The life of one background job (find, filter, sort, summary). A job moves forward
// only: idle → running → done, failed or cancelled. An end state never changes, so a
// finished job stays finished when it's later cancelled or disposed.

export type RunPhase = "idle" | "running" | "done" | "failed" | "cancelled";

export class RunState {
  phase: RunPhase = "idle";
  /** Why it failed, in words for the user. */
  error: string | null = null;

  get active(): boolean {
    return this.phase === "running";
  }

  /** Returns false if the job had already started or been cancelled. */
  begin(): boolean {
    if (this.phase !== "idle") return false;
    this.phase = "running";
    return true;
  }

  finish(): void {
    if (this.active) this.phase = "done";
  }

  fail(message: string): void {
    if (!this.active) return;
    this.phase = "failed";
    this.error = message;
  }

  cancel(): void {
    if (this.phase === "idle" || this.active) this.phase = "cancelled";
  }
}
