import { expect, type Locator, type Page } from "@playwright/test";
import { copy } from "#e2e/support/copy";

let sequence = 0;

/** Unique per call, and per worker process, so parallel journeys never collide on an address. */
export const uniqueEmail = (prefix: string): string => {
  sequence += 1;
  return `e2e-${prefix}-${process.pid}-${Date.now()}-${sequence}@example.test`;
};

export const TEST_PASSWORD = "E2ePassword1234!";

/**
 * The name `answerCurrentQuestion` types into whichever free-text step it meets. Two journeys
 * assert on it afterwards to prove the diagnostic's answers reached the dossier they created, so
 * it is shared rather than repeated: a different name typed here would make those assertions look
 * for something that was never entered.
 */
export const DIAGNOSTIC_SUBJECT_NAME = "Jean Dupont";

/**
 * The registry's own slot attribute, and the only structural selector in the suite. The wizard swaps
 * its question in place, so the step's container is the one thing a journey has to hold on to in
 * order to tell "the next question arrived" from "the same question is still there". Named once
 * so a change in the component library is one edit rather than a hunt.
 */
const WIZARD_STEP = "[data-slot=card-content]";

export const wizardStep = (page: Page): Locator => page.locator(WIZARD_STEP).first();

export const logIn = async (page: Page, email: string): Promise<void> => {
  await page.goto("/connexion");
  await page.getByRole("textbox", { name: copy.loginEmail }).fill(email);
  await page.getByRole("textbox", { name: copy.loginPassword }).fill(TEST_PASSWORD);
  await page.getByRole("button", { name: copy.submitLogin }).click();
  await expect(page).toHaveURL(/\/mes-dossiers/);
};

/**
 * Walks the diagnostic to its last question, answering whatever the current step happens to be.
 *
 * Written against the field kinds rather than a fixed list of questions on purpose: the engine
 * decides which questions apply from the answers so far, so a journey enumerating them would
 * encode a branch of the rules and break every time the catalog changes. What it asserts is the
 * property that matters to a user: the wizard always reaches a result.
 */
export type DiagnosticMode = "death" | "preparation";

export const completeDiagnostic = async (
  page: Page,
  mode: DiagnosticMode = "death",
): Promise<void> => {
  const step = wizardStep(page);

  for (let visited = 0; visited < 20; visited += 1) {
    if (page.url().includes("/diagnostic/resultat")) return;

    // The first question decides the whole branch, a dossier in PREPARATION or one already
    // active, so it is the one answer a journey chooses rather than takes as it comes.
    await (visited === 0 ? answerMode(page, mode) : answerCurrentQuestion(page));
    const before = await step.innerText();

    const finish = page.getByRole("button", { name: copy.finish });
    const isFinalQuestion = await finish.isVisible();
    const advance = isFinalQuestion ? finish : page.getByRole("button", { name: copy.next });
    await advance.click();

    // The last answer first removes the wizard, then the effect navigates to the lazy result
    // route. Waiting only for the old card to disappear races that navigation and can make the
    // next loop inspect the result screen as though it were another question.
    if (isFinalQuestion) {
      await page.waitForURL(/\/diagnostic\/resultat$/);
      return;
    }

    // The wizard swaps the question in place, so there is no navigation to wait for except on
    // the last step handled above. Waiting on the step's own content is what makes the next
    // iteration read the new question rather than the one it just answered.
    await page.waitForFunction(
      ({ previous, selector }) =>
        (document.querySelector(selector)?.textContent ?? "") !== previous,
      { previous: before, selector: WIZARD_STEP },
    );
  }

  throw new Error("the diagnostic did not reach its result within 20 questions");
};

const answerMode = async (page: Page, mode: DiagnosticMode): Promise<void> => {
  const label = mode === "death" ? copy.modeDeath : copy.modePreparation;
  await page.getByRole("radio", { name: label }).check({ force: true });
};

/**
 * Creates a dossier the only way the app allows: by going through the diagnostic. Returns the
 * dossier id read back from the URL, which every later step needs.
 */
export const createDossier = async (page: Page, mode: DiagnosticMode): Promise<string> => {
  await page.goto("/diagnostic");
  await completeDiagnostic(page, mode);
  await page.getByRole("button", { name: copy.createDossierFromResult }).click();
  await page.waitForURL(/\/dossiers\/[0-9a-f-]{36}/, { timeout: 30_000 });

  const dossierId = /\/dossiers\/([0-9a-f-]{36})/.exec(page.url())?.[1];
  if (dossierId === undefined) throw new Error(`no dossier id in ${page.url()}`);
  return dossierId;
};

/**
 * Invites someone from the members screen and returns the link they were sent.
 *
 * Local development has no email provider, so the screen surfaces the link instead of pretending
 * a message went out. That is also the only way a journey can follow it.
 */
export const inviteRelative = async (
  page: Page,
  dossierId: string,
  email: string,
): Promise<string> => {
  await page.goto(`/dossiers/${dossierId}/membres`);
  await page.getByRole("textbox", { name: copy.inviteEmail }).fill(email);
  await page.getByRole("button", { name: copy.sendInvitation }).click();

  const acceptUrl = await page
    .locator("code", { hasText: "/invitations/accepter" })
    .first()
    .innerText();
  expect(acceptUrl).toContain("/invitations/accepter");
  return acceptUrl;
};

/** An absolute invitation URL as a path the browser under test can navigate to directly. */
export const pathOf = (absoluteUrl: string): string => {
  const parsed = new URL(absoluteUrl);
  return parsed.pathname + parsed.search;
};

const answerCurrentQuestion = async (page: Page): Promise<void> => {
  const radios = page.getByRole("radio");
  if ((await radios.count()) > 0) {
    // The radio is a button carrying the role rather than a native input, so the click is
    // forced past the label that sits on top of it.
    await radios.first().check({ force: true });
    return;
  }

  // A native date input takes the ISO value whatever the displayed locale is.
  const dateField = page.locator('input[type="date"]');
  if ((await dateField.count()) > 0) {
    await dateField.first().fill("2026-01-01");
    return;
  }

  // A number input exposes itself as a spinbutton rather than a textbox, which is what tells the
  // two apart: a name typed into an age field leaves the step invalid and Next disabled, a very
  // slow way to discover the wrong branch was taken.
  const numberField = page.getByRole("spinbutton");
  if ((await numberField.count()) > 0) {
    await numberField.first().fill("70");
    return;
  }

  const textbox = page.getByRole("textbox");
  if ((await textbox.count()) > 0) {
    await textbox.first().fill(DIAGNOSTIC_SUBJECT_NAME);
    return;
  }

  throw new Error("no answerable field on the current diagnostic step");
};
