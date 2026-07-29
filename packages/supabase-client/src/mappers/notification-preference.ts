import { notificationPreferenceSchema, type NotificationPreference } from "@sorento/domain";
import type { Database } from "#client/database.types";

type NotificationPreferenceRow = Database["public"]["Tables"]["notification_preferences"]["Row"];

export const mapNotificationPreferenceRow = (
  row: NotificationPreferenceRow,
): NotificationPreference =>
  notificationPreferenceSchema.parse({
    eventType: row.event_type,
    inApp: row.in_app,
    email: row.email,
  });
