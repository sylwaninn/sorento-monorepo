import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { DossierHomePage } from "@/features/dossier/DossierHomePage";
import { dossierContent } from "@/features/dossier/content";
import { sharedContent } from "@/components/content";
import { repositories } from "@/lib/repositories";
import { aDossier, aMembership, aProfile, DOSSIER_ID, stubDossierAccess } from "@/test/fixtures";
import { renderWithProviders } from "@/test/render";
import { signedInSession } from "@/test/supabase-stub";

/**
 * The single decision this screen makes is which dashboard a dossier gets, and getting it
 * wrong shows a bereaved family the "organise your affairs" checklist, or shows someone
 * preparing their own file the journey of procedures that follow a death. Both are worse than
 * an error page, and nothing asserted the choice before this file.
 */

/** Whichever dashboard is chosen, it reads the rest of the dossier for itself. */
const stubBothDashboards = (): void => {
  vi.spyOn(repositories.answers, "listForDossier").mockResolvedValue([]);
  vi.spyOn(repositories.contracts, "listForDossier").mockResolvedValue([]);
  vi.spyOn(repositories.documents, "listForDossier").mockResolvedValue([]);
  vi.spyOn(repositories.preparationWishes, "getForDossier").mockResolvedValue(null);
  vi.spyOn(repositories.trustedContacts, "listForDossier").mockResolvedValue([]);
  vi.spyOn(repositories.tracking, "listForDossier").mockResolvedValue([]);
  vi.spyOn(repositories.catalog, "listProcedures").mockResolvedValue([]);
  vi.spyOn(repositories.catalog, "listBenefits").mockResolvedValue([]);
  vi.spyOn(repositories.comments, "listForDossier").mockResolvedValue([]);
};

const renderPage = () =>
  renderWithProviders(<DossierHomePage />, {
    route: `/dossiers/${DOSSIER_ID}`,
    path: "/dossiers/:dossierId",
    auth: { session: signedInSession(), user: signedInSession().user },
  });

describe("DossierHomePage", () => {
  it("gives an active dossier the journey of procedures", async () => {
    stubDossierAccess({
      dossier: aDossier({ status: "ACTIVE" }),
      members: [aMembership()],
      profiles: [aProfile()],
    });
    stubBothDashboards();
    renderPage();

    expect(await screen.findByText(dossierContent.dashboard.focusTitle)).toBeInTheDocument();
    expect(screen.queryByText(dossierContent.preparation.intro)).not.toBeInTheDocument();
  });

  it("gives a dossier still in preparation the organising checklist", async () => {
    stubDossierAccess({
      dossier: aDossier({ status: "PREPARATION", deathDate: null }),
      members: [aMembership()],
      profiles: [aProfile()],
    });
    stubBothDashboards();
    renderPage();

    expect(await screen.findByText(dossierContent.preparation.intro)).toBeInTheDocument();
    expect(screen.queryByText(dossierContent.dashboard.focusTitle)).not.toBeInTheDocument();
  });

  /**
   * A dossier the viewer has no access to comes back as null rather than as an error, so the
   * absent-dossier branch is also the refused-by-RLS branch. Guessing a dashboard here would
   * render a page titled after someone else's relative.
   */
  it("says so rather than guessing a dashboard when there is no dossier to show", async () => {
    stubDossierAccess({ dossier: null });
    stubBothDashboards();
    renderPage();

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.queryByText(dossierContent.preparation.intro)).not.toBeInTheDocument();
    expect(screen.queryByText(dossierContent.dashboard.focusTitle)).not.toBeInTheDocument();
  });

  /**
   * Until the status is known, neither dashboard may appear: showing one and swapping it a
   * moment later is how a family reads the wrong page long enough to believe it.
   */
  it("shows neither dashboard while the dossier is still being read", () => {
    vi.spyOn(repositories.dossiers, "getById").mockReturnValue(new Promise(() => {}));
    vi.spyOn(repositories.memberships, "listForDossier").mockReturnValue(new Promise(() => {}));
    vi.spyOn(repositories.profiles, "listByIds").mockResolvedValue([]);
    stubBothDashboards();
    renderPage();

    expect(screen.queryByText(dossierContent.preparation.intro)).not.toBeInTheDocument();
    expect(screen.queryByText(dossierContent.dashboard.focusTitle)).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(sharedContent.loading);
  });
});
