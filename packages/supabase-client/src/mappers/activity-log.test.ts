import { describe, expect, it } from "vitest";
import { mapActivityLogRow, mapCatalogHistoryRow } from "#client/mappers/activity-log";
import { timestamp, uuid } from "#client/mappers/test-fixtures";
import type { Database } from "#client/database.types";

type ActivityLogRow = Database["public"]["Tables"]["activity_log"]["Row"];
type CatalogHistoryRow = Database["public"]["Tables"]["catalog_history"]["Row"];

const activityRow: ActivityLogRow = {
  id: uuid(1),
  dossier_id: uuid(2),
  actor_id: uuid(3),
  action_type: "member_removed",
  target_id: uuid(4),
  details: { previousRole: "collaborator" },
  created_at: timestamp(1),
};

const historyRow: CatalogHistoryRow = {
  id: uuid(1),
  catalog_table: "procedures",
  row_id: uuid(2),
  action: "updated",
  old_content: { title: "Ancien" },
  new_content: { title: "Nouveau" },
  modified_by: uuid(3),
  created_at: timestamp(1),
};

describe("mapActivityLogRow", () => {
  it("maps every column to its own field", () => {
    expect(mapActivityLogRow(activityRow)).toEqual({
      id: uuid(1),
      dossierId: uuid(2),
      actorId: uuid(3),
      actionType: "member_removed",
      targetId: uuid(4),
      details: { previousRole: "collaborator" },
      createdAt: timestamp(1),
    });
  });

  // Removing a member is logged, so the type has to be one the enum knows: an action the
  // schema refuses would be dropped by the reader rather than shown in the dossier history.
  it("rejects an action type outside the enum", () => {
    expect(() => mapActivityLogRow({ ...activityRow, action_type: "member_shouted" })).toThrow();
  });

  it("accepts an entry with no actor and no target", () => {
    const systemEntry = mapActivityLogRow({ ...activityRow, actor_id: null, target_id: null });

    expect(systemEntry.actorId).toBeNull();
    expect(systemEntry.targetId).toBeNull();
  });
});

describe("mapCatalogHistoryRow", () => {
  it("maps every column to its own field", () => {
    expect(mapCatalogHistoryRow(historyRow)).toEqual({
      id: uuid(1),
      catalogTable: "procedures",
      rowId: uuid(2),
      action: "updated",
      oldContent: { title: "Ancien" },
      newContent: { title: "Nouveau" },
      modifiedBy: uuid(3),
      createdAt: timestamp(1),
    });
  });

  it("accepts a seed change made outside any session", () => {
    expect(mapCatalogHistoryRow({ ...historyRow, modified_by: null }).modifiedBy).toBeNull();
  });

  it("rejects a table outside the four catalog tables", () => {
    expect(() => mapCatalogHistoryRow({ ...historyRow, catalog_table: "dossiers" })).toThrow();
  });
});
