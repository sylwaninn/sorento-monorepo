import { describe, expect, it } from "vitest";
import { mapNotificationRow } from "#client/mappers/notification";
import { timestamp, uuid } from "#client/mappers/test-fixtures";
import type { Database } from "#client/database.types";

type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];

const row: NotificationRow = {
  id: uuid(1),
  user_id: uuid(2),
  dossier_id: uuid(3),
  type: "procedure_assigned",
  target_id: uuid(4),
  read: false,
  payload: { procedureTitle: "Déclarer le décès" },
  email_status: "pending",
  created_at: timestamp(1),
  email_attempts: 0,
  email_last_attempt_at: null,
  updated_at: timestamp(2),
};

describe("mapNotificationRow", () => {
  it("maps every column to its own field", () => {
    expect(mapNotificationRow(row)).toEqual({
      id: uuid(1),
      userId: uuid(2),
      dossierId: uuid(3),
      type: "procedure_assigned",
      targetId: uuid(4),
      read: false,
      payload: { procedureTitle: "Déclarer le décès" },
      emailStatus: "pending",
      createdAt: timestamp(1),
    });
  });

  it("accepts every delivery state the sender writes", () => {
    for (const status of ["pending", "sent", "skipped", "failed", "not_applicable"]) {
      expect(mapNotificationRow({ ...row, email_status: status }).emailStatus).toBe(status);
    }
  });

  // An unknown state would make the sender's retry logic read as "not yet attempted".
  it("rejects a delivery state outside the enum", () => {
    expect(() => mapNotificationRow({ ...row, email_status: "bounced" })).toThrow();
  });

  it("rejects a notification type outside the enum", () => {
    expect(() => mapNotificationRow({ ...row, type: "birthday" })).toThrow();
  });

  it("accepts a notification attached to no dossier", () => {
    expect(mapNotificationRow({ ...row, dossier_id: null }).dossierId).toBeNull();
  });
});
