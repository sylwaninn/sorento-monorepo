import { describe, expect, it } from "vitest";
import {
  createInvitationInputSchema,
  createInvitationResultSchema,
  invitationSchema,
  resolveInvitationResultSchema,
} from "#domain/invitation";
import { DATE_TIME, EMAIL, ID, NOT_AN_ID, OTHER_ID } from "#domain/test-fixtures";

const VALID = {
  id: ID,
  dossierId: OTHER_ID,
  email: EMAIL,
  role: "collaborator",
  message: "Rejoins-nous.",
  invitedBy: ID,
  expiresAt: DATE_TIME,
  usedAt: null,
  revokedAt: null,
  createdAt: DATE_TIME,
};

describe("invitationSchema", () => {
  it("accepts a pending invitation", () => {
    expect(invitationSchema.safeParse(VALID).success).toBe(true);
  });

  it.each(["id", "dossierId", "email", "role", "invitedBy", "expiresAt", "createdAt"])(
    "requires %s",
    (field) => {
      const { [field]: _removed, ...withoutField } = VALID as Record<string, unknown>;
      expect(invitationSchema.safeParse(withoutField).success).toBe(false);
    },
  );

  it("accepts an invitation with no personal message", () => {
    expect(invitationSchema.safeParse({ ...VALID, message: null }).success).toBe(true);
  });

  it("accepts a used invitation", () => {
    expect(invitationSchema.safeParse({ ...VALID, usedAt: DATE_TIME }).success).toBe(true);
  });

  it("accepts a revoked invitation", () => {
    expect(invitationSchema.safeParse({ ...VALID, revokedAt: DATE_TIME }).success).toBe(true);
  });

  it("rejects a malformed email", () => {
    expect(invitationSchema.safeParse({ ...VALID, email: "pas-un-email" }).success).toBe(false);
  });

  it("refuses to invite straight to owner", () => {
    expect(invitationSchema.safeParse({ ...VALID, role: "owner" }).success).toBe(false);
  });

  // The token hash never leaves the database; the client type must not carry it.
  it("carries no token hash", () => {
    expect(Object.keys(invitationSchema.shape)).not.toContain("tokenHash");
  });

  it("requires an inviter: an invitation always has an author", () => {
    expect(invitationSchema.safeParse({ ...VALID, invitedBy: null }).success).toBe(false);
  });
});

describe("createInvitationInputSchema", () => {
  const INPUT = { dossierId: OTHER_ID, email: EMAIL, role: "viewer" };

  it("accepts a minimal invitation", () => {
    expect(createInvitationInputSchema.safeParse(INPUT).success).toBe(true);
  });

  it("accepts an optional message", () => {
    expect(createInvitationInputSchema.safeParse({ ...INPUT, message: "Bonjour" }).success).toBe(
      true,
    );
  });

  it("accepts a message exactly at the 500-character limit", () => {
    expect(
      createInvitationInputSchema.safeParse({ ...INPUT, message: "x".repeat(500) }).success,
    ).toBe(true);
  });

  it("rejects a message one character over the limit", () => {
    expect(
      createInvitationInputSchema.safeParse({ ...INPUT, message: "x".repeat(501) }).success,
    ).toBe(false);
  });

  it.each(["dossierId", "email", "role"])("requires %s", (field) => {
    const { [field]: _removed, ...withoutField } = INPUT as Record<string, unknown>;
    expect(createInvitationInputSchema.safeParse(withoutField).success).toBe(false);
  });

  it("rejects a dossier id that is not a uuid", () => {
    expect(createInvitationInputSchema.safeParse({ ...INPUT, dossierId: NOT_AN_ID }).success).toBe(
      false,
    );
  });
});

describe("createInvitationResultSchema", () => {
  it("accepts an id and an accept URL", () => {
    expect(
      createInvitationResultSchema.safeParse({
        invitationId: ID,
        acceptUrl: "https://app.example.com/invitations/accepter?token=abc",
      }).success,
    ).toBe(true);
  });

  it("rejects an accept URL that is not a URL", () => {
    expect(
      createInvitationResultSchema.safeParse({ invitationId: ID, acceptUrl: "/invitations" })
        .success,
    ).toBe(false);
  });

  it("requires the invitation id", () => {
    expect(
      createInvitationResultSchema.safeParse({ acceptUrl: "https://example.com" }).success,
    ).toBe(false);
  });
});

describe("resolveInvitationResultSchema", () => {
  const RESULT = {
    dossierId: OTHER_ID,
    subjectFirstName: "Camille",
    subjectLastName: "Martin",
    role: "viewer",
    invitedByFirstName: "Alex",
  };

  it("accepts what the acceptance screen needs to show", () => {
    expect(resolveInvitationResultSchema.safeParse(RESULT).success).toBe(true);
  });

  it.each(["dossierId", "subjectFirstName", "subjectLastName", "role", "invitedByFirstName"])(
    "requires %s",
    (field) => {
      const { [field]: _removed, ...withoutField } = RESULT as Record<string, unknown>;
      expect(resolveInvitationResultSchema.safeParse(withoutField).success).toBe(false);
    },
  );

  it("rejects a role outside the invitable ones", () => {
    expect(resolveInvitationResultSchema.safeParse({ ...RESULT, role: "owner" }).success).toBe(
      false,
    );
  });
});
