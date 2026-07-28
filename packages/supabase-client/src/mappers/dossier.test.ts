import { describe, expect, it } from "vitest";
import { mapDossierRow } from "#client/mappers/dossier";
import { day, timestamp, uuid } from "#client/mappers/test-fixtures";
import type { Database } from "#client/database.types";

type DossierRow = Database["public"]["Tables"]["dossiers"]["Row"];

const row: DossierRow = {
  id: uuid(1),
  status: "ACTIVE",
  created_by: uuid(2),
  subject_first_name: "Jean",
  subject_last_name: "Martin",
  death_date: day(1),
  pending_activation_death_date: day(2),
  pending_activation_effective_at: timestamp(1),
  pending_activation_opposed_at: timestamp(2),
  created_at: timestamp(3),
  updated_at: timestamp(4),
  deleted_at: timestamp(5),
  activation_frozen_at: null,
  activation_frozen_reason: null,
  pending_activation_document_path: null,
  pending_activation_opposed_by: null,
  pending_activation_requested_at: null,
  pending_activation_requested_by: null,
};

describe("mapDossierRow", () => {
  it("maps every column to its own field", () => {
    expect(mapDossierRow(row)).toEqual({
      id: uuid(1),
      status: "ACTIVE",
      createdBy: uuid(2),
      subjectFirstName: "Jean",
      subjectLastName: "Martin",
      deathDate: day(1),
      pendingActivationDeathDate: day(2),
      pendingActivationEffectiveAt: timestamp(1),
      pendingActivationOpposedAt: timestamp(2),
      createdAt: timestamp(3),
      updatedAt: timestamp(4),
      deletedAt: timestamp(5),
    });
  });

  it("keeps every nullable column nullable", () => {
    const emptied = mapDossierRow({
      ...row,
      created_by: null,
      death_date: null,
      pending_activation_death_date: null,
      pending_activation_effective_at: null,
      pending_activation_opposed_at: null,
      deleted_at: null,
    });

    expect(emptied.createdBy).toBeNull();
    expect(emptied.deathDate).toBeNull();
    expect(emptied.pendingActivationDeathDate).toBeNull();
    expect(emptied.pendingActivationEffectiveAt).toBeNull();
    expect(emptied.pendingActivationOpposedAt).toBeNull();
    expect(emptied.deletedAt).toBeNull();
  });

  // The mapper is the last place a malformed row can be stopped before it reaches a screen,
  // so it must parse rather than cast: a status the enum does not know has to throw here.
  it("rejects a status outside the enum", () => {
    expect(() => mapDossierRow({ ...row, status: "ARCHIVED" })).toThrow();
  });

  it("rejects a death date that is not a calendar day", () => {
    expect(() => mapDossierRow({ ...row, death_date: timestamp(1) })).toThrow();
  });
});
