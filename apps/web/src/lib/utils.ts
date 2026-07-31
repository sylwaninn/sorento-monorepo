import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

import { themeFontSizes } from "@/lib/theme";

/**
 * Teaching the merger our own type scale is not a nicety: without it `text-caption` and
 * `text-muted-foreground` land in the same group and the last one written silently wins, so an
 * element loses either its size or its colour depending on the order the classes appear in.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": themeFontSizes.map((name) => `text-${name}`),
    },
  },
});

/**
 * The shadcn class merger: clsx resolves the conditionals, tailwind-merge then keeps only the
 * last utility of each conflicting group so a caller's className always wins over a variant's.
 */
export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs));
