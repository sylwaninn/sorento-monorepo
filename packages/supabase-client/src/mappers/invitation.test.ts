import { describe, expect, it } from "vitest";
import { mapInvitationRow } from "#client/mappers/invitation";
import { timestamp, uuid } from "#client/mappers/test-fixtures";
import type { Database } from "#client/database.types";

type InvitationRow = Database["public"]["Tables"]["invitations"]["Row"];

const row: InvitationRow = {
  id: uuid(1),
  dossier_id: uuid(2),
  email: "proche@example.test",
  role: "collaborator",
  message: "Je t'ajoute au dossier.",
  invited_by: uuid(3),
  expires_at: timestamp(4),
  used_at: null,
  revoked_at: null,
  created_at: timestamp(1),
  token_hash: "a".repeat(64),
  updated_at: timestamp(2),
};

describe("mapInvitationRow", () => {
  it("maps every column to its own field", () => {
    expect(mapInvitationRow(row)).toEqual({
      id: uuid(1),
      dossierId: uuid(2),
      email: "proche@example.test",
      role: "collaborator",
      message: "Je t'ajoute au dossier.",
      invitedBy: uuid(3),
      expiresAt: timestamp(4),
      usedAt: null,
      revokedAt: null,
      createdAt: timestamp(1),
    });
  });

  // The hash is what makes a token unguessable from the row; a client that can read it can
  // accept the invitation it was never sent, so it must not survive the mapping.
  it("never exposes the token hash", () => {
    expect(mapInvitationRow(row)).not.toHaveProperty("tokenHash");
    expect(JSON.stringify(mapInvitationRow(row))).not.toContain("a".repeat(64));
  });

  it("accepts the two invitable roles", () => {
    for (const role of ["collaborator", "viewer"]) {
      expect(mapInvitationRow({ ...row, role }).role).toBe(role);
    }
  });

  // Ownership is transferred, never invited: an invitation carrying owner would hand the
  // dossier away through a link.
  it("rejects an invitation to owner", () => {
    expect(() => mapInvitationRow({ ...row, role: "owner" })).toThrow();
  });

  it("rejects an address that is not an email", () => {
    expect(() => mapInvitationRow({ ...row, email: "proche" })).toThrow();
  });

  it("carries the instants that spend an invitation", () => {
    const spent = mapInvitationRow({ ...row, used_at: timestamp(5), revoked_at: timestamp(6) });

    expect(spent.usedAt).toBe(timestamp(5));
    expect(spent.revokedAt).toBe(timestamp(6));
  });
});
