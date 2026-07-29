import { describe, expect, it } from "vitest";
import { mapTrackingRow } from "#client/mappers/tracking";
import { day, timestamp, uuid } from "#client/mappers/test-fixtures";
import type { Database } from "#client/database.types";

type TrackingRow = Database["public"]["Tables"]["tracking"]["Row"];

const row: TrackingRow = {
  id: uuid(1),
  dossier_id: uuid(2),
  procedure_id: uuid(3),
  benefit_id: uuid(4),
  status: "in_progress",
  assigned_to: uuid(5),
  note: "Rendez-vous pris",
  due_date: day(1),
  created_at: timestamp(1),
  updated_at: timestamp(2),
};

describe("mapTrackingRow", () => {
  it("maps every column to its own field", () => {
    expect(mapTrackingRow(row)).toEqual({
      id: uuid(1),
      dossierId: uuid(2),
      procedureId: uuid(3),
      benefitId: uuid(4),
      status: "in_progress",
      assignedTo: uuid(5),
      note: "Rendez-vous pris",
      dueDate: day(1),
      createdAt: timestamp(1),
      updatedAt: timestamp(2),
    });
  });

  // Removing a member reverts their items to unassigned rather than orphaning the reference,
  // so a null assignee is a normal row, not an error.
  it("accepts an unassigned item", () => {
    expect(mapTrackingRow({ ...row, assigned_to: null }).assignedTo).toBeNull();
  });

  it("rejects a status outside the enum", () => {
    expect(() => mapTrackingRow({ ...row, status: "archived" })).toThrow();
  });
});
