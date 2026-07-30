import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { repositories } from "@/lib/repositories";
import { ActivityPage } from "@/features/dossier/ActivityPage";
import { dossierContent } from "@/features/dossier/content";
import {
  aDossier,
  aMembership,
  aProfile,
  DOSSIER_ID,
  OTHER_USER_ID,
  stubDossierAccess,
  TEST_USER_ID,
} from "@/test/fixtures";
import { renderWithProviders } from "@/test/render";
import { signedInSession } from "@/test/supabase-stub";

const c = dossierContent.activity;

const anEntry = (overrides: Record<string, unknown> = {}) => ({
  id: "88888888-8888-4888-8888-888888888881",
  dossierId: DOSSIER_ID,
  actorId: TEST_USER_ID,
  actionType: "status_changed" as const,
  targetType: null,
  targetId: null,
  metadata: {},
  createdAt: "2026-01-15T10:00:00.000Z",
  ...overrides,
});

const renderPage = (entries: ReturnType<typeof anEntry>[]) => {
  stubDossierAccess({
    dossier: aDossier(),
    members: [aMembership(), aMembership({ userId: OTHER_USER_ID, role: "collaborator" })],
    profiles: [
      aProfile({ firstName: "Camille" }),
      aProfile({ id: OTHER_USER_ID, firstName: "Dominique" }),
    ],
  });
  vi.spyOn(repositories.activityLog, "listForDossier").mockResolvedValue(
    entries as unknown as Awaited<ReturnType<typeof repositories.activityLog.listForDossier>>,
  );

  return renderWithProviders(<ActivityPage />, {
    route: `/dossiers/${DOSSIER_ID}/activite`,
    path: "/dossiers/:dossierId/activite",
    auth: { session: signedInSession(), user: signedInSession().user },
  });
};

/**
 * The log is what makes a shared dossier trustworthy: every relative can see what the others did,
 * under their name. An entry attributed to nobody, or a filter that hides the wrong rows, takes
 * that away.
 */
describe("ActivityPage", () => {
  it("says so where nothing has happened yet", async () => {
    renderPage([]);

    expect(await screen.findByText(c.empty)).toBeInTheDocument();
  });

  it("names who did what, rather than attributing it to the system", async () => {
    renderPage([anEntry()]);

    expect(await screen.findByText(`Camille ${c.actionLabels.status_changed}`)).toBeInTheDocument();
  });

  it("keeps only the chosen kind of event", async () => {
    const person = userEvent.setup();
    renderPage([
      anEntry(),
      anEntry({ id: "88888888-8888-4888-8888-888888888882", actionType: "document_added" }),
    ]);

    await person.click(await screen.findByRole("combobox", { name: c.filterTypeLabel }));
    await person.click(screen.getByRole("option", { name: c.actionLabels.document_added }));

    expect(screen.getByText(`Camille ${c.actionLabels.document_added}`)).toBeInTheDocument();
    expect(screen.queryByText(`Camille ${c.actionLabels.status_changed}`)).toBeNull();
  });

  it("keeps only the chosen relative", async () => {
    const person = userEvent.setup();
    renderPage([
      anEntry(),
      anEntry({
        id: "88888888-8888-4888-8888-888888888883",
        actorId: OTHER_USER_ID,
        actionType: "document_added",
      }),
    ]);

    await person.click(await screen.findByRole("combobox", { name: c.filterMemberLabel }));
    await person.click(screen.getByRole("option", { name: "Dominique" }));

    expect(screen.getByText(`Dominique ${c.actionLabels.document_added}`)).toBeInTheDocument();
    expect(screen.queryByText(`Camille ${c.actionLabels.status_changed}`)).toBeNull();
  });
});
