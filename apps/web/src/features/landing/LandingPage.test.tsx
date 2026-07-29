import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { LandingPage } from "@/features/landing/LandingPage";
import { landingContent } from "@/features/landing/content";
import { sharedContent } from "@/components/content";
import { renderWithProviders } from "@/test/render";
import { must } from "@/test/must";

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

    // Found by what it says rather than by its position, and read through must so that
    // dropping the promise from the dictionary fails here by name instead of quietly
    // removing the only place the commitment is made.
    const noCommission = must(
      landingContent.reassurance.points.find((point) => /commission/i.test(point.title)),
      "the landing reassurance point about commission",
    );

    expect(screen.getByText(noCommission.title)).toBeInTheDocument();
    expect(screen.getByText(noCommission.description)).toBeInTheDocument();
  });
});
