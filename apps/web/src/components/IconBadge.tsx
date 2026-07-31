import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface IconBadgeProps {
  children: ReactNode;
  className?: string;
  tone?: "inverse" | "sage" | "surface";
}

const TONE_CLASS = {
  sage: "bg-sage text-ink",
  surface: "bg-card text-ink",
  inverse: "bg-meadow/15 text-meadow",
} as const;

export const IconBadge = ({ children, className, tone = "sage" }: IconBadgeProps) => (
  <span
    aria-hidden="true"
    className={cn(
      "grid size-11 shrink-0 place-items-center rounded-full [&>svg]:block [&>svg]:size-5",
      TONE_CLASS[tone],
      className,
    )}
    data-slot="icon-badge"
    data-tone={tone}
  >
    {children}
  </span>
);
