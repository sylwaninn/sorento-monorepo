import { sharedContent } from "@/components/content";
import { RouteAnchor } from "@/components/RouteLink";
import { SorentoLogo } from "@/components/SorentoLogo";
import { cn } from "@/lib/utils";

export interface SorentoBrandProps {
  href: string;
  className?: string;
  iconClassName?: string;
  showSignature?: boolean;
  /**
   * In a header the lockup shares a single row with the navigation, so the signature is dropped
   * on narrow viewports rather than allowed to push the row into two lines.
   */
  variant?: "default" | "header";
}

/** A single, reusable brand lockup for public and signed-in navigation. */
export const SorentoBrand = ({
  href,
  className,
  iconClassName,
  showSignature = false,
  variant = "default",
}: SorentoBrandProps) => (
  <RouteAnchor
    aria-label={sharedContent.brand.homeLabel}
    className={cn("text-ink inline-flex items-center gap-2.5 no-underline", className)}
    data-slot="brand"
    href={href}
  >
    <SorentoLogo className={cn("size-11 shrink-0", iconClassName)} />
    <span className="flex flex-col">
      <span className="tracking-title font-heavy text-base leading-none">
        {sharedContent.brand.name}
      </span>
      {showSignature ? (
        <span
          className={cn(
            "text-muted-foreground text-tag font-medium-plus mt-1 leading-none",
            variant === "header" && "max-md:hidden",
          )}
        >
          {sharedContent.brand.signature}
        </span>
      ) : null}
    </span>
  </RouteAnchor>
);
