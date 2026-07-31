import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConditionsTab } from "@/features/admin/catalog/ConditionsTab";
import { adminContent } from "@/features/admin/content";
import { repositories } from "@/lib/repositories";
import { aBenefit, aCondition, aProcedure } from "@/test/fixtures";
import { renderWithProviders } from "@/test/render";

const { catalog } = adminContent;
const c = catalog.conditions;

const procedure = aProcedure();
const benefit = aBenefit();

const renderTab = (conditions = [aCondition()]) => {
  vi.spyOn(repositories.catalog, "listConditions").mockResolvedValue(conditions);
  vi.spyOn(repositories.catalog, "listAllProcedures").mockResolvedValue([procedure]);
  vi.spyOn(repositories.catalog, "listAllBenefits").mockResolvedValue([benefit]);
  return renderWithProviders(<ConditionsTab />);
};

const VALID_EXPRESSION =
  '{"type":"comparison","field":"situation","operator":"eq","value":"spouse"}';

/** Set rather than typed: userEvent reads a brace in typed text as the start of a key name. */
const writeExpression = (text: string) =>
  fireEvent.change(screen.getByLabelText(c.expressionLabel), { target: { value: text } });

/**
 * A condition decides whether a procedure or an aid appears in someone's journey, and it is
 * written here as raw JSON. Refusing what does not parse is the only thing standing between a
 * typo and a journey that silently drops a step.
 */
describe("ConditionsTab", () => {
  it("says so where the catalog holds no condition", async () => {
    renderTab([]);

    expect(await screen.findByText(c.empty)).toBeInTheDocument();
  });

  it("attaches a condition to the target the admin picked", async () => {
    const person = userEvent.setup();
    const create = vi
      .spyOn(repositories.catalog, "createCondition")
      .mockResolvedValue(aCondition());
    renderTab([]);

    await person.click(await screen.findByRole("button", { name: catalog.addButton }));
    await person.click(screen.getByRole("combobox", { name: c.targetProcedure }));
    await person.click(screen.getByRole("option", { name: procedure.title }));
    writeExpression(VALID_EXPRESSION);
    await person.click(screen.getByRole("button", { name: catalog.saveButton }));

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(create.mock.calls[0]?.[0]).toMatchObject({
      procedureId: procedure.id,
      benefitId: null,
    });
  });

  it("refuses an expression that is not JSON, and says which field is wrong", async () => {
    const person = userEvent.setup();
    const create = vi.spyOn(repositories.catalog, "createCondition");
    renderTab([]);

    await person.click(await screen.findByRole("button", { name: catalog.addButton }));
    // Saving is refused outright until a target is chosen, so the expression is the only thing
    // left that can be wrong by the time the button is live.
    await person.click(screen.getByRole("combobox", { name: c.targetProcedure }));
    await person.click(screen.getByRole("option", { name: procedure.title }));
    writeExpression("{ pas du json");
    await person.click(screen.getByRole("button", { name: catalog.saveButton }));

    expect(await screen.findByText(c.expressionInvalid)).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
  });

  it("saves nothing when the form is abandoned", async () => {
    const person = userEvent.setup();
    const create = vi.spyOn(repositories.catalog, "createCondition");
    renderTab([]);

    await person.click(await screen.findByRole("button", { name: catalog.addButton }));
    writeExpression(VALID_EXPRESSION);
    await person.click(screen.getByRole("button", { name: catalog.cancelButton }));

    expect(create).not.toHaveBeenCalled();
    expect(screen.queryByLabelText(c.expressionLabel)).toBeNull();
  });
});
