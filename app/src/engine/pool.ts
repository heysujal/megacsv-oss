// Worker pool with priorities: row reads for the grid go first, then queries,
// then index scans and housekeeping, so scrolling stays responsive while the
// file is being read or searched.

import type {
  Envelope,
  QueryRequest,
  QueryResult,
  Reply,
  Request,
  RowsAtRequest,
  RowsRequest,
  RowsResult,
  SaveRequest,
  ScanRequest,
  SortRunRequest,
  SortRunResult,
  SummaryRequest,
  SummaryResult,
} from "./protocol";

type WithoutKind<T> = Omit<T, "kind">;

interface Job {
  req: Request;
  /** Owner, for cancelling its queued work. */
  tag: object | null;
  resolve: (v: unknown) => void;
  reject: (e: Error) => void;
}

export class Cancelled extends Error {}

const ROWS = 0;
const QUERY = 1;
const BACKGROUND = 2;

export class WorkerPool {
  readonly size: number;
  private idle: Worker[] = [];
  private queues: Job[][] = [[], [], []];
  private inflight = new Map<number, Job>();
  private nextId = 1;

  constructor(size = Math.max(1, Math.min((navigator.hardwareConcurrency || 4) - 1, 8))) {
    this.size = size;
    for (let i = 0; i < size; i++) {
      const w = new Worker(new URL("./engine.worker.ts", import.meta.url), { type: "module" });
      w.onmessage = (e: MessageEvent<Reply>) => this.onReply(w, e.data);
      this.idle.push(w);
    }
  }

  scan(req: WithoutKind<ScanRequest>, tag: object): Promise<Float64Array> {
    return this.enqueue(BACKGROUND, { kind: "scan", ...req }, tag);
  }

  rows(req: WithoutKind<RowsRequest>, tag: object): Promise<RowsResult> {
    return this.enqueue(ROWS, { kind: "rows", ...req }, tag);
  }

  rowsAt(req: WithoutKind<RowsAtRequest>, tag: object): Promise<RowsResult> {
    return this.enqueue(ROWS, { kind: "rowsAt", ...req }, tag);
  }

  /** `urgent`: needed for the rows on screen, so it goes ahead of other searches. */
  query(req: WithoutKind<QueryRequest>, tag: object, urgent = false): Promise<QueryResult> {
    return this.enqueue(urgent ? ROWS : QUERY, { kind: "query", ...req }, tag);
  }

  summary(req: WithoutKind<SummaryRequest>, tag: object): Promise<SummaryResult> {
    return this.enqueue(QUERY, { kind: "summary", ...req }, tag);
  }

  sortRun(req: WithoutKind<SortRunRequest>, tag: object): Promise<SortRunResult> {
    return this.enqueue(QUERY, { kind: "sortRun", ...req }, tag);
  }

  save(req: WithoutKind<SaveRequest>): Promise<void> {
    return this.enqueue(BACKGROUND, { kind: "save", ...req }, null);
  }

  /** Drops `tag`'s queued work. Work already running finishes; callers ignore it. */
  cancel(tag: object): void {
    for (const q of this.queues) {
      for (const job of q) if (job.tag === tag) job.reject(new Cancelled());
    }
    this.queues = this.queues.map((q) => q.filter((job) => job.tag !== tag));
  }

  private enqueue<T>(priority: number, req: Request, tag: object | null): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queues[priority].push({ req, tag, resolve: resolve as (v: unknown) => void, reject });
      this.pump();
    });
  }

  private pump(): void {
    while (this.idle.length > 0) {
      const job = this.queues[ROWS].shift() ?? this.queues[QUERY].shift() ?? this.queues[BACKGROUND].shift();
      if (!job) return;
      const w = this.idle.pop()!;
      const id = this.nextId++;
      this.inflight.set(id, job);
      w.postMessage({ id, req: job.req } satisfies Envelope);
    }
  }

  private onReply(w: Worker, reply: Reply): void {
    const job = this.inflight.get(reply.id);
    this.inflight.delete(reply.id);
    this.idle.push(w);
    if (job) {
      if (reply.ok) job.resolve(reply.result);
      else job.reject(new Error(reply.error));
    }
    this.pump();
  }
}
