import { describe, expect, it } from "vitest";
import type { DiagnosticAnswers } from "@sorento/domain";
import { applicableProcedures, eligibleBenefits } from "#core/eligibility";
import { createBenefit, createCondition, createProcedure } from "#core/test-fixtures";

describe("applicableProcedures", () => {
  it("includes procedures with no condition, for any profile", () => {
    const universal = createProcedure({ code: "universal" });
    const answers: DiagnosticAnswers = {};

    expect(applicableProcedures([universal], [], answers)).toEqual([universal]);
  });

  it("excludes an inactive procedure even if its condition is true", () => {
    const procedure = createProcedure({ code: "inactive", active: false });
    const condition = createCondition({
      procedureId: procedure.id,
      expression: { type: "comparison", field: "x", operator: "eq", value: true },
    });

    expect(applicableProcedures([procedure], [condition], { x: true })).toEqual([]);
  });

  it("combines multiple condition rows with AND", () => {
    const procedure = createProcedure({ code: "double_condition" });
    const conditionA = createCondition({
      procedureId: procedure.id,
      expression: { type: "comparison", field: "maritalStatus", operator: "eq", value: "married" },
    });
    const conditionB = createCondition({
      procedureId: procedure.id,
      expression: { type: "comparison", field: "age", operator: "gte", value: 55 },
    });

    expect(
      applicableProcedures([procedure], [conditionA, conditionB], {
        maritalStatus: "married",
        age: 60,
      }),
    ).toEqual([procedure]);
    expect(
      applicableProcedures([procedure], [conditionA, conditionB], {
        maritalStatus: "married",
        age: 40,
      }),
    ).toEqual([]);
  });

  it("widowed/civil-union/cohabiting: a procedure reserved for spouses or civil partners excludes cohabiting partners", () => {
    const procedure = createProcedure({ code: "survivor_pension" });
    const condition = createCondition({
      procedureId: procedure.id,
      expression: {
        type: "comparison",
        field: "maritalStatus",
        operator: "in",
        value: ["married", "civilUnion"],
      },
    });

    expect(applicableProcedures([procedure], [condition], { maritalStatus: "civilUnion" })).toEqual(
      [procedure],
    );
    expect(applicableProcedures([procedure], [condition], { maritalStatus: "cohabiting" })).toEqual(
      [],
    );
  });

  it("employee/retired/self-employed: an employer procedure is reserved for employees", () => {
    const procedure = createProcedure({ code: "notify_employer" });
    const condition = createCondition({
      procedureId: procedure.id,
      expression: {
        type: "comparison",
        field: "employmentStatus",
        operator: "eq",
        value: "employee",
      },
    });

    expect(
      applicableProcedures([procedure], [condition], { employmentStatus: "employee" }),
    ).toEqual([procedure]);
    expect(applicableProcedures([procedure], [condition], { employmentStatus: "retired" })).toEqual(
      [],
    );
    expect(
      applicableProcedures([procedure], [condition], { employmentStatus: "selfEmployed" }),
    ).toEqual([]);
  });

  it("minor children: a procedure triggered only when minor children are present", () => {
    const procedure = createProcedure({ code: "family_counsel" });
    const condition = createCondition({
      procedureId: procedure.id,
      expression: { type: "comparison", field: "hasMinorChildren", operator: "eq", value: true },
    });

    expect(applicableProcedures([procedure], [condition], { hasMinorChildren: true })).toEqual([
      procedure,
    ]);
    expect(applicableProcedures([procedure], [condition], { hasMinorChildren: false })).toEqual([]);
  });
});

describe("eligibleBenefits", () => {
  it("old death: a time-bounded benefit is excluded if the death is past the deadline declared in the answers", () => {
    const benefit = createBenefit({ code: "death_benefit_cpam" });
    const condition = createCondition({
      benefitId: benefit.id,
      expression: { type: "comparison", field: "deathWithinDeadline", operator: "eq", value: true },
    });

    expect(eligibleBenefits([benefit], [condition], { deathWithinDeadline: true })).toEqual([
      benefit,
    ]);
    expect(eligibleBenefits([benefit], [condition], { deathWithinDeadline: false })).toEqual([]);
  });

  it("excludes an inactive benefit", () => {
    const benefit = createBenefit({ code: "retired", active: false });
    expect(eligibleBenefits([benefit], [], {})).toEqual([]);
  });
});
