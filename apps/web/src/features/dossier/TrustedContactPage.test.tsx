import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TrustedContactPage } from "@/features/dossier/TrustedContactPage";
import { dossierContent } from "@/features/dossier/content";
import { repositories } from "@/lib/repositories";
import {
  aDossier,
  aMembership,
  aProfile,
  aTrustedContactDesignation,
  DOSSIER_ID,
  stubDossierAccess,
} from "@/test/fixtures";
import { renderWithProviders } from "@/test/render";
import { signedInSession } from "@/test/supabase-stub";

const c = dossierContent.trustedContact;
const CONSENT_URL = "http://localhost:5173/contact-confiance/confirmer?token=abc";

const renderPage = ({
  designations = [] as ReturnType<typeof aTrustedContactDesignation>[],
  role = "owner",
}: {
  designations?: ReturnType<typeof aTrustedContactDesignation>[];
  role?: "owner" | "collaborator";
} = {}) => {
  stubDossierAccess({
    dossier: aDossier({ status: "PREPARATION" }),
    members: [aMembership({ role })],
    profiles: [aProfile()],
  });
  vi.spyOn(repositories.trustedContacts, "listForDossier").mockResolvedValue(designations);

  return renderWithProviders(<TrustedContactPage />, {
    route: `/dossiers/${DOSSIER_ID}/contact-de-confiance`,
    path: "/dossiers/:dossierId/contact-de-confiance",
    auth: { session: signedInSession(), user: signedInSession().user },
  });
};

/**
 * Designating a trusted contact is handing someone the right to open this dossier after a death,
 * so every screen state here is about knowing exactly who holds that right and being able to take
 * it back. The notice is not decoration: it is what the person is agreeing to.
 */
describe("TrustedContactPage", () => {
  it("explains what a trusted contact will be able to do before anyone is named", async () => {
    renderPage();

    expect(await screen.findByText(c.empty)).toBeInTheDocument();
    expect(screen.getAllByText(c.notice).length).toBeGreaterThan(0);
  });

  it("sends the designation with the role the owner chose", async () => {
    const person = userEvent.setup();
    const designate = vi.spyOn(repositories.trustedContacts, "designate").mockResolvedValue({
      designationId: aTrustedContactDesignation().id,
      consentUrl: CONSENT_URL,
    });
    renderPage();

    await person.type(
      await screen.findByLabelText(c.emailLabel),
      "contact-de-confiance@exemple.fr",
    );
    await person.click(screen.getByRole("combobox", { name: c.futureRoleLabel }));
    await person.click(screen.getByRole("option", { name: c.futureRoleOptions.owner }));
    await person.click(screen.getByRole("button", { name: c.submitButton }));

    await waitFor(() => expect(designate).toHaveBeenCalledTimes(1));
    expect(designate).toHaveBeenCalledWith({
      dossierId: DOSSIER_ID,
      email: "contact-de-confiance@exemple.fr",
      futureRole: "owner",
    });
  });

  it("refuses an address that is not one, without calling anything", async () => {
    const person = userEvent.setup();
    const designate = vi.spyOn(repositories.trustedContacts, "designate");
    renderPage();

    await person.type(await screen.findByLabelText(c.emailLabel), "pas-une-adresse");
    await person.click(screen.getByRole("button", { name: c.submitButton }));

    expect(designate).not.toHaveBeenCalled();
  });

  it("names who holds the right, and where they stand", async () => {
    renderPage({
      designations: [aTrustedContactDesignation({ email: "claire@exemple.fr", consentedAt: null })],
    });

    expect(await screen.findByText("claire@exemple.fr")).toBeInTheDocument();
    expect(screen.getByText(new RegExp(c.statusPending))).toBeInTheDocument();
  });

  /** Taking the right back is irreversible for the person losing it, so it is asked twice. */
  it("asks before revoking a designation, and revokes it once confirmed", async () => {
    const person = userEvent.setup();
    const designation = aTrustedContactDesignation();
    const revoke = vi.spyOn(repositories.trustedContacts, "revoke").mockResolvedValue(undefined);
    renderPage({ designations: [designation] });

    await person.click(await screen.findByRole("button", { name: c.revokeButton }));
    expect(await screen.findByText(c.revokeConfirmTitle)).toBeInTheDocument();

    await person.click(screen.getByRole("button", { name: c.revokeConfirmButton }));

    await waitFor(() => expect(revoke).toHaveBeenCalledWith(designation.id));
  });

  /** A relative who is not the owner may know a trusted contact exists; naming one is not theirs. */
  it("offers no designation form to someone who does not own the dossier", async () => {
    renderPage({ role: "collaborator" });

    expect(await screen.findByText(c.notice)).toBeInTheDocument();
    expect(screen.queryByLabelText(c.emailLabel)).toBeNull();
  });
});
