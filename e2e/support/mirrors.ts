/**
 * Records which content dictionary a French string was copied from.
 *
 * The journeys are a black box: they import none of the app's packages, so every string they
 * click on is a copy of a per-feature dictionary rather than a reference to one. A copy nothing
 * compares drifts, and it surfaces as the worst failure a suite can produce: a selector finding
 * nothing, minutes into CI, pointing at the test rather than at the wording that moved.
 *
 * `pnpm check:tests` reads every call below and refuses one whose dictionary no longer contains
 * that text, which is why both arguments have to stay string literals rather than constants.
 *
 * Strings are the whole label rather than a fragment. Playwright matches an accessible name
 * exactly, and a fragment would keep passing after the half it does not name is rewritten.
 */
export const mirrors = (_dictionary: string, text: string): string => text;
