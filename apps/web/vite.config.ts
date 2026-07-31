import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
// Relative because defining the "@" alias is one of the things this file does.
import { robotsBody, sitemapBody, withShareUrls } from "./src/seo";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));

/**
 * The two files a crawler reads before anything else, plus the share URLs, all of which need an
 * origin the source tree cannot know. Everything they say comes from src/seo.ts, which is
 * compared against the route table by its own test.
 */
const crawlerFiles = (siteUrl: string | undefined): Plugin => ({
  name: "sorento-crawler-files",
  apply: "build",

  transformIndexHtml: {
    order: "post",
    handler: (html: string) => (siteUrl === undefined ? html : withShareUrls(html, siteUrl)),
  },

  generateBundle() {
    if (siteUrl === undefined) {
      this.warn(
        "VITE_SITE_URL is unset: no sitemap.xml, no Sitemap line in robots.txt and no absolute share URLs. See .env.example.",
      );
    }

    this.emitFile({ type: "asset", fileName: "robots.txt", source: robotsBody(siteUrl) });
    if (siteUrl !== undefined) {
      this.emitFile({ type: "asset", fileName: "sitemap.xml", source: sitemapBody(siteUrl) });
    }
  },
});

export default defineConfig(({ mode }) => ({
  plugins: [
    {
      // Dev server only: the policy's script-src 'self' blocks the inline react-refresh
      // preamble Vite injects, so no screen renders under it. Removed whole rather than
      // relaxed, which means development catches no CSP violation; the built document keeps
      // the real policy untouched, and the E2E suite runs against a build.
      name: "disable-csp-during-development",
      apply: "serve",
      transformIndexHtml(html: string) {
        return html.replace(/\s*<meta\s+http-equiv="Content-Security-Policy"[\s\S]*?\/>/, "");
      },
    },
    react(),
    tailwindcss(),
    crawlerFiles(loadEnv(mode, projectRoot, "VITE_")["VITE_SITE_URL"] || undefined),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
}));
