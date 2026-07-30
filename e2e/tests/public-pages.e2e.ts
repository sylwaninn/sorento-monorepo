import { expect, test, type Page } from "@playwright/test";
import { wizardStep } from "#e2e/support/app";
import { copy } from "#e2e/support/copy";
import { copyPublic } from "#e2e/support/copy-public";

/**
 * Everything a person can reach before they have given anyone anything: the argument on the
 * landing page, the three legal documents, the guides, and the wall in front of the app.
 *
 * These pages are the whole of what a visitor has to go on when deciding whether to trust a
 * service with the worst week of their life, which is why what they promise is asserted here as
 * a rule rather than left to whatever the markup happens to say today.
 */

/** Only the anonymous funnel has to work for someone who never signs in. */
const ENTRY_FUNNEL = ["/", "/diagnostic"] as const;

/**
 * The moving parts of the aid section, addressed by the slot they carry: the journeys import
 * nothing from the app, and a class name copied over here would be a second, silent copy of a
 * styling decision.
 */
const MONEY_STREAMS = '[data-slot="money-streams"]';
const MONEY_TRACK = '[data-slot="money-track"]';

/**
 * A dossier id that belongs to nobody. A signed-out visitor must be turned away by the shape of
 * the URL alone, before anything is looked up, so an id that existed would prove nothing extra.
 */
const ABSENT_DOSSIER_ID = "00000000-0000-4000-8000-000000000000";

const PRIVATE_ROUTES = [
  "/mes-dossiers",
  "/parametres",
  `/dossiers/${ABSENT_DOSSIER_ID}`,
  `/dossiers/${ABSENT_DOSSIER_ID}/membres`,
  `/dossiers/${ABSENT_DOSSIER_ID}/documents`,
] as const;

/**
 * The signed-in chrome, and the one thing on screen that exists only once a session does. A
 * visitor about to be redirected must never see it, not even for a frame.
 */
const PRIVATE_CHROME = '[data-slot="app-header"]';
const FLASH_ATTRIBUTE = "data-e2e-private-chrome-seen";

/**
 * Records the private chrome appearing at any point, rather than sampling for it once the
 * redirect has already settled. A flash of someone else's furniture is by definition gone by the
 * time an assertion could go looking for it.
 */
const watchForPrivateChrome = async (page: Page): Promise<void> => {
  await page.addInitScript(
    ([selector, attribute]) => {
      const check = () => {
        if (document.querySelector(selector) !== null) {
          document.documentElement.setAttribute(attribute, "yes");
        }
      };
      new MutationObserver(check).observe(document, { childList: true, subtree: true });
    },
    [PRIVATE_CHROME, FLASH_ATTRIBUTE] as const,
  );
};

const sawPrivateChrome = (page: Page): Promise<boolean> =>
  page.evaluate((attribute) => document.documentElement.hasAttribute(attribute), FLASH_ATTRIBUTE);

const headingLevels = (page: Page): Promise<number[]> =>
  page.evaluate(() =>
    Array.from(document.querySelectorAll("h1, h2, h3, h4, h5, h6")).map((heading) =>
      Number(heading.tagName.slice(1)),
    ),
  );

/** Route-level chunks can finish after navigation; audit the screen only once its title exists. */
const waitForScreen = (page: Page): Promise<void> =>
  expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);

const imagesWithoutAlternative = (page: Page): Promise<(string | null)[]> =>
  page.evaluate(() =>
    Array.from(document.querySelectorAll("img"))
      .filter((image) => image.getAttribute("alt") === null)
      .map((image) => image.getAttribute("src")),
  );

test.describe("what a visitor sees before they trust anyone", () => {
  test("the landing page argues for the service and names what it will not do", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: copyPublic.heroTitle })).toBeVisible();
    await expect(page.getByRole("link", { name: copy.landingCta })).toBeVisible();
    await expect(page.getByText(copyPublic.howItWorksTitle, { exact: true })).toBeVisible();

    // The scope section is the promise a grieving visitor is owed before anything is asked of
    // them, and two of its lines are compliance rules rather than positioning: no commission on
    // money the family recovers, and information rather than individual legal advice. Someone
    // arriving in grief must not be sold to.
    await expect(page.getByText(copyPublic.scopeTitle, { exact: true })).toBeVisible();
    await expect(page.getByText(copyPublic.scopeDescription, { exact: true })).toBeVisible();
    await expect(page.getByText(copyPublic.takesNoCommission)).toBeVisible();

    await expect(page.getByText(copyPublic.reassuranceTitle, { exact: true })).toBeVisible();
    await expect(page.getByText(copyPublic.freeForFamilies, { exact: true })).toBeVisible();
    await expect(page.getByText(copyPublic.noCommissionTitle, { exact: true })).toBeVisible();
    await expect(page.getByText(copyPublic.noCommissionDetail)).toBeVisible();

    // The same sentence the diagnostic result carries, and it belongs here too: a visitor has to
    // know what this service is before answering a single question about a death.
    await expect(page.getByText(copyPublic.generalInformationNotice)).toBeVisible();
  });

  /**
   * A track sitting at transform: none reads back as the string "none", which DOMMatrix refuses.
   * That is the reduced-motion case, and treating it as the origin is what makes it comparable
   * to a moving track rather than a crash.
   */
  const trackPositions = (page: Page) =>
    page.locator(MONEY_TRACK).evaluateAll((elements) =>
      elements.map((element) => {
        const { transform } = getComputedStyle(element);
        return transform === "none" ? 0 : new DOMMatrix(transform).m42;
      }),
    );

  test("the aid and capital streams run only while they are on screen", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");

    const streams = page.locator(MONEY_STREAMS);
    await expect(page.locator(MONEY_TRACK)).toHaveCount(2);
    await expect(streams).toHaveAttribute("data-animation", "paused");

    await streams.scrollIntoViewIfNeeded();
    await expect(streams).toHaveAttribute("data-animation", "running");

    const initialPositions = await trackPositions(page);

    await expect
      .poll(() => trackPositions(page), {
        message: "the two aid streams should keep moving",
        timeout: 2_000,
      })
      .not.toEqual(initialPositions);

    const nextPositions = await trackPositions(page);
    expect(nextPositions[0]).toBeLessThan(initialPositions[0] ?? 0);
    expect(nextPositions[1]).toBeGreaterThan(initialPositions[1] ?? 0);
  });

  /**
   * There is no pause control on the page, so the system setting is the whole of the answer for
   * a reader that motion costs. If it ever stopped being honoured, nothing else would say so.
   */
  test("the aid and capital streams stand still for a reader who asks for less motion", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");

    await page.locator(MONEY_STREAMS).scrollIntoViewIfNeeded();
    const initialPositions = await trackPositions(page);
    expect(initialPositions).toHaveLength(2);

    await page.waitForTimeout(500);

    expect(await trackPositions(page)).toEqual(initialPositions);
  });

  test("the three legal documents are reachable from the landing page, and each is its own", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("link", { name: copyPublic.footerLegalNotice }).click();

    await expect(page).toHaveURL(/\/mentions-legales$/);
    await expect(page.getByRole("heading", { name: copyPublic.legalNoticeTitle })).toBeVisible();
    await expect(page.getByText(copyPublic.publisherSection, { exact: true })).toBeVisible();
    await expect(page.getByText(copyPublic.serviceNatureSection, { exact: true })).toBeVisible();
    // Three routes rendering one shared layout is the failure this guards against: each has to
    // be the document its link promised, not the same page under three addresses.
    await expect(page.getByText(copyPublic.processedDataSection, { exact: true })).toHaveCount(0);

    await page.goto("/");
    await page.getByRole("link", { name: copyPublic.footerPrivacy }).click();

    await expect(page).toHaveURL(/\/confidentialite$/);
    await expect(page.getByRole("heading", { name: copyPublic.privacyTitle })).toBeVisible();
    await expect(page.getByText(copyPublic.processedDataSection, { exact: true })).toBeVisible();
    await expect(page.getByText(copyPublic.publisherSection, { exact: true })).toHaveCount(0);

    // CLAUDE.md states it absolutely, so the people whose data it is have to be told it in the
    // document that binds the publisher, not only in the code that enforces it.
    await expect(page.getByText(copyPublic.adminHasNoAccess)).toBeVisible();

    await page.goto("/");
    await page.getByRole("link", { name: copyPublic.footerTerms }).click();

    await expect(page).toHaveURL(/\/conditions-generales$/);
    await expect(page.getByRole("heading", { name: copyPublic.termsTitle })).toBeVisible();
    await expect(page.getByText(copyPublic.termsPurposeSection, { exact: true })).toBeVisible();
    await expect(page.getByText(copyPublic.termsNoCommission)).toBeVisible();
    await expect(page.getByText(copyPublic.processedDataSection, { exact: true })).toHaveCount(0);
  });

  test("a guide that does not exist says so, and still offers a way forward", async ({ page }) => {
    await page.goto("/guides/ce-guide-n-existe-pas");

    // A mistyped address, or a link that outlived its article, is the likeliest way anyone
    // reaches this route. Answering with a blank page would read as a broken site to someone
    // who has no patience left for one.
    await expect(
      page.getByRole("heading", { name: copyPublic.articleNotFoundTitle }),
    ).toBeVisible();
    await expect(page.getByText(copyPublic.articleNotFoundBody)).toBeVisible();
    await expect(page.getByRole("link", { name: copyPublic.articleCtaButton })).toBeVisible();
  });

  test("a guide reads as an article, framed as general information", async ({ page }) => {
    // Known defect, deliberately recorded rather than deleted. features/content/content.ts holds
    // an empty `articles` map, so every /guides/:slug answers "Article introuvable". The route
    // ships in the production build regardless, which makes the SEO entry funnel a live address
    // that tells search engines and people alike that the article does not exist. Either the
    // guides get written or the route stops shipping, and both are product calls. Playwright
    // fails the run the day this starts passing.
    test.fail();
    // Guides are how someone finds this service at all: a search for what to do after a death
    // lands on one, and it is the first page of the product they ever see. It has to be an
    // article, and it has to carry the notice saying this informs rather than advises.
    await page.goto("/guides/que-faire-apres-un-deces");

    await expect(page.getByRole("heading", { level: 1 })).not.toHaveText(
      copyPublic.articleNotFoundTitle,
    );
    await expect(page.getByText(copyPublic.generalInformationNotice)).toBeVisible();
    await expect(page.getByText(copyPublic.articleCtaTitle)).toBeVisible();
  });

  test("a signed-out visitor is offered the ways in, and none of the ways into a dossier", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page.getByRole("link", { name: copy.landingCta })).toHaveAttribute(
      "href",
      "/diagnostic",
    );
    await expect(page.getByRole("link", { name: copyPublic.footerSignup })).toHaveAttribute(
      "href",
      "/inscription",
    );
    await expect(page.getByRole("link", { name: copyPublic.footerLogin })).toHaveAttribute(
      "href",
      "/connexion",
    );
    await expect(page.getByRole("link", { name: copyPublic.footerLegalNotice })).toBeVisible();
    await expect(page.getByRole("link", { name: copyPublic.footerPrivacy })).toBeVisible();
    await expect(page.getByRole("link", { name: copyPublic.footerTerms })).toBeVisible();

    // The signed-in header belongs to a session. Offering a stranger a way into a dossier, or
    // into the back office, would be an invitation to a screen that can only refuse them.
    await expect(page.locator(PRIVATE_CHROME)).toHaveCount(0);
    await expect(
      page.locator('a[href^="/dossiers"], a[href^="/mes-dossiers"], a[href^="/admin"]'),
    ).toHaveCount(0);
  });

  test("a signed-out visitor asking for a dossier lands on the login screen", async ({ page }) => {
    await watchForPrivateChrome(page);

    for (const route of PRIVATE_ROUTES) {
      await page.goto(route);

      await expect(page, `after asking for ${route}`).toHaveURL(/\/connexion/);
      await expect(page.getByRole("button", { name: copy.submitLogin })).toBeVisible();
      await expect(page.getByText(copyPublic.myDossiers, { exact: true })).toHaveCount(0);
    }

    // Someone else's furniture, even for a frame, is the difference between "you need to sign
    // in" and "this site just showed me an account that is not mine".
    expect(await sawPrivateChrome(page)).toBe(false);
  });

  for (const route of ENTRY_FUNNEL) {
    test(`${route} names its main region`, async ({ page }) => {
      // Known defect, deliberately recorded rather than deleted. No screen in the app renders a
      // main landmark or a skip link: pages compose their own container div, and the only shared
      // wrapper is RequireAuth, which covers the signed-in half. Giving every route a main means
      // restructuring the route table around a layout, which is a change worth reviewing on its
      // own rather than buried here. Playwright fails the run the day this starts passing.
      if (route !== "/") test.fail();
      // A screen reader user, and every browser's own reader mode, find the content of a page
      // through its main landmark. Without one, the only way past the repeated furniture is to
      // read the document from the top every time, which is the cost this keeps off people who
      // are grieving and often older.
      await page.goto(route);
      await expect(page.locator("main, [role=main]")).toHaveCount(1);
    });

    test(`${route} starts at a level 1 heading and never skips a level`, async ({ page }) => {
      // Headings are the table of contents a screen reader reads out. Exactly one level 1 says
      // what the page is, and a jump of more than one level down says a section went missing.
      await page.goto(route);
      await waitForScreen(page);
      const levels = await headingLevels(page);

      expect(levels.filter((level) => level === 1)).toHaveLength(1);
      expect(levels[0]).toBe(1);

      levels.forEach((level, index) => {
        const previous = levels[index - 1];
        if (previous === undefined) return;
        expect(level - previous).toBeLessThanOrEqual(1);
      });
    });

    test(`${route} gives every image an alternative`, async ({ page }) => {
      // An image with no alt attribute is announced as its file name, or not at all. Asserted
      // over the page rather than over the images that happen to exist today, so the first
      // decorative flourish someone adds arrives with its alternative or fails here.
      await page.goto(route);
      await waitForScreen(page);
      expect(await imagesWithoutAlternative(page)).toEqual([]);
    });
  }

  /**
   * The budget: three tab stops from a fresh page to the way in.
   *
   * It used to be one, because the page opened straight onto its call to action. The redesign
   * gave the homepage a header, so the brand and the login link now stand in front of it, and
   * this number moved with the design rather than the assertion being dropped. Anyone using a
   * keyboard, a switch or a screen reader arrives at the top of the document with no way to skip
   * the furniture, so how much furniture there is is the whole of their first impression.
   */
  const TAB_STOPS_TO_THE_WAY_IN = 3;

  test("the landing page puts the way in within reach of the keyboard", async ({ page }) => {
    await page.goto("/");

    for (let stop = 0; stop < TAB_STOPS_TO_THE_WAY_IN; stop += 1) {
      await page.keyboard.press("Tab");
      const focused = page.locator(":focus");
      if ((await focused.getAttribute("href")) === "/diagnostic") {
        await page.keyboard.press("Enter");
        await expect(page).toHaveURL(/\/diagnostic$/);
        return;
      }
    }

    throw new Error(`No way into the diagnostic within ${TAB_STOPS_TO_THE_WAY_IN} tab stops`);
  });

  test("the diagnostic can be answered with the keyboard alone", async ({ page }) => {
    await page.goto("/diagnostic");
    const step = wizardStep(page);
    const firstQuestion = await step.innerText();

    // The wizard is a radio group and two buttons, and it is the only way into the product.
    // Someone who cannot use a pointer has to be able to reach an option, choose it and move on,
    // without ever having touched a mouse.
    await page.keyboard.press("Tab");
    await expect(page.getByRole("radio").first()).toBeFocused();

    await page.keyboard.press("Space");
    await expect(page.getByRole("radio").first()).toBeChecked();

    await page.getByRole("button", { name: copy.next }).focus();
    await page.keyboard.press("Enter");
    await expect(step).not.toHaveText(firstQuestion);
  });
});
