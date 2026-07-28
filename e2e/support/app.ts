import { expect, type Page } from "@playwright/test";

/**
 * The French copy the journeys drive the app through. It mirrors the per-feature content
 * dictionaries in apps/web — the app cannot export them, so this is the one place they are
 * repeated, and a wording change breaks here rather than in ten test files.
 */
export const copy = {
  landingCta: "Commencer mon diagnostic gratuit",
  modeDeath: "Un proche est décédé",
  modePreparation: "Je prépare ma situation",
  next: "Suivant",
  back: "Retour",
  finish: "Voir mon résultat",
  signupFromResult: "Créer mon compte gratuit",
  createDossierFromResult: "Créer mon dossier",
  email: "Email",
  password: "Mot de passe",
  acceptTerms: /J'accepte les conditions générales/,
  devSkipConfirmation: /DEV — créer le compte sans email/,
  submitSignup: "Créer mon compte",
  submitLogin: "Se connecter",
} as const;

let sequence = 0;

/** Unique per call, and per worker process, so parallel journeys never collide on an address. */
export const uniqueEmail = (prefix: string): string => {
  sequence += 1;
  return `e2e-${prefix}-${process.pid}-${Date.now()}-${sequence}@example.test`;
};

export const TEST_PASSWORD = "E2ePassword1234!";

/**
 * Creates a confirmed account through the app itself, using the development shortcut the signup
 * screen offers locally — the same path a developer uses, so the screen is exercised rather than
 * bypassed with an admin API call.
 */
export const signUp = async (page: Page, email: string): Promise<void> => {
  await page.getByRole("textbox", { name: copy.email }).fill(email);
  await page.getByRole("textbox", { name: copy.password }).fill(TEST_PASSWORD);
  // Forced for the same reason as the radios: the real input sits behind HeroUI's own control.
  await page.getByRole("checkbox", { name: copy.acceptTerms }).check({ force: true });
  await page.getByRole("checkbox", { name: copy.devSkipConfirmation }).check({ force: true });
  await page.getByRole("button", { name: copy.submitSignup }).click();
};

export const logIn = async (page: Page, email: string): Promise<void> => {
  await page.goto("/connexion");
  await page.getByRole("textbox", { name: copy.email }).fill(email);
  await page.getByRole("textbox", { name: copy.password }).fill(TEST_PASSWORD);
  await page.getByRole("button", { name: copy.submitLogin }).click();
  await expect(page).toHaveURL(/\/mes-dossiers/);
};

/**
 * Walks the diagnostic to its last question, answering whatever the current step happens to be.
 *
 * Written against the field kinds rather than a fixed list of questions on purpose: the engine
 * decides which questions apply from the answers so far, so a journey enumerating them would
 * encode a branch of the rules and break every time the catalog changes. What it asserts is the
 * property that matters to a user — the wizard always reaches a result.
 */
export type DiagnosticMode = "death" | "preparation";

export const completeDiagnostic = async (
  page: Page,
  mode: DiagnosticMode = "death",
): Promise<void> => {
  const step = page.locator("[data-slot=card-content]").first();

  for (let visited = 0; visited < 20; visited += 1) {
    if (page.url().includes("/diagnostic/resultat")) return;

    // The first question decides the whole branch — a dossier in PREPARATION or one already
    // active — so it is the one answer a journey chooses rather than takes as it comes.
    await (visited === 0 ? answerMode(page, mode) : answerCurrentQuestion(page));
    const before = await step.innerText();

    const finish = page.getByRole("button", { name: copy.finish });
    const advance = (await finish.isVisible())
      ? finish
      : page.getByRole("button", { name: copy.next });
    await advance.click();

    // The wizard swaps the question in place, so there is no navigation to wait for except on
    // the last step. Waiting on the step's own content is what makes the next iteration read
    // the new question rather than the one it just answered.
    await page.waitForFunction(
      (previous) =>
        globalThis.location.pathname.includes("/diagnostic/resultat") ||
        (document.querySelector("[data-slot=card-content]")?.textContent ?? "") !== previous,
      before,
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

const answerCurrentQuestion = async (page: Page): Promise<void> => {
  const radios = page.getByRole("radio");
  if ((await radios.count()) > 0) {
    // HeroUI renders the real input visually hidden behind its own control, so a plain click
    // lands on the decoration. The input still handles the event, hence the forced check.
    await radios.first().check({ force: true });
    return;
  }

  // Segmented date field. The locale is pinned to fr-FR, so the segments read day, month, year
  // and typing eight digits into the first one fills all three.
  const dateSegments = page.getByRole("spinbutton");
  if ((await dateSegments.count()) > 0) {
    await dateSegments.first().click();
    await page.keyboard.type("01012026");
    return;
  }

  // A number field also exposes its input as a textbox, so the stepper buttons are what tells
  // the two apart — a name typed into an age field leaves the step invalid and Next disabled,
  // which is a very slow way to discover the wrong branch was taken.
  const isNumberField = (await page.getByRole("button", { name: /Augmenter/ }).count()) > 0;

  const textbox = page.getByRole("textbox");
  if ((await textbox.count()) > 0) {
    await textbox.first().fill(isNumberField ? "70" : "Jean Dupont");
    // React Aria commits a number on blur; without this the value never reaches the answer.
    await textbox.first().blur();
    return;
  }

  throw new Error("no answerable field on the current diagnostic step");
};
