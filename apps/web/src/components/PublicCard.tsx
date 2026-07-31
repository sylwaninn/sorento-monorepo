import type { ComponentProps } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type PublicCardTone = "inverse" | "sage" | "surface";

export interface PublicCardProps extends Omit<ComponentProps<typeof Card>, "className"> {
  className?: string;
  tone?: PublicCardTone;
}

const TONE_CLASS = {
  surface: "bg-card text-card-foreground",
  sage: "bg-sage text-accent-foreground border-transparent",
  inverse: "bg-ink text-primary-foreground border-primary-foreground/10",
} as const;

/**
 * Every card on the public pages goes through here, so a tone is picked from a named set rather
 * than assembled out of colour utilities at each call site.
 */
export const PublicCard = ({
  children,
  className,
  tone = "surface",
  ...props
}: PublicCardProps) => (
  <Card {...props} className={cn(TONE_CLASS[tone], className)} data-tone={tone}>
    {children}
  </Card>
);
