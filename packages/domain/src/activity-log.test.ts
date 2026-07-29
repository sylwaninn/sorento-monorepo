import { describe, expect, it } from "vitest";
import {
  activityLogEntrySchema,
  catalogHistoryActionSchema,
  catalogHistorySchema,
  catalogTableSchema,
} from "#domain/activity-log";
import { DATE_TIME, ID, NOT_AN_ID, OTHER_ID } from "#domain/test-fixtures";

const ENTRY = {
  id: ID,
  dossierId: OTHER_ID,
  actorId: ID,
  actionType: "status_changed",
  targetId: OTHER_ID,
  details: { from: "todo", to: "done" },
  createdAt: DATE_TIME,
};

describe("activityLogEntrySchema", () => {
  it("accepts a complete entry", () => {
    expect(activityLogEntrySchema.safeParse(ENTRY).success).toBe(true);
  });

  it.each(["id", "dossierId", "actionType", "details", "createdAt"])("requires %s", (field) => {
    const { [field]: _removed, ...withoutField } = ENTRY as Record<string, unknown>;
    expect(activityLogEntrySchema.safeParse(withoutField).success).toBe(false);
  });

  // Entries written by a cron job or a trigger outside any session have no actor.
  it("accepts an entry with no actor", () => {
    expect(activityLogEntrySchema.safeParse({ ...ENTRY, actorId: null }).success).toBe(true);
  });

  it("accepts an entry pointing at nothing in particular", () => {
    expect(activityLogEntrySchema.safeParse({ ...ENTRY, targetId: null }).success).toBe(true);
  });

  it("accepts an entry with no details", () => {
    expect(activityLogEntrySchema.safeParse({ ...ENTRY, details: {} }).success).toBe(true);
  });

  it("rejects details given as a bare string", () => {
    expect(activityLogEntrySchema.safeParse({ ...ENTRY, details: "changed" }).success).toBe(false);
  });

  it("rejects an action type nothing writes", () => {
    expect(activityLogEntrySchema.safeParse({ ...ENTRY, actionType: "exported" }).success).toBe(
      false,
    );
  });

  it("rejects an actor id that is not a uuid", () => {
    expect(activityLogEntrySchema.safeParse({ ...ENTRY, actorId: NOT_AN_ID }).success).toBe(false);
  });
});

describe("catalogHistorySchema", () => {
  const HISTORY = {
    id: ID,
    catalogTable: "procedures",
    rowId: OTHER_ID,
    action: "updated",
    oldContent: { title: "Avant" },
    newContent: { title: "Après" },
    modifiedBy: ID,
    createdAt: DATE_TIME,
  };

  it("accepts a complete history row", () => {
    expect(catalogHistorySchema.safeParse(HISTORY).success).toBe(true);
  });

  it("accepts a creation, which has no previous content", () => {
    expect(
      catalogHistorySchema.safeParse({ ...HISTORY, action: "created", oldContent: null }).success,
    ).toBe(true);
  });

  it("accepts a deletion, which has no new content", () => {
    expect(
      catalogHistorySchema.safeParse({ ...HISTORY, action: "deleted", newContent: null }).success,
    ).toBe(true);
  });

  // Null means a seed or system change made outside any authenticated session.
  it("accepts a change made by no one", () => {
    expect(catalogHistorySchema.safeParse({ ...HISTORY, modifiedBy: null }).success).toBe(true);
  });

  it.each(["id", "catalogTable", "rowId", "action", "createdAt"])("requires %s", (field) => {
    const { [field]: _removed, ...withoutField } = HISTORY as Record<string, unknown>;
    expect(catalogHistorySchema.safeParse(withoutField).success).toBe(false);
  });
});

describe("catalogTableSchema", () => {
  it("covers exactly the four versioned catalog tables", () => {
    expect(catalogTableSchema.options).toEqual([
      "procedures",
      "benefits",
      "conditions",
      "letter_templates",
    ]);
  });

  it("rejects a table outside the catalog", () => {
    expect(catalogTableSchema.safeParse("dossiers").success).toBe(false);
  });
});

describe("catalogHistoryActionSchema", () => {
  it("covers exactly created, updated and deleted", () => {
    expect(catalogHistoryActionSchema.options).toEqual(["created", "updated", "deleted"]);
  });

  it("rejects an action the trigger never records", () => {
    expect(catalogHistoryActionSchema.safeParse("restored").success).toBe(false);
  });
});
