import { Plus } from "lucide-react";
import { ButtonAnimated } from "@/components/ui/button-animated";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { shellClass } from "@/components/ui/shell";
import { Text } from "@/components/ui/typography";
import { cn } from "@/lib/utils";
import { SectionHeading } from "@/features/landing/components/SectionHeading";
import { landingContent } from "@/features/landing/content";
import { landingAnchor, publicPath } from "@/navigation";

/**
 * Questions as ruled rows rather than boxes: the sticky column already frames the section, so
 * the accordion only needs hairlines to read as one list.
 */
export const FaqSection = () => (
  <section
    className={cn(
      shellClass,
      "py-section grid grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] lg:gap-24",
    )}
    id={landingAnchor.faq}
  >
    <div className="lg:top-26 flex flex-col items-start gap-6 lg:sticky">
      <SectionHeading
        description={landingContent.faq.description}
        title={landingContent.faq.title}
      />
      <ButtonAnimated href={publicPath.diagnostic}>{landingContent.faq.cta}</ButtonAnimated>
    </div>
    <Accordion className="w-full" collapsible type="single">
      {landingContent.faq.items.map((item) => (
        <AccordionItem
          key={item.id}
          className="border-line-strong rounded-none border-b-0 border-t last:border-b"
          value={`faq-${item.id}`}
        >
          <AccordionTrigger
            className="text-ink text-body font-strong min-h-20 items-center gap-6 py-5 leading-snug hover:no-underline"
            indicator={
              <Plus
                aria-hidden="true"
                className="text-muted-foreground pointer-events-none size-4 shrink-0 transition-transform duration-200 group-data-[state=open]/accordion-trigger:rotate-45"
                strokeWidth={1.5}
              />
            }
          >
            <span>{item.question}</span>
          </AccordionTrigger>
          <AccordionContent className="max-w-168 pb-7 pt-0">
            <Text className="text-sm leading-relaxed" tone="muted">
              {item.answer}
            </Text>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  </section>
);
