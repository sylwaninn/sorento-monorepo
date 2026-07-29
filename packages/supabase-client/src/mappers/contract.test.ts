import { describe, expect, it } from "vitest";
import { mapContractRow } from "#client/mappers/contract";
import { timestamp, uuid } from "#client/mappers/test-fixtures";
import type { Database } from "#client/database.types";

type ContractRow = Database["public"]["Tables"]["contracts"]["Row"];

const row: ContractRow = {
  id: uuid(1),
  dossier_id: uuid(2),
  contract_type: "assurance-vie",
  company: "Assureur SA",
  contract_number: "AV-12345",
  known_beneficiaries: "Camille Martin",
  created_at: timestamp(1),
  updated_at: timestamp(2),
};

describe("mapContractRow", () => {
  it("maps every column to its own field", () => {
    expect(mapContractRow(row)).toEqual({
      id: uuid(1),
      dossierId: uuid(2),
      contractType: "assurance-vie",
      company: "Assureur SA",
      contractNumber: "AV-12345",
      knownBeneficiaries: "Camille Martin",
      createdAt: timestamp(1),
      updatedAt: timestamp(2),
    });
  });

  // The point of the screen is to record a contract someone half-remembers, so the number and
  // the beneficiaries are exactly the fields a user is expected not to have.
  it("accepts a contract known only by company and type", () => {
    const partial = mapContractRow({ ...row, contract_number: null, known_beneficiaries: null });

    expect(partial.contractNumber).toBeNull();
    expect(partial.knownBeneficiaries).toBeNull();
  });

  it("rejects a contract with no company", () => {
    expect(() => mapContractRow({ ...row, company: "" })).toThrow();
  });
});
