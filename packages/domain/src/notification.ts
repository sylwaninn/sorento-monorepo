import { z } from "zod";
import { notificationTypeSchema } from "#domain/enums";
import { dateTimeSchema, idSchema } from "#domain/primitives";

// Mirrors notifications_email_status_check. "failed" was added by the delivery-bookkeeping
// migration for a send that exhausted its retries; without it here, the first exhausted
// notification makes the whole list unreadable for that user. Asserted against the live
// constraint by the sql-mirrors integration suite.
export const emailStatusSchema = z.enum(["pending", "sent", "skipped", "failed", "not_applicable"]);
export type EmailStatus = z.infer<typeof emailStatusSchema>;

export const notificationSchema = z.object({
  id: idSchema,
  userId: idSchema,
  dossierId: idSchema.nullable(),
  type: notificationTypeSchema,
  targetId: idSchema.nullable(),
  read: z.boolean(),
  payload: z.record(z.string(), z.unknown()),
  emailStatus: emailStatusSchema,
  createdAt: dateTimeSchema,
});
export type Notification = z.infer<typeof notificationSchema>;

export const notificationPreferenceSchema = z.object({
  eventType: notificationTypeSchema,
  inApp: z.boolean(),
  email: z.boolean(),
});
export type NotificationPreference = z.infer<typeof notificationPreferenceSchema>;

// Mirrors resolve_notification_preference() in the migration — kept in sync by hand since
// one is SQL and the other TS. Used by E13 to show the effective default before any
// override exists, and by a viewer's stricter default (mention/dossier_activated only).
export const DEFAULT_NOTIFICATION_PREFERENCES: Record<
  z.infer<typeof notificationTypeSchema>,
  { inApp: boolean; email: boolean }
> = {
  procedure_assigned: { inApp: true, email: true },
  mention: { inApp: true, email: true },
  comment_on_assigned_procedure: { inApp: true, email: false },
  status_changed_on_assigned_procedure: { inApp: true, email: false },
  deadline_approaching: { inApp: true, email: true },
  prolonged_waiting: { inApp: true, email: true },
  invitation: { inApp: false, email: true },
  member_joined: { inApp: true, email: false },
  member_left: { inApp: true, email: false },
  dossier_activated: { inApp: true, email: true },
  weekly_digest: { inApp: false, email: false },
};
