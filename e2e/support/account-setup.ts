import type { Locator, Page } from "@playwright/test";
import { ANON_KEY, SUPABASE_URL } from "#e2e/support/env";
import { rest } from "#e2e/support/backend";
import { copy } from "#e2e/support/copy";
import { copyAccount } from "#e2e/support/copy-account";

/**
 * What the account journeys need beyond the shared helpers, and only that.
 *
 * Signing up lives here rather than in app.ts because it is the subject of these journeys: every
 * other area provisions its people through the admin API precisely so it does not depend on this
 * flow, which is why nothing else can prove the flow works.
 */

/**
 * The password input carrying a given label, and only it.
 *
 * Neither half is enough on its own. The role matches on a substring, so "Nouveau mot de passe"
 * also finds "Confirmer le nouveau mot de passe" on the settings screen; the exact label finds the
 * right field but also the login page's "Mot de passe" tab panel, which borrows the same name from
 * its tab. Their intersection is the field a person types into.
 */
export const passwordField = (page: Page, label: string): Locator =>
  page.getByRole("textbox", { name: label }).and(page.getByLabel(label, { exact: true }));

/**
 * Fills the real signup form the way a person does, terms included, and stops where the app
 * stops: on the screen telling them to go and read their mail. Confirming is a separate act,
 * performed from the mailbox.
 */
export const signUpThroughTheForm = async (
  page: Page,
  email: string,
  password: string,
): Promise<void> => {
  await page.goto("/inscription");
  await page.getByRole("textbox", { name: copyAccount.signupEmail }).fill(email);
  await passwordField(page, copyAccount.signupPassword).fill(password);

  // HeroUI renders the real checkbox visually hidden behind its own control, so an unforced click
  // lands on the decoration while the input is the thing handling the event. Same reason as the
  // diagnostic radios in app.ts.
  await page.getByRole("checkbox", { name: copyAccount.signupTerms }).check({ force: true });

  await page.getByRole("button", { name: copyAccount.signupSubmit }).click();
};

/**
 * Submits the password login form and stops there, without saying where it should land.
 *
 * app.ts already signs a person in with the suite's shared password, and asserts it worked. These
 * journeys need the other halves: a password that is meant to be refused, and one the person just
 * changed, so the destination is the assertion rather than a precondition.
 */
export const submitPasswordLogin = async (
  page: Page,
  email: string,
  password: string,
): Promise<void> => {
  await page.goto("/connexion");
  await page.getByRole("textbox", { name: copy.loginEmail }).fill(email);
  await passwordField(page, copy.loginPassword).fill(password);
  await page.getByRole("button", { name: copy.submitLogin }).click();
};

/**
 * Spends a confirmation link against GoTrue without navigating a browser to where it points.
 *
 * The email change link is the one auth link the app gives no explicit destination, so GoTrue
 * falls back to site_url, the dev server's origin, which the journeys deliberately do not run on.
 * The token is the real one out of the real message and it is spent against the real endpoint;
 * only the landing page is skipped, and that is local configuration rather than behaviour.
 */
export const spendAuthLink = async (link: string): Promise<void> => {
  const response = await fetch(link, { redirect: "manual" });
  await response.body?.cancel();
  const destination = response.headers.get("location");
  if (destination !== null && destination.includes("error")) {
    throw new Error(`the confirmation link was refused: ${destination}`);
  }
};

/**
 * The row of controls belonging to one notification type.
 *
 * The card repeats the same pair of labels, "Application" and "Email", once per type, so the only
 * thing telling one pair from another is the heading it sits under. The type's own label is the
 * anchor, rather than a position in a list whose order is the key order of a domain constant.
 */
export const notificationRow = (page: Page, typeLabel: string): Locator =>
  page.getByText(typeLabel, { exact: true }).locator("xpath=..");

interface NotificationPreferenceRow {
  in_app: boolean;
  email: boolean;
}

/** What the database ended up holding for one person and one notification type. */
export const storedNotificationPreference = async (
  userId: string,
  eventType: string,
): Promise<NotificationPreferenceRow | undefined> => {
  const rows = await rest<NotificationPreferenceRow[]>(
    `/rest/v1/notification_preferences?select=in_app,email&user_id=eq.${userId}&event_type=eq.${eventType}`,
  );
  return rows[0];
};

/**
 * The refresh token the browser is holding on to.
 *
 * "Vos autres sessions ont été déconnectées" is a promise about a credential that outlives the
 * tab it was minted in, and an access token stays valid for its hour whatever happens, so the one
 * thing a journey can observe is whether the session can still renew itself. Read out of the
 * browser's own storage, which is where a person's session actually lives.
 */
export const refreshTokenHeldBy = async (page: Page): Promise<string> => {
  const token = await page.evaluate(() => {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key === null || !key.startsWith("sb-") || !key.endsWith("-auth-token")) continue;
      const raw = localStorage.getItem(key);
      if (raw === null) continue;
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed !== "object" || parsed === null) continue;
      if (!("refresh_token" in parsed)) continue;
      const value = parsed.refresh_token;
      if (typeof value === "string") return value;
    }
    return null;
  });
  if (token === null) throw new Error("this browser is holding no Supabase session");
  return token;
};

/** Whether GoTrue still honours a refresh token, asked of the real endpoint. */
export const sessionCanStillRenew = async (refreshToken: string): Promise<boolean> => {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  await response.body?.cancel();
  return response.ok;
};

/** Whether the account still has a row at all, whatever state that row is in. */
export const profileExists = async (userId: string): Promise<boolean> => {
  const rows = await rest<{ id: string }[]>(`/rest/v1/profiles?select=id&id=eq.${userId}`);
  return rows.length > 0;
};

/** The address GoTrue currently believes the account belongs to. */
export const authEmailOf = async (userId: string): Promise<string> => {
  const user = await rest<{ email: string }>(`/auth/v1/admin/users/${userId}`);
  return user.email;
};
