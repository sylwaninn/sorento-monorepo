import userEvent from "@testing-library/user-event";
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RouteAnchor, RouteLink } from "@/components/RouteLink";
import { renderWithProviders } from "@/test/render";

const ELSEWHERE = "/ailleurs";

const renderLink = (href: string) =>
  renderWithProviders(<RouteLink href={href}>Aller</RouteLink>, {
    siblings: [{ path: ELSEWHERE, element: <div data-testid="elsewhere-screen" /> }],
  });

const link = () => screen.getByRole("link", { name: "Aller" });
const arrivedElsewhere = () => screen.queryByTestId("elsewhere-screen") !== null;

describe("RouteLink", () => {
  /**
   * The whole reason this component exists. The landing page funnels into /diagnostic, and a
   * bare anchor there throws away the bundle the visitor has just downloaded, which is also what
   * makes the route-level code splitting in routes.tsx worth having.
   */
  it("hands an in-app path to the router instead of reloading the document", async () => {
    renderLink(ELSEWHERE);

    await userEvent.click(link());

    expect(arrivedElsewhere()).toBe(true);
  });

  /**
   * The router does not scroll to a fragment, so a section link routed through it would change
   * the address and leave the reader exactly where they were.
   */
  it("leaves a fragment to the browser", async () => {
    renderLink("#confiance");

    await userEvent.click(link());

    expect(arrivedElsewhere()).toBe(false);
    expect(link()).toHaveAttribute("href", "#confiance");
  });

  it("leaves an address that is not ours alone", () => {
    renderLink("https://www.service-public.fr/");

    expect(link()).toHaveAttribute("href", "https://www.service-public.fr/");
  });

  it("keeps the styling and the attributes the caller asked for", () => {
    renderWithProviders(
      <RouteAnchor className="text-ink" data-slot="public-action" href={ELSEWHERE}>
        Aller
      </RouteAnchor>,
    );

    expect(link()).toHaveClass("text-ink");
    expect(link()).toHaveAttribute("data-slot", "public-action");
    expect(link()).toHaveAttribute("href", ELSEWHERE);
  });
});
