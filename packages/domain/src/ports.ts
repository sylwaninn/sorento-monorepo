import type { ActivityLogEntry, CatalogHistory } from "#domain/activity-log";
import type { AdminMetrics } from "#domain/admin-metrics";
import type { Answer, DiagnosticAnswers } from "#domain/answer";
import type {
  Benefit,
  BenefitInput,
  Condition,
  ConditionInput,
  LetterTemplate,
  LetterTemplateInput,
  Procedure,
  ProcedureInput,
} from "#domain/catalog";
import type { Comment, CommentCreation } from "#domain/comment";
import type { Contract, ContractInput } from "#domain/contract";
import type { Document } from "#domain/document";
import type { Dossier, DossierCreation, DossierInfoUpdate } from "#domain/dossier";
import type {
  CreateInvitationInput,
  CreateInvitationResult,
  Invitation,
  ResolveInvitationResult,
} from "#domain/invitation";
import type { InvitableRole, Membership } from "#domain/membership";
import type { Notification, NotificationPreference } from "#domain/notification";
import type { DossierRole, NotificationType } from "#domain/enums";
import type { PreparationWishes, PreparationWishesInput } from "#domain/preparation-wishes";
import type { Profile, ProfileUpdate } from "#domain/profile";
import type { Tracking, TrackingUpdate } from "#domain/tracking";
import type {
  DesignateTrustedContactInput,
  ResolveTrustedContactActivationResult,
  TrustedContactDesignation,
} from "#domain/trusted-contact";

/**
 * Ports, in the dependency-inversion sense: the orchestration layer depends on these, and
 * packages/supabase-client provides the adapter. Nothing here mentions Supabase, so a test
 * can substitute an in-memory implementation and the UI never learns where data lives.
 */

export interface DossierPort {
  create(input: DossierCreation): Promise<Dossier>;
  getById(id: string): Promise<Dossier | null>;
  listForCurrentUser(): Promise<Dossier[]>;
  updateInfo(id: string, input: DossierInfoUpdate): Promise<Dossier>;
  activate(id: string, deathDate: string): Promise<Dossier>;
  softDelete(id: string): Promise<void>;
  restore(id: string): Promise<void>;
}

export interface AnswerPort {
  listForDossier(dossierId: string): Promise<Answer[]>;
  save(dossierId: string, answers: DiagnosticAnswers): Promise<void>;
}

export interface CatalogPort {
  listProcedures(): Promise<Procedure[]>;
  listAllProcedures(): Promise<Procedure[]>;
  createProcedure(input: ProcedureInput): Promise<Procedure>;
  updateProcedure(id: string, input: ProcedureInput): Promise<Procedure>;
  deleteProcedure(id: string): Promise<void>;
  listBenefits(): Promise<Benefit[]>;
  listAllBenefits(): Promise<Benefit[]>;
  createBenefit(input: BenefitInput): Promise<Benefit>;
  updateBenefit(id: string, input: BenefitInput): Promise<Benefit>;
  deleteBenefit(id: string): Promise<void>;
  listConditions(): Promise<Condition[]>;
  createCondition(input: ConditionInput): Promise<Condition>;
  updateCondition(id: string, input: ConditionInput): Promise<Condition>;
  deleteCondition(id: string): Promise<void>;
  listLetterTemplates(procedureId: string): Promise<LetterTemplate[]>;
  listAllLetterTemplates(): Promise<LetterTemplate[]>;
  createLetterTemplate(input: LetterTemplateInput): Promise<LetterTemplate>;
  updateLetterTemplate(id: string, input: LetterTemplateInput): Promise<LetterTemplate>;
  deleteLetterTemplate(id: string): Promise<void>;
}

export interface TrackingPort {
  listForDossier(dossierId: string): Promise<Tracking[]>;
  createForProcedure(dossierId: string, procedureId: string): Promise<Tracking>;
  createForBenefit(dossierId: string, benefitId: string): Promise<Tracking>;
  update(id: string, patch: TrackingUpdate): Promise<Tracking>;
}

export interface CommentPort {
  listForDossier(dossierId: string, procedureId?: string): Promise<Comment[]>;
  create(input: CommentCreation, authorId: string): Promise<Comment>;
  softDelete(id: string): Promise<void>;
}

export interface DocumentPort {
  listForDossier(dossierId: string): Promise<Document[]>;
  upload(dossierId: string, category: string, file: File, addedBy: string): Promise<Document>;
  getSignedUrl(storagePath: string, expiresInSeconds?: number): Promise<string>;
  softDelete(id: string): Promise<void>;
}

export interface MembershipPort {
  listForDossier(dossierId: string): Promise<Membership[]>;
  changeRole(id: string, role: Exclude<DossierRole, "owner">): Promise<Membership>;
  removeMember(id: string): Promise<void>;
  transferOwnership(dossierId: string, newOwnerUserId: string): Promise<void>;
}

export interface InvitationPort {
  listPendingForDossier(dossierId: string): Promise<Invitation[]>;
  revoke(id: string): Promise<void>;
  create(input: CreateInvitationInput): Promise<CreateInvitationResult>;
  resolve(token: string): Promise<ResolveInvitationResult>;
  accept(token: string): Promise<{ dossierId: string }>;
}

export interface NotificationPort {
  listForCurrentUser(): Promise<Notification[]>;
  markRead(id: string): Promise<void>;
  markAllRead(userId: string): Promise<void>;
}

export interface NotificationPreferencePort {
  listForCurrentUser(): Promise<NotificationPreference[]>;
  setPreference(
    userId: string,
    eventType: NotificationType,
    inApp: boolean,
    email: boolean,
  ): Promise<void>;
}

export interface ActivityLogPort {
  listForDossier(dossierId: string, procedureId?: string): Promise<ActivityLogEntry[]>;
  recordLetterGeneration(dossierId: string, procedureId: string): Promise<void>;
}

export interface ProfilePort {
  listByIds(ids: string[]): Promise<Profile[]>;
  updateSelf(id: string, input: ProfileUpdate): Promise<Profile>;
}

export interface ContractPort {
  listForDossier(dossierId: string): Promise<Contract[]>;
  create(dossierId: string, input: ContractInput): Promise<Contract>;
  update(id: string, input: ContractInput): Promise<Contract>;
  delete(id: string): Promise<void>;
}

export interface PreparationWishesPort {
  getForDossier(dossierId: string): Promise<PreparationWishes | null>;
  upsert(dossierId: string, input: PreparationWishesInput): Promise<PreparationWishes>;
}

export interface TrustedContactPort {
  listForDossier(dossierId: string): Promise<TrustedContactDesignation[]>;
  revoke(id: string): Promise<void>;
  designate(
    input: DesignateTrustedContactInput,
  ): Promise<{ designationId: string; consentUrl: string }>;
  consent(token: string): Promise<{ dossierId: string; activationUrl: string }>;
  resolveActivation(token: string): Promise<ResolveTrustedContactActivationResult>;
  requestActivation(
    token: string,
    deathDate: string,
    documentPath?: string,
  ): Promise<{ dossierId: string; effectiveAt: string }>;
  opposeActivation(dossierId: string, reason?: string): Promise<void>;
}

export interface CatalogHistoryPort {
  listRecent(limit?: number): Promise<CatalogHistory[]>;
}

export interface AdminMetricsPort {
  get(): Promise<AdminMetrics>;
}

export interface AccountPort {
  exportData(): Promise<AccountExport>;
  /** Dossiers the account still owns: deletion is refused while any remain. */
  ownedDossierCount(): Promise<number>;
  deleteAccount(): Promise<void>;
}

/** Everything the account owner is entitled to receive, in one plain object (E13). */
export interface AccountExport {
  profile: Profile;
  dossiers: Dossier[];
  memberships: Array<{ dossierId: string; role: DossierRole }>;
  answers: Answer[];
  tracking: Tracking[];
  comments: Comment[];
  documents: Document[];
  contracts: Contract[];
  notificationPreferences: NotificationPreference[];
  exportedAt: string;
}

export type { InvitableRole };
