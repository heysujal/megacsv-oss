import { readFileSync } from "node:fs";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const { version } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

// Google Analytics and Microsoft Clarity, production builds only, so local development
// and the e2e scripts (which fail on off-origin requests) stay clean. The site's
// /consent.js loads them and asks visitors in Europe first; one choice covers site and app.
const analytics = `
    <script src="/consent.js"></script>`;

const analyticsPlugin: Plugin = {
  name: "analytics",
  apply: "build",
  transformIndexHtml: (html) => html.replace("<head>", `<head>${analytics}`),
};

export default defineConfig({
  // The website owns /; the app lives at /app/.
  base: "/app/",
  plugins: [react(), tailwindcss(), analyticsPlugin],
  define: { __APP_VERSION__: JSON.stringify(version) },
  worker: { format: "es", rolldownOptions: { output: { assetFileNames: "assets/[name][extname]" } } },
  // Stylesheets and fonts keep the same name across deploys (no hash): Clarity replays
  // load them from the live site when watched, and a renamed file would show an old
  // session unstyled. Files are served with max-age=0 + revalidation, so nothing goes stale.
  build: { target: "es2022", rolldownOptions: { output: { assetFileNames: "assets/[name][extname]" } } },
  // Problem reports go to the Worker (pnpm --dir worker dev) during development.
  // Fixed port: the website's dev server (site/astro.config.mjs) proxies /app here.
  server: { port: 5173, strictPort: true, proxy: { "/api": "http://localhost:8787" } },
});
