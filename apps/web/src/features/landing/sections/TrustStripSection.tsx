import { shellClass } from "@/components/ui/shell";
import { Text } from "@/components/ui/typography";
import { cn } from "@/lib/utils";
import { landingContent } from "@/features/landing/content";
import { trustIconById } from "@/features/landing/presentation";

export const TrustStripSection = () => (
  <div className={cn(shellClass, "grid grid-cols-1 py-4 md:grid-cols-3 md:py-5")}>
    {landingContent.hero.trustPoints.map((point) => {
      const TrustIcon = trustIconById[point.id];
      return (
        <div
          key={point.id}
          className="text-muted-foreground flex min-h-10 items-center justify-start gap-2.5 px-4 py-2 text-left md:justify-center md:py-0 md:text-center"
        >
          <TrustIcon
            aria-hidden="true"
            className="text-sage-deep size-4 shrink-0"
            strokeWidth={1.5}
          />
          <Text className="text-caption">{point.label}</Text>
        </div>
      );
    })}
  </div>
);
