import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ContractsPage } from "@/features/dossier/ContractsPage";
import { dossierContent } from "@/features/dossier/content";
import { repositories } from "@/lib/repositories";
import {
  aContract,
  aDossier,
  aMembership,
  aProfile,
  DOSSIER_ID,
  stubDossierAccess,
} from "@/test/fixtures";
import { renderWithProviders } from "@/test/render";
import { signedInSession } from "@/test/supabase-stub";

const c = dossierContent.contracts;
const contract = aContract();

const renderPage = (contracts = [contract]) => {
  stubDossierAccess({
    dossier: aDossier({ status: "PREPARATION" }),
    members: [aMembership()],
    profiles: [aProfile()],
  });
  vi.spyOn(repositories.contracts, "listForDossier").mockResolvedValue(contracts);

  return renderWithProviders(<ContractsPage />, {
    route: `/dossiers/${DOSSIER_ID}/contrats`,
    path: "/dossiers/:dossierId/contrats",
    auth: { session: signedInSession(), user: signedInSession().user },
  });
};

/**
 * The inventory someone fills in while preparing their own affairs, for relatives who will read
 * it without them. What is asserted is that nothing is written down they did not mean to write.
 */
describe("ContractsPage", () => {
  it("lists the contracts already inventoried", async () => {
    renderPage();

    expect(await screen.findByText(new RegExp(contract.company))).toBeInTheDocument();
  });

  it("says so where nothing has been inventoried yet", async () => {
    renderPage([]);

    expect(await screen.findByText(c.empty)).toBeInTheDocument();
  });

  it("records a contract with the optional fields left out rather than empty", async () => {
    const person = userEvent.setup();
    const create = vi.spyOn(repositories.contracts, "create").mockResolvedValue(aContract());
    renderPage([]);

    await person.click(await screen.findByRole("button", { name: c.addButton }));
    await person.type(screen.getByLabelText(c.typeLabel), "Assurance-vie");
    await person.type(screen.getByLabelText(c.companyLabel), "Mutuelle du littoral");
    await person.click(screen.getByRole("button", { name: c.saveButton }));

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(create).toHaveBeenCalledWith(DOSSIER_ID, {
      contractType: "Assurance-vie",
      company: "Mutuelle du littoral",
    });
  });

  it("records nothing when the form is abandoned", async () => {
    const person = userEvent.setup();
    const create = vi.spyOn(repositories.contracts, "create");
    renderPage([]);

    await person.click(await screen.findByRole("button", { name: c.addButton }));
    await person.type(screen.getByLabelText(c.typeLabel), "Assurance-vie");
    await person.click(screen.getByRole("button", { name: c.cancelButton }));

    expect(create).not.toHaveBeenCalled();
    expect(screen.queryByLabelText(c.typeLabel)).toBeNull();
  });

  it("opens an existing contract with its values in the fields", async () => {
    const person = userEvent.setup();
    renderPage();

    await person.click(await screen.findByRole("button", { name: c.editButton }));

    expect(screen.getByLabelText(c.companyLabel)).toHaveValue(contract.company);
  });
});
