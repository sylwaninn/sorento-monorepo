import { describe, expect, it } from "vitest";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  emailStatusSchema,
  notificationPreferenceSchema,
  notificationSchema,
} from "#domain/notification";
import { notificationTypeSchema } from "#domain/enums";
import { DATE_TIME, ID, NOT_AN_ID, OTHER_ID } from "#domain/test-fixtures";

const VALID = {
  id: ID,
  userId: OTHER_ID,
  dossierId: ID,
  type: "mention",
  targetId: OTHER_ID,
  read: false,
  payload: { commentId: ID },
  emailStatus: "pending",
  createdAt: DATE_TIME,
};

describe("emailStatusSchema", () => {
  // Mirrors: check (email_status in ('pending','sent','skipped','failed','not_applicable'))
  it("covers exactly the five delivery states the constraint allows", () => {
    expect(emailStatusSchema.options).toEqual([
      "pending",
      "sent",
      "skipped",
      "failed",
      "not_applicable",
    ]);
  });

  // send-pending-emails writes this once a notification exhausts its retries. It was missing
  // here while the SQL constraint already allowed it, so the first exhausted row broke the
  // whole notification list for that user.
  it("accepts a send that exhausted its retries", () => {
    expect(emailStatusSchema.safeParse("failed").success).toBe(true);
  });

  it("rejects a state no writer sets", () => {
    expect(emailStatusSchema.safeParse("bounced").success).toBe(false);
  });
});

describe("notificationSchema", () => {
  it("accepts a complete notification", () => {
    expect(notificationSchema.safeParse(VALID).success).toBe(true);
  });

  it.each(["id", "userId", "type", "read", "payload", "emailStatus", "createdAt"])(
    "requires %s",
    (field) => {
      const { [field]: _removed, ...withoutField } = VALID as Record<string, unknown>;
      expect(notificationSchema.safeParse(withoutField).success).toBe(false);
    },
  );

  it("accepts a notification tied to no dossier, such as an invitation", () => {
    expect(notificationSchema.safeParse({ ...VALID, dossierId: null }).success).toBe(true);
  });

  it("accepts a notification pointing at nothing in particular", () => {
    expect(notificationSchema.safeParse({ ...VALID, targetId: null }).success).toBe(true);
  });

  it("accepts an empty payload", () => {
    expect(notificationSchema.safeParse({ ...VALID, payload: {} }).success).toBe(true);
  });

  it("rejects read given as a string rather than a boolean", () => {
    expect(notificationSchema.safeParse({ ...VALID, read: "false" }).success).toBe(false);
  });

  it("rejects an unknown notification type", () => {
    expect(notificationSchema.safeParse({ ...VALID, type: "marketing" }).success).toBe(false);
  });

  it("rejects a user id that is not a uuid", () => {
    expect(notificationSchema.safeParse({ ...VALID, userId: NOT_AN_ID }).success).toBe(false);
  });
});

describe("notificationPreferenceSchema", () => {
  it("accepts a preference for one event type", () => {
    expect(
      notificationPreferenceSchema.safeParse({ eventType: "mention", inApp: true, email: false })
        .success,
    ).toBe(true);
  });

  it.each(["eventType", "inApp", "email"])("requires %s", (field) => {
    const preference: Record<string, unknown> = {
      eventType: "mention",
      inApp: true,
      email: false,
    };
    delete preference[field];
    expect(notificationPreferenceSchema.safeParse(preference).success).toBe(false);
  });

  it("rejects an event type that is not notifiable", () => {
    expect(
      notificationPreferenceSchema.safeParse({ eventType: "login", inApp: true, email: true })
        .success,
    ).toBe(false);
  });
});

/**
 * These defaults mirror resolve_notification_preference() in the migration, kept in sync by
 * hand because one side is SQL and the other TypeScript. Asserting them value by value is what
 * makes a silent drift between the two visible.
 */
describe("DEFAULT_NOTIFICATION_PREFERENCES", () => {
  it("covers every notification type, with no extras", () => {
    expect(Object.keys(DEFAULT_NOTIFICATION_PREFERENCES).sort()).toEqual(
      [...notificationTypeSchema.options].sort(),
    );
  });

  it.each([
    ["procedure_assigned", true, true],
    ["mention", true, true],
    ["comment_on_assigned_procedure", true, false],
    ["status_changed_on_assigned_procedure", true, false],
    ["deadline_approaching", true, true],
    ["prolonged_waiting", true, true],
    ["invitation", false, true],
    ["member_joined", true, false],
    ["member_left", true, false],
    ["dossier_activated", true, true],
    ["weekly_digest", false, false],
  ] as const)("defaults %s to inApp=%s, email=%s", (type, inApp, email) => {
    expect(DEFAULT_NOTIFICATION_PREFERENCES[type]).toEqual({ inApp, email });
  });

  // An invitation reaches someone who has no account yet: in-app would never be seen.
  it("sends an invitation by email only", () => {
    expect(DEFAULT_NOTIFICATION_PREFERENCES.invitation).toEqual({ inApp: false, email: true });
  });

  // The digest is opt-in on both channels: a bereavement app does not push a weekly recap.
  it("leaves the weekly digest off on both channels", () => {
    expect(DEFAULT_NOTIFICATION_PREFERENCES.weekly_digest).toEqual({ inApp: false, email: false });
  });
});
