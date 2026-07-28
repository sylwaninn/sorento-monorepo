import { describe, expect, it } from "vitest";
import {
  DOSSIER_ROLE_RANK,
  activityLogTypeSchema,
  dossierRoleSchema,
  dossierStatusSchema,
  notificationTypeSchema,
  timeWindowSchema,
  trackingStatusSchema,
} from "#domain/enums";

/**
 * The expected values are written out here rather than derived from `schema.options`, and that
 * is the whole point: a test that loops over the schema's own options passes even when a value
 * is silently changed, because it validates the schema against itself. These lists are the
 * independent copy, and several of them mirror a SQL check constraint — a divergence here is a
 * row the database will reject at runtime.
 */

describe("dossierRoleSchema", () => {
  // Mirrors: check (role in ('owner', 'collaborator', 'viewer', 'trusted_contact'))
  const ROLES = ["owner", "collaborator", "viewer", "trusted_contact"];

  it("accepts exactly the four roles the memberships constraint allows", () => {
    expect(dossierRoleSchema.options).toEqual(ROLES);
  });

  it.each(ROLES)("accepts %s", (role) => {
    expect(dossierRoleSchema.safeParse(role).success).toBe(true);
  });

  it("rejects a role outside the constraint", () => {
    expect(dossierRoleSchema.safeParse("admin").success).toBe(false);
  });
});

describe("DOSSIER_ROLE_RANK", () => {
  it("orders viewer below collaborator below owner", () => {
    expect(DOSSIER_ROLE_RANK.viewer).toBe(1);
    expect(DOSSIER_ROLE_RANK.collaborator).toBe(2);
    expect(DOSSIER_ROLE_RANK.owner).toBe(3);
  });

  it("ranks no trusted contact: it never compares against a minimum role", () => {
    expect(Object.keys(DOSSIER_ROLE_RANK).sort()).toEqual(["collaborator", "owner", "viewer"]);
  });
});

describe("dossierStatusSchema", () => {
  // Mirrors: check (status in ('PREPARATION', 'ACTIVE'))
  it("accepts exactly the two states the dossiers constraint allows", () => {
    expect(dossierStatusSchema.options).toEqual(["PREPARATION", "ACTIVE"]);
  });

  it("rejects the French spelling that the constraint would refuse", () => {
    expect(dossierStatusSchema.safeParse("ACTIF").success).toBe(false);
  });
});

describe("trackingStatusSchema", () => {
  const STATUSES = ["todo", "in_progress", "waiting", "done", "not_applicable"];

  it("accepts exactly the five tracking states", () => {
    expect(trackingStatusSchema.options).toEqual(STATUSES);
  });

  it.each(STATUSES)("accepts %s", (status) => {
    expect(trackingStatusSchema.safeParse(status).success).toBe(true);
  });

  it("rejects an unknown state", () => {
    expect(trackingStatusSchema.safeParse("blocked").success).toBe(false);
  });
});

describe("timeWindowSchema", () => {
  const WINDOWS = ["24h", "7d", "30d", "6m"];

  it("accepts exactly the four windows the deadline defaults are keyed by", () => {
    expect(timeWindowSchema.options).toEqual(WINDOWS);
  });

  it.each(WINDOWS)("accepts %s", (window) => {
    expect(timeWindowSchema.safeParse(window).success).toBe(true);
  });

  it("rejects a window with no default delay behind it", () => {
    expect(timeWindowSchema.safeParse("1y").success).toBe(false);
  });
});

describe("activityLogTypeSchema", () => {
  // Every value here is written by a database trigger or an Edge Function; a mismatch means a
  // journal entry nothing can render.
  const TYPES = [
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
  ];

  it("accepts exactly the logged action types", () => {
    expect(activityLogTypeSchema.options).toEqual(TYPES);
  });

  it.each(TYPES)("accepts %s", (type) => {
    expect(activityLogTypeSchema.safeParse(type).success).toBe(true);
  });

  it("rejects an unlogged action type", () => {
    expect(activityLogTypeSchema.safeParse("dossier_exported").success).toBe(false);
  });
});

describe("notificationTypeSchema", () => {
  const TYPES = [
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
  ];

  it("accepts exactly the notification types", () => {
    expect(notificationTypeSchema.options).toEqual(TYPES);
  });

  it.each(TYPES)("accepts %s", (type) => {
    expect(notificationTypeSchema.safeParse(type).success).toBe(true);
  });

  it("rejects an unknown notification type", () => {
    expect(notificationTypeSchema.safeParse("marketing").success).toBe(false);
  });
});
