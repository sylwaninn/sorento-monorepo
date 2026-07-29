import { describe, expect, it } from "vitest";
import { evaluateJourney, focusItems, groupByTimeWindow, nextDueDate } from "#core/engine";
import { createProcedure } from "#core/test-fixtures";

type Item = { id: string; timeWindow: "24h" | "7d" | "30d" | "6m"; delayDays: number | null };

const item = (id: string, timeWindow: Item["timeWindow"], delayDays: number | null): Item => ({
  id,
  timeWindow,
  delayDays,
});

describe("groupByTimeWindow", () => {
  // The order is chronological, not the order the catalog happens to return. A dashboard that
  // opens on "within 6 months" before "within 24 hours" buries the urgent paperwork.
  it("orders the groups from the most urgent window to the least", () => {
    const groups = groupByTimeWindow([
      item("late", "6m", null),
      item("soon", "7d", null),
      item("now", "24h", null),
      item("later", "30d", null),
    ]);

    expect(groups.map((group) => group.timeWindow)).toEqual(["24h", "7d", "30d", "6m"]);
  });

  it("drops a window nothing falls into rather than showing an empty section", () => {
    const groups = groupByTimeWindow([item("now", "24h", null), item("late", "6m", null)]);

    expect(groups.map((group) => group.timeWindow)).toEqual(["24h", "6m"]);
  });

  it("sorts within a group by the soonest deadline first", () => {
    const groups = groupByTimeWindow([
      item("slow", "30d", 30),
      item("fast", "30d", 2),
      item("middle", "30d", 10),
    ]);

    expect(groups[0]?.items.map((entry) => entry.id)).toEqual(["fast", "middle", "slow"]);
  });

  it("returns nothing at all for an empty list", () => {
    expect(groupByTimeWindow([])).toEqual([]);
  });
});

describe("evaluateJourney ordering", () => {
  it("returns the procedures with the shortest delay first", () => {
    const slow = createProcedure({ code: "slow", timeWindow: "6m", delayDays: 180 });
    const fast = createProcedure({ code: "fast", timeWindow: "24h", delayDays: 1 });
    const middle = createProcedure({ code: "middle", timeWindow: "30d", delayDays: 30 });

    const journey = evaluateJourney({
      procedures: [slow, fast, middle],
      benefits: [],
      conditions: [],
      answers: {},
      deathDate: "2026-01-15",
    });

    expect(journey.procedures.map((procedure) => procedure.code)).toEqual([
      "fast",
      "middle",
      "slow",
    ]);
  });

  it("falls back to the time window when no explicit delay is set", () => {
    const window30 = createProcedure({ code: "w30", timeWindow: "30d", delayDays: null });
    const window24h = createProcedure({ code: "w24h", timeWindow: "24h", delayDays: null });

    const journey = evaluateJourney({
      procedures: [window30, window24h],
      benefits: [],
      conditions: [],
      answers: {},
      deathDate: "2026-01-15",
    });

    expect(journey.procedures.map((procedure) => procedure.code)).toEqual(["w24h", "w30"]);
  });

  it("computes a due date for every procedure once the death date is known", () => {
    const procedure = createProcedure({ timeWindow: "7d", delayDays: 7 });

    const journey = evaluateJourney({
      procedures: [procedure],
      benefits: [],
      conditions: [],
      answers: {},
      deathDate: "2026-01-15",
    });

    expect(journey.procedures[0]?.dueDate).toBe("2026-01-22");
  });

  it("leaves every due date unresolved while the dossier is in preparation", () => {
    const procedure = createProcedure({ timeWindow: "7d", delayDays: 7 });

    const journey = evaluateJourney({
      procedures: [procedure],
      benefits: [],
      conditions: [],
      answers: {},
      deathDate: null,
    });

    expect(journey.procedures[0]?.dueDate).toBeNull();
  });
});

type Task = { id: string; done: boolean; due: string | null };

const isDone = (task: Task): boolean => task.done;
const dueDateOf = (task: Task): string | null => task.due;

describe("focusItems", () => {
  it("shows at most three items by default: never the wall of thirty tasks", () => {
    const tasks = Array.from({ length: 10 }, (_unused, index) => ({
      id: `t${index}`,
      done: false,
      due: `2026-01-${String(index + 10).padStart(2, "0")}`,
    }));

    expect(focusItems({ items: tasks, isDone, dueDateOf })).toHaveLength(3);
  });

  it("honours an explicit limit", () => {
    const tasks = [
      { id: "a", done: false, due: "2026-01-15" },
      { id: "b", done: false, due: "2026-01-16" },
    ];

    expect(focusItems({ items: tasks, isDone, dueDateOf, limit: 1 })).toHaveLength(1);
  });

  it("leaves finished items out", () => {
    const tasks = [
      { id: "done", done: true, due: "2026-01-01" },
      { id: "todo", done: false, due: "2026-01-20" },
    ];

    expect(focusItems({ items: tasks, isDone, dueDateOf }).map((task) => task.id)).toEqual([
      "todo",
    ]);
  });

  it("puts the soonest deadline first, overdue items included", () => {
    const tasks = [
      { id: "later", done: false, due: "2026-03-01" },
      { id: "overdue", done: false, due: "2025-12-01" },
      { id: "soon", done: false, due: "2026-01-20" },
    ];

    expect(focusItems({ items: tasks, isDone, dueDateOf }).map((task) => task.id)).toEqual([
      "overdue",
      "soon",
      "later",
    ]);
  });

  // An item with no deadline is not urgent, so it sorts after every dated one instead of
  // pushing a real deadline out of the shortlist.
  it("sorts an undated item after every dated one", () => {
    const tasks = [
      { id: "undated", done: false, due: null },
      { id: "dated", done: false, due: "2026-03-01" },
    ];

    expect(focusItems({ items: tasks, isDone, dueDateOf }).map((task) => task.id)).toEqual([
      "dated",
      "undated",
    ]);
  });

  it("keeps undated items in their original order relative to each other", () => {
    const tasks = [
      { id: "first", done: false, due: null },
      { id: "second", done: false, due: null },
    ];

    expect(focusItems({ items: tasks, isDone, dueDateOf }).map((task) => task.id)).toEqual([
      "first",
      "second",
    ]);
  });

  // A comparator that answers "already in order" to everything leaves the list untouched, so
  // an input that is already sorted proves nothing on its own. These two cases pin both
  // directions: a sorted list must survive the sort, and a reversed one must be rewritten.
  it("leaves an already-sorted list alone", () => {
    const tasks = [
      { id: "a", done: false, due: "2026-01-10" },
      { id: "b", done: false, due: "2026-02-10" },
      { id: "c", done: false, due: "2026-03-10" },
    ];

    expect(focusItems({ items: tasks, isDone, dueDateOf }).map((task) => task.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("reverses a list given in the worst possible order", () => {
    const tasks = [
      { id: "c", done: false, due: "2026-03-10" },
      { id: "b", done: false, due: "2026-02-10" },
      { id: "a", done: false, due: "2026-01-10" },
    ];

    expect(focusItems({ items: tasks, isDone, dueDateOf }).map((task) => task.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("moves a dated item ahead of an undated one that came first", () => {
    const tasks = [
      { id: "undated", done: false, due: null },
      { id: "early", done: false, due: "2026-01-10" },
      { id: "late", done: false, due: "2026-05-10" },
    ];

    expect(focusItems({ items: tasks, isDone, dueDateOf }).map((task) => task.id)).toEqual([
      "early",
      "late",
      "undated",
    ]);
  });

  it("keeps a dated item ahead of an undated one that came last", () => {
    const tasks = [
      { id: "early", done: false, due: "2026-01-10" },
      { id: "undated", done: false, due: null },
    ];

    expect(focusItems({ items: tasks, isDone, dueDateOf }).map((task) => task.id)).toEqual([
      "early",
      "undated",
    ]);
  });

  it("returns nothing when everything is finished", () => {
    const tasks = [{ id: "done", done: true, due: "2026-01-01" }];

    expect(focusItems({ items: tasks, isDone, dueDateOf })).toEqual([]);
  });
});

describe("nextDueDate", () => {
  it("returns the soonest deadline still open", () => {
    const tasks = [
      { id: "later", done: false, due: "2026-03-01" },
      { id: "soon", done: false, due: "2026-01-20" },
    ];

    expect(nextDueDate(tasks, isDone, dueDateOf)).toBe("2026-01-20");
  });

  it("ignores deadlines that are already dealt with", () => {
    const tasks = [
      { id: "done", done: true, due: "2026-01-01" },
      { id: "todo", done: false, due: "2026-02-01" },
    ];

    expect(nextDueDate(tasks, isDone, dueDateOf)).toBe("2026-02-01");
  });

  it("ignores items carrying no deadline at all", () => {
    const tasks = [
      { id: "undated", done: false, due: null },
      { id: "dated", done: false, due: "2026-02-01" },
    ];

    expect(nextDueDate(tasks, isDone, dueDateOf)).toBe("2026-02-01");
  });

  // The reassuring empty state depends on this being null rather than a stray date.
  it("returns null when nothing is left to do", () => {
    const tasks = [{ id: "done", done: true, due: "2026-01-01" }];

    expect(nextDueDate(tasks, isDone, dueDateOf)).toBeNull();
  });

  it("returns null when every remaining item is undated", () => {
    const tasks = [{ id: "undated", done: false, due: null }];

    expect(nextDueDate(tasks, isDone, dueDateOf)).toBeNull();
  });

  it("returns null for an empty list", () => {
    expect(nextDueDate([], isDone, dueDateOf)).toBeNull();
  });
});
