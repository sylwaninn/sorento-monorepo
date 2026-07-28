import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { BenefitsPage } from "@/features/dossier/BenefitsPage";
import { sharedContent } from "@/components/content";
import { repositories } from "@/lib/repositories";
import {
  aBenefit,
  aDossier,
  aMembership,
  aProfile,
  DOSSIER_ID,
  stubDossierAccess,
} from "@/test/fixtures";
import { renderWithProviders } from "@/test/render";
import { signedInSession } from "@/test/supabase-stub";
import { must } from "@/test/must";

const benefit = aBenefit();

const stubRepositories = (): void => {
  stubDossierAccess({
    dossier: aDossier(),
    members: [aMembership()],
    profiles: [aProfile()],
  });
  vi.spyOn(repositories.answers, "listForDossier").mockResolvedValue([]);
  vi.spyOn(repositories.catalog, "listBenefits").mockResolvedValue([benefit]);
  vi.spyOn(repositories.catalog, "listConditions").mockResolvedValue([]);
  vi.spyOn(repositories.tracking, "listForDossier").mockResolvedValue([]);
};

const renderPage = () =>
  renderWithProviders(<BenefitsPage />, {
    route: `/dossiers/${DOSSIER_ID}/aides`,
    path: "/dossiers/:dossierId/aides",
    auth: { session: signedInSession(), user: signedInSession().user },
  });

/** `2026-01-15` as CatalogNotice writes it for a French reader. */
const asFrenchDay = (isoDate: string): string => {
  const [year, month, day] = isoDate.split("-");
  return [
    must(day, `day of ${isoDate}`),
    must(month, `month of ${isoDate}`),
    must(year, `year of ${isoDate}`),
  ].join("/");
};

// The prompt makes these non-negotiable: no benefit may be shown without its prudent wording,
// its official source and the date it was last verified.
describe("BenefitsPage: mandatory notices", () => {
  it("renders the catalog's prudent wording verbatim", async () => {
    stubRepositories();
    renderPage();

    expect(await screen.findByText(benefit.cautionText)).toBeInTheDocument();
  });

  it("never states an entitlement of its own", async () => {
    stubRepositories();
    renderPage();

    await screen.findByText(benefit.cautionText);
    expect(screen.queryByText(/vous avez droit à/i)).not.toBeInTheDocument();
  });

  it("shows the official source and the verification date", async () => {
    stubRepositories();
    renderPage();

    expect(
      await screen.findByRole("link", { name: sharedContent.catalogNotice.sourceLabel }),
    ).toHaveAttribute("href", benefit.sourceUrl);
    expect(
      screen.getByText(
        `${sharedContent.catalogNotice.verifiedAtPrefix} ${asFrenchDay(benefit.lastVerifiedDate)}`,
      ),
    ).toBeInTheDocument();
  });

  it("redirects to a regulated profession", async () => {
    stubRepositories();
    renderPage();

    expect(
      await screen.findByText(
        `${sharedContent.catalogNotice.professionPrefix} ${sharedContent.catalogNotice.defaultProfession}.`,
      ),
    ).toBeInTheDocument();
  });
});
