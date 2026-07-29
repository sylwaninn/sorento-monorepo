import { expect, test } from "@playwright/test";
import {
  createDossier,
  DIAGNOSTIC_SUBJECT_NAME,
  inviteRelative,
  logIn,
  pathOf,
  TEST_PASSWORD,
  uniqueEmail,
} from "#e2e/support/app";
import { copy } from "#e2e/support/copy";
import { createConfirmedAccount, membershipRole } from "#e2e/support/backend";

/**
 * A dossier is a collaborative space, so the invitation is the mechanism the whole sharing model
 * rests on. It crosses every layer at once: a screen, an Edge Function running as service_role,
 * a hashed token, an RLS policy that has to start letting a second person read rows they could
 * not see a moment earlier.
 *
 * The RLS suites prove a non-member is refused. Only a journey can prove the invited person
 * stops being one.
 */

test.describe("inviting a relative into a dossier", () => {
  test("an invited relative joins and sees the dossier", async ({ page, browser }) => {
    const ownerEmail = uniqueEmail("owner");
    const guestEmail = uniqueEmail("guest");
    await createConfirmedAccount(ownerEmail, TEST_PASSWORD, "Camille");
    const guestId = await createConfirmedAccount(guestEmail, TEST_PASSWORD, "Dominique");

    await logIn(page, ownerEmail);
    const dossierId = await createDossier(page, "death");
    const acceptUrl = await inviteRelative(page, dossierId, guestEmail);

    // Before accepting, the guest is a stranger to this dossier as far as the policies go.
    expect(await membershipRole(dossierId, guestId)).toBeUndefined();

    const guestContext = await browser.newContext();
    const guestPage = await guestContext.newPage();
    try {
      await logIn(guestPage, guestEmail);
      await guestPage.goto(pathOf(acceptUrl));

      // Joining is a deliberate act, not a side effect of opening a link: the screen names the
      // dossier and the role before anything is granted.
      await expect(guestPage.getByText(copy.invitedToJoin)).toBeVisible();
      await guestPage.getByRole("button", { name: copy.acceptInvitation }).click();

      await expect(guestPage).toHaveURL(/\/dossiers\/[0-9a-f-]{36}/, { timeout: 30_000 });
      await expect(guestPage.getByText(DIAGNOSTIC_SUBJECT_NAME)).toBeVisible();

      expect(await membershipRole(dossierId, guestId)).toBe("collaborator");
    } finally {
      await guestContext.close();
    }
  });

  test("a link addressed to someone else does not let its holder in", async ({ page, browser }) => {
    const ownerEmail = uniqueEmail("owner");
    const invitedEmail = uniqueEmail("invited");
    const outsiderEmail = uniqueEmail("outsider");
    await createConfirmedAccount(ownerEmail, TEST_PASSWORD, "Camille");
    await createConfirmedAccount(invitedEmail, TEST_PASSWORD, "Dominique");
    const outsiderId = await createConfirmedAccount(outsiderEmail, TEST_PASSWORD, "Sacha");

    await logIn(page, ownerEmail);
    const dossierId = await createDossier(page, "death");
    const acceptUrl = await inviteRelative(page, dossierId, invitedEmail);

    // An invitation is addressed to a person, not to whoever ends up holding the link: a
    // forwarded email must not be a way into someone's dossier.
    const outsiderContext = await browser.newContext();
    const outsiderPage = await outsiderContext.newPage();
    try {
      await logIn(outsiderPage, outsiderEmail);
      await outsiderPage.goto(pathOf(acceptUrl));

      await expect(outsiderPage).not.toHaveURL(new RegExp(`/dossiers/${dossierId}$`));
      expect(await membershipRole(dossierId, outsiderId)).toBeUndefined();
    } finally {
      await outsiderContext.close();
    }
  });
});
