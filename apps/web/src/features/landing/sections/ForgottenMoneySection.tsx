import { ButtonAnimated } from "@/components/ui/button-animated";
import { PublicCard } from "@/components/PublicCard";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { shellClass } from "@/components/ui/shell";
import { useInView } from "@/hooks/use-in-view";
import { cn } from "@/lib/utils";
import { SectionHeading } from "@/features/landing/components/SectionHeading";
import { landingContent } from "@/features/landing/content";
import { moneyPresentationById } from "@/features/landing/presentation";
import { publicPath } from "@/navigation";

const moneyColumns = [
  {
    direction: "forward",
    items: landingContent.forgottenMoney.items.filter(
      (item) => moneyPresentationById[item.id].stream === "forward",
    ),
  },
  {
    direction: "reverse",
    items: landingContent.forgottenMoney.items.filter(
      (item) => moneyPresentationById[item.id].stream === "reverse",
    ),
  },
] as const;

/** Horizontal on a phone, vertical once there is a column to fall down. */
const TRACK_ANIMATION = {
  forward: "animate-stream-left lg:animate-stream-up",
  reverse: "animate-stream-right lg:animate-stream-down",
} as const;

/** The tracks fade at the frame's edges instead of being cut by them. */
const STREAM_MASK =
  "[mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)] lg:[mask-image:linear-gradient(to_bottom,transparent,black_12%,black_88%,transparent)]";

export const ForgottenMoneySection = () => {
  /**
   * The streams only move while the section is on screen. There is no manual control: a reader
   * who does not want motion says so through the system setting, which stops it outright.
   */
  const { ref: streamsRef, isInView: isAnimationRunning } = useInView<HTMLDivElement>();

  return (
    <section className="bg-ink text-primary-foreground">
      <div
        className={cn(
          shellClass,
          "py-section grid grid-cols-1 items-center gap-12 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)] lg:gap-20",
        )}
      >
        <div className="flex flex-col items-start gap-7">
          <SectionHeading
            description={landingContent.forgottenMoney.description}
            title={landingContent.forgottenMoney.title}
            tone="inverse"
          />
          <ButtonAnimated href={publicPath.diagnostic} variant="pill-light">
            {landingContent.forgottenMoney.cta}
          </ButtonAnimated>
        </div>
        <div
          ref={streamsRef}
          aria-label={landingContent.forgottenMoney.streamLabel}
          className={cn(
            "h-68 max-h-68 min-h-68 lg:max-h-152 lg:min-h-128 relative grid grid-cols-1 grid-rows-2 gap-2 overflow-hidden lg:h-auto lg:grid-cols-2 lg:grid-rows-1 lg:gap-3 lg:self-stretch",
            STREAM_MASK,
          )}
          data-animation={isAnimationRunning ? "running" : "paused"}
          data-slot="money-streams"
          role="region"
        >
          {moneyColumns.map(({ direction, items }) => (
            <div key={direction} className="overflow-hidden">
              <div
                className={cn(
                  "flex h-full w-max flex-row will-change-transform lg:h-auto lg:w-auto lg:flex-col",
                  TRACK_ANIMATION[direction],
                  !isAnimationRunning && "will-change-auto [animation-play-state:paused]",
                  "motion-reduce:transform-none motion-reduce:animate-none",
                )}
                data-slot="money-track"
              >
                {[0, 1].map((copyIndex) => (
                  <div
                    key={copyIndex}
                    aria-hidden={copyIndex === 1 ? "true" : undefined}
                    className="flex h-full shrink-0 flex-row gap-2 pr-2 lg:h-auto lg:flex-col lg:gap-3 lg:pb-3 lg:pr-0"
                  >
                    {items.map((item) => {
                      const MoneyIcon = moneyPresentationById[item.id].icon;
                      return (
                        <PublicCard
                          key={`${copyIndex}-${item.id}`}
                          className="border-primary-foreground/12 bg-primary-foreground/7 rounded-brand-sm w-[clamp(11rem,45vw,13rem)] shrink-0 justify-between gap-4 border p-[0.9rem] shadow-none lg:min-h-[7.8rem] lg:w-auto lg:p-[1.15rem]"
                          tone="inverse"
                        >
                          <MoneyIcon
                            aria-hidden="true"
                            className="text-meadow size-5"
                            strokeWidth={1.5}
                          />
                          <CardHeader className="p-0">
                            <CardTitle className="text-primary-foreground lg:text-card-title text-base">
                              {item.name}
                            </CardTitle>
                            <CardDescription className="text-primary-foreground/55 mt-[0.35rem]">
                              {item.source}
                            </CardDescription>
                          </CardHeader>
                        </PublicCard>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
