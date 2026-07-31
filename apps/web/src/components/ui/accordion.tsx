import * as React from "react";
import { ChevronDownIcon } from "lucide-react";
import { Accordion as AccordionPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

const Accordion = ({ ...props }: React.ComponentProps<typeof AccordionPrimitive.Root>) => {
  return <AccordionPrimitive.Root data-slot="accordion" {...props} />;
};

const AccordionItem = ({
  className,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Item>) => {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn("border-b last:border-b-0", className)}
      {...props}
    />
  );
};

/**
 * `indicator` exists so a surface can swap the glyph without also having to restate the trigger's
 * layout, focus ring and open-state rotation. The rotation is applied to whatever is passed.
 */
const AccordionTrigger = ({
  className,
  children,
  indicator,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger> & {
  indicator?: React.ReactNode;
}) => {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "group/accordion-trigger focus-visible:border-ring focus-visible:ring-ring/50 flex flex-1 items-start justify-between gap-4 rounded-md py-4 text-left text-sm font-medium outline-none transition-all hover:underline focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50",
          className,
        )}
        {...props}
      >
        {children}
        {indicator ?? (
          <ChevronDownIcon className="text-muted-foreground pointer-events-none size-4 shrink-0 translate-y-0.5 transition-transform duration-200 group-data-[state=open]/accordion-trigger:rotate-180" />
        )}
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
};

const AccordionContent = ({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Content>) => {
  return (
    <AccordionPrimitive.Content
      data-slot="accordion-content"
      className="data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down overflow-hidden text-sm"
      {...props}
    >
      <div className={cn("pb-4 pt-0", className)}>{children}</div>
    </AccordionPrimitive.Content>
  );
};

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
