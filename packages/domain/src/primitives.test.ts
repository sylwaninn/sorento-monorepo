import { describe, expect, it } from "vitest";
import { dateSchema, dateTimeSchema, idSchema } from "#domain/primitives";
import { DATE, DATE_TIME, DATE_TIME_WITH_OFFSET, ID, NOT_AN_ID } from "#domain/test-fixtures";

describe("idSchema", () => {
  it("accepts a uuid", () => {
    expect(idSchema.safeParse(ID).success).toBe(true);
  });

  it("rejects a string that merely looks like one", () => {
    expect(idSchema.safeParse(NOT_AN_ID).success).toBe(false);
  });

  it("rejects a numeric id, which is what a wrong column would send", () => {
    expect(idSchema.safeParse(42).success).toBe(false);
  });
});

describe("dateTimeSchema", () => {
  it("accepts a Z-suffixed instant", () => {
    expect(dateTimeSchema.safeParse(DATE_TIME).success).toBe(true);
  });

  it("accepts the explicit offset PostgREST serialises", () => {
    expect(dateTimeSchema.safeParse(DATE_TIME_WITH_OFFSET).success).toBe(true);
  });

  it("rejects an instant with no timezone at all", () => {
    expect(dateTimeSchema.safeParse("2026-01-15T08:12:34").success).toBe(false);
  });

  it("rejects a calendar day where an instant is required", () => {
    expect(dateTimeSchema.safeParse(DATE).success).toBe(false);
  });
});

describe("dateSchema", () => {
  it("accepts a calendar day", () => {
    expect(dateSchema.safeParse(DATE).success).toBe(true);
  });

  it("rejects an instant where a calendar day is required", () => {
    expect(dateSchema.safeParse(DATE_TIME).success).toBe(false);
  });

  // The pattern is anchored at both ends. Without the anchors a timestamp would slip through
  // as "contains a date", and a death date would silently carry a time.
  it("rejects trailing characters after the day", () => {
    expect(dateSchema.safeParse("2026-01-15X").success).toBe(false);
  });

  it("rejects leading characters before the year", () => {
    expect(dateSchema.safeParse("X2026-01-15").success).toBe(false);
  });

  it("rejects a two-digit year", () => {
    expect(dateSchema.safeParse("26-01-15").success).toBe(false);
  });

  it("rejects a single-digit month", () => {
    expect(dateSchema.safeParse("2026-1-15").success).toBe(false);
  });

  it("rejects a single-digit day", () => {
    expect(dateSchema.safeParse("2026-01-5").success).toBe(false);
  });

  it("rejects slashes instead of dashes", () => {
    expect(dateSchema.safeParse("2026/01/15").success).toBe(false);
  });

  it("states the expected format in French, the language the user reads", () => {
    const result = dateSchema.safeParse("nope");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Date attendue au format AAAA-MM-JJ.");
    }
  });
});
