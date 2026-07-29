import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  createDossier,
  DIAGNOSTIC_SUBJECT_NAME,
  logIn,
  TEST_PASSWORD,
  uniqueEmail,
} from "#e2e/support/app";
import { createConfirmedAccount, rest } from "#e2e/support/backend";
import { copyAdmin } from "#e2e/support/copy-admin";

/**
 * The back office, and the line CLAUDE.md draws around it: the platform admin curates the
 * catalog everyone's journey is computed from, and has no access to any user's dossier,
 * tracking, comments or documents.
 *
 * Both halves are asserted from a browser, because both are decided in three places at once. A
 * policy that lets an admin read a dossier and a screen that never asks for one look identical
 * from the outside until someone types the URL.
 */

/** Every screen behind RequireAdmin, with the heading that proves it finished rendering. */
const ADMIN_SCREENS = [
  { path: "/admin", heading: copyAdmin.homeTitle },
  { path: "/admin/referentiel", heading: copyAdmin.catalogTitle },
  { path: "/admin/historique", heading: copyAdmin.historyTitle },
  { path: "/admin/test-profil", heading: copyAdmin.testingTitle },
  { path: "/admin/statistiques", heading: copyAdmin.metricsTitle },
] as const;

let sequence = 0;

/** Unique per call and per worker, so parallel journeys never collide on a catalog code. */
const uniqueSuffix = (): string => {
  sequence += 1;
  return `${process.pid}-${Date.now()}-${sequence}`;
};

/**
 * An account becomes an admin by its profile row, which no screen can set: the back office is
 * granted out of band, exactly as it is in the integration suite. Done before the first sign-in
 * so the session starts out already holding the role.
 */
const promoteToAdmin = async (userId: string): Promise<void> => {
  await rest(`/rest/v1/profiles?id=eq.${userId}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ role: "admin" }),
  });
};

const signInAsAdmin = async (page: Page, prefix: string): Promise<string> => {
  const email = uniqueEmail(prefix);
  const userId = await createConfirmedAccount(email, TEST_PASSWORD, "Alex");
  await promoteToAdmin(userId);
  await logIn(page, email);
  return userId;
};

interface CatalogRow {
  id: string;
  source_url: string;
  last_verified_date: string;
}

interface BenefitRow extends CatalogRow {
  caution_text: string;
}

const proceduresWithCode = (code: string): Promise<CatalogRow[]> =>
  rest<CatalogRow[]>(`/rest/v1/procedures?select=id,source_url,last_verified_date&code=eq.${code}`);

const benefitsWithCode = (code: string): Promise<BenefitRow[]> =>
  rest<BenefitRow[]>(
    `/rest/v1/benefits?select=id,source_url,last_verified_date,caution_text&code=eq.${code}`,
  );

/**
 * The line of the catalog list carrying one entry, found by its own title rather than by its
 * position: the list holds the whole seeded referential plus whatever other journeys are
 * creating at the same moment, so an index would name a different row on every run.
 */
const catalogRow = (page: Page, title: string): Locator =>
  page
    .locator("div")
    .filter({ hasText: title })
    .filter({ has: page.getByRole("button", { name: copyAdmin.deleteButton }) })
    .last();

const metricValue = (page: Page, label: string): Locator =>
  page.locator("[data-slot=card-content]").filter({ hasText: label }).getByRole("heading");

const fillProcedureForm = async (
  page: Page,
  fields: { code: string; title: string; organization: string; sourceUrl: string },
): Promise<void> => {
  await page.getByRole("textbox", { name: copyAdmin.procedureCode }).fill(fields.code);
  await page.getByRole("textbox", { name: copyAdmin.procedureTitle }).fill(fields.title);
  await page
    .getByRole("textbox", { name: copyAdmin.procedureDescription })
    .fill("Entrée créée par un parcours de test.");
  await page
    .getByRole("textbox", { name: copyAdmin.procedureOrganization })
    .fill(fields.organization);
  await page.getByRole("textbox", { name: copyAdmin.sourceUrlLabel }).fill(fields.sourceUrl);
};

test.describe("the back office", () => {
  test("an ordinary user reaches none of the admin screens", async ({ page }) => {
    const email = uniqueEmail("admin-outsider");
    await createConfirmedAccount(email, TEST_PASSWORD, "Camille");
    await logIn(page, email);

    // Asserted for every route rather than for the entry point: a guard applied to the index
    // and forgotten on one of the tools it links to is the shape this failure actually takes.
    for (const screen of ADMIN_SCREENS) {
      await page.goto(screen.path);

      await expect(page, `after asking for ${screen.path}`).toHaveURL(/\/mes-dossiers/);
      await expect(page.getByText(copyAdmin.myDossiers, { exact: true })).toBeVisible();
      await expect(page.getByRole("heading", { name: screen.heading })).toHaveCount(0);
    }
  });

  test("an admin reaches every tool the back office offers", async ({ page }) => {
    await signInAsAdmin(page, "admin-index");

    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: copyAdmin.homeTitle })).toBeVisible();

    for (const label of [
      copyAdmin.linkCatalog,
      copyAdmin.linkHistory,
      copyAdmin.linkTesting,
      copyAdmin.linkMetrics,
    ]) {
      await expect(page.getByRole("link", { name: label })).toBeVisible();
    }

    for (const screen of ADMIN_SCREENS) {
      await page.goto(screen.path);
      await expect(page.getByRole("heading", { name: screen.heading })).toBeVisible();
    }
  });

  test("an admin creates, edits and deletes an entry of the catalog", async ({ page }) => {
    await signInAsAdmin(page, "admin-catalog");

    const suffix = uniqueSuffix();
    const code = `e2e-procedure-${suffix}`;
    const title = `Démarche de test ${suffix}`;
    const editedTitle = `Démarche relue ${suffix}`;

    await page.goto("/admin/referentiel");
    await expect(page.getByText(copyAdmin.seededCivilStatusProcedure)).toBeVisible();

    await page.getByRole("button", { name: copyAdmin.addButton }).click();
    await fillProcedureForm(page, {
      code,
      title,
      organization: "Organisme de test",
      sourceUrl: "https://www.service-public.fr/e2e",
    });

    // Left out of the parcours on purpose. The catalog is shared by every dossier in the stack,
    // so a journey that switched an entry on would change what other journeys are being told.
    await page.getByRole("checkbox", { name: copyAdmin.activeInJourney }).uncheck({ force: true });
    await page.getByRole("button", { name: copyAdmin.saveButton }).click();

    await expect(page.getByText(title)).toBeVisible();

    await catalogRow(page, title).getByRole("button", { name: copyAdmin.editButton }).click();
    await page.getByRole("textbox", { name: copyAdmin.procedureTitle }).fill(editedTitle);
    await page.getByRole("button", { name: copyAdmin.saveButton }).click();

    // The old wording disappearing is the half that proves an edit rather than a second entry.
    await expect(page.getByText(editedTitle)).toBeVisible();
    await expect(page.getByText(title, { exact: true })).toHaveCount(0);

    await catalogRow(page, editedTitle)
      .getByRole("button", { name: copyAdmin.deleteButton })
      .click();
    await page.getByRole("button", { name: copyAdmin.deleteConfirmButton }).click();

    await expect(page.getByText(editedTitle)).toHaveCount(0);
    expect(await proceduresWithCode(code)).toEqual([]);
  });

  test("the catalog refuses an entry that does not say where it came from", async ({ page }) => {
    await signInAsAdmin(page, "admin-source");

    const suffix = uniqueSuffix();
    const code = `e2e-unsourced-${suffix}`;

    await page.goto("/admin/referentiel");
    await page.getByRole("button", { name: copyAdmin.addButton }).click();
    await fillProcedureForm(page, {
      code,
      title: `Démarche sans source ${suffix}`,
      organization: "Organisme de test",
      sourceUrl: "",
    });
    await page.getByRole("button", { name: copyAdmin.saveButton }).click();

    // CLAUDE.md makes the source and the verification date part of what a piece of catalog data
    // is, because every screen showing one has to be able to tell a family where the rule comes
    // from and when it was last checked. An entry saved without them would be an assertion
    // about someone's rights that nobody can trace.
    expect(await proceduresWithCode(code)).toEqual([]);
    await expect(page.getByRole("textbox", { name: copyAdmin.sourceUrlLabel })).toBeVisible();
  });

  test("a benefit an admin creates keeps its source, its date and its caution", async ({
    page,
  }) => {
    await signInAsAdmin(page, "admin-benefit");

    const suffix = uniqueSuffix();
    const code = `e2e-benefit-${suffix}`;
    const title = `Aide de test ${suffix}`;
    const sourceUrl = "https://www.service-public.fr/e2e-aide";
    const cautionText =
      "Les personnes dans une situation comme la vôtre peuvent avoir droit à cette aide.";

    await page.goto("/admin/referentiel");
    await page.getByRole("tab", { name: copyAdmin.tabBenefits }).click();
    await page.getByRole("button", { name: copyAdmin.addButton }).click();

    await page.getByRole("textbox", { name: copyAdmin.procedureCode }).fill(code);
    await page.getByRole("textbox", { name: copyAdmin.procedureTitle }).fill(title);
    await page
      .getByRole("textbox", { name: copyAdmin.benefitMainCondition })
      .fill("Condition de test.");
    await page
      .getByRole("textbox", { name: copyAdmin.procedureOrganization })
      .fill("Organisme de test");
    await page
      .getByRole("textbox", { name: copyAdmin.benefitFormUrl })
      .fill("https://www.service-public.fr/e2e-formulaire");
    await page.getByRole("textbox", { name: copyAdmin.benefitCautionText }).fill(cautionText);
    await page.getByRole("textbox", { name: copyAdmin.sourceUrlLabel }).fill(sourceUrl);
    await page.getByRole("checkbox", { name: copyAdmin.activeInJourney }).uncheck({ force: true });
    await page.getByRole("button", { name: copyAdmin.saveButton }).click();

    await expect(page.getByText(title)).toBeVisible();

    // Read back from the row rather than from the screen that just wrote it: the three fields
    // are what every component displaying this benefit is required to have, so the entry has to
    // arrive in the database carrying them, not merely be shown with them in a form.
    const [stored] = await benefitsWithCode(code);
    expect(stored).toBeDefined();
    expect(stored?.source_url).toBe(sourceUrl);
    expect(stored?.caution_text).toBe(cautionText);
    expect(stored?.last_verified_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    await catalogRow(page, title).getByRole("button", { name: copyAdmin.deleteButton }).click();
    await page.getByRole("button", { name: copyAdmin.deleteConfirmButton }).click();
    await expect(page.getByText(title)).toHaveCount(0);
  });

  test("a catalog change is journalled, and says who made it", async ({ page }) => {
    const adminId = await signInAsAdmin(page, "admin-history");

    const suffix = uniqueSuffix();
    const code = `e2e-journalled-${suffix}`;
    const title = `Démarche journalisée ${suffix}`;

    await page.goto("/admin/referentiel");
    await page.getByRole("button", { name: copyAdmin.addButton }).click();
    await fillProcedureForm(page, {
      code,
      title,
      organization: "Organisme de test",
      sourceUrl: "https://www.service-public.fr/e2e-journal",
    });
    await page.getByRole("checkbox", { name: copyAdmin.activeInJourney }).uncheck({ force: true });
    await page.getByRole("button", { name: copyAdmin.saveButton }).click();
    await expect(page.getByText(title)).toBeVisible();

    const [created] = await proceduresWithCode(code);
    expect(created).toBeDefined();
    const createdId = created?.id;
    if (createdId === undefined) throw new Error(`no procedure was created for ${code}`);

    await page.goto("/admin/historique");

    // A referential everyone's journey is computed from is only as trustworthy as the record of
    // who changed it and when. An entry attributed to nobody is the same as no entry.
    await expect(page.getByText(createdId)).toBeVisible();
    await expect(page.getByText(adminId).first()).toBeVisible();
    await expect(page.getByText(copyAdmin.historyCreated).first()).toBeVisible();

    await page.goto("/admin/referentiel");
    await catalogRow(page, title).getByRole("button", { name: copyAdmin.deleteButton }).click();
    await page.getByRole("button", { name: copyAdmin.deleteConfirmButton }).click();
    await expect(page.getByText(title)).toHaveCount(0);
  });

  test("the profile sandbox answers a situation with a plausible journey", async ({ page }) => {
    await signInAsAdmin(page, "admin-profile");

    await page.goto("/admin/test-profil");
    await expect(page.getByText(copyAdmin.testingNotice)).toBeVisible();
    await expect(page.getByText(copyAdmin.testingProceduresTitle)).toBeVisible();
    await expect(page.getByText(copyAdmin.testingBenefitsTitle)).toBeVisible();

    // The locale is pinned to fr-FR, so the segments read day, month, year and eight digits
    // typed into the first one fill all three.
    await page.getByRole("spinbutton").first().click();
    await page.keyboard.type("01012026");

    // The tool is worth having only if it answers a change of situation with a change of
    // journey. A survivor pension is the clearest case: it belongs to a spouse and to nobody
    // else, so it has to appear for one answer and disappear for the other.
    await expect(
      page.getByText(copyAdmin.seededSurvivorPensionBenefit, { exact: true }),
    ).toHaveCount(0);

    await page.getByRole("radio", { name: copyAdmin.maritalStatusMarried }).check({ force: true });

    await expect(
      page.getByText(copyAdmin.seededSurvivorPensionProcedure, { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(copyAdmin.seededSurvivorPensionBenefit, { exact: true }),
    ).toBeVisible();

    await page.getByRole("radio", { name: copyAdmin.maritalStatusSingle }).check({ force: true });

    await expect(
      page.getByText(copyAdmin.seededSurvivorPensionProcedure, { exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByText(copyAdmin.seededSurvivorPensionBenefit, { exact: true }),
    ).toHaveCount(0);
  });

  test("the metrics screen counts real people and real dossiers", async ({ page, browser }) => {
    const relativeContext = await browser.newContext();
    const relativePage = await relativeContext.newPage();
    const relativeEmail = uniqueEmail("admin-metrics-user");
    await createConfirmedAccount(relativeEmail, TEST_PASSWORD, "Sasha");
    await logIn(relativePage, relativeEmail);
    await createDossier(relativePage, "preparation");

    await signInAsAdmin(page, "admin-metrics");
    await page.goto("/admin/statistiques");

    await expect(page.getByText(copyAdmin.metricsNotice)).toBeVisible();
    await expect(page.getByText(copyAdmin.metricsDossiersByStatus)).toBeVisible();
    await expect(page.getByText(copyAdmin.metricsStatusPreparation)).toBeVisible();

    // A screen of zeroes and a screen wired to nothing look the same. The dossier just created
    // in the other browser is what makes these numbers answerable.
    const users = Number(await metricValue(page, copyAdmin.metricsTotalUsers).innerText());
    const dossiers = Number(await metricValue(page, copyAdmin.metricsTotalDossiers).innerText());
    expect(users).toBeGreaterThan(0);
    expect(dossiers).toBeGreaterThan(0);

    await relativeContext.close();
  });

  test("an admin sees nothing of a stranger's dossier", async ({ page, browser }) => {
    const ownerContext = await browser.newContext();
    const ownerPage = await ownerContext.newPage();
    const ownerEmail = uniqueEmail("admin-isolation-owner");
    await createConfirmedAccount(ownerEmail, TEST_PASSWORD, "Nour");
    await logIn(ownerPage, ownerEmail);
    const dossierId = await createDossier(ownerPage, "death");
    await expect(ownerPage.getByText(DIAGNOSTIC_SUBJECT_NAME)).toBeVisible();

    await signInAsAdmin(page, "admin-isolation");

    // CLAUDE.md states it without an exception: the platform admin has no access to users'
    // dossiers, tracking, comments or documents. Typing the address is the whole attack, so
    // that is what is driven here, from the admin's own signed-in browser.
    for (const path of ["", "/membres", "/documents", "/activite"]) {
      await page.goto(`/dossiers/${dossierId}${path}`);
      await expect(page.getByText(DIAGNOSTIC_SUBJECT_NAME)).toHaveCount(0);
    }

    await page.goto(`/dossiers/${dossierId}`);
    await expect(page.getByText(copyAdmin.dossierOutOfReach)).toBeVisible();

    await page.goto("/mes-dossiers");
    await expect(page.getByText(copyAdmin.myDossiers, { exact: true })).toBeVisible();
    await expect(page.getByText(DIAGNOSTIC_SUBJECT_NAME)).toHaveCount(0);
    await expect(page.locator(`a[href="/dossiers/${dossierId}"]`)).toHaveCount(0);

    // The back office is the other way in, and the more dangerous one: a tool built to look at
    // the whole platform is where a dossier's contents would surface without anyone meaning it.
    for (const screen of ADMIN_SCREENS) {
      await page.goto(screen.path);
      await expect(page.getByRole("heading", { name: screen.heading })).toBeVisible();
      await expect(page.getByText(DIAGNOSTIC_SUBJECT_NAME)).toHaveCount(0);
      await expect(page.getByText(dossierId)).toHaveCount(0);
    }

    await ownerContext.close();
  });
});
