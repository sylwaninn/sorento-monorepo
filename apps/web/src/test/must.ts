/**
 * Reads a value a test cannot do without, and fails loudly when it is absent.
 *
 * `content.questions["mode"]?.title ?? ""` is the shape `noUncheckedIndexedAccess` pushes tests
 * towards, and it is a trap: once `mode` is removed from the copy dictionary the assertion
 * quietly compares the empty string against the empty string and keeps passing. The test then
 * proves nothing while still counting as evidence.
 *
 * scripts/check-tests.mjs rejects those fallbacks in test files, and this is what replaces them.
 */
export const must = <T>(value: T | undefined | null, what: string): T => {
  if (value === undefined || value === null) {
    throw new Error(`Missing test input: ${what}. The subject it described no longer exists.`);
  }
  return value;
};
