import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ActivateTrustedContactPage } from "@/features/activation/ActivateTrustedContactPage";
import { activationContent } from "@/features/activation/content";
import { repositories } from "@/lib/repositories";
import { renderWithProviders } from "@/test/render";

const TOKEN = "a".repeat(64);
const ROUTE = `/contact-confiance/activer?token=${TOKEN}`;
const PATH = "/contact-confiance/activer";

const resolved = {
  dossierId: "11111111-1111-1111-1111-111111111111",
  subjectFirstName: "Jeanne",
  subjectLastName: "Martin",
  hasPendingActivation: false,
};

const renderPage = () =>
  renderWithProviders(<ActivateTrustedContactPage />, { route: ROUTE, path: PATH });

describe("ActivateTrustedContactPage", () => {
  it("explains the grace period before offering the button", async () => {
    vi.spyOn(repositories.trustedContacts, "resolveActivation").mockResolvedValue(resolved);

    renderPage();

    expect(await screen.findByText(activationContent.activate.notice)).toBeInTheDocument();
  });

  it("shows a clear message on an expired link, and no dossier detail", async () => {
    vi.spyOn(repositories.trustedContacts, "resolveActivation").mockRejectedValue(
      new Error("invalid_or_expired"),
    );

    renderPage();

    expect(await screen.findByText(activationContent.activate.invalidTitle)).toBeInTheDocument();
    expect(screen.queryByText(/Jeanne/)).not.toBeInTheDocument();
  });

  it("keeps the button unavailable until a death date is given", async () => {
    vi.spyOn(repositories.trustedContacts, "resolveActivation").mockResolvedValue(resolved);

    renderPage();

    expect(
      await screen.findByRole("button", { name: activationContent.activate.submitButton }),
    ).toBeDisabled();
  });

  it("surfaces a refused activation as a readable message rather than doing nothing", async () => {
    vi.spyOn(repositories.trustedContacts, "resolveActivation").mockResolvedValue(resolved);
    const requestActivation = vi
      .spyOn(repositories.trustedContacts, "requestActivation")
      .mockRejectedValue(new Error("activation_frozen"));

    renderPage();
    await screen.findByText(activationContent.activate.notice);

    const [dayField] = screen.getAllByRole("spinbutton");
    if (dayField) {
      await userEvent.click(dayField);
      await userEvent.keyboard("15012026");
    }

    const submit = screen.getByRole("button", { name: activationContent.activate.submitButton });
    await waitFor(() => expect(submit).toBeEnabled());
    await userEvent.click(submit);

    await waitFor(() => expect(requestActivation).toHaveBeenCalled());
    expect(
      await screen.findByText("L'activation de ce dossier est suspendue suite à une opposition."),
    ).toBeInTheDocument();
  });
});
