import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative grid w-full grid-cols-[0_1fr] items-start gap-y-0.5 rounded-lg border px-4 py-3 text-sm has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] has-[>svg]:gap-x-3 [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground",
        accent: "border-transparent bg-mist text-accent-foreground",
        success: "border-transparent bg-success text-success-foreground",
        warning: "border-transparent bg-warning text-warning-foreground",
        // Tinted rather than filled: an error message is information, not a reprimand.
        destructive:
          "border-destructive/30 bg-destructive/10 text-destructive *:data-[slot=alert-description]:text-destructive/90",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

type AlertVariant = NonNullable<VariantProps<typeof alertVariants>["variant"]>;

const AlertVariantContext = React.createContext<AlertVariant>("default");

const INDICATOR_BY_VARIANT: Record<AlertVariant, typeof Info> = {
  default: Info,
  accent: Info,
  success: CircleCheck,
  warning: TriangleAlert,
  destructive: CircleAlert,
};

const Alert = ({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) => (
  <AlertVariantContext.Provider value={variant ?? "default"}>
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  </AlertVariantContext.Provider>
);

/**
 * The icon is derived from the alert's own variant, so a success alert can never be shipped
 * carrying a warning glyph. Callers that need a different symbol pass their own svg instead.
 */
const AlertIndicator = ({ className, ...props }: React.ComponentProps<"svg">) => {
  const variant = React.useContext(AlertVariantContext);
  const Indicator = INDICATOR_BY_VARIANT[variant];

  return <Indicator aria-hidden="true" className={cn("size-4", className)} {...props} />;
};

const AlertTitle = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div
    data-slot="alert-title"
    className={cn("font-strong col-start-2 min-h-4 tracking-tight", className)}
    {...props}
  />
);

const AlertDescription = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div
    data-slot="alert-description"
    className={cn(
      "col-start-2 grid justify-items-start gap-1 text-sm [&_p]:leading-relaxed",
      className,
    )}
    {...props}
  />
);

export { Alert, AlertIndicator, AlertTitle, AlertDescription, alertVariants };
