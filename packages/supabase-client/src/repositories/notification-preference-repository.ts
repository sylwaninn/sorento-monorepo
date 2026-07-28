import type {
  NotificationPreference,
  NotificationPreferencePort,
  NotificationType,
} from "@sorento/domain";
import type { TypedSupabaseClient } from "#client/client";
import { assertNoError } from "#client/errors";
import { mapNotificationPreferenceRow } from "#client/mappers";

// Only overrides are stored — an absent row means "use the default" (see
// resolve_notification_preference() in the migration).
export class NotificationPreferenceRepository implements NotificationPreferencePort {
  constructor(private readonly client: TypedSupabaseClient) {}

  listForCurrentUser = async (): Promise<NotificationPreference[]> => {
    const { data, error } = await this.client.from("notification_preferences").select();
    assertNoError(error, "list notification preferences");
    return (data ?? []).map(mapNotificationPreferenceRow);
  };

  setPreference = async (
    userId: string,
    eventType: NotificationType,
    inApp: boolean,
    email: boolean,
  ): Promise<void> => {
    const { error } = await this.client
      .from("notification_preferences")
      .upsert(
        { user_id: userId, event_type: eventType, in_app: inApp, email },
        { onConflict: "user_id,event_type" },
      );
    assertNoError(error, "set notification preference");
  };
}
