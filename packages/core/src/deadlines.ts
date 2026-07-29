import type { Procedure, TimeWindow } from "@sorento/domain";
import { addDays, daysBetween, type CalendarDate } from "#core/calendar-date";

export const DEFAULT_DELAY_DAYS: Record<TimeWindow, number> = {
  "24h": 1,
  "7d": 7,
  "30d": 30,
  "6m": 180,
};

export const delayDaysOf = (procedure: Pick<Procedure, "delayDays" | "timeWindow">): number =>
  procedure.delayDays ?? DEFAULT_DELAY_DAYS[procedure.timeWindow];

// deathDate is always an explicit parameter, never read from an internal clock.
export const calculateDueDate = (
  procedure: Pick<Procedure, "delayDays" | "timeWindow">,
  deathDate: CalendarDate,
): CalendarDate => addDays(deathDate, delayDaysOf(procedure));

/** Negative once the due date is behind `today`. Both arguments are injected, never read. */
export const daysUntilDue = (dueDate: CalendarDate, today: CalendarDate): number =>
  daysBetween(today, dueDate);

export const DUE_SOON_DAYS = 7;

export type DueDateCategory = "none" | "overdue" | "due_soon" | "due_later";

// The categorisation is a deadline rule and lives here; the wording it maps to stays in the UI.
export const dueDateCategory = (
  dueDate: CalendarDate | null,
  today: CalendarDate,
): DueDateCategory => {
  if (dueDate === null) return "none";
  const remaining = daysUntilDue(dueDate, today);
  if (remaining < 0) return "overdue";
  if (remaining <= DUE_SOON_DAYS) return "due_soon";
  return "due_later";
};
