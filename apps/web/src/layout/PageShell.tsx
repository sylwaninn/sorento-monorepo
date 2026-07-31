import type { ReactNode } from "react";
import { Link as RouterLink } from "react-router";
import { sharedContent } from "@/components/content";
import { linkVariants } from "@/components/ui/link";
import { Heading } from "@/components/ui/typography";

export interface PageShellProps {
  title: ReactNode;
  children: ReactNode;
  /** Where the way back leads. Without one the header carries the title alone. */
  backTo?: string;
  backLabel?: string;
}

/**
 * The scaffolding of a signed-in screen: the centred column, and the header row pairing the
 * page's level 1 heading with the way back. Seventeen screens carried their own copy of the
 * same class string, which is one redesign away from seventeen slightly different pages.
 */
export const PageShell = ({
  title,
  children,
  backTo,
  backLabel = sharedContent.back,
}: PageShellProps) => (
  <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 p-4 py-8">
    <div className="flex items-center justify-between">
      <Heading level={1}>{title}</Heading>
      {backTo === undefined ? null : (
        <RouterLink className={linkVariants()} to={backTo}>
          {backLabel}
        </RouterLink>
      )}
    </div>
    {children}
  </div>
);
