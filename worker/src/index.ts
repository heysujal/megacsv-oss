// MegaCSV Worker: serves the app's static files and receives feedback
// at POST /api/feedback, which is stored in the megacsv-feedback D1 database.
// Feedback never contains file data; the app only sends what the user typed
// plus a few details it shows them before sending.

/** Secrets, which `wrangler types` doesn't see. */
declare global {
  interface Env {
    DEPLOY_HOOK_URL?: string;
  }
}

type Kind = "problem" | "idea" | "other";

interface Report {
  kind: Kind;
  message: string;
  email: string;
  appVersion: string;
  browser: string;
  os: string;
  fileSize: string;
}

const MAX_BODY_BYTES = 20_000;
const MAX_MESSAGE = 5_000;
const MAX_DETAIL = 100;
/** Per client address, per Worker instance; a light guard until Turnstile is added. */
const RATE_LIMIT = { max: 5, windowMs: 10 * 60_000 };
const recent = new Map<string, number[]>();

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/feedback") {
      if (request.method !== "POST") return reply(405, { error: "Use POST." });
      return handleFeedback(request, env);
    }
    if (url.pathname.startsWith("/api/")) return reply(404, { error: "Not found." });
    if (url.pathname === "/indexnow.json") return new Response("Not found", { status: 404 }); // for the cron only
    // One address per page for search engines: www and http go to https://megacsv.com.
    if (url.hostname === "www.megacsv.com" || (url.hostname === "megacsv.com" && url.protocol === "http:")) {
      url.hostname = "megacsv.com";
      url.protocol = "https:";
      return Response.redirect(url.toString(), 301);
    }
    const res = await env.ASSETS.fetch(request);
    // Static files answer /page/ and /page.html with a temporary 307 to /page; make it permanent.
    const to = res.status === 307 ? res.headers.get("Location") : null;
    if (to) return new Response(null, { status: 301, headers: { Location: to } });
    return res.ok ? searchHeaders(url.pathname, res) : res;
  },

  // Two daily crons (wrangler.jsonc): the IndexNow ping, and (when turned on) the rebuild that
  // puts queued pages up on their publish day (site/src/lib/live.ts, site/publish-queue.txt).
  async scheduled(controller, env, ctx): Promise<void> {
    if (controller.cron === INDEXNOW_CRON) {
      ctx.waitUntil(pingChangedPages(env));
      return;
    }
    // Rebuild: DEPLOY_HOOK_URL is a Workers Builds deploy hook for `main`, set as a secret.
    const hook = env.DEPLOY_HOOK_URL;
    if (!hook) return;
    ctx.waitUntil(
      fetch(hook, { method: "POST" }).then(async (r) => {
        if (!r.ok) console.error(`Deploy hook failed: ${r.status} ${await r.text()}`);
      }),
    );
  },
} satisfies ExportedHandler<Env>;

/**
 * Plain-text copies for AI tools must not compete with the pages in search results:
 * /blog/<post>.md names its HTML page as the canonical one, and llms-full.txt (every
 * page in one file) stays out of the index. llms.txt is a short list of links; left alone.
 */
function searchHeaders(path: string, res: Response): Response {
  const post = path.match(/^\/blog\/([a-z0-9-]+)\.md$/)?.[1];
  if (!post && path !== "/llms-full.txt") return res;
  const out = new Response(res.body, res);
  if (post) out.headers.set("Link", `<https://megacsv.com/blog/${post}>; rel="canonical"`);
  else out.headers.set("X-Robots-Tag", "noindex");
  return out;
}

// ---- IndexNow (Bing, Yandex, Seznam, Naver; shared between them) ----
// The key is public by design: it is served at /<key>.txt (site/public) to prove we own the site.
// Manual sends, e.g. every page: node scripts/indexnow.mjs
const INDEXNOW_KEY = "9cb5d86851218975478d65c1ca289c17";
/** 00:30 UTC (06:00 India time): sends IndexNow the pages that changed since last time. */
const INDEXNOW_CRON = "30 0 * * *";

/**
 * The build fingerprints every page in the sitemap (dist/indexnow.json, scripts/combine-dist.mjs).
 * Pages whose fingerprint differs from the one last sent (D1 table `indexnow`) are sent, so new and
 * edited pages go out once, after they're live, and unchanged pages never do.
 */
async function pingChangedPages(env: Env): Promise<void> {
  const res = await env.ASSETS.fetch("https://megacsv.com/indexnow.json");
  if (!res.ok) return console.error(`IndexNow: indexnow.json ${res.status}`);
  const pages = (await res.json()) as Record<string, string>;
  const { results } = await env.FEEDBACK_DB.prepare("SELECT url, hash FROM indexnow").all<{ url: string; hash: string }>();
  const sent = new Map(results.map((r) => [r.url, r.hash]));
  const changed = Object.entries(pages).filter(([url, hash]) => sent.get(url) !== hash);
  if (!changed.length) return;
  const r = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: "megacsv.com", key: INDEXNOW_KEY, keyLocation: `https://megacsv.com/${INDEXNOW_KEY}.txt`, urlList: changed.map(([url]) => url) }),
  });
  console.log(`IndexNow: ${changed.length} changed pages, ${r.status}`);
  if (!r.ok) return; // tried again tomorrow
  const now = new Date().toISOString();
  const upsert = env.FEEDBACK_DB.prepare(
    "INSERT INTO indexnow (url, hash, sent_at) VALUES (?, ?, ?) ON CONFLICT(url) DO UPDATE SET hash = excluded.hash, sent_at = excluded.sent_at",
  );
  await env.FEEDBACK_DB.batch(changed.map(([url, hash]) => upsert.bind(url, hash, now)));
}

async function handleFeedback(request: Request, env: Env): Promise<Response> {
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return reply(413, { error: "That report is too long." });
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
  } catch {
    return reply(400, { error: "Couldn't read the report." });
  }
  const report = parseReport(body);
  if (typeof report === "string") return reply(400, { error: report });
  // Only valid reports count, so a few mistakes don't use up the limit.
  const ip = request.headers.get("CF-Connecting-IP") ?? "local";
  if (isRateLimited(ip)) return reply(429, { error: "Too many messages in a short time. Please try again later." });

  try {
    await env.FEEDBACK_DB.prepare(
      `INSERT INTO feedback (received_at, kind, message, email, app_version, browser, os, file_size)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        new Date().toISOString(),
        report.kind,
        report.message,
        report.email,
        report.appVersion,
        report.browser,
        report.os,
        report.fileSize,
      )
      .run();
  } catch (err) {
    console.error(`[feedback] store failed: ${err instanceof Error ? err.message : String(err)}`);
    return reply(502, { error: "Couldn't send your feedback right now. Please try again in a minute." });
  }
  return reply(200, { ok: true });
}

/** A valid report, or an error message for the user. */
function parseReport(body: Record<string, unknown>): Report | string {
  const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) return "Please write a message.";
  if (message.length > MAX_MESSAGE) return `Please keep the message under ${MAX_MESSAGE.toLocaleString("en-US")} characters.`;
  const email = str(body.email, 254);
  if (!email) return "Please enter your email so we can reply.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "That email address doesn't look right.";
  const kind = body.kind === "problem" || body.kind === "idea" ? body.kind : "other";
  return {
    kind,
    message,
    email,
    appVersion: str(body.appVersion, MAX_DETAIL) || "unknown",
    browser: str(body.browser, MAX_DETAIL) || "unknown",
    os: str(body.os, MAX_DETAIL) || "unknown",
    fileSize: str(body.fileSize, MAX_DETAIL) || "no file open",
  };
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const times = (recent.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT.windowMs);
  if (times.length >= RATE_LIMIT.max) return true;
  times.push(now);
  recent.set(ip, times);
  return false;
}

function reply(status: number, body: unknown): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}
