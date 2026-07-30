import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BenefitsTab } from "@/features/admin/catalog/BenefitsTab";
import { adminContent } from "@/features/admin/content";
import { repositories } from "@/lib/repositories";
import { aBenefit } from "@/test/fixtures";
import { renderWithProviders } from "@/test/render";

const { catalog } = adminContent;
const c = catalog.benefits;

const benefit = aBenefit();

const renderTab = (benefits = [benefit]) => {
  vi.spyOn(repositories.catalog, "listAllBenefits").mockResolvedValue(benefits);
  return renderWithProviders(<BenefitsTab />);
};

/** The whole form, in the order the fields appear, so a save carries a complete entry. */
const fillTheForm = async (person: ReturnType<typeof userEvent.setup>) => {
  await person.type(screen.getByLabelText(c.codeLabel), "widow_allowance");
  await person.type(screen.getByLabelText(c.titleLabel), "Allocation de veuvage");
  await person.type(screen.getByLabelText(c.mainConditionLabel), "Conjoint survivant");
  await person.type(screen.getByLabelText(c.organizationLabel), "CAF");
  await person.type(screen.getByLabelText(c.formUrlLabel), "https://www.caf.fr/formulaire");
  await person.type(screen.getByLabelText(c.cautionTextLabel), "Montant indicatif.");
  await person.type(screen.getByLabelText(c.sourceUrlLabel), "https://www.caf.fr/source");
};

/**
 * The back office is where the catalog every dossier reads is written, so a mistake here reaches
 * every family at once. What is asserted is the round trip: what the screen sends when it saves,
 * and what it must not send when someone changes their mind.
 */
describe("BenefitsTab", () => {
  it("lists what the catalog holds, and says so when it holds nothing", async () => {
    renderTab([]);

    expect(await screen.findByText(c.empty)).toBeInTheDocument();
  });

  it("sends a complete entry when a new aid is saved", async () => {
    const person = userEvent.setup();
    const create = vi
      .spyOn(repositories.catalog, "createBenefit")
      .mockResolvedValue(aBenefit({ code: "widow_allowance" }));
    renderTab();

    await person.click(await screen.findByRole("button", { name: catalog.addButton }));
    await fillTheForm(person);
    await person.click(screen.getByRole("button", { name: catalog.saveButton }));

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(create.mock.calls[0]?.[0]).toMatchObject({
      code: "widow_allowance",
      title: "Allocation de veuvage",
      organization: "CAF",
      formUrl: "https://www.caf.fr/formulaire",
      active: true,
    });
  });

  /**
   * A cancel button with no explicit type is a submit button: the browser's default, not the
   * component's. Leaving the catalog untouched is the whole promise of the word "Annuler".
   */
  it("saves nothing when the form is abandoned", async () => {
    const person = userEvent.setup();
    const create = vi.spyOn(repositories.catalog, "createBenefit");
    renderTab();

    await person.click(await screen.findByRole("button", { name: catalog.addButton }));
    await fillTheForm(person);
    await person.click(screen.getByRole("button", { name: catalog.cancelButton }));

    expect(create).not.toHaveBeenCalled();
    expect(screen.queryByLabelText(c.codeLabel)).toBeNull();
  });

  it("opens an existing aid with its values already in the fields", async () => {
    const person = userEvent.setup();
    renderTab();

    await person.click(await screen.findByRole("button", { name: catalog.editButton }));

    expect(screen.getByLabelText(c.titleLabel)).toHaveValue(benefit.title);
    expect(screen.getByLabelText(c.codeLabel)).toHaveValue(benefit.code);
  });

  /** Removing an entry from the catalog is immediate and irreversible, so it is asked twice. */
  it("asks before removing an entry, and removes it once confirmed", async () => {
    const person = userEvent.setup();
    const remove = vi.spyOn(repositories.catalog, "deleteBenefit").mockResolvedValue(undefined);
    renderTab();

    await person.click(await screen.findByRole("button", { name: catalog.deleteButton }));
    expect(await screen.findByText(catalog.deleteConfirmTitle)).toBeInTheDocument();

    await person.click(screen.getByRole("button", { name: catalog.deleteConfirmButton }));

    await waitFor(() => expect(remove).toHaveBeenCalledWith(benefit.id));
  });
});
