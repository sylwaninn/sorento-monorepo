import { OptimizedPicture } from "@/components/OptimizedPicture";
import { RouteLink } from "@/components/RouteLink";
import { Button } from "@/components/ui/button";
import { ButtonAnimated } from "@/components/ui/button-animated";
import { wideShellClass } from "@/components/ui/shell";
import { Heading, Text } from "@/components/ui/typography";
import { landingContent } from "@/features/landing/content";
import { landingPictures } from "@/features/landing/presentation";
import { landingAnchor, landingAnchorHref, publicPath } from "@/navigation";

const HERO_TITLE_ID = "landing-hero-title";

export const HeroSection = () => (
  <section aria-labelledby={HERO_TITLE_ID} className={wideShellClass} id={landingAnchor.top}>
    {/* 6.5rem is every gap standing between the card and the viewport's own bottom edge on
        desktop: the header's mt-frame, its own h-11 row, and the section's own frame padding
        top and bottom. Subtracting exactly that lands the card's bottom edge flush with the
        viewport, inset by the same frame the card already keeps on its other three sides.
        The 58vw ceiling is what keeps that flush card from turning into a portrait well when
        the window narrows: viewport height does not shrink with width, so a height-only rule
        drives the box further from the photograph's 1.9 ratio at every step, and object-cover
        pays for it by eating the empty wall the copy needs and pushing the pair off the right
        edge. Capping height against width holds the crop near the photograph's own framing.
        Mobile runs the same rule against its own chrome, 5rem: mt-3 plus the h-11 row plus the
        section's p-3 top and bottom. It is a floor, not a ceiling, so a viewport too short for
        the title, lead and two stacked buttons still lets them push the card past the fold
        rather than crushing them into it. svh, not dvh: dvh would resize the hero every time
        the address bar collapses, and svh is the one height that fits with the bar showing. */}
    <div className="rounded-brand-lg relative isolate min-h-[calc(100svh-5rem)] overflow-hidden md:min-h-[min(calc(100vh-6.5rem),58vw)]">
      <OptimizedPicture {...landingPictures.hero} alt="" className="z-0" />
      {/* Left to right, not top to bottom: the title, subtitle and actions all run down the
          left edge, so that is the column the white copy needs darkened for contrast. */}
      <div className="from-ink/82 via-ink/45 z-1 pointer-events-none absolute inset-0 bg-gradient-to-r to-transparent" />
      <div className="z-2 relative flex min-h-[inherit] flex-col justify-between gap-12 p-6 md:p-[clamp(1.75rem,4vw,3.5rem)]">
        <Heading
          className="text-display-sm md:text-display md:max-w-display-line text-primary-foreground max-w-[15ch]"
          id={HERO_TITLE_ID}
          level={1}
          tone="display"
        >
          {landingContent.hero.title}
        </Heading>
        <div className="flex flex-col items-start gap-5">
          <Text className="text-primary-foreground/80 text-body md:text-hero-lead max-w-100 leading-[1.55]">
            {landingContent.hero.subtitle}
          </Text>
          <div className="flex w-full flex-col items-start gap-4 md:w-auto md:flex-row md:items-center md:gap-4">
            <ButtonAnimated
              className="max-md:w-full max-md:max-w-80 max-md:justify-center"
              href={publicPath.diagnostic}
              variant="pill-light"
            >
              {landingContent.hero.cta}
            </ButtonAnimated>
            {/* An outline rather than a second solid pill, so the primary action stays the one
                surface that reads as "the" call to action against the photograph. Plain Button,
                not ButtonAnimated: with no destination badge, the arrow hover has nothing to
                pivot against and just reads as noise next to the primary CTA. */}
            <Button
              asChild
              className="border-primary-foreground/35 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground border max-md:w-full max-md:max-w-80 max-md:justify-center"
              size="pill"
              variant="quiet"
            >
              <RouteLink href={landingAnchorHref("audiences")} size="inherit" variant="subtle">
                {landingContent.hero.secondaryCta}
              </RouteLink>
            </Button>
          </div>
        </div>
      </div>
    </div>
  </section>
);
