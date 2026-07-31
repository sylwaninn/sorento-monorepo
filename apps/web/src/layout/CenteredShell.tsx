import type { ReactNode } from "react";

/**
 * The scaffolding of a screen that is one card in the middle of the viewport: the auth flows,
 * the invitation and activation landings, the diagnostic. The card sizes itself; this only
 * holds the ground it floats on.
 */
export const CenteredShell = ({ children }: { children: ReactNode }) => (
  <div className="flex min-h-screen items-center justify-center p-4">{children}</div>
);
