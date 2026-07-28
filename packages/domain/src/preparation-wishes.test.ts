import { describe, expect, it } from "vitest";
import { preparationWishesInputSchema, preparationWishesSchema } from "#domain/preparation-wishes";
import { DATE_TIME, NOT_AN_ID, OTHER_ID } from "#domain/test-fixtures";

const VALID = {
  dossierId: OTHER_ID,
  funeralWishes: "Crémation.",
  peopleToNotify: "La famille proche.",
  documentLocation: "Tiroir du bureau.",
  updatedAt: DATE_TIME,
};

describe("preparationWishesSchema", () => {
  it("accepts complete wishes", () => {
    expect(preparationWishesSchema.safeParse(VALID).success).toBe(true);
  });

  it.each(["dossierId", "updatedAt"])("requires %s", (field) => {
    const { [field]: _removed, ...withoutField } = VALID as Record<string, unknown>;
    expect(preparationWishesSchema.safeParse(withoutField).success).toBe(false);
  });

  it("rejects a dossier id that is not a uuid", () => {
    expect(preparationWishesSchema.safeParse({ ...VALID, dossierId: NOT_AN_ID }).success).toBe(
      false,
    );
  });

  // Preparation is filled in over time; every field may legitimately still be blank.
  it.each(["funeralWishes", "peopleToNotify", "documentLocation"])(
    "accepts a null %s while preparation is under way",
    (field) => {
      expect(preparationWishesSchema.safeParse({ ...VALID, [field]: null }).success).toBe(true);
    },
  );

  it("still requires each wish field to be present, even as null", () => {
    const { funeralWishes: _removed, ...withoutWishes } = VALID;
    expect(preparationWishesSchema.safeParse(withoutWishes).success).toBe(false);
  });
});

describe("preparationWishesInputSchema", () => {
  it("accepts an empty update: the form saves field by field", () => {
    expect(preparationWishesInputSchema.safeParse({}).success).toBe(true);
  });

  it("accepts a single field on its own", () => {
    expect(preparationWishesInputSchema.safeParse({ funeralWishes: "Crémation." }).success).toBe(
      true,
    );
  });

  it("accepts clearing a field back to null", () => {
    expect(preparationWishesInputSchema.safeParse({ funeralWishes: null }).success).toBe(true);
  });

  it("rejects a wish that is not text", () => {
    expect(preparationWishesInputSchema.safeParse({ funeralWishes: 42 }).success).toBe(false);
  });

  it("carries no dossier id: the target comes from the route, not the payload", () => {
    expect(Object.keys(preparationWishesInputSchema.shape).sort()).toEqual([
      "documentLocation",
      "funeralWishes",
      "peopleToNotify",
    ]);
  });
});
