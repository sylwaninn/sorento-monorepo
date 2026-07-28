import { z } from "zod";

export const idSchema = z.string().uuid();

// Postgres timestamptz as PostgREST serialises it: an ISO instant with an explicit offset
// ("2026-01-15T08:12:34.567891+00:00") or a Z suffix.
export const dateTimeSchema = z.string().datetime({ offset: true });

// Calendar day, no time and no timezone: a death date is a date, not an instant.
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date attendue au format AAAA-MM-JJ.");
