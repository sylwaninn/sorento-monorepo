import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

const linkVariants = cva(
  "inline-flex items-center gap-1.5 rounded-sm transition-colors [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "text-foreground underline underline-offset-4 hover:text-foreground/80",
        quiet: "text-muted-foreground no-underline hover:text-foreground",
        subtle: "text-foreground no-underline hover:text-foreground/80",
      },
      size: {
        default: "text-sm",
        inherit: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

/**
 * The one anchor of the app. `asChild` is how a router link borrows the styling without this
 * component having to know the router exists.
 */
const Link = ({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"a"> & VariantProps<typeof linkVariants> & { asChild?: boolean }) => {
  const Comp = asChild ? Slot.Root : "a";

  return (
    <Comp data-slot="link" className={cn(linkVariants({ variant, size }), className)} {...props} />
  );
};

export { Link, linkVariants };
