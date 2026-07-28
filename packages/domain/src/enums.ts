import { z } from "zod";

export const dossierRoleSchema = z.enum(["owner", "collaborator", "viewer", "trusted_contact"]);
export type DossierRole = z.infer<typeof dossierRoleSchema>;

// trusted_contact is intentionally excluded: it never compares against a minimum role
// while the dossier is in PREPARATION (see has_dossier_access in the migration).
export const DOSSIER_ROLE_RANK: Record<Exclude<DossierRole, "trusted_contact">, number> = {
  viewer: 1,
  collaborator: 2,
  owner: 3,
};

export const dossierStatusSchema = z.enum(["PREPARATION", "ACTIVE"]);
export type DossierStatus = z.infer<typeof dossierStatusSchema>;

export const trackingStatusSchema = z.enum([
  "todo",
  "in_progress",
  "waiting",
  "done",
  "not_applicable",
]);
export type TrackingStatus = z.infer<typeof trackingStatusSchema>;

export const timeWindowSchema = z.enum(["24h", "7d", "30d", "6m"]);
export type TimeWindow = z.infer<typeof timeWindowSchema>;

export const activityLogTypeSchema = z.enum([
  "status_changed",
  "assignment_changed",
  "document_added",
  "document_removed",
  "member_invited",
  "member_joined",
  "member_removed",
  "invitation_revoked",
  "ownership_transferred",
  "dossier_activated",
  "letter_generated",
  "answers_updated",
  "dossier_deleted",
]);
export type ActivityLogType = z.infer<typeof activityLogTypeSchema>;

export const notificationTypeSchema = z.enum([
  "procedure_assigned",
  "mention",
  "comment_on_assigned_procedure",
  "status_changed_on_assigned_procedure",
  "deadline_approaching",
  "prolonged_waiting",
  "invitation",
  "member_joined",
  "member_left",
  "dossier_activated",
  "weekly_digest",
]);
export type NotificationType = z.infer<typeof notificationTypeSchema>;
