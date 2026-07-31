/**
 * The measure every public page is written against. It lives as a class string rather than a
 * wrapper component because the sections that use it are the landmark elements themselves:
 * wrapping them would add a div between the page and its own `section[id]`.
 */
export const shellClass = "mx-auto w-full max-w-shell px-3 md:px-shell-gutter";

/** The wider measure, used by the surfaces that frame themselves against the viewport edge. */
export const wideShellClass = "mx-auto w-full max-w-wide p-3 md:p-frame";
