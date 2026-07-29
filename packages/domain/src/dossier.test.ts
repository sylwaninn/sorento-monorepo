import { describe, expect, it } from "vitest";
import { dossierCreationSchema, dossierInfoUpdateSchema, dossierSchema } from "#domain/dossier";
import { DATE, DATE_TIME, ID, NOT_AN_ID, OTHER_ID } from "#domain/test-fixtures";

const VALID = {
  id: ID,
  status: "PREPARATION",
  createdBy: OTHER_ID,
  subjectFirstName: "Camille",
  subjectLastName: "Martin",
  deathDate: null,
  pendingActivationDeathDate: null,
  pendingActivationEffectiveAt: null,
  pendingActivationOpposedAt: null,
  createdAt: DATE_TIME,
  updatedAt: DATE_TIME,
  deletedAt: null,
};

describe("dossierSchema", () => {
  it("accepts a dossier in preparation", () => {
    expect(dossierSchema.safeParse(VALID).success).toBe(true);
  });

  it("accepts an active dossier with a death date", () => {
    expect(dossierSchema.safeParse({ ...VALID, status: "ACTIVE", deathDate: DATE }).success).toBe(
      true,
    );
  });

  it.each(["id", "status", "subjectFirstName", "subjectLastName", "createdAt", "updatedAt"])(
    "requires %s",
    (field) => {
      const { [field]: _removed, ...withoutField } = VALID as Record<string, unknown>;
      expect(dossierSchema.safeParse(withoutField).success).toBe(false);
    },
  );

  it.each(["subjectFirstName", "subjectLastName"])("rejects an empty %s", (field) => {
    expect(dossierSchema.safeParse({ ...VALID, [field]: "" }).success).toBe(false);
  });

  it("rejects the French spelling of the active state", () => {
    expect(dossierSchema.safeParse({ ...VALID, status: "ACTIF" }).success).toBe(false);
  });

  it("keeps a dossier whose creator has deleted their account", () => {
    expect(dossierSchema.safeParse({ ...VALID, createdBy: null }).success).toBe(true);
  });

  it("rejects a death date carrying a time", () => {
    expect(dossierSchema.safeParse({ ...VALID, deathDate: DATE_TIME }).success).toBe(false);
  });

  it("accepts a pending activation awaiting the end of the grace period", () => {
    expect(
      dossierSchema.safeParse({
        ...VALID,
        pendingActivationDeathDate: DATE,
        pendingActivationEffectiveAt: DATE_TIME,
      }).success,
    ).toBe(true);
  });

  it("accepts an activation a member has opposed", () => {
    expect(
      dossierSchema.safeParse({ ...VALID, pendingActivationOpposedAt: DATE_TIME }).success,
    ).toBe(true);
  });

  it("accepts a dossier in the bin", () => {
    expect(dossierSchema.safeParse({ ...VALID, deletedAt: DATE_TIME }).success).toBe(true);
  });

  it("rejects an id that is not a uuid", () => {
    expect(dossierSchema.safeParse({ ...VALID, id: NOT_AN_ID }).success).toBe(false);
  });
});

describe("dossierCreationSchema", () => {
  const CREATION = { subjectFirstName: "Camille", subjectLastName: "Martin" };

  it("defaults a new dossier to preparation, never straight to active", () => {
    const result = dossierCreationSchema.safeParse(CREATION);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("PREPARATION");
    }
  });

  it("allows creating an already-active dossier, as the diagnostic does after a death", () => {
    const result = dossierCreationSchema.safeParse({ ...CREATION, status: "ACTIVE" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("ACTIVE");
    }
  });

  it.each(["subjectFirstName", "subjectLastName"])("requires %s", (field) => {
    const { [field]: _removed, ...withoutField } = CREATION as Record<string, unknown>;
    expect(dossierCreationSchema.safeParse(withoutField).success).toBe(false);
  });

  it("rejects an empty subject name", () => {
    expect(dossierCreationSchema.safeParse({ ...CREATION, subjectFirstName: "" }).success).toBe(
      false,
    );
  });
});

describe("dossierInfoUpdateSchema", () => {
  it("accepts an empty update", () => {
    expect(dossierInfoUpdateSchema.safeParse({}).success).toBe(true);
  });

  it("accepts correcting a single name", () => {
    expect(dossierInfoUpdateSchema.safeParse({ subjectFirstName: "Camille" }).success).toBe(true);
  });

  it.each(["subjectFirstName", "subjectLastName"])("rejects blanking %s", (field) => {
    expect(dossierInfoUpdateSchema.safeParse({ [field]: "" }).success).toBe(false);
  });

  it("accepts setting the death date", () => {
    expect(dossierInfoUpdateSchema.safeParse({ deathDate: DATE }).success).toBe(true);
  });

  it("rejects a death date carrying a time", () => {
    expect(dossierInfoUpdateSchema.safeParse({ deathDate: DATE_TIME }).success).toBe(false);
  });

  // Status changes go through activation, which has its own grace period and notifications.
  it("exposes no status field", () => {
    expect(Object.keys(dossierInfoUpdateSchema.shape).sort()).toEqual([
      "deathDate",
      "subjectFirstName",
      "subjectLastName",
    ]);
  });
});
