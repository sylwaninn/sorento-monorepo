import { createHash, randomBytes } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import {
  createDossier,
  DIAGNOSTIC_SUBJECT_NAME,
  logIn,
  pathOf,
  TEST_PASSWORD,
  uniqueEmail,
} from "#e2e/support/app";
import { copy } from "#e2e/support/copy";
import { trustedContactCopy } from "#e2e/support/copy-trusted-contact";
import { createConfirmedAccount, dossierStatus, membershipRole, rest } from "#e2e/support/backend";

/**
 * How someone becomes a trusted contact, which is the designation the rest of the suite assumes
 * has already happened. activation-grace.e2e.ts starts from a consented contact seeded through
 * service_role; nothing covers the road to that row, and it is a long one: an owner's screen, an
 * Edge Function running as service_role, a token in an email, a second account, and a consent
 * that has to name the person rather than whoever holds the link.
 *
 * The invariant hanging over all of it: a designated trusted contact sees nothing at all while
 * the dossier is in preparation. They are named in a plan for a death that has not happened, and
 * the dossier holds the intimate contents of a life being tidied up.
 */

const OWNER_FIRST_NAME = "Camille";

/**
 * HeroUI renders a Select as a button opening a listbox in a popover, and that button's
 * accessible name is its label followed by the value it currently shows.
 */
const chooseInSelect = async (page: Page, label: string, option: string): Promise<void> => {
  await page.getByRole("button", { name: label }).first().click();
  await page.getByRole("option", { name: option }).click();
};

const designateTrustedContact = async (
  page: Page,
  dossierId: string,
  email: string,
  futureRole: string,
): Promise<void> => {
  await page.goto(`/dossiers/${dossierId}/contact-de-confiance`);
  await page.getByRole("textbox", { name: trustedContactCopy.emailLabel }).fill(email);
  await chooseInSelect(page, trustedContactCopy.futureRoleLabel, futureRole);
  await page.getByRole("button", { name: trustedContactCopy.designate }).click();
  // The designation row is created by an Edge Function, and the acknowledgement is the only
  // thing on screen saying the round trip is over.
  await expect(page.getByText(trustedContactCopy.designationSent)).toBeVisible();
};

/**
 * The consent link, as the designated person receives it.
 *
 * It travels by email and the local stack sends none: _shared/mailer.ts skips silently without a
 * provider key, so the token designate-trusted-contact minted exists nowhere a test could read
 * it, and the designation screen does not surface it the way the invitation screen does. Only
 * that one step is faked. The token is planted on the row the real function created, hashed
 * exactly as _shared/token.ts hashes it, and then spent through the real screen against the real
 * endpoint. backend.ts does the same for the activation link one step further along.
 */
const consentLinkFor = async (dossierId: string): Promise<string> => {
  const token = randomBytes(32).toString("hex");
  const planted = await rest<unknown[]>(
    `/rest/v1/trusted_contact_designations?dossier_id=eq.${dossierId}&revoked_at=is.null`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        consent_token_hash: createHash("sha256").update(token).digest("hex"),
        consent_expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      }),
    },
  );
  if (planted.length === 0) {
    throw new Error(`dossier ${dossierId} has no live designation to confirm`);
  }
  return `/contact-confiance/confirmer?token=${token}`;
};

/**
 * The activation link the consent screen hands back, as the person keeps it.
 *
 * Located by its route rather than by its label: that label is written inline in the screen and
 * belongs to no content dictionary, so there is nothing for check:tests to compare it against.
 */
const activationLinkOn = async (page: Page): Promise<string> => {
  const href = await page
    .locator('a[href*="/contact-confiance/activer"]')
    .first()
    .getAttribute("href");
  if (href === null) throw new Error("the consent screen handed back no activation link");
  return pathOf(href);
};

/**
 * Brings the activation link's expiry forward instead of waiting a year. The endpoint compares
 * the stored deadline against now(), so a deadline in the past is the state the link reaches on
 * its own once its long life is over.
 */
const expireActivationLink = async (dossierId: string): Promise<void> => {
  await rest(`/rest/v1/trusted_contact_designations?dossier_id=eq.${dossierId}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ activation_expires_at: new Date(Date.now() - 60_000).toISOString() }),
  });
};

test.describe("designating a trusted contact", () => {
  test("a designated relative confirms, and the owner sees the designation is live", async ({
    page,
    browser,
  }) => {
    const ownerEmail = uniqueEmail("designate-owner");
    const trustedEmail = uniqueEmail("designate-trusted");
    await createConfirmedAccount(ownerEmail, TEST_PASSWORD, OWNER_FIRST_NAME);
    const trustedId = await createConfirmedAccount(trustedEmail, TEST_PASSWORD, "Claude");

    await logIn(page, ownerEmail);
    const dossierId = await createDossier(page, "preparation");

    await designateTrustedContact(
      page,
      dossierId,
      trustedEmail,
      trustedContactCopy.futureRoleOwner,
    );

    // Naming someone is not the same as them accepting: the screen has to distinguish a request
    // that went out from a role somebody agreed to carry.
    await expect(page.getByText(trustedContactCopy.designationSent)).toBeVisible();
    await expect(page.getByText(trustedEmail)).toBeVisible();
    await expect(page.getByText(trustedContactCopy.awaitingConsent)).toBeVisible();

    const consentPath = await consentLinkFor(dossierId);

    const trustedContext = await browser.newContext();
    const trustedPage = await trustedContext.newPage();
    try {
      await logIn(trustedPage, trustedEmail);
      await trustedPage.goto(consentPath);

      // Accepting is a deliberate act on a screen that says what is being accepted.
      await expect(trustedPage.getByText(trustedContactCopy.consentTitle)).toBeVisible();
      await trustedPage.getByRole("button", { name: trustedContactCopy.consentButton }).click();
      await expect(trustedPage.getByText(trustedContactCopy.consentDone)).toBeVisible();

      expect(await membershipRole(dossierId, trustedId)).toBe("trusted_contact");

      // The owner arranged this so that someone can act the day they cannot. Knowing whether that
      // someone has actually agreed is the entire value of the screen.
      await page.reload();
      await expect(page.getByText(trustedContactCopy.hasConsented)).toBeVisible();
    } finally {
      await trustedContext.close();
    }
  });

  test("a trusted contact sees nothing of a dossier still in preparation", async ({
    page,
    browser,
  }) => {
    const ownerEmail = uniqueEmail("dormant-owner");
    const trustedEmail = uniqueEmail("dormant-trusted");
    await createConfirmedAccount(ownerEmail, TEST_PASSWORD, OWNER_FIRST_NAME);
    await createConfirmedAccount(trustedEmail, TEST_PASSWORD, "Claude");

    await logIn(page, ownerEmail);
    const dossierId = await createDossier(page, "preparation");
    await designateTrustedContact(
      page,
      dossierId,
      trustedEmail,
      trustedContactCopy.futureRoleOwner,
    );
    const consentPath = await consentLinkFor(dossierId);

    const trustedContext = await browser.newContext();
    const trustedPage = await trustedContext.newPage();
    try {
      await logIn(trustedPage, trustedEmail);
      await trustedPage.goto(consentPath);
      await trustedPage.getByRole("button", { name: trustedContactCopy.consentButton }).click();
      await expect(trustedPage.getByText(trustedContactCopy.consentDone)).toBeVisible();

      // The role is dormant by design. Someone preparing their own affairs writes down where
      // their documents are and what they want for their funeral: the person who will one day
      // report their death is not entitled to read any of it while they are alive.
      await trustedPage.goto("/mes-dossiers");
      await expect(trustedPage.getByText(DIAGNOSTIC_SUBJECT_NAME)).toBeHidden();

      await trustedPage.goto(`/dossiers/${dossierId}`);
      await expect(trustedPage.getByText(trustedContactCopy.preparationTitle)).toBeHidden();
      await expect(trustedPage.getByText(DIAGNOSTIC_SUBJECT_NAME)).toBeHidden();

      // Not even who else is around the dossier.
      await trustedPage.goto(`/dossiers/${dossierId}/membres`);
      await expect(trustedPage.getByText(OWNER_FIRST_NAME)).toBeHidden();
    } finally {
      await trustedContext.close();
    }
  });

  test("a revoked designation stops being a way to activate the dossier", async ({
    page,
    browser,
  }) => {
    const ownerEmail = uniqueEmail("revoked-owner");
    const trustedEmail = uniqueEmail("revoked-trusted");
    await createConfirmedAccount(ownerEmail, TEST_PASSWORD, OWNER_FIRST_NAME);
    await createConfirmedAccount(trustedEmail, TEST_PASSWORD, "Claude");

    await logIn(page, ownerEmail);
    const dossierId = await createDossier(page, "preparation");
    await designateTrustedContact(
      page,
      dossierId,
      trustedEmail,
      trustedContactCopy.futureRoleOwner,
    );
    const consentPath = await consentLinkFor(dossierId);

    const trustedContext = await browser.newContext();
    const trustedPage = await trustedContext.newPage();
    try {
      await logIn(trustedPage, trustedEmail);
      await trustedPage.goto(consentPath);
      await trustedPage.getByRole("button", { name: trustedContactCopy.consentButton }).click();
      await expect(trustedPage.getByText(trustedContactCopy.consentDone)).toBeVisible();
      const activationPath = await activationLinkOn(trustedPage);

      await page.reload();
      await page.getByRole("button", { name: trustedContactCopy.revoke }).click();
      await page.getByRole("button", { name: trustedContactCopy.confirmRevocation }).click();

      // Changing one's mind about who may declare one's death has to reach the link already in
      // that person's mailbox, otherwise the revocation is a note to self. Asserted before what
      // the owner's own screen says, because this is the half that cannot be worked around.
      await trustedPage.goto(activationPath);
      await expect(trustedPage.getByText(trustedContactCopy.deadLinkTitle)).toBeVisible();
      await expect(trustedPage.getByText(DIAGNOSTIC_SUBJECT_NAME)).toBeHidden();
      expect(await dossierStatus(dossierId)).toBe("PREPARATION");

      // And the owner is left in no doubt that nobody holds the role any more.
      await expect(page.getByText(trustedContactCopy.noTrustedContact)).toBeVisible();
    } finally {
      await trustedContext.close();
    }
  });

  test("the trusted contact reports the death and is told the family has 48 hours", async ({
    page,
    browser,
  }) => {
    const ownerEmail = uniqueEmail("report-owner");
    const trustedEmail = uniqueEmail("report-trusted");
    await createConfirmedAccount(ownerEmail, TEST_PASSWORD, OWNER_FIRST_NAME);
    await createConfirmedAccount(trustedEmail, TEST_PASSWORD, "Claude");

    await logIn(page, ownerEmail);
    const dossierId = await createDossier(page, "preparation");
    await designateTrustedContact(
      page,
      dossierId,
      trustedEmail,
      trustedContactCopy.futureRoleOwner,
    );
    const consentPath = await consentLinkFor(dossierId);

    const trustedContext = await browser.newContext();
    const trustedPage = await trustedContext.newPage();
    try {
      await logIn(trustedPage, trustedEmail);
      await trustedPage.goto(consentPath);
      await trustedPage.getByRole("button", { name: trustedContactCopy.consentButton }).click();
      const activationPath = await activationLinkOn(trustedPage);

      await trustedPage.goto(activationPath);

      // Whoever opens this link is about to do something irreversible on someone else's behalf,
      // possibly years after agreeing to it. The screen names the dossier before asking anything.
      await expect(trustedPage.getByText(trustedContactCopy.designatedForPrefix)).toBeVisible();
      await expect(trustedPage.getByText(DIAGNOSTIC_SUBJECT_NAME)).toBeVisible();

      // And the delay is announced before the button, not discovered after it.
      await expect(trustedPage.getByText(trustedContactCopy.gracePeriodNotice)).toBeVisible();

      await trustedPage.getByRole("spinbutton").first().click();
      await trustedPage.keyboard.type("04052026");
      await trustedPage.getByRole("button", { name: trustedContactCopy.reportDeathButton }).click();

      await expect(trustedPage.getByText(trustedContactCopy.deathReported)).toBeVisible();
      await expect(
        trustedPage.getByText(trustedContactCopy.activationEffectivePrefix),
      ).toBeVisible();

      // Nothing has happened to the dossier yet: the grace period is what makes a mistake or an
      // abuse stoppable, so the report must not activate anything on its own.
      expect(await dossierStatus(dossierId)).toBe("PREPARATION");

      // Every member is told, which is the only reason the delay is worth having.
      await page.goto(`/dossiers/${dossierId}`);
      await expect(page.getByText(copy.activationPending)).toBeVisible();
    } finally {
      await trustedContext.close();
    }
  });

  test("a consent link that has already been used explains itself in French", async ({
    page,
    browser,
  }) => {
    const ownerEmail = uniqueEmail("used-owner");
    const trustedEmail = uniqueEmail("used-trusted");
    await createConfirmedAccount(ownerEmail, TEST_PASSWORD, OWNER_FIRST_NAME);
    await createConfirmedAccount(trustedEmail, TEST_PASSWORD, "Claude");

    await logIn(page, ownerEmail);
    const dossierId = await createDossier(page, "preparation");
    await designateTrustedContact(
      page,
      dossierId,
      trustedEmail,
      trustedContactCopy.futureRoleOwner,
    );
    const consentPath = await consentLinkFor(dossierId);

    const trustedContext = await browser.newContext();
    const trustedPage = await trustedContext.newPage();
    try {
      await logIn(trustedPage, trustedEmail);
      await trustedPage.goto(consentPath);
      await trustedPage.getByRole("button", { name: trustedContactCopy.consentButton }).click();
      await expect(trustedPage.getByText(trustedContactCopy.consentDone)).toBeVisible();

      // Coming back to the same link is what people do: the mail is still in the inbox, and a
      // second device or a second click is not an error on their part. What they must not meet is
      // a technical failure, in English, on a screen about someone's death.
      await trustedPage.goto(consentPath);
      await trustedPage.getByRole("button", { name: trustedContactCopy.consentButton }).click();

      await expect(
        trustedPage.getByText(trustedContactCopy.consentDeadLinkDescription),
      ).toBeVisible();

      // A dead link says nothing about whose dossier it was: the holder may no longer be anybody.
      await expect(trustedPage.getByText(DIAGNOSTIC_SUBJECT_NAME)).toBeHidden();
    } finally {
      await trustedContext.close();
    }
  });

  test("an expired activation link explains itself without naming the dossier", async ({
    page,
    browser,
  }) => {
    const ownerEmail = uniqueEmail("expired-owner");
    const trustedEmail = uniqueEmail("expired-trusted");
    await createConfirmedAccount(ownerEmail, TEST_PASSWORD, OWNER_FIRST_NAME);
    await createConfirmedAccount(trustedEmail, TEST_PASSWORD, "Claude");

    await logIn(page, ownerEmail);
    const dossierId = await createDossier(page, "preparation");
    await designateTrustedContact(
      page,
      dossierId,
      trustedEmail,
      trustedContactCopy.futureRoleOwner,
    );
    const consentPath = await consentLinkFor(dossierId);

    const trustedContext = await browser.newContext();
    const trustedPage = await trustedContext.newPage();
    try {
      await logIn(trustedPage, trustedEmail);
      await trustedPage.goto(consentPath);
      await trustedPage.getByRole("button", { name: trustedContactCopy.consentButton }).click();
      const activationPath = await activationLinkOn(trustedPage);

      await expireActivationLink(dossierId);
      await trustedPage.goto(activationPath);

      await expect(trustedPage.getByText(trustedContactCopy.deadLinkTitle)).toBeVisible();
      await expect(
        trustedPage.getByText(trustedContactCopy.activationDeadLinkDescription),
      ).toBeVisible();

      // The link may have been forwarded, or read by whoever ends up with the mailbox. An expired
      // one must not confirm that a named person prepared a dossier.
      await expect(trustedPage.getByText(DIAGNOSTIC_SUBJECT_NAME)).toBeHidden();
      await expect(trustedPage.getByText(trustedContactCopy.reportDeathButton)).toBeHidden();
    } finally {
      await trustedContext.close();
    }
  });
});
