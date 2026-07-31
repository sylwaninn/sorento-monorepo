// Relative, and the one module in src that is: vite.config.ts imports this at build time, and
// Node resolves it before the "@" alias the config declares exists.
import { publicPath } from "./navigation";

/**
 * What a crawler is told about this site, in one place, because the three files that carry it
 * (index.html, robots.txt, sitemap.xml) disagree the moment a route moves.
 *
 * Read by the build: vite.config.ts turns the two builders below into the files it emits. It is
 * deliberately not imported by any screen, so none of it reaches the bundle.
 */

/** Written site-relative in index.html; a social crawler is the one reader that needs it whole. */
export const OG_IMAGE_PATH = "/og.jpg";

/**
 * The addresses a search engine is invited to index. Everything else the router answers is
 * either behind a session or a step in the funnel, and a step is an action rather than a page.
 */
export const INDEXABLE_PATHS = [
  publicPath.home,
  publicPath.legalNotice,
  publicPath.privacy,
  publicPath.terms,
] as const;

/**
 * Written without trailing slashes on purpose: a robots rule matches a prefix, so "/admin/"
 * would leave "/admin" itself crawlable, and that is the back office's own front door.
 *
 * Kept honest by seo.test.ts, which walks the route table and refuses a route that is neither
 * indexable nor covered here.
 */
export const DISALLOWED_PREFIXES = [
  "/admin",
  "/auth",
  publicPath.login,
  "/contact-confiance",
  publicPath.diagnostic,
  "/dossiers",
  publicPath.signup,
  "/invitations",
  "/mes-dossiers",
  "/mot-de-passe-oublie",
  "/parametres",
  "/verification-email",
] as const;

/**
 * The one route deliberately left crawlable without being in the sitemap: the guides are the
 * search entry point the product is meant to have, and their addresses come from the content
 * catalog rather than from the route table.
 */
export const CRAWLABLE_WILDCARDS = ["/guides/:slug"] as const;

export const absoluteUrl = (siteUrl: string, path: string): string => new URL(path, siteUrl).href;

export const robotsBody = (siteUrl: string | undefined): string =>
  [
    "User-agent: *",
    "Allow: /",
    ...[...DISALLOWED_PREFIXES].sort().map((prefix) => `Disallow: ${prefix}`),
    // Naming a sitemap that is not emitted sends every crawler to a 404 on the first line it
    // reads, so the line only exists where the file does.
    ...(siteUrl === undefined ? [] : ["", `Sitemap: ${absoluteUrl(siteUrl, "/sitemap.xml")}`]),
    "",
  ].join("\n");

export const sitemapBody = (siteUrl: string): string =>
  [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...INDEXABLE_PATHS.map((path) => `  <url><loc>${absoluteUrl(siteUrl, path)}</loc></url>`),
    "</urlset>",
    "",
  ].join("\n");

/**
 * The share card's own address and image, absolutised.
 *
 * The crawlers that read them do not run scripts, so the static document is the only version
 * they will ever see, and most of them ignore a site-relative image. That also fixes og:url at
 * the homepage, which is the page a share card is made of. The canonical link is a different
 * question and deliberately not answered here: one document serves every route, so it is set
 * from the route at runtime by CanonicalUrl.
 */
export const withShareUrls = (html: string, siteUrl: string): string =>
  html
    .replaceAll(`content="${OG_IMAGE_PATH}"`, `content="${absoluteUrl(siteUrl, OG_IMAGE_PATH)}"`)
    .replace(
      '<meta property="og:type"',
      `<meta property="og:url" content="${absoluteUrl(siteUrl, publicPath.home)}" />\n    <meta property="og:type"`,
    );
