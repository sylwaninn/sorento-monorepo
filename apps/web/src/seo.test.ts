import { describe, expect, it, vi } from "vitest";
import type { RouteObject } from "react-router";
import {
  CRAWLABLE_WILDCARDS,
  DISALLOWED_PREFIXES,
  INDEXABLE_PATHS,
  OG_IMAGE_PATH,
  absoluteUrl,
  robotsBody,
  sitemapBody,
  withShareUrls,
} from "@/seo";

vi.mock("@sorento/supabase-client", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  const { stubDataLayer } = await import("@/test/supabase-stub");
  return stubDataLayer(actual);
});

const { routes } = await import("@/routes");

const SITE_URL = "https://sorento.example";

const declaredPaths = (table: readonly RouteObject[]): string[] =>
  table.flatMap((route) => [
    ...(route.path === undefined ? [] : [route.path]),
    ...(route.children === undefined ? [] : declaredPaths(route.children)),
  ]);

describe("robots.txt", () => {
  /**
   * The list of what a crawler is asked to leave alone is written here, and written again, in
   * effect, by the route table. This compares them. A screen added behind a session, or a new
   * step in the funnel, is indexable the day it ships unless a rule already covers it, and
   * nothing else in the build would ever say so.
   */
  it("covers every route that is not meant to be found", () => {
    const uncovered = declaredPaths(routes).filter(
      (path) =>
        !INDEXABLE_PATHS.some((indexable) => indexable === path) &&
        !CRAWLABLE_WILDCARDS.some((wildcard) => wildcard === path) &&
        !DISALLOWED_PREFIXES.some((prefix) => path.startsWith(prefix)),
    );

    expect(uncovered).toEqual([]);
  });

  it("blocks a prefix rather than a folder, so the screen itself is covered too", () => {
    expect(DISALLOWED_PREFIXES.filter((prefix) => prefix.endsWith("/"))).toEqual([]);
  });

  it("names every blocked prefix, once the crawler has been let in", () => {
    const body = robotsBody(SITE_URL);

    expect(body.startsWith("User-agent: *\nAllow: /\n")).toBe(true);
    for (const prefix of DISALLOWED_PREFIXES) {
      expect(body).toContain(`Disallow: ${prefix}\n`);
    }
  });

  it("points at the sitemap once the build knows its own address", () => {
    expect(robotsBody(SITE_URL)).toContain(`Sitemap: ${SITE_URL}/sitemap.xml`);
  });

  it("names no sitemap where none is generated", () => {
    expect(robotsBody(undefined)).not.toContain("Sitemap:");
  });
});

describe("sitemap.xml", () => {
  it("lists the public pages as absolute addresses, and nothing behind a session", () => {
    const body = sitemapBody(SITE_URL);
    const listed = [...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);

    expect(listed).toEqual(INDEXABLE_PATHS.map((path) => absoluteUrl(SITE_URL, path)));
    for (const prefix of DISALLOWED_PREFIXES) {
      expect(body).not.toContain(`<loc>${SITE_URL}${prefix}`);
    }
  });
});

describe("share URLs", () => {
  const html = [
    '<meta property="og:image" content="/og.jpg" />',
    '<meta property="og:type" content="website" />',
    '<meta name="twitter:image" content="/og.jpg" />',
  ].join("\n");

  // A site-relative og:image is ignored by most social crawlers, and none of them run the script
  // that could have fixed it.
  it("makes the share image absolute wherever it is quoted", () => {
    expect(withShareUrls(html, SITE_URL)).not.toContain(`content="${OG_IMAGE_PATH}"`);
    expect(
      [...withShareUrls(html, SITE_URL).matchAll(/content="([^"]*og\.jpg)"/g)].map(
        (match) => match[1],
      ),
    ).toEqual([`${SITE_URL}${OG_IMAGE_PATH}`, `${SITE_URL}${OG_IMAGE_PATH}`]);
  });

  it("states the shared address, which is the homepage", () => {
    expect(withShareUrls(html, SITE_URL)).toContain(
      `<meta property="og:url" content="${SITE_URL}/" />`,
    );
  });
});
