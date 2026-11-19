// When a page goes live. A page listed in the publish queue (site/publish-queue.txt)
// goes live on its queue day; any other page when it isn't a draft (and, for problem
// and comparison pages, once its own `date` has come). Days are in India time (the
// owner's day). The Worker's nightly cron rebuilds the site (worker/src/index.ts), so
// queued pages appear without a push.
import { type CollectionEntry, getCollection } from "astro:content";
import { scheduleFrom, todayInIndia } from "../../queue.mjs";
import queueText from "../../publish-queue.txt?raw";

type Guide = CollectionEntry<"problems"> | CollectionEntry<"compare">;
type Post = CollectionEntry<"blog">;

const today = todayInIndia();
const queue = scheduleFrom(queueText);

// Every queue line must name a page, so a typo fails the build.
const known = new Set([
  ...(await getCollection("problems")).map((e) => e.id),
  ...(await getCollection("compare")).map((e) => `vs/${e.id}`),
  ...(await getCollection("blog")).map((e) => `blog/${e.id}`),
]);
for (const page of queue.keys()) if (!known.has(page)) throw new Error(`publish-queue.txt: no page called "${page}"`);


const day = (d: Date) => d.toISOString().slice(0, 10);

/** The queue line naming this page ("slug", "vs/slug", "blog/slug"). */
const queueKey = (e: Guide | Post) => (e.collection === "blog" ? `blog/${e.id}` : e.collection === "compare" ? `vs/${e.id}` : e.id);

export function isLive(e: Guide | Post): boolean {
  const queued = queue.get(queueKey(e));
  if (queued) return queued <= today;
  if (e.collection === "blog") return !e.data.draft;
  return !e.data.draft && !!e.data.date && day(e.data.date) <= today;
}

/** The day a page went (or goes) live: its queue day, else its own date. */
export function publishDate(e: Guide | Post): Date | undefined {
  const queued = queue.get(queueKey(e));
  return queued ? new Date(`${queued}T00:00:00Z`) : e.data.date;
}

/** Pages to build: live ones, or every page on the dev server. */
export async function guides<C extends "problems" | "compare">(collection: C): Promise<CollectionEntry<C>[]> {
  const all = await getCollection(collection);
  return all.filter((e) => import.meta.env.DEV || isLive(e));
}

/** Live blog posts, newest first. */
export async function livePosts(): Promise<Post[]> {
  const posts = (await getCollection("blog")).filter(isLive);
  return posts.sort((a, b) => publishDate(b)!.getTime() - publishDate(a)!.getTime());
}

/** Every live page as a link, keyed by its slug ("csv-opens-in-one-column", "vs/excel"). */
export async function liveGuideLinks(): Promise<Map<string, { href: string; heading: string; description: string }>> {
  const links = new Map<string, { href: string; heading: string; description: string }>();
  for (const e of await getCollection("problems")) if (isLive(e)) links.set(e.id, { href: `/${e.id}`, heading: e.data.heading, description: e.data.description });
  for (const e of await getCollection("compare")) if (isLive(e)) links.set(`vs/${e.id}`, { href: `/vs/${e.id}`, heading: e.data.heading, description: e.data.description });
  return links;
}
