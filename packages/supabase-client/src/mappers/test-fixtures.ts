/**
 * Sentinel builders for the mapper suites.
 *
 * Every mapper is a column-to-field translation, so the only bug it can carry is reading the
 * wrong column — `created_at` landing in `updatedAt`, `procedure_id` in `benefitId`. A fixture
 * that reuses the same UUID or the same timestamp for several columns cannot express that
 * failure: the assertion passes either way. These builders hand out a distinct value per
 * ordinal so a swap always changes the result.
 */

/** Valid v4 UUID, distinct per ordinal. */
export const uuid = (ordinal: number): string =>
  `00000000-0000-4000-8000-${String(ordinal).padStart(12, "0")}`;

/** Valid timestamptz as PostgREST serialises it, distinct per ordinal. */
export const timestamp = (ordinal: number): string =>
  `2026-03-${String(ordinal).padStart(2, "0")}T08:00:00.000+00:00`;

/** Valid calendar day, distinct per ordinal. */
export const day = (ordinal: number): string => `2026-05-${String(ordinal).padStart(2, "0")}`;
