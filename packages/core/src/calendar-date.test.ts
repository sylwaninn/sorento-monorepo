import { describe, expect, it } from "vitest";
import {
  addDays,
  compareCalendarDates,
  daysBetween,
  isCalendarDate,
  toCalendarDate,
} from "#core/calendar-date";

describe("isCalendarDate", () => {
  it("accepts a calendar day", () => {
    expect(isCalendarDate("2026-01-15")).toBe(true);
  });

  // The pattern is anchored at both ends and fixes every field's width. Without that, a
  // timestamp would pass as "contains a date" and a deadline would silently carry a time.
  it("rejects an instant", () => {
    expect(isCalendarDate("2026-01-15T08:00:00Z")).toBe(false);
  });

  it("rejects trailing characters", () => {
    expect(isCalendarDate("2026-01-15X")).toBe(false);
  });

  it("rejects leading characters", () => {
    expect(isCalendarDate("X2026-01-15")).toBe(false);
  });

  it("rejects a two-digit year", () => {
    expect(isCalendarDate("26-01-15")).toBe(false);
  });

  it("rejects a five-digit year", () => {
    expect(isCalendarDate("02026-01-15")).toBe(false);
  });

  it("rejects a single-digit month", () => {
    expect(isCalendarDate("2026-1-15")).toBe(false);
  });

  it("rejects a three-digit month", () => {
    expect(isCalendarDate("2026-011-15")).toBe(false);
  });

  it("rejects a single-digit day", () => {
    expect(isCalendarDate("2026-01-5")).toBe(false);
  });

  it("rejects a three-digit day", () => {
    expect(isCalendarDate("2026-01-155")).toBe(false);
  });

  it("rejects slashes instead of dashes", () => {
    expect(isCalendarDate("2026/01/15")).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(isCalendarDate("")).toBe(false);
  });
});

describe("addDays", () => {
  it("moves forward within a month", () => {
    expect(addDays("2026-01-15", 7)).toBe("2026-01-22");
  });

  it("crosses a month boundary", () => {
    expect(addDays("2026-01-28", 7)).toBe("2026-02-04");
  });

  it("crosses a year boundary", () => {
    expect(addDays("2026-12-28", 7)).toBe("2027-01-04");
  });

  it("handles a leap day", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  });

  it("skips 29 February outside a leap year", () => {
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
  });

  it("moves backwards on a negative count", () => {
    expect(addDays("2026-01-15", -20)).toBe("2025-12-26");
  });

  it("returns the same day for zero", () => {
    expect(addDays("2026-01-15", 0)).toBe("2026-01-15");
  });

  // The whole point of the UTC-only arithmetic: local-time maths drifts a day west of UTC.
  it("does not drift across a spring daylight-saving change", () => {
    expect(addDays("2026-03-28", 1)).toBe("2026-03-29");
  });

  it("does not drift across an autumn daylight-saving change", () => {
    expect(addDays("2026-10-24", 1)).toBe("2026-10-25");
  });
});

describe("daysBetween", () => {
  it("counts whole days forward", () => {
    expect(daysBetween("2026-01-15", "2026-01-22")).toBe(7);
  });

  it("returns zero for the same day", () => {
    expect(daysBetween("2026-01-15", "2026-01-15")).toBe(0);
  });

  it("goes negative when the target precedes the origin", () => {
    expect(daysBetween("2026-01-22", "2026-01-15")).toBe(-7);
  });

  it("counts across a year boundary", () => {
    expect(daysBetween("2025-12-28", "2026-01-04")).toBe(7);
  });

  it("counts a full leap year", () => {
    expect(daysBetween("2028-01-01", "2029-01-01")).toBe(366);
  });

  it("does not drift across a daylight-saving change", () => {
    expect(daysBetween("2026-03-01", "2026-04-01")).toBe(31);
  });
});

describe("toCalendarDate", () => {
  it("takes the UTC day an instant falls on", () => {
    expect(toCalendarDate(new Date("2026-01-15T08:12:34.567Z"))).toBe("2026-01-15");
  });

  it("keeps the UTC day for an instant late in the evening", () => {
    expect(toCalendarDate(new Date("2026-01-15T23:59:59.999Z"))).toBe("2026-01-15");
  });

  it("rolls over at the UTC midnight, not the local one", () => {
    expect(toCalendarDate(new Date("2026-01-16T00:00:00.000Z"))).toBe("2026-01-16");
  });
});

describe("compareCalendarDates", () => {
  it("returns a negative number when the first day comes first", () => {
    expect(compareCalendarDates("2026-01-15", "2026-01-22")).toBe(-1);
  });

  it("returns a positive number when the first day comes last", () => {
    expect(compareCalendarDates("2026-01-22", "2026-01-15")).toBe(1);
  });

  it("returns zero for the same day", () => {
    expect(compareCalendarDates("2026-01-15", "2026-01-15")).toBe(0);
  });

  it("orders across a month boundary", () => {
    expect(compareCalendarDates("2026-01-31", "2026-02-01")).toBe(-1);
  });

  it("sorts a list chronologically", () => {
    const dates = ["2026-03-01", "2026-01-15", "2026-02-20"];

    expect([...dates].sort(compareCalendarDates)).toEqual([
      "2026-01-15",
      "2026-02-20",
      "2026-03-01",
    ]);
  });
});
