import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const blog = defineCollection({
  loader: glob({ pattern: "*.md", base: "./src/content/blog" }),
  schema: z.object({
    /** The <title>: under 60 characters. */
    title: z.string().max(60),
    /** The H1 on the page; can be longer than the title. */
    heading: z.string(),
    description: z.string().max(160),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    draft: z.boolean().default(false),
  }),
});

/** Problem pages (one per error message) at /<slug>, and comparison pages at /vs/<slug>. */
const guide = z.object({
  /** The <title>: under 60 characters. */
  title: z.string().max(60),
  /** The H1: the exact error message where there is one. */
  heading: z.string(),
  description: z.string().max(160),
  /** The message exactly as the program shows it, quoted at the top of the page. */
  error: z.string().optional(),
  /** Where the message appears, e.g. "Microsoft Excel". */
  where: z.string().optional(),
  /** Facts were last checked on this date. */
  checked: z.coerce.date(),
  /** Publish date: the page is built from this day on (src/lib/live.ts). */
  date: z.coerce.date().optional(),
  draft: z.boolean().default(false),
  faq: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
  /** Slugs of related problem pages, "vs/…" comparison pages and "blog/…" posts. */
  related: z.array(z.string()).default([]),
});

const problems = defineCollection({ loader: glob({ pattern: "*.md", base: "./src/content/problems" }), schema: guide });
const compare = defineCollection({ loader: glob({ pattern: "*.md", base: "./src/content/compare" }), schema: guide });

export const collections = { blog, problems, compare };
