import { describe, expect, it } from "vitest";
import type { ConditionExpression, DiagnosticAnswers } from "@sorento/domain";
import { evaluateCondition } from "#core/condition-evaluation";

const comparison = (field: string, operator: string, value: unknown): ConditionExpression =>
  ({ type: "comparison", field, operator, value }) as ConditionExpression;

const evaluate = (expression: ConditionExpression, answers: DiagnosticAnswers): boolean =>
  evaluateCondition(expression, answers);

describe("a missing answer", () => {
  // No eligibility is ever granted on unknown data: an unanswered question fails every
  // comparison, including the negative ones.
  it.each(["eq", "neq", "gt", "gte", "lt", "lte", "in", "contains"])(
    "fails a %s comparison",
    (operator) => {
      expect(evaluate(comparison("absent", operator, "x"), {})).toBe(false);
    },
  );

  it("fails even when the negation would otherwise be true", () => {
    expect(evaluate(comparison("absent", "neq", "married"), {})).toBe(false);
  });
});

describe("eq", () => {
  it("matches an identical string", () => {
    expect(
      evaluate(comparison("maritalStatus", "eq", "married"), { maritalStatus: "married" }),
    ).toBe(true);
  });

  it("rejects a different string", () => {
    expect(
      evaluate(comparison("maritalStatus", "eq", "married"), { maritalStatus: "single" }),
    ).toBe(false);
  });

  it("matches a boolean", () => {
    expect(evaluate(comparison("ownsVehicle", "eq", true), { ownsVehicle: true })).toBe(true);
  });

  it("rejects the other boolean", () => {
    expect(evaluate(comparison("ownsVehicle", "eq", true), { ownsVehicle: false })).toBe(false);
  });
});

describe("neq", () => {
  it("matches a different value", () => {
    expect(
      evaluate(comparison("maritalStatus", "neq", "married"), { maritalStatus: "single" }),
    ).toBe(true);
  });

  it("rejects an identical value", () => {
    expect(
      evaluate(comparison("maritalStatus", "neq", "married"), { maritalStatus: "married" }),
    ).toBe(false);
  });
});

/** Each ordering operator is checked below, at and above the boundary. */
describe("numeric comparisons", () => {
  const at = (operator: string, answer: number, value: number): boolean =>
    evaluate(comparison("age", operator, value), { age: answer });

  it.each([
    ["gt", 56, 55, true],
    ["gt", 55, 55, false],
    ["gt", 54, 55, false],
    ["gte", 56, 55, true],
    ["gte", 55, 55, true],
    ["gte", 54, 55, false],
    ["lt", 54, 55, true],
    ["lt", 55, 55, false],
    ["lt", 56, 55, false],
    ["lte", 54, 55, true],
    ["lte", 55, 55, true],
    ["lte", 56, 55, false],
  ] as const)("%s: %i against %i is %s", (operator, answer, value, expected) => {
    expect(at(operator, answer, value)).toBe(expected);
  });

  // Both sides have to be numbers, or the comparison is meaningless rather than coerced —
  // "60" > 55 in JavaScript, and an age answered as text must not grant a benefit.
  it("refuses to compare when the answer is not a number", () => {
    expect(evaluate(comparison("age", "gt", 55), { age: "60" })).toBe(false);
  });

  it("refuses to compare when the expected value is not a number", () => {
    expect(evaluate(comparison("age", "gt", "55"), { age: 60 })).toBe(false);
  });

  it("refuses to compare when neither side is a number", () => {
    expect(evaluate(comparison("age", "lt", "55"), { age: "60" })).toBe(false);
  });

  it("refuses to compare a boolean answer", () => {
    expect(evaluate(comparison("age", "gte", 55), { age: true })).toBe(false);
  });
});

describe("in", () => {
  it("matches an answer present in the list", () => {
    expect(
      evaluate(comparison("maritalStatus", "in", ["married", "civilUnion"]), {
        maritalStatus: "civilUnion",
      }),
    ).toBe(true);
  });

  it("rejects an answer absent from the list", () => {
    expect(
      evaluate(comparison("maritalStatus", "in", ["married", "civilUnion"]), {
        maritalStatus: "single",
      }),
    ).toBe(false);
  });

  it("compares by string, so a numeric answer still matches", () => {
    expect(evaluate(comparison("childCount", "in", ["1", "2"]), { childCount: 2 })).toBe(true);
  });

  it("rejects an expected value that is not a list", () => {
    expect(
      evaluate(comparison("maritalStatus", "in", "married"), { maritalStatus: "married" }),
    ).toBe(false);
  });

  // `in` asks whether one answer is among several options; a multi-select answer is the
  // `contains` question turned around, and must not silently fall through to it.
  it("rejects a multi-select answer", () => {
    expect(
      evaluate(comparison("contracts", "in", ["assurance_vie"]), { contracts: ["assurance_vie"] }),
    ).toBe(false);
  });

  it("rejects an empty list of options", () => {
    expect(evaluate(comparison("maritalStatus", "in", []), { maritalStatus: "married" })).toBe(
      false,
    );
  });
});

describe("contains", () => {
  it("matches a value present in a multi-select answer", () => {
    expect(
      evaluate(comparison("contracts", "contains", "assurance_vie"), {
        contracts: ["assurance_vie", "mutuelle"],
      }),
    ).toBe(true);
  });

  it("rejects a value absent from a multi-select answer", () => {
    expect(
      evaluate(comparison("contracts", "contains", "assurance_vie"), { contracts: ["mutuelle"] }),
    ).toBe(false);
  });

  it("rejects an answer that is not a list", () => {
    expect(
      evaluate(comparison("contracts", "contains", "assurance_vie"), {
        contracts: "assurance_vie",
      }),
    ).toBe(false);
  });

  it("rejects an empty multi-select answer", () => {
    expect(evaluate(comparison("contracts", "contains", "assurance_vie"), { contracts: [] })).toBe(
      false,
    );
  });

  it("compares by string, so a numeric expected value still matches", () => {
    expect(evaluate(comparison("codes", "contains", 2), { codes: ["1", "2"] })).toBe(true);
  });
});

describe("and", () => {
  const married = comparison("maritalStatus", "eq", "married");
  const hasVehicle = comparison("ownsVehicle", "eq", true);

  it("is true only when every branch is", () => {
    expect(
      evaluate(
        { type: "and", conditions: [married, hasVehicle] },
        {
          maritalStatus: "married",
          ownsVehicle: true,
        },
      ),
    ).toBe(true);
  });

  it("is false as soon as one branch is", () => {
    expect(
      evaluate(
        { type: "and", conditions: [married, hasVehicle] },
        {
          maritalStatus: "married",
          ownsVehicle: false,
        },
      ),
    ).toBe(false);
  });
});

describe("or", () => {
  const married = comparison("maritalStatus", "eq", "married");
  const hasVehicle = comparison("ownsVehicle", "eq", true);

  it("is true as soon as one branch is", () => {
    expect(
      evaluate(
        { type: "or", conditions: [married, hasVehicle] },
        {
          maritalStatus: "single",
          ownsVehicle: true,
        },
      ),
    ).toBe(true);
  });

  it("is false only when every branch is", () => {
    expect(
      evaluate(
        { type: "or", conditions: [married, hasVehicle] },
        {
          maritalStatus: "single",
          ownsVehicle: false,
        },
      ),
    ).toBe(false);
  });
});

describe("not", () => {
  const married = comparison("maritalStatus", "eq", "married");

  it("inverts a true branch", () => {
    expect(evaluate({ type: "not", condition: married }, { maritalStatus: "married" })).toBe(false);
  });

  it("inverts a false branch", () => {
    expect(evaluate({ type: "not", condition: married }, { maritalStatus: "single" })).toBe(true);
  });

  it("turns a missing answer into a match, since the comparison itself failed", () => {
    expect(evaluate({ type: "not", condition: married }, {})).toBe(true);
  });
});

describe("nesting", () => {
  it("evaluates a tree several levels deep", () => {
    const expression: ConditionExpression = {
      type: "and",
      conditions: [
        comparison("mode", "eq", "death"),
        {
          type: "or",
          conditions: [
            comparison("maritalStatus", "in", ["married", "civilUnion"]),
            { type: "not", condition: comparison("employmentStatus", "eq", "retired") },
          ],
        },
      ],
    };

    expect(
      evaluate(expression, {
        mode: "death",
        maritalStatus: "single",
        employmentStatus: "employee",
      }),
    ).toBe(true);

    expect(
      evaluate(expression, { mode: "death", maritalStatus: "single", employmentStatus: "retired" }),
    ).toBe(false);
  });
});
