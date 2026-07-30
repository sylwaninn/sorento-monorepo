import { Heading, Text } from "@/components/ui/typography";
import { shellClass } from "@/components/ui/shell";
import { cn } from "@/lib/utils";
import { SectionHeading } from "@/features/landing/components/SectionHeading";
import { landingContent } from "@/features/landing/content";
import { reassuranceIconById } from "@/features/landing/presentation";
import { landingAnchor } from "@/navigation";

/**
 * The commitments as four quiet columns on a white band, separated by rules rather than boxed
 * into cards: promises read better as an editorial list than as products.
 */
export const TrustSection = () => (
  <section className="bg-card border-line border-y" id={landingAnchor.trust}>
    <div className={cn(shellClass, "py-section")}>
      <SectionHeading
        align="center"
        description={landingContent.reassurance.description}
        title={landingContent.reassurance.title}
      />

      <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4 lg:gap-10">
        {landingContent.reassurance.points.map((point) => {
          const ReassuranceIcon = reassuranceIconById[point.id];
          return (
            <div key={point.id} className="flex flex-col items-start gap-3">
              <ReassuranceIcon
                aria-hidden="true"
                className="text-sage-deep size-5"
                strokeWidth={1.5}
              />
              <Heading className="text-base" level={3}>
                {point.title}
              </Heading>
              <Text className="leading-relaxed" size="sm" tone="muted">
                {point.description}
              </Text>
            </div>
          );
        })}
      </div>
    </div>
  </section>
);
