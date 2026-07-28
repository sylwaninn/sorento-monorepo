import { describe, expect, it } from "vitest";
import { conditionExpressionSchema } from "#domain/condition-expression";

const comparison = (overrides: Record<string, unknown> = {}) => ({
  type: "comparison",
  field: "maritalStatus",
  operator: "eq",
  value: "married",
  ...overrides,
});

describe("conditionExpressionSchema", () => {
  it("validates a simple comparison", () => {
    expect(conditionExpressionSchema.safeParse(comparison()).success).toBe(true);
  });

  it("validates a nested and/or/not tree", () => {
    const result = conditionExpressionSchema.safeParse({
      type: "and",
      conditions: [
        comparison(),
        { type: "not", condition: comparison({ field: "age", operator: "lt", value: 55 }) },
        {
          type: "or",
          conditions: [
            comparison({
              field: "employmentStatus",
              operator: "in",
              value: ["employee", "selfEmployed"],
            }),
          ],
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("rejects a node whose type no branch handles", () => {
    expect(conditionExpressionSchema.safeParse({ type: "xor", conditions: [] }).success).toBe(
      false,
    );
  });

  it("rejects a comparison with no field", () => {
    expect(conditionExpressionSchema.safeParse(comparison({ field: "" })).success).toBe(false);
  });
});

/**
 * Every operator is exercised individually. The engine in core dispatches on this exact set, so
 * an operator silently dropped here becomes a catalog condition that never matches — and a
 * benefit nobody is ever told about.
 */
describe("comparison operators", () => {
  it.each(["eq", "neq", "gt", "gte", "lt", "lte", "in", "contains"])("accepts %s", (operator) => {
    expect(conditionExpressionSchema.safeParse(comparison({ operator })).success).toBe(true);
  });

  it("rejects an operator the engine cannot evaluate", () => {
    expect(
      conditionExpressionSchema.safeParse(comparison({ operator: "starts_with" })).success,
    ).toBe(false);
  });

  it("rejects a missing operator", () => {
    const { operator: _removed, ...withoutOperator } = comparison();
    expect(conditionExpressionSchema.safeParse(withoutOperator).success).toBe(false);
  });
});

describe("comparison values", () => {
  it.each([
    ["text", "married"],
    ["a number", 55],
    ["a boolean", true],
    ["a list of choices", ["employee", "selfEmployed"]],
  ])("accepts %s", (_label, value) => {
    expect(conditionExpressionSchema.safeParse(comparison({ value })).success).toBe(true);
  });

  it("rejects an object, which no answer produces", () => {
    expect(
      conditionExpressionSchema.safeParse(comparison({ value: { nested: true } })).success,
    ).toBe(false);
  });
});

describe("and/or groups", () => {
  // An empty group has no defined truth value, so it is refused rather than silently treated
  // as true (which would make the condition universal) or false (which would hide the item).
  it("rejects an empty and group", () => {
    expect(conditionExpressionSchema.safeParse({ type: "and", conditions: [] }).success).toBe(
      false,
    );
  });

  it("rejects an empty or group", () => {
    expect(conditionExpressionSchema.safeParse({ type: "or", conditions: [] }).success).toBe(false);
  });

  it("accepts a single-child and group", () => {
    expect(
      conditionExpressionSchema.safeParse({ type: "and", conditions: [comparison()] }).success,
    ).toBe(true);
  });

  it("accepts a single-child or group", () => {
    expect(
      conditionExpressionSchema.safeParse({ type: "or", conditions: [comparison()] }).success,
    ).toBe(true);
  });

  it("rejects a group whose child is malformed", () => {
    expect(
      conditionExpressionSchema.safeParse({
        type: "and",
        conditions: [comparison({ operator: "starts_with" })],
      }).success,
    ).toBe(false);
  });
});

describe("not", () => {
  it("accepts a negated comparison", () => {
    expect(
      conditionExpressionSchema.safeParse({ type: "not", condition: comparison() }).success,
    ).toBe(true);
  });

  it("accepts a negated group", () => {
    expect(
      conditionExpressionSchema.safeParse({
        type: "not",
        condition: { type: "or", conditions: [comparison()] },
      }).success,
    ).toBe(true);
  });

  it("rejects a negation with nothing to negate", () => {
    expect(conditionExpressionSchema.safeParse({ type: "not" }).success).toBe(false);
  });
});
