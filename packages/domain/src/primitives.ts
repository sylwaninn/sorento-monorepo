import { z } from "zod";

export const idSchema = z.string().uuid();

// Postgres timestamptz as PostgREST serialises it: an ISO instant with an explicit offset
// ("2026-01-15T08:12:34.567891+00:00") or a Z suffix.
export const dateTimeSchema = z.string().datetime({ offset: true });

// Calendar day, no time and no timezone: a death date is a date, not an instant.
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date attendue au format AAAA-MM-JJ.")
  .refine((value) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return true;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    const daysInMonth = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (month < 1 || month > 12) return false;
    const maxDays = daysInMonth[month - 1];
    return maxDays !== undefined && day >= 1 && day <= maxDays;
  }, "Date calendaire invalide.");
