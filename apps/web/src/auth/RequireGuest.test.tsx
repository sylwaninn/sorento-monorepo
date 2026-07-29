import { afterEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { useSearchParams } from "react-router";
import type * as supabaseClient from "@sorento/supabase-client";
import type { InvitationRepository } from "@sorento/supabase-client";

/**
 * Same reason as RequireAdmin: the repository methods are arrow class fields on the instance,
 * and this guard builds its own instance, so the class is replaced by a subclass that stays
 * type-checked against the real signature.
 */
const { acceptInvitation } = vi.hoisted(() => ({
  acceptInvitation: vi.fn<InvitationRepository["accept"]>(),
}));

vi.mock("@sorento/supabase-client", async (importOriginal) => {
  const actual = await importOriginal<typeof supabaseClient>();
  return {
    ...actual,
    InvitationRepository: class extends actual.InvitationRepository {
      override accept = acceptInvitation;
    },
  };
});

import { RequireGuest } from "@/auth/RequireGuest";
import { LoginPage } from "@/features/auth/LoginPage";
import { authContent } from "@/features/auth/content";
import { sharedContent } from "@/components/content";
import {
  getPendingInvitationToken,
  savePendingInvitationToken,
} from "@/features/dossier/pending-invitation";
import { DOSSIER_ID } from "@/test/fixtures";
import { renderWithProviders } from "@/test/render";
import { signedInSession } from "@/test/supabase-stub";

/**
 * RequireGuest is the mirror of RequireAuth: it keeps someone who is already signed in from
 * landing back on the login and signup screens, where the only thing they could do is create a
 * second account. It also carries the invitation hand-off, which is the reason the redirect is
 * an effect rather than a plain `<Navigate>`.
 */

const DossiersScreen = () => <h1>Dossiers screen</h1>;
const DossierScreen = () => <h1>Dossier screen</h1>;

/** Echoes the token so the redirect can be checked to carry it, not merely to have happened. */
const InvitationScreen = () => {
  const [searchParams] = useSearchParams();
  return (
    <>
      <h1>Invitation screen</h1>
      <p>{searchParams.get("token")}</p>
    </>
  );
};

const DOSSIERS_HEADING = "Dossiers screen";
const DOSSIER_HEADING = "Dossier screen";
const INVITATION_HEADING = "Invitation screen";

const renderGuard = ({ signedIn, loading }: { signedIn: boolean; loading: boolean }) => {
  const session = signedIn ? signedInSession() : null;

  return renderWithProviders(<RequireGuest />, {
    route: "/connexion",
    path: "/connexion",
    auth: { session, user: session === null ? null : session.user, loading },
    children: [{ index: true, element: <LoginPage /> }],
    siblings: [
      { path: "/mes-dossiers", element: <DossiersScreen /> },
      { path: "/dossiers/:dossierId", element: <DossierScreen /> },
      { path: "/invitations/accepter", element: <InvitationScreen /> },
    ],
  });
};

afterEach(() => {
  sessionStorage.clear();
});

describe("RequireGuest", () => {
  it("shows the login screen to a visitor who is not signed in", () => {
    renderGuard({ signedIn: false, loading: false });

    expect(screen.getByRole("heading", { name: authContent.login.title })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: DOSSIERS_HEADING })).not.toBeInTheDocument();
  });

  it("moves an already signed-in visitor on to their dossiers", async () => {
    renderGuard({ signedIn: true, loading: false });

    expect(await screen.findByRole("heading", { name: DOSSIERS_HEADING })).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: authContent.login.title }),
    ).not.toBeInTheDocument();
  });

  /**
   * The symmetric refresh bug to RequireAuth's: acting on "no session yet" here would throw a
   * signed-in person onto the login screen for a frame, and acting on it the other way would
   * flash the login form at someone who is already a member.
   */
  it("shows neither the login screen nor a redirect while the session is still being resolved", () => {
    renderGuard({ signedIn: false, loading: true });

    expect(
      screen.queryByRole("heading", { name: authContent.login.title }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: DOSSIERS_HEADING })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(sharedContent.loading);
  });

  /**
   * The invitation hand-off: someone who followed an invitation link, then signed in, must end
   * up inside the dossier they were invited to and not on the generic list. The stored token is
   * cleared on the way so a later sign-in does not replay an invitation already accepted.
   */
  it("finishes a pending invitation instead of dropping the visitor on the generic list", async () => {
    acceptInvitation.mockResolvedValue({ dossierId: DOSSIER_ID });
    savePendingInvitationToken("b".repeat(64));

    renderGuard({ signedIn: true, loading: false });

    expect(await screen.findByRole("heading", { name: DOSSIER_HEADING })).toBeInTheDocument();
    expect(getPendingInvitationToken()).toBeNull();
  });

  /**
   * A token that no longer resolves must not swallow the person into the dossier list with no
   * explanation: they are sent to the invitation screen, which is the one place that can tell
   * them the link expired.
   */
  it("sends a visitor whose invitation is refused to the invitation screen", async () => {
    const token = "c".repeat(64);
    acceptInvitation.mockRejectedValue(new Error("invalid_or_expired"));
    savePendingInvitationToken(token);

    renderGuard({ signedIn: true, loading: false });

    expect(await screen.findByRole("heading", { name: INVITATION_HEADING })).toBeInTheDocument();
    expect(screen.getByText(token)).toBeInTheDocument();
    expect(getPendingInvitationToken()).toBe(token);
  });
});
