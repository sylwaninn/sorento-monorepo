import { ArrowLeft, ArrowRight } from "lucide-react";
import { type VariantProps } from "class-variance-authority";
import { type ReactNode } from "react";

import { Button, type buttonVariants } from "@/components/ui/button";
// The one thing reaching outside the registry, and the reason is that a public action must not
// hard-code how its destination is reached: RouteAnchor is what turns an in-app path into a
// client navigation instead of a full reload.
import { RouteAnchor } from "@/components/RouteLink";
import { ArrowIcon } from "@/components/ui/skiper-ui/skiper99";
import { cn } from "@/lib/utils";

export interface ButtonAnimatedProps extends VariantProps<typeof buttonVariants> {
  children: ReactNode;
  href: string;
  /** Whether the badge carries an arrow that swaps on hover, sits there static, or is absent. */
  arrow?: "hover" | "static" | "none";
  className?: string;
  direction?: "back" | "forward";
}

/**
 * The navigating twin of Button: same variants, same size scale, plus the dark arrow badge the
 * public pages dock at the pill's edge to say where a link goes. Everything geometric still
 * comes from buttonVariants, so an action cannot drift a few pixels away from the rest of the
 * page by being written here; only the asymmetric inset that makes room for the badge is added.
 */
export const ButtonAnimated = ({
  children,
  href,
  arrow = "hover",
  className,
  direction = "forward",
  size = "pill",
  variant = "pill",
}: ButtonAnimatedProps) => {
  const hasBadge = arrow !== "none";
  // Only "pill-light" sits on a light fill; every other variant in use here (the solid dark
  // "pill", and "quiet" against the hero photo) needs the inverse so the badge reads as a
  // distinct disc instead of disappearing into a same-tone background.
  const badgeTone = variant === "pill-light" ? "bg-ink text-cream" : "bg-cream text-ink";

  const label = <span data-slot="action-label">{children}</span>;

  const badge = hasBadge ? (
    <span
      className={cn("flex size-8 shrink-0 items-center justify-center rounded-full", badgeTone)}
      data-slot="action-badge"
    >
      {arrow === "hover" ? (
        <ArrowIcon direction={direction} />
      ) : direction === "back" ? (
        <ArrowLeft aria-hidden="true" strokeWidth={1.5} />
      ) : (
        <ArrowRight aria-hidden="true" strokeWidth={1.5} />
      )}
    </span>
  ) : null;

  return (
    <Button
      asChild
      className={cn(
        "group relative isolate flex w-fit items-center justify-between gap-3 overflow-hidden no-underline",
        hasBadge && (direction === "back" ? "pl-1.5 pr-5" : "pl-5 pr-1.5"),
        className,
      )}
      size={size}
      variant={variant}
    >
      <RouteAnchor data-slot="public-action" data-direction={direction} href={href}>
        {direction === "back" && hasBadge ? (
          <>
            {badge}
            {label}
          </>
        ) : (
          <>
            {label}
            {badge}
          </>
        )}
      </RouteAnchor>
    </Button>
  );
};
