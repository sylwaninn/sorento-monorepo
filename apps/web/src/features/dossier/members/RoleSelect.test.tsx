import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { RoleSelect } from "@/features/dossier/members/RoleSelect";
import { dossierContent } from "@/features/dossier/content";
import { renderWithProviders } from "@/test/render";

const { list } = dossierContent.members;

/**
 * A select renders its value in a trigger, and the trigger is the only thing on screen a person
 * or a journey can address. Naming it is therefore not a detail of the markup: an anonymous
 * combobox is unreachable to a screen reader and to every test that speaks in roles, which is
 * exactly how the invitation form shipped a role picker nobody could find.
 */
describe("RoleSelect", () => {
  it("takes its name from the visible label when it has one", () => {
    renderWithProviders(<RoleSelect role="collaborator" onChange={vi.fn()} label="Rôle" />);

    expect(screen.getByRole("combobox", { name: "Rôle" })).toBeInTheDocument();
  });

  it("names itself where the row it sits in carries no label", () => {
    renderWithProviders(<RoleSelect role="viewer" onChange={vi.fn()} />);

    expect(screen.getByRole("combobox", { name: list.changeRoleTo })).toBeInTheDocument();
  });
});
