import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { LetterTemplate } from "@sorento/domain";
import { LetterTab } from "@/features/dossier/procedure-detail/LetterTab";
import { dossierContent } from "@/features/dossier/content";
import { repositories } from "@/lib/repositories";
import { aDossier, DOSSIER_ID, PROCEDURE_ID } from "@/test/fixtures";
import { renderWithProviders } from "@/test/render";

const { letter } = dossierContent.procedureDetail;

/**
 * Two manual variables, which is the case that matters: with one, a form whose fields all share
 * an id still looks right.
 */
const TEMPLATE: LetterTemplate = {
  id: "77777777-7777-4777-8777-777777777777",
  procedureId: PROCEDURE_ID,
  title: "Notification à la banque",
  bodyTemplate:
    "Objet : décès de {{deceasedName}}.\nCompte {{accountNumber}}.\nSigné {{senderName}}.",
  variables: ["deceasedName", "accountNumber", "senderName"],
  sourceUrl: null,
  lastVerifiedDate: "2026-01-15",
  createdAt: "2026-01-15T00:00:00.000Z",
  updatedAt: "2026-01-15T00:00:00.000Z",
};

const renderTab = () => {
  vi.spyOn(repositories.catalog, "listLetterTemplates").mockResolvedValue([TEMPLATE]);

  return renderWithProviders(
    <LetterTab
      dossierId={DOSSIER_ID}
      procedureId={PROCEDURE_ID}
      dossier={aDossier()}
      canGenerate
    />,
  );
};

describe("LetterTab", () => {
  it("gives every manual variable a field of its own", async () => {
    const person = userEvent.setup();
    renderTab();

    const senderName = await screen.findByLabelText(letter.senderNameLabel);
    // The second field is labelled with the template's raw variable name, in English. That is a
    // defect of its own; naming it here is what makes the two fields distinguishable at all.
    const accountNumber = screen.getByLabelText("accountNumber");

    await person.type(senderName, "Camille Roux");
    await person.type(accountNumber, "FR7612345678901234567890");

    // One id shared by every field points every label at the first input, so the second value
    // lands in the first field and the letter ships with a hole where the account number goes.
    expect(senderName).toHaveValue("Camille Roux");
    expect(accountNumber).toHaveValue("FR7612345678901234567890");
    expect(screen.queryByText(letter.missingVariables, { exact: false })).toBeNull();
  });

  it("says what is still missing rather than offering a letter with holes", async () => {
    renderTab();

    expect(await screen.findByText(letter.missingVariables, { exact: false })).toBeInTheDocument();
  });

  it("says so where the procedure has no template to offer", async () => {
    vi.spyOn(repositories.catalog, "listLetterTemplates").mockResolvedValue([]);

    renderWithProviders(
      <LetterTab
        dossierId={DOSSIER_ID}
        procedureId={PROCEDURE_ID}
        dossier={aDossier()}
        canGenerate
      />,
    );

    expect(await screen.findByText(letter.noTemplate)).toBeInTheDocument();
  });
});
