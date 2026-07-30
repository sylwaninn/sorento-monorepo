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
import { collaborationCopy } from "#e2e/support/copy-collaboration";
import { createConfirmedAccount, membershipRole } from "#e2e/support/backend";

/**
 * A dossier is shared between relatives, and what each of them may do is stated in three places
 * that can disagree: the permission matrix in core, the RLS policies, and the screens. The
 * integration suites prove the database refuses the right people. Only a journey can prove the
 * browser offers the right person the right control, and offers nobody else a button that leads
 * to a refusal they cannot understand.
 *
 * Joining a dossier, and a forwarded link being refused, are covered by invitation.e2e.ts. What
 * is here is everything that happens once several people share the space: what each role is
 * offered, who carries which procedure, and the three irreversible acts an owner performs on
 * other people, removal, transfer and revocation.
 */

const COMMENT_FROM_VIEWER = "Le certificat est arrivé ce matin.";

const OWNER_FIRST_NAME = "Camille";

/**
 * An activity entry as it reads on screen: who did it, then what they did.
 *
 * Naming the actor is not decoration. The action label alone also matches the log's own type
 * filter, whose options are the same sentences, and a family reading the log needs the two
 * halves together for the entry to mean anything.
 */
const logEntry = (action: string): string => `${OWNER_FIRST_NAME} ${action}`;

/**
 * A select is a combobox opening a listbox in a portal, and the trigger's accessible name is
 * its label followed by the value it currently shows. Naming the label alone therefore reaches
 * it whatever it is currently set to.
 */
const chooseInSelect = async (page: Page, label: string, option: string): Promise<void> => {
  await page.getByRole("combobox", { name: label }).first().click();
  await page.getByRole("option", { name: option }).click();
};

/**
 * Invites someone with a role of the owner's choosing. The shared helper always takes the
 * default, and the whole point of half of this file is that the role is not the same thing.
 */
const inviteWithRole = async (
  page: Page,
  dossierId: string,
  email: string,
  role: string,
): Promise<string> => {
  await page.goto(`/dossiers/${dossierId}/membres`);
  await page.getByRole("textbox", { name: copy.inviteEmail }).fill(email);
  await chooseInSelect(page, collaborationCopy.inviteRoleLabel, role);
  await page.getByRole("button", { name: copy.sendInvitation }).click();

  const acceptUrl = await page
    .locator("code", { hasText: "/invitations/accepter" })
    .first()
    .innerText();
  expect(acceptUrl).toContain("/invitations/accepter");
  return acceptUrl;
};

const joinDossier = async (page: Page, email: string, acceptUrl: string): Promise<void> => {
  await logIn(page, email);
  await page.goto(pathOf(acceptUrl));
  await page.getByRole("button", { name: copy.acceptInvitation }).click();
  await expect(page).toHaveURL(/\/dossiers\/[0-9a-f-]{36}/, { timeout: 30_000 });
};

/**
 * Opens the first procedure of the dossier and returns its title as the detail screen states it.
 *
 * The dashboard renders one link per tracked item and their labels come from the catalog, which
 * is data rather than copy this suite could mirror, so the route is what identifies them here.
 */
const openFirstProcedure = async (page: Page, dossierId: string): Promise<string> => {
  await page.goto(`/dossiers/${dossierId}`);
  await page.locator(`a[href*="/dossiers/${dossierId}/demarches/"]`).first().click();
  await page.waitForURL(/\/demarches\/[0-9a-f-]{36}/);
  return page.getByRole("heading", { level: 1 }).innerText();
};

test.describe("several relatives sharing one dossier", () => {
  test("a viewer reads and comments, and is offered nothing that changes the dossier", async ({
    page,
    browser,
  }) => {
    const ownerEmail = uniqueEmail("view-owner");
    const viewerEmail = uniqueEmail("view-reader");
    await createConfirmedAccount(ownerEmail, TEST_PASSWORD, OWNER_FIRST_NAME);
    const viewerId = await createConfirmedAccount(viewerEmail, TEST_PASSWORD, "Dominique");

    await logIn(page, ownerEmail);
    const dossierId = await createDossier(page, "death");
    const acceptUrl = await inviteWithRole(
      page,
      dossierId,
      viewerEmail,
      collaborationCopy.roleViewer,
    );

    const viewerContext = await browser.newContext();
    const viewerPage = await viewerContext.newPage();
    try {
      await joinDossier(viewerPage, viewerEmail, acceptUrl);
      expect(await membershipRole(dossierId, viewerId)).toBe("viewer");

      await openFirstProcedure(viewerPage, dossierId);

      // A viewer is invited to follow the dossier, not to run it. The controls that would change
      // it are visible so the screen stays legible, and inert so nothing sends them into a
      // refusal from the database they have no way to interpret.
      await expect(
        viewerPage.getByRole("button", { name: collaborationCopy.statusLabel }),
      ).toBeDisabled();
      await expect(
        viewerPage.getByRole("button", { name: collaborationCopy.assigneeLabel }),
      ).toBeDisabled();

      // Reading and saying something are the whole point of the role.
      await viewerPage.getByRole("tab", { name: collaborationCopy.commentsTab }).click();
      await viewerPage
        .getByRole("textbox", { name: collaborationCopy.writeComment })
        .fill(COMMENT_FROM_VIEWER);
      await viewerPage.getByRole("button", { name: collaborationCopy.publishComment }).click();
      await expect(viewerPage.getByText(COMMENT_FROM_VIEWER)).toBeVisible();

      await viewerPage.goto(`/dossiers/${dossierId}/membres`);
      await expect(viewerPage.getByText(collaborationCopy.membersTitle)).toBeVisible();

      // Who else shares the dossier is information a viewer may have. Changing that list is not.
      await expect(viewerPage.getByText(collaborationCopy.inviteTitle)).toBeHidden();
      await expect(
        viewerPage.getByRole("button", { name: collaborationCopy.removeMember }),
      ).toBeHidden();
    } finally {
      await viewerContext.close();
    }
  });

  test("a collaborator works a procedure but cannot manage the members", async ({
    page,
    browser,
  }) => {
    const ownerEmail = uniqueEmail("collab-owner");
    const collaboratorEmail = uniqueEmail("collab-relative");
    await createConfirmedAccount(ownerEmail, TEST_PASSWORD, OWNER_FIRST_NAME);
    await createConfirmedAccount(collaboratorEmail, TEST_PASSWORD, "Dominique");

    await logIn(page, ownerEmail);
    const dossierId = await createDossier(page, "death");
    const acceptUrl = await inviteWithRole(
      page,
      dossierId,
      collaboratorEmail,
      collaborationCopy.roleCollaborator,
    );

    const collaboratorContext = await browser.newContext();
    const collaboratorPage = await collaboratorContext.newPage();
    try {
      await joinDossier(collaboratorPage, collaboratorEmail, acceptUrl);

      await openFirstProcedure(collaboratorPage, dossierId);
      await chooseInSelect(
        collaboratorPage,
        collaborationCopy.statusLabel,
        collaborationCopy.statusInProgress,
      );

      // The dashboard is where the family reads where things stand, so the status a relative set
      // has to be what it shows, not what the screen they set it on remembers.
      await collaboratorPage.goto(`/dossiers/${dossierId}`);
      await expect(
        collaboratorPage.getByText(collaborationCopy.statusInProgress).first(),
      ).toBeVisible();

      await collaboratorPage.goto(`/dossiers/${dossierId}/membres`);
      await expect(collaboratorPage.getByText(collaborationCopy.membersTitle)).toBeVisible();
      await expect(collaboratorPage.getByText(collaborationCopy.inviteTitle)).toBeHidden();
      await expect(
        collaboratorPage.getByRole("button", { name: collaborationCopy.removeMember }),
      ).toBeHidden();
    } finally {
      await collaboratorContext.close();
    }
  });

  test("a procedure assigned to a relative becomes theirs", async ({ page, browser }) => {
    const ownerEmail = uniqueEmail("assign-owner");
    const relativeEmail = uniqueEmail("assign-relative");
    await createConfirmedAccount(ownerEmail, TEST_PASSWORD, OWNER_FIRST_NAME);
    await createConfirmedAccount(relativeEmail, TEST_PASSWORD, "Dominique");

    await logIn(page, ownerEmail);
    const dossierId = await createDossier(page, "death");
    const acceptUrl = await inviteWithRole(
      page,
      dossierId,
      relativeEmail,
      collaborationCopy.roleCollaborator,
    );

    const relativeContext = await browser.newContext();
    const relativePage = await relativeContext.newPage();
    try {
      await joinDossier(relativePage, relativeEmail, acceptUrl);

      // Nothing is theirs yet, which is what makes the same view after the assignment mean
      // something.
      await relativePage.goto(`/dossiers/${dossierId}`);
      await relativePage.getByRole("button", { name: collaborationCopy.filterMine }).click();
      await expect(relativePage.getByText(collaborationCopy.noProcedures)).toBeVisible();

      const title = await openFirstProcedure(page, dossierId);
      await chooseInSelect(page, collaborationCopy.assigneeLabel, "Dominique");
      await expect(page.getByRole("button", { name: "Dominique" })).toBeVisible();

      // Sharing a dossier is dividing the work: what the person carries has to reach the view
      // they open to find out what is waiting for them.
      await relativePage.goto(`/dossiers/${dossierId}`);
      await relativePage.getByRole("button", { name: collaborationCopy.filterMine }).click();
      await expect(relativePage.getByText(title).first()).toBeVisible();
    } finally {
      await relativeContext.close();
    }
  });

  test("removing a member frees their procedures and closes the door behind them", async ({
    page,
    browser,
  }) => {
    const ownerEmail = uniqueEmail("remove-owner");
    const relativeEmail = uniqueEmail("remove-relative");
    await createConfirmedAccount(ownerEmail, TEST_PASSWORD, OWNER_FIRST_NAME);
    const relativeId = await createConfirmedAccount(relativeEmail, TEST_PASSWORD, "Dominique");

    await logIn(page, ownerEmail);
    const dossierId = await createDossier(page, "death");
    const acceptUrl = await inviteWithRole(
      page,
      dossierId,
      relativeEmail,
      collaborationCopy.roleCollaborator,
    );

    const relativeContext = await browser.newContext();
    const relativePage = await relativeContext.newPage();
    try {
      await joinDossier(relativePage, relativeEmail, acceptUrl);

      await openFirstProcedure(page, dossierId);
      const procedureUrl = page.url();
      await chooseInSelect(page, collaborationCopy.assigneeLabel, "Dominique");
      await expect(page.getByRole("button", { name: "Dominique" })).toBeVisible();

      await page.goto(`/dossiers/${dossierId}/membres`);
      await page.getByRole("button", { name: collaborationCopy.removeMember }).click();
      await expect(page.getByRole("button", { name: collaborationCopy.removeMember })).toBeHidden();
      expect(await membershipRole(dossierId, relativeId)).toBeUndefined();

      // The rule this protects: a procedure someone was carrying goes back to unassigned rather
      // than pointing at a person nobody can reach any more. A family reading "assigned to
      // Dominique" would wait for someone who no longer has the dossier.
      await page.goto(procedureUrl);
      await expect(page.getByRole("button", { name: collaborationCopy.unassigned })).toBeVisible();

      // Removing a relative from a shared bereavement space is not a silent act.
      await page.goto(`/dossiers/${dossierId}/activite`);
      await expect(page.getByText(logEntry(collaborationCopy.memberRemoved))).toBeVisible();

      // And the access goes with the membership, in the session they already had open.
      await relativePage.goto("/mes-dossiers");
      await expect(relativePage.getByText(DIAGNOSTIC_SUBJECT_NAME)).toBeHidden();
      await relativePage.goto(`/dossiers/${dossierId}`);
      await expect(relativePage.getByText(DIAGNOSTIC_SUBJECT_NAME)).toBeHidden();
    } finally {
      await relativeContext.close();
    }
  });

  test("transferring the ownership moves the controls with it", async ({ page, browser }) => {
    const ownerEmail = uniqueEmail("transfer-owner");
    const successorEmail = uniqueEmail("transfer-successor");
    const ownerId = await createConfirmedAccount(ownerEmail, TEST_PASSWORD, OWNER_FIRST_NAME);
    const successorId = await createConfirmedAccount(successorEmail, TEST_PASSWORD, "Dominique");

    await logIn(page, ownerEmail);
    const dossierId = await createDossier(page, "death");
    const acceptUrl = await inviteWithRole(
      page,
      dossierId,
      successorEmail,
      collaborationCopy.roleCollaborator,
    );

    const successorContext = await browser.newContext();
    const successorPage = await successorContext.newPage();
    try {
      await joinDossier(successorPage, successorEmail, acceptUrl);

      await page.goto(`/dossiers/${dossierId}/membres`);
      await page.getByRole("button", { name: collaborationCopy.transferOwnership }).click();
      await page.getByRole("button", { name: collaborationCopy.confirmTransfer }).click();

      // The screen states the transfer is immediate. Immediate means in this session, not after
      // a sign-out the person handing over responsibility has no reason to perform.
      await expect(page.getByText(collaborationCopy.inviteTitle)).toBeHidden();
      await expect(page.getByRole("button", { name: collaborationCopy.removeMember })).toBeHidden();

      expect(await membershipRole(dossierId, ownerId)).toBe("collaborator");
      expect(await membershipRole(dossierId, successorId)).toBe("owner");

      // A dossier is never left without someone able to run it: what one loses, the other gains.
      await successorPage.goto(`/dossiers/${dossierId}/membres`);
      await expect(successorPage.getByText(collaborationCopy.inviteTitle)).toBeVisible();
      await expect(
        successorPage.getByRole("button", { name: collaborationCopy.removeMember }),
      ).toBeVisible();

      await successorPage.goto(`/dossiers/${dossierId}/activite`);
      await expect(
        successorPage.getByText(logEntry(collaborationCopy.ownershipTransferred)),
      ).toBeVisible();
    } finally {
      await successorContext.close();
    }
  });

  test("a revoked invitation stops being a way in", async ({ page, browser }) => {
    const ownerEmail = uniqueEmail("revoke-owner");
    const invitedEmail = uniqueEmail("revoke-invited");
    await createConfirmedAccount(ownerEmail, TEST_PASSWORD, OWNER_FIRST_NAME);
    const invitedId = await createConfirmedAccount(invitedEmail, TEST_PASSWORD, "Dominique");

    await logIn(page, ownerEmail);
    const dossierId = await createDossier(page, "death");
    const acceptUrl = await inviteWithRole(
      page,
      dossierId,
      invitedEmail,
      collaborationCopy.roleCollaborator,
    );

    await page.getByRole("button", { name: collaborationCopy.revokeInvitation }).click();
    await expect(page.getByText(collaborationCopy.pendingInvitationsEmpty)).toBeVisible();

    await page.goto(`/dossiers/${dossierId}/activite`);
    await expect(page.getByText(logEntry(collaborationCopy.invitationRevoked))).toBeVisible();

    // An invitation sent by mistake, or to the wrong address, has to be recallable: the link is
    // already in someone's mailbox and nothing can take it back from there.
    const invitedContext = await browser.newContext();
    const invitedPage = await invitedContext.newPage();
    try {
      await logIn(invitedPage, invitedEmail);
      await invitedPage.goto(pathOf(acceptUrl));

      await expect(invitedPage.getByText(collaborationCopy.invalidInvitation)).toBeVisible();
      expect(await membershipRole(dossierId, invitedId)).toBeUndefined();
    } finally {
      await invitedContext.close();
    }
  });
});
