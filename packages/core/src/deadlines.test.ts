import { describe, expect, it } from "vitest";
import {
  calculateDueDate,
  daysUntilDue,
  DEFAULT_DELAY_DAYS,
  dueDateCategory,
} from "#core/deadlines";
import { addDays, daysBetween, toCalendarDate } from "#core/calendar-date";
import { createProcedure } from "#core/test-fixtures";

describe("calculateDueDate", () => {
  it("uses the time window's default delay when delayDays is absent", () => {
    const procedure = createProcedure({ timeWindow: "7d", delayDays: null });

    expect(calculateDueDate(procedure, "2026-03-01")).toBe("2026-03-08");
  });

  it("uses an explicit delayDays when provided, even if it differs from the time window", () => {
    const procedure = createProcedure({ timeWindow: "6m", delayDays: 3 });

    expect(calculateDueDate(procedure, "2026-03-04")).toBe("2026-03-07");
  });

  it("old death: the computed due date can be in the past, the engine does not correct it", () => {
    const procedure = createProcedure({ timeWindow: "30d", delayDays: null });

    const dueDate = calculateDueDate(procedure, "2020-01-01");

    expect(dueDate).toBe("2020-01-31");
    expect(daysUntilDue(dueDate, "2026-07-28")).toBeLessThan(0);
  });

  it("every time window has a positive, increasing default delay", () => {
    expect(DEFAULT_DELAY_DAYS["24h"]).toBeLessThan(DEFAULT_DELAY_DAYS["7d"]);
    expect(DEFAULT_DELAY_DAYS["7d"]).toBeLessThan(DEFAULT_DELAY_DAYS["30d"]);
    expect(DEFAULT_DELAY_DAYS["30d"]).toBeLessThan(DEFAULT_DELAY_DAYS["6m"]);
  });
});

describe("calendar arithmetic", () => {
  it("crosses a DST boundary without drifting", () => {
    // Europe/Paris springs forward on 2026-03-29 and falls back on 2026-10-25. Local-time
    // arithmetic loses or gains an hour here, which is enough to shift the day.
    expect(addDays("2026-03-28", 2)).toBe("2026-03-30");
    expect(addDays("2026-10-24", 2)).toBe("2026-10-26");
    expect(daysBetween("2026-03-28", "2026-03-30")).toBe(2);
    expect(daysBetween("2026-10-24", "2026-10-26")).toBe(2);
  });

  it("crosses a leap day", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
  });

  it("counts backwards with a negative delta", () => {
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
    expect(daysBetween("2026-01-10", "2026-01-01")).toBe(-9);
  });

  it("reads an instant as its UTC calendar day", () => {
    expect(toCalendarDate(new Date("2026-01-15T23:30:00Z"))).toBe("2026-01-15");
  });
});

describe("dueDateCategory", () => {
  it("categorises around the due-soon threshold without any clock of its own", () => {
    expect(dueDateCategory(null, "2026-01-10")).toBe("none");
    expect(dueDateCategory("2026-01-09", "2026-01-10")).toBe("overdue");
    expect(dueDateCategory("2026-01-10", "2026-01-10")).toBe("due_soon");
    expect(dueDateCategory("2026-01-17", "2026-01-10")).toBe("due_soon");
    expect(dueDateCategory("2026-01-18", "2026-01-10")).toBe("due_later");
  });
});
