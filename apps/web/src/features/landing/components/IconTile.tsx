import type { ReactNode } from "react";

/**
 * The squared icon seat the landing features sit on: a soft sage gradient under a hairline and
 * an inset ring, so the icon reads as set into a surface rather than floated on a plain disc.
 */
export const IconTile = ({ children }: { children: ReactNode }) => (
  <span
    aria-hidden="true"
    className="from-moss to-sage border-sage-deep/20 ring-card/70 text-sage-ink shadow-field grid size-12 shrink-0 place-items-center rounded-xl border bg-gradient-to-br ring-1 ring-inset [&>svg]:size-5"
  >
    {children}
  </span>
);
