import { Heading, Text } from "@/components/ui/typography";
import { shellClass } from "@/components/ui/shell";
import { IconTile } from "@/features/landing/components/IconTile";
import { ProductPreview } from "@/features/landing/components/ProductPreview";
import { SectionHeading } from "@/features/landing/components/SectionHeading";
import { landingContent } from "@/features/landing/content";
import { resultIconById } from "@/features/landing/presentation";
import { landingAnchor } from "@/navigation";

/** A full-bleed white band: the product shot sits on the page itself, not in another card. */
export const ResultSection = () => (
  <section className="bg-card border-line py-section border-y" id={landingAnchor.result}>
    <div className={shellClass}>
      <SectionHeading
        align="center"
        description={landingContent.result.description}
        title={landingContent.result.title}
      />

      <div className="mt-14 grid grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-16">
        <ProductPreview />

        <ul className="flex flex-col gap-2">
          {landingContent.result.features.map((feature) => {
            const ResultIcon = resultIconById[feature.id];
            return (
              <li key={feature.id} className="grid-cols-icon-row grid items-start gap-5 py-5">
                <IconTile>
                  <ResultIcon aria-hidden="true" strokeWidth={1.5} />
                </IconTile>
                <div>
                  <Heading className="text-card-title" level={3}>
                    {feature.title}
                  </Heading>
                  <Text className="max-w-120 mt-1.5 leading-relaxed" size="sm" tone="muted">
                    {feature.description}
                  </Text>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  </section>
);
