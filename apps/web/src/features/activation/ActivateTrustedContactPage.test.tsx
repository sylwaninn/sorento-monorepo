import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ActivateTrustedContactPage } from "@/features/activation/ActivateTrustedContactPage";
import { activationContent } from "@/features/activation/content";
import { userFacingErrorMessage } from "@/lib/error-messages";
import { repositories } from "@/lib/repositories";
import { renderWithProviders } from "@/test/render";
import { must } from "@/test/must";

const TOKEN = "a".repeat(64);
const ROUTE = `/contact-confiance/activer?token=${TOKEN}`;
const PATH = "/contact-confiance/activer";

const FROZEN = new Error("activation_frozen");

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
    expect(screen.queryByText(new RegExp(resolved.subjectFirstName))).not.toBeInTheDocument();
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
      .mockRejectedValue(FROZEN);

    renderPage();
    await screen.findByText(activationContent.activate.notice);

    const deathDate = must(
      document.querySelector<HTMLInputElement>('input[name="deathDate"]'),
      "death date input",
    );
    fireEvent.change(deathDate, { target: { value: "2026-01-15" } });

    const submit = screen.getByRole("button", { name: activationContent.activate.submitButton });
    await waitFor(() => expect(submit).toBeEnabled());
    await userEvent.click(submit);

    // Read through the translation the screen itself uses, so the sentence is not spelled out
    // twice. The comparison against an unmapped error is what keeps that from being circular:
    // it fails if activation_frozen ever loses its own message and falls back to the generic
    // one, which is the regression that would leave the person with nothing to act on.
    await waitFor(() => expect(requestActivation).toHaveBeenCalled());
    expect(await screen.findByText(userFacingErrorMessage(FROZEN))).toBeInTheDocument();
    expect(userFacingErrorMessage(FROZEN)).not.toBe(
      userFacingErrorMessage(new Error("no_message_for_this_one")),
    );
  });
});
