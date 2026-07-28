import { describe, expect, it } from "vitest";
import { profileSchema, profileUpdateSchema } from "#domain/profile";
import { DATE_TIME, ID, NOT_AN_ID } from "#domain/test-fixtures";

const VALID = {
  id: ID,
  firstName: "Camille",
  role: "user",
  createdAt: DATE_TIME,
  updatedAt: DATE_TIME,
};

describe("profileSchema", () => {
  it("accepts a complete profile", () => {
    expect(profileSchema.safeParse(VALID).success).toBe(true);
  });

  it.each(["id", "firstName", "role", "createdAt", "updatedAt"])("requires %s", (field) => {
    const { [field]: _removed, ...withoutField } = VALID as Record<string, unknown>;
    expect(profileSchema.safeParse(withoutField).success).toBe(false);
  });

  it("rejects an id that is not a uuid", () => {
    expect(profileSchema.safeParse({ ...VALID, id: NOT_AN_ID }).success).toBe(false);
  });

  it("rejects an empty first name", () => {
    expect(profileSchema.safeParse({ ...VALID, firstName: "" }).success).toBe(false);
  });

  it("accepts exactly the two platform roles", () => {
    expect(profileSchema.shape.role.options).toEqual(["user", "admin"]);
  });

  it("rejects a role outside those two", () => {
    expect(profileSchema.safeParse({ ...VALID, role: "superadmin" }).success).toBe(false);
  });

  it("rejects a timestamp with no timezone", () => {
    expect(profileSchema.safeParse({ ...VALID, createdAt: "2026-01-15" }).success).toBe(false);
  });
});

describe("profileUpdateSchema", () => {
  it("accepts a first name on its own", () => {
    expect(profileUpdateSchema.safeParse({ firstName: "Camille" }).success).toBe(true);
  });

  it("accepts an empty update: every field is optional", () => {
    expect(profileUpdateSchema.safeParse({}).success).toBe(true);
  });

  it("still refuses an empty first name when one is given", () => {
    expect(profileUpdateSchema.safeParse({ firstName: "" }).success).toBe(false);
  });

  it("exposes only the first name: role and timestamps are not user-editable", () => {
    expect(Object.keys(profileUpdateSchema.shape)).toEqual(["firstName"]);
  });
});
