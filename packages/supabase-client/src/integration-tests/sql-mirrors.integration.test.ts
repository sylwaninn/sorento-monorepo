import { describe, expect, it } from "vitest";
import {
  ALLOWED_MIME_TYPES,
  DEFAULT_NOTIFICATION_PREFERENCES,
  catalogHistoryActionSchema,
  catalogTableSchema,
  dossierRoleSchema,
  dossierStatusSchema,
  emailStatusSchema,
  invitableRoleSchema,
  notificationTypeSchema,
  profileSchema,
  timeWindowSchema,
  trackingStatusSchema,
  trustedContactDesignationSchema,
} from "@sorento/domain";
import { allowedValues, query } from "#client/integration-tests/database";
import { createTestUser, must } from "#client/integration-tests/helpers";
import { DossierRepository } from "#client/repositories/dossier-repository";

/**
 * Where TypeScript and SQL both state the same rule, this suite is what makes one of them the
 * copy rather than a second original.
 *
 * The pattern that made these tests necessary: a migration widened
 * notifications_email_status_check to allow 'failed', the Zod enum was never widened, and the
 * first notification that exhausted its retries made the whole list unreadable, because the
 * mapper parses, and parsing a value the schema does not know throws. Nothing in the repo
 * compared the two sides, so nothing failed until a user hit it.
 *
 * These read the live catalog rather than a copy of the migration: a constraint dropped and
 * recreated by a later migration is only knowable from the database.
 */

describe("enum schemas mirror their check constraints", () => {
  const pairs: ReadonlyArray<[string, string, readonly string[]]> = [
    ["memberships", "role", dossierRoleSchema.options],
    ["invitations", "role", invitableRoleSchema.options],
    ["profiles", "role", profileSchema.shape.role.options],
    ["dossiers", "status", dossierStatusSchema.options],
    ["tracking", "status", trackingStatusSchema.options],
    ["procedures", "time_window", timeWindowSchema.options],
    ["benefits", "time_window", timeWindowSchema.options],
    ["documents", "mime_type", ALLOWED_MIME_TYPES],
    ["catalog_history", "catalog_table", catalogTableSchema.options],
    ["catalog_history", "action", catalogHistoryActionSchema.options],
    ["notifications", "email_status", emailStatusSchema.options],
    [
      "trusted_contact_designations",
      "future_role",
      trustedContactDesignationSchema.shape.futureRole.options,
    ],
  ];

  it.each(pairs)("%s.%s", async (table, column, schemaOptions) => {
    const constraintValues = await allowedValues(table, column);

    // Compared as sets: the constraint lists values in its own order, and requiring the two to
    // agree on ordering would fail on a reordering that changes nothing.
    expect([...constraintValues].sort()).toEqual([...schemaOptions].sort());
  });
});

describe("notification defaults mirror resolve_notification_preference()", () => {
  /**
   * The plpgsql function is the authority: it is what decides whether a row is inserted at all.
   * DEFAULT_NOTIFICATION_PREFERENCES only exists so the settings screen can show the effective
   * default before any override, and it was carrying a hand-written copy of that CASE block.
   */
  const resolveInDatabase = async (
    userId: string,
    dossierId: string | null,
    eventType: string,
  ): Promise<{ inApp: boolean; email: boolean }> => {
    const rows = await query<{ p_in_app: boolean; p_email: boolean }>(
      "select * from resolve_notification_preference($1, $2, $3)",
      [userId, dossierId, eventType],
    );
    const row = must(rows[0], `resolve_notification_preference(${eventType})`);
    return { inApp: row.p_in_app, email: row.p_email };
  };

  /**
   * `invitation` is the one type the function does not govern: invite-member sends its email
   * itself, in the same call that creates the invitation, without consulting preferences, so
   * the CASE block has no branch for it and falls through to the all-off default, while the
   * constant describes what the invitee actually receives.
   *
   * Recorded here rather than smoothed over on either side: the constant is what the settings
   * screen shows, and it is not lying about the email arriving. What it does hide is that the
   * toggle cannot stop it, which is a product decision to make, not a test to bend.
   */
  const RESOLVED_ELSEWHERE = new Set(["invitation"]);

  it.each(notificationTypeSchema.options)("%s", async (eventType) => {
    const user = await createTestUser("Mirror");
    const resolved = await resolveInDatabase(user.id, null, eventType);

    if (RESOLVED_ELSEWHERE.has(eventType)) {
      expect(resolved).toEqual({ inApp: false, email: false });
      return;
    }

    // No membership row for this user, so the function falls through to the plain defaults,
    // which is exactly what the constant claims to describe.
    expect(resolved).toEqual(DEFAULT_NOTIFICATION_PREFERENCES[eventType]);
  });

  it("covers every notification type the enum declares", () => {
    expect(Object.keys(DEFAULT_NOTIFICATION_PREFERENCES).sort()).toEqual(
      [...notificationTypeSchema.options].sort(),
    );
  });

  /**
   * A viewer receives nothing but a direct mention and the dossier's activation. That rule lives
   * only in SQL, so it is asserted against the database rather than mirrored into TypeScript.
   */
  it("silences everything but mentions and activation for a viewer", async () => {
    const owner = await createTestUser("Owner");
    const viewer = await createTestUser("Viewer");
    const dossier = await new DossierRepository(owner.client).create({
      subjectFirstName: "Jean",
      subjectLastName: "Martin",
      status: "PREPARATION",
    });

    await query("insert into memberships (dossier_id, user_id, role) values ($1, $2, 'viewer')", [
      dossier.id,
      viewer.id,
    ]);

    for (const eventType of notificationTypeSchema.options) {
      const resolved = await resolveInDatabase(viewer.id, dossier.id, eventType);
      const expected =
        eventType === "mention" || eventType === "dossier_activated"
          ? DEFAULT_NOTIFICATION_PREFERENCES[eventType]
          : { inApp: false, email: false };

      expect(resolved, eventType).toEqual(expected);
    }
  });

  /**
   * The exception above is only tolerable while it stays one line of SQL. If the CASE block ever
   * gains an `invitation` branch, the constant becomes the authoritative copy again and the
   * exception has to go.
   */
  it("keeps the invitation exception limited to what the function ignores", async () => {
    const user = await createTestUser("Exception");

    expect(await resolveInDatabase(user.id, null, "invitation")).toEqual({
      inApp: false,
      email: false,
    });
  });

  it("lets an explicit override win over the default", async () => {
    const user = await createTestUser("Override");

    await query(
      `insert into notification_preferences (user_id, event_type, in_app, email)
       values ($1, 'invitation', true, false)`,
      [user.id],
    );

    // invitation defaults to email-only, so flipping both channels proves the override is read
    // rather than merged with the default.
    expect(await resolveInDatabase(user.id, null, "invitation")).toEqual({
      inApp: true,
      email: false,
    });
  });
});
