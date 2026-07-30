import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const PUBLIC_ROUTES = [
  "/",
  "/mentions-legales",
  "/confidentialite",
  "/conditions-generales",
] as const;

const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 1024, height: 768 },
  { name: "desktop", width: 1440, height: 1000 },
] as const;

/**
 * The public actions are addressed by the slot the shared button carries and by where they sit,
 * because the journeys deliberately import nothing from the app: a class name copied over here
 * would be a second, silent copy of a styling decision.
 */
const HERO_SECTION = "#top";
const HEADER_ACTION = 'header [data-slot="public-action"][href="/diagnostic"]';
const HERO_ACTION = `${HERO_SECTION} [data-slot="public-action"]`;
const LEGAL_BACK_ACTION = 'header [data-slot="public-action"][data-direction="back"]';

const waitForStablePage = async (page: Page): Promise<void> => {
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
};

/**
 * How much of an image is actually painted, sampled through a canvas rather than read off the
 * element.
 *
 * `complete`, `naturalWidth` and even `decode()` all answered yes for a hero photograph that
 * rendered as nothing: the AVIF variants had been written by an encoder whose output Chromium
 * decodes to a fully transparent surface. Every check short of looking at the pixels agreed the
 * image was fine, and the page shipped its main photograph invisible on every viewport wide
 * enough to choose those variants.
 */
const paintedRatios = (page: Page): Promise<{ source: string; painted: number }[]> =>
  page.evaluate(async () => {
    const SAMPLE = 32;
    const measured = [];

    for (const image of Array.from(document.images)) {
      await image.decode().catch(() => {});
      const canvas = document.createElement("canvas");
      canvas.width = SAMPLE;
      canvas.height = SAMPLE;
      const context = canvas.getContext("2d");
      if (context === null) continue;

      context.drawImage(image, 0, 0, SAMPLE, SAMPLE);
      const { data } = context.getImageData(0, 0, SAMPLE, SAMPLE);
      let opaque = 0;
      for (let offset = 3; offset < data.length; offset += 4) {
        if ((data[offset] ?? 0) > 8) opaque += 1;
      }

      measured.push({
        source: image.currentSrc.split("/").pop() ?? image.currentSrc,
        painted: opaque / (SAMPLE * SAMPLE),
      });
    }

    return measured;
  });

test.describe("public quality contracts", () => {
  for (const route of PUBLIC_ROUTES) {
    test(`${route} has no serious automated accessibility violation`, async ({ page }) => {
      await page.goto(route);
      await waitForStablePage(page);

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      const violations = results.violations.filter(
        ({ impact }) => impact === "critical" || impact === "serious",
      );

      expect(violations).toEqual([]);
    });
  }

  for (const viewport of VIEWPORTS) {
    test(`the landing page paints every image it loads at ${viewport.name}`, async ({ page }) => {
      // Per viewport, because srcset is what picks the file: a variant chosen only on a wide
      // screen is a variant no narrow run would ever look at.
      await page.setViewportSize(viewport);
      await page.goto("/");
      await waitForStablePage(page);
      await page.mouse.wheel(0, 20_000);
      await page.waitForLoadState("networkidle");

      const blank = (await paintedRatios(page)).filter(({ painted }) => painted < 0.5);

      expect(blank).toEqual([]);
    });

    test(`the landing page keeps its ${viewport.name} responsive contract`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto("/");
      await waitForStablePage(page);

      const hasHorizontalOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );

      expect(hasHorizontalOverflow).toBe(false);
      const headerActionWidth = await page
        .locator(HEADER_ACTION)
        .evaluate((element) => element.getBoundingClientRect().width);
      expect(headerActionWidth).toBeLessThanOrEqual(153);

      if (viewport.name !== "mobile") {
        // The hero carries a primary and a quiet action; the width contract is the primary one.
        const heroActionWidth = await page
          .locator(HERO_ACTION)
          .first()
          .evaluate((element) => element.getBoundingClientRect().width);
        expect(heroActionWidth).toBeLessThanOrEqual(240);
      }

      if (viewport.name === "mobile") {
        const heroContract = await page.evaluate(
          ([heroAction, headerAction, heroSection]) => {
            const action = document.querySelector(heroAction);
            const brand = document.querySelector(`${heroSection} [data-slot="brand"]`);
            const header = document.querySelector(headerAction);
            const hero = document.querySelector(heroSection);
            if (!action || !brand || !header || !hero) return null;

            const actionBounds = action.getBoundingClientRect();
            const brandBounds = brand.getBoundingClientRect();
            const headerActionBounds = header.getBoundingClientRect();
            const heroBounds = hero.getBoundingClientRect();

            return {
              actionFitsHero:
                actionBounds.left >= heroBounds.left && actionBounds.right <= heroBounds.right,
              headerItemsDoNotOverlap: brandBounds.right <= headerActionBounds.left,
            };
          },
          [HERO_ACTION, HEADER_ACTION, HERO_SECTION] as const,
        );

        expect(heroContract).toEqual({
          actionFitsHero: true,
          headerItemsDoNotOverlap: true,
        });
      }

      await expect(page).toHaveScreenshot(`landing-${viewport.name}.png`, {
        animations: "disabled",
        maxDiffPixelRatio: 0.01,
      });
    });

    test(`the legal layout keeps its ${viewport.name} responsive contract`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto("/mentions-legales");
      await waitForStablePage(page);

      const hasHorizontalOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );

      expect(hasHorizontalOverflow).toBe(false);

      if (viewport.name === "mobile") {
        await expect(page.locator(`${LEGAL_BACK_ACTION} svg`).first()).toBeVisible();
      }

      await expect(page).toHaveScreenshot(`legal-${viewport.name}.png`, {
        animations: "disabled",
        maxDiffPixelRatio: 0.01,
      });
    });
  }
});
