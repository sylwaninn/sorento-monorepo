import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Answer, Contract, Document, PreparationWishes } from "@sorento/domain";
import type { TrustedContactDesignation } from "@sorento/domain";
import { PreparationDashboardPage } from "@/features/dossier/PreparationDashboardPage";
import { dossierContent } from "@/features/dossier/content";
import { repositories } from "@/lib/repositories";
import {
  aContract,
  aDocument,
  aDossier,
  aMembership,
  anAnswer,
  aProfile,
  aTrustedContactDesignation,
  DOSSIER_ID,
  preparationWishes,
  stubDossierAccess,
} from "@/test/fixtures";
import { renderWithProviders } from "@/test/render";
import { signedInSession } from "@/test/supabase-stub";

/**
 * The other half of DossierHomePage's conditional, and therefore the other screen the route
 * smoke suite could never reach. This one is used by a living person organising their own
 * affairs, so the tone rules bite hardest here: nothing may read as a countdown to their death.
 */

interface Scenario {
  answers?: Answer[];
  contracts?: Contract[];
  documents?: Document[];
  wishes?: PreparationWishes | null;
  trustedContacts?: TrustedContactDesignation[];
  role?: "owner" | "viewer";
  pendingActivationEffectiveAt?: string;
}

const stubPreparation = ({
  answers = [],
  contracts = [],
  documents = [],
  wishes = null,
  trustedContacts = [],
  role = "owner",
  pendingActivationEffectiveAt,
}: Scenario = {}): void => {
  stubDossierAccess({
    dossier: aDossier({
      status: "PREPARATION",
      deathDate: null,
      ...(pendingActivationEffectiveAt === undefined ? {} : { pendingActivationEffectiveAt }),
    }),
    members: [aMembership({ role })],
    profiles: [aProfile()],
  });
  vi.spyOn(repositories.answers, "listForDossier").mockResolvedValue(answers);
  vi.spyOn(repositories.contracts, "listForDossier").mockResolvedValue(contracts);
  vi.spyOn(repositories.documents, "listForDossier").mockResolvedValue(documents);
  vi.spyOn(repositories.preparationWishes, "getForDossier").mockResolvedValue(wishes);
  vi.spyOn(repositories.trustedContacts, "listForDossier").mockResolvedValue(trustedContacts);
};

const renderPage = () =>
  renderWithProviders(<PreparationDashboardPage />, {
    route: `/dossiers/${DOSSIER_ID}`,
    path: "/dossiers/:dossierId",
    auth: { session: signedInSession(), user: signedInSession().user },
  });

const BLOCK_HREFS: ReadonlyArray<
  readonly [keyof typeof dossierContent.preparation.blocks, string]
> = [
  ["subject", "ma-situation"],
  ["contracts", "contrats"],
  ["documents", "documents"],
  ["wishes", "souhaits"],
  ["trustedContact", "contact-de-confiance"],
];

describe("PreparationDashboardPage", () => {
  it("opens on an unhurried invitation rather than on a task list", async () => {
    stubPreparation();
    renderPage();

    expect(await screen.findByText(dossierContent.preparation.intro)).toBeInTheDocument();

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent(dossierContent.preparation.title);
    expect(heading).toHaveTextContent(aDossier().subjectFirstName);
  });

  it("leads to each part of the preparation at its own address", async () => {
    stubPreparation();
    renderPage();

    await screen.findByText(dossierContent.preparation.intro);

    for (const [key, segment] of BLOCK_HREFS) {
      const block = dossierContent.preparation.blocks[key];
      expect(screen.getByRole("link", { name: new RegExp(block.title) })).toHaveAttribute(
        "href",
        `/dossiers/${DOSSIER_ID}/${segment}`,
      );
      expect(screen.getByText(block.description)).toBeInTheDocument();
    }
  });

  /**
   * Progress counts what has been filled in, and nothing here may turn that into a deficit.
   * The count is the assertion because it is what the screen states out loud.
   */
  it("counts what is already filled in", async () => {
    stubPreparation({
      answers: [anAnswer()],
      contracts: [aContract()],
      wishes: preparationWishes({ funeralWishes: "Une cérémonie simple." }),
    });
    renderPage();

    const progress = await screen.findByText(
      new RegExp(`${dossierContent.preparation.progressLabel}.*3/${BLOCK_HREFS.length}`),
    );

    expect(progress).toBeInTheDocument();
  });

  it("counts a trusted contact and a document too", async () => {
    stubPreparation({
      documents: [aDocument()],
      trustedContacts: [aTrustedContactDesignation()],
    });
    renderPage();

    expect(
      await screen.findByText(
        new RegExp(`${dossierContent.preparation.progressLabel}.*2/${BLOCK_HREFS.length}`),
      ),
    ).toBeInTheDocument();
  });

  /**
   * Declaring a death is the one irreversible action of this screen. The warning has to be on
   * screen before the confirmation button, not in a toast after it.
   */
  it("warns that declaring a death cannot be undone before offering to confirm", async () => {
    stubPreparation();
    renderPage();

    await userEvent.click(
      await screen.findByRole("button", {
        name: dossierContent.preparation.declareDeath.button,
      }),
    );

    expect(
      await screen.findByText(dossierContent.preparation.declareDeath.dialogDescription),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: dossierContent.preparation.declareDeath.confirmButton }),
    ).toBeDisabled();
  });

  it("does not offer to declare a death to someone who only reads the dossier", async () => {
    stubPreparation({ role: "viewer" });
    renderPage();

    await screen.findByText(dossierContent.preparation.intro);

    expect(
      screen.queryByRole("button", { name: dossierContent.preparation.declareDeath.button }),
    ).not.toBeInTheDocument();
  });

  /**
   * The 48-hour window a trusted contact opens. Every member is told it is running and is given
   * the means to stop it, which is the whole safeguard against an activation by mistake.
   */
  it("tells the members an activation is running and how to object to it", async () => {
    const effectiveAt = "2026-02-01T12:00:00.000Z";
    stubPreparation({ pendingActivationEffectiveAt: effectiveAt });
    renderPage();

    expect(
      await screen.findByText(new RegExp(dossierContent.activationPending.description)),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: dossierContent.activationPending.opposeButton }),
    ).toBeInTheDocument();
  });

  it("records an objection and says so instead of leaving the banner unchanged", async () => {
    const oppose = vi
      .spyOn(repositories.trustedContacts, "opposeActivation")
      .mockResolvedValue(undefined);
    stubPreparation({ pendingActivationEffectiveAt: "2026-02-01T12:00:00.000Z" });
    renderPage();

    await userEvent.click(
      await screen.findByRole("button", {
        name: dossierContent.activationPending.opposeButton,
      }),
    );
    await userEvent.click(
      await screen.findByRole("button", {
        name: dossierContent.activationPending.opposeConfirmButton,
      }),
    );

    expect(oppose).toHaveBeenCalledWith(DOSSIER_ID);
    expect(await screen.findByText(dossierContent.activationPending.opposed)).toBeInTheDocument();
  });
});
