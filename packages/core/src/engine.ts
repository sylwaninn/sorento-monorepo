import type { Benefit, Condition, DiagnosticAnswers, Procedure, TimeWindow } from "@sorento/domain";
import { compareCalendarDates, type CalendarDate } from "#core/calendar-date";
import { calculateDueDate, delayDaysOf } from "#core/deadlines";
import { applicableProcedures, eligibleBenefits } from "#core/eligibility";

export interface ProcedureWithDueDate extends Procedure {
  /** null in PREPARATION mode (no death date) or for the anonymous diagnostic preview. */
  dueDate: CalendarDate | null;
}

export interface JourneyResult {
  procedures: ProcedureWithDueDate[];
  benefits: Benefit[];
}

export interface EvaluateJourneyInput {
  procedures: Procedure[];
  benefits: Benefit[];
  conditions: Condition[];
  answers: DiagnosticAnswers;
  deathDate: CalendarDate | null;
}

const TIME_WINDOW_ORDER: readonly TimeWindow[] = ["24h", "7d", "30d", "6m"];

// Entry point of the engine: (catalog, answers, deathDate) -> applicable procedures +
// eligible benefits, with due dates computed.
export const evaluateJourney = (input: EvaluateJourneyInput): JourneyResult => {
  const deathDate = input.deathDate;

  const procedures = applicableProcedures(input.procedures, input.conditions, input.answers)
    .map((procedure): ProcedureWithDueDate => ({
      ...procedure,
      dueDate: deathDate === null ? null : calculateDueDate(procedure, deathDate),
    }))
    .sort((a, b) => delayDaysOf(a) - delayDaysOf(b));

  const benefits = eligibleBenefits(input.benefits, input.conditions, input.answers);

  return { procedures, benefits };
};

export interface TimeWindowGroup<T> {
  timeWindow: TimeWindow;
  items: T[];
}

/** Chronological grouping used by the dashboard, so no component has to know the order. */
export const groupByTimeWindow = <T extends { timeWindow: TimeWindow; delayDays: number | null }>(
  items: T[],
): TimeWindowGroup<T>[] =>
  TIME_WINDOW_ORDER.map((timeWindow) => ({
    timeWindow,
    items: items
      .filter((item) => item.timeWindow === timeWindow)
      .sort((a, b) => delayDaysOf(a) - delayDaysOf(b)),
  })).filter((group) => group.items.length > 0);

const byDueDate =
  <T>(dueDateOf: (item: T) => CalendarDate | null) =>
  (a: T, b: T): number => {
    const dueA = dueDateOf(a);
    const dueB = dueDateOf(b);
    // Stryker disable next-line ConditionalExpression,EqualityOperator: equivalent mutants.
    // Returning 0 for two undated items is the correct comparator contract, but this closure
    // is only ever handed to Array.sort, and a stable sort leaves equal elements alone whether
    // the answer is 0 or 1 — no input can distinguish the two.
    if (dueA === null) return dueB === null ? 0 : 1;
    if (dueB === null) return -1;
    return compareCalendarDates(dueA, dueB);
  };

export interface FocusInput<T> {
  items: T[];
  isDone: (item: T) => boolean;
  dueDateOf: (item: T) => CalendarDate | null;
  limit?: number;
}

/**
 * "À faire maintenant": the two or three closest unfinished items, never the wall of thirty
 * tasks. Overdue items sort first but carry no penalty flag — the UI must not shame anyone.
 */
export const focusItems = <T>({ items, isDone, dueDateOf, limit = 3 }: FocusInput<T>): T[] =>
  items
    .filter((item) => !isDone(item))
    .sort(byDueDate(dueDateOf))
    .slice(0, limit);

/** null when nothing is left to do, so the caller renders the reassuring empty state. */
export const nextDueDate = <T>(
  items: T[],
  isDone: (item: T) => boolean,
  dueDateOf: (item: T) => CalendarDate | null,
): CalendarDate | null => {
  const upcoming = items
    .filter((item) => !isDone(item))
    .map(dueDateOf)
    .filter((dueDate): dueDate is CalendarDate => dueDate !== null)
    .sort(compareCalendarDates);

  return upcoming[0] ?? null;
};

export const completionPercentage = <T>(items: T[], isDone: (item: T) => boolean): number =>
  items.length === 0 ? 0 : Math.round((items.filter(isDone).length / items.length) * 100);

/** A window folds away once everything in it is settled — the "you've handled it" state. */
export const isTimeWindowSettled = <T>(
  group: TimeWindowGroup<T>,
  isDone: (item: T) => boolean,
): boolean => group.items.every(isDone);
