import { describe, expect, it } from "vitest";
import type { Tracking } from "@sorento/domain";
import {
  SETTLED_STATUSES,
  buildTrackableItemsById,
  buildTrackedItems,
  isSettled,
  type TrackableItem,
} from "#core/trackable";
import { createBenefit, createProcedure } from "#core/test-fixtures";

const createTracking = (overrides: Partial<Tracking> = {}): Tracking => ({
  id: "00000000-0000-0000-0000-0000000000ff",
  dossierId: "00000000-0000-0000-0000-0000000000fe",
  procedureId: null,
  benefitId: null,
  status: "todo",
  assignedTo: null,
  note: null,
  dueDate: null,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  ...overrides,
});

describe("buildTrackableItemsById", () => {
  it("keeps a procedure's delay and reference profession, and states no entitlement", () => {
    const procedure = createProcedure({
      timeWindow: "24h",
      delayDays: 3,
      referenceProfession: "notaire",
    });

    const item = buildTrackableItemsById([procedure], []).get(procedure.id);

    expect(item).toMatchObject({
      kind: "procedure",
      delayDays: 3,
      referenceProfession: "notaire",
      cautionText: null,
    });
  });

  it("carries a benefit's caution text, and gives it no delay nor profession", () => {
    const benefit = createBenefit({ cautionText: "People in a situation like yours may…" });

    const item = buildTrackableItemsById([], [benefit]).get(benefit.id);

    expect(item).toMatchObject({
      kind: "benefit",
      delayDays: null,
      referenceProfession: null,
      cautionText: "People in a situation like yours may…",
    });
  });

  it("carries the catalog provenance every display component requires", () => {
    const procedure = createProcedure({
      sourceUrl: "https://service-public.fr/x",
      lastVerifiedDate: "2026-05-04",
    });

    expect(buildTrackableItemsById([procedure], []).get(procedure.id)).toMatchObject({
      sourceUrl: "https://service-public.fr/x",
      lastVerifiedDate: "2026-05-04",
    });
  });

  it("indexes procedures and benefits together, keyed by id", () => {
    const procedure = createProcedure();
    const benefit = createBenefit();

    const itemsById = buildTrackableItemsById([procedure], [benefit]);

    expect([...itemsById.keys()].sort()).toEqual([procedure.id, benefit.id].sort());
  });

  it("builds one entry per procedure, each carrying that procedure's own data", () => {
    const first = createProcedure({ title: "Première" });
    const second = createProcedure({ title: "Seconde" });

    const itemsById = buildTrackableItemsById([first, second], []);

    expect(itemsById.size).toBe(2);
    expect(itemsById.get(first.id)?.title).toBe("Première");
    expect(itemsById.get(second.id)?.title).toBe("Seconde");
  });

  it("returns an empty index for an empty catalog", () => {
    expect(buildTrackableItemsById([], []).size).toBe(0);
  });
});

describe("isSettled", () => {
  // Written out rather than looped over SETTLED_STATUSES: iterating the list under test would
  // accept whatever it contains. A status wrongly added here would silently stop an item from
  // ever appearing in "to do now".
  it("settles exactly done and not_applicable", () => {
    expect(SETTLED_STATUSES).toEqual(["done", "not_applicable"]);
  });

  it.each(["done", "not_applicable"] as const)("treats %s as settled", (status) => {
    expect(isSettled(createTracking({ status }))).toBe(true);
  });

  it.each(["todo", "in_progress", "waiting"] as const)("treats %s as unsettled", (status) => {
    expect(isSettled(createTracking({ status }))).toBe(false);
  });
});

describe("buildTrackedItems", () => {
  const procedure = createProcedure({ timeWindow: "7d", delayDays: null });
  // Built per test rather than once at describe level: setup that throws outside a test is
  // reported as a collection error, which some runners do not count as a failing test at all.
  const index = (): ReturnType<typeof buildTrackableItemsById> =>
    buildTrackableItemsById([procedure], []);

  it("joins a tracking row to its catalog entry", () => {
    const tracking = createTracking({ procedureId: procedure.id });

    const [tracked] = buildTrackedItems([tracking], index(), null);

    expect(tracked?.tracking).toBe(tracking);
    expect(tracked?.item.id).toBe(procedure.id);
  });

  it("resolves the benefit id when the row targets a benefit", () => {
    const benefit = createBenefit();
    const tracking = createTracking({ benefitId: benefit.id });

    const [tracked] = buildTrackedItems([tracking], buildTrackableItemsById([], [benefit]), null);

    expect(tracked?.item.kind).toBe("benefit");
  });

  it("drops an entry whose catalog item has disappeared rather than rendering it half-empty", () => {
    const orphan = createTracking({ procedureId: "00000000-0000-0000-0000-00000000dead" });

    expect(buildTrackedItems([orphan], index(), null)).toEqual([]);
  });

  it("drops an entry that targets neither a procedure nor a benefit", () => {
    expect(buildTrackedItems([createTracking()], index(), null)).toEqual([]);
  });

  it("computes the due date from the death date when the row stores none", () => {
    const tracking = createTracking({ procedureId: procedure.id, dueDate: null });

    const [tracked] = buildTrackedItems([tracking], index(), "2026-03-01");

    expect(tracked?.dueDate).toBe("2026-03-08");
  });

  it("prefers the stored due date over the computed one", () => {
    const tracking = createTracking({ procedureId: procedure.id, dueDate: "2026-04-15" });

    const [tracked] = buildTrackedItems([tracking], index(), "2026-03-01");

    expect(tracked?.dueDate).toBe("2026-04-15");
  });

  it("leaves the due date unresolved while no death date is known", () => {
    const tracking = createTracking({ procedureId: procedure.id, dueDate: null });

    const [tracked] = buildTrackedItems([tracking], index(), null);

    expect(tracked?.dueDate).toBeNull();
  });

  it("keeps every resolvable row and only those", () => {
    const rows = [
      createTracking({ procedureId: procedure.id }),
      createTracking({ procedureId: "00000000-0000-0000-0000-00000000dead" }),
      createTracking({ procedureId: procedure.id }),
    ];

    expect(buildTrackedItems(rows, index(), null)).toHaveLength(2);
  });

  it("returns nothing for an empty tracking list", () => {
    const empty: ReadonlyMap<string, TrackableItem> = new Map();

    expect(buildTrackedItems([], empty, "2026-03-01")).toEqual([]);
  });
});
