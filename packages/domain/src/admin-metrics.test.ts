import { describe, expect, it } from "vitest";
import { adminMetricsSchema } from "#domain/admin-metrics";

const VALID = {
  totalUsers: 120,
  totalDossiers: 45,
  dossiersByStatus: { PREPARATION: 30, ACTIVE: 15 },
  activeTrustedContactDesignations: 12,
  trackingCompletionRatePercent: 62.5,
  activeCatalogProcedures: 80,
  activeCatalogBenefits: 24,
};

const COUNTERS = [
  "totalUsers",
  "totalDossiers",
  "activeTrustedContactDesignations",
  "activeCatalogProcedures",
  "activeCatalogBenefits",
];

describe("adminMetricsSchema", () => {
  it("accepts a complete metrics payload", () => {
    expect(adminMetricsSchema.safeParse(VALID).success).toBe(true);
  });

  it.each([...COUNTERS, "dossiersByStatus", "trackingCompletionRatePercent"])(
    "requires %s",
    (field) => {
      const { [field]: _removed, ...withoutField } = VALID as Record<string, unknown>;
      expect(adminMetricsSchema.safeParse(withoutField).success).toBe(false);
    },
  );

  it("accepts a brand-new platform where every counter is zero", () => {
    const zeroed = Object.fromEntries(COUNTERS.map((field) => [field, 0]));
    expect(
      adminMetricsSchema.safeParse({
        ...VALID,
        ...zeroed,
        dossiersByStatus: {},
        trackingCompletionRatePercent: 0,
      }).success,
    ).toBe(true);
  });

  it.each(COUNTERS)("rejects a negative %s", (field) => {
    expect(adminMetricsSchema.safeParse({ ...VALID, [field]: -1 }).success).toBe(false);
  });

  it.each(COUNTERS)("rejects a fractional %s", (field) => {
    expect(adminMetricsSchema.safeParse({ ...VALID, [field]: 1.5 }).success).toBe(false);
  });

  // A completion rate is a percentage, so unlike the counters it is legitimately fractional.
  it("accepts a fractional completion rate", () => {
    expect(
      adminMetricsSchema.safeParse({ ...VALID, trackingCompletionRatePercent: 0.5 }).success,
    ).toBe(true);
  });

  it("rejects a negative completion rate", () => {
    expect(
      adminMetricsSchema.safeParse({ ...VALID, trackingCompletionRatePercent: -1 }).success,
    ).toBe(false);
  });

  it("keys the status breakdown by the dossier states", () => {
    expect(
      adminMetricsSchema.safeParse({ ...VALID, dossiersByStatus: { ARCHIVED: 3 } }).success,
    ).toBe(false);
  });

  it("rejects a negative count inside the status breakdown", () => {
    expect(
      adminMetricsSchema.safeParse({ ...VALID, dossiersByStatus: { PREPARATION: -1 } }).success,
    ).toBe(false);
  });

  // The admin reads aggregates only: never a dossier, user, or content identifier.
  it("exposes counters only, no identifiers", () => {
    expect(Object.keys(adminMetricsSchema.shape).sort()).toEqual(
      [...COUNTERS, "dossiersByStatus", "trackingCompletionRatePercent"].sort(),
    );
  });
});
