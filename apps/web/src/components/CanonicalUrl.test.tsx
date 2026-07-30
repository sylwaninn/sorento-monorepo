import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/render";

const SITE_URL = "https://sorento.example";

const canonicalHref = () =>
  document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href;

/**
 * The origin is read once, when the module is first evaluated, because Vite inlines it into the
 * bundle. Re-importing under a different value is therefore the only honest way to test both
 * cases, and it is what a second deployment really is.
 */
const renderAt = async (route: string, siteUrl: string) => {
  vi.stubEnv("VITE_SITE_URL", siteUrl);
  vi.resetModules();
  const { CanonicalUrl } = await import("@/components/CanonicalUrl");

  return renderWithProviders(<CanonicalUrl />, { path: "/*", route });
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  document.head.querySelector('link[rel="canonical"]')?.remove();
});

describe("CanonicalUrl", () => {
  /**
   * One index.html answers every route here, so the canonical cannot be written into the static
   * document: every legal page would declare itself a copy of the homepage, which is the one
   * thing a canonical link exists to prevent.
   */
  it("names the page the visitor is actually on", async () => {
    await renderAt("/mentions-legales", SITE_URL);

    expect(canonicalHref()).toBe(`${SITE_URL}/mentions-legales`);
  });

  it("keeps one link up to date rather than stacking them", async () => {
    await renderAt("/", SITE_URL);
    await renderAt("/confidentialite", SITE_URL);

    expect(document.head.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
    expect(canonicalHref()).toBe(`${SITE_URL}/confidentialite`);
  });

  // A canonical pointing at a domain the build guessed is worse than none: it hands a search
  // engine an address nobody serves.
  it("says nothing where the build was never told its own origin", async () => {
    await renderAt("/", "");

    expect(canonicalHref()).toBeUndefined();
  });
});
