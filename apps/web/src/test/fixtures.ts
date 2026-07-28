import { vi } from "vitest";
import type {
  Answer,
  Benefit,
  Comment,
  Condition,
  Contract,
  Document,
  Dossier,
  Invitation,
  Membership,
  PreparationWishes,
  Procedure,
  Profile,
  Tracking,
  TrustedContactDesignation,
} from "@sorento/domain";
import { repositories } from "@/lib/repositories";
import { signedInSession } from "@/test/supabase-stub";

/**
 * Typed builders for the domain objects the screens read.
 *
 * Every builder is annotated with the type from @sorento/domain rather than inferred, so a
 * column added to a schema breaks compilation here instead of letting a screen test keep
 * passing against a shape the database no longer produces. Overrides are explicit at the call
 * site: a test that needs an unusual shape says so in the test, it does not gain a flag here.
 */

/**
 * Derived from the signed-in session rather than written out again, so the visitor the guards
 * see and the member the screens list cannot drift into two different people.
 */
export const TEST_USER_ID = signedInSession().user.id;

export const OTHER_USER_ID = "22222222-2222-4222-8222-222222222222";
export const DOSSIER_ID = "11111111-1111-4111-8111-111111111111";
export const PROCEDURE_ID = "33333333-3333-4333-8333-333333333333";
export const BENEFIT_ID = "44444444-4444-4444-8444-444444444444";

const INSTANT = "2026-01-15T00:00:00.000Z";
const DAY = "2026-01-15";

export const aDossier = (overrides: Partial<Dossier> = {}): Dossier => ({
  id: DOSSIER_ID,
  status: "ACTIVE",
  createdBy: TEST_USER_ID,
  subjectFirstName: "Jeanne",
  subjectLastName: "Martin",
  deathDate: "2026-01-10",
  pendingActivationDeathDate: null,
  pendingActivationEffectiveAt: null,
  pendingActivationOpposedAt: null,
  createdAt: INSTANT,
  updatedAt: INSTANT,
  deletedAt: null,
  ...overrides,
});

export const aMembership = (overrides: Partial<Membership> = {}): Membership => ({
  id: "55555555-5555-4555-8555-555555555555",
  dossierId: DOSSIER_ID,
  userId: TEST_USER_ID,
  role: "owner",
  invitedBy: null,
  createdAt: INSTANT,
  updatedAt: INSTANT,
  ...overrides,
});

export const aProfile = (overrides: Partial<Profile> = {}): Profile => ({
  id: TEST_USER_ID,
  firstName: "Camille",
  role: "user",
  createdAt: INSTANT,
  updatedAt: INSTANT,
  ...overrides,
});

export const aBenefit = (overrides: Partial<Benefit> = {}): Benefit => ({
  id: BENEFIT_ID,
  code: "survivor_pension",
  title: "Pension de réversion",
  mainCondition: "Conjoint survivant, sous conditions d'âge et de ressources.",
  estimatedAmount: "jusqu'à 54 % de la pension du défunt",
  organization: "Caisses de retraite",
  formUrl: "https://www.info-retraite.fr/formulaire",
  cautionText:
    "Les personnes dans une situation comme la vôtre peuvent avoir droit à une pension de réversion sous conditions.",
  timeWindow: "6m",
  sourceUrl: "https://www.info-retraite.fr",
  lastVerifiedDate: DAY,
  active: true,
  createdAt: INSTANT,
  updatedAt: INSTANT,
  ...overrides,
});

export const aProcedure = (overrides: Partial<Procedure> = {}): Procedure => ({
  id: PROCEDURE_ID,
  code: "death_certificate",
  title: "Demander les actes de décès",
  description: "Demander plusieurs copies intégrales de l'acte de décès à la mairie.",
  organization: "Mairie du lieu de décès",
  recipientAddress: null,
  timeWindow: "7d",
  delayDays: null,
  referenceProfession: null,
  sourceUrl: "https://www.service-public.fr/acte-de-deces",
  lastVerifiedDate: DAY,
  active: true,
  createdAt: INSTANT,
  updatedAt: INSTANT,
  ...overrides,
});

export const aCondition = (overrides: Partial<Condition> = {}): Condition => ({
  id: "66666666-6666-4666-8666-666666666666",
  procedureId: null,
  benefitId: BENEFIT_ID,
  expression: { type: "comparison", field: "situation", operator: "eq", value: "spouse" },
  createdAt: INSTANT,
  ...overrides,
});

export const aTracking = (overrides: Partial<Tracking> = {}): Tracking => ({
  id: "77777777-7777-4777-8777-777777777777",
  dossierId: DOSSIER_ID,
  procedureId: PROCEDURE_ID,
  benefitId: null,
  status: "todo",
  assignedTo: null,
  note: null,
  dueDate: null,
  createdAt: INSTANT,
  updatedAt: INSTANT,
  ...overrides,
});

export const anAnswer = (overrides: Partial<Answer> = {}): Answer => ({
  id: "88888888-8888-4888-8888-888888888888",
  dossierId: DOSSIER_ID,
  key: "situation",
  value: "spouse",
  createdAt: INSTANT,
  updatedAt: INSTANT,
  ...overrides,
});

export const aComment = (overrides: Partial<Comment> = {}): Comment => ({
  id: "99999999-9999-4999-8999-999999999999",
  dossierId: DOSSIER_ID,
  procedureId: PROCEDURE_ID,
  authorId: TEST_USER_ID,
  content: "J'ai appelé la mairie ce matin.",
  mentions: [],
  createdAt: INSTANT,
  deletedAt: null,
  ...overrides,
});

export const anInvitation = (overrides: Partial<Invitation> = {}): Invitation => ({
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  dossierId: DOSSIER_ID,
  email: "proche@exemple.fr",
  role: "collaborator",
  message: null,
  invitedBy: TEST_USER_ID,
  expiresAt: "2026-01-22T00:00:00.000Z",
  usedAt: null,
  revokedAt: null,
  createdAt: INSTANT,
  ...overrides,
});

export const aContract = (overrides: Partial<Contract> = {}): Contract => ({
  id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  dossierId: DOSSIER_ID,
  contractType: "Assurance-vie",
  company: "Mutuelle des familles",
  contractNumber: null,
  knownBeneficiaries: null,
  createdAt: INSTANT,
  updatedAt: INSTANT,
  ...overrides,
});

export const aDocument = (overrides: Partial<Document> = {}): Document => ({
  id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  dossierId: DOSSIER_ID,
  category: "identity",
  storagePath: `${DOSSIER_ID}/livret-de-famille.pdf`,
  originalName: "livret-de-famille.pdf",
  mimeType: "application/pdf",
  sizeBytes: 1024,
  addedBy: TEST_USER_ID,
  createdAt: INSTANT,
  deletedAt: null,
  ...overrides,
});

export const preparationWishes = (
  overrides: Partial<PreparationWishes> = {},
): PreparationWishes => ({
  dossierId: DOSSIER_ID,
  funeralWishes: null,
  peopleToNotify: null,
  documentLocation: null,
  updatedAt: INSTANT,
  ...overrides,
});

export const aTrustedContactDesignation = (
  overrides: Partial<TrustedContactDesignation> = {},
): TrustedContactDesignation => ({
  id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
  dossierId: DOSSIER_ID,
  email: "confiance@exemple.fr",
  futureRole: "collaborator",
  consentedAt: null,
  activationExpiresAt: null,
  revokedAt: null,
  createdAt: INSTANT,
  ...overrides,
});

export interface DossierAccessFixture {
  dossier: Dossier | null;
  members?: Membership[];
  profiles?: Profile[];
}

/**
 * The three reads every dossier screen makes through use-dossier. Shared rather than repeated
 * per file because the trio is the hook's contract, not any one screen's: when the hook starts
 * reading a fourth thing, four screen tests must not each be able to disagree about it.
 */
export const stubDossierAccess = ({
  dossier,
  members = [],
  profiles = [],
}: DossierAccessFixture): void => {
  vi.spyOn(repositories.dossiers, "getById").mockResolvedValue(dossier);
  vi.spyOn(repositories.memberships, "listForDossier").mockResolvedValue(members);
  vi.spyOn(repositories.profiles, "listByIds").mockResolvedValue(profiles);
};
