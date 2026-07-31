import { Check } from "lucide-react";
import { ButtonAnimated } from "@/components/ui/button-animated";
import { PublicCard } from "@/components/PublicCard";
import {
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { shellClass } from "@/components/ui/shell";
import { Text } from "@/components/ui/typography";
import { cn } from "@/lib/utils";
import { SectionHeading } from "@/features/landing/components/SectionHeading";
import { landingContent } from "@/features/landing/content";
import { audienceToneById } from "@/features/landing/presentation";
import { landingAnchor, publicPath } from "@/navigation";

export const AudienceSection = () => (
  <section className={cn(shellClass, "py-section")} id={landingAnchor.audiences}>
    <SectionHeading
      align="center"
      description={landingContent.audiences.description}
      title={landingContent.audiences.title}
    />

    <div className="mt-12 grid grid-cols-1 gap-4 lg:grid-cols-2">
      {landingContent.audiences.items.map((item) => {
        const tone = audienceToneById[item.id];
        const isInverse = tone === "inverse";
        return (
          <PublicCard
            key={item.id}
            className="rounded-brand-lg md:p-card gap-6 p-6 shadow-none"
            tone={tone}
          >
            <CardHeader className="flex flex-col items-start gap-4 p-0">
              <CardTitle className="text-audience max-w-audience-line">{item.title}</CardTitle>
              <CardDescription
                className={cn(
                  "text-body max-w-136 leading-relaxed",
                  isInverse ? "text-primary-foreground/62" : "text-muted-foreground",
                )}
              >
                {item.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="w-full p-0">
              <Text className="text-caption font-strong pb-2">{item.specCaption}</Text>
              <ul>
                {item.spec.map((label) => (
                  <li key={label} className="flex items-center gap-2.5 py-1.5 text-sm">
                    <Check
                      aria-hidden="true"
                      className={cn(
                        "size-4 shrink-0",
                        isInverse ? "text-meadow" : "text-sage-deep",
                      )}
                    />
                    <span className="font-medium">{label}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter className="mt-auto p-0">
              <ButtonAnimated
                href={publicPath.diagnostic}
                variant={isInverse ? "pill-light" : "pill"}
              >
                {item.cta}
              </ButtonAnimated>
            </CardFooter>
          </PublicCard>
        );
      })}
    </div>
  </section>
);
