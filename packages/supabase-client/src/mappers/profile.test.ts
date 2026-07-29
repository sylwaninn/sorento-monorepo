import { describe, expect, it } from "vitest";
import { mapProfileRow } from "#client/mappers/profile";
import { timestamp, uuid } from "#client/mappers/test-fixtures";
import type { Database } from "#client/database.types";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

const row: ProfileRow = {
  id: uuid(1),
  first_name: "Camille",
  role: "user",
  created_at: timestamp(1),
  updated_at: timestamp(2),
};

describe("mapProfileRow", () => {
  it("maps every column to its own field", () => {
    expect(mapProfileRow(row)).toEqual({
      id: uuid(1),
      firstName: "Camille",
      role: "user",
      createdAt: timestamp(1),
      updatedAt: timestamp(2),
    });
  });

  it("maps the platform admin role", () => {
    expect(mapProfileRow({ ...row, role: "admin" }).role).toBe("admin");
  });

  // A third role would reach the UI as an unhandled branch, so it stops here.
  it("rejects a role outside user and admin", () => {
    expect(() => mapProfileRow({ ...row, role: "superadmin" })).toThrow();
  });

  it("rejects an empty first name", () => {
    expect(() => mapProfileRow({ ...row, first_name: "" })).toThrow();
  });
});
