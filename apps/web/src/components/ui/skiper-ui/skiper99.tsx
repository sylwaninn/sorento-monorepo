import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

type ArrowIconProps = {
  className?: string;
  /**
   * Deviation from upstream, additive so "forward" is upstream's exact geometry: the chevron and
   * its stem are hard-coded pointing right there, and the legal and admin pages already carry a
   * back action that needs the mirror image. One prop beats a second copy of the component.
   */
  direction?: "back" | "forward";
};

/**
 * The caret grows a stem on hover and becomes an arrow: the resting state promises a direction,
 * the hover states the departure. Nothing travels far enough to reflow a neighbour, which is what
 * lets it sit inside a centred pill without nudging the label.
 *
 * Deviation from upstream: the `group` that drives the hover is the caller's, not this wrapper's.
 * Upstream hovers the icon on its own because its demo has nothing around it, whereas here the
 * arrow is docked inside a button and has to answer to a hover anywhere on that button.
 *
 * Themed through the tokens per project convention: upstream's ease-out is swapped for the
 * expressive easing the rest of the app's motion already uses.
 *
 * Upstream draws the icon at lucide's 24px default and pins the stem with the pixel offsets that
 * suit it. The badge here is size-8, so the icon is size-4 and every offset is upstream's scaled
 * by the same two thirds: the stem's resting edge still lands on the chevron's tip, and its
 * thickness still matches the stroke.
 */
const ArrowIcon = ({ className, direction = "forward" }: ArrowIconProps) => {
  const isBack = direction === "back";
  const Chevron = isBack ? ChevronLeft : ChevronRight;

  return (
    <div className={cn("relative grid items-center justify-center", className)}>
      <Chevron
        aria-hidden="true"
        className={cn(
          "ease-expressive size-4 transition-transform duration-500",
          isBack ? "group-hover:-translate-x-0.5" : "group-hover:translate-x-0.5",
        )}
        strokeWidth={1.5}
      />
      <div
        className={cn(
          "ease-expressive absolute h-px w-2 scale-x-0 rounded-full bg-current transition-all duration-300 group-hover:scale-x-100",
          isBack
            ? "left-1.5 origin-left group-hover:left-1"
            : "right-1.5 origin-right group-hover:right-1",
        )}
      />
    </div>
  );
};

export { ArrowIcon };

/**
 * Skiper 99 "Animated icons 002" from the "Minimal interactions" collection. Upstream also ships
 * a Skiper99 showcase plus a menu and a volume icon, all three dropped here: only the arrow is
 * used, and the two others were the file's whole reason to pull in framer-motion.
 *
 * License and usage:
 * - Free to use and modify in both personal and commercial projects.
 * - Attribution to Skiper UI is required when using the free version.
 * - No attribution required with Skiper UI Pro.
 *
 * Author: @gxuri
 * Twitter: https://x.com/Gur__vi
 */
