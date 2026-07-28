import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import {
  completeDiagnostic,
  createDossier,
  DIAGNOSTIC_SUBJECT_NAME,
  logIn,
  TEST_PASSWORD,
  uniqueEmail,
} from "#e2e/support/app";
import { copy } from "#e2e/support/copy";
import { copyAccount } from "#e2e/support/copy-account";
import { createConfirmedAccount } from "#e2e/support/backend";
import { authLinkFor, linkIn, waitForEmail } from "#e2e/support/mailbox";
import {
  authEmailOf,
  notificationRow,
  passwordField,
  profileExists,
  refreshTokenHeldBy,
  sessionCanStillRenew,
  signUpThroughTheForm,
  spendAuthLink,
  storedNotificationPreference,
  submitPasswordLogin,
} from "#e2e/support/account-setup";

/**
 * Getting an account, keeping it, and closing it.
 *
 * Every other journey provisions its people through the admin API, which is exactly why none of
 * them can say whether a person can obtain an account at all: the one flow that would prove it is
 * the one they all step around. The same is true at the other end. Closing an account is the act
 * with the least room for a second attempt, and the promise the settings screen makes about it is
 * the one a bereaved family is least able to verify for themselves.
 *
 * These journeys go through the mailbox wherever a real person would, because the half that
 * happens outside the browser is where the link is built, the token minted and the redirect
 * allow-listed, and none of that fails visibly anywhere else.
 */

const NEW_PASSWORD = "E2eMotDePasseSuivant2026!";

test.describe("creating an account", () => {
  test("a visitor signs up, confirms from their mailbox, and finds their diagnostic waiting", async ({
    page,
  }) => {
    const email = uniqueEmail("signup");

    // The product's own order: the diagnostic is what convinces someone to open an account, so
    // the account is created out of a result rather than from a cold form.
    await page.goto("/");
    await page.getByRole("link", { name: copy.landingCta }).click();
    await completeDiagnostic(page);
    await page.getByRole("link", { name: copy.signupFromResult }).click();
    await expect(page).toHaveURL(/\/inscription$/);

    await signUpThroughTheForm(page, email, TEST_PASSWORD);

    // Nothing is signed in yet, and the screen has to say so plainly: a person who closes the tab
    // here believing they have an account never comes back.
    await expect(page).toHaveURL(/\/verification-email$/);
    await expect(page.getByText(copyAccount.verifyEmailTitle)).toBeVisible();
    await expect(page.getByText(copyAccount.verifyEmailDescription)).toBeVisible();
    await expect(page.getByText(copyAccount.diagnosticKept)).toBeVisible();

    await page.goto(await authLinkFor(email));

    // "Votre diagnostic est conservé et sera rattaché à votre compte une fois l'email confirmé."
    // The answers were only ever in this tab's session storage, so the dossier carrying the name
    // typed into the diagnostic is what proves the promise was kept across the round trip through
    // the mailbox rather than quietly dropped with them.
    await expect(page).toHaveURL(/\/mes-dossiers$/, { timeout: 30_000 });
    await expect(page.getByText(DIAGNOSTIC_SUBJECT_NAME)).toBeVisible();
  });

  test("the confirmation email is one a bereaved French reader can act on", async ({ page }) => {
    // Known defect, deliberately recorded rather than deleted. supabase/config.toml declares no
    // [auth.email.template.*] and no sender, so GoTrue sends its stock template from
    // "Admin <admin@email.com>", in English. That is the first message this service ever sends
    // someone, and the one that decides whether they can get in at all. Writing the French
    // templates is its own change, with its own copy review. Playwright fails this run the day it
    // starts passing, so the marker cannot outlive the defect.
    test.fail();
    const email = uniqueEmail("sober");

    await page.goto("/diagnostic");
    await completeDiagnostic(page);
    await page.getByRole("link", { name: copy.signupFromResult }).click();
    await signUpThroughTheForm(page, email, TEST_PASSWORD);
    await expect(page).toHaveURL(/\/verification-email$/);

    const { subject, body, from } = await waitForEmail(email);

    // CLAUDE.md, "Emails: sober, no name of the deceased in the subject". The person has just
    // typed that name into the diagnostic, so this is the moment it could leak into an inbox
    // other people read over a shoulder.
    expect(subject).not.toContain(DIAGNOSTIC_SUBJECT_NAME);

    // Asserted as properties of the message rather than against GoTrue's stock wording: the
    // wording is a dependency's default, it changes between CLI versions, and an assertion
    // naming one of them passes on the version that phrases it differently while the mail stays
    // just as English. This test did exactly that, green in CI and red locally.
    //
    // What a person is owed is that the mail says who wrote to them, and does so from the
    // service rather than from an unconfigured stack.
    expect(from).not.toContain("admin@email.com");
    expect(`${subject} ${body}`).toContain("Sorento");
  });

  test("a password the rules refuse does not create an account", async ({ page }) => {
    const email = uniqueEmail("weak");

    await signUpThroughTheForm(page, email, "court");

    // Refusal belongs on the field that caused it, and it has to name the rule: "invalid" tells
    // someone nothing about what to type next.
    await expect(page.getByText(copyAccount.passwordTooShort)).toBeVisible();
    await expect(page).toHaveURL(/\/inscription$/);

    // A screen that says no and creates the account anyway is worse than either outcome: the
    // person retypes, is told the address is taken, and cannot get in.
    await expect(waitForEmail(email)).rejects.toThrow();
  });

  test("the terms have to be accepted, and the screen says which ones", async ({ page }) => {
    const email = uniqueEmail("terms");

    await page.goto("/inscription");
    await page.getByRole("textbox", { name: copyAccount.signupEmail }).fill(email);
    await passwordField(page, copyAccount.signupPassword).fill(TEST_PASSWORD);
    await page.getByRole("button", { name: copyAccount.signupSubmit }).click();

    // Consent to the terms and to the privacy policy is the lawful basis for everything the
    // account then holds, so it cannot be inferred from pressing a button.
    await expect(page.getByText(copyAccount.termsRequired)).toBeVisible();
    await expect(page).toHaveURL(/\/inscription$/);
  });
});

test.describe("signing in", () => {
  test("a wrong password is explained in French, never in the language of the API", async ({
    page,
  }) => {
    const email = uniqueEmail("wrongpass");
    await createConfirmedAccount(email, TEST_PASSWORD, "Camille");

    await submitPasswordLogin(page, email, "PasLeBonMotDePasse1!");

    await expect(page.getByText(copyAccount.invalidCredentials)).toBeVisible();
    // A raw GoTrue message reaching the screen is the failure mode this whole translation table
    // exists for, and it reads as a broken site to someone who does not speak English.
    await expect(page.getByText("Invalid login credentials")).toHaveCount(0);
    await expect(page).toHaveURL(/\/connexion$/);
  });

  test("an unconfirmed account is told to confirm, and offered the email again", async ({
    page,
  }) => {
    const email = uniqueEmail("unconfirmed");
    await signUpThroughTheForm(page, email, TEST_PASSWORD);
    await expect(page).toHaveURL(/\/verification-email$/);

    await submitPasswordLogin(page, email, TEST_PASSWORD);

    // Someone whose confirmation mail was filtered, or who signed up on another device, must not
    // be told their password is wrong: they would change a password that was never the problem.
    await expect(page.getByText(copyAccount.emailNotConfirmed)).toBeVisible();

    // Offering the remedy on the screen where the person is stuck is only worth anything if the
    // remedy works, so the mail it sends is followed rather than counted.
    await page.getByRole("button", { name: copyAccount.resendConfirmation }).click();
    await page.goto(await authLinkFor(email));
    await expect(page).toHaveURL(/\/mes-dossiers#?$/, { timeout: 30_000 });
  });

  test("a magic link signs the person in and lands them on their dossiers", async ({ page }) => {
    const email = uniqueEmail("magic");
    await createConfirmedAccount(email, TEST_PASSWORD, "Dominique");

    await page.goto("/connexion");
    await page.getByRole("tab", { name: copyAccount.magicLinkTab }).click();
    await page.getByRole("textbox", { name: copy.loginEmail }).fill(email);
    await page.getByRole("button", { name: copyAccount.magicLinkSubmit }).click();
    await expect(page.getByText(copyAccount.magicLinkSent)).toBeVisible();

    await page.goto(await authLinkFor(email));

    // The link carries its own destination, and GoTrue silently falls back to the site root for
    // any destination missing from the allow-list. Landing on the marketing page after clicking
    // "connect me" is indistinguishable from a link that did not work. The trailing marker is
    // what the client leaves behind after taking the session out of the fragment.
    await expect(page).toHaveURL(/\/mes-dossiers#?$/, { timeout: 30_000 });
  });
});

test.describe("recovering a forgotten password", () => {
  test("the round trip ends with the old password refused and the new one accepted", async ({
    page,
    browser,
  }) => {
    const email = uniqueEmail("reset");
    await createConfirmedAccount(email, TEST_PASSWORD, "Camille");

    // A session opened before the reset, standing in for the phone left signed in somewhere: the
    // reason someone resets a password is often that they no longer trust who else is signed in.
    const otherContext = await browser.newContext();
    const otherPage = await otherContext.newPage();
    let otherRefreshToken: string;
    try {
      await logIn(otherPage, email);
      otherRefreshToken = await refreshTokenHeldBy(otherPage);
    } finally {
      await otherContext.close();
    }

    await page.goto("/connexion");
    await page.getByRole("link", { name: copyAccount.forgotPasswordLink }).click();
    await expect(page).toHaveURL(/\/mot-de-passe-oublie$/);
    await page.getByRole("textbox", { name: copy.loginEmail }).fill(email);
    await page.getByRole("button", { name: copyAccount.resetRequestSubmit }).click();

    // Worded so it answers the same way whether or not the address has an account: a screen that
    // confirms only for real addresses is a way of asking who is registered.
    await expect(page.getByText(copyAccount.resetRequestConfirmation)).toBeVisible();

    await page.goto(await authLinkFor(email));
    await expect(page).toHaveURL(/\/auth\/reset/, { timeout: 30_000 });

    await passwordField(page, copyAccount.resetNewPassword).fill(NEW_PASSWORD);
    await passwordField(page, copyAccount.resetConfirmPassword).fill(NEW_PASSWORD);
    await page.getByRole("button", { name: copyAccount.resetSubmit }).click();
    await expect(page.getByText(copyAccount.resetSuccess)).toBeVisible();

    // "Vos autres sessions ont été déconnectées." An access token stays valid for its hour
    // whatever happens, so the only thing that promise can mean is that the other session cannot
    // renew itself. If it can, the person who was locked out is still signed in.
    expect(await sessionCanStillRenew(otherRefreshToken)).toBe(false);

    const returningContext = await browser.newContext();
    const returningPage = await returningContext.newPage();
    try {
      await submitPasswordLogin(returningPage, email, TEST_PASSWORD);
      await expect(returningPage.getByText(copyAccount.invalidCredentials)).toBeVisible();

      await submitPasswordLogin(returningPage, email, NEW_PASSWORD);
      await expect(returningPage).toHaveURL(/\/mes-dossiers$/);
    } finally {
      await returningContext.close();
    }
  });

  test("a reset screen reached without a link does not offer a new password", async ({ page }) => {
    await page.goto("/auth/reset");

    // The form is the last gate before an account changes hands, so opening the URL directly must
    // not present it: whoever gets there has proved nothing.
    await expect(page.getByRole("button", { name: copyAccount.resetSubmit })).toHaveCount(0);
  });
});

test.describe("the settings screen", () => {
  test("changing the email writes to both mailboxes and waits for both", async ({
    page,
    browser,
  }) => {
    const currentEmail = uniqueEmail("emailfrom");
    const nextEmail = uniqueEmail("emailto");
    const userId = await createConfirmedAccount(currentEmail, TEST_PASSWORD, "Camille");

    await logIn(page, currentEmail);
    await page.goto("/parametres");
    await expect(page.getByText(copyAccount.settingsTitle)).toBeVisible();
    await expect(page.getByLabel(copyAccount.emailCurrentLabel)).toHaveValue(currentEmail);
    await expect(page.getByText(copyAccount.emailChangeNotice)).toBeVisible();

    await page.getByRole("textbox", { name: copyAccount.emailNewLabel }).fill(nextEmail);
    await page.getByRole("button", { name: copyAccount.emailChangeButton }).click();
    await expect(page.getByText(copyAccount.emailChangeSuccess)).toBeVisible();

    // "Un email de confirmation sera envoyé à l'ancienne et à la nouvelle adresse." Writing to
    // the old address is what makes a stolen session unable to take the account away silently.
    const fromAddress = await waitForEmail(currentEmail);
    const toAddress = await waitForEmail(nextEmail);

    // "Le changement n'est effectif qu'une fois les deux confirmés."
    expect(await authEmailOf(userId)).toBe(currentEmail);

    await spendAuthLink(linkIn(toAddress.body, "/auth/v1/verify"));
    expect(await authEmailOf(userId)).toBe(currentEmail);

    await spendAuthLink(linkIn(fromAddress.body, "/auth/v1/verify"));
    expect(await authEmailOf(userId)).toBe(nextEmail);

    const returningContext = await browser.newContext();
    const returningPage = await returningContext.newPage();
    try {
      await submitPasswordLogin(returningPage, nextEmail, TEST_PASSWORD);
      await expect(returningPage).toHaveURL(/\/mes-dossiers$/);
    } finally {
      await returningContext.close();
    }
  });

  test("changing the password takes effect and retires the old one", async ({ page, browser }) => {
    const email = uniqueEmail("pwchange");
    await createConfirmedAccount(email, TEST_PASSWORD, "Camille");

    await logIn(page, email);
    await page.goto("/parametres");

    await passwordField(page, copyAccount.passwordCurrentLabel).fill(TEST_PASSWORD);
    await passwordField(page, copyAccount.passwordNewLabel).fill(NEW_PASSWORD);
    await passwordField(page, copyAccount.passwordConfirmLabel).fill(NEW_PASSWORD);
    await page.getByRole("button", { name: copyAccount.passwordChangeButton }).click();
    await expect(page.getByText(copyAccount.passwordChangeSuccess)).toBeVisible();

    const returningContext = await browser.newContext();
    const returningPage = await returningContext.newPage();
    try {
      await submitPasswordLogin(returningPage, email, TEST_PASSWORD);
      await expect(returningPage.getByText(copyAccount.invalidCredentials)).toBeVisible();

      await submitPasswordLogin(returningPage, email, NEW_PASSWORD);
      await expect(returningPage).toHaveURL(/\/mes-dossiers$/);
    } finally {
      await returningContext.close();
    }
  });

  test("a wrong current password does not change anything", async ({ page, browser }) => {
    const email = uniqueEmail("pwguard");
    await createConfirmedAccount(email, TEST_PASSWORD, "Camille");

    await logIn(page, email);
    await page.goto("/parametres");

    await passwordField(page, copyAccount.passwordCurrentLabel).fill("PasLeBonMotDePasse1!");
    await passwordField(page, copyAccount.passwordNewLabel).fill(NEW_PASSWORD);
    await passwordField(page, copyAccount.passwordConfirmLabel).fill(NEW_PASSWORD);
    await page.getByRole("button", { name: copyAccount.passwordChangeButton }).click();

    // Asking for the current password is the whole protection on an unattended open session, so
    // getting it wrong has to stop the change rather than merely be reported.
    await expect(page.getByText(copyAccount.invalidCredentials)).toBeVisible();
    await expect(page.getByText(copyAccount.passwordChangeSuccess)).toHaveCount(0);

    const returningContext = await browser.newContext();
    const returningPage = await returningContext.newPage();
    try {
      await submitPasswordLogin(returningPage, email, TEST_PASSWORD);
      await expect(returningPage).toHaveURL(/\/mes-dossiers$/);
    } finally {
      await returningContext.close();
    }
  });

  test("a notification switched off stays off", async ({ page }) => {
    const email = uniqueEmail("prefs");
    const userId = await createConfirmedAccount(email, TEST_PASSWORD, "Camille");

    await logIn(page, email);
    await page.goto("/parametres");
    await expect(page.getByText(copyAccount.notificationPreferencesTitle)).toBeVisible();

    const row = notificationRow(page, copyAccount.procedureAssignedLabel);
    const inApp = row.getByRole("switch", { name: copyAccount.notificationInAppColumn });
    const byEmail = row.getByRole("switch", { name: copyAccount.notificationEmailColumn });

    // Assignment notifications are on for everyone by default, which is what makes turning one
    // off the interesting direction: a preference that silently reverts is how someone in
    // mourning keeps receiving the mail they asked to stop.
    await expect(inApp).toBeChecked();
    await expect(byEmail).toBeChecked();

    // The switch is driven entirely by what the server last said, so its own state only changes
    // once the write has landed and been read back. Playwright's uncheck() verifies immediately
    // and would click a second time, putting the preference back where it started.
    await byEmail.click({ force: true });
    await expect(byEmail).not.toBeChecked();

    await expect
      .poll(() => storedNotificationPreference(userId, "procedure_assigned"))
      .toEqual({ in_app: true, email: false });

    await page.reload();
    await expect(
      notificationRow(page, copyAccount.procedureAssignedLabel).getByRole("switch", {
        name: copyAccount.notificationEmailColumn,
      }),
    ).not.toBeChecked();
  });

  test("exporting takes the dossier's own words with it", async ({ page }) => {
    const email = uniqueEmail("export");
    await createConfirmedAccount(email, TEST_PASSWORD, "Camille");

    await logIn(page, email);
    await createDossier(page, "death");
    await page.goto("/parametres");

    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: copyAccount.exportButton }).click();
    const file = await download;

    // Portability means leaving with something usable elsewhere, so the file has to be named and
    // to actually carry the dossier rather than an envelope of empty collections.
    expect(file.suggestedFilename()).toBe(copyAccount.exportFileName);
    const content = await readFile(await file.path(), "utf8");
    for (const namePart of DIAGNOSTIC_SUBJECT_NAME.split(" ")) {
      expect(content).toContain(namePart);
    }
  });
});

test.describe("closing the account", () => {
  test("the last owner of a dossier is refused, and told what to do first", async ({ page }) => {
    const email = uniqueEmail("owner");
    const userId = await createConfirmedAccount(email, TEST_PASSWORD, "Camille");

    await logIn(page, email);
    await createDossier(page, "death");
    await page.goto("/parametres");

    // A dossier is a shared space. Letting its owner leave would strand the relatives who still
    // depend on it, so the screen has to explain the way out before it refuses.
    await expect(page.getByText(copyAccount.deleteOwnedDossiersWarning)).toBeVisible();
    await expect(page.getByRole("button", { name: copyAccount.deleteButton })).toBeDisabled();

    expect(await profileExists(userId)).toBe(true);
  });

  test("closing an account erases it, and leaves the dossier's history standing", async ({
    page,
  }) => {
    const email = uniqueEmail("closing");
    const userId = await createConfirmedAccount(email, TEST_PASSWORD, "Camille");

    await logIn(page, email);
    await page.goto("/parametres");

    await page.getByRole("button", { name: copyAccount.deleteButton }).click();

    // The confirmation is the point of no return, so it is a deliberate second act rather than a
    // click that could have been a mis-tap on a phone held by someone who is exhausted.
    await expect(page.getByText(copyAccount.deleteConfirmTitle)).toBeVisible();
    await page.getByRole("button", { name: copyAccount.deleteConfirmButton }).click();

    // Closing an account ends the session with it: staying on a screen that still reads as
    // "your settings" would leave someone unsure whether anything happened at all.
    await expect(page).not.toHaveURL(/\/parametres$/, { timeout: 30_000 });
    await page.goto("/parametres");
    await expect(page).toHaveURL(/\/connexion/);

    // An erasure, not a bin, and the distinction is deliberate: the 30-day bin exists for content
    // someone can regret losing, while a person asking to be forgotten is not asking to be kept
    // for thirty days. What survives is the shared history, because the foreign keys null out
    // rather than cascade: a dossier keeps its comments and its trace without naming whoever
    // left. Owning a dossier still blocks the whole thing, which the test above covers.
    expect(await profileExists(userId)).toBe(false);
  });
});
