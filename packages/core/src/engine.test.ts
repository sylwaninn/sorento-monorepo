import { describe, expect, it } from "vitest";
import type { DiagnosticAnswers, TimeWindow } from "@sorento/domain";
import type { CalendarDate } from "#core/calendar-date";
import { daysUntilDue } from "#core/deadlines";
import {
  completionPercentage,
  evaluateJourney,
  focusItems,
  groupByTimeWindow,
  isTimeWindowSettled,
  nextDueDate,
} from "#core/engine";
import { createBenefit, createCondition, createProcedure } from "#core/test-fixtures";

const civilStatusProcedure = createProcedure({
  code: "death_civil_status",
  timeWindow: "24h",
  delayDays: 1,
});
const survivorPensionProcedure = createProcedure({
  code: "survivor_pension_request",
  timeWindow: "6m",
  delayDays: null,
});
const employerProcedure = createProcedure({
  code: "notify_employer",
  timeWindow: "7d",
  delayDays: null,
});
const familyCounselProcedure = createProcedure({
  code: "family_counsel_minor_children",
  timeWindow: "30d",
  delayDays: null,
});

const survivorPensionCondition = createCondition({
  procedureId: survivorPensionProcedure.id,
  expression: {
    type: "comparison",
    field: "maritalStatus",
    operator: "in",
    value: ["married", "civilUnion"],
  },
});
const employerCondition = createCondition({
  procedureId: employerProcedure.id,
  expression: { type: "comparison", field: "employmentStatus", operator: "eq", value: "employee" },
});
const familyCounselCondition = createCondition({
  procedureId: familyCounselProcedure.id,
  expression: { type: "comparison", field: "hasMinorChildren", operator: "eq", value: true },
});

const procedures = [
  civilStatusProcedure,
  survivorPensionProcedure,
  employerProcedure,
  familyCounselProcedure,
];
const conditions = [survivorPensionCondition, employerCondition, familyCounselCondition];

const deathBenefit = createBenefit({ code: "death_benefit_cpam" });
const deathBenefitCondition = createCondition({
  benefitId: deathBenefit.id,
  expression: {
    type: "comparison",
    field: "employmentStatus",
    operator: "in",
    value: ["employee", "jobseeker"],
  },
});

const run = (answers: DiagnosticAnswers, deathDate: CalendarDate | null) =>
  evaluateJourney({
    procedures,
    benefits: [deathBenefit],
    conditions: [...conditions, deathBenefitCondition],
    answers,
    deathDate,
  });

describe("evaluateJourney: profile types", () => {
  it("widowed, retired, no minor children: neither survivor pension, employer, nor family counsel", () => {
    const result = run(
      { maritalStatus: "widowed", employmentStatus: "retired", hasMinorChildren: false },
      "2026-03-01",
    );

    const codes = result.procedures.map((p) => p.code);
    expect(codes).toContain("death_civil_status");
    expect(codes).not.toContain("survivor_pension_request");
    expect(codes).not.toContain("notify_employer");
    expect(codes).not.toContain("family_counsel_minor_children");
    expect(result.benefits).toEqual([]);
  });

  it("civil union, employee, with minor children: survivor pension + employer + family counsel + death benefit", () => {
    const result = run(
      { maritalStatus: "civilUnion", employmentStatus: "employee", hasMinorChildren: true },
      "2026-03-01",
    );

    const codes = result.procedures.map((p) => p.code);
    expect(codes).toEqual(
      expect.arrayContaining([
        "death_civil_status",
        "survivor_pension_request",
        "notify_employer",
        "family_counsel_minor_children",
      ]),
    );
    expect(result.benefits.map((b) => b.code)).toEqual(["death_benefit_cpam"]);
  });

  it("cohabiting partner, self-employed: no survivor pension (cohabiting excluded), no employer procedure, no death benefit", () => {
    const result = run(
      { maritalStatus: "cohabiting", employmentStatus: "selfEmployed", hasMinorChildren: false },
      "2026-03-01",
    );

    const codes = result.procedures.map((p) => p.code);
    expect(codes).toEqual(["death_civil_status"]);
    expect(result.benefits).toEqual([]);
  });

  it("old death: computed due dates are in the past but procedures are still listed", () => {
    const result = run({ maritalStatus: "widowed", employmentStatus: "retired" }, "2018-01-01");

    expect(result.procedures.length).toBeGreaterThan(0);
    for (const procedure of result.procedures) {
      expect(procedure.dueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(daysUntilDue(procedure.dueDate ?? "9999-12-31", "2026-07-28")).toBeLessThan(0);
    }
  });

  it("PREPARATION mode (deathDate null): applicable procedures but no due date", () => {
    const result = run({ maritalStatus: "married", employmentStatus: "employee" }, null);

    expect(result.procedures.length).toBeGreaterThan(0);
    for (const procedure of result.procedures) {
      expect(procedure.dueDate).toBeNull();
    }
  });
});

describe("dashboard helpers", () => {
  interface Item {
    id: string;
    timeWindow: TimeWindow;
    delayDays: number | null;
    dueDate: CalendarDate | null;
    done: boolean;
  }

  const item = (overrides: Partial<Item> & Pick<Item, "id">): Item => ({
    timeWindow: "7d",
    delayDays: 7,
    dueDate: "2026-03-08",
    done: false,
    ...overrides,
  });

  const isDone = (candidate: Item) => candidate.done;
  const dueDateOf = (candidate: Item) => candidate.dueDate;

  it("groups by time window in chronological order and drops empty windows", () => {
    const groups = groupByTimeWindow([
      item({ id: "later", timeWindow: "6m", delayDays: 180 }),
      item({ id: "now", timeWindow: "24h", delayDays: 1 }),
    ]);

    expect(groups.map((group) => group.timeWindow)).toEqual(["24h", "6m"]);
  });

  it("sorts a window by delay so the tightest deadline leads", () => {
    const [group] = groupByTimeWindow([
      item({ id: "slow", timeWindow: "7d", delayDays: 7 }),
      item({ id: "fast", timeWindow: "7d", delayDays: 2 }),
    ]);

    expect(group?.items.map((entry) => entry.id)).toEqual(["fast", "slow"]);
  });

  it("caps the focus list at three items and skips what is already done", () => {
    const items = [
      item({ id: "done", dueDate: "2026-03-01", done: true }),
      item({ id: "a", dueDate: "2026-03-02" }),
      item({ id: "b", dueDate: "2026-03-03" }),
      item({ id: "c", dueDate: "2026-03-04" }),
      item({ id: "d", dueDate: "2026-03-05" }),
    ];

    expect(focusItems({ items, isDone, dueDateOf }).map((entry) => entry.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("puts undated items last in the focus list rather than dropping them", () => {
    const items = [
      item({ id: "undated", dueDate: null }),
      item({ id: "dated", dueDate: "2026-03-02" }),
    ];

    expect(focusItems({ items, isDone, dueDateOf }).map((entry) => entry.id)).toEqual([
      "dated",
      "undated",
    ]);
  });

  it("reports the closest remaining due date, and null once everything is settled", () => {
    const items = [
      item({ id: "a", dueDate: "2026-03-05" }),
      item({ id: "b", dueDate: "2026-03-02" }),
      item({ id: "past", dueDate: "2026-01-01", done: true }),
    ];

    expect(nextDueDate(items, isDone, dueDateOf)).toBe("2026-03-02");
    expect(
      nextDueDate(
        items.map((entry) => ({ ...entry, done: true })),
        isDone,
        dueDateOf,
      ),
    ).toBeNull();
  });

  it("computes completion, and reports 0 rather than dividing by zero", () => {
    expect(completionPercentage([], isDone)).toBe(0);
    expect(completionPercentage([item({ id: "a", done: true }), item({ id: "b" })], isDone)).toBe(
      50,
    );
  });

  it("marks a window settled only when every item in it is done", () => {
    const settled = { timeWindow: "7d" as TimeWindow, items: [item({ id: "a", done: true })] };
    const pending = {
      timeWindow: "7d" as TimeWindow,
      items: [item({ id: "a", done: true }), item({ id: "b" })],
    };

    expect(isTimeWindowSettled(settled, isDone)).toBe(true);
    expect(isTimeWindowSettled(pending, isDone)).toBe(false);
  });
});
