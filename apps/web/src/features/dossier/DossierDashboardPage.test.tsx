import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Benefit, Comment, Procedure, Tracking } from "@sorento/domain";
import { DossierDashboardPage } from "@/features/dossier/DossierDashboardPage";
import { dossierContent } from "@/features/dossier/content";
import { repositories } from "@/lib/repositories";
import {
  aBenefit,
  aComment,
  aDossier,
  aMembership,
  aProcedure,
  aProfile,
  aTracking,
  BENEFIT_ID,
  DOSSIER_ID,
  OTHER_USER_ID,
  stubDossierAccess,
  TEST_USER_ID,
} from "@/test/fixtures";
import { renderWithProviders } from "@/test/render";
import { signedInSession } from "@/test/supabase-stub";
import { must } from "@/test/must";

/**
 * This screen is rendered behind DossierHomePage's loading branch, so the route smoke suite
 * never reached it: until this file it was mounted by nothing at all, and it is the page a
 * bereaved family looks at every day.
 *
 * The clock is pinned because the deadline wording is computed against today, and a test whose
 * meaning changes as the calendar moves is not evidence. Only Date is faked: user-event needs
 * real timers to type.
 */
const TODAY = "2026-01-20T09:00:00.000Z";
const DEATH_DATE = "2026-01-10";

const PROCEDURE_IDS = [
  "0a000000-0000-4000-8000-000000000001",
  "0a000000-0000-4000-8000-000000000002",
  "0a000000-0000-4000-8000-000000000003",
  "0a000000-0000-4000-8000-000000000004",
] as const;

const procedureAt = (index: number): Procedure =>
  aProcedure({
    id: must(PROCEDURE_IDS[index], `procedure id ${index}`),
    code: `procedure_${index}`,
    title: `Démarche ${index}`,
    timeWindow: index === 0 ? "7d" : "30d",
  });

const procedures = PROCEDURE_IDS.map((_id, index) => procedureAt(index));

const trackingFor = (index: number, overrides: Partial<Tracking> = {}): Tracking =>
  aTracking({
    id: `0b000000-0000-4000-8000-00000000000${index + 1}`,
    procedureId: must(PROCEDURE_IDS[index], `procedure id ${index}`),
    ...overrides,
  });

interface Scenario {
  tracking: Tracking[];
  benefits?: Benefit[];
  comments?: Comment[];
}

const stubDashboard = ({ tracking, benefits = [], comments = [] }: Scenario): void => {
  stubDossierAccess({
    dossier: aDossier({ deathDate: DEATH_DATE }),
    members: [aMembership(), aMembership({ id: OTHER_USER_ID, userId: OTHER_USER_ID })],
    profiles: [aProfile(), aProfile({ id: OTHER_USER_ID, firstName: "Malik" })],
  });
  vi.spyOn(repositories.tracking, "listForDossier").mockResolvedValue(tracking);
  vi.spyOn(repositories.catalog, "listProcedures").mockResolvedValue(procedures);
  vi.spyOn(repositories.catalog, "listBenefits").mockResolvedValue(benefits);
  vi.spyOn(repositories.comments, "listForDossier").mockResolvedValue(comments);
};

const renderPage = () =>
  renderWithProviders(<DossierDashboardPage />, {
    route: `/dossiers/${DOSSIER_ID}`,
    path: "/dossiers/:dossierId",
    auth: { session: signedInSession(), user: signedInSession().user },
  });

const focusSection = (): HTMLElement =>
  must(
    screen.getByRole("heading", { name: dossierContent.dashboard.focusTitle }).closest("section"),
    "the focus section around its heading",
  );

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(TODAY));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("DossierDashboardPage", () => {
  it("names the dossier it is showing", async () => {
    const dossier = aDossier({ deathDate: DEATH_DATE });
    stubDashboard({ tracking: [trackingFor(0)] });
    renderPage();

    const heading = await screen.findByRole("heading", { level: 1 });

    expect(heading).toHaveTextContent(dossierContent.dashboard.title);
    expect(heading).toHaveTextContent(dossier.subjectFirstName);
    expect(heading).toHaveTextContent(dossier.subjectLastName);
  });

  it("reports progress over the whole journey", async () => {
    stubDashboard({
      tracking: [
        trackingFor(0, { status: "done" }),
        trackingFor(1),
        trackingFor(2),
        trackingFor(3),
      ],
    });
    renderPage();

    expect(await screen.findByText(dossierContent.dashboard.progressValue(25))).toBeInTheDocument();
  });

  /**
   * The compliance rule the whole screen is shaped around: at most two or three things to do
   * now, never the wall of thirty tasks. Four unfinished procedures go in, three come out.
   */
  it("holds the focus list to a handful however much is outstanding", async () => {
    stubDashboard({
      tracking: [trackingFor(0), trackingFor(1), trackingFor(2), trackingFor(3)],
    });
    renderPage();

    await screen.findByRole("heading", { name: dossierContent.dashboard.focusTitle });

    expect(within(focusSection()).getAllByRole("link")).toHaveLength(3);
  });

  it("says so plainly when nothing is outstanding, rather than showing an empty list", async () => {
    stubDashboard({ tracking: [trackingFor(0, { status: "done" })] });
    renderPage();

    expect(await screen.findByText(dossierContent.dashboard.focusEmpty)).toBeInTheDocument();
  });

  /**
   * "Never an overdue counter, never an aggressive red." A procedure whose deadline has passed
   * is stated as something to handle, with no number of days late anywhere on the screen.
   */
  it("states a passed deadline calmly and counts no days late", async () => {
    stubDashboard({ tracking: [trackingFor(0)] });
    renderPage();

    expect((await screen.findAllByText(dossierContent.dashboard.overdue)).length).toBeGreaterThan(
      0,
    );
    expect(screen.queryByText(/retard/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/en retard de/i)).not.toBeInTheDocument();
  });

  it("carries the discussion volume of a procedure onto its card", async () => {
    const procedureId = must(PROCEDURE_IDS[0], "first procedure id");
    stubDashboard({
      tracking: [trackingFor(0)],
      comments: [
        aComment({ id: "0c000000-0000-4000-8000-000000000001", procedureId }),
        aComment({ id: "0c000000-0000-4000-8000-000000000002", procedureId }),
        // Soft-deleted comments leave a trace in the thread but must not inflate the count.
        aComment({
          id: "0c000000-0000-4000-8000-000000000003",
          procedureId,
          deletedAt: TODAY,
        }),
      ],
    });
    renderPage();

    expect(
      (await screen.findAllByText(dossierContent.dashboard.commentsBadge(2))).length,
    ).toBeGreaterThan(0);
  });

  it("opens each section of the dossier at its own address", async () => {
    stubDashboard({ tracking: [trackingFor(0)] });
    renderPage();

    await screen.findByRole("heading", { level: 1 });

    const links: ReadonlyArray<readonly [string, string]> = [
      [dossierContent.dashboard.benefitsLink, "aides"],
      [dossierContent.dashboard.forgottenMoneyLink, "argent-oublie"],
      [dossierContent.dashboard.documentsLink, "documents"],
      [dossierContent.dashboard.membersLink, "membres"],
      [dossierContent.dashboard.activityLink, "activite"],
    ];

    for (const [label, segment] of links) {
      expect(screen.getByRole("link", { name: label })).toHaveAttribute(
        "href",
        `/dossiers/${DOSSIER_ID}/${segment}`,
      );
    }
  });

  /**
   * Sharing the load is the point of the dossier, so "les miennes" has to actually narrow the
   * list. Progress deliberately does not narrow with it: it measures the dossier, not the
   * viewer, and a family member seeing their own share hit 100% while the dossier is half done
   * would be told something untrue.
   */
  it("narrows the journey to my own share without rewriting the progress", async () => {
    stubDashboard({
      tracking: [
        trackingFor(0, { assignedTo: TEST_USER_ID }),
        trackingFor(1, { assignedTo: OTHER_USER_ID }),
        trackingFor(2, { assignedTo: OTHER_USER_ID, status: "done" }),
      ],
    });
    renderPage();

    await screen.findByRole("heading", { level: 1 });
    const mine = must(procedures[0], "first procedure").title;
    const theirs = must(procedures[1], "second procedure").title;

    expect(screen.getAllByText(theirs).length).toBeGreaterThan(0);

    await userEvent.click(
      screen.getByRole("button", { name: dossierContent.dashboard.filterMine }),
    );

    expect(screen.getAllByText(mine).length).toBeGreaterThan(0);
    expect(screen.queryByText(theirs)).not.toBeInTheDocument();
    expect(screen.getByText(dossierContent.dashboard.progressValue(33))).toBeInTheDocument();
  });

  it("shows a benefit added to the journey alongside the procedures", async () => {
    stubDashboard({
      tracking: [
        trackingFor(0),
        aTracking({
          id: "0d000000-0000-4000-8000-000000000001",
          procedureId: null,
          benefitId: BENEFIT_ID,
        }),
      ],
      benefits: [aBenefit()],
    });
    renderPage();

    expect((await screen.findAllByText(aBenefit().title)).length).toBeGreaterThan(0);
  });
});
