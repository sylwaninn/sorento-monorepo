import { expect, test, type Locator, type Page } from "@playwright/test";
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
import { workspaceCopy } from "#e2e/support/copy-workspace";
import { createConfirmedAccount } from "#e2e/support/backend";
import {
  catalogBenefits,
  catalogProcedure,
  letterTemplateTitle,
  percentageIn,
  smallPdf,
} from "#e2e/support/workspace-setup";

/**
 * Working through a dossier, screen by screen, the way a bereaved person does over several days.
 *
 * The other suites prove each piece in isolation: the engine orders the journey, the policies
 * refuse the wrong reader, the screens render. None of them can fail when the promise the product
 * makes to a grieving person is broken: that the list stays short and calm, that a letter is
 * offered as a draft to sign rather than as an act, that a comment can be withdrawn but never
 * rewritten, and that correcting an answer corrects the journey.
 */

const OWNER_FIRST_NAME = "Camille";

/** Every journey below needs the same starting point: one person, one active dossier of theirs. */
const openNewDossier = async (page: Page, prefix: string): Promise<string> => {
  const email = uniqueEmail(prefix);
  await createConfirmedAccount(email, TEST_PASSWORD, OWNER_FIRST_NAME);
  await logIn(page, email);
  return createDossier(page, "death");
};

const progressLine = (page: Page): Locator => page.getByText(workspaceCopy.progressSuffix);

const readProgress = async (page: Page): Promise<number> =>
  percentageIn(await progressLine(page).innerText());

/**
 * Wording that must appear nowhere, so it is stated here rather than mirrored: no dictionary
 * contains it, and mirrors(...) can only compare a string against a dictionary that does.
 */
const ASSERTIVE_ENTITLEMENT = /vous avez droit/i;
const LATENESS_COUNTER = /retard/i;
const EDIT_OR_REACT = /modifier|éditer|réagir|réaction|j'aime/i;

test.describe("working through a dossier", () => {
  test("a first visit finds an honest empty list, then the dossier that was created", async ({
    page,
  }) => {
    const email = uniqueEmail("list");
    await createConfirmedAccount(email, TEST_PASSWORD, OWNER_FIRST_NAME);
    await logIn(page, email);

    // Having no dossier yet is a normal state on the first day, not an error: the screen says so
    // in a full sentence and offers the one way forward instead of showing an empty frame.
    await expect(page.getByText(workspaceCopy.noDossierYet)).toBeVisible();
    await expect(
      page.getByRole("link", { name: workspaceCopy.createDossierFromList }),
    ).toBeVisible();

    const dossierId = await createDossier(page, "death");
    await page.goto("/mes-dossiers");

    // The person recognises their dossier by the name of the person who died, not by an id.
    const entry = page.getByRole("link", { name: DIAGNOSTIC_SUBJECT_NAME });
    await expect(entry).toContainText(workspaceCopy.dossierActive);
    await entry.click();

    await expect(page).toHaveURL(new RegExp(`/dossiers/${dossierId}$`));
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      workspaceCopy.dashboardTitle,
    );
  });

  test("the dashboard asks for two or three things, calmly, and never counts the days late", async ({
    page,
  }) => {
    await openNewDossier(page, "dashboard");

    const focus = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: workspaceCopy.focusTitle }) });
    const focusItems = focus.getByRole("link");

    // Two or three things to do now, never the wall of thirty tasks: the count is the whole
    // point of the section, and a regression here is exactly what a grieving person cannot take.
    // Counting does not wait on its own, so the section is awaited before it is measured.
    await expect(focusItems.first()).toBeVisible();
    expect(await focusItems.count()).toBeLessThanOrEqual(3);

    // The dossier was opened with a death date in the past, so every deadline has passed. That
    // has to read as information rather than as a reproach: one calm sentence, no counter of
    // days late anywhere on the screen.
    await expect(focusItems.first()).toContainText(workspaceCopy.overdue);
    await expect(page.getByText(LATENESS_COUNTER)).toHaveCount(0);

    // No aggressive red on a late item. The colour is carried by the component's own class, so
    // this reads the one thing a browser can see about it.
    await expect(focus.locator("[class*='danger']")).toHaveCount(0);

    await expect(progressLine(page)).toHaveText(`0 ${workspaceCopy.progressSuffix}`);

    // Nothing is assigned to anyone yet, so "mine" is empty; progress still describes the whole
    // dossier, because a filtered view that moved the percentage would be reporting a fiction.
    await page.getByRole("button", { name: workspaceCopy.filterMine }).click();
    await expect(page.getByText(workspaceCopy.noProcedures)).toBeVisible();
    await expect(progressLine(page)).toHaveText(`0 ${workspaceCopy.progressSuffix}`);
    await page.getByRole("button", { name: workspaceCopy.filterAll }).click();

    for (const label of [
      workspaceCopy.benefitsLink,
      workspaceCopy.forgottenMoneyLink,
      workspaceCopy.documentsLink,
      workspaceCopy.activityLink,
    ]) {
      await expect(page.getByRole("link", { name: label })).toBeVisible();
    }
  });

  test("a procedure moved forward shows up in the progress and in the activity log", async ({
    page,
  }) => {
    const dossierId = await openNewDossier(page, "procedure");
    const bank = await catalogProcedure("bank_account_freeze");

    await expect(progressLine(page)).toBeVisible();
    const before = await readProgress(page);
    await page.getByRole("link", { name: bank.title }).first().click();
    await expect(page).toHaveURL(new RegExp(`/demarches/${bank.id}$`));

    // The picker announces itself as its current value followed by its label, which is also the
    // shortest proof that the procedure starts where a new dossier should start it.
    await page
      .getByRole("button", { name: `${workspaceCopy.statusTodo} ${workspaceCopy.statusLabel}` })
      .click();
    await page.getByRole("option", { name: workspaceCopy.statusDone }).click();

    // Marking one thing done is the only reward this product can offer, so the dashboard has to
    // acknowledge it. A progress bar that does not move is worse than no progress bar.
    await page.goto(`/dossiers/${dossierId}`);
    await expect.poll(async () => readProgress(page)).toBeGreaterThan(before);
    await expect(page.getByRole("link", { name: bank.title }).first()).toContainText(
      workspaceCopy.statusDone,
    );

    // The dossier is shared with relatives, so what one person did has to be visible to the
    // others, under their name and not under "the system".
    await page.goto(`/dossiers/${dossierId}/activite`);
    await expect(
      page.getByText(`${OWNER_FIRST_NAME} ${workspaceCopy.didChangeStatus}`),
    ).toBeVisible();
  });

  test("the generated letter is a draft to review and sign, not an act written for you", async ({
    page,
  }) => {
    const dossierId = await openNewDossier(page, "letter");
    const bank = await catalogProcedure("bank_account_freeze");
    const templateTitle = await letterTemplateTitle(bank.id);

    await page.goto(`/dossiers/${dossierId}/demarches/${bank.id}`);
    await page.getByRole("tab", { name: workspaceCopy.tabLetter }).click();

    // The single most dangerous thing this product could do is let someone believe a generated
    // letter is a legal act produced on their behalf. The notice says otherwise, above the
    // button, and it is not dismissible.
    await expect(page.getByText(workspaceCopy.letterNotice)).toBeVisible();

    // The draft is honest about what is still missing rather than sending a letter with holes.
    await expect(page.getByText(workspaceCopy.letterMissingVariables)).toBeVisible();

    await page.getByRole("textbox", { name: workspaceCopy.letterSenderName }).fill("Camille Roux");
    // The second field is labelled with the template's raw variable name, in English, which is
    // what a bereaved French reader is shown and is reported as a defect of its own. The journey
    // has to name it as it is in order to type into it.
    await page.getByRole("textbox", { name: "accountNumber" }).fill("FR7612345678901234567890");

    await expect(page.getByText(workspaceCopy.letterMissingVariables)).toHaveCount(0);
    await expect(page.getByText("Camille Roux")).toBeVisible();
    await expect(page.getByText(DIAGNOSTIC_SUBJECT_NAME)).toBeVisible();

    // The person leaves with a file they can print and sign.
    const downloaded = page.waitForEvent("download");
    await page.getByRole("button", { name: workspaceCopy.letterDownload }).click();
    expect((await downloaded).suggestedFilename()).toBe(`${templateTitle}.pdf`);

    await page.getByRole("tab", { name: workspaceCopy.tabHistory }).click();
    await expect(
      page.getByText(`${OWNER_FIRST_NAME} ${workspaceCopy.didGenerateLetter}`),
    ).toBeVisible();
  });

  test("a comment can be published and withdrawn, never rewritten and never reacted to", async ({
    page,
  }) => {
    const dossierId = await openNewDossier(page, "comments");
    const bank = await catalogProcedure("bank_account_freeze");

    await page.goto(`/dossiers/${dossierId}/demarches/${bank.id}`);
    await page.getByRole("tab", { name: workspaceCopy.tabComments }).click();
    await expect(page.getByText(workspaceCopy.commentsEmpty)).toBeVisible();

    const said = "J'ai appelé la banque, ils demandent l'acte de décès.";
    await page.getByRole("textbox", { name: workspaceCopy.commentPlaceholder }).fill(said);
    await page.getByRole("button", { name: workspaceCopy.commentSubmit }).click();
    await expect(page.getByText(said)).toBeVisible();

    // Between relatives, a comment nobody can edit is what keeps a shared history trustworthy,
    // and reactions would turn a bereavement into a feed.
    await expect(page.getByRole("button", { name: EDIT_OR_REACT })).toHaveCount(0);

    await page.getByRole("button", { name: workspaceCopy.commentDelete }).click();

    // Withdrawing leaves a trace rather than a hole: the family sees that something was said and
    // taken back, which is honest, instead of a conversation that silently rewrites itself.
    await expect(page.getByText(workspaceCopy.commentDeleted)).toBeVisible();
    await expect(page.getByText(said)).toHaveCount(0);
  });

  test("a document is attached, downloaded and removed, and the log says who did it", async ({
    page,
  }) => {
    const dossierId = await openNewDossier(page, "documents");
    await page.goto(`/dossiers/${dossierId}/documents`);

    // The promise is a safe place to put papers, and the limit of that promise is stated.
    await expect(page.getByText(workspaceCopy.documentsNotice)).toBeVisible();
    await expect(page.getByText(workspaceCopy.documentsEmpty)).toBeVisible();

    const fileName = "acte-de-deces.pdf";
    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: workspaceCopy.documentAdd }).click();
    await (
      await chooser
    ).setFiles({ name: fileName, mimeType: "application/pdf", buffer: smallPdf() });

    await expect(page.getByText(fileName)).toBeVisible();

    // A document that goes in and cannot come out is not storage, it is a hole.
    const downloaded = page.waitForEvent("download");
    await page.getByRole("button", { name: workspaceCopy.documentDownload }).click();
    const savedAs = (await downloaded).suggestedFilename();

    await page.getByRole("button", { name: workspaceCopy.documentDelete }).click();
    await expect(page.getByText(workspaceCopy.documentsEmpty)).toBeVisible();

    await page.goto(`/dossiers/${dossierId}/activite`);
    await expect(
      page.getByText(`${OWNER_FIRST_NAME} ${workspaceCopy.didAddDocument}`),
    ).toBeVisible();
    await expect(
      page.getByText(`${OWNER_FIRST_NAME} ${workspaceCopy.didRemoveDocument}`),
    ).toBeVisible();

    // Asserted last so the rest of the journey is still evidence: the file a person opens from
    // their downloads folder has to be the death certificate they filed, under the name they
    // gave it, not an identifier they have no way of recognising.
    expect(savedAs).toBe(fileName);
  });

  test("every benefit is offered cautiously, with its source and the date it was checked", async ({
    page,
  }) => {
    const dossierId = await openNewDossier(page, "benefits");
    const benefits = await catalogBenefits();

    await page.goto(`/dossiers/${dossierId}/aides`);
    await expect(page.getByRole("heading", { name: workspaceCopy.benefitsTitle })).toBeVisible();

    // An amount and an eligibility are the two things this product must never assert. Every
    // benefit shown carries the catalog's own prudent wording, and no screen states a right.
    await expect(page.getByRole("link", { name: workspaceCopy.sourceLabel }).first()).toBeVisible();
    let shown = 0;
    for (const benefit of benefits) {
      if ((await page.getByRole("heading", { name: benefit.title }).count()) === 0) continue;
      shown += 1;
      await expect(page.getByText(benefit.cautionText)).toBeVisible();
    }
    expect(shown).toBeGreaterThan(0);
    await expect(page.getByText(ASSERTIVE_ENTITLEMENT)).toHaveCount(0);

    // Provenance is not decoration: one official source and one verification date per benefit,
    // so nothing on this screen is the product's own opinion.
    await expect(page.getByRole("link", { name: workspaceCopy.sourceLabel })).toHaveCount(shown);
    await expect(page.getByRole("link", { name: workspaceCopy.benefitsFormLink })).toHaveCount(
      shown,
    );
    await expect(
      page.getByText(new RegExp(`${workspaceCopy.verifiedAtPrefix} \\d{2}/\\d{2}/\\d{4}`)),
    ).toHaveCount(shown);

    // Inheritance is the one subject where general information is not enough, so the screen that
    // carries it sends the person to a notaire.
    const estate = await catalogProcedure("estate_notary");
    await page.goto(`/dossiers/${dossierId}/demarches/${estate.id}`);
    await expect(
      page.getByText(`${workspaceCopy.professionPrefix} ${workspaceCopy.professionNotaire}.`),
    ).toBeVisible();
    await expect(
      page.getByText(`${workspaceCopy.verifiedAtPrefix} ${estate.verifiedOn}`),
    ).toBeVisible();
  });

  test("forgotten money is free, and the contracts I inventory turn up where I need them", async ({
    page,
  }) => {
    const dossierId = await openNewDossier(page, "money");

    await page.goto(`/dossiers/${dossierId}/argent-oublie`);

    // People are charged for these searches elsewhere. Saying the official services are free,
    // and that this product takes no cut, is the reason the screen exists.
    await expect(page.getByText(workspaceCopy.forgottenMoneyNotice)).toBeVisible();
    const officialLinks = page.getByRole("link", { name: workspaceCopy.officialServiceLink });
    const blocks = await officialLinks.count();
    expect(blocks).toBeGreaterThan(0);
    await expect(page.getByText(workspaceCopy.forgottenMoneyBlockNotice)).toHaveCount(blocks);
    await expect(page.getByRole("link", { name: workspaceCopy.sourceLabel })).toHaveCount(blocks);
    await expect(page.getByText(workspaceCopy.inventoriedContractsEmpty)).toBeVisible();

    await page.goto(`/dossiers/${dossierId}/contrats`);
    await expect(page.getByText(workspaceCopy.contractsEmpty)).toBeVisible();
    await page.getByRole("button", { name: workspaceCopy.contractAdd }).click();
    await page
      .getByRole("textbox", { name: workspaceCopy.contractTypeLabel })
      .fill("Assurance-vie");
    await page.getByRole("textbox", { name: workspaceCopy.contractCompanyLabel }).fill("Mutavie");
    await page.getByRole("textbox", { name: workspaceCopy.contractNumberLabel }).fill("AV-99001");
    await page.getByRole("button", { name: workspaceCopy.contractSave }).click();
    await expect(page.getByText("AV-99001")).toBeVisible();

    // Inventorying a contract is only worth the effort if it comes back at the moment it matters,
    // which is when the family is looking for money nobody claimed.
    await page.goto(`/dossiers/${dossierId}/argent-oublie`);
    await expect(page.getByText("AV-99001")).toBeVisible();
    await expect(page.getByText(workspaceCopy.inventoriedContractsEmpty)).toHaveCount(0);

    await page.goto(`/dossiers/${dossierId}/contrats`);
    await page.getByRole("button", { name: workspaceCopy.contractDelete }).click();
    await expect(page.getByText(workspaceCopy.contractsEmpty)).toBeVisible();
  });

  test("wishes are written down, kept, and never presented as having legal force", async ({
    page,
  }) => {
    const dossierId = await openNewDossier(page, "wishes");
    await page.goto(`/dossiers/${dossierId}/souhaits`);

    // Someone writing down their funeral wishes has to be told, on this screen, that this is not
    // a will and where to go for something binding.
    await expect(page.getByText(workspaceCopy.wishesNotice)).toBeVisible();

    const wish = "Une cérémonie simple, sans fleurs ni couronnes.";
    await page.getByRole("textbox", { name: workspaceCopy.funeralWishesLabel }).fill(wish);
    await page
      .getByRole("textbox", { name: workspaceCopy.peopleToNotifyLabel })
      .fill("Sa soeur Anne, son ancien collègue Marc");
    await page.getByRole("button", { name: workspaceCopy.wishesSave }).click();
    await expect(page.getByText(workspaceCopy.wishesSaved)).toBeVisible();

    // Saved has to mean saved: this is the kind of text nobody wants to write twice.
    await page.reload();
    await expect(page.getByRole("textbox", { name: workspaceCopy.funeralWishesLabel })).toHaveValue(
      wish,
    );
  });

  test("correcting my situation corrects the journey it produced", async ({ page }) => {
    // Known defect, deliberately recorded rather than deleted. Tracking rows are seeded once when
    // the dossier is created; sync_diagnostic_answers rewrites the answers and nothing
    // re-evaluates which procedures still apply. Someone who corrects their marital status is
    // still told to claim a survivor's pension their own answer rules out. Whether the procedure
    // should disappear or be marked "sans objet" is a product decision, which is why this is
    // recorded rather than patched. Playwright fails the run the day it starts passing.
    test.fail();
    const dossierId = await openNewDossier(page, "situation");
    const survivorPension = await catalogProcedure("survivor_pension_request");
    const benefits = await catalogBenefits();
    const reversion = benefits.find((benefit) => benefit.title.includes("réversion"));
    if (reversion === undefined) throw new Error("the catalog has no survivor pension benefit");

    // The diagnostic was answered with a married couple, so the survivor's pension is part of
    // the journey on both screens before anything is corrected.
    await page.goto(`/dossiers/${dossierId}/aides`);
    await expect(page.getByRole("heading", { name: reversion.title })).toBeVisible();
    await page.goto(`/dossiers/${dossierId}`);
    await expect(page.getByRole("link", { name: survivorPension.title }).first()).toBeVisible();

    await page.goto(`/dossiers/${dossierId}/ma-situation`);
    // HeroUI hides the real radio behind its own control, so the click has to be forced onto the
    // input that actually handles the event.
    await page.getByRole("radio", { name: workspaceCopy.maritalSingle }).check({ force: true });
    await page.getByRole("button", { name: workspaceCopy.situationSave }).click();
    await expect(page.getByText(workspaceCopy.situationSaved)).toBeVisible();

    // The whole product is the promise that the journey follows the answers. Someone who
    // corrects "married" to "single" must stop being offered a widow's pension: the benefits
    // screen recomputes from the answers.
    await page.goto(`/dossiers/${dossierId}/aides`);
    await expect(page.getByRole("heading", { name: workspaceCopy.benefitsTitle })).toBeVisible();
    await expect(page.getByRole("heading", { name: reversion.title })).toHaveCount(0);

    // And the same correction has to reach the list of things to do. Being told to claim a
    // survivor's pension one is not entitled to is the exact harm the cautious wording rules
    // exist to prevent. Marking the procedure "Sans objet" instead of dropping it would be an
    // equally good answer, and would be a deliberate change to this assertion.
    // Waiting for the journey to be on screen first, because an absence asserted against a page
    // that has not finished loading is an assertion that proves nothing.
    await page.goto(`/dossiers/${dossierId}`);
    await expect(page.getByRole("heading", { name: workspaceCopy.focusTitle })).toBeVisible();
    await expect(progressLine(page)).toBeVisible();
    await expect(page.getByRole("link", { name: survivorPension.title })).toHaveCount(0);
  });

  test("the bell brings news of the dossier, and reading it clears it", async ({
    page,
    browser,
  }) => {
    const guestEmail = uniqueEmail("guest");
    await createConfirmedAccount(guestEmail, TEST_PASSWORD, "Dominique");

    const dossierId = await openNewDossier(page, "notifications");
    const acceptUrl = await inviteRelative(page, dossierId, guestEmail);

    const guestContext = await browser.newContext();
    const guestPage = await guestContext.newPage();
    try {
      await logIn(guestPage, guestEmail);
      await guestPage.goto(pathOf(acceptUrl));
      await guestPage.getByRole("button", { name: copy.acceptInvitation }).click();
      await expect(guestPage).toHaveURL(/\/dossiers\/[0-9a-f-]{36}/, { timeout: 30_000 });
    } finally {
      await guestContext.close();
    }

    // Someone joining a dossier is news the other members are entitled to, unprompted: the bell
    // carries an unread count without an email being involved.
    await page.goto("/mes-dossiers");
    const bell = page.getByRole("button", { name: workspaceCopy.notificationsBell });
    await expect(bell).toContainText("1");

    await bell.click();
    await page.getByRole("menuitem", { name: workspaceCopy.notificationMemberJoined }).click();

    // Opening it takes the person where the news happened and stops nagging them about it.
    await expect(page).toHaveURL(new RegExp(`/dossiers/${dossierId}$`));
    await expect(bell).not.toContainText("1");
    await bell.click();
    await expect(
      page.getByRole("menuitem", { name: workspaceCopy.markAllNotificationsRead }),
    ).toHaveCount(0);
  });
});
