/**
 * Today in the viewer's own timezone, formatted as the `YYYY-MM-DD` a date input expects.
 * The Swedish locale is used because it is the shortest standard formatter that already prints
 * ISO order: `toISOString()` would answer in UTC and hand a date input tomorrow's date all
 * evening for anyone east of Greenwich.
 */
export const todayIso = (): string => new Date().toLocaleDateString("sv-SE");
