import { expect, test } from "@playwright/test";
import { createDossier, logIn, TEST_PASSWORD, uniqueEmail } from "#e2e/support/app";
import { copy } from "#e2e/support/copy";
import {
  createConfirmedAccount,
  designateConsentedTrustedContact,
  dossierStatus,
  expireActivationGrace,
  membershipRole,
  notificationCount,
  requestActivation,
  runCronJob,
} from "#e2e/support/backend";

/**
 * Activation is the most consequential thing that happens to a dossier: it turns a private
 * preparation space into one every relative can see, and it is triggered by someone reporting a
 * death. The 48-hour grace period exists so that a mistake, or an abuse, can still be stopped.
 *
 * Nothing else in the repo covers it end to end. The engine has no say in it, the policies do
 * not decide it, and the job that carries it out runs on a schedule nobody watches. What is
 * asserted here is the pair that matters: the delay elapses and the dossier activates, or
 * someone objects within it and the dossier stays exactly where it was.
 *
 * The report itself arrives through a link sent by email, which local development never sends,
 * so the token is planted before being spent against the real endpoint. Everything after it, what
 * the owner sees, what they can do about it, what the job then does, goes through the app.
 */

test.describe("activation and its 48-hour grace period", () => {
  test("a dossier activates once the grace period has elapsed", async ({ page }) => {
    const ownerEmail = uniqueEmail("grace-owner");
    const ownerId = await createConfirmedAccount(ownerEmail, TEST_PASSWORD, "Camille");
    const trustedEmail = uniqueEmail("grace-trusted");
    const trustedId = await createConfirmedAccount(trustedEmail, TEST_PASSWORD, "Claude");
    await logIn(page, ownerEmail);

    const dossierId = await createDossier(page, "preparation");
    expect(await dossierStatus(dossierId)).toBe("PREPARATION");
    await designateConsentedTrustedContact(dossierId, trustedId, trustedEmail, ownerId, "owner");

    await requestActivation(dossierId, "2026-05-04");

    // The owner is told, and told when: an activation that happened silently would defeat the
    // point of having a delay at all.
    await page.goto(`/dossiers/${dossierId}`);
    await expect(page.getByText(copy.activationPending)).toBeVisible();

    await expireActivationGrace(dossierId);
    await runCronJob("process-dossier-activations");

    expect(await dossierStatus(dossierId)).toBe("ACTIVE");
    expect(await membershipRole(dossierId, ownerId)).toBe("collaborator");
    expect(await membershipRole(dossierId, trustedId)).toBe("owner");

    // Every member is told the dossier activated, the demoted owner and the promoted
    // trusted contact alike: an activation nobody hears about defeats the grace period.
    expect(await notificationCount(dossierId, ownerId, "dossier_activated")).toBeGreaterThan(0);
    expect(await notificationCount(dossierId, trustedId, "dossier_activated")).toBeGreaterThan(0);
  });

  test("an objection within the grace period stops the activation", async ({ page }) => {
    const ownerEmail = uniqueEmail("oppose-owner");
    const ownerId = await createConfirmedAccount(ownerEmail, TEST_PASSWORD, "Camille");
    const trustedEmail = uniqueEmail("oppose-trusted");
    const trustedId = await createConfirmedAccount(trustedEmail, TEST_PASSWORD, "Claude");
    await logIn(page, ownerEmail);

    const dossierId = await createDossier(page, "preparation");
    await designateConsentedTrustedContact(dossierId, trustedId, trustedEmail, ownerId, "owner");
    await requestActivation(dossierId, "2026-05-04");

    await page.goto(`/dossiers/${dossierId}`);
    await expect(page.getByText(copy.activationPending)).toBeVisible();

    await page.getByRole("button", { name: copy.opposeActivation }).click();
    await page.getByRole("button", { name: copy.confirmOpposition }).click();

    // The countdown is gone from the screen: nothing is pending any more.
    await expect(page.getByText(copy.activationPending)).toBeHidden();

    // The objection has to survive the deadline passing: a dossier that activated anyway once
    // the timer ran out would make the objection a message rather than a brake.
    await expireActivationGrace(dossierId);
    await runCronJob("process-dossier-activations");

    expect(await dossierStatus(dossierId)).toBe("PREPARATION");
    expect(await membershipRole(dossierId, ownerId)).toBe("owner");
    expect(await membershipRole(dossierId, trustedId)).toBe("trusted_contact");
  });

  test("the job leaves a dossier nobody reported alone", async ({ page }) => {
    const ownerEmail = uniqueEmail("untouched-owner");
    await createConfirmedAccount(ownerEmail, TEST_PASSWORD, "Camille");
    await logIn(page, ownerEmail);

    const dossierId = await createDossier(page, "preparation");
    await runCronJob("process-dossier-activations");

    expect(await dossierStatus(dossierId)).toBe("PREPARATION");
  });
});
