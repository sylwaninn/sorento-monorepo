import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProceduresTab } from "@/features/admin/catalog/ProceduresTab";
import { adminContent } from "@/features/admin/content";
import { repositories } from "@/lib/repositories";
import { aProcedure } from "@/test/fixtures";
import { renderWithProviders } from "@/test/render";

const { catalog } = adminContent;
const c = catalog.procedures;

const procedure = aProcedure();

const renderTab = (procedures = [procedure]) => {
  vi.spyOn(repositories.catalog, "listAllProcedures").mockResolvedValue(procedures);
  return renderWithProviders(<ProceduresTab />);
};

const fillTheForm = async (person: ReturnType<typeof userEvent.setup>) => {
  await person.type(screen.getByLabelText(c.codeLabel), "bank_notice");
  await person.type(screen.getByLabelText(c.titleLabel), "Informer la banque");
  await person.type(screen.getByLabelText(c.descriptionLabel), "Notifier le décès.");
  await person.type(screen.getByLabelText(c.organizationLabel), "Établissement bancaire");
  await person.type(screen.getByLabelText(c.sourceUrlLabel), "https://www.service-public.fr/x");
};

describe("ProceduresTab", () => {
  it("says so where the catalog holds no procedure", async () => {
    renderTab([]);

    expect(await screen.findByText(c.empty)).toBeInTheDocument();
  });

  it("sends a complete entry when a new procedure is saved", async () => {
    const person = userEvent.setup();
    const create = vi
      .spyOn(repositories.catalog, "createProcedure")
      .mockResolvedValue(aProcedure({ code: "bank_notice" }));
    renderTab();

    await person.click(await screen.findByRole("button", { name: catalog.addButton }));
    await fillTheForm(person);
    await person.click(screen.getByRole("button", { name: catalog.saveButton }));

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(create.mock.calls[0]?.[0]).toMatchObject({
      code: "bank_notice",
      title: "Informer la banque",
      organization: "Établissement bancaire",
      timeWindow: "30d",
      active: true,
    });
  });

  /** The optional fields are the ones a schema refuses as an empty string rather than as absent. */
  it("sends the optional fields as absent rather than as empty text", async () => {
    const person = userEvent.setup();
    const create = vi
      .spyOn(repositories.catalog, "createProcedure")
      .mockResolvedValue(aProcedure());
    renderTab();

    await person.click(await screen.findByRole("button", { name: catalog.addButton }));
    await fillTheForm(person);
    await person.click(screen.getByRole("button", { name: catalog.saveButton }));

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(create.mock.calls[0]?.[0]).toMatchObject({
      recipientAddress: null,
      delayDays: null,
      referenceProfession: null,
    });
  });

  it("saves nothing when the form is abandoned", async () => {
    const person = userEvent.setup();
    const create = vi.spyOn(repositories.catalog, "createProcedure");
    renderTab();

    await person.click(await screen.findByRole("button", { name: catalog.addButton }));
    await fillTheForm(person);
    await person.click(screen.getByRole("button", { name: catalog.cancelButton }));

    expect(create).not.toHaveBeenCalled();
    expect(screen.queryByLabelText(c.codeLabel)).toBeNull();
  });

  it("opens an existing procedure with its values already in the fields", async () => {
    const person = userEvent.setup();
    renderTab();

    await person.click(await screen.findByRole("button", { name: catalog.editButton }));

    expect(screen.getByLabelText(c.titleLabel)).toHaveValue(procedure.title);
    expect(screen.getByLabelText(c.organizationLabel)).toHaveValue(procedure.organization);
  });

  it("asks before removing an entry, and removes it once confirmed", async () => {
    const person = userEvent.setup();
    const remove = vi.spyOn(repositories.catalog, "deleteProcedure").mockResolvedValue(undefined);
    renderTab();

    await person.click(await screen.findByRole("button", { name: catalog.deleteButton }));
    expect(await screen.findByText(catalog.deleteConfirmTitle)).toBeInTheDocument();

    await person.click(screen.getByRole("button", { name: catalog.deleteConfirmButton }));

    await waitFor(() => expect(remove).toHaveBeenCalledWith(procedure.id));
  });
});
