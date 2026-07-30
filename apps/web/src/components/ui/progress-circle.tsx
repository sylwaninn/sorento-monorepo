import * as React from "react";

import { cn } from "@/lib/utils";

const RADIUS = 20;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export interface ProgressCircleProps extends Omit<React.ComponentProps<"svg">, "role"> {
  value: number;
  maxValue: number;
  label: string;
}

/**
 * A ring rather than a bar: it sits inside a compact row where a full-width track would push the
 * copy beside it out of the card. The arc is drawn with a dash offset so no second element has
 * to be sized in step with the first.
 */
const ProgressCircle = ({ className, value, maxValue, label, ...props }: ProgressCircleProps) => {
  const ratio = maxValue > 0 ? Math.min(Math.max(value / maxValue, 0), 1) : 0;

  return (
    <svg
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={maxValue}
      aria-valuenow={value}
      viewBox="0 0 48 48"
      className={cn("size-11 shrink-0 -rotate-90", className)}
      {...props}
    >
      <circle cx="24" cy="24" r={RADIUS} fill="none" strokeWidth="4" className="stroke-muted" />
      <circle
        cx="24"
        cy="24"
        r={RADIUS}
        fill="none"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={CIRCUMFERENCE * (1 - ratio)}
        className="stroke-sage-deep"
      />
    </svg>
  );
};

export { ProgressCircle };
