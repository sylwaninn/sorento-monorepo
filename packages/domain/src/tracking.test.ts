import { describe, expect, it } from "vitest";
import { trackingSchema, trackingUpdateSchema } from "#domain/tracking";
import { DATE, DATE_TIME, ID, NOT_AN_ID, OTHER_ID } from "#domain/test-fixtures";

const VALID = {
  id: ID,
  dossierId: OTHER_ID,
  procedureId: ID,
  benefitId: null,
  status: "todo",
  assignedTo: OTHER_ID,
  note: "À faire cette semaine.",
  dueDate: DATE,
  createdAt: DATE_TIME,
  updatedAt: DATE_TIME,
};

describe("trackingSchema", () => {
  it("accepts a complete tracking row", () => {
    expect(trackingSchema.safeParse(VALID).success).toBe(true);
  });

  it.each(["id", "dossierId", "status", "createdAt", "updatedAt"])("requires %s", (field) => {
    const { [field]: _removed, ...withoutField } = VALID as Record<string, unknown>;
    expect(trackingSchema.safeParse(withoutField).success).toBe(false);
  });

  it("accepts a row targeting a benefit instead of a procedure", () => {
    expect(trackingSchema.safeParse({ ...VALID, procedureId: null, benefitId: ID }).success).toBe(
      true,
    );
  });

  // A removed member's assignments revert to unassigned rather than dangling.
  it("accepts an unassigned row", () => {
    expect(trackingSchema.safeParse({ ...VALID, assignedTo: null }).success).toBe(true);
  });

  it("accepts a row with no note", () => {
    expect(trackingSchema.safeParse({ ...VALID, note: null }).success).toBe(true);
  });

  it("accepts a row with no due date, as in a dossier in preparation", () => {
    expect(trackingSchema.safeParse({ ...VALID, dueDate: null }).success).toBe(true);
  });

  it("rejects a due date carrying a time: a deadline is a calendar day", () => {
    expect(trackingSchema.safeParse({ ...VALID, dueDate: DATE_TIME }).success).toBe(false);
  });

  it("rejects a status outside the tracking constraint", () => {
    expect(trackingSchema.safeParse({ ...VALID, status: "blocked" }).success).toBe(false);
  });

  it("rejects an assignee that is not a uuid", () => {
    expect(trackingSchema.safeParse({ ...VALID, assignedTo: NOT_AN_ID }).success).toBe(false);
  });
});

describe("trackingUpdateSchema", () => {
  it("accepts an empty update", () => {
    expect(trackingUpdateSchema.safeParse({}).success).toBe(true);
  });

  it("accepts a status change on its own", () => {
    expect(trackingUpdateSchema.safeParse({ status: "done" }).success).toBe(true);
  });

  it("accepts unassigning", () => {
    expect(trackingUpdateSchema.safeParse({ assignedTo: null }).success).toBe(true);
  });

  it("accepts clearing the note", () => {
    expect(trackingUpdateSchema.safeParse({ note: null }).success).toBe(true);
  });

  it("rejects an unknown status", () => {
    expect(trackingUpdateSchema.safeParse({ status: "archived" }).success).toBe(false);
  });

  // The row's target and dossier are immutable: retargeting tracking would rewrite history.
  it("exposes only status, note and assignee", () => {
    expect(Object.keys(trackingUpdateSchema.shape).sort()).toEqual([
      "assignedTo",
      "note",
      "status",
    ]);
  });
});
