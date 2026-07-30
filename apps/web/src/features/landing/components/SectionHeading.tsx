import { Heading, Text } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

export interface SectionHeadingProps {
  title: string;
  align?: "center" | "start";
  description?: string;
  /**
   * How wide the title is allowed to run. Both measures are counted in characters rather than
   * pixels, so a title keeps its line count as the type scale shrinks with the viewport. The
   * wider one is for the sentences long enough to stack into a column at the default.
   */
  measure?: "headline" | "title";
  tone?: "default" | "inverse";
}

/**
 * The measure is set on the title itself and not on the block around it: `ch` resolves against
 * the font of the element carrying it, and the block is written in the interface font at body
 * size, so the same number there would cap the title at roughly a quarter of the width.
 */
const MEASURE_CLASS = {
  headline: "max-w-headline-line",
  title: "max-w-title-line",
} as const;

export const SectionHeading = ({
  title,
  align = "start",
  description,
  measure = "title",
  tone = "default",
}: SectionHeadingProps) => (
  <div
    className={cn(
      "flex flex-col items-start gap-5",
      measure === "title" && "max-w-208",
      align === "center" && "mx-auto items-center text-center",
    )}
  >
    <Heading
      className={cn(
        MEASURE_CLASS[measure],
        "text-section",
        align === "center" && "w-full",
        tone === "inverse" && "text-primary-foreground",
      )}
      level={2}
      tone="display"
    >
      {title}
    </Heading>
    {description ? (
      <Text
        align={align}
        className={cn(
          "text-lead max-w-172",
          align === "center" && "w-full",
          tone === "inverse" ? "text-primary-foreground/64" : "text-muted-foreground",
        )}
      >
        {description}
      </Text>
    ) : null}
  </div>
);
