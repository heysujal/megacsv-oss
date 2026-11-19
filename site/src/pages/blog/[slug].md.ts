// A Markdown copy of each published post at /blog/<slug>.md, for AI assistants (docs/reference.md, "AI discovery").
import type { APIRoute, GetStaticPaths } from "astro";
import type { CollectionEntry } from "astro:content";
import { postMarkdown, publishedPosts } from "../../lib/llms";

export const getStaticPaths = (async () =>
  (await publishedPosts()).map((post) => ({ params: { slug: post.id }, props: { post } }))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) =>
  new Response(postMarkdown((props as { post: CollectionEntry<"blog"> }).post), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
