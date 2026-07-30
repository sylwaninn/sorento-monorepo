import { Loader2Icon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Decorative on purpose. The registry ships this with its own English `role="status"` label,
 * which would announce twice inside the loaders that already carry the French one, and announce
 * in the wrong language everywhere else.
 */
const Spinner = ({ className, ...props }: React.ComponentProps<"svg">) => (
  <Loader2Icon aria-hidden="true" className={cn("size-4 animate-spin", className)} {...props} />
);

export { Spinner };
