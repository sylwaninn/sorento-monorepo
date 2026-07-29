/**
 * A legal deadline is a calendar day, not an instant. Mixing the two is how a due date
 * lands a day early: `new Date("2026-01-15")` is midnight UTC, while `setDate()` and
 * `getDate()` work in the runtime's local time, so every arithmetic west of UTC drifts.
 *
 * Everything here is string in, string out, in the `YYYY-MM-DD` shape Postgres `date`
 * columns already use, with UTC-only arithmetic in between.
 */
export type CalendarDate = string;

const CALENDAR_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const isCalendarDate = (value: string): value is CalendarDate =>
  CALENDAR_DATE_PATTERN.test(value);

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

const toUtcTimestamp = (date: CalendarDate): number => Date.parse(`${date}T00:00:00.000Z`);

const fromUtcTimestamp = (timestamp: number): CalendarDate =>
  new Date(timestamp).toISOString().slice(0, 10);

export const addDays = (date: CalendarDate, days: number): CalendarDate =>
  fromUtcTimestamp(toUtcTimestamp(date) + days * MILLISECONDS_PER_DAY);

/** Whole days from `from` to `to`; negative when `to` precedes `from`. */
export const daysBetween = (from: CalendarDate, to: CalendarDate): number =>
  Math.round((toUtcTimestamp(to) - toUtcTimestamp(from)) / MILLISECONDS_PER_DAY);

/** The calendar day an instant falls on, in UTC. The clock stays an explicit argument. */
export const toCalendarDate = (instant: Date): CalendarDate => instant.toISOString().slice(0, 10);

export const compareCalendarDates = (a: CalendarDate, b: CalendarDate): number =>
  a < b ? -1 : a > b ? 1 : 0;
