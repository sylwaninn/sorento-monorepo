import { describe, expect, it } from "vitest";
import {
  designateTrustedContactInputSchema,
  resolveTrustedContactActivationResultSchema,
  trustedContactDesignationSchema,
} from "#domain/trusted-contact";
import { DATE_TIME, EMAIL, ID, NOT_AN_ID, OTHER_ID } from "#domain/test-fixtures";

const VALID = {
  id: ID,
  dossierId: OTHER_ID,
  email: EMAIL,
  futureRole: "collaborator",
  consentedAt: null,
  activationExpiresAt: null,
  revokedAt: null,
  createdAt: DATE_TIME,
};

describe("trustedContactDesignationSchema", () => {
  it("accepts a designation awaiting consent", () => {
    expect(trustedContactDesignationSchema.safeParse(VALID).success).toBe(true);
  });

  it("accepts a designation once consent is given and the link issued", () => {
    expect(
      trustedContactDesignationSchema.safeParse({
        ...VALID,
        consentedAt: DATE_TIME,
        activationExpiresAt: DATE_TIME,
      }).success,
    ).toBe(true);
  });

  it("accepts a revoked designation", () => {
    expect(
      trustedContactDesignationSchema.safeParse({ ...VALID, revokedAt: DATE_TIME }).success,
    ).toBe(true);
  });

  it.each(["id", "dossierId", "email", "futureRole", "createdAt"])("requires %s", (field) => {
    const { [field]: _removed, ...withoutField } = VALID as Record<string, unknown>;
    expect(trustedContactDesignationSchema.safeParse(withoutField).success).toBe(false);
  });

  it("rejects a malformed email", () => {
    expect(trustedContactDesignationSchema.safeParse({ ...VALID, email: "nope" }).success).toBe(
      false,
    );
  });

  it("rejects a dossier id that is not a uuid", () => {
    expect(
      trustedContactDesignationSchema.safeParse({ ...VALID, dossierId: NOT_AN_ID }).success,
    ).toBe(false);
  });

  // Both token hashes stay server-side: the client never sees a credential it could replay.
  it("carries neither token hash", () => {
    const fields = Object.keys(trustedContactDesignationSchema.shape);
    expect(fields).not.toContain("consentTokenHash");
    expect(fields).not.toContain("activationTokenHash");
  });
});

describe("the future role a trusted contact is promoted to", () => {
  // Promotion happens on activation. viewer is excluded: a trusted contact who has just
  // reported a death needs to act, and trusted_contact would leave them seeing nothing.
  it("accepts owner", () => {
    expect(
      trustedContactDesignationSchema.safeParse({ ...VALID, futureRole: "owner" }).success,
    ).toBe(true);
  });

  it("accepts collaborator", () => {
    expect(
      trustedContactDesignationSchema.safeParse({ ...VALID, futureRole: "collaborator" }).success,
    ).toBe(true);
  });

  it("rejects viewer", () => {
    expect(
      trustedContactDesignationSchema.safeParse({ ...VALID, futureRole: "viewer" }).success,
    ).toBe(false);
  });

  it("rejects trusted_contact, which is the role being left behind", () => {
    expect(
      trustedContactDesignationSchema.safeParse({ ...VALID, futureRole: "trusted_contact" })
        .success,
    ).toBe(false);
  });
});

describe("designateTrustedContactInputSchema", () => {
  const INPUT = { dossierId: OTHER_ID, email: EMAIL, futureRole: "owner" };

  it("accepts a designation payload", () => {
    expect(designateTrustedContactInputSchema.safeParse(INPUT).success).toBe(true);
  });

  it.each(["dossierId", "email", "futureRole"])("requires %s", (field) => {
    const { [field]: _removed, ...withoutField } = INPUT as Record<string, unknown>;
    expect(designateTrustedContactInputSchema.safeParse(withoutField).success).toBe(false);
  });

  it("rejects a malformed email", () => {
    expect(designateTrustedContactInputSchema.safeParse({ ...INPUT, email: "nope" }).success).toBe(
      false,
    );
  });
});

describe("resolveTrustedContactActivationResultSchema", () => {
  const RESULT = {
    dossierId: OTHER_ID,
    subjectFirstName: "Camille",
    subjectLastName: "Martin",
    hasPendingActivation: false,
  };

  it("accepts what the activation screen needs to show", () => {
    expect(resolveTrustedContactActivationResultSchema.safeParse(RESULT).success).toBe(true);
  });

  it.each(["dossierId", "subjectFirstName", "subjectLastName", "hasPendingActivation"])(
    "requires %s",
    (field) => {
      const { [field]: _removed, ...withoutField } = RESULT as Record<string, unknown>;
      expect(resolveTrustedContactActivationResultSchema.safeParse(withoutField).success).toBe(
        false,
      );
    },
  );

  it("rejects a pending flag given as a string", () => {
    expect(
      resolveTrustedContactActivationResultSchema.safeParse({
        ...RESULT,
        hasPendingActivation: "false",
      }).success,
    ).toBe(false);
  });
});
