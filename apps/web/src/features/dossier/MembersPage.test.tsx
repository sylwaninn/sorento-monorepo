import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { DossierRole, Invitation, Membership, Profile } from "@sorento/domain";
import { MembersPage } from "@/features/dossier/MembersPage";
import { dossierContent } from "@/features/dossier/content";
import { repositories } from "@/lib/repositories";
import {
  aDossier,
  aMembership,
  anInvitation,
  aProfile,
  DOSSIER_ID,
  OTHER_USER_ID,
  stubDossierAccess,
} from "@/test/fixtures";
import { renderWithProviders } from "@/test/render";
import { signedInSession } from "@/test/supabase-stub";
import { must } from "@/test/must";

/**
 * Sharing a dossier is the feature that makes it collaborative, and it is also the one that
 * hands another person access to a dead relative's affairs. Who may invite, who may remove and
 * what is shown of a pending invitation are access decisions, not layout.
 */

const OTHER_MEMBERSHIP_ID = "0e000000-0000-4000-8000-000000000001";

const me = (role: DossierRole = "owner"): Membership => aMembership({ role });
const other = aMembership({
  id: OTHER_MEMBERSHIP_ID,
  userId: OTHER_USER_ID,
  role: "collaborator",
});

const profiles: Profile[] = [aProfile(), aProfile({ id: OTHER_USER_ID, firstName: "Malik" })];

interface Scenario {
  members: Membership[];
  invitations?: Invitation[];
}

const stubMembers = ({ members, invitations = [] }: Scenario): void => {
  stubDossierAccess({ dossier: aDossier(), members, profiles });
  vi.spyOn(repositories.invitations, "listPendingForDossier").mockResolvedValue(invitations);
};

const renderPage = () =>
  renderWithProviders(<MembersPage />, {
    route: `/dossiers/${DOSSIER_ID}/membres`,
    path: "/dossiers/:dossierId/membres",
    auth: { session: signedInSession(), user: signedInSession().user },
  });

describe("MembersPage", () => {
  it("lists who is on the dossier and in what role", async () => {
    stubMembers({ members: [me(), other] });
    renderPage();

    const row = must(
      (await screen.findByText("Malik")).closest("div"),
      "the list entry naming Malik",
    );

    expect(row).toHaveTextContent(dossierContent.members.roleLabels.collaborator);
    expect(row).toHaveTextContent(dossierContent.members.list.joinedOn);
  });

  /**
   * An owner may remove anyone but themselves: the alternative is a dossier whose last owner
   * removes their own access and locks the family out of it.
   */
  it("offers to remove the other members and never the viewer themselves", async () => {
    stubMembers({ members: [me(), other] });
    renderPage();

    await screen.findByText("Malik");

    expect(
      screen.getAllByRole("button", { name: dossierContent.members.list.removeButton }),
    ).toHaveLength(1);
  });

  it("drops a removed member from the list rather than leaving them on screen", async () => {
    stubMembers({ members: [me()] });
    // The first read is the dossier as it stands; every later one is the dossier after removal.
    vi.spyOn(repositories.memberships, "listForDossier").mockResolvedValueOnce([me(), other]);
    const removeMember = vi
      .spyOn(repositories.memberships, "removeMember")
      .mockResolvedValue(undefined);
    renderPage();

    await screen.findByText("Malik");
    await userEvent.click(
      screen.getByRole("button", { name: dossierContent.members.list.removeButton }),
    );

    expect(removeMember).toHaveBeenCalledWith(OTHER_MEMBERSHIP_ID);
    expect(await screen.findByText(new RegExp(aProfile().firstName))).toBeInTheDocument();
    expect(screen.queryByText("Malik")).not.toBeInTheDocument();
  });

  /**
   * The invitation email can fail to arrive, and a family in the middle of this cannot be left
   * with nothing to do about it: the link is shown so it can be passed on by other means.
   */
  it("confirms a sent invitation and shows the link it sent", async () => {
    stubMembers({ members: [me()] });
    const create = vi.spyOn(repositories.invitations, "create").mockResolvedValue({
      invitationId: anInvitation().id,
      acceptUrl: `https://sorento.test/invitations/accepter?token=${"f".repeat(64)}`,
    });
    renderPage();

    const email = await screen.findByRole("textbox", {
      name: dossierContent.members.invite.emailLabel,
    });
    await userEvent.type(email, "proche@exemple.fr");
    await userEvent.click(
      screen.getByRole("button", { name: dossierContent.members.invite.submitButton }),
    );

    expect(create).toHaveBeenCalledWith({
      dossierId: DOSSIER_ID,
      email: "proche@exemple.fr",
      role: "collaborator",
    });
    expect(
      await screen.findByText(new RegExp(dossierContent.members.invite.success)),
    ).toBeInTheDocument();
    expect(
      screen.getByText(`https://sorento.test/invitations/accepter?token=${"f".repeat(64)}`),
    ).toBeInTheDocument();
  });

  it("shows a pending invitation with the date it stops working", async () => {
    stubMembers({
      members: [me()],
      invitations: [anInvitation({ expiresAt: "2026-01-22T00:00:00.000Z" })],
    });
    renderPage();

    expect(await screen.findByText(anInvitation().email)).toBeInTheDocument();
    expect(
      screen.getByText(new RegExp(`${dossierContent.members.pending.expiresOn} 22/01/2026`)),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: dossierContent.members.pending.revokeButton }),
    ).toBeInTheDocument();
  });

  it("says plainly when nothing is pending rather than showing an empty box", async () => {
    stubMembers({ members: [me()] });
    renderPage();

    expect(await screen.findByText(dossierContent.members.pending.empty)).toBeInTheDocument();
  });

  /**
   * The permission matrix lives in core and the RLS policies enforce it, but a screen that
   * offers an action the database will refuse is still a broken screen. A viewer sees the
   * members and can do nothing to them.
   */
  it("gives a viewer the list and none of the controls", async () => {
    stubMembers({ members: [me("viewer"), other] });
    renderPage();

    await screen.findByText("Malik");

    expect(
      screen.queryByRole("button", { name: dossierContent.members.list.removeButton }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: dossierContent.members.invite.submitButton }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: dossierContent.members.pending.revokeButton }),
    ).not.toBeInTheDocument();
  });

  it("does not offer to hand the dossier over to someone who only reads it", async () => {
    stubMembers({
      members: [
        me(),
        aMembership({ id: OTHER_MEMBERSHIP_ID, userId: OTHER_USER_ID, role: "viewer" }),
      ],
    });
    renderPage();

    await screen.findByText("Malik");

    expect(
      screen.queryByRole("button", { name: dossierContent.members.list.transferButton }),
    ).not.toBeInTheDocument();
  });
});
