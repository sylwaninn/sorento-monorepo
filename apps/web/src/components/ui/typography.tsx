import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const HEADING_ELEMENT = {
  1: "h1",
  2: "h2",
  3: "h3",
  4: "h4",
  5: "h5",
  6: "h6",
} as const;

export type HeadingLevel = keyof typeof HEADING_ELEMENT;

const headingVariants = cva("text-balance", {
  variants: {
    level: {
      1: "text-3xl",
      2: "text-2xl",
      3: "text-xl",
      4: "text-lg",
      5: "text-base",
      6: "text-sm",
    },
    /**
     * The public pages speak in the serif, the signed-in app in the interface font. Making that
     * a variant keeps the choice out of every heading's className and impossible to half-apply.
     */
    tone: {
      app: "font-sans font-strong tracking-tight",
      display: "font-display font-normal tracking-title",
    },
  },
  defaultVariants: {
    level: 2,
    tone: "app",
  },
});

const Heading = ({
  className,
  level = 2,
  tone,
  ...props
}: React.ComponentProps<"h2"> & {
  level?: HeadingLevel;
} & Omit<VariantProps<typeof headingVariants>, "level">) => {
  const Element = HEADING_ELEMENT[level];

  return (
    <Element
      data-slot="heading"
      className={cn(headingVariants({ level, tone }), className)}
      {...props}
    />
  );
};

const textVariants = cva("", {
  variants: {
    size: {
      default: "text-base leading-relaxed",
      sm: "text-sm leading-relaxed",
    },
    tone: {
      default: "text-foreground",
      muted: "text-muted-foreground",
    },
    align: {
      start: "text-left",
      center: "text-center",
    },
  },
  defaultVariants: {
    size: "default",
    tone: "default",
    align: "start",
  },
});

const Text = ({
  className,
  size,
  tone,
  align,
  ...props
}: React.ComponentProps<"p"> & VariantProps<typeof textVariants>) => (
  <p data-slot="text" className={cn(textVariants({ size, tone, align }), className)} {...props} />
);

export { Heading, Text, headingVariants, textVariants };
