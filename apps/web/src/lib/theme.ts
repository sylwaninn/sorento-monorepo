/**
 * The names of the type scale declared in index.css under the `--text-*` namespace.
 *
 * tailwind-merge only knows Tailwind's own scale, so it reads a custom `text-caption` as a
 * colour and drops it against a real colour on the same element, or drops the colour against
 * it. Naming the scale here is what lets cn() tell the two apart. Kept honest by
 * pnpm check:styles, which compares this list against the stylesheet.
 */
export const themeFontSizes = [
  "micro",
  "tag",
  "meta",
  "caption",
  "body-sm",
  "body",
  "body-lg",
  "card-title",
  "card-title-lg",
  "step-title",
  "display",
  "display-sm",
  "section",
  "final",
  "audience",
  "preview",
  "lead",
  "hero-lead",
  "legal-title",
  "legal-title-sm",
  "legal-section",
  "showcase",
  "showcase-section",
  "showcase-sample",
] as const;
