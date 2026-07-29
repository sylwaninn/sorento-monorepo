import { expect, test } from "@playwright/test";
import { completeDiagnostic, copy, logIn, TEST_PASSWORD, uniqueEmail } from "#e2e/support/app";
import { createConfirmedAccount } from "#e2e/support/backend";

/**
 * The funnel the whole product rests on: someone answers the diagnostic, and the journey their
 * answers produced becomes a dossier they can work through.
 *
 * Every layer already has its own tests: the engine's rules, the schemas, the policies, the
 * screens in isolation. None of them can fail when the pieces disagree: answers persisted under
 * one key and read under another, a session that arrives after the redirect, a dossier created
 * without the diagnostic attached. That is the whole reason this test exists.
 */

test.describe("from the diagnostic to a dossier", () => {
  test("an anonymous visitor gets a synthesis and is offered an account", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: copy.landingCta }).click();
    await expect(page).toHaveURL(/\/diagnostic$/);

    await completeDiagnostic(page);
    await expect(page).toHaveURL(/\/diagnostic\/resultat/);

    // The synthesis is the argument for creating an account, so it has to say something before
    // the account exists: putting it behind the signup wall would invert the funnel.
    await expect(page.getByText(/démarches identifiées/)).toBeVisible();

    // Cautious wording about entitlements is a compliance rule, not a style preference.
    await expect(page.getByText(/ne constituent pas un conseil individuel/)).toBeVisible();

    await expect(page.getByRole("link", { name: copy.signupFromResult })).toHaveAttribute(
      "href",
      "/inscription",
    );
  });

  test("a signed-in visitor turns their diagnostic into a dossier", async ({ page }) => {
    const email = uniqueEmail("funnel");
    await createConfirmedAccount(email, TEST_PASSWORD, "Camille");
    await logIn(page, email);

    await page.goto("/diagnostic");
    await completeDiagnostic(page);
    await expect(page).toHaveURL(/\/diagnostic\/resultat/);

    await page.getByRole("button", { name: copy.createDossierFromResult }).click();

    // The answers were given in the browser's session, not in the database. The dossier carrying
    // the name typed into the diagnostic is what proves they crossed over and were attached,
    // rather than an empty dossier being created next to answers that were dropped.
    await expect(page).toHaveURL(/\/dossiers\/[0-9a-f-]{36}/, { timeout: 30_000 });
    await expect(page.getByText(/Jean Dupont/)).toBeVisible();
  });

  test("an unfinished diagnostic does not pretend to have a result", async ({ page }) => {
    await page.goto("/diagnostic/resultat");

    await expect(page.getByText(/Aucun diagnostic en cours/)).toBeVisible();
    await expect(page.getByRole("link", { name: /Recommencer le diagnostic/ })).toBeVisible();
  });

  test("answers survive a reload mid-diagnostic", async ({ page }) => {
    await page.goto("/diagnostic");
    await page.getByRole("radio").first().check({ force: true });
    await page.getByRole("button", { name: copy.next }).click();

    const step = page.locator("[data-slot=card-content]").first();
    const secondQuestion = await step.innerText();

    await page.reload();

    // The wizard resumes at the first unanswered question, so reopening on the same step is what
    // proves the answers survived. Restarting from question one is what data loss looks like to
    // a bereaved user who refreshed the page.
    await expect(step).toHaveText(secondQuestion);
  });
});
