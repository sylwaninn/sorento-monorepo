import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { DossierAction } from "@sorento/core";
import { ProcedureTab } from "@/features/dossier/procedure-detail/ProcedureTab";
import { dossierContent } from "@/features/dossier/content";
import type { DossierContext } from "@/hooks/use-dossier";
import type { AppMutation } from "@/hooks/use-app-mutation";
import { aDossier, aMembership, aProcedure, aTracking, OTHER_USER_ID } from "@/test/fixtures";
import { renderWithProviders } from "@/test/render";

const c = dossierContent.procedureDetail;

const aMutation = <TInput,>(mutate = vi.fn()) =>
  ({ mutate, errorMessage: null }) as unknown as AppMutation<TInput, unknown>;

const anAccess = (allowed: readonly DossierAction[]): DossierContext =>
  ({
    dossier: aDossier(),
    members: [aMembership()],
    assignableMembers: [aMembership({ userId: OTHER_USER_ID, role: "collaborator" })],
    profilesById: new Map(),
    role: "owner",
    isLoading: false,
    can: (action: DossierAction) => allowed.includes(action),
    firstNameOf: () => "Dominique",
  }) as DossierContext;

/**
 * Where a relative moves a procedure forward and says who is carrying it. Both controls are
 * offered to everyone so the screen stays legible, and inert for whoever may not use them: a
 * viewer sending a write the database will refuse gets an error they cannot act on.
 */
describe("ProcedureTab", () => {
  const renderTab = ({
    allowed = ["tracking:update", "tracking:assign"] as DossierAction[],
    statusMutation = aMutation<string>(),
    assigneeMutation = aMutation<string | null>(),
    assignedTo = null as string | null,
  } = {}) =>
    renderWithProviders(
      <ProcedureTab
        procedure={aProcedure()}
        tracking={aTracking({ assignedTo })}
        access={anAccess(allowed)}
        statusMutation={statusMutation as never}
        assigneeMutation={assigneeMutation}
      />,
    );

  it("shows the procedure and who it comes from", () => {
    renderTab();

    expect(screen.getByText(aProcedure().description)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(aProcedure().organization))).toBeInTheDocument();
  });

  it("sends the status a relative picked", async () => {
    const person = userEvent.setup();
    const mutate = vi.fn();
    renderTab({ statusMutation: aMutation(mutate) as never });

    await person.click(screen.getByRole("combobox", { name: c.statusLabel }));
    await person.click(screen.getByRole("option", { name: dossierContent.statusLabels.done }));

    expect(mutate).toHaveBeenCalledWith("done");
  });

  /** Unassigning is a value of its own, and it has to reach the repository as null, not as a word. */
  it("sends an unassignment as nothing rather than as a name", async () => {
    const person = userEvent.setup();
    const mutate = vi.fn();
    // Already carried by someone: a picker never announces a change to the value it is on.
    renderTab({ assigneeMutation: aMutation<string | null>(mutate), assignedTo: OTHER_USER_ID });

    await person.click(screen.getByRole("combobox", { name: c.assigneeLabel }));
    await person.click(screen.getByRole("option", { name: dossierContent.dashboard.unassigned }));

    expect(mutate).toHaveBeenCalledWith(null);
  });

  it("leaves both controls inert for someone who may only read", () => {
    renderTab({ allowed: [] });

    expect(screen.getByRole("combobox", { name: c.statusLabel })).toBeDisabled();
    expect(screen.getByRole("combobox", { name: c.assigneeLabel })).toBeDisabled();
  });
});
