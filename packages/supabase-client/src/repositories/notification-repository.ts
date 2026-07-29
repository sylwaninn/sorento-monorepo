import type { Notification, NotificationPort } from "@sorento/domain";
import type { TypedSupabaseClient } from "#client/client";
import { assertNoError } from "#client/errors";
import { mapNotificationRow } from "#client/mappers";

export class NotificationRepository implements NotificationPort {
  constructor(private readonly client: TypedSupabaseClient) {}

  listForCurrentUser = async (): Promise<Notification[]> => {
    const { data, error } = await this.client
      .from("notifications")
      .select()
      .order("created_at", { ascending: false });

    assertNoError(error, "list notifications");
    return (data ?? []).map(mapNotificationRow);
  };

  markRead = async (id: string): Promise<void> => {
    const { error } = await this.client.from("notifications").update({ read: true }).eq("id", id);
    assertNoError(error, "mark notification read");
  };

  markAllRead = async (userId: string): Promise<void> => {
    const { error } = await this.client
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId)
      .eq("read", false);

    assertNoError(error, "mark all notifications read");
  };
}
