import { describe, expect, it } from "vitest";
import { contractInputSchema, contractSchema } from "#domain/contract";
import { DATE_TIME, ID, NOT_AN_ID, OTHER_ID } from "#domain/test-fixtures";

const VALID = {
  id: ID,
  dossierId: OTHER_ID,
  contractType: "assurance_vie",
  company: "Assureur",
  contractNumber: "A-123",
  knownBeneficiaries: "Camille",
  createdAt: DATE_TIME,
  updatedAt: DATE_TIME,
};

describe("contractSchema", () => {
  it("accepts a complete contract", () => {
    expect(contractSchema.safeParse(VALID).success).toBe(true);
  });

  it.each(["id", "dossierId", "contractType", "company", "createdAt", "updatedAt"])(
    "requires %s",
    (field) => {
      const { [field]: _removed, ...withoutField } = VALID as Record<string, unknown>;
      expect(contractSchema.safeParse(withoutField).success).toBe(false);
    },
  );

  it.each(["contractType", "company"])("rejects an empty %s", (field) => {
    expect(contractSchema.safeParse({ ...VALID, [field]: "" }).success).toBe(false);
  });

  it("rejects a dossier id that is not a uuid", () => {
    expect(contractSchema.safeParse({ ...VALID, dossierId: NOT_AN_ID }).success).toBe(false);
  });

  // A relative often knows a contract exists long before finding its number.
  it("accepts a contract whose number is still unknown", () => {
    expect(contractSchema.safeParse({ ...VALID, contractNumber: null }).success).toBe(true);
  });

  it("accepts a contract with no known beneficiary", () => {
    expect(contractSchema.safeParse({ ...VALID, knownBeneficiaries: null }).success).toBe(true);
  });
});

describe("contractInputSchema", () => {
  it("accepts the two identifying fields on their own", () => {
    expect(
      contractInputSchema.safeParse({ contractType: "assurance_vie", company: "Assureur" }).success,
    ).toBe(true);
  });

  it("requires the contract type", () => {
    expect(contractInputSchema.safeParse({ company: "Assureur" }).success).toBe(false);
  });

  it("requires the company", () => {
    expect(contractInputSchema.safeParse({ contractType: "assurance_vie" }).success).toBe(false);
  });

  it("rejects an empty company", () => {
    expect(contractInputSchema.safeParse({ contractType: "x", company: "" }).success).toBe(false);
  });

  it("accepts an explicitly unknown contract number", () => {
    expect(
      contractInputSchema.safeParse({ contractType: "x", company: "y", contractNumber: null })
        .success,
    ).toBe(true);
  });
});
