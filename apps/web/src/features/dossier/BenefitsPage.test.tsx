import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import type { Benefit, Membership, Profile } from "@sorento/domain";
import { BenefitsPage } from "@/features/dossier/BenefitsPage";
import { repositories } from "@/lib/repositories";
import { renderWithProviders } from "@/test/render";

const DOSSIER_ID = "11111111-1111-1111-1111-111111111111";
const USER_ID = "22222222-2222-2222-2222-222222222222";

const benefit: Benefit = {
  id: "33333333-3333-3333-3333-333333333333",
  code: "survivor_pension",
  title: "Pension de réversion",
  mainCondition: "Conjoint survivant, sous conditions d'âge et de ressources.",
  estimatedAmount: "jusqu'à 54 % de la pension du défunt",
  organization: "Caisses de retraite",
  formUrl: "https://www.info-retraite.fr",
  cautionText:
    "Les personnes dans une situation comme la vôtre peuvent avoir droit à une pension de réversion sous conditions.",
  timeWindow: "6m",
  sourceUrl: "https://www.info-retraite.fr",
  lastVerifiedDate: "2026-01-15",
  active: true,
  createdAt: "2026-01-15T00:00:00Z",
  updatedAt: "2026-01-15T00:00:00Z",
};

const membership: Membership = {
  id: "44444444-4444-4444-4444-444444444444",
  dossierId: DOSSIER_ID,
  userId: USER_ID,
  role: "owner",
  invitedBy: null,
  createdAt: "2026-01-15T00:00:00Z",
  updatedAt: "2026-01-15T00:00:00Z",
};

const profile: Profile = {
  id: USER_ID,
  firstName: "Camille",
  role: "user",
  createdAt: "2026-01-15T00:00:00Z",
  updatedAt: "2026-01-15T00:00:00Z",
};

const stubRepositories = (): void => {
  vi.spyOn(repositories.dossiers, "getById").mockResolvedValue({
    id: DOSSIER_ID,
    status: "ACTIVE",
    createdBy: USER_ID,
    subjectFirstName: "Jeanne",
    subjectLastName: "Martin",
    deathDate: "2026-01-10",
    pendingActivationDeathDate: null,
    pendingActivationEffectiveAt: null,
    pendingActivationOpposedAt: null,
    createdAt: "2026-01-15T00:00:00Z",
    updatedAt: "2026-01-15T00:00:00Z",
    deletedAt: null,
  });
  vi.spyOn(repositories.memberships, "listForDossier").mockResolvedValue([membership]);
  vi.spyOn(repositories.profiles, "listByIds").mockResolvedValue([profile]);
  vi.spyOn(repositories.answers, "listForDossier").mockResolvedValue([]);
  vi.spyOn(repositories.catalog, "listBenefits").mockResolvedValue([benefit]);
  vi.spyOn(repositories.catalog, "listConditions").mockResolvedValue([]);
  vi.spyOn(repositories.tracking, "listForDossier").mockResolvedValue([]);
};

const renderPage = () =>
  renderWithProviders(<BenefitsPage />, {
    route: `/dossiers/${DOSSIER_ID}/aides`,
    path: "/dossiers/:dossierId/aides",
    auth: { user: { id: USER_ID } as never },
  });

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

    expect(await screen.findByRole("link", { name: "Source officielle" })).toHaveAttribute(
      "href",
      benefit.sourceUrl,
    );
    expect(screen.getByText(/Information vérifiée le 15\/01\/2026/)).toBeInTheDocument();
  });

  it("redirects to a regulated profession", async () => {
    stubRepositories();
    renderPage();

    expect(await screen.findByText(/rapprochez-vous/)).toBeInTheDocument();
  });
});
