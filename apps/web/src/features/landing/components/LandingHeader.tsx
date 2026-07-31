import { sharedContent } from "@/components/content";
import { RouteLink } from "@/components/RouteLink";
import { SorentoBrand } from "@/components/SorentoBrand";
import { Button } from "@/components/ui/button";
import { ButtonAnimated } from "@/components/ui/button-animated";
import { shellClass } from "@/components/ui/shell";
import { ProgressiveBlur } from "@/components/ui/skiper-ui/skiper41";
import { cn } from "@/lib/utils";
import { landingAnchorHref, publicPath } from "@/navigation";
import { useLandingHeader } from "@/features/landing/use-landing-header";

const { publicNavigation } = sharedContent;

/** The login link's tone: an outline that reads as secondary next to the solid "Commencer". */
const OUTLINE_PILL =
  "border-ink/30 text-ink hover:bg-ink/8 h-11 border bg-transparent max-md:hidden";

/**
 * The ramp under the pinned row, as several stacked bands rather than one. A single
 * ProgressiveBlur holds its mask fully opaque to 50% of its height and only then falls linearly
 * to zero: the slope changes abruptly at that midpoint, and a constant blur fading at a corner
 * like that is exactly what reads as a hard line across the page. Stacking bands of different
 * heights puts each one's midpoint at a different depth, so no single break dominates, and the
 * blur radii compound towards the top into a genuine gradient of sharpness.
 *
 * The tallest band sets how far the effect reaches: 5.5rem lands just under the pinned row's own
 * bottom edge, which is as far as it should go.
 */
const BLUR_LAYERS = [
  { height: "7rem", blurScale: 0.35 },
  { height: "5.25rem", blurScale: 0.6 },
  { height: "3.5rem", blurScale: 1 },
];
/**
 * The offsets the pinned pieces sit at, matching the header's own top margin (mt-3, md:mt-frame)
 * so the tabs never shift when the bar they started in scrolls away, and the pinned action lands
 * exactly where its twin in the row stood. `safe-top` folds in env(safe-area-inset-top), which
 * resolves to 0 in a browser tab and only grows where the platform really does inset the frame,
 * so the offset stays correct if the document is ever displayed edge to edge.
 */
const PINNED_OFFSET = "top-safe-top-3 md:top-safe-top-frame";
/**
 * The same offset expressed as padding, for the one pinned piece that has to clip. Its wrapper
 * starts at `safe-top`, at the top of the safe frame, so that `overflow-y: clip` cuts exactly at
 * that edge, and the padding is what puts the action back on the line the tabs sit on. The bottom
 * padding is there so the pill's own shadow stays inside the box being clipped.
 */
const PINNED_OFFSET_AS_PADDING = "pb-8 pt-3 md:pt-5";

/**
 * The tabs are pinned for the whole page, so this renders once rather than twice: a duplicate
 * that fades in is a second thing to keep in sync, and the pill is already where it needs to be.
 */
const NavTabs = ({ activeAnchor, className }: { activeAnchor: string; className?: string }) => (
  <nav aria-label={publicNavigation.sectionLabel} className={className}>
    {publicNavigation.links.map((item) => {
      const isActive = activeAnchor === item.anchor;
      return (
        <RouteLink
          key={item.anchor}
          aria-current={isActive ? "location" : undefined}
          className={cn(
            "text-ink/68 text-meta font-strong hover:text-ink inline-flex h-8 items-center rounded-full px-3.5 transition-colors",
            isActive && "bg-ink text-primary-foreground hover:text-primary-foreground",
          )}
          href={landingAnchorHref(item.anchor)}
          variant="subtle"
        >
          {item.label}
        </RouteLink>
      );
    })}
  </nav>
);

/**
 * The bar itself scrolls away with the page like the rest of the homepage. What stays is the
 * navigation, pinned, and the one action every page needs, which slides down to take the place of
 * the button in the bar as that button leaves the screen.
 */
export const LandingHeader = () => {
  const { activeAnchor, hasScrolled, isActionOutOfView, actionRef, blurRef } = useLandingHeader();

  return (
    <>
      <header
        aria-label={publicNavigation.mainLabel}
        className={cn(
          "bg-canvas/94 ease-standard mt-safe-top-3 md:mt-safe-top-frame backdrop-blur transition-shadow duration-300",
          hasScrolled && "shadow-surface",
        )}
        role="banner"
      >
        {/* Same horizontal inset as the hero's wideShellClass card, so the logo and the
            "Commencer" button land flush with the card's own edges below. */}
        <div className="max-w-wide md:px-frame relative mx-auto flex w-full items-center justify-between gap-6 px-3">
          <SorentoBrand href={publicPath.home} iconClassName="size-8" />

          <div ref={actionRef} className="flex shrink-0 items-center gap-4">
            <ButtonAnimated
              arrow="none"
              className={OUTLINE_PILL}
              href={publicPath.login}
              variant="quiet"
            >
              {publicNavigation.login}
            </ButtonAnimated>
            <ButtonAnimated
              className={cn(
                "border-primary-foreground/0 ease-standard shrink-0 border transition-colors duration-300",
                hasScrolled && "border-primary-foreground/50",
              )}
              href={publicPath.diagnostic}
            >
              {publicNavigation.start}
            </ButtonAnimated>
          </div>
        </div>
      </header>

      {/* Blur only, no tint: whatever the page is scrolling past underneath the pinned row goes
          progressively out of focus towards the top edge, the way a glass toolbar reads on top of
          a document. Upstream's cream veil is turned off because the hero photograph sits behind
          this for the whole first screen, and a veil over a dark photo reads as fog.
          The blur radius is a direct function of the scroll position, with no transition anywhere
          on this subtree: the band is not something that appears once a threshold is crossed, it
          is the scroll position made visible, so it has to sit at exactly the value the page is
          at rather than easing towards it a few hundred milliseconds later.
          Nothing here may carry opacity or a filter, however tempting it looks for a fade: an
          ancestor with opacity below 1 turns into a backdrop root, and a backdrop-filter inside
          one has only that ancestor's own content to sample, which is nothing. The band would
          stay invisible all the way up and then snap in whole at opacity 1. The radius growing
          from zero is what makes it progressive.
          The wrapper carries no height and no overflow-hidden on purpose either: clipping it
          would reintroduce the hard edge the staggered heights exist to avoid. */}
      <div
        ref={blurRef}
        aria-hidden="true"
        className="top-safe-top pointer-events-none fixed inset-x-0 z-[9999]"
      >
        {BLUR_LAYERS.map((layer) => (
          <ProgressiveBlur
            key={layer.height}
            blurAmount={`calc(var(--header-blur, 0px) * ${layer.blurScale})`}
            height={layer.height}
            position="top"
            tint="transparent"
          />
        ))}
      </div>

      {/* Pinned for the whole page rather than revealed on scroll: navigation that fades in is
          navigation that was missing a moment ago. Only the shadow changes, and only because the
          pill has nothing to lift off while it is still sitting on the bar. */}
      <NavTabs
        activeAnchor={activeAnchor}
        className={cn(
          "bg-card ease-standard fixed left-1/2 z-[10000] hidden -translate-x-1/2 items-center gap-1 rounded-full p-1.5 transition-shadow duration-300 lg:flex",
          PINNED_OFFSET,
          isActionOutOfView ? "shadow-nav" : "shadow-none",
        )}
      />

      {/* The action slides down from above the viewport the moment its twin in the bar leaves,
          and slides back up when that twin returns: a movement, not a fade, so it reads as the
          same button following the page down rather than a second one materialising.
          Inset to the page's own content column so it lines up with the text underneath it, and
          `inert` while parked overhead keeps it out of tab order instead of just out of sight.
          The wrapper clips because "above the viewport" is only true while the viewport stays
          put: a rubber-band bounce past the top of the document moves the frame, and the parked
          pill would ride into view for as long as the bounce lasts. Vertical only, so the
          horizontal shadow is untouched. */}
      <div
        className={cn(
          "top-safe-top pointer-events-none fixed inset-x-0 z-[10000] overflow-y-clip",
          PINNED_OFFSET_AS_PADDING,
        )}
        inert={!isActionOutOfView}
      >
        <div className={cn(shellClass, "flex justify-end")}>
          {/* Plain Button, not ButtonAnimated: once it is pinned above the page, the arrow's
              hover flourish is a distraction rather than an affordance. */}
          <Button
            asChild
            className={cn(
              "shadow-nav ease-standard border-primary-foreground/50 pointer-events-auto border transition-transform duration-300",
              isActionOutOfView ? "translate-y-0" : "-translate-y-[calc(100%+3rem)]",
            )}
            size="pill"
            variant="pill"
          >
            <RouteLink href={publicPath.diagnostic} size="inherit" variant="subtle">
              {publicNavigation.start}
            </RouteLink>
          </Button>
        </div>
      </div>
    </>
  );
};
