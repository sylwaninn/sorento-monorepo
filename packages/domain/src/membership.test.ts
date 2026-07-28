import { describe, expect, it } from "vitest";
import { invitableRoleSchema, membershipSchema } from "#domain/membership";
import { DATE_TIME, ID, NOT_AN_ID, OTHER_ID } from "#domain/test-fixtures";

const VALID = {
  id: ID,
  dossierId: OTHER_ID,
  userId: ID,
  role: "collaborator",
  invitedBy: OTHER_ID,
  createdAt: DATE_TIME,
  updatedAt: DATE_TIME,
};

describe("membershipSchema", () => {
  it("accepts a complete membership", () => {
    expect(membershipSchema.safeParse(VALID).success).toBe(true);
  });

  it.each(["id", "dossierId", "userId", "role", "createdAt", "updatedAt"])(
    "requires %s",
    (field) => {
      const { [field]: _removed, ...withoutField } = VALID as Record<string, unknown>;
      expect(membershipSchema.safeParse(withoutField).success).toBe(false);
    },
  );

  it("accepts a self-created membership with no inviter", () => {
    expect(membershipSchema.safeParse({ ...VALID, invitedBy: null }).success).toBe(true);
  });

  it("rejects a missing inviter field: absent and null are not the same thing", () => {
    const { invitedBy: _removed, ...withoutInviter } = VALID;
    expect(membershipSchema.safeParse(withoutInviter).success).toBe(false);
  });

  it("rejects a dossier id that is not a uuid", () => {
    expect(membershipSchema.safeParse({ ...VALID, dossierId: NOT_AN_ID }).success).toBe(false);
  });

  it("accepts the trusted contact role", () => {
    expect(membershipSchema.safeParse({ ...VALID, role: "trusted_contact" }).success).toBe(true);
  });

  it("rejects a role the memberships constraint would refuse", () => {
    expect(membershipSchema.safeParse({ ...VALID, role: "admin" }).success).toBe(false);
  });
});

describe("invitableRoleSchema", () => {
  // Narrower than dossierRoleSchema on purpose: an invitation can never hand over ownership,
  // and a trusted contact is designated through its own flow, not invited.
  it("accepts exactly collaborator and viewer", () => {
    expect(invitableRoleSchema.options).toEqual(["collaborator", "viewer"]);
  });

  it("refuses to invite someone straight to owner", () => {
    expect(invitableRoleSchema.safeParse("owner").success).toBe(false);
  });

  it("refuses to invite a trusted contact: that has its own consent flow", () => {
    expect(invitableRoleSchema.safeParse("trusted_contact").success).toBe(false);
  });
});
