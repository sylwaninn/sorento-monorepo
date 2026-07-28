import {
  AccountRepository,
  ActivityLogRepository,
  AdminMetricsRepository,
  AnswerRepository,
  CatalogHistoryRepository,
  CatalogRepository,
  CommentRepository,
  ContractRepository,
  DocumentRepository,
  DossierRepository,
  InvitationRepository,
  MembershipRepository,
  NotificationPreferenceRepository,
  NotificationRepository,
  PreparationWishesRepository,
  ProfileRepository,
  TrackingRepository,
  TrustedContactRepository,
} from "@sorento/supabase-client";
import { supabase } from "@/lib/supabase-client";

/**
 * Repositories are stateless wrappers around the one browser client, so they are built once
 * here instead of being re-instantiated inside every render. Typed as the domain ports, which
 * is what keeps the hooks from reaching for a Supabase-specific method by accident.
 */
export const repositories = {
  account: new AccountRepository(supabase),
  activityLog: new ActivityLogRepository(supabase),
  adminMetrics: new AdminMetricsRepository(supabase),
  answers: new AnswerRepository(supabase),
  catalog: new CatalogRepository(supabase),
  catalogHistory: new CatalogHistoryRepository(supabase),
  comments: new CommentRepository(supabase),
  contracts: new ContractRepository(supabase),
  documents: new DocumentRepository(supabase),
  dossiers: new DossierRepository(supabase),
  invitations: new InvitationRepository(supabase),
  memberships: new MembershipRepository(supabase),
  notificationPreferences: new NotificationPreferenceRepository(supabase),
  notifications: new NotificationRepository(supabase),
  preparationWishes: new PreparationWishesRepository(supabase),
  profiles: new ProfileRepository(supabase),
  tracking: new TrackingRepository(supabase),
  trustedContacts: new TrustedContactRepository(supabase),
} as const;
