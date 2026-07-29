import { describe, expect, it } from "vitest";
import { answerSchema, answerValueSchema, diagnosticAnswersSchema } from "#domain/answer";
import { DATE_TIME, ID, NOT_AN_ID, OTHER_ID } from "#domain/test-fixtures";

const VALID = {
  id: ID,
  dossierId: OTHER_ID,
  key: "maritalStatus",
  value: "married",
  createdAt: DATE_TIME,
  updatedAt: DATE_TIME,
};

describe("answerValueSchema", () => {
  // The four shapes the diagnostic questions produce: free text, number, yes/no, multi-select.
  it("accepts text", () => {
    expect(answerValueSchema.safeParse("married").success).toBe(true);
  });

  it("accepts a number", () => {
    expect(answerValueSchema.safeParse(3).success).toBe(true);
  });

  it("accepts a boolean", () => {
    expect(answerValueSchema.safeParse(true).success).toBe(true);
  });

  it("accepts a list of choices", () => {
    expect(answerValueSchema.safeParse(["a", "b"]).success).toBe(true);
  });

  it("accepts an empty list", () => {
    expect(answerValueSchema.safeParse([]).success).toBe(true);
  });

  it("rejects a list of numbers: multi-select values are codes, not counts", () => {
    expect(answerValueSchema.safeParse([1, 2]).success).toBe(false);
  });

  it("rejects a nested object", () => {
    expect(answerValueSchema.safeParse({ nested: true }).success).toBe(false);
  });

  it("rejects null: an unanswered question is absent, not null", () => {
    expect(answerValueSchema.safeParse(null).success).toBe(false);
  });
});

describe("answerSchema", () => {
  it("accepts a complete answer", () => {
    expect(answerSchema.safeParse(VALID).success).toBe(true);
  });

  it.each(["id", "dossierId", "key", "value", "createdAt", "updatedAt"])("requires %s", (field) => {
    const { [field]: _removed, ...withoutField } = VALID as Record<string, unknown>;
    expect(answerSchema.safeParse(withoutField).success).toBe(false);
  });

  it("rejects an empty question key", () => {
    expect(answerSchema.safeParse({ ...VALID, key: "" }).success).toBe(false);
  });

  it("rejects a dossier id that is not a uuid", () => {
    expect(answerSchema.safeParse({ ...VALID, dossierId: NOT_AN_ID }).success).toBe(false);
  });
});

describe("diagnosticAnswersSchema", () => {
  it("accepts the full answer set the engine consumes", () => {
    const result = diagnosticAnswersSchema.safeParse({
      mode: "death",
      hasChildren: true,
      childCount: 2,
      contracts: ["assurance_vie"],
    });

    expect(result.success).toBe(true);
  });

  it("accepts an empty set: nobody has answered yet", () => {
    expect(diagnosticAnswersSchema.safeParse({}).success).toBe(true);
  });

  it("rejects a value shape no question produces", () => {
    expect(diagnosticAnswersSchema.safeParse({ mode: { nested: true } }).success).toBe(false);
  });
});
