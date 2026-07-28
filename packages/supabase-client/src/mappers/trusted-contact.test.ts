import { describe, expect, it } from "vitest";
import { mapTrustedContactDesignationRow } from "#client/mappers/trusted-contact";
import { timestamp, uuid } from "#client/mappers/test-fixtures";
import type { Database } from "#client/database.types";

type TrustedContactDesignationRow =
  Database["public"]["Tables"]["trusted_contact_designations"]["Row"];

const row: TrustedContactDesignationRow = {
  id: uuid(1),
  dossier_id: uuid(2),
  email: "confiance@example.test",
  future_role: "owner",
  consented_at: timestamp(1),
  activation_expires_at: timestamp(2),
  revoked_at: null,
  created_at: timestamp(3),
  activation_token_hash: "b".repeat(64),
  consent_token_hash: "c".repeat(64),
  consent_expires_at: timestamp(4),
  consented_by: uuid(3),
  invited_by: uuid(4),
  updated_at: timestamp(5),
};

describe("mapTrustedContactDesignationRow", () => {
  it("maps every column to its own field", () => {
    expect(mapTrustedContactDesignationRow(row)).toEqual({
      id: uuid(1),
      dossierId: uuid(2),
      email: "confiance@example.test",
      futureRole: "owner",
      consentedAt: timestamp(1),
      activationExpiresAt: timestamp(2),
      revokedAt: null,
      createdAt: timestamp(3),
    });
  });

  // Either hash in the hands of a client is an activation anyone holding the row can trigger.
  it("never exposes either token hash", () => {
    const serialised = JSON.stringify(mapTrustedContactDesignationRow(row));

    expect(serialised).not.toContain("b".repeat(64));
    expect(serialised).not.toContain("c".repeat(64));
  });

  it("accepts the two roles a trusted contact can inherit", () => {
    for (const futureRole of ["owner", "collaborator"]) {
      expect(mapTrustedContactDesignationRow({ ...row, future_role: futureRole }).futureRole).toBe(
        futureRole,
      );
    }
  });

  it("rejects a future role outside owner and collaborator", () => {
    expect(() => mapTrustedContactDesignationRow({ ...row, future_role: "viewer" })).toThrow();
  });

  // Before consent the designation exists with nothing granted yet, which is the state the
  // trusted contact is in while the dossier is still in PREPARATION.
  it("accepts a designation nobody has consented to yet", () => {
    const pending = mapTrustedContactDesignationRow({
      ...row,
      consented_at: null,
      activation_expires_at: null,
    });

    expect(pending.consentedAt).toBeNull();
    expect(pending.activationExpiresAt).toBeNull();
  });
});
