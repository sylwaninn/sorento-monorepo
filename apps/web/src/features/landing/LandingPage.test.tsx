import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { LandingPage } from "@/features/landing/LandingPage";
import { landingContent } from "@/features/landing/content";
import { sharedContent } from "@/components/content";
import { renderWithProviders } from "@/test/render";

describe("LandingPage", () => {
  it("carries the mandatory general-information notice", () => {
    renderWithProviders(<LandingPage />);

    expect(screen.getByText(sharedContent.legalNotice)).toBeInTheDocument();
  });

  it("leads with the diagnostic, which is the single main call to action", () => {
    renderWithProviders(<LandingPage />);

    const cta = screen.getByRole("link", { name: landingContent.hero.cta });
    expect(cta).toHaveAttribute("href", "/diagnostic");
  });

  it("links the three legal documents", () => {
    renderWithProviders(<LandingPage />);

    expect(screen.getByRole("link", { name: landingContent.footer.legalNotice })).toHaveAttribute(
      "href",
      "/mentions-legales",
    );
    expect(screen.getByRole("link", { name: landingContent.footer.privacy })).toHaveAttribute(
      "href",
      "/confidentialite",
    );
    expect(screen.getByRole("link", { name: landingContent.footer.terms })).toHaveAttribute(
      "href",
      "/conditions-generales",
    );
  });

  it("states that no commission is taken on recovered sums", () => {
    renderWithProviders(<LandingPage />);

    expect(screen.getByText(/aucune commission/i)).toBeInTheDocument();
  });
});
