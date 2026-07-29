import { afterEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type * as supabaseClient from "@sorento/supabase-client";
import type { InvitationRepository } from "@sorento/supabase-client";

/**
 * The repository methods are arrow class fields and this screen builds its own instance, so
 * there is no prototype to spy on and no singleton to reach: the class is replaced by a
 * subclass, which is what keeps the double type-checked against the real signatures.
 */
const { resolveInvitation, acceptInvitation } = vi.hoisted(() => ({
  resolveInvitation: vi.fn<InvitationRepository["resolve"]>(),
  acceptInvitation: vi.fn<InvitationRepository["accept"]>(),
}));

vi.mock("@sorento/supabase-client", async (importOriginal) => {
  const actual = await importOriginal<typeof supabaseClient>();
  return {
    ...actual,
    InvitationRepository: class extends actual.InvitationRepository {
      override resolve = resolveInvitation;
      override accept = acceptInvitation;
    },
  };
});

import { SupabaseRepositoryError } from "@sorento/supabase-client";
import { AcceptInvitationPage } from "@/features/dossier/AcceptInvitationPage";
import { SignupPage } from "@/features/auth/SignupPage";
import { dossierContent } from "@/features/dossier/content";
import { authContent } from "@/features/auth/content";
import { getPendingInvitationToken } from "@/features/dossier/pending-invitation";
import { userFacingErrorMessage } from "@/lib/error-messages";
import { DOSSIER_ID } from "@/test/fixtures";
import { renderWithProviders } from "@/test/render";
import { signedInSession } from "@/test/supabase-stub";
import { must } from "@/test/must";

/**
 * The screen an invited relative lands on, arriving from an email, usually days after a death.
 * A bug here already got through once: the token was posted in the body while the function read
 * it from the query string, so every invitation resolved as expired. The E2E journey caught it;
 * these tests hold the parts of the screen that a journey cannot look at closely.
 */

const TOKEN = "e".repeat(64);

const resolved = {
  dossierId: DOSSIER_ID,
  subjectFirstName: "Jeanne",
  subjectLastName: "Martin",
  role: "collaborator",
  invitedByFirstName: "Camille",
} as const;

const DossierScreen = () => <h1>Dossier screen</h1>;

const renderPage = ({ signedIn }: { signedIn: boolean }) => {
  const session = signedIn ? signedInSession() : null;

  return renderWithProviders(<AcceptInvitationPage />, {
    route: `/invitations/accepter?token=${TOKEN}`,
    path: "/invitations/accepter",
    auth: { session, user: session === null ? null : session.user },
    siblings: [
      { path: "/inscription", element: <SignupPage /> },
      { path: "/dossiers/:dossierId", element: <DossierScreen /> },
    ],
  });
};

afterEach(() => {
  sessionStorage.clear();
});

describe("AcceptInvitationPage", () => {
  it("says who invites whom, and to what role, before asking for anything", async () => {
    resolveInvitation.mockResolvedValue({ ...resolved });

    renderPage({ signedIn: true });

    const inviter = await screen.findByText(resolved.invitedByFirstName);
    const sentence = must(inviter.closest("p"), "the sentence naming the invitation");

    expect(sentence).toHaveTextContent(dossierContent.acceptInvitation.descriptionPrefix);
    expect(sentence).toHaveTextContent(resolved.subjectFirstName);
    expect(sentence).toHaveTextContent(resolved.subjectLastName);
    expect(sentence).toHaveTextContent(dossierContent.members.roleLabels[resolved.role]);
  });

  it("offers to sign in or sign up, and nothing to accept, while nobody is signed in", async () => {
    resolveInvitation.mockResolvedValue({ ...resolved });

    renderPage({ signedIn: false });

    expect(
      await screen.findByText(dossierContent.acceptInvitation.needAccount),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: dossierContent.acceptInvitation.signupButton }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: dossierContent.acceptInvitation.acceptButton }),
    ).not.toBeInTheDocument();
  });

  /**
   * The token has to survive the detour through account creation, or the relative arrives with
   * an account and no way back to the dossier they were invited to.
   */
  it("keeps the invitation on the way to creating an account", async () => {
    resolveInvitation.mockResolvedValue({ ...resolved });

    renderPage({ signedIn: false });

    await userEvent.click(
      await screen.findByRole("button", {
        name: dossierContent.acceptInvitation.signupButton,
      }),
    );

    expect(
      await screen.findByRole("heading", { name: authContent.signup.title }),
    ).toBeInTheDocument();
    expect(getPendingInvitationToken()).toBe(TOKEN);
  });

  it("takes a signed-in relative straight into the dossier once they accept", async () => {
    resolveInvitation.mockResolvedValue({ ...resolved });
    acceptInvitation.mockResolvedValue({ dossierId: DOSSIER_ID });

    renderPage({ signedIn: true });

    await userEvent.click(
      await screen.findByRole("button", {
        name: dossierContent.acceptInvitation.acceptButton,
      }),
    );

    expect(await screen.findByRole("heading", { name: "Dossier screen" })).toBeInTheDocument();
  });

  /**
   * An expired link must say so, and must not leak whose dossier it was for: the person holding
   * a dead link has not been granted access to anything.
   */
  it("explains an expired link without naming the dossier behind it", async () => {
    resolveInvitation.mockRejectedValue(new Error("invalid_or_expired"));

    renderPage({ signedIn: true });

    expect(
      await screen.findByText(dossierContent.acceptInvitation.invalidTitle),
    ).toBeInTheDocument();
    expect(
      screen.getByText(dossierContent.acceptInvitation.invalidDescription),
    ).toBeInTheDocument();
    expect(screen.queryByText(resolved.subjectFirstName)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: dossierContent.acceptInvitation.acceptButton }),
    ).not.toBeInTheDocument();
  });

  /**
   * Every other write path in the app runs its failure through userFacingErrorMessage, whose
   * stated contract is that a technical failure never reaches the screen verbatim. This screen
   * renders `error.message` directly, so a refused acceptance shows the repository's own
   * English sentence to a grieving relative.
   */
  it("translates a refused acceptance instead of printing the technical error", async () => {
    const failure = new SupabaseRepositoryError("Supabase call failed: accept invitation", {
      message: "invalid_or_expired",
    });
    resolveInvitation.mockResolvedValue({ ...resolved });
    acceptInvitation.mockRejectedValue(failure);

    renderPage({ signedIn: true });

    await userEvent.click(
      await screen.findByRole("button", {
        name: dossierContent.acceptInvitation.acceptButton,
      }),
    );

    expect(await screen.findByText(userFacingErrorMessage(failure))).toBeInTheDocument();
  });
});
