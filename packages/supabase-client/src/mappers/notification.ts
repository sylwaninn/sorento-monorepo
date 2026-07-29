import { notificationSchema, type Notification } from "@sorento/domain";
import type { Database } from "#client/database.types";

type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];

export const mapNotificationRow = (row: NotificationRow): Notification =>
  notificationSchema.parse({
    id: row.id,
    userId: row.user_id,
    dossierId: row.dossier_id,
    type: row.type,
    targetId: row.target_id,
    read: row.read,
    payload: row.payload,
    emailStatus: row.email_status,
    createdAt: row.created_at,
  });
