import { describe, expect, it } from "vitest";
import { mapNotificationPreferenceRow } from "#client/mappers/notification-preference";
import { uuid } from "#client/mappers/test-fixtures";
import type { Database } from "#client/database.types";

type NotificationPreferenceRow = Database["public"]["Tables"]["notification_preferences"]["Row"];

const row: NotificationPreferenceRow = {
  user_id: uuid(1),
  event_type: "mention",
  in_app: true,
  email: false,
};

describe("mapNotificationPreferenceRow", () => {
  it("maps every column to its own field", () => {
    expect(mapNotificationPreferenceRow(row)).toEqual({
      eventType: "mention",
      inApp: true,
      email: false,
    });
  });

  // in_app and email are two booleans in the same row, which is exactly the pair a mapper can
  // swap without any type error. Asserting an asymmetric row is what makes the swap visible.
  it("keeps the in-app and email channels apart", () => {
    const swapped = mapNotificationPreferenceRow({ ...row, in_app: false, email: true });

    expect(swapped.inApp).toBe(false);
    expect(swapped.email).toBe(true);
  });

  it("rejects an event type outside the enum", () => {
    expect(() => mapNotificationPreferenceRow({ ...row, event_type: "newsletter" })).toThrow();
  });
});
