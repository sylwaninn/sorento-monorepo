import { describe, expect, it } from "vitest";
import { mapMembershipRow } from "#client/mappers/membership";
import { timestamp, uuid } from "#client/mappers/test-fixtures";
import type { Database } from "#client/database.types";

type MembershipRow = Database["public"]["Tables"]["memberships"]["Row"];

const row: MembershipRow = {
  id: uuid(1),
  dossier_id: uuid(2),
  user_id: uuid(3),
  role: "collaborator",
  invited_by: uuid(4),
  created_at: timestamp(1),
  updated_at: timestamp(2),
};

describe("mapMembershipRow", () => {
  it("maps every column to its own field", () => {
    expect(mapMembershipRow(row)).toEqual({
      id: uuid(1),
      dossierId: uuid(2),
      userId: uuid(3),
      role: "collaborator",
      invitedBy: uuid(4),
      createdAt: timestamp(1),
      updatedAt: timestamp(2),
    });
  });

  it("accepts the four roles the memberships constraint allows", () => {
    for (const role of ["owner", "collaborator", "viewer", "trusted_contact"]) {
      expect(mapMembershipRow({ ...row, role }).role).toBe(role);
    }
  });

  it("rejects a role the constraint would refuse", () => {
    expect(() => mapMembershipRow({ ...row, role: "admin" })).toThrow();
  });

  it("accepts an owner nobody invited", () => {
    expect(mapMembershipRow({ ...row, invited_by: null }).invitedBy).toBeNull();
  });
});
