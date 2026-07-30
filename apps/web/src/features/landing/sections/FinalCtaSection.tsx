import { ButtonAnimated } from "@/components/ui/button-animated";
import { SorentoLogo } from "@/components/SorentoLogo";
import { shellClass } from "@/components/ui/shell";
import { Heading, Text } from "@/components/ui/typography";
import { cn } from "@/lib/utils";
import { landingContent } from "@/features/landing/content";
import { publicPath } from "@/navigation";

export const FinalCtaSection = () => (
  <section className={cn(shellClass, "md:py-section pb-4 pt-8")}>
    <div className="rounded-brand-lg bg-meadow relative isolate overflow-hidden px-6 py-8 md:p-[clamp(2rem,7vw,5rem)]">
      <div className="z-2 max-w-168 relative flex flex-col items-start gap-6">
        <Heading className="text-final" level={2} tone="display">
          {landingContent.finalCta.title}
        </Heading>
        <Text className="text-ink/68 text-body-lg max-w-144 leading-relaxed">
          {landingContent.finalCta.description}
        </Text>
        <ButtonAnimated href={publicPath.diagnostic}>
          <span className="sm:hidden">{landingContent.finalCta.ctaShort}</span>
          <span className="hidden sm:inline">{landingContent.finalCta.cta}</span>
        </ButtonAnimated>
      </div>
      <div
        aria-hidden="true"
        className="text-ink/10 z-1 [&_svg]:w-58 absolute -bottom-20 -right-16 -rotate-6 md:-bottom-14 md:right-[clamp(0rem,6vw,4rem)] [&_svg]:h-auto"
      >
        <SorentoLogo />
      </div>
    </div>
  </section>
);
