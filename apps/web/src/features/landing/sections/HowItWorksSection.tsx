import { ButtonAnimated } from "@/components/ui/button-animated";
import { Badge } from "@/components/ui/badge";
import { Heading, Text } from "@/components/ui/typography";
import { shellClass } from "@/components/ui/shell";
import { cn } from "@/lib/utils";
import { SectionHeading } from "@/features/landing/components/SectionHeading";
import { landingContent } from "@/features/landing/content";
import { stepIconById } from "@/features/landing/presentation";
import { landingAnchor, publicPath } from "@/navigation";

/**
 * Three columns, each opened by one step marker echoing the site's signature pill: the icon
 * sits in the sage circle where the CTA carries its arrow, so the marker reads as part of the
 * same family rather than as two pieces parked at opposite ends of the column.
 */
export const HowItWorksSection = () => (
  <section className={cn(shellClass, "py-section")} id={landingAnchor.howItWorks}>
    <SectionHeading
      align="center"
      description={landingContent.howItWorks.description}
      measure="headline"
      title={landingContent.howItWorks.title}
    />

    <div className="mt-14 grid grid-cols-1 gap-10 lg:grid-cols-3 lg:gap-8">
      {landingContent.howItWorks.steps.map((step) => {
        const StepIcon = stepIconById[step.id];
        return (
          <div key={step.id} className="flex flex-col items-start">
            <Badge className="font-strong h-9 gap-2.5 pl-1.5 pr-3.5 text-sm">
              <span className="bg-sage text-sage-ink grid size-6 shrink-0 place-items-center rounded-full [&>svg]:size-3.5">
                <StepIcon aria-hidden="true" strokeWidth={1.75} />
              </span>
              {step.label}
            </Badge>
            <Heading className="text-step-title mt-5 leading-[1.08]" level={3} tone="display">
              {step.title}
            </Heading>
            <Text className="max-w-120 mt-3 leading-relaxed" size="sm" tone="muted">
              {step.description}
            </Text>
          </div>
        );
      })}
    </div>

    <div className="mt-14 flex justify-center">
      <ButtonAnimated href={publicPath.diagnostic}>{landingContent.howItWorks.cta}</ButtonAnimated>
    </div>
  </section>
);
