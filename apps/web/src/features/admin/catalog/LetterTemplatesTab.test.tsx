import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { LetterTemplate } from "@sorento/domain";
import { LetterTemplatesTab } from "@/features/admin/catalog/LetterTemplatesTab";
import { adminContent } from "@/features/admin/content";
import { repositories } from "@/lib/repositories";
import { aProcedure, PROCEDURE_ID } from "@/test/fixtures";
import { renderWithProviders } from "@/test/render";

const { catalog } = adminContent;
const c = catalog.letterTemplates;

const procedure = aProcedure();

const aTemplate = (overrides: Partial<LetterTemplate> = {}): LetterTemplate => ({
  id: "77777777-7777-4777-8777-777777777777",
  procedureId: PROCEDURE_ID,
  title: "Notification à la banque",
  bodyTemplate: "Objet : décès de {{deceasedName}}.",
  variables: ["deceasedName"],
  sourceUrl: null,
  lastVerifiedDate: "2026-01-15",
  createdAt: "2026-01-15T00:00:00.000Z",
  updatedAt: "2026-01-15T00:00:00.000Z",
  ...overrides,
});

const renderTab = (templates = [aTemplate()]) => {
  vi.spyOn(repositories.catalog, "listAllLetterTemplates").mockResolvedValue(templates);
  vi.spyOn(repositories.catalog, "listAllProcedures").mockResolvedValue([procedure]);
  return renderWithProviders(<LetterTemplatesTab />);
};

/**
 * A letter template is the one piece of catalog data a family sends under their own name, so what
 * this screen writes decides what a bereaved person signs.
 */
describe("LetterTemplatesTab", () => {
  it("says so where no template has been written", async () => {
    renderTab([]);

    expect(await screen.findByText(c.empty)).toBeInTheDocument();
  });

  it("splits the comma-separated variables into a list before saving", async () => {
    const person = userEvent.setup();
    const create = vi
      .spyOn(repositories.catalog, "createLetterTemplate")
      .mockResolvedValue(aTemplate());
    renderTab([]);

    await person.click(await screen.findByRole("button", { name: catalog.addButton }));
    await person.click(screen.getByRole("combobox", { name: c.procedureLabel }));
    await person.click(screen.getByRole("option", { name: procedure.title }));
    await person.type(screen.getByLabelText(c.titleLabel), "Lettre à la banque");
    await person.type(screen.getByLabelText(c.bodyTemplateLabel), "Bonjour, {{senderName}}.");
    await person.type(screen.getByLabelText(c.variablesLabel), "senderName, accountNumber");
    await person.click(screen.getByRole("button", { name: catalog.saveButton }));

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(create.mock.calls[0]?.[0]).toMatchObject({
      procedureId: procedure.id,
      title: "Lettre à la banque",
      variables: ["senderName", "accountNumber"],
      sourceUrl: null,
    });
  });

  it("saves nothing when the form is abandoned", async () => {
    const person = userEvent.setup();
    const create = vi.spyOn(repositories.catalog, "createLetterTemplate");
    renderTab([]);

    await person.click(await screen.findByRole("button", { name: catalog.addButton }));
    await person.type(screen.getByLabelText(c.titleLabel), "Lettre à la banque");
    await person.click(screen.getByRole("button", { name: catalog.cancelButton }));

    expect(create).not.toHaveBeenCalled();
    expect(screen.queryByLabelText(c.titleLabel)).toBeNull();
  });

  it("asks before removing a template, and removes it once confirmed", async () => {
    const person = userEvent.setup();
    const template = aTemplate();
    const remove = vi
      .spyOn(repositories.catalog, "deleteLetterTemplate")
      .mockResolvedValue(undefined);
    renderTab([template]);

    await person.click(await screen.findByRole("button", { name: catalog.deleteButton }));
    await person.click(await screen.findByRole("button", { name: catalog.deleteConfirmButton }));

    await waitFor(() => expect(remove).toHaveBeenCalledWith(template.id));
  });
});
